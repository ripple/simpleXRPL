/**
 * Hex-encode a UTF-8 string for XRPL blob fields (uppercase), e.g. a credential
 * type, credential URI, or account domain.
 *
 * @param value - The plain UTF-8 string.
 * @returns The uppercase hex encoding.
 */
export function toHex(value: string): string {
  return Buffer.from(value, 'utf8').toString('hex').toUpperCase()
}

/**
 * Decode a hex XRPL blob field back to a UTF-8 string — the inverse of
 * {@link toHex}, used by read methods so nothing is surfaced in hex.
 *
 * @param hex - The hex-encoded value from the ledger.
 * @returns The decoded UTF-8 string.
 */
export function fromHex(hex: string): string {
  return Buffer.from(hex, 'hex').toString('utf8')
}
