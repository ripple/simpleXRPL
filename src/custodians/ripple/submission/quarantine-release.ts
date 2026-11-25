import type { Transaction } from 'xrpl'

import type { SubmissionContext } from '../../../domain/index.js'
import {
  AccountNotFoundError,
  CustodyApiError,
  SimpleXRPLError,
} from '../../../errors.js'
import { CUSTODY_ROUTES } from '../../../generated/custody-routes.js'
import type { components } from '../../../generated/custody.js'
import { uuidV7 } from '../../../ids/index.js'
import type { PollSchedule } from '../../poll-schedule.js'
import { pollDelayMs, sleep } from '../../poll-schedule.js'
import type { CustodyApi } from '../api.js'
import type { RippleCustodyState } from '../construction.js'
import { findAddressReferences } from '../discovery/address-lookup.js'
import type { CustodyQuarantineAccount } from '../intent-types.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type ApiTransfer = components['schemas']['Core_ApiTransfer']
type TransfersCollection = components['schemas']['Core_TransfersCollection']

/** HTTP status some Custody versions answer a `quarantineStatus` filter with. */
const HTTP_INTERNAL_SERVER_ERROR = 500

/**
 * Transactors that can produce a quarantinable transfer. Auto-release only runs
 * for these, so the others (e.g. AccountSet, TrustSet) don't pay the detection
 * poll.
 */
export const TOKEN_MOVEMENT_TRANSACTORS: ReadonlySet<string> = new Set([
  'Payment',
])

/**
 * Poll cadence while waiting for Custody to record a transaction's transfers.
 * Starts responsive (they usually show up quickly) and backs off. See
 * {@link pollDelayMs}.
 */
const POLL_SCHEDULE: PollSchedule = { initialMs: 2000, maxMs: 15_000 }

/** Inputs for {@link autoReleaseQuarantined}. */
export interface AutoReleaseOptions {
  /** The authenticated Custody client (for reading transfers). */
  readonly client: CustodyHttpClient
  /** The propose surface used to submit the release intents. */
  readonly api: CustodyApi
  /** The Custody domain the transaction belongs to. */
  readonly domainId: string
  /** The Custody transaction whose transfers to inspect. */
  readonly transactionId: string
  /** How long to wait for Custody to record the transfers before giving up. */
  readonly timeoutMs: number
}

/**
 * The custodied account a quarantined transfer should be released under:
 * the recipient when it's a custodied `Account`, else the first custodied
 * `Account` sender. `undefined` when neither party is custodied (an external
 * transfer the SDK can't release).
 *
 * @param transfer - The transfer to inspect.
 * @returns The custodied account UUID, or `undefined`.
 */
function custodiedAccountId(transfer: ApiTransfer): string | undefined {
  if (transfer.recipient?.type === 'Account') {
    return transfer.recipient.accountId
  }
  return transfer.senders.find((sender) => sender.type === 'Account')?.accountId
}

/**
 * List every transfer Custody has recorded for `transactionId`, following
 * pagination to completion.
 *
 * @param options - The client, domain, and transaction id.
 * @returns All transfers linked to the transaction.
 */
async function listTransfersForTransaction(
  options: AutoReleaseOptions,
): Promise<ApiTransfer[]> {
  const { client, domainId, transactionId } = options
  const path = `/v1/domains/${domainId}/transactions/transfers`
  const transfers: ApiTransfer[] = []
  let startingAfter: string | undefined
  do {
    // eslint-disable-next-line no-await-in-loop -- pagination is inherently sequential
    const page = await client.get<TransfersCollection>(path, {
      transactionId,
      startingAfter,
    })
    transfers.push(...page.items)
    // Custody returns a literal `null` for `nextStartingAfter` on the last page
    // (the generated type says `string`), so coalesce null/'' to a stop — an
    // `!== undefined` check alone would loop forever.
    const next: string | null | undefined = page.nextStartingAfter
    startingAfter = next ?? undefined
  } while (startingAfter !== undefined && startingAfter !== '')
  return transfers
}

