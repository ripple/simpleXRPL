import type { IssuedCurrencyAmount, MPTAmount } from 'xrpl'

import {
  rejectMpt,
  toAssetQuantity,
  toClawbackCurrency,
  toIouCurrency,
  toPaymentCurrency,
} from '../../../src/custodians/ripple/mapping/currency.js'
import { toCustodyIouAmount } from '../../../src/custodians/ripple/mapping/iou-amount.js'
import { SignerCapabilityError } from '../../../src/errors.js'

const IOU: IssuedCurrencyAmount = {
  currency: 'USD',
  issuer: 'rIssuer',
  value: '10',
}
const MPT: MPTAmount = { mpt_issuance_id: 'ABCDEF', value: '10' }

describe('toIouCurrency', () => {
  it('maps an issued-currency amount to a Currency reference', () => {
    expect(toIouCurrency(IOU)).toEqual({
      code: 'USD',
      issuer: 'rIssuer',
      type: 'Currency',
    })
  })
})

describe('toClawbackCurrency', () => {
  it('maps an IOU amount to a Currency reference using the passed token issuer', () => {
    // The token issuer comes from the arg (Clawback.Account), not the amount's
    // issuer — which on a native Clawback is the holder, not the token issuer.
    expect(toClawbackCurrency(IOU, 'rTokenIssuer')).toEqual({
      code: 'USD',
      issuer: 'rTokenIssuer',
      type: 'Currency',
    })
  })

  it('maps an MPT amount to a MultiPurposeToken reference', () => {
    expect(toClawbackCurrency(MPT, 'rIssuer')).toEqual({
      issuanceId: 'ABCDEF',
      type: 'MultiPurposeToken',
    })
  })
})

describe('toPaymentCurrency', () => {
  it('maps an IOU amount to a Currency reference', () => {
    expect(toPaymentCurrency(IOU)).toEqual({
      code: 'USD',
      issuer: 'rIssuer',
      type: 'Currency',
    })
  })

  it('maps an MPT amount to a MultiPurposeToken reference', () => {
    expect(toPaymentCurrency(MPT)).toEqual({
      issuanceId: 'ABCDEF',
      type: 'MultiPurposeToken',
    })
  })
})

describe('toAssetQuantity', () => {
  it('maps a drops string to a currency-less asset quantity', () => {
    expect(toAssetQuantity('1000')).toEqual({ amount: '1000' })
  })

  it('maps an issued-currency amount to an asset quantity, scaling the value', () => {
    expect(toAssetQuantity(IOU)).toEqual({
      amount: toCustodyIouAmount('10'),
      currency: { code: 'USD', issuer: 'rIssuer', type: 'Currency' },
    })
  })
})

describe('rejectMpt', () => {
  it('passes through a drops string unchanged', () => {
    expect(rejectMpt('OfferCreate', 'TakerGets', '1000')).toBe('1000')
  })

  it('passes through an IOU amount unchanged', () => {
    expect(rejectMpt('OfferCreate', 'TakerGets', IOU)).toBe(IOU)
  })

  it('throws SignerCapabilityError for an MPT amount', () => {
    expect(() => rejectMpt('OfferCreate', 'TakerGets', MPT)).toThrow(
      SignerCapabilityError,
    )
    expect(() => rejectMpt('OfferCreate', 'TakerGets', MPT)).toThrow(
      /OfferCreate\.TakerGets/u,
    )
  })
})
