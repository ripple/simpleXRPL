import { randomBytes } from 'node:crypto'

const UUID_BYTE_LENGTH = 16
const BYTE_RANGE = 256
/** The 48-bit big-endian unix-ms timestamp occupies bytes 0..5. */
const TIMESTAMP_BYTES = 6
/** Version nibble (7) goes in the high nibble of byte 6. */
const VERSION_BYTE_INDEX = 6
const VERSION_7 = 0x70
const VERSION_LOW_NIBBLE_MASK = 0x0f
/** RFC 9562 variant (10xx xxxx) goes in the two high bits of byte 8. */
const VARIANT_BYTE_INDEX = 8
const VARIANT = 0x80
const VARIANT_LOW_BITS_MASK = 0x3f

/**
 * Generate a UUIDv7 (RFC 9562): a 48-bit big-endian unix-millisecond timestamp
 * followed by 74 random bits, with the version and variant fields set. The
 * leading timestamp makes ids time-ordered — lexicographically sortable and
 * index-friendly — which is why the SDK uses them for client-generated intent
 * ids (§8): a retry reuses the same id, and ids stay ordered for the backend.
 *
 * @param nowMs - The unix-millisecond timestamp to embed (defaults to now;
 * injectable for deterministic tests).
 * @returns A canonical lower-case UUIDv7 string.
 */
export function uuidV7(nowMs: number = Date.now()): string {
  const bytes = randomBytes(UUID_BYTE_LENGTH)

  // Big-endian 48-bit timestamp into the first six bytes.
  let remaining = nowMs
  for (let index = TIMESTAMP_BYTES - 1; index >= 0; index -= 1) {
    bytes[index] = remaining % BYTE_RANGE
    remaining = Math.floor(remaining / BYTE_RANGE)
  }

  /* eslint-disable no-bitwise -- fixed-position bit-field masks per RFC 9562 */
  bytes[VERSION_BYTE_INDEX] =
    (bytes[VERSION_BYTE_INDEX] & VERSION_LOW_NIBBLE_MASK) | VERSION_7
  bytes[VARIANT_BYTE_INDEX] =
    (bytes[VARIANT_BYTE_INDEX] & VARIANT_LOW_BITS_MASK) | VARIANT
  /* eslint-enable no-bitwise */

  return bytes
    .toString('hex')
    .replace(
      /^(?<a>.{8})(?<b>.{4})(?<c>.{4})(?<d>.{4})(?<e>.{12})$/u,
      '$<a>-$<b>-$<c>-$<d>-$<e>',
    )
}
