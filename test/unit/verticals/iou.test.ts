import { OfferCreateFlags, TrustSetFlags, Wallet } from 'xrpl'
import type {
  Clawback,
  OfferCancel,
  OfferCreate,
  Payment,
  SubmitResponse,
  Transaction,
  TrustSet,
  TxResponse,
} from 'xrpl'

import {
  IntentValidationError,
  LocalSigner,
  SimpleXRPL,
} from '../../../src/index.js'
import type {
  LedgerPort,
  LedgerRequest,
  SimpleXRPLClient,
} from '../../../src/index.js'

interface IouFixture {
  client: SimpleXRPLClient
  txs: Transaction[]
  issuerAddress: string
  holderAddress: string
}

/**
 * A ledger that captures every built transaction (via `autofill`) and answers
 * `account_info` with the given clawback flag state.
 *
 * @param clawbackEnabled - Whether `account_info` reports
 * `lsfAllowTrustLineClawback` set (default `false`).
 * @returns The fake ledger and the transactions it builds.
 */
function fakeLedger(clawbackEnabled = false): {
  ledger: LedgerPort
  txs: Transaction[]
} {
  const txs: Transaction[] = []
  const flags = clawbackEnabled ? 0x80000000 : 0
  const ledger: LedgerPort = {
    async autofill(tx: Transaction): Promise<Transaction> {
      txs.push(tx)
      return { ...tx, Sequence: 1, Fee: '12', LastLedgerSequence: 100 }
    },
    submit: async (): Promise<SubmitResponse> =>
      ({ result: {} }) as unknown as SubmitResponse,
    submitAndWait: async (): Promise<TxResponse> =>
      ({ result: { hash: 'HASH' } }) as unknown as TxResponse,
    async request<T>(req: LedgerRequest): Promise<T> {
      if (req.command === 'account_info') {
        return {
          result: { account_data: { Flags: flags } },
        } as unknown as T
      }
      return {} as T
    },
  }
  return { ledger, txs }
}

/**
 * Build a client whose primary signer is a fresh issuer wallet, with that
 * wallet's seed (plus a hot-wallet seed) seeded into the env vars `IOU.issue`
 * reads. IOU verbs default their acting account to this issuer.
 *
 * @param clawbackEnabled - Passed through to {@link fakeLedger}.
 * @returns The client, captured txs, and the issuer/holder addresses.
 */
async function issuedClient(clawbackEnabled = false): Promise<IouFixture> {
  const issuer = Wallet.generate()
  const holder = Wallet.generate()
  // eslint-disable-next-line n/no-process-env -- seeding the env vars IOU.issue reads is the point of this helper
  process.env.XRPL_ISSUER_SEED = issuer.seed
  // eslint-disable-next-line n/no-process-env -- seeding the env vars IOU.issue reads is the point of this helper
  process.env.XRPL_HOT_WALLET_SEED = holder.seed
  const { ledger, txs } = fakeLedger(clawbackEnabled)
  const client = await SimpleXRPL.init({
    xrpldUrl: 'wss://x.invalid',
    signers: [LocalSigner.fromSeed(issuer.seed as string)],
    ledger,
  })
  return {
    client,
    txs,
    issuerAddress: issuer.classicAddress,
    holderAddress: holder.classicAddress,
  }
}

afterEach(() => {
  // eslint-disable-next-line n/no-process-env -- cleaning up the seeded env vars between tests
  delete process.env.XRPL_ISSUER_SEED
  // eslint-disable-next-line n/no-process-env -- cleaning up the seeded env vars between tests
  delete process.env.XRPL_HOT_WALLET_SEED
})

describe('IOU.issue', () => {
  it('throws when the issuance env vars are missing', async () => {
    const client = await SimpleXRPL.init({ xrpldUrl: 'wss://x.invalid' })
    await expect(client.iou.issue({ ticker: 'USD' })).rejects.toBeInstanceOf(
      IntentValidationError,
    )
  })

  it('runs AccountSet on the issuer and a max-limit TrustSet on the holder', async () => {
    const { client, txs, issuerAddress, holderAddress } = await issuedClient()

    const result = await client.iou.issue({ ticker: 'USD' })

    expect(result.intent.iouID).toBe(`USD.${issuerAddress}`)
    const accountSet = txs[0]
    expect(accountSet.TransactionType).toBe('AccountSet')
    expect(accountSet.Account).toBe(issuerAddress)

    const trustSet = txs[1] as TrustSet
    expect(trustSet.TransactionType).toBe('TrustSet')
    expect(trustSet.Account).toBe(holderAddress)
    expect(trustSet.LimitAmount).toEqual({
      currency: 'USD',
      issuer: issuerAddress,
      value: '9'.repeat(15),
    })
  })

  it('hex-encodes a non-standard ticker', async () => {
    const { client, issuerAddress } = await issuedClient()
    const result = await client.iou.issue({ ticker: 'TBILL' })
    const expected = '5442494C4C'.padEnd(40, '0')
    expect(result.intent.iouID).toBe(`${expected}.${issuerAddress}`)
  })

  it('rejects a ticker that does not fit in 20 bytes', async () => {
    const { client } = await issuedClient()
    await expect(
      client.iou.issue({ ticker: 'A'.repeat(25) }),
    ).rejects.toBeInstanceOf(IntentValidationError)
  })
})

