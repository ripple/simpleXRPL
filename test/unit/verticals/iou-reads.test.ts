import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import { LocalSigner, SimpleXRPL, SimpleXRPLError } from '../../../src/index.js'
import type {
  LedgerPort,
  LedgerRequest,
  SimpleXRPLClient,
} from '../../../src/index.js'

const ISSUER = Wallet.generate().classicAddress
// The 40-char hex form of the "TBILL" currency code.
const TBILL_HEX = '5442494C4C'.padEnd(40, '0')

/** A raw `account_lines` entry. */
interface RawLine {
  account: string
  balance: string
  currency: string
  limit: string
  limit_peer: string
  no_ripple?: boolean
  freeze?: boolean
  authorized?: boolean
}

const LINES: RawLine[] = [
  {
    account: ISSUER,
    balance: '100',
    currency: 'USD',
    limit: '1000',
    limit_peer: '0',
    no_ripple: true,
    authorized: true,
  },
  {
    account: ISSUER,
    balance: '5',
    currency: TBILL_HEX,
    limit: '50',
    limit_peer: '0',
    freeze: true,
  },
]

/**
 * A ledger that answers `account_lines` with `LINES` and records requests.
 *
 * @param requests - Captures each ledger request for assertions.
 * @returns The fake ledger.
 */
function fakeLedger(requests: LedgerRequest[]): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => tx,
    submit: async () => ({}) as never,
    submitAndWait: async () => ({}) as never,
    async request<T>(req: LedgerRequest): Promise<T> {
      requests.push(req)
      if (req.command === 'account_lines') {
        return { result: { lines: LINES } } as unknown as T
      }
      return {} as T
    },
  }
}

async function clientWithSigner(
  requests: LedgerRequest[],
): Promise<SimpleXRPLClient> {
  return SimpleXRPL.init({
    rippledUrl: 'wss://x.invalid',
    signers: [LocalSigner.fromSeed(Wallet.generate().seed as string)],
    ledger: fakeLedger(requests),
  })
}

describe('IOU.list', () => {
  it('shapes trust lines, decodes hex currency, and composes iouIDs', async () => {
    const requests: LedgerRequest[] = []
    const client = await clientWithSigner(requests)

    const { ious, data } = await client.iou.list()

    expect(data).toHaveLength(2)
    expect(data[0]).toEqual({
      currency: 'USD',
      peer: ISSUER,
      balance: '100',
      limit: '1000',
      limitPeer: '0',
      noRipple: true,
      frozen: false,
      authorized: true,
    })
    expect(data[1].currency).toBe('TBILL')
    expect(data[1].frozen).toBe(true)
    expect(ious).toEqual([`USD.${ISSUER}`, `TBILL.${ISSUER}`])
  })

  it('defaults to the primary signer account, or uses an explicit one', async () => {
    const requests: LedgerRequest[] = []
    const client = await clientWithSigner(requests)
    const primary = client.primaryAddress()

    await client.iou.list()
    expect(requests[0].account).toBe(primary)

    await client.iou.list({ account: 'rExplicit00000000000000000000000000' })
    expect(requests[1].account).toBe('rExplicit00000000000000000000000000')
  })
})

describe('IOU.retrieve', () => {
  it('returns the iouID and the matching line', async () => {
    const client = await clientWithSigner([])
    const result = await client.iou.retrieve({ ticker: 'USD', issuer: ISSUER })
    expect(result.iouID).toBe(`USD.${ISSUER}`)
    expect(result.data?.balance).toBe('100')
    expect(result.data?.peer).toBe(ISSUER)
  })

  it('returns undefined data when no line matches', async () => {
    const client = await clientWithSigner([])
    const result = await client.iou.retrieve({ ticker: 'EUR', issuer: ISSUER })
    expect(result.iouID).toBe(`EUR.${ISSUER}`)
    expect(result.data).toBeUndefined()
  })
})

describe('IOU reads without a signer', () => {
  it('work when given an explicit account', async () => {
    const requests: LedgerRequest[] = []
    const client = await SimpleXRPL.init({
      rippledUrl: 'wss://x.invalid',
      ledger: fakeLedger(requests),
    })
    const { data } = await client.iou.list({ account: ISSUER })
    expect(data).toHaveLength(2)
    expect(requests[0].account).toBe(ISSUER)
  })

  it('throw a clear error when no account and no signer', async () => {
    const client = await SimpleXRPL.init({
      rippledUrl: 'wss://x.invalid',
      ledger: fakeLedger([]),
    })
    await expect(client.iou.list()).rejects.toBeInstanceOf(SimpleXRPLError)
  })
})
