import type { IssuedCurrencyAmount, MPTAmount } from 'xrpl'

import {
  fromLedgerAmount,
  IntentValidationError,
  iou,
  mpt,
  toLedgerAmount,
  XRP_ASSET,
} from '../../../src/index.js'

describe('toLedgerAmount', () => {
  describe('XRP', () => {
    it('converts whole and fractional XRP to drops', () => {
      expect(toLedgerAmount({ asset: XRP_ASSET, value: '10' })).toBe('10000000')
      expect(toLedgerAmount({ asset: XRP_ASSET, value: '0.000001' })).toBe('1')
    })

    it('rejects more than 6 decimal places', () => {
      expect(() =>
        toLedgerAmount({ asset: XRP_ASSET, value: '0.0000001' }),
      ).toThrow(IntentValidationError)
    })

    it('rejects negative and non-numeric values', () => {
      expect(() => toLedgerAmount({ asset: XRP_ASSET, value: '-1' })).toThrow(
        IntentValidationError,
      )
      expect(() => toLedgerAmount({ asset: XRP_ASSET, value: 'abc' })).toThrow(
        IntentValidationError,
      )
    })

    it('handles zero, trailing zeros, and scientific notation', () => {
      expect(toLedgerAmount({ asset: XRP_ASSET, value: '0' })).toBe('0')
      expect(toLedgerAmount({ asset: XRP_ASSET, value: '0.0000010' })).toBe('1')
      expect(toLedgerAmount({ asset: XRP_ASSET, value: '1e-6' })).toBe('1')
    })

    it('rejects an empty value', () => {
      expect(() => toLedgerAmount({ asset: XRP_ASSET, value: '' })).toThrow(
        IntentValidationError,
      )
    })
  })

  describe('IOU', () => {
    it('produces an issued-currency amount', () => {
      const result = toLedgerAmount({
        asset: iou('USD', 'rIssuer'),
        value: '100.5',
      }) as IssuedCurrencyAmount
      expect(result).toStrictEqual({
        currency: 'USD',
        issuer: 'rIssuer',
        value: '100.5',
      })
    })

    it('rejects more than 15 significant digits', () => {
      expect(() =>
        toLedgerAmount({
          asset: iou('USD', 'rIssuer'),
          value: '1234567890.123456',
        }),
      ).toThrow(IntentValidationError)
    })

    it('allows zero and rejects negative values', () => {
      expect(
        (
          toLedgerAmount({
            asset: iou('USD', 'rIssuer'),
            value: '0',
          }) as IssuedCurrencyAmount
        ).value,
      ).toBe('0')
      expect(() =>
        toLedgerAmount({ asset: iou('USD', 'rIssuer'), value: '-5' }),
      ).toThrow(IntentValidationError)
    })
  })

  describe('MPT', () => {
    it('scales a display value to integer base units', () => {
      const result = toLedgerAmount({
        asset: mpt('ISSUANCE', 2),
        value: '10.5',
      }) as MPTAmount
      expect(result).toStrictEqual({
        mpt_issuance_id: 'ISSUANCE',
        value: '1050',
      })
    })

    it('passes through an integer value at scale 0', () => {
      const result = toLedgerAmount({
        asset: mpt('ISSUANCE'),
        value: '5',
      }) as MPTAmount
      expect(result.value).toBe('5')
    })

    it('rejects a value with more precision than the scale allows', () => {
      expect(() =>
        toLedgerAmount({ asset: mpt('ISSUANCE', 2), value: '10.555' }),
      ).toThrow(IntentValidationError)
    })

    it('allows zero and rejects negative values', () => {
      expect(
        (toLedgerAmount({ asset: mpt('ISSUANCE', 2), value: '0' }) as MPTAmount)
          .value,
      ).toBe('0')
      expect(() =>
        toLedgerAmount({ asset: mpt('ISSUANCE', 2), value: '-5' }),
      ).toThrow(IntentValidationError)
    })

    it('rejects an amount exceeding the 63-bit maximum', () => {
      expect(() =>
        toLedgerAmount({
          asset: mpt('ISSUANCE'),
          value: '99999999999999999999',
        }),
      ).toThrow(IntentValidationError)
    })
  })
})

describe('fromLedgerAmount', () => {
  it('round-trips XRP, IOU, and MPT', () => {
    expect(fromLedgerAmount('10000000', XRP_ASSET)).toStrictEqual({
      asset: XRP_ASSET,
      value: '10',
    })

    const usd = iou('USD', 'rIssuer')
    expect(
      fromLedgerAmount(
        { currency: 'USD', issuer: 'rIssuer', value: '100.5' },
        usd,
      ),
    ).toStrictEqual({ asset: usd, value: '100.5' })

    const token = mpt('ISSUANCE', 2)
    expect(
      fromLedgerAmount({ mpt_issuance_id: 'ISSUANCE', value: '1050' }, token),
    ).toStrictEqual({ asset: token, value: '10.5' })
  })

  it('rejects a ledger amount whose shape does not match the asset', () => {
    expect(() =>
      fromLedgerAmount({ currency: 'USD', issuer: 'r', value: '1' }, XRP_ASSET),
    ).toThrow(IntentValidationError)
    expect(() => fromLedgerAmount('10000000', iou('USD', 'rIssuer'))).toThrow(
      IntentValidationError,
    )
    // An MPT asset given XRP drops, or an issued-currency amount: both are the
    // wrong shape and must not be silently reinterpreted at the wrong scale.
    expect(() => fromLedgerAmount('10000000', mpt('ABCDEF', 2))).toThrow(
      'Expected an MPT amount',
    )
    expect(() =>
      fromLedgerAmount(
        { currency: 'USD', issuer: 'rIssuer', value: '1' },
        mpt('ABCDEF', 2),
      ),
    ).toThrow('Expected an MPT amount')
  })
})

describe('MPT scale validation', () => {
  it.each([-1, 1.5, Number.NaN])(
    'rejects a non-negative-integer MPT scale (%p)',
    (scale) => {
      // A bad scale would shift the value by a nonsense exponent, producing an
      // amount silently off by orders of magnitude.
      expect(() =>
        toLedgerAmount({ asset: mpt('ABCDEF', scale), value: '1' }),
      ).toThrow(/MPT scale must be a non-negative integer/u)
    },
  )
})
