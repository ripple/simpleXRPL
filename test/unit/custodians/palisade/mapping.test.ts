import {
  AccountSetAsfFlags,
  OfferCreateFlags,
  PaymentFlags,
  TrustSetFlags,
} from 'xrpl'
import type { AccountSet, Clawback, OfferCreate, Payment, TrustSet } from 'xrpl'

import {
  buildRawTransactionBody,
  PALISADE_NATIVE_TRANSACTORS,
  txToNativeSubmit,
} from '../../../../src/custodians/palisade/mapping/index.js'
import { SignerCapabilityError } from '../../../../src/index.js'

describe('txToNativeSubmit — Payment → transfer', () => {
  it('maps an XRP payment to symbol/qty with drops→decimal', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1000000',
      DestinationTag: 42,
    }
    const { subPath, body } = txToNativeSubmit(tx)
    expect(subPath).toBe('transfer')
    expect(body).toEqual({
      destinationAddress: 'rTo',
      symbol: 'XRP',
      qty: '1',
      config: { destinationTag: '42' },
    })
  })

  it('maps an IOU payment to symbol/contract/qty', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: { currency: 'USD', issuer: 'rIssuer', value: '10.5' },
    }
    expect(txToNativeSubmit(tx).body).toEqual({
      destinationAddress: 'rTo',
      symbol: 'USD',
      contract: 'rIssuer',
      qty: '10.5',
    })
  })

  it('rejects an MPT payment amount', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: { mpt_issuance_id: 'ABCDEF', value: '10' },
    }
    expect(() => txToNativeSubmit(tx)).toThrow(SignerCapabilityError)
  })

  it('rejects cross-currency / flag fields (SendMax)', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1000000',
      SendMax: '2000000',
    }
    expect(() => txToNativeSubmit(tx)).toThrow(SignerCapabilityError)
  })

  it('rejects Payment Flags, which the native transfer has no slot for', () => {
    // tfPartialPayment silently dropped would change what the recipient gets,
    // so a flagged Payment must fall back to raw signing rather than map.
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1000000',
      Flags: PaymentFlags.tfPartialPayment,
    }
    expect(() => txToNativeSubmit(tx)).toThrow(SignerCapabilityError)
  })

  it('carries SourceTag into the transfer config alongside DestinationTag', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1000000',
      SourceTag: 7,
      DestinationTag: 42,
    }
    expect(txToNativeSubmit(tx).body).toEqual({
      destinationAddress: 'rTo',
      symbol: 'XRP',
      qty: '1',
      config: { destinationTag: '42', sourceTag: '7' },
    })
  })
})

describe('txToNativeSubmit — TrustSet', () => {
  it('maps limitAmount, quality, and flags (incl. deep freeze)', () => {
    const tx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: 'rFrom',
      LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
      QualityIn: 1,
      QualityOut: 2,

      Flags: TrustSetFlags.tfSetFreeze | TrustSetFlags.tfSetDeepFreeze,
    }
    const { subPath, body } = txToNativeSubmit(tx)
    expect(subPath).toBe('xrp/trust-set')
    expect(body).toEqual({
      limitAmount: { asset: 'USD', issuer: 'rIssuer', value: '100' },
      qualityIn: 1,
      qualityOut: 2,
      flags: ['SET_FREEZE', 'SET_DEEP_FREEZE'],
    })
  })

  it('omits flags entirely when the TrustSet carries none', () => {
    // A plain trustline (no Flags at all) is the common case; the body must not
    // grow an empty `flags` array Palisade would reject.
    const tx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: 'rFrom',
      LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
    }
    expect(txToNativeSubmit(tx).body).toEqual({
      limitAmount: { asset: 'USD', issuer: 'rIssuer', value: '100' },
    })
  })

  it('reads flags from the boolean flags-interface object xrpl.js also allows', () => {
    // xrpl.js accepts `Flags` as either a bitmask or a booleans object; both
    // must map to the same Palisade flag list.
    const tx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: 'rFrom',
      LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
      Flags: { tfSetNoRipple: true, tfSetFreeze: false },
    }
    expect(txToNativeSubmit(tx).body).toEqual({
      limitAmount: { asset: 'USD', issuer: 'rIssuer', value: '100' },
      flags: ['SET_NORIPPLE'],
    })
  })
})

