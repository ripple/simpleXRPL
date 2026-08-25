#!/usr/bin/env node
// End-to-end Ripple Custody transaction demo — the runnable version of
// docs/using-ripple-custody.md and docs/custody-integration-tests-e2e.md.
//
// Always runs (no credentials needed):
//   - Stage 1: faucet-fund two XRPL Testnet accounts and submit a Payment
//     via the Local signing backend, exactly like
//     test/integration/xrp-transfer.test.ts.
//
// Runs only when the matching env vars are present:
//   - Stage 2: construct a real RippleCustody (RIPPLE_CUSTODY_*), discover
//     accounts, print capabilities. Submits a real Payment only if
//     CUSTODY_DEMO_SUBMIT=true and CUSTODY_DEMO_DESTINATION is set.
//
// Usage:
//   npm run build   # this script imports the built package, not src/
//   npm run demo:custody
//
// Env vars:
//   XRPL_TESTNET_WS              override the testnet WS endpoint
//
//   RIPPLE_CUSTODY_GATEWAY_URL
//   RIPPLE_CUSTODY_AUTH_SIGNING_KEY
//   RIPPLE_CUSTODY_AUTH_TOKEN_URL
//   RIPPLE_CUSTODY_DOMAIN_ID
//   RIPPLE_CUSTODY_PRIMARY_ADDRESS
//   RIPPLE_CUSTODY_ALLOW_RAW       'true' to opt into raw signing
//   CUSTODY_DEMO_SUBMIT            'true' to actually submit a Payment
//   CUSTODY_DEMO_DESTINATION       destination address for that Payment

import { Client } from 'xrpl'

import { LocalSigner, RippleCustody, SimpleXRPL } from '../dist/esm/index.js'

const TESTNET_WS =
  process.env.XRPL_TESTNET_WS ?? 'wss://s.altnet.rippletest.net:51233'

/** Small section banner so a long run stays readable. */
function heading(title) {
  console.log(`\n=== ${title} ===`)
}

/** `capabilities().nativeOps` is a Set — JSON.stringify can't see into it. */
function formatCapabilities(capabilities) {
  return JSON.stringify({
    ...capabilities,
    nativeOps: [...capabilities.nativeOps],
  })
}

/**
 * A `CustodyHttpPort` that logs the raw status/body of every response, for
 * diagnosing auth/gateway failures that the SDK otherwise reports as a
 * generic `CustodyAuthError`. Enable with `CUSTODY_DEMO_DEBUG=true`.
 */
class DebugHttpPort {
  async send(request) {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    })
    const body = await response.text()
    console.log(
      `  [debug] ${request.method} ${request.url} -> ${response.status}`,
    )
    console.log(`  [debug] body: ${body.slice(0, 500)}`)
    return { status: response.status, body }
  }
}

/**
 * Stage 1: no credentials needed. Faucet-fund two accounts and submit a
 * Payment through the Local signing backend, so there's always something
 * that runs even with no custody sandbox available.
 */
async function runLocalStage() {
  heading('Stage 1 — Local signer, live XRPL Testnet')

  const faucet = new Client(TESTNET_WS)
  await faucet.connect()
  let source
  let destination
  try {
    source = (await faucet.fundWallet()).wallet
    destination = (await faucet.fundWallet()).wallet
  } finally {
    await faucet.disconnect()
  }
  console.log(`source:      ${source.classicAddress}`)
  console.log(`destination: ${destination.classicAddress}`)

  const client = await SimpleXRPL.init({
    rippledUrl: TESTNET_WS,
    signers: [LocalSigner.fromSeed(source.seed)],
  })
  await client.connect()

  try {
    const result = await client.xrp.transfer({
      to: destination.classicAddress,
      amount: '10',
    })
    console.log(`submitted:   ${result.txHash}`)
    console.log(`source:      ${result.source}`)
  } finally {
    await client.disconnect()
  }
}

/**
 * Stage 2: only runs when RIPPLE_CUSTODY_* env vars are set. Mirrors the
 * construction + discovery steps from docs/using-ripple-custody.md sections 2-3,
 * and (opt-in only) a real native Payment via section 4.
 */
async function runRippleCustodyStage() {
  const required = [
    'RIPPLE_CUSTODY_GATEWAY_URL',
    'RIPPLE_CUSTODY_AUTH_SIGNING_KEY',
    'RIPPLE_CUSTODY_AUTH_TOKEN_URL',
    'RIPPLE_CUSTODY_DOMAIN_ID',
    'RIPPLE_CUSTODY_PRIMARY_ADDRESS',
  ]
  if (required.some((key) => process.env[key] === undefined)) {
    heading('Stage 2 — Ripple Custody (skipped)')
    console.log(`set ${required.join(', ')} to enable`)
    return
  }

  heading('Stage 2 — Ripple Custody, live gateway')

  // fromEnv() (not create()) so RIPPLE_CUSTODY_AUTH_SIGNING_KEY is resolved
  // the same way it is for any real caller: literal PEM contents, or a path
  // to a .pem file, via resolveSigningKeyPem in construction.ts.
  const custody = await RippleCustody.fromEnv({
    primary: process.env.RIPPLE_CUSTODY_PRIMARY_ADDRESS,
    allowRawSigning: process.env.RIPPLE_CUSTODY_ALLOW_RAW === 'true',
    http:
      process.env.CUSTODY_DEMO_DEBUG === 'true'
        ? new DebugHttpPort()
        : undefined,
  })

  const accounts = await custody.listAccounts()
  console.log(
    `discovered accounts: ${accounts.map((a) => a.address).join(', ')}`,
  )
  console.log(
    `capabilities:        ${formatCapabilities(custody.capabilities())}`,
  )

  const shouldSubmit = process.env.CUSTODY_DEMO_SUBMIT === 'true'
  const destination = process.env.CUSTODY_DEMO_DESTINATION
  if (!shouldSubmit || destination === undefined) {
    console.log(
      'submit skipped — set CUSTODY_DEMO_SUBMIT=true and CUSTODY_DEMO_DESTINATION to send a real Payment',
    )
    return
  }

  const client = await SimpleXRPL.init({
    rippledUrl: TESTNET_WS,
    signers: [custody],
  })
  await client.connect()
  try {
    const result = await client.xrp.transfer({ to: destination, amount: '10' })
    console.log(`submitted: ${result.txHash} (source: ${result.source})`)
  } finally {
    await client.disconnect()
  }
}

/**
 * Run one stage; a failure is reported and swallowed so the remaining
 * stages still run (each stage is independent — one bad credential set
 * shouldn't hide whether the others work).
 */
async function runStage(fn) {
  try {
    await fn()
  } catch (error) {
    console.error(`\n[failed] ${error.message ?? error}`)
    if (process.env.CUSTODY_DEMO_DEBUG === 'true') {
      console.error(error)
    }
  }
}

async function main() {
  await runStage(runLocalStage)
  await runStage(runRippleCustodyStage)
  console.log('\nDone.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
