import { SimpleXRPLError } from '../../../src/index.js'
import {
  percentToTransferFee,
  percentToTransferRate,
} from '../../../src/verticals/fee.js'

describe('percentToTransferRate', () => {
  it('maps 0% to the no-fee sentinel', () => {
    expect(percentToTransferRate(0)).toBe(0)
  })

  it('maps percentages to the 1e9-scaled integer rate', () => {
    expect(percentToTransferRate(0.5)).toBe(1_005_000_000)
    expect(percentToTransferRate(2)).toBe(1_020_000_000)
    expect(percentToTransferRate(100)).toBe(2_000_000_000)
  })

  it('rejects percentages outside 0–100', () => {
    expect(() => percentToTransferRate(-1)).toThrow(SimpleXRPLError)
    expect(() => percentToTransferRate(101)).toThrow(SimpleXRPLError)
  })
})

describe('percentToTransferFee', () => {
  it('maps percentages to 0.001% increments', () => {
    expect(percentToTransferFee(0)).toBe(0)
    expect(percentToTransferFee(0.5)).toBe(500)
    expect(percentToTransferFee(50)).toBe(50_000)
  })

  it('rejects percentages outside 0–50', () => {
    expect(() => percentToTransferFee(-1)).toThrow(SimpleXRPLError)
    expect(() => percentToTransferFee(51)).toThrow(SimpleXRPLError)
  })
})
