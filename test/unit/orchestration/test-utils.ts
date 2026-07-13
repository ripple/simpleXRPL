import { Wallet } from 'xrpl'
import type { Transaction, TxResponse } from 'xrpl'

import type {
  Account,
  AccountSelector,
  Custodian,
  CustodianKind,
  SubmissionContext,
  SubmissionHost,
  SubmissionResult,
} from '../../../src/index.js'
import { fakeLedger } from '../pipeline/fake-ledger.js'

const NOT_IMPLEMENTED = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/** One recorded `submitAndWait` call: the transaction and its context. */
export interface RecordedCall {
  readonly transaction: Transaction
  readonly ctx: SubmissionContext
}

/** A fake custodian whose `submitAndWait` outcomes are queued per call. */
export interface StepCustodian {
  readonly account: Account

  /** Every `(transaction, ctx)` pair this custodian's `submitAndWait` received. */
  readonly calls: RecordedCall[]

  /** Queue outcomes (results or errors) to return on the next calls, in order. */
  readonly queue: (...outcomes: ReadonlyArray<SubmissionResult | Error>) => void
}

/**
 * Build a fake custodian for one account, whose `submitAndWait` resolves or
 * rejects with the next queued outcome. Throws if called with none queued.
 *
 * Reports `nativeOps` covering every transactor these tests submit, so
 * `dispatch()` always picks the native custody path — the pipeline then skips
 * `host.ledger.autofill`, keeping these fakes focused on orchestration rather
 * than ledger mechanics.
 *
 * @param kind - The custodian kind to report.
 * @param address - The account's r-address (must be a valid classic address —
 * the real xrpl.js protocol validator runs on every submitted step).
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
    capabilities: () => ({
      nativeOps: new Set(['AccountSet', 'TrustSet', 'Payment']),
      allowRaw: false,
    }),
    listAccounts: async () => [{ address, signer: custodian }],
    sign: NOT_IMPLEMENTED,
    submitAsync: NOT_IMPLEMENTED,
    // Genuinely generic, matching Custodian.submitAndWait<T>: callers may
    // request any T, but every queued outcome is a plain SubmissionResult
    // (T = unknown) — a test double, so the cast to the caller's T is trusted
    // rather than checked, same as LocalSigner's own placeholder.
    async submitAndWait<T = unknown>(
      transaction: Transaction,
      ctx: SubmissionContext,
    ): Promise<SubmissionResult<T>> {
      calls.push({ transaction, ctx })
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
 * Extract the r-address from an {@link AccountSelector}, if it names one
 * directly. The `{ signer, account? }` form isn't used by these tests.
 *
 * @param selector - The selector to read an address from.
 * @returns The named address, or `undefined`.
 */
function resolveAddress(
  selector: AccountSelector | undefined,
): string | undefined {
  if (selector === undefined) {
    return undefined
  }
  if (typeof selector === 'string') {
    return selector
  }
  return 'address' in selector ? selector.address : undefined
}

/**
 * Build a minimal {@link SubmissionHost} over a fixed set of accounts. Each
 * account's own r-address resolves to it; an omitted selector resolves to the
 * first account.
 *
 * @param accounts - The accounts this host can resolve.
 * @returns A host suitable for `submitTransaction` / `runMultiStep`.
 */
export function makeFakeHost(accounts: readonly Account[]): SubmissionHost {
  return {
    ledger: fakeLedger(),
    resolveAccount(selector?: AccountSelector): Account {
      const address = resolveAddress(selector) ?? accounts[0]?.address
      const account = accounts.find(
        (candidate) => candidate.address === address,
      )
      if (account === undefined) {
        throw new Error(`no fake account for ${String(address)}`)
      }
      return account
    },
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

/**
 * Generate a valid (checksum-correct) test r-address, since the real xrpl.js
 * protocol validator runs on every submitted transaction.
 *
 * @returns A freshly generated classic address.
 */
export function testAddress(): string {
  return Wallet.generate().classicAddress
}
