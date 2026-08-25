import { OfferCreateFlags, Wallet } from 'xrpl'
import type {
  OfferCancel,
  OfferCreate,
  SubmitResponse,
  Transaction,
  TxResponse,
} from 'xrpl'

import {
  IntentValidationError,
  LocalSigner,
  SimpleXRPL,
} from '../../../src/index.js'
import type { SimpleXRPLClient } from '../../../src/index.js'

interface XrpFixture {
  client: SimpleXRPLClient
  txs: Transaction[]
  address: string
}

/**
 * Build a client whose primary signer is a fresh wallet, over a ledger that
 * captures every built transaction (via `autofill`). XRP operations default
 * their acting account to this signer.
 *
 * @returns The client, captured txs, and the signer's address.
 */
async function xrpClient(): Promise<XrpFixture> {
  const wallet = Wallet.generate()
  const txs: Transaction[] = []
  const ledger = {
    async autofill(tx: Transaction): Promise<Transaction> {
      txs.push(tx)
      return { ...tx, Sequence: 1, Fee: '12', LastLedgerSequence: 100 }
    },
    submit: async (): Promise<SubmitResponse> =>
      ({ result: {} }) as unknown as SubmitResponse,
    submitAndWait: async (): Promise<TxResponse> =>
      ({ result: { hash: 'HASH' } }) as unknown as TxResponse,
    request: async <T>(): Promise<T> => ({}) as T,
  }
  const client = await SimpleXRPL.init({
    xrpldUrl: 'wss://x.invalid',
    signers: [LocalSigner.fromSeed(wallet.seed as string)],
    ledger,
  })
  return { client, txs, address: wallet.classicAddress }
}

describe('XRP.buyOffer / XRP.sellOffer / XRP.cancelOffer', () => {
  it('sells XRP for an IOU: TakerGets is XRP drops and tfSell is set', async () => {
    const { client, txs, address } = await xrpClient()

    const priceIssuer = Wallet.generate().classicAddress
    await client.xrp.sellOffer({
      amount: '50',
      orderType: 'limit',
      price: { ticker: 'USD', issuer: priceIssuer, amount: '100' },
    })
    const tx = txs[0] as OfferCreate
    expect(tx.TransactionType).toBe('OfferCreate')
    expect(tx.Account).toBe(address)
    expect(tx.TakerGets).toBe('50000000')
    expect(tx.TakerPays).toEqual({
      currency: 'USD',
      issuer: priceIssuer,
      value: '100',
    })
    expect(tx.Flags).toBe(OfferCreateFlags.tfSell)
  })

  it('buys XRP with an IOU: TakerPays is XRP drops and flags are omitted', async () => {
    const { client, txs, address } = await xrpClient()

    const priceIssuer = Wallet.generate().classicAddress
    await client.xrp.buyOffer({
      amount: '50',
      orderType: 'limit',
      price: { ticker: 'USD', issuer: priceIssuer, amount: '90' },
    })
    const tx = txs[0] as OfferCreate
    expect(tx.Account).toBe(address)
    expect(tx.TakerGets).toEqual({
      currency: 'USD',
      issuer: priceIssuer,
      value: '90',
    })
    expect(tx.TakerPays).toBe('50000000')
    expect(tx.Flags).toBeUndefined()
  })

  it('scopes an offer to a permissioned domain and defaults to hybrid', async () => {
    const { client, txs } = await xrpClient()

    const domainID = 'A'.repeat(64)
    await client.xrp.buyOffer({
      amount: '1',
      orderType: 'limit',
      price: {
        ticker: 'USD',
        issuer: Wallet.generate().classicAddress,
        amount: '1',
      },
      domainID,
    })
    const tx = txs[0] as OfferCreate
    expect(tx.DomainID).toBe(domainID)
    expect(tx.Flags).toBe(OfferCreateFlags.tfHybrid)
  })

  it('sets DomainID without tfHybrid for a permissioned-only offer', async () => {
    const { client, txs } = await xrpClient()

    const domainID = 'B'.repeat(64)
    await client.xrp.buyOffer({
      amount: '1',
      orderType: 'limit',
      price: {
        ticker: 'USD',
        issuer: Wallet.generate().classicAddress,
        amount: '1',
      },
      domainID,
      hybrid: false,
    })
    const tx = txs[0] as OfferCreate
    expect(tx.DomainID).toBe(domainID)
    expect(tx.Flags).toBeUndefined()
  })

  it('maps market/fok/passive order types to their flag combinations', async () => {
    const { client, txs } = await xrpClient()
    const price = {
      ticker: 'USD',
      issuer: Wallet.generate().classicAddress,
      amount: '1',
    }

    await client.xrp.buyOffer({ amount: '1', orderType: 'market', price })
    expect((txs[0] as OfferCreate).Flags).toBe(
      OfferCreateFlags.tfImmediateOrCancel,
    )

    await client.xrp.buyOffer({ amount: '1', orderType: 'fok', price })
    expect((txs[1] as OfferCreate).Flags).toBe(OfferCreateFlags.tfFillOrKill)

    await client.xrp.sellOffer({ amount: '1', orderType: 'passive', price })
    expect((txs[2] as OfferCreate).Flags).toBe(
      OfferCreateFlags.tfSell | OfferCreateFlags.tfPassive,
    )
  })

  it('rejects an MPT-denominated price', async () => {
    const { client } = await xrpClient()

    await expect(
      client.xrp.sellOffer({
        amount: '1',
        orderType: 'limit',
        price: { mptIssuanceId: 'ID', amount: '1' },
      }),
    ).rejects.toBeInstanceOf(IntentValidationError)
  })

  it('rejects an XRP amount with sub-drop precision', async () => {
    const { client } = await xrpClient()

    await expect(
      client.xrp.sellOffer({
        amount: '0.0000001',
        orderType: 'limit',
        price: {
          ticker: 'USD',
          issuer: Wallet.generate().classicAddress,
          amount: '1',
        },
      }),
    ).rejects.toThrow(/6 decimal places/u)
  })

  it('carries offerSequence through', async () => {
    const { client, txs } = await xrpClient()

    await client.xrp.sellOffer({
      amount: '1',
      orderType: 'limit',
      price: {
        ticker: 'USD',
        issuer: Wallet.generate().classicAddress,
        amount: '1',
      },
      offerSequence: 3,
    })
    expect((txs[0] as OfferCreate).OfferSequence).toBe(3)
  })

  it('builds an OfferCancel with the offer sequence', async () => {
    const { client, txs, address } = await xrpClient()

    const result = await client.xrp.cancelOffer({ offerSequence: 7 })
    const tx = txs[0] as OfferCancel
    expect(tx.TransactionType).toBe('OfferCancel')
    expect(tx.Account).toBe(address)
    expect(tx.OfferSequence).toBe(7)
    expect(result.intent).toEqual({ offerSequence: 7 })
  })
})
