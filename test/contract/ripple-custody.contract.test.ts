import {
  createPrivateKey,
  createPublicKey,
  randomUUID,
  sign as nodeSign,
} from 'node:crypto'

import { p256 } from '@noble/curves/p256'
import { secp256k1 } from '@noble/curves/secp256k1'
import type { AccountSet } from 'xrpl'

import { KeypairService } from '../../src/custodians/ripple/auth/keypair.service.js'
import type { CustodySignerPort } from '../../src/custodians/ripple/auth/signer-port.js'
import {
  buildRippleCustodyState,
  resolveFromEnvOptions,
} from '../../src/custodians/ripple/construction.js'
import type { RippleCustodyState } from '../../src/custodians/ripple/construction.js'
import { buildDecisionEnvelope } from '../../src/custodians/ripple/mapping/decision-envelope.js'
import { buildProposeIntentBody } from '../../src/custodians/ripple/mapping/envelope.js'
import { runDryRun } from '../../src/custodians/ripple/submission/dry-run.js'
import type { Account } from '../../src/domain/index.js'
import {
  CustodyApiError,
  CustodySignatureError,
  IntentValidationError,
} from '../../src/errors.js'
import type { components } from '../../src/generated/custody.js'
import { RippleCustody, SimpleXRPL } from '../../src/index.js'
import { TESTNET_FAUCET, TESTNET_WS, ensureFunded } from '../helpers/testnet.js'

import { SANDBOX_PRIMARY, describeContract } from './helpers/custody-sandbox.js'

const LIVE_TIMEOUT_MS = 120_000

/** How long to wait for a newly proposed intent to become readable. */
const DECISION_SETTLE_MS = 15_000

/** A no-op AccountSet on the sandbox primary — the benign shape the dry-run and
 * propose contract checks both reuse (it never executes without approval). */
const PRIMARY_ACCOUNT_SET: AccountSet = {
  TransactionType: 'AccountSet',
  Account: SANDBOX_PRIMARY,
  SetFlag: 8,
}

/**
 * Resolve the discovered sandbox primary's Custody ids for a native intent.
 *
 * @param accounts - The discovered accounts.
 * @returns The primary's Custody account UUID and (optional) ledger id.
 * @throws {@link Error} if the primary wasn't discovered or lacks a Custody id.
 */
function requirePrimary(accounts: Account[]): {
  accountId: string
  ledgerId?: string
} {
  const primary = accounts.find(
    (account) => account.address === SANDBOX_PRIMARY,
  )
  if (primary === undefined || typeof primary.custodianRef !== 'string') {
    throw new Error('sandbox primary account was not discovered')
  }
  return { accountId: primary.custodianRef, ledgerId: primary.ledgerId }
}

/**
 * The three-step custody issuance (AccountSet + TrustSet + Payment), each polled
 * to on-chain confirmation, runs well past the read tests' budget. Give the
 * custody poll a generous per-step deadline and the Jest case room around it.
 */
const ISSUE_TIMEOUT_MS = 240_000
const ISSUE_TEST_TIMEOUT_MS = 300_000

/**
 * A distinctive, fractional issuance amount. It pins the on-chain magnitude
 * precisely: were the pre-fix scaling still in place — forwarding the raw
 * decimal as an integer count of Custody's 10^-81 minimum unit — the holder's
 * balance would be ~10^-79 (or the Payment would fail on-ledger and throw), not
 * this value. So a balance that matches proves the 10^81 scale end-to-end.
 */
const ISSUE_AMOUNT = '73.5'

/**
 * An HSM-style signer port around a PEM key: it hands back only the raw
 * primitive's output, as a real HSM/KMS would, so the SDK's port path — digest
 * preparation, signature checks and encoding — runs against the live server.
 *
 * @param pem - The Custody API user's PEM private key.
 * @returns The port.
 */