/**
 * Whether Custody has recorded the transaction's transfers along with their
 * quarantine outcome: at least one transfer exists and none is missing its
 * `quarantineStatus`.
 *
 * A `null` status counts as decided. Custody sends it for a transfer that
 * quarantine doesn't apply to — the transaction's fee, or a transfer to an
 * address outside Custody — and it never changes, so waiting on it would run
 * every auto-release to its timeout.
 *
 * @param transfers - The transaction's transfers.
 * @returns `true` once every transfer's outcome is known.
 */
function allDecided(transfers: ApiTransfer[]): boolean {
  return (
    transfers.length > 0 &&
    transfers.every((transfer) => transfer.quarantineStatus !== undefined)
  )
}

/**
 * Poll a transaction's transfers until Custody has recorded them with their
 * quarantine outcome, or the timeout elapses, then return only the quarantined
 * ones. Custody records a transfer on its own schedule, which can trail the
 * on-ledger confirmation the caller just waited for; this wait bridges that
 * gap. A transaction that produces no transfer times out to an empty result.
 *
 * @param options - The client, domain, transaction id, and timeout.
 * @returns The quarantined transfers (possibly empty).
 */
async function pollQuarantinedTransfers(
  options: AutoReleaseOptions,
): Promise<ApiTransfer[]> {
  const deadline = Date.now() + options.timeoutMs
  for (let attempt = 0; ; attempt += 1) {
    // eslint-disable-next-line no-await-in-loop -- sequential polling is inherent to the wait
    const transfers = await listTransfersForTransaction(options)
    const quarantined = transfers.filter(
      (transfer) => transfer.quarantineStatus === 'Quarantined',
    )
    if (allDecided(transfers)) {
      return quarantined
    }
    const delay = pollDelayMs(attempt, POLL_SCHEDULE)
    if (Date.now() + delay >= deadline) {
      // Out of time: release whatever is already quarantined, best-effort.
      return quarantined
    }
    // eslint-disable-next-line no-await-in-loop -- sequential polling is inherent to the wait
    await sleep(delay)
  }
}

/**
 * Propose a release intent per custodied account, batching that account's
 * quarantined transfer ids into one intent. Each release id is generated here
 * (and passed as the intent id) so it can be surfaced for the caller to track;
 * transfers with no custodied party are skipped.
 *
 * @param api - The propose surface.
 * @param transfers - The quarantined transfers to release.
 * @returns The generated release intent ids.
 */
async function proposeReleases(
  api: CustodyApi,
  transfers: ApiTransfer[],
): Promise<string[]> {
  const byAccount = new Map<string, string[]>()
  for (const transfer of transfers) {
    const accountId = custodiedAccountId(transfer)
    if (accountId !== undefined) {
      const ids = byAccount.get(accountId) ?? []
      ids.push(transfer.id)
      byAccount.set(accountId, ids)
    }
  }
  return Promise.all(
    Array.from(byAccount, async ([accountId, transferIds]) => {
      const intentId = uuidV7()
      await api.propose(
        { accountId, transferIds, type: 'v0_ReleaseQuarantinedTransfers' },
        { id: intentId },
      )
      return intentId
    }),
  )
}

/**
 * Detect the transfers a confirmed transaction produced that Custody
 * quarantined, and auto-propose their release (grouped by custodied account).
 * Proposes only — each release still runs the account's approval policy.
 *
 * @param options - The client, propose surface, domain, transaction id, and
 *   timeout.
 * @returns The proposed release intent ids (empty when nothing was quarantined).
 */
export async function autoReleaseQuarantined(
  options: AutoReleaseOptions,
): Promise<string[]> {
  const quarantined = await pollQuarantinedTransfers(options)
  if (quarantined.length === 0) {
    return []
  }
  return proposeReleases(options.api, quarantined)
}

