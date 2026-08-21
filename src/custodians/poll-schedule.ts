/**
 * Delay schedule shared by the custodian polling loops.
 *
 * Every governed custodian waits the same way: ask for the current state, sleep,
 * ask again, until a terminal state or a deadline. At a 60-second budget a flat
 * interval is harmless. At the hour-long budget that multi-step operations need
 * — a step can sit waiting on a human approval — a flat 1.5s interval becomes
 * ~2,400 requests for a single step, and roughly 7,200 for a three-step IOU
 * issuance. That is enough to look like abuse to the custodian long before the
 * caller's deadline is reached.
 *
 * Backing off keeps the early polls responsive (a locally-signed transaction
 * settles in seconds) while making a long wait cheap: an hour costs on the order
 * of a hundred requests instead of thousands.
 */

/** Growth factor between successive polls. */
const FACTOR = 2

/** Inputs for {@link pollDelayMs}. */
export interface PollSchedule {
  /** Delay before the second poll; the first re-check stays this responsive. */
  readonly initialMs: number
  /** Ceiling the delay grows to and then holds. */
  readonly maxMs: number
}

/**
 * The delay to wait before the poll following `attempt`.
 *
 * @param attempt - Zero-based index of the poll just performed.
 * @param schedule - The initial delay and its ceiling.
 * @returns `initialMs * 2^attempt`, clamped to `maxMs`.
 */
export function pollDelayMs(attempt: number, schedule: PollSchedule): number {
  const { initialMs, maxMs } = schedule
  const grown = initialMs * FACTOR ** attempt
  // `grown` overflows to Infinity for large attempt counts; Math.min still
  // yields maxMs, so the clamp holds without a separate guard.
  return Math.min(maxMs, grown)
}
