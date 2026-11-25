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

/** A second account the custodian holds: the one activated or issued to. */
const HELD = Wallet.generate().classicAddress

const notImplemented = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/**
 * A custodian that records, in order, the context and the transaction type of
 * each submission it received.
 */
interface ContextRecordingCustodian extends Custodian {
  readonly contexts: SubmissionContext[]
  readonly types: string[]
}

/**
 * A governed custodian that records each submission's context and, as Ripple
 * Custody does, reports an auto-proposed quarantine release for a Payment only.
 *
 * @returns The custodian.
 */
function makeCustodian(): ContextRecordingCustodian {
  const contexts: SubmissionContext[] = []
  const types: string[] = []
  let custodian: ContextRecordingCustodian
  const listAccounts = async (): Promise<Account[]> => [
    { address: SOURCE, custodianRef: 'account-1', signer: custodian },
    { address: HELD, custodianRef: 'account-2', signer: custodian },
  ]
  const submitAndWait = async (
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> => {
    contexts.push(ctx)
    types.push(tx.TransactionType)
    return {
      source: 'custody',
      response: {},
      intent: undefined,
      quarantineReleaseIntentIds:
        tx.TransactionType === 'Payment' ? ['release-1'] : undefined,
    }
  }
  custodian = {
    kind: 'ripple-custody',
    primary: { address: SOURCE },
    contexts,
    types,
    capabilities: (): SignerCapabilities => ({
      nativeOps: new Set(['Payment', 'AccountSet', 'TrustSet']),
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

// The verbs that send a Payment as one step among several, called with the
// given per-call option.
const COMPOSITES = [
  [
    'Account.activate',
    async (
      client: SimpleXRPLClient,
      autoReleaseQuarantine?: boolean,
    ): Promise<SubmissionResult> =>
      client.account.activate(
        { destination: HELD, amount: '10' },
        { autoReleaseQuarantine },
      ),
  ],
  [
    'IOU.issue',
    async (
      client: SimpleXRPLClient,
      autoReleaseQuarantine?: boolean,
    ): Promise<SubmissionResult> =>
      client.iou.issue(
        { ticker: 'USD', holder: HELD, amount: '5' },
        { autoReleaseQuarantine },
      ),
  ],
] as const

describe('the option on a verb that sends a Payment among other steps', () => {
  it.each(COMPOSITES)(
    '%s passes it to the Payment alone and returns the Payment’s release ids',
    async (_name, run) => {
      const custodian = makeCustodian()
      const client = await SimpleXRPL.init({
        xrpldUrl: 'wss://x.invalid',
        signers: [custodian],
        ledger: fakeLedger(),
      })

      const result = await run(client, true)

      const flags = custodian.types.map((type, index) => [
        type,
        custodian.contexts[index].autoReleaseQuarantine,
      ])
      expect(flags.filter(([type]) => type === 'Payment')).toEqual([
        ['Payment', true],
      ])
      expect(flags.filter(([type]) => type !== 'Payment')).not.toHaveLength(0)
      expect(
        flags.filter(
          ([type, flag]) => type !== 'Payment' && flag !== undefined,
        ),
      ).toEqual([])
      expect(result.quarantineReleaseIntentIds).toEqual(['release-1'])
    },
  )

  it.each(COMPOSITES)('%s can turn it off for one call', async (_name, run) => {
    const custodian = makeCustodian()
    const client = await SimpleXRPL.init({
      xrpldUrl: 'wss://x.invalid',
      signers: [custodian],
      ledger: fakeLedger(),
    })

    await run(client, false)

    const payment = custodian.types.indexOf('Payment')
    expect(custodian.contexts[payment].autoReleaseQuarantine).toBe(false)
  })

  it.each(COMPOSITES)(
    '%s leaves it unset by default, so the custodian’s default applies',
    async (_name, run) => {
      const custodian = makeCustodian()
      const client = await SimpleXRPL.init({
        xrpldUrl: 'wss://x.invalid',
        signers: [custodian],
        ledger: fakeLedger(),
      })

      await run(client)

      const payment = custodian.types.indexOf('Payment')
      expect(custodian.contexts[payment].autoReleaseQuarantine).toBeUndefined()
    },
  )
})