/** Inputs for {@link runAutoRelease}. */
export interface RunAutoReleaseInput {
  /** The custodian state (enable flag, timeout, domain, client). */
  readonly state: RippleCustodyState
  /** The propose surface. */
  readonly api: CustodyApi
  /** The submitted transaction; its type gates whether auto-release runs. */
  readonly tx: Transaction
  /** The submission context (carries the per-call override). */
  readonly ctx: SubmissionContext
  /** The Custody transaction id, if the transaction produced one. */
  readonly transactionId: string | undefined
}

/**
 * The `submitAndWait` hook: run auto-release for a just-confirmed transaction
 * when it's enabled, is a {@link TOKEN_MOVEMENT_TRANSACTORS | transactor that
 * can be quarantined}, and yielded a Custody transaction id.
 * Best-effort — the transaction already confirmed on-chain, so a detection or
 * propose failure is swallowed rather than surfaced as a failed submission.
 *
 * @param input - The custodian state, propose surface, transaction, context,
 *   and the Custody transaction id (if one was produced).
 * @returns The proposed release intent ids, or `undefined` when it didn't run.
 */
export async function runAutoRelease(
  input: RunAutoReleaseInput,
): Promise<readonly string[] | undefined> {
  const { state, api, tx, ctx, transactionId } = input
  const enabled = ctx.autoReleaseQuarantine ?? state.autoReleaseQuarantine
  if (
    !enabled ||
    !TOKEN_MOVEMENT_TRANSACTORS.has(tx.TransactionType) ||
    transactionId === undefined
  ) {
    return undefined
  }
  try {
    return await autoReleaseQuarantined({
      client: state.client,
      api,
      domainId: state.domainId,
      transactionId,
      timeoutMs: state.quarantinePollTimeoutMs,
    })
  } catch {
    return undefined
  }
}

/**
 * Resolve the Custody account id a quarantine call names, looking an XRPL
 * address up in the custodian's own domain.
 *
 * One account commonly holds the same address on several ledgers (e.g. testnet
 * and mainnet); that is still one account, so no ledger has to be picked.
 *
 * @param state - The custodian state (client, domain, version guard).
 * @param selector - The account, by XRPL address or Custody account id.
 * @param sdkMethod - The SDK call resolving it, for a version error.
 * @returns The Custody account id.
 * @throws {@link SimpleXRPLError} unless exactly one of `account` and
 *   `accountId` is given, or if several accounts in the domain hold the
 *   address.
 * @throws {@link AccountNotFoundError} if no account in the domain holds the
 *   address.
 * @throws {@link UnsupportedInVersionError} if the instance's Custody version
 *   can't look an address up.
 */
export async function resolveQuarantineAccountId(
  state: Pick<RippleCustodyState, 'client' | 'domainId' | 'versionGuard'>,
  selector: CustodyQuarantineAccount,
  sdkMethod: string,
): Promise<string> {
  const { account, accountId } = selector
  if ((account === undefined) === (accountId === undefined)) {
    throw new SimpleXRPLError(
      'Name the account exactly one way: `account` (its XRPL address) or `accountId` (its Custody account id)',
    )
  }
  if (accountId !== undefined) {
    return accountId
  }
  const route = CUSTODY_ROUTES.getAllDomainsAddresses
  state.versionGuard.assertEndpoint(route.method, route.path, sdkMethod)
  const references = await findAddressReferences(state.client, account)
  const accountIds = Array.from(
    new Set(
      references
        .filter((reference) => reference.domainId === state.domainId)
        .map((reference) => reference.accountId),
    ),
  )
  if (accountIds.length === 0) {
    throw new AccountNotFoundError(account)
  }
  if (accountIds.length > 1) {
    throw new SimpleXRPLError(
      `${accountIds.length} Custody accounts in domain ${state.domainId} hold ` +
        `${account} (${accountIds.join(', ')}); name one by accountId`,
    )
  }
  return accountIds[0]
}

