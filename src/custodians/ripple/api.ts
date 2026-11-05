import type { Transaction } from 'xrpl'

import { AccountNotFoundError, SimpleXRPLError } from '../../errors.js'
import { CUSTODY_ROUTES } from '../../generated/custody-routes.js'
import type { components, operations, paths } from '../../generated/custody.js'

import { fillPath } from './api-call.js'
import type {
  CallArgs,
  OperationArgs,
  OperationResponse,
  ResponseBody,
} from './api-call.js'
import type { IntentSigner } from './auth/intent-signer.js'
import {
  ambiguousAddressMessage,
  findAddressReferences,
} from './discovery/address-lookup.js'
import type {
  CustodyAddressReference,
  CustodyFindByAddressOptions,
} from './discovery/address-lookup.js'
import type {
  CustodyDryRunResponse,
  CustodyDryRunTransactionOptions,
  CustodyIntentOutcome,
  CustodyProposeAndWaitResult,
  CustodyTransactionDryRun,
  CustodyWaitOptions,
} from './intent-types.js'
import { buildDecisionEnvelope } from './mapping/decision-envelope.js'
import type { IntentDecision } from './mapping/decision-envelope.js'
import { buildTransactionOrderPayload } from './mapping/envelope.js'
import {
  buildEnvelopeRequest,
  buildProposeEnvelope,
  type ProposeEnvelopeContext,
  type ProposeEnvelopeOverrides,
} from './mapping/propose-envelope.js'
import { paginate } from './pagination.js'
import type {
  CursorPage,
  CustodyPageItem,
  CustodyPaginatedOperationId,
} from './pagination.js'
import { requireXrplPublicKey } from './submission/account-key.js'
import { postDryRun } from './submission/dry-run.js'
import { waitForIntentOutcome } from './submission/intent-polling.js'
import type { CustodyHttpClient } from './transport/custody-http-client.js'
import { VersionGuard } from './versioning/version-guard.js'

/** Every Custody operationId that has both a route and typed schema. */
export type CustodyOperationId = keyof typeof CUSTODY_ROUTES & keyof operations

/** A governed-intent payload to propose (any `v0_*` variant Custody accepts). */
export type CustodyProposePayload =
  components['schemas']['Core_ProposeUserIntentPayload']
/** Per-call envelope overrides for {@link CustodyApi.propose}. */
export type CustodyProposeOptions = ProposeEnvelopeOverrides

/**
 * What {@link CustodyApi.propose} returns: Custody's acknowledgement plus the
 * `intentId` the proposal was signed under — the handle for reading, awaiting,
 * approving, or rejecting the intent.
 */
export type CustodyProposeResponse =
  components['schemas']['Core_IntentResponse'] & {
    /** The proposed intent's id (the signed envelope's `request.id`). */
    readonly intentId: string
  }

/** The typed arguments for one operation: path params, query, and/or body. */
export type CustodyCallArgs<Op extends CustodyOperationId> = CallArgs<
  operations,
  Op
>

/** The HTTP methods {@link CustodyApi.request} sends. */
export type CustodyHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

/** The operation `path` serves for `method` (`never` if it serves none). */
type PathOperation<
  Path extends keyof paths,
  Method extends CustodyHttpMethod,
> = NonNullable<paths[Path][Lowercase<Method>]>

/** Every Custody path template that serves `Method`. */
export type CustodyRequestPath<Method extends CustodyHttpMethod> = {
  [Path in keyof paths]: [PathOperation<Path, Method>] extends [never]
    ? never
    : Path
}[keyof paths]

/** The typed arguments for one `request`: path params, query, and/or body. */
export type CustodyRequestArgs<
  Method extends CustodyHttpMethod,
  Path extends CustodyRequestPath<Method>,
> = OperationArgs<PathOperation<Path, Method>>

/** The typed response of one `request`. */
export type CustodyRequestResponse<
  Method extends CustodyHttpMethod,
  Path extends CustodyRequestPath<Method>,
> = OperationResponse<PathOperation<Path, Method>>

/** How long {@link CustodyApi.waitForIntent} waits, unless configured. */
const DEFAULT_WAIT_TIMEOUT_MS = 60_000

