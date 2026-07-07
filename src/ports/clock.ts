/**
 * A source of wall-clock time, injected so timeout and token-expiry logic is
 * deterministic and testable.
 */
export interface Clock {
  /** The current time in epoch milliseconds. */
  readonly now: () => number
}
