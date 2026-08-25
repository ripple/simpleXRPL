import {
  MPTokenAuthorizeFlags,
  MPTokenIssuanceCreateFlags,
  MPTokenIssuanceSetFlags,
  Wallet,
  encodeMPTokenMetadata,
  type Clawback,
  type MPTokenAuthorize,
  type MPTokenIssuanceCreate,
  type MPTokenIssuanceDestroy,
  type MPTokenIssuanceSet,
  type MPTokenMetadata,
  type Payment,
  type SubmitResponse,
  type Transaction,
  type TxResponse,
} from 'xrpl'

import {
  IntentValidationError,
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
    xrpldUrl: 'wss://x.invalid',
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

      expect(result.source).toBe('xrpld')
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

  describe('authorize / unauthorize', () => {
    it('authorize builds a self MPTokenAuthorize (no holder, no flag)', async () => {
      const { client, txs } = await tokenClient()
      await client.token.authorize({ mptIssuanceId: MPT_ID })
      const tx = txs[0] as MPTokenAuthorize
      expect(tx.TransactionType).toBe('MPTokenAuthorize')
      expect(tx.MPTokenIssuanceID).toBe(MPT_ID)
      expect(tx.Holder).toBeUndefined()
      expect(tx.Flags).toBeUndefined()
    })

    it('unauthorize sets the unauthorize flag (no holder)', async () => {
      const { client, txs } = await tokenClient()
      await client.token.unauthorize({ mptIssuanceId: MPT_ID })
      const tx = txs[0] as MPTokenAuthorize
      expect(tx.Holder).toBeUndefined()
      expect(tx.Flags).toBe(MPTokenAuthorizeFlags.tfMPTUnauthorize)
    })
  })

  describe('grantHolder / revokeHolder', () => {
    it('grantHolder authorizes a specific holder (no flag)', async () => {
      const { client, txs } = await tokenClient()
      const holder = Wallet.generate().classicAddress
      await client.token.grantHolder({ mptIssuanceId: MPT_ID, holder })
      const tx = txs[0] as MPTokenAuthorize
      expect(tx.MPTokenIssuanceID).toBe(MPT_ID)
      expect(tx.Holder).toBe(holder)
      expect(tx.Flags).toBeUndefined()
    })

    it('revokeHolder sets the unauthorize flag for a holder', async () => {
      const { client, txs } = await tokenClient()
      const holder = Wallet.generate().classicAddress
      await client.token.revokeHolder({ mptIssuanceId: MPT_ID, holder })
      const tx = txs[0] as MPTokenAuthorize
      expect(tx.Holder).toBe(holder)
      expect(tx.Flags).toBe(MPTokenAuthorizeFlags.tfMPTUnauthorize)
    })
  })

  describe('lock / unlock', () => {
    it('lock sets the lock flag (whole issuance)', async () => {
      const { client, txs } = await tokenClient()
      await client.token.lock({ mptIssuanceId: MPT_ID })
      const tx = txs[0] as MPTokenIssuanceSet
      expect(tx.Flags).toBe(MPTokenIssuanceSetFlags.tfMPTLock)
      expect(tx.Holder).toBeUndefined()
    })

    it('unlock sets the unlock flag for a specific holder', async () => {
      const { client, txs } = await tokenClient()
      const holder = Wallet.generate().classicAddress
      await client.token.unlock({ mptIssuanceId: MPT_ID, holder })
      const tx = txs[0] as MPTokenIssuanceSet
      expect(tx.Flags).toBe(MPTokenIssuanceSetFlags.tfMPTUnlock)
      expect(tx.Holder).toBe(holder)
    })
  })

  describe('destroy', () => {
    /**
     * A client whose `ledger_entry` read reports a given outstanding amount.
     *
     * @param outstandingAmount - Base-unit amount still in circulation.
     * @returns The client and the transactions it builds.
     */
    async function clientWithOutstanding(
      outstandingAmount: string,
    ): Promise<TokenFixture> {
      const txs: Transaction[] = []
      const ledger: LedgerPort = {
        async autofill(tx: Transaction): Promise<Transaction> {
          txs.push(tx)
          return { ...tx, Sequence: 1, Fee: '12', LastLedgerSequence: 100 }
        },
        submit: async (): Promise<SubmitResponse> =>
          ({ result: {} }) as unknown as SubmitResponse,
        submitAndWait: async (): Promise<TxResponse> =>
          ({ result: { hash: 'HASH' } }) as unknown as TxResponse,
        request: async <T>(): Promise<T> =>
          ({
            result: {
              node: {
                Issuer: 'rIssuer',
                AssetScale: 2,
                OutstandingAmount: outstandingAmount,
                Flags: 0,
              },
            },
          }) as T,
      }
      const client = await SimpleXRPL.init({
        xrpldUrl: 'wss://x.invalid',
        signers: [LocalSigner.fromSeed(Wallet.generate().seed as string)],
        ledger,
      })
      return { client, txs }
    }

    it('builds MPTokenIssuanceDestroy', async () => {
      const { client, txs } = await tokenClient()
      await client.token.destroy({ mptIssuanceId: MPT_ID })
      const tx = txs[0] as MPTokenIssuanceDestroy
      expect(tx.TransactionType).toBe('MPTokenIssuanceDestroy')
      expect(tx.MPTokenIssuanceID).toBe(MPT_ID)
    })

    it('refuses to destroy an issuance with tokens still in circulation', async () => {
      // The ledger would reject this as tecHAS_OBLIGATIONS, which names neither
      // the issuance nor the amount outstanding.
      const { client, txs } = await clientWithOutstanding('10000')
      await expect(
        client.token.destroy({ mptIssuanceId: MPT_ID }),
      ).rejects.toThrow(/still has 10000 in circulation/u)
      expect(txs).toHaveLength(0)
    })

    it('destroys when nothing is outstanding', async () => {
      const { client, txs } = await clientWithOutstanding('0')
      await client.token.destroy({ mptIssuanceId: MPT_ID })
      expect(txs).toHaveLength(1)
      expect((txs[0] as MPTokenIssuanceDestroy).TransactionType).toBe(
        'MPTokenIssuanceDestroy',
      )
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

  describe('clawback', () => {
    it('builds a Clawback with the holder and a scaled MPT amount', async () => {
      const { client, txs } = await tokenClient()
      const holder = Wallet.generate().classicAddress
      const result = await client.token.clawback({
        holder,
        amount: { asset: mpt(MPT_ID, 2), value: '10.5' },
      })
      expect(result.intent).toStrictEqual({ holder, amount: '10.5' })
      const tx = txs[0] as Clawback
      expect(tx.TransactionType).toBe('Clawback')
      expect(tx.Holder).toBe(holder)
      expect(tx.Amount).toStrictEqual({
        mpt_issuance_id: MPT_ID,
        value: '1050',
      })
    })

    it('rejects a non-MPT amount', async () => {
      const { client } = await tokenClient()
      await expect(
        client.token.clawback({
          holder: 'rHolder',
          amount: { asset: XRP_ASSET, value: '10' },
        }),
      ).rejects.toBeInstanceOf(IntentValidationError)
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

  it('reports an object the encoder cannot serialize as a problem, not a crash', () => {
    // A circular object makes the xrpl encoder throw a bare TypeError. The
    // pre-flight check must degrade to a problem list, never propagate.
    const circular: Record<string, unknown> = { ticker: 'TBILL' }
    circular.self = circular
    const problems = validateTokenMetadata(
      circular as unknown as MPTokenMetadata,
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/could not be encoded/u)
  })
})

describe('Token.issue metadata that cannot be encoded', () => {
  it('wraps the encoder failure in an IntentValidationError with its cause', async () => {
    const { client } = await tokenClient()
    const circular: Record<string, unknown> = { ticker: 'TBILL' }
    circular.self = circular
    const promise = client.token.issue({
      metadata: circular as unknown as MPTokenMetadata,
    })
    await expect(promise).rejects.toBeInstanceOf(IntentValidationError)
    await expect(promise).rejects.toThrow(/could not be encoded/u)
    // The underlying encoder error is preserved for debugging.
    await expect(promise).rejects.toHaveProperty('cause')
  })
})
