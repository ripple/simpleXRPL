import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import { LocalSigner, SimpleXRPL } from '../../../src/index.js'
import type {
  LedgerPort,
  LedgerRequest,
  SimpleXRPLClient,
} from '../../../src/index.js'

const ISSUER = Wallet.generate().classicAddress
const MPT_ID = '00002403C84A0A28E0190E208E982C352BBD5006600555CF'
const usd = (value: string): Record<string, string> => ({
  currency: 'USD',
  issuer: ISSUER,
  value,
})

/**
 * A ledger that answers offer/object reads from per-command handlers.
 *
 * @param handlers - Per-command response factories.
 * @param handlers.accountOffers - `account_offers` entries.
 * @param handlers.book - `book_offers` entries, keyed by whether taker_gets is XRP.
 * @param handlers.accountObjects - `account_objects` entries by `type`.
 * @returns The fake ledger.
 */
function fakeLedger(handlers: {
  accountOffers?: () => unknown[]
  book?: (getsXrp: boolean) => unknown[]
  accountObjects?: (type: string) => unknown[]
}): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => tx,
    submit: async () => ({}) as never,
    submitAndWait: async () => ({}) as never,
    async request<T>(req: LedgerRequest): Promise<T> {
      if (req.command === 'account_offers') {
        return { result: { offers: handlers.accountOffers?.() ?? [] } } as T
      }
      if (req.command === 'book_offers') {
        const getsXrp =
          (req.taker_gets as { currency: string }).currency === 'XRP'
        return { result: { offers: handlers.book?.(getsXrp) ?? [] } } as T
      }
      return {
        result: {
          account_objects: handlers.accountObjects?.(req.type as string) ?? [],
        },
      } as T
    },
  }
}

async function clientWith(ledger: LedgerPort): Promise<SimpleXRPLClient> {
  return SimpleXRPL.init({
    xrpldUrl: 'wss://x.invalid',
    signers: [LocalSigner.fromSeed(Wallet.generate().seed as string)],
    ledger,
  })
}

describe('Account.listOffers', () => {
  it('shapes sells and buys, converting drops and composing price', async () => {
    const client = await clientWith(
      fakeLedger({
        accountOffers: () => [
          { seq: 1, flags: 0, taker_gets: usd('100'), taker_pays: '50000000' },
          { seq: 2, flags: 0, taker_gets: '30000000', taker_pays: usd('60') },
        ],
      }),
    )
    const { data } = await client.account.listOffers()
    expect(data[0]).toEqual({
      offerSequence: 1,
      amount: '100',
      price: { currency: 'XRP', amount: '50' },
      orderType: 'limit',
      type: 'sell',
    })
    expect(data[1]).toEqual({
      offerSequence: 2,
      amount: '60',
      price: { currency: 'XRP', amount: '30' },
      orderType: 'limit',
      type: 'buy',
    })
  })
})

describe('IOU.listOffers', () => {
  it('merges both book sides, tagged buy/sell relative to the IOU', async () => {
    const client = await clientWith(
      fakeLedger({
        book(getsXrp) {
          if (getsXrp) {
            // Buy side: passive offer buying 4 USD for 2 XRP.
            return [
              {
                Sequence: 4,
                Flags: 0x00010000,
                TakerGets: '2000000',
                TakerPays: usd('4'),
              },
            ]
          }
          // Sell side: selling 10 USD for 5 XRP.
          return [
            {
              Sequence: 3,
              Flags: 0,
              TakerGets: usd('10'),
              TakerPays: '5000000',
            },
          ]
        },
      }),
    )
    const { data } = await client.iou.listOffers({
      ticker: 'USD',
      issuer: ISSUER,
    })
    const sell = data.find((offer) => offer.type === 'sell')
    const buy = data.find((offer) => offer.type === 'buy')
    expect(sell).toEqual({
      offerSequence: 3,
      amount: '10',
      price: { currency: 'XRP', amount: '5' },
      orderType: 'limit',
      type: 'sell',
    })
    expect(buy).toEqual({
      offerSequence: 4,
      amount: '4',
      price: { currency: 'XRP', amount: '2' },
      orderType: 'passive',
      type: 'buy',
    })
  })
})

describe('Token.list', () => {
  it('issuer role returns full issuances', async () => {
    const client = await clientWith(
      fakeLedger({
        accountObjects(type) {
          if (type !== 'mpt_issuance') {
            return []
          }
          return [
            {
              Issuer: ISSUER,
              Flags: 0x0020,
              AssetScale: 2,
              OutstandingAmount: '1000',
              mpt_issuance_id: MPT_ID,
            },
          ]
        },
      }),
    )
    const { tokens, data } = await client.token.list({ role: 'issuer' })
    expect(tokens).toEqual([MPT_ID])
    expect(data[0].issuance?.issuer).toBe(ISSUER)
    expect(data[0].issuance?.flags.canTransfer).toBe(true)
  })

  it('holder role returns balance records', async () => {
    const client = await clientWith(
      fakeLedger({
        accountObjects(type) {
          return type === 'mptoken'
            ? [{ MPTokenIssuanceID: MPT_ID, MPTAmount: '42' }]
            : []
        },
      }),
    )
    const { tokens, data } = await client.token.list()
    expect(tokens).toEqual([MPT_ID])
    expect(data[0]).toEqual({ tokenID: MPT_ID, balance: '42' })
  })
})