/** Custody's limit on an approval or rejection reason. */
const MAX_REASON_LENGTH = 5000
/**
 * Low-level, typed access to the full Ripple Custody v1 API — a **secondary**
 * surface beside the first-class verticals, for endpoints simpleXRPL doesn't
 * model (domains, policies, backups, reading intents/transfers, and so on).
 *
 * `call(operationId, args)` resolves the route from the generated route map and
 * infers the path/query/body and response types from the generated `operations`
 * schema, so every endpoint is typed without a hand-written method per resource.
 *
 * Custody uses a single credential for every endpoint, so all calls go through
 * the one authenticated client — there is no per-scope routing.
 *
 * Two surfaces: {@link call} is a plain HTTP passthrough for reads and
 * plain-body writes; {@link propose} is the signed-intent passthrough for
 * governed writes — it builds and signs the `Core_Propose` envelope with the
 * intent-author key, so callers reach any governed intent (e.g. releasing
 * quarantined transfers) without a dedicated vertical.
 */
export class CustodyApi {
  private readonly client: CustodyHttpClient
  private readonly intentSigner: IntentSigner
  private readonly proposeContext: ProposeEnvelopeContext
  private readonly versionGuard: VersionGuard
  private readonly defaultTimeoutMs: number

  /**
   * Construct the API surface over the authenticated client.
   *
   * @param client - The authenticated Custody HTTP client.
   * @param propose - The signer and domain/author context {@link propose} needs
   *   to build and sign intent envelopes.
   * @param propose.intentSigner - Signs the canonicalized intent request.
   * @param propose.domainId - The Custody domain intents are proposed under.
   * @param propose.authorUserId - The intent-author's Custody user id.
   * @param propose.versionGuard - Blocks calls the instance's version can't
   *   serve; omitted, nothing is blocked.
   * @param propose.defaultTimeoutMs - How long {@link waitForIntent} waits by
   *   default; 60 s when omitted.
   */
  public constructor(
    client: CustodyHttpClient,
    propose: ProposeEnvelopeContext & {
      intentSigner: IntentSigner
      versionGuard?: VersionGuard
      defaultTimeoutMs?: number
    },
  ) {
    this.client = client
    this.intentSigner = propose.intentSigner
    this.proposeContext = {
      domainId: propose.domainId,
      authorUserId: propose.authorUserId,
    }
    this.versionGuard = propose.versionGuard ?? new VersionGuard(undefined)
    this.defaultTimeoutMs = propose.defaultTimeoutMs ?? DEFAULT_WAIT_TIMEOUT_MS
  }

  /**
   * Call any Custody operation by its operationId. Path/query/body and the
   * response are typed from the generated schema.
   *
   * @param operationId - The Custody operationId (autocompletes to all routes).
   * @param args - Typed path params, query params, and/or JSON body.
   * @returns The typed response body.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't serve the endpoint.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing.
   * @throws A `CustodyApiError` if the API rejects the request (e.g. 403/404).
   */
  public async call<Op extends CustodyOperationId>(
    operationId: Op,
    args?: CustodyCallArgs<Op>,
  ): Promise<ResponseBody<operations, Op>> {
    const route = CUSTODY_ROUTES[operationId]
    this.versionGuard.assertEndpoint(
      route.method,
      route.path,
      `api.call('${operationId}')`,
    )
    const path = fillPath(route.path, args?.path)
    return this.client.invoke<ResponseBody<operations, Op>>(
      route.method,
      path,
      {
        query: args?.query,
        body: args?.body,
      },
    )
  }