/**
 * Whether a transfer is quarantined. Read from `quarantineStatus` when Custody
 * sends one, else from the deprecated `quarantined` boolean, which is `true`
 * for exactly the `Quarantined` status.
 *
 * @param transfer - The transfer to inspect.
 * @returns `true` if the transfer is held in quarantine.
 */
function isQuarantined(transfer: ApiTransfer): boolean {
  // Custody sends a literal `null` where a transfer has no quarantine status
  // (the generated type says the field is just absent), so test for a value.
  return typeof transfer.quarantineStatus === 'string'
    ? transfer.quarantineStatus === 'Quarantined'
    : transfer.quarantined
}

/** The account and quarantine filter of a transfers read. */
interface QuarantinedTransfersQuery {
  /** The Custody account id; matches transfers it sent or received. */
  readonly accountId: string
  /** The status filter, which some Custody versions fail on. */
  readonly quarantineStatus?: 'Quarantined'
  /** The deprecated filter those versions still serve. */
  readonly quarantined?: true
}

/**
 * Read every transfer of an account that matches a quarantine filter.
 *
 * @param api - The Custody API surface.
 * @param domainId - The custodian's domain.
 * @param query - The account and the quarantine filter to send.
 * @returns The matching transfers, across all pages.
 */
async function collectTransfers(
  api: CustodyApi,
  domainId: string,
  query: QuarantinedTransfersQuery,
): Promise<ApiTransfer[]> {
  const transfers: ApiTransfer[] = []
  for await (const transfer of api.paginate('getTransfers', {
    path: { domainId },
    query,
  })) {
    transfers.push(transfer)
  }
  return transfers
}

/**
 * List the quarantined transfers an account can release — the ones
 * {@link custodiedAccountId} places under it, which in practice are the ones it
 * received (Custody releases a transfer under its recipient account).
 *
 * Some Custody versions answer a `quarantineStatus` filter with a 500. The
 * deprecated `quarantined: true` filter selects the same rows — it only falls
 * short for the other statuses, which this never asks for — so a 500 is
 * retried with it.
 *
 * @param api - The Custody API surface.
 * @param domainId - The custodian's domain.
 * @param accountId - The Custody account id.
 * @returns The account's quarantined transfers, across all pages.
 * @throws A `CustodyApiError` if Custody rejects the read.
 */
export async function listQuarantinedTransfers(
  api: CustodyApi,
  domainId: string,
  accountId: string,
): Promise<ApiTransfer[]> {
  let transfers: ApiTransfer[]
  try {
    transfers = await collectTransfers(api, domainId, {
      accountId,
      quarantineStatus: 'Quarantined',
    })
  } catch (error) {
    if (
      !(error instanceof CustodyApiError) ||
      error.status !== HTTP_INTERNAL_SERVER_ERROR
    ) {
      throw error
    }
    transfers = await collectTransfers(api, domainId, {
      accountId,
      quarantined: true,
    })
  }
  // The `accountId` filter also matches transfers the account sent, which are
  // released under whoever received them.
  return transfers.filter(
    (transfer) =>
      isQuarantined(transfer) && custodiedAccountId(transfer) === accountId,
  )
}

/**
 * Propose a release for a caller-supplied set of quarantined transfers. Backs
 * the public `releaseQuarantinedTransfers` — for manual release or the async
 * submission path, which the inline hook doesn't cover.
 *
 * @param api - The propose surface.
 * @param params - The account and transfer ids to release.
 * @param params.accountId - The Custody account id the transfers are released
 *   under.
 * @param params.transferIds - The transfer ids to release.
 * @returns The generated release intent id, for tracking.
 */
export async function proposeQuarantineRelease(
  api: CustodyApi,
  params: { accountId: string; transferIds: readonly string[] },
): Promise<string> {
  const intentId = uuidV7()
  await api.propose(
    {
      accountId: params.accountId,
      transferIds: Array.from(params.transferIds),
      type: 'v0_ReleaseQuarantinedTransfers',
    },
    { id: intentId },
  )
  return intentId
}
