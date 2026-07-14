import { hasFlag } from '../../../src/custodians/ripple/mapping/flags.js'

describe('hasFlag', () => {
  it('returns false for undefined flags', () => {
    expect(hasFlag(undefined, 1, 'tfSetNoRipple')).toBe(false)
  })

  it('reads a numeric bitmask', () => {
    expect(hasFlag(131072, 131072, 'tfSetNoRipple')).toBe(true)
    expect(hasFlag(131072, 262144, 'tfClearNoRipple')).toBe(false)
    expect(hasFlag(0, 1, 'tfSetNoRipple')).toBe(false)
  })

  it('combines multiple bits in a numeric bitmask', () => {
    const combined = 131072 | 262144
    expect(hasFlag(combined, 131072, 'tfSetNoRipple')).toBe(true)
    expect(hasFlag(combined, 262144, 'tfClearNoRipple')).toBe(true)
    expect(hasFlag(combined, 1048576, 'tfSetFreeze')).toBe(false)
  })

  it('reads a boolean flags-interface object', () => {
    expect(hasFlag({ tfSetNoRipple: true }, 131072, 'tfSetNoRipple')).toBe(true)
    expect(hasFlag({ tfSetNoRipple: false }, 131072, 'tfSetNoRipple')).toBe(
      false,
    )
    expect(hasFlag({}, 131072, 'tfSetNoRipple')).toBe(false)
  })
})
