import type { Account, TransactorType } from '../domain/index.js'
import { SignerCapabilityError } from '../errors.js'

/** The concrete route a write takes once dispatched. */
export type SubmissionPath =
  | 'local'
  | 'external'
  | 'ripple-native'
  | 'ripple-raw'
  | 'palisade-native'
  | 'palisade-raw'

/**
 * Choose the path for a transaction on a resolved account. Local signs
 * everything; a custodian uses its native operation when the transactor is in
 * its capability set, else the raw fallback when enabled, else it is rejected.
 *
 * @param account - The resolved source account.
 * @param transactor - The XRPL transaction type being dispatched.
 * @returns The chosen submission path.
 * @throws {@link SignerCapabilityError} if the custodian can neither natively
 *   nor raw-sign the transactor.
 */
export function dispatch(
  account: Account,
  transactor: TransactorType,
): SubmissionPath {
  const { signer } = account
  if (signer.kind === 'local') {
    return 'local'
  }
  // External (KMS/HSM) is a local-family signer: it signs any transactor and
  // submits through the shared ledger, so it needs no capability gating.
  if (signer.kind === 'external') {
    return 'external'
  }

  const capabilities = signer.capabilities()
  const isRipple = signer.kind === 'ripple-custody'
  if (capabilities.nativeOps.has(transactor)) {
    return isRipple ? 'ripple-native' : 'palisade-native'
  }
  if (capabilities.allowRaw) {
    return isRipple ? 'ripple-raw' : 'palisade-raw'
  }
  throw new SignerCapabilityError(
    `${signer.kind} cannot sign ${transactor}. Enable raw signing on this ` +
      'custodian, or use a different signer for this account.',
  )
}

/**
 * Whether the path submits through the custodian's own network rather than the
 * shared ledger.
 *
 * @param path - The dispatched submission path.
 * @returns `true` for the native custody paths.
 */
export function isNativePath(path: SubmissionPath): boolean {
  return path === 'ripple-native' || path === 'palisade-native'
}
