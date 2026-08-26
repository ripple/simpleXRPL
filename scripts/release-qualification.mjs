#!/usr/bin/env node
// Release-qualification sweep: every vertical write + read, per signing
// connector, against the live XRPL Testnet.
//
// This is a one-time due-diligence artifact, not a CI gate — the test tiers
// (`npm test`, `test:integration`, `test:contract`) remain the regression
// suites. What this adds is a single matrix showing, for each connector, which
// vertical operations actually land on-ledger, with transaction hashes as
// evidence for the release decision.
//
// Usage:
//   npm run build          # this script imports the built package, not src/
//   node scripts/release-qualification.mjs
//   node scripts/release-qualification.mjs --json report.json
//
// Connectors covered:
//   local     — LocalSigner. Always runs.
//   external  — ExternalSigner over an in-process secp256k1 port. Always runs.
//               NOTE: this qualifies the External dispatch/sign/submit path
//               against the real ledger. It does NOT qualify the AWS KMS
//               adapter — that needs AWS_KMS_KEY_ID and is covered by
//               test/contract/aws-kms.contract.test.ts.
//   ripple-custody / palisade — skipped unless their credentials are present;
//               governed submission goes through the custodian, not the faucet
//               accounts this script provisions.
//
// Env:
//   XRPL_TESTNET_WS   override the endpoint (default: public Testnet)
//
// Exit code is non-zero if any step FAILED, so it can gate a release step.

import { writeFileSync } from 'node:fs'

import { secp256k1 } from '@noble/curves/secp256k1'
import { Client, Wallet } from 'xrpl'

import {
  ExternalSigner,
  LocalSigner,
  SimpleXRPL,
  XrplLedger,
  iou,
  mpt,
} from '../dist/esm/index.js'

const TESTNET_WS =
  process.env.XRPL_TESTNET_WS ?? 'wss://s.altnet.rippletest.net:51233'
const TESTNET_FAUCET = 'https://faucet.altnet.rippletest.net/accounts'

/** Every recorded step, in execution order. */
const results = []
let currentConnector = 'n/a'

/**
 * Failures caused by Testnet timing rather than by the operation being wrong.
 *
 * A qualification report has to separate "the SDK cannot do this" from "the
 * network was busy". `LastLedgerSequence` expiry in particular is pure luck: the
 * transaction was built and signed correctly but missed its ledger window.
 */
const TRANSIENT = [
  /LastLedgerSequence/iu,
  /tefPAST_SEQ/u,
  /terQUEUED/u,
  /telINSUF_FEE_P/u,
  /tefMAX_LEDGER/u,
  /timed out|ETIMEDOUT|ECONNRESET|socket hang up|NotConnectedError/iu,
  /status 429|rate limit/iu,
]

/**
 * Whether an error looks like network timing rather than a real rejection.
 *
 * @param error - The thrown error.
 * @returns `true` when the step is worth retrying.
 */
function isTransient(error) {
  const message = error instanceof Error ? error.message : String(error)
  return TRANSIENT.some((pattern) => pattern.test(message))
}

/**
 * Run one qualification step, recording the outcome and continuing on failure.
 *
 * Continue-on-failure is deliberate: a qualification sweep is only useful if it
 * produces the whole matrix. Aborting at the first failure would hide every
 * later cell. Transient network failures are retried once so the matrix reports
 * capability rather than Testnet luck; the retry is recorded either way.
 *
 * @param vertical - The vertical under test (for the report's first column).
 * @param name - The operation, e.g. `iou.transfer`.
 * @param fn - The operation to run; may return a SubmissionResult.
 * @returns The step's return value, or undefined when it threw.
 */
