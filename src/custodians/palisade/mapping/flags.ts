/**
 * Whether a named xrpl.js flag is set — accepting either a numeric bitmask or
 * the boolean flags-interface object xrpl.js also allows. Mirrors the Custody
 * adapter's helper; kept local so the two adapters stay decoupled.
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
    // eslint-disable-next-line no-bitwise -- numeric Flags bitmask check
    return (flags & bit) !== 0
  }
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- permissive read of the boolean flags interface
  return (flags as Record<string, boolean | undefined>)[key] ?? false
}

/**
 * Collect every flag whose bit is set, in table order.
 *
 * Palisade's wire flag names differ from xrpl.js's boolean-interface keys
 * (`SET_FREEZE` vs `tfSetFreeze`), so the table carries both: the interface key
 * is what the object form of `Flags` is looked up under, and the wire name is
 * what gets emitted. Conflating the two silently drops every object-form flag.
 *
 * @param flags - The transaction's `Flags` field.
 * @param table - Ordered `[bit, xrplInterfaceKey, wireFlag]` triples to test.
 * @returns The wire flag names whose bit was set, in table order.
 */
export function collectFlags<T extends string>(
  flags: number | object | undefined,
  table: ReadonlyArray<readonly [number, string, T]>,
): T[] {
  return table
    .filter(([bit, key]) => hasFlag(flags, bit, key))
    .map(([, , wireFlag]) => wireFlag)
}