describe('txToNativeSubmit — AccountSet', () => {
  it('maps asf SetFlag to the enum plus domain/rate/tick', () => {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: 'rFrom',
      SetFlag: AccountSetAsfFlags.asfDefaultRipple,
      Domain: '6578616D706C65',
      TransferRate: 1_020_000_000,
      TickSize: 5,
    }
    expect(txToNativeSubmit(tx).body).toEqual({
      setFlag: 'DEFAULT_RIPPLE',
      domain: '6578616D706C65',
      transferRate: 1_020_000_000,
      tickSize: 5,
    })
  })

  it('maps a ClearFlag to the enum', () => {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: 'rFrom',
      ClearFlag: AccountSetAsfFlags.asfRequireAuth,
    }
    expect(txToNativeSubmit(tx).body).toEqual({ clearFlag: 'REQUIRE_AUTH' })
  })

  it('rejects an asf flag Palisade has no enum for (trustline locking)', () => {
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: 'rFrom',
      SetFlag: AccountSetAsfFlags.asfAllowTrustLineLocking,
    }
    expect(() => txToNativeSubmit(tx)).toThrow(SignerCapabilityError)
  })
})

describe('txToNativeSubmit — Clawback / OfferCreate / OfferCancel', () => {
  it('maps a Clawback amount (IOU)', () => {
    const tx: Clawback = {
      TransactionType: 'Clawback',
      Account: 'rIssuer',
      Amount: { currency: 'USD', issuer: 'rHolder', value: '25' },
    }
    const { subPath, body } = txToNativeSubmit(tx)
    expect(subPath).toBe('xrp/clawback')
    expect(body).toEqual({
      amount: { asset: 'USD', issuer: 'rHolder', value: '25' },
    })
  })

  it('rejects an MPT clawback amount by name', () => {
    // MPT reaches toCurrencyAmount through Clawback; the error must name the
    // field and the two ways out, since it is a hard capability boundary.
    const tx: Clawback = {
      TransactionType: 'Clawback',
      Account: 'rIssuer',
      Amount: { mpt_issuance_id: 'ABCDEF', value: '5' },
    }
    expect(() => txToNativeSubmit(tx)).toThrow(SignerCapabilityError)
    expect(() => txToNativeSubmit(tx)).toThrow(
      /no native MPT support for Amount.*allowRawSigning/su,
    )
  })

  it('maps an OfferCreate with flags, expiration, offerSequence', () => {
    const tx: OfferCreate = {
      TransactionType: 'OfferCreate',
      Account: 'rFrom',
      TakerGets: '1000000',
      TakerPays: { currency: 'USD', issuer: 'rIssuer', value: '10' },
      Expiration: 900,
      OfferSequence: 7,

      Flags: OfferCreateFlags.tfSell | OfferCreateFlags.tfImmediateOrCancel,
    }
    expect(txToNativeSubmit(tx).body).toEqual({
      takerGets: { asset: 'XRP', value: '1' },
      takerPays: { asset: 'USD', issuer: 'rIssuer', value: '10' },
      expiration: '900',
      offerSequence: '7',
      flags: ['IMMEDIATE_OR_CANCEL', 'SELL'],
    })
  })

  it('maps an OfferCancel', () => {
    const { subPath, body } = txToNativeSubmit({
      TransactionType: 'OfferCancel',
      Account: 'rFrom',
      OfferSequence: 7,
    })
    expect(subPath).toBe('xrp/offer-cancel')
    expect(body).toEqual({ offerSequence: '7' })
  })
})

describe('txToNativeSubmit — non-native', () => {
  it('throws for a transactor with no native op (MPTokenIssuanceCreate)', () => {
    expect(() =>
      txToNativeSubmit({
        TransactionType: 'MPTokenIssuanceCreate',
        Account: 'rFrom',
      }),
    ).toThrow(SignerCapabilityError)
  })

  it('lists exactly the six natively-mapped transactors', () => {
    const asc = (left: string, right: string): number =>
      left.localeCompare(right)
    expect(Array.from(PALISADE_NATIVE_TRANSACTORS).sort(asc)).toEqual(
      [
        'AccountSet',
        'Clawback',
        'OfferCancel',
        'OfferCreate',
        'Payment',
        'TrustSet',
      ].sort(asc),
    )
  })
})

describe('buildRawTransactionBody', () => {
  it('builds a sign-only XRPL raw body with an external id', () => {
    expect(buildRawTransactionBody('DEADBEEF', 'idem-1')).toEqual({
      encodedTransaction: 'DEADBEEF',
      signOnly: true,
      blockchain: 'XRP_LEDGER',
      externalId: 'idem-1',
    })
  })

  it('omits externalId when not given', () => {
    expect(buildRawTransactionBody('DEADBEEF')).toEqual({
      encodedTransaction: 'DEADBEEF',
      signOnly: true,
      blockchain: 'XRP_LEDGER',
    })
  })
})
