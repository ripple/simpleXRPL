import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import { SimpleXRPL, submitTransaction } from '../../../src/index.js'
import type {
  Account,
  Custodian,
  SignerCapabilities,
  SubmissionContext,
  SubmissionResult,
} from '../../../src/index.js'

import { fakeLedger } from './fake-ledger.js'

const XRPLD = 'wss://x.invalid'
const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u

const notImplemented = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/** A custodian that records the idempotency key each submission carried. */
interface KeyRecordingCustodian extends Custodian {
  readonly keys: Array<string | undefined>
}

function makeCustodian(address: string): KeyRecordingCustodian {
  const keys: Array<string | undefined> = []
  const capabilities = (): SignerCapabilities => ({
    nativeOps: new Set(['Payment']),
    allowRaw: false,
  })
  let custodian: KeyRecordingCustodian
  const listAccounts = async (): Promise<Account[]> => [
    { address, custodianRef: `ref-${address}`, signer: custodian },
  ]
  const submitAndWait = async (
    _tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> => {
    keys.push(ctx.idempotencyKey)
    return { source: 'custody', response: {}, intent: undefined }
  }
  custodian = {
    kind: 'ripple-custody',
    primary: { address },
    keys,
    capabilities,
    listAccounts,
    sign: notImplemented,
    submitAndWait,
    submitAsync: notImplemented,
  }
  return custodian
}

const DEST = Wallet.generate().classicAddress

function payment(from: string): Transaction {
  return {
    TransactionType: 'Payment',
    Account: from,
    Destination: DEST,
    Amount: '1000000',
  }
}

describe('pipeline idempotency', () => {
  it('generates a UUIDv7 key when none is supplied and surfaces it on the result', async () => {
    const custodian = makeCustodian('rSrc1')
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [custodian],
      ledger: fakeLedger(),
    })

    const result = await submitTransaction(client, {
      transaction: payment('rSrc1'),
      account: client.resolveAccount('rSrc1'),
    })

    expect(result.idempotencyKey).toMatch(UUID_V7_RE)
    // The custodian saw exactly the key that was surfaced.
    expect(custodian.keys).toEqual([result.idempotencyKey])
  })

  it('reuses a caller-supplied key verbatim (retry resolves to the same intent)', async () => {
    const custodian = makeCustodian('rSrc1')
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [custodian],
      ledger: fakeLedger(),
    })
    const key = '01890000-0000-7000-8000-000000000abc'

    const result = await submitTransaction(client, {
      transaction: payment('rSrc1'),
      account: client.resolveAccount('rSrc1'),
      idempotencyKey: key,
    })

    expect(result.idempotencyKey).toBe(key)
    expect(custodian.keys).toEqual([key])
  })

  it('generates a fresh key per submission when none is supplied', async () => {
    const custodian = makeCustodian('rSrc1')
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [custodian],
      ledger: fakeLedger(),
    })
    const account = client.resolveAccount('rSrc1')

    const first = await submitTransaction(client, {
      transaction: payment('rSrc1'),
      account,
    })
    const second = await submitTransaction(client, {
      transaction: payment('rSrc1'),
      account,
    })

    expect(first.idempotencyKey).not.toBe(second.idempotencyKey)
  })
})

describe('operation-level idempotency', () => {
  it('surfaces a generated key and reuses a supplied one through an operation', async () => {
    const custodian = makeCustodian('rSrc1')
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [custodian],
      ledger: fakeLedger(),
    })

    const generated = await client.xrp.transfer(
      { to: DEST, amount: '1' },
      { from: 'rSrc1' },
    )
    expect(generated.idempotencyKey).toMatch(UUID_V7_RE)

    const key = '01890000-0000-7000-8000-000000000fff'
    const retried = await client.xrp.transfer(
      { to: DEST, amount: '1' },
      { from: 'rSrc1', idempotencyKey: key },
    )
    expect(retried.idempotencyKey).toBe(key)
    expect(custodian.keys).toEqual([generated.idempotencyKey, key])
  })
})
