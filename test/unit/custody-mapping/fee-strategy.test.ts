import { toFeeStrategy } from '../../../src/custodians/ripple/mapping/fee-strategy.js'

describe('toFeeStrategy', () => {
  it('defaults to Priority: Low with no cap when no fee intent is given', () => {
    expect(toFeeStrategy(undefined)).toEqual({
      feeStrategy: { type: 'Priority', priority: 'Low' },
      maximumFee: undefined,
    })
  })

  it('defaults to Priority: Low when the fee intent has no priority', () => {
    expect(toFeeStrategy({ maxFeeDrops: '500' })).toEqual({
      feeStrategy: { type: 'Priority', priority: 'Low' },
      maximumFee: '500',
    })
  })

  it.each([
    ['low', 'Low'],
    ['medium', 'Medium'],
    ['high', 'High'],
  ] as const)(
    'maps priority %s to Custody priority %s',
    (priority, custodyPriority) => {
      expect(toFeeStrategy({ priority })).toEqual({
        feeStrategy: { type: 'Priority', priority: custodyPriority },
        maximumFee: undefined,
      })
    },
  )

  it('carries the maxFeeDrops cap alongside the mapped priority', () => {
    expect(toFeeStrategy({ priority: 'high', maxFeeDrops: '1000' })).toEqual({
      feeStrategy: { type: 'Priority', priority: 'High' },
      maximumFee: '1000',
    })
  })
})
