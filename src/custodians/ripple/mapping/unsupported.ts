import { SignerCapabilityError } from '../../../errors.js'

/**
 * Throw a {@link SignerCapabilityError} naming a field Custody's native
 * operation schema has no slot for. The raw-signing fallback is the way out
 * of this once it lands; until then, an unsupported field is always a hard
 * stop.
 *
 * @param transactor - The XRPL transactor name.
 * @param field - The unsupported field's name.
 * @throws {@link SignerCapabilityError} always.
 */
export function unsupported(transactor: string, field: string): never {
  throw new SignerCapabilityError(
    `RippleCustody cannot natively represent ${transactor}.${field}. Enable raw signing for this account, or use a different signer.`,
  )
}
