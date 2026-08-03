import { decodeMPTokenMetadata } from 'xrpl'
import type { MPTokenMetadata } from 'xrpl'

import type { SubmissionHost } from '../pipeline/index.js'
import { ledgerEntryNode, readAccountAddress } from '../reads/read-helpers.js'

import type {
  MptFlags,
  TokenData,
  TokenListParams,
  TokenListResult,
  TokenRetrieveParams,
  TokenRetrieveResult,
} from './token.types.js'

/** `lsf*` flag bits on an `MPTokenIssuance` (they match the `tf*` create bits). */
const LSF_CAN_LOCK = 0x0002
const LSF_REQUIRE_AUTH = 0x0004
const LSF_CAN_ESCROW = 0x0008
const LSF_CAN_TRADE = 0x0010
const LSF_CAN_TRANSFER = 0x0020
const LSF_CAN_CLAWBACK = 0x0040
/** TransferFee is stored in units of 1/1000 of a percent. */
const FEE_UNITS_PER_PERCENT = 1000

/** The `MPTokenIssuance` fields this read shapes. */
interface TokenNode {
  readonly Issuer: string
  readonly Flags: number
  readonly AssetScale?: number
  readonly MaximumAmount?: string
  readonly OutstandingAmount: string
  readonly TransferFee?: number
  readonly MPTokenMetadata?: string
  /** Present on `account_objects` results; identifies the issuance. */
  readonly mpt_issuance_id?: string
  readonly index?: string
}

/** An `MPToken` (holder record) as returned by `account_objects`. */
interface HeldTokenNode {
  readonly MPTokenIssuanceID: string
  readonly MPTAmount?: string
}

/**
 * Whether a flag bit is set.
 *
 * @param flags - The raw `Flags` bitmask.
 * @param bit - The bit to test.
 * @returns `true` if set.
 */
function hasFlag(flags: number, bit: number): boolean {
  // eslint-disable-next-line no-bitwise -- test a ledger flag bit.
  return (flags & bit) !== 0
}

/**
 * Decode an issuance's flag bitmask into named booleans.
 *
 * @param flags - The raw `Flags` bitmask.
 * @returns The capability flags.
 */
function decodeFlags(flags: number): MptFlags {
  return {
    canLock: hasFlag(flags, LSF_CAN_LOCK),
    requireAuth: hasFlag(flags, LSF_REQUIRE_AUTH),
    canEscrow: hasFlag(flags, LSF_CAN_ESCROW),
    canTrade: hasFlag(flags, LSF_CAN_TRADE),
    canTransfer: hasFlag(flags, LSF_CAN_TRANSFER),
    canClawback: hasFlag(flags, LSF_CAN_CLAWBACK),
  }
}

/**
 * Decode XLS-89 metadata, returning `undefined` when it is absent or malformed.
 *
 * @param hex - The hex-encoded `MPTokenMetadata`, if present.
 * @returns The decoded metadata, or `undefined`.
 */
function decodeMetadata(hex?: string): MPTokenMetadata | undefined {
  if (hex === undefined) {
    return undefined
  }
  try {
    return decodeMPTokenMetadata(hex)
  } catch {
    return undefined
  }
}

/**
 * Shape a raw `MPTokenIssuance` node into {@link TokenData}.
 *
 * @param node - The raw issuance node.
 * @param tokenID - The MPT issuance id.
 * @returns The shaped issuance.
 */
function shapeIssuance(node: TokenNode, tokenID: string): TokenData {
  return {
    tokenID,
    issuer: node.Issuer,
    assetScale: node.AssetScale ?? 0,
    maximumAmount: node.MaximumAmount,
    outstandingAmount: node.OutstandingAmount,
    transferFee: (node.TransferFee ?? 0) / FEE_UNITS_PER_PERCENT,
    flags: decodeFlags(node.Flags),
    metadata: decodeMetadata(node.MPTokenMetadata),
  }
}

/**
 * Retrieve a single MPT issuance by id (point-in-time). No signer required.
 *
 * @param host - The client the read runs against.
 * @param params - The MPT issuance id to fetch.
 * @returns The issuance id and its snapshot (or `undefined` if absent).
 */
export async function retrieveToken(
  host: SubmissionHost,
  params: TokenRetrieveParams,
): Promise<TokenRetrieveResult> {
  const node = await ledgerEntryNode<TokenNode>(host, {
    mpt_issuance: params.mptIssuanceId,
  })
  return {
    tokenID: params.mptIssuanceId,
    data:
      node === undefined
        ? undefined
        : shapeIssuance(node, params.mptIssuanceId),
  }
}

/**
 * List the MPTs an account issued (`role: 'issuer'`, full issuances) or holds
 * (`role: 'holder'` — default — balance records). No signer required.
 *
 * @param host - The client the read runs against.
 * @param params - The role and account (default: the primary signer's account).
 * @returns The token ids and shaped entries, index-aligned.
 */
export async function listTokens(
  host: SubmissionHost,
  params?: TokenListParams,
): Promise<TokenListResult> {
  const account = readAccountAddress(host, params?.account)
  if ((params?.role ?? 'holder') === 'issuer') {
    const response = await host.ledger.request<{
      result: { account_objects: readonly TokenNode[] }
    }>({
      command: 'account_objects',
      account,
      type: 'mpt_issuance',
      ledger_index: 'validated',
    })
    const data = response.result.account_objects.map((node) => {
      const tokenID = node.mpt_issuance_id ?? node.index ?? ''
      return { tokenID, issuance: shapeIssuance(node, tokenID) }
    })
    return { tokens: data.map((entry) => entry.tokenID), data }
  }
  const response = await host.ledger.request<{
    result: { account_objects: readonly HeldTokenNode[] }
  }>({
    command: 'account_objects',
    account,
    type: 'mptoken',
    ledger_index: 'validated',
  })
  const data = response.result.account_objects.map((node) => ({
    tokenID: node.MPTokenIssuanceID,
    balance: node.MPTAmount ?? '0',
  }))
  return { tokens: data.map((entry) => entry.tokenID), data }
}