  /**
   * Call any Custody endpoint by its HTTP method and path template — including
   * the ones with no operationId, which {@link call} can't name (e.g. user
   * invitations). Path/query/body and the response are typed from the
   * generated schema, and only methods a path actually serves are accepted.
   *
   * @param method - The HTTP method.
   * @param path - The path template, e.g. `/v1/domains/{domainId}/users/invitations`.
   * @param args - Typed path params, query params, and/or JSON body.
   * @returns The typed response body.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't serve the endpoint.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing.
   * @throws A `CustodyApiError` if the API rejects the request.
   */
  public async request<
    Method extends CustodyHttpMethod,
    Path extends CustodyRequestPath<Method>,
  >(
    method: Method,
    path: Path,
    args?: CustodyRequestArgs<Method, Path>,
  ): Promise<CustodyRequestResponse<Method, Path>> {
    this.versionGuard.assertEndpoint(
      method,
      path,
      `api.request('${method}', '${path}')`,
    )
    return this.client.invoke<CustodyRequestResponse<Method, Path>>(
      method,
      fillPath(path, args?.path),
      { query: args?.query, body: args?.body },
    )
  }

  /**
   * Walk every page of a paginated Custody list, yielding each item. List
   * endpoints return one page plus a `nextStartingAfter` cursor, so reading
   * (or filtering) a single page can miss records; this follows the cursor to
   * the end. Pages are fetched lazily, so breaking out of the loop stops the
   * requests.
   *
   * ```ts
   * for await (const account of custody.api.paginate('getAccounts', {
   *   path: { domainId },
   *   query: { limit: 100 },
   * })) {
   *   // every account in the domain
   * }
   * ```
   *
   * @param operationId - A Custody operationId whose response is paginated.
   * @param args - Typed path params, query params, and/or JSON body, as for
   *   {@link call}. `query.startingAfter`, if set, resumes after that cursor;
   *   `query.limit` sets the page size.
   * @returns The items, across all pages.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't serve the endpoint.
   * @throws {@link SimpleXRPLError} if a required path parameter is missing,
   *   or the cursor stops advancing.
   * @throws A `CustodyApiError` if the API rejects a page request.
   */
  public paginate<Op extends CustodyPaginatedOperationId>(
    operationId: Op,
    args?: CustodyCallArgs<Op>,
  ): AsyncGenerator<CustodyPageItem<Op>, void, undefined> {
    const route = CUSTODY_ROUTES[operationId]
    this.versionGuard.assertEndpoint(
      route.method,
      route.path,
      `api.paginate('${operationId}')`,
    )
    const path = fillPath(route.path, args?.path)
    const query: Readonly<Record<string, unknown>> = { ...args?.query }
    const { startingAfter } = query
    return paginate(
      async (cursor) =>
        this.client.invoke<CursorPage<CustodyPageItem<Op>>>(
          route.method,
          path,
          { query: { ...query, startingAfter: cursor }, body: args?.body },
        ),
      typeof startingAfter === 'string' ? startingAfter : undefined,
    )
  }

  /**
   * Find the Custody account that holds an address — e.g. an XRPL r-address —
   * across every domain the API user can see, for the `domainId` and
   * `accountId` other calls take. Built on `GET /v1/addresses`; every page is
   * read, and only account addresses equal to `address` count.
   *
   * @param address - The address to look up.
   * @param options - Narrow the match when the address is on several ledgers
   *   or in several domains.
   * @param options.ledgerId - Only match on this ledger.
   * @param options.domainId - Only match in this domain.
   * @returns The account address (with its `domainId`, `accountId`, and
   *   `ledgerId`), or `undefined` if no account holds it.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't serve the endpoint.
   * @throws {@link SimpleXRPLError} if more than one account matches; pass
   *   `ledgerId` and/or `domainId` to pick one.
   */
  public async findByAddress(
    address: string,
    options: CustodyFindByAddressOptions = {},
  ): Promise<CustodyAddressReference | undefined> {
    const route = CUSTODY_ROUTES.getAllDomainsAddresses
    this.versionGuard.assertEndpoint(
      route.method,
      route.path,
      'api.findByAddress',
    )
    const matches = (await findAddressReferences(this.client, address)).filter(
      (reference) =>
        (options.ledgerId === undefined ||
          reference.ledgerId === options.ledgerId) &&
        (options.domainId === undefined ||
          reference.domainId === options.domainId),
    )
    if (matches.length > 1) {
      throw new SimpleXRPLError(ambiguousAddressMessage(address, matches))
    }
    return matches[0]
  }

