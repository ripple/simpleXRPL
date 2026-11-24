import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import { mpt, SimpleXRPL } from '../../../src/index.js'
import type {
  Account,
  Custodian,
  SignerCapabilities,
  SimpleXRPLClient,
  SubmissionContext,
  SubmissionResult,
} from '../../../src/index.js'

import { fakeLedger } from './fake-ledger.js'

/** A syntactically valid MPT issuance id (Hash192 = 48 hex chars). */
const MPT_ID = '00000001ABCDEF0123456789ABCDEF0123456789ABCDEF01'
const SOURCE = Wallet.generate().classicAddress
const DEST = Wallet.generate().classicAddress

const notImplemented = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/** A custodian that records the context each submission carried. */
interface ContextRecordingCustodian extends Custodian {
  readonly contexts: SubmissionContext[]
}

/**
 * A governed custodian that takes Payments natively, records each submission's
 * context, and reports one auto-proposed quarantine release.
 *
 * @returns The custodian.
 */
function makeCustodian(): ContextRecordingCustodian {
  const contexts: SubmissionContext[] = []
  let custodian: ContextRecordingCustodian
  const listAccounts = async (): Promise<Account[]> => [
    { address: SOURCE, custodianRef: 'account-1', signer: custodian },
  ]
  const submitAndWait = async (
    _tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> => {
    contexts.push(ctx)
    return {
      source: 'custody',
      response: {},
      intent: undefined,
      quarantineReleaseIntentIds: ['release-1'],
    }
  }
  custodian = {
    kind: 'ripple-custody',
    primary: { address: SOURCE },
    contexts,
    capabilities: (): SignerCapabilities => ({
      nativeOps: new Set(['Payment']),
      allowRaw: false,
    }),
    listAccounts,
    sign: notImplemented,
    submitAndWait,
    submitAsync: notImplemented,
  }
  return custodian
}

// Each transfer verb, called with the given per-call option.
const TRANSFERS = [
  [
    'XRP.transfer',
    async (
      client: SimpleXRPLClient,
      autoReleaseQuarantine?: boolean,
    ): Promise<SubmissionResult> =>
      client.xrp.transfer({ to: DEST, amount: '1' }, { autoReleaseQuarantine }),
  ],
  [
    'Token.transfer',
    async (
      client: SimpleXRPLClient,
      autoReleaseQuarantine?: boolean,
    ): Promise<SubmissionResult> =>
      client.token.transfer(
        { to: DEST, amount: { asset: mpt(MPT_ID, 2), value: '1' } },
        { autoReleaseQuarantine },
      ),
  ],
  [
    'IOU.transfer',
    async (
      client: SimpleXRPLClient,
      autoReleaseQuarantine?: boolean,
    ): Promise<SubmissionResult> =>
      client.iou.transfer(
        { ticker: 'USD', to: DEST, amount: '1' },
        { autoReleaseQuarantine },
      ),
  ],
] as const

describe('the per-call autoReleaseQuarantine option', () => {
  it.each(TRANSFERS)(
    '%s passes it to the custodian and returns the release intent ids',
    async (_name, transfer) => {
      const custodian = makeCustodian()
      const client = await SimpleXRPL.init({
        xrpldUrl: 'wss://x.invalid',
        signers: [custodian],
        ledger: fakeLedger(),
      })

      const result = await transfer(client, true)

      expect(custodian.contexts).toHaveLength(1)
      expect(custodian.contexts[0].autoReleaseQuarantine).toBe(true)
      expect(result.quarantineReleaseIntentIds).toEqual(['release-1'])
    },
  )

  it.each(TRANSFERS)(
    '%s can turn it off for one call',
    async (_name, transfer) => {
      const custodian = makeCustodian()
      const client = await SimpleXRPL.init({
        xrpldUrl: 'wss://x.invalid',
        signers: [custodian],
        ledger: fakeLedger(),
      })

      await transfer(client, false)

      expect(custodian.contexts[0].autoReleaseQuarantine).toBe(false)
    },
  )

  it.each(TRANSFERS)(
    '%s leaves it unset by default, so the custodian’s default applies',
    async (_name, transfer) => {
      const custodian = makeCustodian()
      const client = await SimpleXRPL.init({
        xrpldUrl: 'wss://x.invalid',
        signers: [custodian],
        ledger: fakeLedger(),
      })

      await transfer(client)

      expect(custodian.contexts[0].autoReleaseQuarantine).toBeUndefined()
    },
  )
})