describe('IOU.authorize', () => {
  it('builds a TrustSet with the tfSetfAuth flag', async () => {
    const { client, txs, issuerAddress } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const holder = Wallet.generate().classicAddress
    const result = await client.iou.authorize({ ticker: 'USD', holder })
    const tx = txs[0] as TrustSet
    expect(tx.TransactionType).toBe('TrustSet')
    expect(tx.Account).toBe(issuerAddress)
    expect(tx.LimitAmount).toMatchObject({ currency: 'USD', issuer: holder })
    expect(tx.Flags).toBe(TrustSetFlags.tfSetfAuth)
    expect(result.intent).toEqual({ holder })
  })
})

describe('IOU.lock / IOU.unlock', () => {
  it('locks with Individual Freeze then Deep Freeze, in order', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const holder = Wallet.generate().classicAddress
    const result = await client.iou.lock({ ticker: 'USD', holder })
    expect((txs[0] as TrustSet).Flags).toBe(TrustSetFlags.tfSetFreeze)
    expect((txs[1] as TrustSet).Flags).toBe(TrustSetFlags.tfSetDeepFreeze)
    expect(result.intent).toEqual({ holder })
  })

  it('unlocks by clearing Deep Freeze then Individual Freeze, in order', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const holder = Wallet.generate().classicAddress
    const result = await client.iou.unlock({ ticker: 'USD', holder })
    expect((txs[0] as TrustSet).Flags).toBe(TrustSetFlags.tfClearDeepFreeze)
    expect((txs[1] as TrustSet).Flags).toBe(TrustSetFlags.tfClearFreeze)
    expect(result.intent).toEqual({ holder })
  })
})

describe('IOU.clawback', () => {
  it('throws when the issuer has not enabled asfAllowTrustLineClawback', async () => {
    const { client } = await issuedClient(false)
    await client.iou.issue({ ticker: 'USD' })

    await expect(
      client.iou.clawback({
        ticker: 'USD',
        holder: Wallet.generate().classicAddress,
        amount: 25,
      }),
    ).rejects.toBeInstanceOf(IntentValidationError)
  })

  it('builds a Clawback with the holder as the amount issuer', async () => {
    const { client, txs, issuerAddress } = await issuedClient(true)
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const holder = Wallet.generate().classicAddress
    const result = await client.iou.clawback({
      ticker: 'USD',
      holder,
      amount: 25,
    })
    const tx = txs[0] as Clawback
    expect(tx.TransactionType).toBe('Clawback')
    expect(tx.Account).toBe(issuerAddress)
    expect(tx.Amount).toEqual({ currency: 'USD', issuer: holder, value: '25' })
    expect(result.intent).toEqual({ holder, amount: 25 })
  })
})

describe('IOU.transfer', () => {
  it('sends a Payment from the issuer to the destination', async () => {
    const { client, txs, issuerAddress } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const destination = Wallet.generate().classicAddress
    const result = await client.iou.transfer({
      ticker: 'USD',
      destination,
      amount: 50,
    })
    const tx = txs[0] as Payment
    expect(tx.TransactionType).toBe('Payment')
    expect(tx.Account).toBe(issuerAddress)
    expect(tx.Destination).toBe(destination)
    expect(tx.Amount).toEqual({
      currency: 'USD',
      issuer: issuerAddress,
      value: '50',
    })
    expect(result.intent).toEqual({ destination, amount: 50 })
  })
})