  /**
   * Read the XRPL public key of the Custody account that holds an address, in
   * the form XRPL uses (`SigningPubKey`): compressed secp256k1, uppercase hex.
   * Useful wherever the key itself is needed, e.g. to set up a regular key or a
   * multisig signer list.
   *
   * @param address - The account's XRPL address.
   * @param options - Narrow the lookup when the address is on several ledgers
   *   or in several domains, as for {@link findByAddress}.
   * @param options.ledgerId - Only match on this ledger.
   * @param options.domainId - Only match in this domain.
   * @returns The public key, e.g. `02218AB4…`.
   * @throws {@link AccountNotFoundError} if no Custody account holds the address.
   * @throws {@link SimpleXRPLError} if more than one account matches, or the
   *   account has no XRPL key on file yet (e.g. still provisioning).
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version can't look the account up.
   */
  public async getPublicKey(
    address: string,
    options: CustodyFindByAddressOptions = {},
  ): Promise<string> {
    const reference = await this.findByAddress(address, options)
    if (reference === undefined) {
      throw new AccountNotFoundError(address)
    }
    const route = CUSTODY_ROUTES.getAccount
    this.versionGuard.assertEndpoint(
      route.method,
      route.path,
      'api.getPublicKey',
    )
    return requireXrplPublicKey(
      this.client,
      reference.domainId,
      reference.accountId,
    )
  }

  /**
   * Approve an existing intent as the API user — e.g. as an automated approver
   * under the intent's policy. Fetches the intent, then signs and posts the
   * approval with the intent-author key.
   *
   * @param intentId - The intent to approve.
   * @param options - Options.
   * @param options.reason - Why it is approved (up to 5000 characters).
   * @returns The Custody `{ requestId }` acknowledging the approval.
   * @throws {@link SimpleXRPLError} if the reason is too long.
   * @throws A `CustodyApiError` if the intent doesn't exist, or Custody
   *   rejects the approval (e.g. the user isn't an approver for it).
   */
  public async approve(
    intentId: string,
    options: { readonly reason?: string } = {},
  ): Promise<components['schemas']['Core_IntentResponse']> {
    return this.decide(intentId, 'Approve', options.reason)
  }

  /**
   * Reject an existing intent as the API user. Fetches the intent, then signs
   * and posts the rejection with the intent-author key.
   *
   * @param intentId - The intent to reject.
   * @param options - Options.
   * @param options.reason - Why it is rejected (1–5000 characters; required).
   * @returns The Custody `{ requestId }` acknowledging the rejection.
   * @throws {@link SimpleXRPLError} if the reason is empty or too long.
   * @throws A `CustodyApiError` if the intent doesn't exist, or Custody
   *   rejects the rejection (e.g. the user can't decide on it).
   */
  public async reject(
    intentId: string,
    options: { readonly reason: string },
  ): Promise<components['schemas']['Core_IntentResponse']> {
    return this.decide(intentId, 'Reject', options.reason)
  }

  /**
   * Propose a governed intent: wrap `payload` in a `Core_Propose` envelope,
   * sign the canonicalized request with the intent-author key, and POST it to
   * `/v1/intents`. This is the signed counterpart to {@link call} — for
   * governed writes simpleXRPL has no vertical for (e.g. releasing quarantined
   * transfers). The intent still runs the account's approval policy; this only
   * proposes it.
   *
   * @param payload - The governed-intent payload (any `v0_*` variant).
   * @param options - Optional envelope overrides (idempotency id, expiry,
   *   custom properties, and so on).
   * @returns The Custody `{ requestId }` acknowledging the accepted intent,
   *   plus `intentId` — the id the proposal was signed under (`options.id`,
   *   the payload's own id, or a fresh one), which Custody's response does not
   *   echo back. Poll, await, approve, or reject the intent with it.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't accept the intent type, or the XRPL operation a
   *   transaction order carries.
   * @throws {@link CustodyAuthError} if the request cannot be canonicalized.
   * @throws A `CustodyApiError` if the API rejects the intent.
   */
  public async propose(
    payload: CustodyProposePayload,
    options?: CustodyProposeOptions,
  ): Promise<CustodyProposeResponse> {
    this.assertPayload(payload, 'api.propose')
    const body = await buildProposeEnvelope(this.intentSigner, {
      ...this.proposeContext,
      payload,
      overrides: options,
    })
    const route = CUSTODY_ROUTES.createIntent
    const response = await this.client.invoke<
      components['schemas']['Core_IntentResponse']
    >(route.method, route.path, { body })
    return { ...response, intentId: body.request.id }
  }

