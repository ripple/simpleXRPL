import { SignerCapabilityError } from '../../../errors.js'

/**
 * Reject a transactor or field Palisade has no native slot for. The caller
 * (or the pipeline's raw fallback) turns this into either the raw path or a
 * surfaced error — never a silent drop.
 *
 * @param transactor - The XRPL transaction type.
 * @param field - The specific field/flag with no native representation.
 * @throws {@link SignerCapabilityError} always.
 */
export function palisadeUnsupported(transactor: string, field: string): never {
  throw new SignerCapabilityError(
    `Palisade has no native representation for ${transactor}.${field}. Enable ` +
      'allowRawSigning, drop the field, or use a Local account.',
  )
}
