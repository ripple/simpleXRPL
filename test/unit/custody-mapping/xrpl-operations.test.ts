import type {
  AccountSet,
  Clawback,
  DepositPreauth,
  EscrowFinish,
  MPTokenAuthorize,
  MPTokenIssuanceCreate,
  MPTokenIssuanceDestroy,
  MPTokenIssuanceSet,
  OfferCancel,
  OfferCreate,
  Payment,
  TrustSet,
} from 'xrpl'

import { toCustodyIouAmount } from '../../../src/custodians/ripple/mapping/iou-amount.js'
import {
  NATIVE_XRPL_TRANSACTORS,
  txToOperation,
} from '../../../src/custodians/ripple/mapping/xrpl-operations.js'
import { SignerCapabilityError } from '../../../src/errors.js'

const MPT_ID = '00000001ABCDEF0123456789ABCDEF0123456789ABCDEF01'

describe('NATIVE_XRPL_TRANSACTORS', () => {
  it('lists exactly the 11 transactors Custody models natively', () => {
    const sortAlpha = (values: readonly string[]): string[] =>
      Array.from(values).sort((first, second) => first.localeCompare(second))
    expect(sortAlpha(Array.from(NATIVE_XRPL_TRANSACTORS))).toEqual(
      sortAlpha([
        'AccountSet',
        'Clawback',
        'DepositPreauth',
        'EscrowFinish',
        'MPTokenAuthorize',
        'MPTokenIssuanceCreate',
        'MPTokenIssuanceDestroy',
        'MPTokenIssuanceSet',
        'OfferCreate',
        'Payment',
        'TrustSet',
      ]),
    )
  })
})