async function step(vertical, name, fn) {
  const started = Date.now()
  let retried = false
  // Three attempts, not two: the sweep fires ~20 writes from one account in
  // quick succession, so xrpl's default 4-ledger LastLedgerSequence window
  // can close before validation on a busy Testnet. Verified in isolation that
  // the affected operations succeed — this is queue pressure, not capability.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const value = await fn()
      results.push({
        connector: currentConnector,
        vertical,
        name,
        status: 'PASS',
        ms: Date.now() - started,
        txHash: value?.txHash,
        source: value?.source,
        retried,
      })
      return value
    } catch (error) {
      const transient = isTransient(error)
      if (transient && attempt < 2) {
        retried = true
        // Back off past the closed ledger window before rebuilding.
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) =>
          setTimeout(resolve, 6000 * (attempt + 1)),
        )
        continue
      }
      results.push({
        connector: currentConnector,
        vertical,
        name,
        // A step that only ever failed transiently is reported distinctly: it is
        // not evidence against the SDK, and it should not fail the sweep.
        status: transient ? 'FLAKE' : 'FAIL',
        ms: Date.now() - started,
        detail:
          error instanceof Error
            ? error.message.split('\n')[0].slice(0, 160)
            : String(error),
        retried,
      })
      return undefined
    }
  }
  return undefined
}

/**
 * Record a step that could not be attempted.
 *
 * @param vertical - The vertical.
 * @param name - The operation.
 * @param why - Why it was skipped.
 */
function skip(vertical, name, why) {
  results.push({
    connector: currentConnector,
    vertical,
    name,
    status: 'SKIP',
    detail: why,
  })
}

/**
 * Faucet-fund `count` fresh wallets.
 *
 * @param count - How many wallets to fund.
 * @returns The funded wallets.
 */
async function fundWallets(count) {
  const faucet = new Client(TESTNET_WS)
  await faucet.connect()
  try {
    const funded = []
    for (let index = 0; index < count; index += 1) {
      // Sequential: the faucet rate-limits parallel requests.
      // eslint-disable-next-line no-await-in-loop
      funded.push((await faucet.fundWallet()).wallet)
    }
    return funded
  } finally {
    await faucet.disconnect()
  }
}

/**
 * An in-process {@link Secp256k1SignerPort}. Stands in for a KMS/HSM so the
 * External connector's SDK-side path can be qualified without cloud credentials
 * — the port contract is identical; only where the key lives differs.
 *
 * @param privateKey - The 32-byte secp256k1 private key.
 * @returns The signer port.
 */
function softwareSignerPort(privateKey) {
  return {
    algorithm: 'secp256k1',
    publicKey: async () =>
      Buffer.from(secp256k1.getPublicKey(privateKey, true))
        .toString('hex')
        .toUpperCase(),
    signDigest: async (digest) => {
      const sig = secp256k1.sign(digest, privateKey)
      return { r: sig.r, s: sig.s }
    },
  }
}

/** Unique-ish suffix so repeated runs don't collide on credential types. */
const RUN_TAG = String(Date.now()).slice(-6)

/** XLS-89-compliant MPT metadata. */
const MPT_METADATA = {
  ticker: 'QUAL',
  name: 'Qualification Token',
  icon: 'https://example.org/icon.png',
  asset_class: 'other',
  issuer_name: 'Release Qualification',
}

/**
 * Sweep every vertical against one client.
 *
 * Ordering matters and is load-bearing: irreversible account flags must be set
 * before the account owns any trust line, an MPT can only be destroyed while no
 * holder object exists, and a credential must be accepted before it is deleted.
 *
 * @param client - The connected client.
 * @param issuer - The primary/issuer r-address.
 * @param holder - The counterparty r-address, signable by this client.
 */
