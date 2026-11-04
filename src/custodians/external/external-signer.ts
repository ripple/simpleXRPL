import { deriveAddress } from 'xrpl'
import type { Transaction } from 'xrpl'

import type {
  Account,
  AccountRef,
  Custodian,
  CustodianKind,
  SignedEnvelope,
  SignerCapabilities,
  SubmissionContext,
  SubmissionHandle,
  SubmissionResult,
} from '../../domain/index.js'
import { SimpleXRPLError, XrpldSubmitError } from '../../errors.js'
import { assertDryRunHonored, assertFeeHonored } from '../context-guards.js'
import { engineResultOf } from '../on-ledger-result.js'

import { isTransactionSignerPort } from './external-signer-port.js'
import type {
  ExternalSignerPort,
  TransactionSignerPort,
} from './external-signer-port.js'
import { signTransactionExternally, signWholeTransaction } from './signing.js'

/** Options for {@link ExternalSigner.create}. */
export interface ExternalSignerOptions {
  /**
   * The signer for one key: a digest signer ({@link ExternalSignerPort}, for a
   * KMS or HSM) or a whole-transaction signer ({@link TransactionSignerPort},
   * for a hardware wallet or browser-wallet relay).
   */
  readonly signer: ExternalSignerPort | TransactionSignerPort

  /**
   * The r-address to act as. Defaults to the address derived from the signer's
   * public key (i.e. the key is the account's master key). Provide it when the
   * key is a regular key for a different account, or when a
   * {@link TransactionSignerPort} has no `publicKey()`.
   */
  readonly address?: string
}

/**
 * A signing backend whose key lives outside the process — in a KMS, an HSM or a
 * hardware wallet. Like {@link LocalSigner} it is a local-family signer — it
 * builds and signs a transaction, then submits it through the shared ledger —
 * except the private key never enters the process. With a digest port the SDK
 * hands over the signing digest and assembles the result; with a
 * whole-transaction port it hands over the full transaction and verifies the
 * signed blob that comes back. Signs any transactor via the raw path; no native
 * operations.
 */
export class ExternalSigner implements Custodian {
  /** This custodian signs with an external key (KMS/HSM). */
  public readonly kind: CustodianKind = 'external'

  private readonly signer: ExternalSignerPort | TransactionSignerPort
  /** Undefined until a whole-transaction signer reveals it; then pinned. */
  private publicKeyHex: string | undefined
  private readonly address: string

  private constructor(
    signer: ExternalSignerPort | TransactionSignerPort,
    publicKeyHex: string | undefined,
    address: string,
  ) {
    this.signer = signer
    this.publicKeyHex = publicKeyHex
    this.address = address
  }

  /**
   * The primary (and only) account this signer owns.
   *
   * @returns The primary account reference.
   */
  public get primary(): AccountRef {
    return { address: this.address }
  }

  /**
   * Build an external signer: fetch the public key and resolve the account.
   *
   * @param options - The external signer and optional account override.
   * @returns A ready signer.
   * @throws {@link SimpleXRPLError} if neither the signer's public key nor an
   *   address is available.
   */
  public static async create(
    options: ExternalSignerOptions,
  ): Promise<ExternalSigner> {
    const { signer } = options
    const publicKeyHex =
      signer.publicKey === undefined ? undefined : await signer.publicKey()
    const address =
      options.address ??
      (publicKeyHex === undefined ? undefined : deriveAddress(publicKeyHex))
    if (address === undefined) {
      throw new SimpleXRPLError(
        'ExternalSigner needs an address when the signer has no publicKey().',
      )
    }
    return new ExternalSigner(signer, publicKeyHex, address)
  }

  /**
   * External keys sign every transactor via the raw path; nothing is a native
   * operation.
   *
   * @returns Capabilities allowing any transactor via raw signing.
   */
  // eslint-disable-next-line class-methods-use-this -- Implements the stateless Custodian.capabilities contract.
  public capabilities(): SignerCapabilities {
    return { nativeOps: new Set(), allowRaw: true }
  }

  /**
   * List the single account this signer holds.
   *
   * @returns The one account, keyed by r-address.
   */
  public async listAccounts(): Promise<Account[]> {
    return [{ address: this.address, signer: this }]
  }

  /**
   * Sign a transaction with the external key.
   *
   * @param tx - The autofilled transaction to sign.
   * @param ctx - The submission context; only its dry-run and fee controls are
   * read, since this signer owns one key.
   * @returns The signed envelope (blob + hash).
   * @throws {@link SignerCapabilityError} if the context asks for a dry-run or
   *   carries a fee intent.
   * @throws {@link SignedTransactionMismatchError} if a whole-transaction signer
   *   returns a blob that is not the requested transaction, validly signed.
   */
  public async sign(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SignedEnvelope> {
    assertDryRunHonored(
      ctx,
      'ExternalSigner',
      'Drop dryRun, or route the pre-flight through a RippleCustody account.',
    )
    // The transaction reaching sign() is already autofilled by the pipeline, so
    // a fee intent here would be silently overwritten — reject it rather than
    // drop a financial control. (Honoring it belongs upstream, at autofill.)
    assertFeeHonored(
      ctx,
      'ExternalSigner',
      'Drop fee and let autofill price the transaction, or route it through a RippleCustody account.',
    )
    if (isTransactionSignerPort(this.signer)) {
      const signed = await signWholeTransaction(
        tx,
        this.publicKeyHex,
        this.signer,
      )
      this.publicKeyHex ??= signed.publicKeyHex
      return signed.envelope
    }
    // A digest port always has a key: create() read it up front.
    if (this.publicKeyHex === undefined) {
      throw new SimpleXRPLError('ExternalSigner has no public key.')
    }
    return signTransactionExternally(tx, this.publicKeyHex, this.signer)
  }

  /**
   * Sign the transaction with the external key, submit it through the shared
   * ledger, and wait for a terminal result.
   *
   * @param tx - The autofilled transaction to submit.
   * @param ctx - The submission context (source account + shared ledger).
   * @returns The xrpld-sourced submission result.
   * @throws {@link XrpldSubmitError} on a non-`tesSUCCESS` engine result.
   */
  public async submitAndWait(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionResult> {
    const envelope = await this.sign(tx, ctx)
    const response = await ctx.ledger.submitAndWait(envelope.txBlob)
    const engineResult = engineResultOf(response)
    if (engineResult !== undefined && engineResult !== 'tesSUCCESS') {
      throw new XrpldSubmitError(engineResult, response)
    }
    return {
      source: 'xrpld',
      response,
      intent: undefined,
      txHash: response.result.hash,
    }
  }

  /**
   * Submit asynchronously. Like Local, an external-signed transaction reaches
   * its terminal state as soon as `submitAndWait` returns, so the handle is
   * pre-resolved and its `id` is the XRPL transaction hash. No `cancel` — a
   * submitted transaction cannot be recalled.
   *
   * @param tx - The autofilled transaction to submit.
   * @param ctx - The submission context (source account + shared ledger).
   * @returns A pre-resolved handle over the submitted transaction.
   * @throws {@link XrpldSubmitError} if the transaction fails on-ledger.
   */
  public async submitAsync(
    tx: Transaction,
    ctx: SubmissionContext,
  ): Promise<SubmissionHandle> {
    const result = await this.submitAndWait(tx, ctx)
    return {
      kind: this.kind,
      id: result.txHash ?? '',
      custodian: this,
      poll: async (): Promise<SubmissionResult> => result,
      wait: async (): Promise<SubmissionResult> => result,
    }
  }
}