  /**
   * Wait for an intent to finish, and report how it ended — without throwing
   * when it is rejected, expires, or fails, or when the wait runs out of time.
   * Read `isSuccess` / `isTerminal`; `reason` explains any other outcome in one
   * sentence. (`client.intent.await` is the throwing counterpart.)
   *
   * An intent still `Open` when the wait ends is most likely waiting for a
   * human approval: no polling budget fits that, so keep the `intentId` and
   * check back later rather than raising `timeoutMs` indefinitely.
   *
   * @param intentId - The intent to wait on.
   * @param options - The budget, the intent's domain, and a per-read callback.
   * @returns How the intent ended, or where it stood when the wait ran out.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version can't read intents.
   * @throws A `CustodyApiError` if reading the intent fails other than with a
   *   404 (a just-proposed intent 404s briefly; that is retried).
   */
  public async waitForIntent(
    intentId: string,
    options: CustodyWaitOptions = {},
  ): Promise<CustodyIntentOutcome> {
    const domainId = options.domainId ?? this.proposeContext.domainId
    return waitForIntentOutcome({
      readIntent: async () =>
        this.call('getIntent', { path: { domainId, intentId } }),
      intentId,
      timeoutMs: options.timeoutMs ?? this.defaultTimeoutMs,
      onStatusCheck: options.onStatusCheck,
    })
  }

  /**
   * Propose a governed intent, then wait for it to finish — {@link propose}
   * followed by {@link waitForIntent}. Best suited to auto-approved policies,
   * development, and tests; where a person approves, prefer {@link propose}
   * and check back on the `intentId` later.
   *
   * @param payload - The governed-intent payload (any `v0_*` variant).
   * @param options - Envelope overrides, plus the wait's budget and callback.
   * @returns How the intent ended (as {@link waitForIntent} reports it), plus
   *   Custody's `requestId`.
   * @throws Whatever {@link propose} throws; the wait itself only reports.
   */
  public async proposeAndWait(
    payload: CustodyProposePayload,
    options: CustodyProposeOptions & CustodyWaitOptions = {},
  ): Promise<CustodyProposeAndWaitResult> {
    const { timeoutMs, onStatusCheck, domainId, ...overrides } = options
    const { requestId, intentId } = await this.propose(payload, overrides)
    const outcome = await this.waitForIntent(intentId, {
      timeoutMs,
      onStatusCheck,
      domainId: domainId ?? overrides.targetDomainId,
    })
    return { ...outcome, requestId }
  }

  /**
   * Dry-run a governed intent: Custody runs its schema, policy, and fee or
   * balance checks on exactly the envelope {@link propose} would send, without
   * creating an intent. The verdict is returned, not thrown — read `success`
   * and `errors`, and for a transaction order the `result` and fee `estimate`.
   *
   * @param payload - The governed-intent payload (any `v0_*` variant).
   * @param options - Envelope overrides, as for {@link propose}.
   * @returns Custody's dry-run response, typed for the payload's intent type.
   * @throws {@link UnsupportedInVersionError} if the instance's Custody
   *   version doesn't accept the intent type or the dry-run endpoint.
   * @throws A `CustodyApiError` if Custody can't process the request at all.
   */
  public async dryRun<Payload extends CustodyProposePayload>(
    payload: Payload,
    options?: CustodyProposeOptions,
  ): Promise<CustodyDryRunResponse<Payload['type']>> {
    this.assertPayload(payload, 'api.dryRun')
    const route = CUSTODY_ROUTES.intentDryRun
    this.versionGuard.assertEndpoint(route.method, route.path, 'api.dryRun')
    const response = await postDryRun(
      this.client,
      buildEnvelopeRequest({
        ...this.proposeContext,
        payload,
        overrides: options,
      }),
    )
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Custody answers with the payload type
    return response as CustodyDryRunResponse<Payload['type']>
  }

