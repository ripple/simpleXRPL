import { randomUUID } from 'node:crypto'

import type { AccountSet } from 'xrpl'

import {
  buildRippleCustodyState,
  resolveFromEnvOptions,
} from '../../src/custodians/ripple/construction.js'
import type { RippleCustodyState } from '../../src/custodians/ripple/construction.js'
import { buildProposeIntentBody } from '../../src/custodians/ripple/mapping/envelope.js'
import { runDryRun } from '../../src/custodians/ripple/submission/dry-run.js'
import type { Account } from '../../src/domain/index.js'
import { IntentValidationError } from '../../src/errors.js'
import { RippleCustody, SimpleXRPL } from '../../src/index.js'
import { TESTNET_FAUCET, TESTNET_WS, ensureFunded } from '../helpers/testnet.js'

import { SANDBOX_PRIMARY, describeContract } from './helpers/custody-sandbox.js'

const LIVE_TIMEOUT_MS = 120_000

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
      const body = buildProposeIntentBody(state.intentSigner, {
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

  describe('api passthrough (call + propose)', () => {
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
      'api.propose signs an envelope the sandbox accepts',
      async () => {
        const { accountId, ledgerId } = requirePrimary(
          await custody.listAccounts(),
        )
        const intentId = randomUUID()
        // Reuse the vetted create-transaction-order payload builder to get a
        // valid payload, then drive it through the *generic* propose surface —
        // exercising envelope-signing + the createIntent route end to end.
        const envelope = buildProposeIntentBody(state.intentSigner, {
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
        const response = await custody.api.propose(envelope.request.payload, {
          id: intentId,
          expiryAt: new Date(Date.now() + 120_000).toISOString(),
        })
        expect(typeof response.requestId).toBe('string')
        expect(response.requestId).toBeTruthy()
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
