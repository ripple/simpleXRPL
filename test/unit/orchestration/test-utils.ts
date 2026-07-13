import type { Transaction, TxResponse } from 'xrpl'

import type {
  Account,
  Custodian,
  CustodianKind,
  SubmissionContext,
  SubmissionResult,
} from '../../../src/index.js'

const NOT_IMPLEMENTED = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/** One recorded `submitAndWait` call: the transaction and its context. */
export interface RecordedCall {
  readonly tx: Transaction
  readonly ctx: SubmissionContext
}

/** A fake custodian whose `submitAndWait` outcomes are queued per call. */
export interface StepCustodian {
  readonly account: Account

  /** Every `(tx, ctx)` pair this custodian's `submitAndWait` received. */
  readonly calls: RecordedCall[]

  /** Queue outcomes (results or errors) to return on the next calls, in order. */
  readonly queue: (...outcomes: ReadonlyArray<SubmissionResult | Error>) => void
}

/**
 * Build a fake custodian for one account, whose `submitAndWait` resolves or
 * rejects with the next queued outcome. Throws if called with none queued.
 *
 * @param kind - The custodian kind to report.
 * @param address - The account's r-address.
 * @returns The account, call log, and outcome queue.
 */
export function makeStepCustodian(
  kind: CustodianKind,
  address: string,
): StepCustodian {
  const calls: RecordedCall[] = []
  const outcomes: Array<SubmissionResult | Error> = []

  const custodian: Custodian = {
    kind,
    primary: { address },
    capabilities: () => ({ nativeOps: new Set(), allowRaw: true }),
    listAccounts: async () => [{ address, signer: custodian }],
    sign: NOT_IMPLEMENTED,
    submitAsync: NOT_IMPLEMENTED,
    // Genuinely generic, matching Custodian.submitAndWait<T>: callers may
    // request any T, but every queued outcome is a plain SubmissionResult
    // (T = unknown) — a test double, so the cast to the caller's T is trusted
    // rather than checked, same as LocalSigner's own placeholder.
    async submitAndWait<T = unknown>(
      tx: Transaction,
      ctx: SubmissionContext,
    ): Promise<SubmissionResult<T>> {
      calls.push({ tx, ctx })
      const outcome = outcomes.shift()
      if (outcome === undefined) {
        throw new Error('no scripted outcome queued')
      }
      if (outcome instanceof Error) {
        throw outcome
      }
      return outcome as SubmissionResult<T>
    },
  }

  return {
    account: { address, signer: custodian },
    calls,
    queue: (...next) => outcomes.push(...next),
  }
}

/**
 * A minimal `SubmissionResult` fixture for the `rippled` source.
 *
 * @param txHash - The transaction hash to carry.
 * @returns A rippled-sourced submission result.
 */
export function fakeResult(txHash: string): SubmissionResult {
  return {
    source: 'rippled',
    intent: undefined,
    txHash,

    response: { type: 'response' } as unknown as TxResponse,
  }
}