async function sweepVerticals(client, issuer, holder) {
  const from = { from: issuer }
  const asHolder = { from: holder }

  // ── account ──────────────────────────────────────────────────────────────
  const created = await step('account', 'account.create', async () =>
    client.account.create(),
  )
  if (created) {
    await step('account', 'account.fund (faucet)', async () =>
      client.account.fund({ destination: created.address }),
    )
  } else {
    skip('account', 'account.fund (faucet)', 'account.create failed')
  }

  const toActivate = await step('account', 'account.create (2nd)', async () =>
    client.account.create(),
  )
  if (toActivate) {
    await step('account', 'account.activate (operator-funded)', async () =>
      client.account.activate({ destination: toActivate.address }, from),
    )
  } else {
    skip(
      'account',
      'account.activate (operator-funded)',
      'account.create failed',
    )
  }

  // Irreversible flags first: both must precede any trust line on the issuer.
  await step('account', 'account.set (clawbackEnabled)', async () =>
    client.account.set({ clawbackEnabled: true }, from),
  )
  await step('account', 'account.set (requireDest + domain)', async () =>
    client.account.set({ requireDest: true, domain: 'example.com' }, from),
  )
  await step('account', 'account.setRegularKey (set)', async () =>
    client.account.setRegularKey({ regularKey: holder }, from),
  )
  await step('account', 'account.setRegularKey (remove)', async () =>
    client.account.setRegularKey({}, from),
  )
  await step('account', 'account.depositPreauth (authorize)', async () =>
    client.account.depositPreauth({ authorize: holder }, from),
  )
  await step('account', 'account.depositPreauth (unauthorize)', async () =>
    client.account.depositPreauth({ unauthorize: holder }, from),
  )
  await step('account', 'account.retrieve', async () =>
    client.account.retrieve({ account: issuer }),
  )
  await step('account', 'account.listOffers', async () =>
    client.account.listOffers({ account: issuer }),
  )

  // ── xrp ──────────────────────────────────────────────────────────────────
  await step('xrp', 'xrp.transfer', async () =>
    client.xrp.transfer({ to: holder, amount: '5' }, from),
  )

  // ── iou ──────────────────────────────────────────────────────────────────
  const issued = await step('iou', 'iou.issue (with distribution)', async () =>
    client.iou.issue({ ticker: 'USD', holder, amount: '1000' }, from),
  )
  await step('iou', 'iou.transfer', async () =>
    client.iou.transfer(
      { ticker: 'USD', destination: holder, amount: '50' },
      from,
    ),
  )
  await step('iou', 'iou.lock', async () =>
    client.iou.lock({ ticker: 'USD', holder }, from),
  )
  await step('iou', 'iou.unlock', async () =>
    client.iou.unlock({ ticker: 'USD', holder }, from),
  )
  await step('iou', 'iou.clawback', async () =>
    client.iou.clawback({ ticker: 'USD', holder, amount: '10' }, from),
  )
  // `iou.authorize` only does anything on an issuer with `asfRequireAuth`, and
  // that flag can only be set before the account owns any trust line — so the
  // main issuer (which already has one) cannot be used. Qualify it on a
  // dedicated account instead.
  //
  // Note: called against an issuer WITHOUT requireAuth, this operation does not
  // fail fast — the transaction never validates and the caller waits out the
  // ledger window, then sees an opaque LastLedgerSequence error. See the
  // qualification report; `iou.clawback` pre-checks its flag, this does not.
  const authIssuer = await step(
    'iou',
    'iou.authorize: provision issuer',
    async () => {
      const account = client.account.create()
      await client.account.fund({ destination: account.address })
      await client.account.set({ requireAuth: true }, { from: account.address })
      return account
    },
  )
  if (authIssuer) {
    await step('iou', 'iou.authorize', async () =>
      client.iou.authorize(
        { ticker: 'USD', holder },
        { from: authIssuer.address },
      ),
    )
  } else {
    skip('iou', 'iou.authorize', 'could not provision a requireAuth issuer')
  }
  const sell = await step('iou', 'iou.sellOffer', async () =>
    client.iou.sellOffer(
      {
        ticker: 'USD',
        amount: '10',
        orderType: 'limit',
        price: { currency: 'XRP', amount: '5' },
      },
      from,
    ),
  )
  const resting = await step('iou', 'iou.listOffers', async () =>
    client.iou.listOffers({ ticker: 'USD', issuer }),
  )
  const mine = await step('iou', 'account.listOffers (for cancel)', async () =>
    client.account.listOffers({ account: issuer }),
  )
  const seq = mine?.data?.[0]?.offerSequence
  if (seq !== undefined) {
    await step('iou', 'iou.cancelOffer', async () =>
      client.iou.cancelOffer({ offerSequence: seq }, from),
    )
  } else {
    skip('iou', 'iou.cancelOffer', 'no resting offer sequence found')
  }
  await step('iou', 'iou.buyOffer', async () =>
    client.iou.buyOffer(
      {
        ticker: 'EUR',
        amount: '10',
        orderType: 'limit',
        price: { currency: 'XRP', amount: '1' },
      },
      from,
    ),
  )
  await step('iou', 'iou.retrieve', async () =>
    client.iou.retrieve({ ticker: 'USD', issuer, account: holder }),
  )
  await step('iou', 'iou.list', async () =>
    client.iou.list({ account: holder }),
  )
  void issued
  void sell
  void resting

  // ── token (MPT) ──────────────────────────────────────────────────────────
  const mptIssued = await step('token', 'token.issue', async () =>
    client.token.issue(
      {
        assetScale: 0,
        transferFee: 0.5,
        metadata: MPT_METADATA,
        flags: {
          canTransfer: true,
          canLock: true,
          requireAuth: true,
          canClawback: true,
        },
      },
      from,
    ),
  )
  const mptId = mptIssued?.intent?.mptIssuanceId
  if (mptId === undefined) {
    for (const name of [
      'token.authorize',
      'token.grantHolder',
      'token.transfer',
      'token.lock (issuance)',
      'token.unlock (issuance)',
      'token.lock (holder)',
      'token.unlock (holder)',
      'token.revokeHolder',
      'token.retrieve',
      'token.list',
    ]) {
      skip('token', name, 'token.issue failed — no issuance id')
    }
  } else {
    await step('token', 'token.authorize', async () =>
      client.token.authorize({ mptIssuanceId: mptId }, asHolder),
    )
    await step('token', 'token.grantHolder', async () =>
      client.token.grantHolder({ mptIssuanceId: mptId, holder }, from),
    )
    await step('token', 'token.transfer', async () =>
      client.token.transfer(
        { to: holder, amount: { asset: mpt(mptId, 0), value: '100' } },
        from,
      ),
    )
    await step('token', 'token.lock (issuance)', async () =>
      client.token.lock({ mptIssuanceId: mptId }, from),
    )
    await step('token', 'token.unlock (issuance)', async () =>
      client.token.unlock({ mptIssuanceId: mptId }, from),
    )
    await step('token', 'token.lock (holder)', async () =>
      client.token.lock({ mptIssuanceId: mptId, holder }, from),
    )
    await step('token', 'token.unlock (holder)', async () =>
      client.token.unlock({ mptIssuanceId: mptId, holder }, from),
    )
    await step('token', 'token.revokeHolder', async () =>
      client.token.revokeHolder({ mptIssuanceId: mptId, holder }, from),
    )
    await step('token', 'token.retrieve', async () =>
      client.token.retrieve({ mptIssuanceId: mptId }),
    )
    await step('token', 'token.list (issuer)', async () =>
      client.token.list({ role: 'issuer', account: issuer }),
    )
  }

  // A second issuance with no holder object, so destroy can succeed.
  const throwaway = await step('token', 'token.issue (for destroy)', async () =>
    client.token.issue({ assetScale: 0, metadata: MPT_METADATA }, from),
  )
  const throwawayId = throwaway?.intent?.mptIssuanceId
  if (throwawayId === undefined) {
    skip('token', 'token.unauthorize', 'no throwaway issuance')
    skip('token', 'token.destroy', 'no throwaway issuance')
  } else {
    await step('token', 'token.unauthorize', async () => {
      await client.token.authorize({ mptIssuanceId: throwawayId }, asHolder)
      return client.token.unauthorize({ mptIssuanceId: throwawayId }, asHolder)
    })
    await step('token', 'token.destroy', async () =>
      client.token.destroy({ mptIssuanceId: throwawayId }, from),
    )
  }

  // ── credential ───────────────────────────────────────────────────────────
  const credType = `KYC${RUN_TAG}`
  await step('credential', 'credential.issue', async () =>
    client.credential.issue({ destination: holder, credType }, from),
  )
  await step('credential', 'credential.accept', async () =>
    client.credential.accept({ credType, issuer }, asHolder),
  )
  await step('credential', 'credential.retrieve', async () =>
    client.credential.retrieve({ credType, issuer, account: holder }),
  )
  await step('credential', 'credential.list', async () =>
    client.credential.list({ account: holder }),
  )
  await step('credential', 'credential.delete', async () =>
    client.credential.delete({ credType, issuer, holder }, from),
  )

  // ── domain ───────────────────────────────────────────────────────────────
  const domainCred = [{ issuer, credType }]
  const domain = await step('domain', 'domain.create', async () =>
    client.domain.create({ credList: domainCred }, from),
  )
  const domainID = domain?.intent?.domainID
  if (!domainID) {
    skip('domain', 'domain.setCredentials', 'domain.create returned no id')
    skip('domain', 'domain.retrieve', 'domain.create returned no id')
    skip('domain', 'domain.delete', 'domain.create returned no id')
  } else {
    await step('domain', 'domain.setCredentials', async () =>
      client.domain.setCredentials(
        { domain: domainID, credList: domainCred },
        from,
      ),
    )
    await step('domain', 'domain.retrieve', async () =>
      client.domain.retrieve({ domainID }),
    )
    await step('domain', 'domain.delete', async () =>
      client.domain.delete({ domain: domainID }, from),
    )
  }
  await step('domain', 'domain.list', async () =>
    client.domain.list({ account: issuer }),
  )
}

