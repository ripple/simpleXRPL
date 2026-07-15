import {
  MPTokenAuthorizeFlags,
  MPTokenIssuanceCreateFlags,
  MPTokenIssuanceSetFlags,
  OfferCreateFlags,
  Wallet,
  encodeMPTokenMetadata,
  type MPTokenAuthorize,
  type MPTokenIssuanceCreate,
  type MPTokenIssuanceDestroy,
  type MPTokenIssuanceSet,
  type OfferCancel,
  type OfferCreate,
  type Payment,
  type SubmitResponse,
  type Transaction,
  type TxResponse,
} from 'xrpl'

import {
  IntentValidationError,
  iou,
  LocalSigner,
  mpt,
  SimpleXRPL,
  SimpleXRPLError,
  validateTokenMetadata,
  XRP_ASSET,
} from '../../../src/index.js'
import type { LedgerPort, SimpleXRPLClient } from '../../../src/index.js'

/** A syntactically valid MPT issuance id (Hash192 = 48 hex chars). */
const MPT_ID = '00000001ABCDEF0123456789ABCDEF0123456789ABCDEF01'

interface TokenFixture {
  client: SimpleXRPLClient
  txs: Transaction[]
}

async function tokenClient(meta?: {
  readonly mpt_issuance_id?: string
}): Promise<TokenFixture> {
  const txs: Transaction[] = []
  const ledger: LedgerPort = {
    async autofill(tx: Transaction): Promise<Transaction> {
      txs.push(tx)
      return {
        ...tx,
        Sequence: 1,
        Fee: '12',
        LastLedgerSequence: 100,
      }
    },
    submit: async (): Promise<SubmitResponse> =>
      ({ result: {} }) as unknown as SubmitResponse,
    submitAndWait: async (): Promise<TxResponse> =>
      ({ result: { hash: 'HASH', meta } }) as unknown as TxResponse,
    request: async <T>(): Promise<T> => ({}) as T,
  }
  const client = await SimpleXRPL.init({
    rippledUrl: 'wss://x.invalid',
    signers: [LocalSigner.fromSeed(Wallet.generate().seed as string)],
    ledger,
  })
  return { client, txs }
}