function portAround(pem: string): CustodySignerPort {
  const algorithm = KeypairService.fromPrivateKey(pem).algorithm
  const { d: scalar } = createPrivateKey(pem).export({ format: 'jwk' })
  const privateKey = Buffer.from(scalar ?? '', 'base64url')
  return {
    algorithm,
    publicKey: async () =>
      createPublicKey(pem).export({ type: 'spki', format: 'pem' }).toString(),
    async sign(data): Promise<Uint8Array> {
      if (algorithm === 'ed25519') {
        return nodeSign(null, data, pem)
      }
      const curve = algorithm === 'secp256k1' ? secp256k1 : p256
      return curve.sign(data, privateKey).toDERRawBytes()
    },
  }
}

describeContract('RippleCustody (live Custody sandbox)', () => {
  let custody: RippleCustody
  let state: RippleCustodyState

  beforeAll(async () => {
    // Two constructions: the adapter (for account discovery) and the raw
    // construction state (for a direct dry-run against the sandbox). Both run
    // the auth + /v1/me flow, which is itself a contract check that those
    // response shapes still parse.
    custody = await RippleCustody.fromEnv({ primary: SANDBOX_PRIMARY })
    state = await buildRippleCustodyState(
      await resolveFromEnvOptions({ primary: SANDBOX_PRIMARY }),
    )
  }, LIVE_TIMEOUT_MS)

  it(
    'authenticates, resolves the author, and discovers XRPL accounts with the expected shape',
    async () => {
      const accounts = await custody.listAccounts()

      expect(accounts.length).toBeGreaterThan(0)
      for (const account of accounts) {
        expect(typeof account.address).toBe('string')
        expect(typeof account.custodianRef).toBe('string')
      }
      expect(
        accounts.some((account) => account.address === SANDBOX_PRIMARY),
      ).toBe(true)
    },
    LIVE_TIMEOUT_MS,
  )

  it(
    'dry-runs a native intent: the sandbox accepts the SDK request shape',
    async () => {
      const accounts = await custody.listAccounts()
      const primary = accounts.find(
        (account) => account.address === SANDBOX_PRIMARY,
      )
      if (primary === undefined || typeof primary.custodianRef !== 'string') {
        throw new Error('sandbox primary account was not discovered')
      }

      // AccountSet needs no counterparty and never executes under dry-run, so
      // this validates the request shape without mutating the sandbox.
      const accountSet: AccountSet = {
        TransactionType: 'AccountSet',
        Account: SANDBOX_PRIMARY,
        SetFlag: 8,
      }
      const body = await buildProposeIntentBody(state.intentSigner, {
        domainId: state.domainId,
        authorUserId: state.authorUserId,
        accountId: primary.custodianRef,
        ledgerId: primary.ledgerId,
        transaction: accountSet,
      })

      // Resolves iff the sandbox accepts and dry-runs the request; a malformed
      // shape surfaces as CustodyApiError (contract drift), a rejected dry-run
      // as IntentValidationError — either fails the test for investigation.
      await expect(
        runDryRun(state.client, {
          domainId: state.domainId,
          authorUserId: state.authorUserId,
          payload: body.request.payload,
          customProperties: body.request.customProperties,
        }),
      ).resolves.toBeUndefined()
    },
    LIVE_TIMEOUT_MS,
  )

  it(
    'issues an IOU through Custody and reads back the correct on-chain magnitude',
    async () => {
      // The regression guard the earlier bug slipped past: no test asserted the
      // *magnitude* of a Custody-issued IOU on-chain, only that a trust line
      // existed. This issues a known amount from the custody-held issuer to a
      // fresh faucet-funded holder, then reads the holder's trust-line balance
      // straight off the validated ledger and asserts it equals what we issued.
      //
      // The issuer is the sandbox primary (custody-signed); the holder is a
      // fresh keypair registered as a local signer on the same client, so
      // iou.issue() can sign the issuer's AccountSet/Payment through governance
      // and the holder's TrustSet locally in one multi-step flow.
      await ensureFunded(SANDBOX_PRIMARY)

      const issuer = await RippleCustody.fromEnv({
        primary: SANDBOX_PRIMARY,
        defaultTimeoutMs: ISSUE_TIMEOUT_MS,
      })
      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        faucetUrl: TESTNET_FAUCET,
        signers: [issuer],
      })
      await client.connect()
      try {
        const holder = client.account.create()
        await client.account.fund({ destination: holder.address })

        const issued = await client.iou.issue({
          ticker: 'USD',
          holder: holder.address,
          amount: ISSUE_AMOUNT,
        })
        // The native path now returns the real on-ledger hash, gated on
        // tesSUCCESS — a tec (as the mis-scaled amount produced) would throw.
        expect(issued.txHash).toMatch(/^[0-9A-F]{64}$/u)

        const retrieved = await client.iou.retrieve({
          ticker: 'USD',
          issuer: SANDBOX_PRIMARY,
          account: holder.address,
        })
        expect(retrieved.data).toBeDefined()
        // The holder's freshly-created line starts at zero, so its balance is
        // exactly what was just issued — and this is the assertion that pins the
        // scale: ~10^-79 (the pre-fix magnitude) would fail it decisively.
        expect(Number(retrieved.data?.balance)).toBeCloseTo(
          Number(ISSUE_AMOUNT),
          6,
        )
      } finally {
        await client.disconnect()
      }
    },
    ISSUE_TEST_TIMEOUT_MS,
  )

  it(
    'issues an MPT through Custody and recovers the issuance id from the ledger',
    async () => {
      // Ripple Custody confirms an MPTokenIssuanceCreate but returns no issuance
      // id in its own transaction record (ledgerData/rawTransaction are null).
      // The SDK recovers it from the on-chain tx metadata by hash — this asserts
      // that recovery end to end: without it, mptIssuanceId would be ''.
      await ensureFunded(SANDBOX_PRIMARY)

      const issuer = await RippleCustody.fromEnv({
        primary: SANDBOX_PRIMARY,
        defaultTimeoutMs: ISSUE_TIMEOUT_MS,
      })
      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        faucetUrl: TESTNET_FAUCET,
        signers: [issuer],
      })
      await client.connect()
      try {
        const result = await client.token.issue({
          metadata: {
            ticker: 'TBILL',
            name: 'Acme 3-Month T-Bill',
            icon: 'https://acme.example/tbill.png',
            asset_class: 'rwa',
            asset_subclass: 'treasury',
            issuer_name: 'Acme Capital',
          },
        })
        // The id is recovered from the ledger even though Custody omits it —
        // a 48-hex-char MPTokenIssuanceID, not the empty string.
        expect(result.intent.mptIssuanceId).toMatch(/^[0-9A-F]{48}$/u)

        // And it resolves on the ledger as an issuance owned by the primary.
        const read = await client.token.retrieve({
          mptIssuanceId: result.intent.mptIssuanceId,
        })
        expect(read.data?.issuer).toBe(SANDBOX_PRIMARY)
      } finally {
        await client.disconnect()
      }
    },
    ISSUE_TEST_TIMEOUT_MS,
  )

  describe('intent decisions (approve / reject)', () => {
    // Custody makes a proposed intent readable only after ~1 s, and this
    // sandbox's policy auto-approves this user's proposals in about the same
    // time. So by the time a reject can find the intent it has usually
    // executed, and Custody refuses it as already settled. That refusal still
    // comes after Custody has verified the request's signature (the second
    // test shows a bad signature is caught first), so it proves the decision
    // is well-formed and correctly signed. On an instance whose policy keeps
    // intents pending, the reject succeeds and the intent ends up Rejected.
    let intentId: string
    let intent: components['schemas']['Core_TrustedIntent']

    /**
     * Read the intent, polling past the 404 Custody returns until a newly
     * proposed intent becomes readable.
     *
     * @returns The intent.
     */
    async function readIntent(): Promise<
      components['schemas']['Core_TrustedIntent']
    > {
      const deadline = Date.now() + DECISION_SETTLE_MS
      for (;;) {
        try {
          // eslint-disable-next-line no-await-in-loop -- polling until readable
          return await custody.api.call('getIntent', {
            path: { domainId: state.domainId, intentId },
          })
        } catch (error) {
          if (
            !(error instanceof CustodyApiError) ||
            error.status !== 404 ||
            Date.now() > deadline
          ) {
            throw error
          }
        }
        // eslint-disable-next-line no-await-in-loop -- polling interval
        await new Promise((resolve) => {
          setTimeout(resolve, 500)
        })
      }
    }

    beforeAll(async () => {
      const { accountId, ledgerId } = requirePrimary(
        await custody.listAccounts(),
      )
      intentId = randomUUID()
      const order = await buildProposeIntentBody(state.intentSigner, {
        domainId: state.domainId,
        authorUserId: state.authorUserId,
        accountId,
        ledgerId,
        transaction: PRIMARY_ACCOUNT_SET,
        idempotencyKey: intentId,
      })
      await custody.api.propose(order.request.payload, {
        id: intentId,
        expiryAt: new Date(Date.now() + 120_000).toISOString(),
      })
      intent = await readIntent()
    }, LIVE_TIMEOUT_MS)

    it(
      'rejects the intent, or is refused only because it already settled',
      async () => {
        const settled = await custody.api
          .reject(intentId, {
            reason: 'simpleXRPL contract check: rejecting a no-op intent',
          })
          .then(
            () => false,
            (error: unknown) => {
              // The one acceptable refusal: the intent was decided before us.
              if (
                error instanceof CustodyApiError &&
                error.status === 400 &&
                error.reason === 'InvalidIntentError' &&
                (error.detail ?? '').includes('cannot be signed anymore')
              ) {
                return true
              }
              throw error
            },
          )

        const { status } = (await readIntent()).data.state
        if (settled) {
          expect(status).not.toBe('Open')
        } else {
          expect(['Open', 'Rejected']).toContain(status)
        }
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'is refused with InvalidSignatureError when the signature is wrong',
      async () => {
        const body = await buildDecisionEnvelope(state.intentSigner, {
          domainId: state.domainId,
          authorUserId: state.authorUserId,
          intent,
          decision: 'Reject',
          reason: 'simpleXRPL contract check: tampered signature',
        })
        const tampered = {
          ...body,
          signature: Buffer.from('not this request').toString('base64'),
        }

        let error: unknown
        try {
          await state.client.post('/v1/intents/reject', tampered)
        } catch (caught) {
          error = caught
        }

        // A 401 the token refresh can't fix surfaces by Custody's reason, with
        // Custody's own response as its cause.
        expect(error).toBeInstanceOf(CustodySignatureError)
        expect((error as CustodySignatureError).apiError).toMatchObject({
          status: 401,
          reason: 'InvalidSignatureError',
        })
        expect((error as Error).message).toMatch(
          /^Custody API error \(401 InvalidSignatureError\)/u,
        )
      },
      LIVE_TIMEOUT_MS,
    )
  })

  describe('API key through an HSM/KMS signer port', () => {
    it(
      'logs in and signs an intent the sandbox accepts',
      async () => {
        const { auth } = await resolveFromEnvOptions({
          primary: SANDBOX_PRIMARY,
        })
        const signerCustody = await RippleCustody.fromEnv({
          primary: SANDBOX_PRIMARY,
          signer: portAround(auth.signingKey ?? ''),
        })
        // Login ran through the port: discovery needs a token.
        const { accountId, ledgerId } = requirePrimary(
          await signerCustody.listAccounts(),
        )
        const intentId = randomUUID()
        const order = await buildProposeIntentBody(state.intentSigner, {
          domainId: state.domainId,
          authorUserId: state.authorUserId,
          accountId,
          ledgerId,
          transaction: PRIMARY_ACCOUNT_SET,
          idempotencyKey: intentId,
        })
        // api.propose re-signs the envelope through the port. A requestId back
        // means the sandbox verified that signature. The intent sits unapproved
        // and lapses at this short expiry.
        const response = await signerCustody.api.propose(
          order.request.payload,
          {
            id: intentId,
            expiryAt: new Date(Date.now() + 120_000).toISOString(),
          },
        )
        expect(response.requestId).toBeTruthy()
      },
      LIVE_TIMEOUT_MS,
    )
  })

  describe('api passthrough (call + request + paginate + propose)', () => {
    it(
      'api.call resolves getMe and the response parses to the expected shape',
      async () => {
        // A plain GET through the generic passthrough: proves the route map and
        // generated response type still match the live server.
        const me = await custody.api.call('getMe')
        expect(me.domains.some((domain) => domain.id === state.domainId)).toBe(
          true,
        )
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'api.request reaches an endpoint with no operationId',
      async () => {
        // User invitations have no operationId, so only the by-path call can
        // reach them. A read: lists at most one invitation.
        const invitations = await custody.api.request(
          'GET',
          '/v1/domains/{domainId}/users/invitations',
          { path: { domainId: state.domainId }, query: { limit: 1 } },
        )
        expect(Array.isArray(invitations.items)).toBe(true)
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'api.call interpolates a path param and lists accounts',
      async () => {
        // Exercises live `{domainId}` interpolation + a query param, and that the
        // collection response shape parses.
        const accounts = await custody.api.call('getAccounts', {
          path: { domainId: state.domainId },
          query: { limit: 5 },
        })
        expect(Array.isArray(accounts.items)).toBe(true)
        expect(typeof accounts.count).toBe('number')
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'api.paginate follows the cursor to every account',
      async () => {
        // A page size of 1 forces the cursor to be followed; the walk must
        // reach the same accounts one large page holds.
        const walked: string[] = []
        for await (const account of custody.api.paginate('getAccounts', {
          path: { domainId: state.domainId },
          query: { limit: 1 },
        })) {
          walked.push(account.data.id)
        }
        const page = await custody.api.call('getAccounts', {
          path: { domainId: state.domainId },
          query: { limit: 100 },
        })
        expect(walked).toEqual(page.items.map((account) => account.data.id))
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'api.findByAddress finds the primary, and creation finds its domain',
      async () => {
        const { accountId, ledgerId } = requirePrimary(
          await custody.listAccounts(),
        )

        const reference = await custody.api.findByAddress(SANDBOX_PRIMARY, {
          ledgerId,
        })
        expect(reference).toMatchObject({
          type: 'AccountAddressReference',
          address: SANDBOX_PRIMARY,
          domainId: state.domainId,
          accountId,
          ledgerId,
        })

        // eslint-disable-next-line n/no-process-env -- the same credentials, minus the domain
        const { RIPPLE_CUSTODY_DOMAIN_ID: _domain, ...env } = process.env
        const withoutDomain = await RippleCustody.fromEnv({
          primary: SANDBOX_PRIMARY,
          env,
        })
        expect(withoutDomain.domainId).toBe(state.domainId)
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'api.dryRunTransaction returns the verdict and fee estimate',
      async () => {
        const { ledgerId } = requirePrimary(await custody.listAccounts())

        // Non-mutating: a dry-run creates no intent.
        const response = await custody.api.dryRunTransaction(
          PRIMARY_ACCOUNT_SET,
          { ledgerId },
        )

        expect(response.type).toBe('v0_CreateTransactionOrder')
        expect(response.success).toBe(true)
        expect(response.estimate).toMatchObject({ type: 'XRPL' })
        expect(
          response.estimate.type === 'XRPL' ? response.estimate.fee : undefined,
        ).toMatch(/^\d+$/u)
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'api.dryRun reports a failed verdict instead of throwing',
      async () => {
        const { accountId } = requirePrimary(await custody.listAccounts())
        // A synthetic transfer id: Custody parses it and rejects it as
        // unknown — a verdict, returned rather than thrown.
        const transferId = randomUUID()

        const response = await custody.api.dryRun({
          accountId,
          transferIds: [transferId],
          type: 'v0_ReleaseQuarantinedTransfers',
        })

        expect(response.type).toBe('v0_ReleaseQuarantinedTransfers')
        expect(response.success).toBe(false)
        expect(JSON.stringify(response.errors)).toContain(transferId)
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'api.propose signs an envelope the sandbox accepts',
      async () => {
        const { accountId, ledgerId } = requirePrimary(
          await custody.listAccounts(),
        )
        const intentId = randomUUID()
        // Reuse the vetted create-transaction-order payload builder to get a
        // valid payload, then drive it through the *generic* propose surface —
        // exercising envelope-signing + the createIntent route end to end.
        const envelope = await buildProposeIntentBody(state.intentSigner, {
          domainId: state.domainId,
          authorUserId: state.authorUserId,
          accountId,
          ledgerId,
          transaction: PRIMARY_ACCOUNT_SET,
          idempotencyKey: intentId,
        })
        // A `requestId` back means the sandbox verified the signature and parsed
        // the envelope — the contract this guards. A shape or canonicalization
        // drift surfaces as CustodyApiError/CustodyAuthError and fails the test.
        // The intent sits unapproved and lapses at this short expiry.
        // proposeAndWait = propose + waitForIntent, so this also proves the
        // outcome wait reads the live intent back by the signed id.
        const response = await custody.api.proposeAndWait(
          envelope.request.payload,
          {
            id: intentId,
            expiryAt: new Date(Date.now() + 120_000).toISOString(),
            timeoutMs: 30_000,
          },
        )
        expect(typeof response.requestId).toBe('string')
        expect(response.requestId).toBeTruthy()
        // The intent id the envelope was signed under comes back as the
        // caller's handle on the intent.
        expect(response.intentId).toBe(intentId)
        // Reported, not thrown, whatever the sandbox's policy decides: the
        // intent was read back, and anything short of success says why.
        expect(response.status).toBeDefined()
        expect(response.intent?.data.id).toBe(intentId)
        if (!response.isSuccess) {
          expect(typeof response.reason).toBe('string')
        }
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'the sandbox accepts and validates a release-quarantine payload shape',
      async () => {
        const { accountId } = requirePrimary(await custody.listAccounts())
        // A fresh sandbox has no quarantined transfers to release, so dry-run a
        // synthetic one: the goal is to prove the server accepts and *processes*
        // the `v0_ReleaseQuarantinedTransfers` payload shape, not to release
        // anything. It parses our transferId and reaches its existence check —
        // a business-level rejection (IntentValidationError naming our id),
        // rather than rejecting the request outright (CustodyApiError), which is
        // what a wire-shape drift would produce. Non-mutating: dry-run creates
        // no intent, and the transfer doesn't exist regardless.
        const transferId = randomUUID()
        let caught: unknown
        try {
          await runDryRun(state.client, {
            domainId: state.domainId,
            authorUserId: state.authorUserId,
            payload: {
              accountId,
              transferIds: [transferId],
              type: 'v0_ReleaseQuarantinedTransfers',
            },
            customProperties: {},
          })
        } catch (error) {
          caught = error
        }
        // Shape accepted + processed: a business rejection that echoes the
        // transferId we sent, not an API/transport error.
        expect(caught).toBeInstanceOf(IntentValidationError)
        expect((caught as Error).message).toContain(transferId)
      },
      LIVE_TIMEOUT_MS,
    )
  })
})
