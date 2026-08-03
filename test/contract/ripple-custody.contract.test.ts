import type { AccountSet } from 'xrpl'

import {
  buildRippleCustodyState,
  resolveFromEnvOptions,
} from '../../src/custodians/ripple/construction.js'
import type { RippleCustodyState } from '../../src/custodians/ripple/construction.js'
import { buildProposeIntentBody } from '../../src/custodians/ripple/mapping/envelope.js'
import { runDryRun } from '../../src/custodians/ripple/submission/dry-run.js'
import { RippleCustody } from '../../src/index.js'

import { SANDBOX_PRIMARY, describeContract } from './helpers/custody-sandbox.js'

const LIVE_TIMEOUT_MS = 120_000

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
})