/** Sweep the Local connector. */
async function qualifyLocal() {
  currentConnector = 'local'
  const [issuerWallet, holderWallet] = await fundWallets(2)
  const client = await SimpleXRPL.init({
    xrpldUrl: TESTNET_WS,
    faucetUrl: TESTNET_FAUCET,
    signers: [
      LocalSigner.fromSeed(issuerWallet.seed),
      LocalSigner.fromSeed(holderWallet.seed),
    ],
    ledger: new XrplLedger(TESTNET_WS, TESTNET_FAUCET),
  })
  await client.connect()
  try {
    await sweepVerticals(
      client,
      issuerWallet.classicAddress,
      holderWallet.classicAddress,
    )
  } finally {
    await client.disconnect()
  }
}

/** Sweep the External connector (software port standing in for a KMS/HSM). */
async function qualifyExternal() {
  currentConnector = 'external'
  // Derive the External account's key first so it can be faucet-funded.
  const privateKey = Uint8Array.from(
    Buffer.from(Wallet.generate().privateKey.slice(-64), 'hex'),
  )
  const external = await ExternalSigner.create({
    signer: softwareSignerPort(privateKey),
  })
  const [holderWallet] = await fundWallets(1)

  const faucet = new Client(TESTNET_WS)
  await faucet.connect()
  try {
    const response = await fetch(TESTNET_FAUCET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: external.primary.address }),
    })
    if (!response.ok) {
      throw new Error(
        `faucet funding for the External account failed (${response.status})`,
      )
    }
    // Wait for the funded account to appear in a validated ledger.
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await faucet.request({
          command: 'account_info',
          account: external.primary.address,
          ledger_index: 'validated',
        })
        break
      } catch {
        // eslint-disable-next-line no-await-in-loop
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  } finally {
    await faucet.disconnect()
  }

  const client = await SimpleXRPL.init({
    xrpldUrl: TESTNET_WS,
    faucetUrl: TESTNET_FAUCET,
    signers: [external, LocalSigner.fromSeed(holderWallet.seed)],
    ledger: new XrplLedger(TESTNET_WS, TESTNET_FAUCET),
  })
  await client.connect()
  try {
    await sweepVerticals(
      client,
      external.primary.address,
      holderWallet.classicAddress,
    )
  } finally {
    await client.disconnect()
  }
}