  /**
   * Dry-run an XRPL transaction as the native intent a submission would
   * propose: the sending account is found from `transaction.Account`, the
   * transaction is mapped to Custody's operation, and Custody's verdict and fee
   * estimate are returned without creating anything.
   *
   * @param transaction - The XRPL transaction (`Account` must be a Custody
   *   account in this domain).
   * @param options - The sending account's ledger, if ambiguous, and a fee
   *   override.
   * @returns Custody's dry-run: `success`, `errors`, `result`, and `estimate`.
   * @throws {@link AccountNotFoundError} if no Custody account in the domain
   *   holds `transaction.Account`.
   * @throws {@link SignerCapabilityError} if the transactor has no native
   *   Custody operation.
   * @throws {@link SimpleXRPLError} if the account holds the address on several
   *   ledgers and no `ledgerId` is given.
   */
  public async dryRunTransaction(
    transaction: Transaction,
    options: CustodyDryRunTransactionOptions = {},
  ): Promise<CustodyTransactionDryRun> {
    this.versionGuard.assertNativeTransaction(transaction.TransactionType)
    const reference = await this.findByAddress(transaction.Account, {
      ledgerId: options.ledgerId,
      domainId: this.proposeContext.domainId,
    })
    if (reference === undefined) {
      throw new AccountNotFoundError(transaction.Account)
    }
    const { payload } = buildTransactionOrderPayload({
      accountId: reference.accountId,
      ledgerId: reference.ledgerId,
      transaction,
      fee: options.fee,
    })
    return this.dryRun(payload)
  }

  /**
   * Check the instance's Custody version accepts a payload: its intent type
   * and, for an XRPL transaction order, its operation.
   *
   * @param payload - The intent payload.
   * @param sdkMethod - The SDK call, for the error.
   * @throws {@link UnsupportedInVersionError} if either isn't supported.
   */
  private assertPayload(
    payload: CustodyProposePayload,
    sdkMethod: string,
  ): void {
    this.versionGuard.assertIntentType(payload.type, sdkMethod)
    if (
      payload.type === 'v0_CreateTransactionOrder' &&
      payload.parameters.type === 'XRPL' &&
      payload.parameters.operation !== undefined
    ) {
      this.versionGuard.assertXrplOperation(
        payload.parameters.operation.type,
        sdkMethod,
      )
    }
  }

  /**
   * Shared by {@link approve} and {@link reject}: validate the reason, fetch
   * the intent for its proposal signature, then sign and post the decision.
   *
   * @param intentId - The intent to decide on.
   * @param decision - Approve or reject.
   * @param reason - The reason, if any.
   * @returns The Custody `{ requestId }` acknowledging the decision.
   * @throws {@link SimpleXRPLError} if the reason is invalid.
   */
  private async decide(
    intentId: string,
    decision: IntentDecision,
    reason: string | undefined,
  ): Promise<components['schemas']['Core_IntentResponse']> {
    const sdkMethod = decision === 'Approve' ? 'api.approve' : 'api.reject'
    if (decision === 'Reject' && (reason === undefined || reason === '')) {
      throw new SimpleXRPLError(`${sdkMethod} needs a reason`)
    }
    if (reason !== undefined && reason.length > MAX_REASON_LENGTH) {
      throw new SimpleXRPLError(
        `${sdkMethod} reason is ${reason.length} characters; Custody allows up to ${MAX_REASON_LENGTH}`,
      )
    }
    const route =
      decision === 'Approve'
        ? CUSTODY_ROUTES.approveIntent
        : CUSTODY_ROUTES.rejectIntent
    this.versionGuard.assertEndpoint(route.method, route.path, sdkMethod)
    const intent = await this.call('getIntent', {
      path: { domainId: this.proposeContext.domainId, intentId },
    })
    const body = await buildDecisionEnvelope(this.intentSigner, {
      ...this.proposeContext,
      intent,
      decision,
      reason,
    })
    return this.client.invoke<components['schemas']['Core_IntentResponse']>(
      route.method,
      route.path,
      { body },
    )
  }
}
