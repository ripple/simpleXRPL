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