describe('IOU.buyOffer / IOU.sellOffer / IOU.cancelOffer', () => {
  it('prices a sell offer in XRP and sets tfSell for a limit order', async () => {
    const { client, txs, issuerAddress } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    await client.iou.sellOffer({
      ticker: 'USD',
      amount: 100,
      orderType: 'limit',
      price: { currency: 'XRP', amount: 50 },
    })
    const tx = txs[0] as OfferCreate
    expect(tx.TransactionType).toBe('OfferCreate')
    expect(tx.TakerGets).toEqual({
      currency: 'USD',
      issuer: issuerAddress,
      value: '100',
    })
    expect(tx.TakerPays).toBe('50000000')
    expect(tx.Flags).toBe(OfferCreateFlags.tfSell)
  })

  it('prices a buy offer in another IOU and omits flags for a limit order', async () => {
    const { client, txs, issuerAddress } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const priceIssuer = Wallet.generate().classicAddress
    await client.iou.buyOffer({
      ticker: 'USD',
      amount: 100,
      orderType: 'limit',
      price: { ticker: 'EUR', issuer: priceIssuer, amount: 90 },
    })
    const tx = txs[0] as OfferCreate
    expect(tx.TakerGets).toEqual({
      currency: 'EUR',
      issuer: priceIssuer,
      value: '90',
    })
    expect(tx.TakerPays).toEqual({
      currency: 'USD',
      issuer: issuerAddress,
      value: '100',
    })
    expect(tx.Flags).toBeUndefined()
  })

  it('scopes an offer to a permissioned domain and defaults to hybrid', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const domainID = 'A'.repeat(64)
    await client.iou.buyOffer({
      ticker: 'USD',
      amount: 1,
      orderType: 'limit',
      price: { currency: 'XRP', amount: 1 },
      domainID,
    })
    const tx = txs[0] as OfferCreate
    expect(tx.DomainID).toBe(domainID)
    // limit → no base flag; domain present + hybrid unspecified → tfHybrid.
    expect(tx.Flags).toBe(OfferCreateFlags.tfHybrid)
  })

  it('sets DomainID without tfHybrid for a permissioned-only offer', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const domainID = 'B'.repeat(64)
    await client.iou.buyOffer({
      ticker: 'USD',
      amount: 1,
      orderType: 'limit',
      price: { currency: 'XRP', amount: 1 },
      domainID,
      hybrid: false,
    })
    const tx = txs[0] as OfferCreate
    expect(tx.DomainID).toBe(domainID)
    expect(tx.Flags).toBeUndefined()
  })

  it('combines tfHybrid with the order-type and sell flags', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    const domainID = 'C'.repeat(64)
    await client.iou.sellOffer({
      ticker: 'USD',
      amount: 1,
      orderType: 'market',
      price: { currency: 'XRP', amount: 1 },
      domainID,
    })
    const tx = txs[0] as OfferCreate
    expect(tx.DomainID).toBe(domainID)

    expect(tx.Flags).toBe(
      OfferCreateFlags.tfSell |
        OfferCreateFlags.tfImmediateOrCancel |
        OfferCreateFlags.tfHybrid,
    )
  })

  it('maps market/fok/passive order types to their flag combinations', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    await client.iou.buyOffer({
      ticker: 'USD',
      amount: 1,
      orderType: 'market',
      price: { currency: 'XRP', amount: 1 },
    })
    expect((txs[0] as OfferCreate).Flags).toBe(
      OfferCreateFlags.tfImmediateOrCancel,
    )

    await client.iou.buyOffer({
      ticker: 'USD',
      amount: 1,
      orderType: 'fok',
      price: { currency: 'XRP', amount: 1 },
    })
    expect((txs[1] as OfferCreate).Flags).toBe(OfferCreateFlags.tfFillOrKill)

    await client.iou.sellOffer({
      ticker: 'USD',
      amount: 1,
      orderType: 'passive',
      price: { currency: 'XRP', amount: 1 },
    })

    expect((txs[2] as OfferCreate).Flags).toBe(
      OfferCreateFlags.tfSell | OfferCreateFlags.tfPassive,
    )
  })

  it('rejects an MPT-denominated price', async () => {
    const { client } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })

    await expect(
      client.iou.sellOffer({
        ticker: 'USD',
        amount: 1,
        orderType: 'limit',
        price: { mptIssuanceId: 'ID', amount: 1 },
      }),
    ).rejects.toBeInstanceOf(IntentValidationError)
  })

  it('carries offerSequence through on both sell and buy', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    await client.iou.sellOffer({
      ticker: 'USD',
      amount: 1,
      orderType: 'limit',
      price: { currency: 'XRP', amount: 1 },
      offerSequence: 3,
    })
    expect((txs[0] as OfferCreate).OfferSequence).toBe(3)
  })

  it('builds an OfferCancel with the offer sequence', async () => {
    const { client, txs } = await issuedClient()
    await client.iou.issue({ ticker: 'USD' })
    txs.length = 0

    await client.iou.cancelOffer({ offerSequence: 7 })
    const tx = txs[0] as OfferCancel
    expect(tx.TransactionType).toBe('OfferCancel')
    expect(tx.OfferSequence).toBe(7)
  })
})
