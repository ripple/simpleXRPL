import { toCustodyIouAmount } from '../../../src/custodians/ripple/mapping/iou-amount.js'
import { IntentValidationError } from '../../../src/errors.js'

describe('toCustodyIouAmount', () => {
  it('scales a whole number into Custody 10^-81 minimum units', () => {
    // 50 tokens = 50 × 10^81 minimum units = 5 × 10^82.
    expect(toCustodyIouAmount('50')).toBe(`5${'0'.repeat(82)}`)
    expect(toCustodyIouAmount('1000')).toBe(`1${'0'.repeat(84)}`)
  })

  it('scales a fractional value exactly, without floating-point drift', () => {
    // 0.5 × 10^81 = 5 × 10^80; 12.345 × 10^81 = 12345 × 10^78.
    expect(toCustodyIouAmount('0.5')).toBe(`5${'0'.repeat(80)}`)
    expect(toCustodyIouAmount('12.345')).toBe(`12345${'0'.repeat(78)}`)
  })

  it('maps zero to zero', () => {
    expect(toCustodyIouAmount('0')).toBe('0')
  })

  it('accepts a value exactly at the minimum unit (10^-81)', () => {
    expect(toCustodyIouAmount('1e-81')).toBe('1')
  })

  it('round-trips back to the original value when divided out', () => {
    for (const value of ['50', '1000', '0.5', '12.345', '1e-81']) {
      const scaled = toCustodyIouAmount(value)
      // scaled × 10^-81 must recover the input.
      expect(Number(scaled) * 1e-81).toBeCloseTo(Number(value))
    }
  })

  it('throws for precision finer than the minimum unit', () => {
    // 10^-82 cannot be an integer count of 10^-81 units.
    expect(() => toCustodyIouAmount('1e-82')).toThrow(IntentValidationError)
    expect(() => toCustodyIouAmount('1e-82')).toThrow(/minimum/u)
  })

  it('throws for a non-finite value', () => {
    expect(() => toCustodyIouAmount('not-a-number')).toThrow(
      IntentValidationError,
    )
  })
})
