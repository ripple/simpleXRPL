import type { Transaction } from 'xrpl'

import type {
  SignedEnvelope,
  SubmissionContext,
  TransactorType,
} from '../../../domain/index.js'
import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { RippleCustodyState } from '../construction.js'
import { buildCustomProperties } from '../mapping/custom-properties.js'
import { buildSignManifestIntentBody } from '../mapping/manifest-envelope.js'
import { NATIVE_XRPL_TRANSACTORS } from '../mapping/xrpl-operations.js'

import { resolveSigningPublicKey } from './account-key.js'
import { pollIntentUntilExecuted } from './intent-polling.js'
import { assembleSignedTransaction, buildSigningPreimage } from './raw-sign.js'

/** Runs the custodian's dry-run pre-flight for an intent payload, if enabled. */
interface DryRunStep {
  (
    payload: components['schemas']['Core_IntentDryRunRequest']['payload'],
    customProperties: components['schemas']['Core_StringsMap'],
  ): Promise<void>
}

/** Inputs for {@link signRawTransaction} (and its envelope-building step). */
export interface SignRawOptions {
  /** The custodian's construction state. */
  readonly state: RippleCustodyState
  /** The fully autofilled transaction to sign. */
  readonly tx: Transaction
  /** The submission context. */
  readonly ctx: SubmissionContext
  /** The Custody account UUID that owns `tx`. */
  readonly accountId: string
  /** The custodian's dry-run pre-flight step. */
  readonly maybeDryRun: DryRunStep
}

/**
 * Guard the raw-signing path: it only applies to non-native transactors, and
 * only when explicitly enabled.
 *
 * @param state - The custodian's construction state.
 * @param transactor - The transactor being signed.
 * @throws {@link SignerCapabilityError} if `transactor` is native, or raw
 * signing is disabled.
 */
export function assertRawEligible(
  state: RippleCustodyState,
  transactor: TransactorType,
): void {
  if (NATIVE_XRPL_TRANSACTORS.has(transactor)) {
    throw new SignerCapabilityError(
      `RippleCustody signs ${transactor} through its governed native path; there is no standalone signed envelope to produce. Call submitAndWait instead of sign.`,
    )
  }
  if (!state.allowRawSigning) {
    throw new SignerCapabilityError(
      `RippleCustody cannot sign ${transactor}: it has no native operation for it and allowRawSigning is disabled. Either route this account's ${transactor} through a signer that models it natively, or enable allowRawSigning — which lets Custody sign an opaque payload its transfer policies and approval rules cannot inspect.`,
    )
  }
}

/**
 * Resolve the account's public key and build the signed `v0_SignManifest`
 * envelope for its preimage.
 *
 * @param options - The state, transaction, context, and account id.
 * @returns The `SigningPubKey`-stamped transaction and the signed envelope.
 */
async function buildManifestEnvelope(options: SignRawOptions): Promise<{
  preparedTx: Transaction
  body: ReturnType<typeof buildSignManifestIntentBody>
}> {
  const { state, tx, ctx, accountId } = options
  const publicKeyBase64 = await resolveSigningPublicKey(
    state.client,
    state.domainId,
    accountId,
  )
  const { preparedTx, preimageBase64 } = buildSigningPreimage(
    tx,
    publicKeyBase64,
  )
  const body = buildSignManifestIntentBody(
    state.intentSigner,
    buildCustomProperties(tx),
    {
      domainId: state.domainId,
      authorUserId: state.authorUserId,
      accountId,
      ledgerId: ctx.account.ledgerId,
      preimageBase64,
      idempotencyKey: ctx.idempotencyKey,
    },
  )
  return { preparedTx, body }
}

/**
 * Fetch an executed manifest's raw signature.
 *
 * @param state - The custodian's construction state.
 * @param accountId - The Custody account UUID that signed it.
 * @param manifestId - The manifest id (the envelope's own id).
 * @returns The signature, base64-encoded.
 * @throws {@link SignerCapabilityError} if Custody returned no raw signature.
 */
async function fetchManifestSignature(
  state: RippleCustodyState,
  accountId: string,
  manifestId: string,
): Promise<string> {
  const manifest = await state.client.get<
    components['schemas']['Core_ApiManifest']
  >(
    `/v1/domains/${state.domainId}/accounts/${accountId}/manifests/${manifestId}`,
  )
  const { value } = manifest.data
  if (value?.type !== 'Unsafe') {
    throw new SignerCapabilityError(
      `RippleCustody did not return a raw signature for manifest '${manifestId}'.`,
    )
  }
  return value.signature
}

/**
 * Run the raw-signing path (RippleRaw): resolve the account's public
 * key, build and sign the preimage, submit the `v0_SignManifest` intent, poll
 * it to completion, then reassemble the fully signed transaction.
 *
 * @param options - The state, transaction, context, account id, and dry-run step.
 * @returns The signed transaction blob and hash.
 * @throws {@link SignerCapabilityError} if `tx`'s transactor is native, or raw
 * signing is disabled.
 */
export async function signRawTransaction(
  options: SignRawOptions,
): Promise<SignedEnvelope> {
  const { state, tx, ctx, accountId, maybeDryRun } = options
  assertRawEligible(state, tx.TransactionType)
  const { preparedTx, body } = await buildManifestEnvelope(options)
  await maybeDryRun(body.request.payload, body.request.customProperties)
  await state.client.post('/v1/intents', body)

  const manifestId = body.request.id
  await pollIntentUntilExecuted({
    client: state.client,
    domainId: state.domainId,
    intentId: manifestId,
    timeoutMs: ctx.timeoutMs ?? state.defaultTimeoutMs,
  })
  const signatureBase64 = await fetchManifestSignature(
    state,
    accountId,
    manifestId,
  )
  return assembleSignedTransaction(preparedTx, signatureBase64)
}
