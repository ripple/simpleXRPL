/**
 * Guards for submission-context controls a backend cannot honor.
 *
 * {@link SubmissionContext} is uniform across custodians, but not every backend
 * can act on every field: only a governed custodian has a dry-run endpoint, and
 * only some model a fee cap. Silently dropping one of these is the dangerous
 * default — a caller who asks for a pre-flight and gets a real, irreversible
 * submission has been actively misled, and a dropped `maxFeeDrops` is a
 * financial control that quietly stopped applying.
 *
 * These guards make that failure loud at dispatch instead. A custodian calls
 * the ones matching what it can't honor, at each entry point that accepts a
 * context.
 */

import type { SubmissionContext } from '../domain/index.js'
import { SignerCapabilityError } from '../errors.js'

/**
 * Reject a submission that asks for a dry-run this backend cannot perform.
 *
 * @param ctx - The submission context.
 * @param backend - The custodian's display name, for the error message.
 * @param alternative - What the caller should do instead.
 * @throws {@link SignerCapabilityError} if `ctx.dryRun` is set.
 */
export function assertDryRunHonored(
  ctx: SubmissionContext,
  backend: string,
  alternative: string,
): void {
  if (ctx.dryRun ?? false) {
    throw new SignerCapabilityError(
      `${backend} cannot pre-flight a write: it has no dry-run facility, so ` +
        `submitting with dryRun would run the transaction for real. ${alternative}`,
    )
  }
}

/**
 * Reject a submission carrying a fee intent this backend cannot apply.
 *
 * Only a fee the backend would silently drop is rejected; a context with no
 * `fee` passes through and the backend prices the transaction itself.
 *
 * @param ctx - The submission context.
 * @param backend - The custodian's display name, for the error message.
 * @param alternative - What the caller should do instead.
 * @throws {@link SignerCapabilityError} if `ctx.fee` is set.
 */
export function assertFeeHonored(
  ctx: SubmissionContext,
  backend: string,
  alternative: string,
): void {
  if (ctx.fee !== undefined) {
    throw new SignerCapabilityError(
      `${backend} cannot apply a fee intent: it has no fee control the SDK ` +
        `can map, so priority and maxFeeDrops would be ignored. ${alternative}`,
    )
  }
}