describe('txToOperation', () => {
  it('throws SignerCapabilityError for a transactor with no native mapping', () => {
    const tx: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: 'rFrom',
      OfferSequence: 1,
    }
    expect(() => txToOperation(tx)).toThrow(SignerCapabilityError)
    expect(() => txToOperation(tx)).toThrow(/OfferCancel/u)
  })

  describe('AccountSet', () => {
    it('maps SetFlag and ClearFlag to Custody flag names', () => {
      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: 'rFrom',
        SetFlag: 8,
        ClearFlag: 2,
        TransferRate: 1000000000,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'AccountSet',
        setFlag: 'asfDefaultRipple',
        clearFlag: 'asfRequireAuth',
        transferRate: 1000000000,
      })
    })

    it('leaves setFlag/clearFlag undefined when absent', () => {
      const tx: AccountSet = { TransactionType: 'AccountSet', Account: 'rFrom' }
      expect(txToOperation(tx)).toEqual({
        type: 'AccountSet',
        setFlag: undefined,
        clearFlag: undefined,
        transferRate: undefined,
      })
    })

    it('throws for an ASF flag Custody does not model', () => {
      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: 'rFrom',
        SetFlag: 3,
      }
      expect(() => txToOperation(tx)).toThrow(SignerCapabilityError)
    })

    it('throws for an unsupported field (e.g. Domain)', () => {
      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: 'rFrom',
        Domain: '6578616D706C652E636F6D',
      }
      expect(() => txToOperation(tx)).toThrow(/AccountSet\.Domain/u)
    })

    it('throws for a nonzero numeric Flags field', () => {
      const tx: AccountSet = {
        TransactionType: 'AccountSet',
        Account: 'rFrom',
        Flags: 65536,
      }
      expect(() => txToOperation(tx)).toThrow(/AccountSet\.Flags/u)
    })
  })

  describe('Clawback', () => {
    it('maps an IOU clawback, deriving the holder from Amount.issuer', () => {
      // A native XRPL issued-currency Clawback carries the holder in
      // Amount.issuer and sets no top-level Holder; the token issuer is Account.
      const tx: Clawback = {
        TransactionType: 'Clawback',
        Account: 'rIssuer',
        Amount: { currency: 'USD', issuer: 'rHolder', value: '10' },
      }
      expect(txToOperation(tx)).toEqual({
        type: 'Clawback',
        currency: { code: 'USD', issuer: 'rIssuer', type: 'Currency' },
        holder: { address: 'rHolder', type: 'Address' },
        value: toCustodyIouAmount('10'),
      })
    })

    it('maps an MPT clawback', () => {
      const tx: Clawback = {
        TransactionType: 'Clawback',
        Account: 'rIssuer',
        Holder: 'rHolder',
        Amount: { mpt_issuance_id: MPT_ID, value: '10' },
      }
      expect(txToOperation(tx)).toEqual({
        type: 'Clawback',
        currency: { issuanceId: MPT_ID, type: 'MultiPurposeToken' },
        holder: { address: 'rHolder', type: 'Address' },
        value: '10',
      })
    })

    it('throws when an MPT clawback omits Holder', () => {
      const tx: Clawback = {
        TransactionType: 'Clawback',
        Account: 'rIssuer',
        Amount: { mpt_issuance_id: MPT_ID, value: '10' },
      }
      expect(() => txToOperation(tx)).toThrow(SignerCapabilityError)
      expect(() => txToOperation(tx)).toThrow(/Holder/u)
    })
  })

  describe('DepositPreauth', () => {
    it('maps Authorize', () => {
      const tx: DepositPreauth = {
        TransactionType: 'DepositPreauth',
        Account: 'rFrom',
        Authorize: 'rAuthorized',
      }
      expect(txToOperation(tx)).toEqual({
        type: 'DepositPreauth',
        authorize: { address: 'rAuthorized', type: 'Address' },
        unauthorize: undefined,
      })
    })

    it('maps Unauthorize', () => {
      const tx: DepositPreauth = {
        TransactionType: 'DepositPreauth',
        Account: 'rFrom',
        Unauthorize: 'rRevoked',
      }
      expect(txToOperation(tx)).toEqual({
        type: 'DepositPreauth',
        authorize: undefined,
        unauthorize: { address: 'rRevoked', type: 'Address' },
      })
    })

    it('throws for the credential-based variants', () => {
      const authTx: DepositPreauth = {
        TransactionType: 'DepositPreauth',
        Account: 'rFrom',
        AuthorizeCredentials: [
          { Credential: { Issuer: 'rIssuer', CredentialType: 'ABCD' } },
        ],
      }
      expect(() => txToOperation(authTx)).toThrow(/AuthorizeCredentials/u)

      const unauthTx: DepositPreauth = {
        TransactionType: 'DepositPreauth',
        Account: 'rFrom',
        UnauthorizeCredentials: [
          { Credential: { Issuer: 'rIssuer', CredentialType: 'ABCD' } },
        ],
      }
      expect(() => txToOperation(unauthTx)).toThrow(/UnauthorizeCredentials/u)
    })
  })

  describe('EscrowFinish', () => {
    it('maps owner, sequence, condition, and fulfillment', () => {
      const tx: EscrowFinish = {
        TransactionType: 'EscrowFinish',
        Account: 'rFrom',
        Owner: 'rOwner',
        OfferSequence: 5,
        Condition: 'A0028000',
        Fulfillment: 'A0028000',
      }
      expect(txToOperation(tx)).toEqual({
        type: 'EscrowFinish',
        owner: { address: 'rOwner', type: 'Address' },
        offerSequence: 5,
        condition: 'A0028000',
        fulfillment: 'A0028000',
        credentialIds: undefined,
      })
    })
  })

  describe('MPTokenAuthorize', () => {
    it('maps a plain authorize (no flags, no holder)', () => {
      const tx: MPTokenAuthorize = {
        TransactionType: 'MPTokenAuthorize',
        Account: 'rFrom',
        MPTokenIssuanceID: MPT_ID,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'MPTokenAuthorize',
        tokenIdentifier: { issuanceId: MPT_ID, type: 'MPTokenIssuanceId' },
        flags: [],
        holder: undefined,
      })
    })

    it('maps tfMPTUnauthorize and a holder', () => {
      const tx: MPTokenAuthorize = {
        TransactionType: 'MPTokenAuthorize',
        Account: 'rFrom',
        MPTokenIssuanceID: MPT_ID,
        Holder: 'rHolder',
        Flags: 1,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'MPTokenAuthorize',
        tokenIdentifier: { issuanceId: MPT_ID, type: 'MPTokenIssuanceId' },
        flags: ['tfMPTUnauthorize'],
        holder: { address: 'rHolder', type: 'Address' },
      })
    })
  })

  describe('MPTokenIssuanceCreate', () => {
    it('maps every field and all 6 flags in the gateway canonical order', () => {
      const tx: MPTokenIssuanceCreate = {
        TransactionType: 'MPTokenIssuanceCreate',
        Account: 'rFrom',
        AssetScale: 2,
        TransferFee: 100,
        MaximumAmount: '1000000',
        MPTokenMetadata: '48656C6C6F',
        // All 6 flags combined: 4 | 64 | 32 | 8 | 2 | 16 = 126
        Flags: 126,
      }
      // The flag order is load-bearing: the gateway re-encodes the bitmask to
      // this exact sequence before it verifies the intent signature over the
      // JCS-canonicalized request (which preserves array order). Any other
      // order canonicalizes differently and is rejected as InvalidSignature.
      expect(txToOperation(tx)).toEqual({
        type: 'MPTokenIssuanceCreate',
        flags: [
          'tfMPTCanTransfer',
          'tfMPTCanLock',
          'tfMPTRequireAuth',
          'tfMPTCanTrade',
          'tfMPTCanClawback',
          'tfMPTCanEscrow',
        ],
        assetScale: 2,
        transferFee: 100,
        maximumAmount: '1000000',
        metadata: { value: '48656C6C6F', type: 'HexEncodedMetadata' },
      })
    })

    it('omits metadata and reports no flags when none are set', () => {
      const tx: MPTokenIssuanceCreate = {
        TransactionType: 'MPTokenIssuanceCreate',
        Account: 'rFrom',
      }
      expect(txToOperation(tx)).toEqual({
        type: 'MPTokenIssuanceCreate',
        flags: [],
        assetScale: undefined,
        transferFee: undefined,
        maximumAmount: undefined,
        metadata: undefined,
      })
    })
  })

  describe('MPTokenIssuanceDestroy', () => {
    it('maps the token identifier', () => {
      const tx: MPTokenIssuanceDestroy = {
        TransactionType: 'MPTokenIssuanceDestroy',
        Account: 'rFrom',
        MPTokenIssuanceID: MPT_ID,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'MPTokenIssuanceDestroy',
        tokenIdentifier: { issuanceId: MPT_ID, type: 'MPTokenIssuanceId' },
      })
    })
  })

  describe('MPTokenIssuanceSet', () => {
    it('maps tfMPTLock', () => {
      const tx: MPTokenIssuanceSet = {
        TransactionType: 'MPTokenIssuanceSet',
        Account: 'rFrom',
        MPTokenIssuanceID: MPT_ID,
        Holder: 'rHolder',
        Flags: 1,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'MPTokenIssuanceSet',
        tokenIdentifier: { issuanceId: MPT_ID, type: 'MPTokenIssuanceId' },
        holder: { address: 'rHolder', type: 'Address' },
        flags: ['tfMPTLock'],
      })
    })

    it('maps tfMPTUnlock with no holder', () => {
      const tx: MPTokenIssuanceSet = {
        TransactionType: 'MPTokenIssuanceSet',
        Account: 'rFrom',
        MPTokenIssuanceID: MPT_ID,
        Flags: 2,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'MPTokenIssuanceSet',
        tokenIdentifier: { issuanceId: MPT_ID, type: 'MPTokenIssuanceId' },
        holder: undefined,
        flags: ['tfMPTUnlock'],
      })
    })
  })

  describe('OfferCreate', () => {
    it('maps native XRP legs with no flags', () => {
      const tx: OfferCreate = {
        TransactionType: 'OfferCreate',
        Account: 'rFrom',
        TakerGets: '1000000',
        TakerPays: { currency: 'USD', issuer: 'rIssuer', value: '10' },
      }
      expect(txToOperation(tx)).toEqual({
        type: 'OfferCreate',
        flags: [],
        takerGets: { amount: '1000000' },
        takerPays: {
          amount: toCustodyIouAmount('10'),
          currency: { code: 'USD', issuer: 'rIssuer', type: 'Currency' },
        },
      })
    })

    it('maps tfImmediateOrCancel, tfFillOrKill, and tfSell', () => {
      const tx: OfferCreate = {
        TransactionType: 'OfferCreate',
        Account: 'rFrom',
        TakerGets: '1000000',
        TakerPays: '2000000',
        Flags: 131072 | 262144 | 524288,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'OfferCreate',
        flags: ['tfImmediateOrCancel', 'tfFillOrKill', 'tfSell'],
        takerGets: { amount: '1000000' },
        takerPays: { amount: '2000000' },
      })
    })

    it('throws for Expiration, OfferSequence, and DomainID', () => {
      const base: OfferCreate = {
        TransactionType: 'OfferCreate',
        Account: 'rFrom',
        TakerGets: '1000000',
        TakerPays: '2000000',
      }
      expect(() => txToOperation({ ...base, Expiration: 1 })).toThrow(
        /Expiration/u,
      )
      expect(() => txToOperation({ ...base, OfferSequence: 1 })).toThrow(
        /OfferSequence/u,
      )
      expect(() =>
        txToOperation({ ...base, DomainID: 'A'.repeat(64) }),
      ).toThrow(/DomainID/u)
    })

    it('throws for tfPassive and tfHybrid', () => {
      const base: OfferCreate = {
        TransactionType: 'OfferCreate',
        Account: 'rFrom',
        TakerGets: '1000000',
        TakerPays: '2000000',
      }
      expect(() => txToOperation({ ...base, Flags: 65536 })).toThrow(
        /tfPassive/u,
      )
      expect(() => txToOperation({ ...base, Flags: 1048576 })).toThrow(
        /tfHybrid/u,
      )
    })

    it('throws SignerCapabilityError for MPT-denominated legs', () => {
      // xrpl's own `OfferCreate.TakerGets` type has no MPT variant, but
      // nothing stops untyped/dynamic input from carrying one at runtime.
      const tx = {
        TransactionType: 'OfferCreate',
        Account: 'rFrom',
        TakerGets: { mpt_issuance_id: MPT_ID, value: '1' },
        TakerPays: '1000000',
      } as unknown as OfferCreate
      expect(() => txToOperation(tx)).toThrow(SignerCapabilityError)
      expect(() => txToOperation(tx)).toThrow(/TakerGets/u)
    })
  })

  describe('Payment', () => {
    it('maps a native XRP payment', () => {
      const tx: Payment = {
        TransactionType: 'Payment',
        Account: 'rFrom',
        Destination: 'rTo',
        Amount: '1000000',
        DestinationTag: 42,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'Payment',
        destination: { address: 'rTo', type: 'Address' },
        amount: '1000000',
        destinationTag: 42,
      })
    })

    it('maps an IOU payment', () => {
      const tx: Payment = {
        TransactionType: 'Payment',
        Account: 'rFrom',
        Destination: 'rTo',
        Amount: { currency: 'USD', issuer: 'rIssuer', value: '10' },
      }
      expect(txToOperation(tx)).toEqual({
        type: 'Payment',
        destination: { address: 'rTo', type: 'Address' },
        amount: toCustodyIouAmount('10'),
        currency: { code: 'USD', issuer: 'rIssuer', type: 'Currency' },
        destinationTag: undefined,
      })
    })

    it('maps an MPT payment', () => {
      const tx: Payment = {
        TransactionType: 'Payment',
        Account: 'rFrom',
        Destination: 'rTo',
        Amount: { mpt_issuance_id: MPT_ID, value: '10' },
      }
      expect(txToOperation(tx)).toEqual({
        type: 'Payment',
        destination: { address: 'rTo', type: 'Address' },
        amount: '10',
        currency: { issuanceId: MPT_ID, type: 'MultiPurposeToken' },
        destinationTag: undefined,
      })
    })

    it('throws for cross-currency and unsupported fields', () => {
      const base: Payment = {
        TransactionType: 'Payment',
        Account: 'rFrom',
        Destination: 'rTo',
        Amount: '1000000',
      }
      expect(() => txToOperation({ ...base, SendMax: '2000000' })).toThrow(
        /SendMax/u,
      )
      expect(() =>
        txToOperation({ ...base, DomainID: 'A'.repeat(64) }),
      ).toThrow(/DomainID/u)
    })

    it('throws for a nonzero Flags field', () => {
      const tx: Payment = {
        TransactionType: 'Payment',
        Account: 'rFrom',
        Destination: 'rTo',
        Amount: '1000000',
        Flags: 2147483648,
      }
      expect(() => txToOperation(tx)).toThrow(/Payment\.Flags/u)
    })
  })

  describe('TrustSet', () => {
    it('maps tfSetNoRipple to enableRippling: false', () => {
      const tx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rFrom',
        LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        Flags: 131072,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'TrustSet',
        flags: [],
        limitAmount: {
          currency: { code: 'USD', issuer: 'rIssuer', type: 'Currency' },
          value: toCustodyIouAmount('100'),
        },
        enableRippling: false,
      })
    })

    it('maps tfClearNoRipple to enableRippling: true', () => {
      const tx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rFrom',
        LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        Flags: 262144,
      }
      const op = txToOperation(tx)
      if (op.type !== 'TrustSet') {
        throw new Error(`expected TrustSet, got ${op.type}`)
      }
      expect(op.enableRippling).toBe(true)
    })

    it('leaves enableRippling undefined and maps tfSetFreeze/tfClearFreeze/tfSetfAuth', () => {
      const tx: TrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rFrom',
        LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        Flags: 1048576 | 2097152 | 65536,
      }
      expect(txToOperation(tx)).toEqual({
        type: 'TrustSet',
        flags: ['tfSetFreeze', 'tfClearFreeze', 'tfSetfAuth'],
        limitAmount: {
          currency: { code: 'USD', issuer: 'rIssuer', type: 'Currency' },
          value: toCustodyIouAmount('100'),
        },
        enableRippling: undefined,
      })
    })

    it('throws for QualityIn, QualityOut, and deep-freeze flags', () => {
      const base: TrustSet = {
        TransactionType: 'TrustSet',
        Account: 'rFrom',
        LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
      }
      expect(() => txToOperation({ ...base, QualityIn: 1 })).toThrow(
        /QualityIn/u,
      )
      expect(() => txToOperation({ ...base, QualityOut: 1 })).toThrow(
        /QualityOut/u,
      )
      expect(() => txToOperation({ ...base, Flags: 4194304 })).toThrow(
        /tfSetDeepFreeze/u,
      )
      expect(() => txToOperation({ ...base, Flags: 8388608 })).toThrow(
        /tfClearDeepFreeze/u,
      )
    })
  })
})
