import type { FeeIntent } from '../../../domain/index.js'
import type { components } from '../../../generated/custody.js'

type XrplFeeStrategy = components['schemas']['Core_XrplFeeStrategy']

const PRIORITY_TO_CUSTODY: Readonly<
  Record<
    NonNullable<FeeIntent['priority']>,
    components['schemas']['Core_FeePriority']
  >
> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

/** The fee strategy and cap for a write carrying no fee intent at all. */
const DEFAULT_STRATEGY: XrplFeeStrategy = { type: 'Priority', priority: 'Low' }

/**
 * Map the SDK's normalized {@link FeeIntent} to Custody's XRPL fee strategy
 * and cap. Custody's `feeStrategy` is mandatory on every intent, so an absent
 * or priority-less intent falls back to `Priority: Low` — matching the
 * reference SDK's own `options.feePriority ?? 'Low'` default.
 *
 * @param fee - The caller's (or custodian's configured default) fee intent.
 * @returns The Custody fee strategy and optional cap, ready to spread into a
 * `Core_TransactionOrderParameters_XRPL`.
 */
export function toFeeStrategy(fee: FeeIntent | undefined): {
  feeStrategy: XrplFeeStrategy
  maximumFee?: string
} {
  if (fee === undefined) {
    return { feeStrategy: DEFAULT_STRATEGY }
  }
  const feeStrategy: XrplFeeStrategy =
    fee.priority === undefined
      ? DEFAULT_STRATEGY
      : { type: 'Priority', priority: PRIORITY_TO_CUSTODY[fee.priority] }
  return { feeStrategy, maximumFee: fee.maxFeeDrops }
}