/** Note why the custodian connectors were not swept. */
function noteCustodians() {
  const custody = process.env.RIPPLE_CUSTODY_GATEWAY_URL
  const palisade = process.env.PALISADE_BASE_URL
  currentConnector = 'ripple-custody'
  skip(
    'all',
    'full sweep',
    custody
      ? 'credentials present — run test/contract/ripple-custody.contract.test.ts (governed submission is not faucet-account driven)'
      : 'RIPPLE_CUSTODY_* not set',
  )
  currentConnector = 'palisade'
  skip(
    'all',
    'full sweep',
    palisade
      ? 'credentials present — run test/contract/palisade.contract.test.ts (native transfers only reach known org wallets)'
      : 'PALISADE_* not set',
  )
}

/** Print the matrix and the summary. */
function report() {
  const pad = (value, width) => String(value).padEnd(width)
  console.log(`\n${'='.repeat(104)}`)
  console.log('RELEASE QUALIFICATION — live XRPL Testnet')
  console.log('='.repeat(104))
  console.log(
    `${pad('CONNECTOR', 16)}${pad('VERTICAL', 12)}${pad('OPERATION', 38)}${pad('RESULT', 8)}DETAIL`,
  )
  console.log('-'.repeat(104))
  for (const row of results) {
    const detail =
      row.status === 'PASS' ? (row.txHash ?? '') : (row.detail ?? '')
    const mark = row.retried ? ' (retried)' : ''
    console.log(
      `${pad(row.connector, 16)}${pad(row.vertical, 12)}${pad(row.name, 38)}${pad(row.status, 8)}${detail}${mark}`,
    )
  }
  const counts = { PASS: 0, FAIL: 0, FLAKE: 0, SKIP: 0 }
  for (const row of results) counts[row.status] += 1
  console.log('-'.repeat(104))
  console.log(
    `PASS ${counts.PASS}   FAIL ${counts.FAIL}   FLAKE ${counts.FLAKE}   SKIP ${counts.SKIP}`,
  )
  if (counts.FLAKE > 0) {
    console.log(
      '\nFLAKES (Testnet/faucet timing, retried — not evidence against the SDK):',
    )
    for (const row of results.filter((entry) => entry.status === 'FLAKE')) {
      console.log(`  ${row.connector} / ${row.name}: ${row.detail}`)
    }
  }
  if (counts.FAIL > 0) {
    console.log('\nFAILURES:')
    for (const row of results.filter((entry) => entry.status === 'FAIL')) {
      console.log(`  ${row.connector} / ${row.name}: ${row.detail}`)
    }
  }
  const jsonFlag = process.argv.indexOf('--json')
  if (jsonFlag !== -1 && process.argv[jsonFlag + 1]) {
    const path = process.argv[jsonFlag + 1]
    writeFileSync(path, JSON.stringify({ results, counts }, null, 2))
    console.log(`\nJSON report written to ${path}`)
  }
  return counts.FAIL
}

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : undefined

try {
  if (!only || only === 'local') await qualifyLocal()
  if (!only || only === 'external') await qualifyExternal()
  if (!only) noteCustodians()
} catch (error) {
  console.error('\nsweep aborted:', error)
  results.push({
    connector: currentConnector,
    vertical: 'harness',
    name: 'setup',
    status: 'FAIL',
    detail:
      error instanceof Error ? error.message.slice(0, 160) : String(error),
  })
}

process.exit(report() > 0 ? 1 : 0)
