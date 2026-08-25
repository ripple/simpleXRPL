/**
 * Check whether a named flag is set on an xrpl transaction's `Flags`
 * field: either a raw numeric bitmask, or the boolean flags-interface object
 * xrpl also accepts. The object form is accepted as a plain `object`
 * because xrpl's per-transactor `*FlagsInterface` types declare named
 * optional booleans with no index signature, so they don't structurally fit
 * `Record<string, boolean>`.
 *
 * @param flags - The transaction's `Flags` field.
 * @param bit - The flag's numeric bit value.
 * @param key - The flag's boolean-interface key.
 * @returns `true` if the flag is set in either representation.
 */
export function hasFlag(
  flags: number | object | undefined,
  bit: number,
  key: string,
): boolean {
  if (flags === undefined) {
    return false
  }
  if (typeof flags === 'number') {
    // eslint-disable-next-line no-bitwise -- Numeric Flags bitmask check.
    return (flags & bit) !== 0
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Permissive read; see doc comment above.
  return (flags as Record<string, boolean | undefined>)[key] ?? false
}

/**
 * Collect every flag whose bit is set, in table order.
 *
 * @param flags - The transaction's `Flags` field.
 * @param table - Ordered `[bit, key]` pairs to test.
 * @returns The keys whose bit was set, in table order.
 */
export function collectFlags<T extends string>(
  flags: number | object | undefined,
  table: ReadonlyArray<readonly [number, T]>,
): T[] {
  return table
    .filter(([bit, key]) => hasFlag(flags, bit, key))
    .map(([, key]) => key)
}