describe('Token vertical', () => {
  describe('issue', () => {
    // Every default capability flag (requireAuth is off by default).
    const DEFAULT_FLAGS =
      MPTokenIssuanceCreateFlags.tfMPTCanLock |
      MPTokenIssuanceCreateFlags.tfMPTCanEscrow |
      MPTokenIssuanceCreateFlags.tfMPTCanTrade |
      MPTokenIssuanceCreateFlags.tfMPTCanTransfer |
      MPTokenIssuanceCreateFlags.tfMPTCanClawback

    // A minimal, XLS-89-compliant metadata object (required on every issue).
    const VALID_METADATA = {
      ticker: 'TBILL',
      name: 'T-Bill Token',
      icon: 'https://example.org/icon.png',
      asset_class: 'other',
      issuer_name: 'Example Co.',
    }

    it('applies SDK defaults (assetScale 2, full capabilities) and returns the id', async () => {
      const { client, txs } = await tokenClient({ mpt_issuance_id: 'MPT-1' })
      const result = await client.token.issue({
        maximumAmount: '1000000',
        transferFee: 0.5,
        metadata: VALID_METADATA,
      })

      expect(result.source).toBe('rippled')
      expect(result.intent).toStrictEqual({ mptIssuanceId: 'MPT-1' })

      const tx = txs[0] as MPTokenIssuanceCreate
      expect(tx.TransactionType).toBe('MPTokenIssuanceCreate')
      expect(tx.AssetScale).toBe(2)
      expect(tx.MaximumAmount).toBe('1000000')
      // 0.5% → 500 units (0.001% increments)
      expect(tx.TransferFee).toBe(500)
      expect(tx.MPTokenMetadata).toBe(encodeMPTokenMetadata(VALID_METADATA))
      expect(tx.Flags).toBe(DEFAULT_FLAGS)
    })

    it('honors explicit assetScale and flag overrides', async () => {
      const { client, txs } = await tokenClient()
      await client.token.issue({
        assetScale: 0,
        metadata: VALID_METADATA,
        flags: { canClawback: false, canTransfer: false },
      })
      const tx = txs[0] as MPTokenIssuanceCreate
      expect(tx.AssetScale).toBe(0)
      // Defaults minus the two disabled capabilities.
      expect(tx.Flags).toBe(
        MPTokenIssuanceCreateFlags.tfMPTCanLock |
          MPTokenIssuanceCreateFlags.tfMPTCanEscrow |
          MPTokenIssuanceCreateFlags.tfMPTCanTrade,
      )
    })

    it('omits Flags when every capability is disabled', async () => {
      const { client, txs } = await tokenClient()
      await client.token.issue({
        metadata: VALID_METADATA,
        flags: {
          canLock: false,
          canEscrow: false,
          canTrade: false,
          canTransfer: false,
          canClawback: false,
        },
      })
      expect((txs[0] as MPTokenIssuanceCreate).Flags).toBeUndefined()
    })

    it('encodes structured metadata via the XLS-89 standard', async () => {
      const { client, txs } = await tokenClient()
      // An RWA asset requires asset_subclass to satisfy the standard.
      const metadata = {
        ticker: 'TBILL',
        name: 'T-Bill Token',
        icon: 'https://example.org/icon.png',
        asset_class: 'rwa',
        asset_subclass: 'treasury',
        issuer_name: 'Example Co.',
      }
      await client.token.issue({ metadata })
      expect((txs[0] as MPTokenIssuanceCreate).MPTokenMetadata).toBe(
        encodeMPTokenMetadata(metadata),
      )
    })

    it('rejects a raw string that is not XLS-89-compliant JSON', async () => {
      const { client } = await tokenClient()
      await expect(
        client.token.issue({ metadata: 'not-standard-metadata' }),
      ).rejects.toBeInstanceOf(IntentValidationError)
    })

    it('reports which metadata field is wrong in the error message', async () => {
      const { client } = await tokenClient()
      // A lowercase ticker violates the XLS-89 ticker rule.
      const promise = client.token.issue({
        metadata: { ...VALID_METADATA, ticker: 'lowercase' },
      })
      await expect(promise).rejects.toBeInstanceOf(IntentValidationError)
      // The message names the standard, the offending field, and the fix.
      await expect(promise).rejects.toThrow(/XLS-89/u)
      await expect(promise).rejects.toThrow(/ticker/u)
      await expect(promise).rejects.toThrow(/required fields/u)
    })

    it('rejects invalid MaximumAmount and out-of-range TransferFee', async () => {
      const bad = await tokenClient()
      await expect(
        bad.client.token.issue({
          maximumAmount: 'abc',
          metadata: VALID_METADATA,
        }),
      ).rejects.toBeInstanceOf(IntentValidationError)

      // Percentage above the 50% MPT maximum is rejected before submission.
      const fee = await tokenClient()
      await expect(
        fee.client.token.issue({ transferFee: 60, metadata: VALID_METADATA }),
      ).rejects.toBeInstanceOf(SimpleXRPLError)
    })
  })

  describe('authorize', () => {
    it('builds MPTokenAuthorize with holder and unauthorize flag', async () => {
      const { client, txs } = await tokenClient()
      const holder = Wallet.generate().classicAddress
      await client.token.authorize({
        mptIssuanceId: MPT_ID,
        holder,
        unauthorize: true,
      })
      const tx = txs[0] as MPTokenAuthorize
      expect(tx.TransactionType).toBe('MPTokenAuthorize')
      expect(tx.MPTokenIssuanceID).toBe(MPT_ID)
      expect(tx.Holder).toBe(holder)
      expect(tx.Flags).toBe(MPTokenAuthorizeFlags.tfMPTUnauthorize)
    })
  })

  describe('set', () => {
    it('maps lock true/false to the lock/unlock flags', async () => {
      const locked = await tokenClient()
      await locked.client.token.set({ mptIssuanceId: MPT_ID, lock: true })
      expect((locked.txs[0] as MPTokenIssuanceSet).Flags).toBe(
        MPTokenIssuanceSetFlags.tfMPTLock,
      )

      const unlocked = await tokenClient()
      await unlocked.client.token.set({ mptIssuanceId: MPT_ID, lock: false })
      expect((unlocked.txs[0] as MPTokenIssuanceSet).Flags).toBe(
        MPTokenIssuanceSetFlags.tfMPTUnlock,
      )
    })
  })

  describe('destroy', () => {
    it('builds MPTokenIssuanceDestroy', async () => {
      const { client, txs } = await tokenClient()
      await client.token.destroy({ mptIssuanceId: MPT_ID })
      const tx = txs[0] as MPTokenIssuanceDestroy
      expect(tx.TransactionType).toBe('MPTokenIssuanceDestroy')
      expect(tx.MPTokenIssuanceID).toBe(MPT_ID)
    })
  })

  describe('transfer', () => {
    it('builds a Payment with a scaled MPT amount', async () => {
      const { client, txs } = await tokenClient()
      const to = Wallet.generate().classicAddress
      const result = await client.token.transfer({
        to,
        amount: { asset: mpt(MPT_ID, 2), value: '10.5' },
      })
      expect(result.intent).toStrictEqual({ to, amount: '10.5' })
      const tx = txs[0] as Payment
      expect(tx.TransactionType).toBe('Payment')
      expect(tx.Destination).toBe(to)
      expect(tx.Amount).toStrictEqual({
        mpt_issuance_id: MPT_ID,
        value: '1050',
      })
    })

    it('rejects a non-MPT amount', async () => {
      const { client } = await tokenClient()
      await expect(
        client.token.transfer({
          to: 'rDest',
          amount: { asset: XRP_ASSET, value: '10' },
        }),
      ).rejects.toBeInstanceOf(IntentValidationError)
    })
  })

  describe('createOffer / cancelOffer', () => {
    it('builds OfferCreate with XRP/IOU amounts and flags', async () => {
      const { client, txs } = await tokenClient()
      const issuer = Wallet.generate().classicAddress
      await client.token.createOffer({
        takerGets: { asset: XRP_ASSET, value: '1' },
        takerPays: { asset: iou('USD', issuer), value: '10' },
        flags: { immediateOrCancel: true },
      })
      const tx = txs[0] as OfferCreate
      expect(tx.TransactionType).toBe('OfferCreate')
      expect(tx.TakerGets).toBe('1000000')
      expect(tx.TakerPays).toStrictEqual({
        currency: 'USD',
        issuer,
        value: '10',
      })
      expect(tx.Flags).toBe(OfferCreateFlags.tfImmediateOrCancel)
    })

    it('rejects an MPT amount in an offer', async () => {
      const { client } = await tokenClient()
      await expect(
        client.token.createOffer({
          takerGets: { asset: mpt('MPT-1', 0), value: '1' },
          takerPays: { asset: XRP_ASSET, value: '1' },
        }),
      ).rejects.toBeInstanceOf(IntentValidationError)
    })

    it('builds OfferCancel with the offer sequence', async () => {
      const { client, txs } = await tokenClient()
      await client.token.cancelOffer({ offerSequence: 42 })
      const tx = txs[0] as OfferCancel
      expect(tx.TransactionType).toBe('OfferCancel')
      expect(tx.OfferSequence).toBe(42)
    })
  })
})

describe('validateTokenMetadata', () => {
  it('returns an empty array for XLS-89-compliant metadata', () => {
    expect(
      validateTokenMetadata({
        ticker: 'TBILL',
        name: 'T-Bill Token',
        icon: 'https://example.org/icon.png',
        asset_class: 'other',
        issuer_name: 'Example Co.',
      }),
    ).toStrictEqual([])
  })

  it('returns the specific problems without throwing', () => {
    const problems = validateTokenMetadata({
      ...{
        ticker: 'lowercase',
        name: 'T-Bill Token',
        icon: 'https://example.org/icon.png',
        asset_class: 'other',
        issuer_name: 'Example Co.',
      },
    })
    expect(problems.length).toBeGreaterThan(0)
    expect(problems.some((message) => message.includes('ticker'))).toBe(true)
  })

  it('reports an un-encodable raw string as a problem', () => {
    expect(validateTokenMetadata('not-json').length).toBeGreaterThan(0)
  })
})
