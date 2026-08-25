import type { AccountSet } from 'xrpl'

import {
  buildRippleCustodyState,
  resolveFromEnvOptions,
} from '../../src/custodians/ripple/construction.js'
import type { RippleCustodyState } from '../../src/custodians/ripple/construction.js'
import { buildProposeIntentBody } from '../../src/custodians/ripple/mapping/envelope.js'
import { runDryRun } from '../../src/custodians/ripple/submission/dry-run.js'
import { RippleCustody, SimpleXRPL } from '../../src/index.js'
import { TESTNET_FAUCET, TESTNET_WS, ensureFunded } from '../helpers/testnet.js'

import { SANDBOX_PRIMARY, describeContract } from './helpers/custody-sandbox.js'

const LIVE_TIMEOUT_MS = 120_000

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
})
