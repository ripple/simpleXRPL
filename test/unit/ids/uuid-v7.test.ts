import { uuidV7 } from '../../../src/ids/index.js'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u
const HEX_RADIX = 16
const TIMESTAMP_HEX_LEN = 12

describe('uuidV7', () => {
  it('produces a canonical, version-7, RFC-variant UUID', () => {
    const id = uuidV7()
    expect(id).toMatch(UUID_RE)
    // Version nibble (first char of the 3rd group) is 7.
    expect(id[14]).toBe('7')
    // Variant: two high bits of the 4th group are 10xx -> 8,9,a,b.
    expect('89ab').toContain(id[19])
  })

  it('embeds the given millisecond timestamp in the leading 48 bits', () => {
    const nowMs = 1_700_000_000_000
    const id = uuidV7(nowMs)
    const hex = id.replace(/-/gu, '').slice(0, TIMESTAMP_HEX_LEN)
    expect(parseInt(hex, HEX_RADIX)).toBe(nowMs)
  })

  it('is time-ordered: a later timestamp sorts lexicographically after an earlier one', () => {
    const earlier = uuidV7(1_000_000_000_000)
    const later = uuidV7(2_000_000_000_000)
    expect(earlier < later).toBe(true)
  })

  it('generates distinct ids within the same millisecond (random tail)', () => {
    const ids = new Set(
      Array.from({ length: 100 }, () => uuidV7(1_700_000_000_000)),
    )
    expect(ids.size).toBe(100)
  })
})
