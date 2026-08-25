import {
  MPTokenAuthorizeFlags,
  MPTokenIssuanceCreateFlags,
  MPTokenIssuanceSetFlags,
} from 'xrpl'
import type {
  MPTokenAuthorize,
  MPTokenIssuanceCreate,
  MPTokenIssuanceDestroy,
  MPTokenIssuanceSet,
} from 'xrpl'

import type { components } from '../../../generated/custody.js'

import { toDestination } from './destination.js'
import { collectFlags, hasFlag } from './flags.js'

type MPTokenIdentifier = components['schemas']['Core_Xrpl_MPTokenIdentifier']

/**
 * Resolve an `MPTokenIssuanceID` string to Custody's identifier union.
 *
 * @param issuanceId - The MPT issuance id (192-bit hex).
 * @returns The Custody token identifier reference.
 */
function toMptIdentifier(issuanceId: string): MPTokenIdentifier {
  return { issuanceId, type: 'MPTokenIssuanceId' }
}

/**
 * Map an xrpl `MPTokenAuthorize` to Custody's native operation.
 *
 * @param tx - The `MPTokenAuthorize` transaction.
 * @returns The Custody `MPTokenAuthorize` operation.
 */
export function mapMPTokenAuthorize(
  tx: MPTokenAuthorize,
): components['schemas']['Core_XrplOperation_MPTokenAuthorize'] {
  const unauthorize = hasFlag(
    tx.Flags,
    MPTokenAuthorizeFlags.tfMPTUnauthorize,
    'tfMPTUnauthorize',
  )
  return {
    type: 'MPTokenAuthorize',
    tokenIdentifier: toMptIdentifier(tx.MPTokenIssuanceID),
    flags: unauthorize ? ['tfMPTUnauthorize'] : [],
    holder: tx.Holder === undefined ? undefined : toDestination(tx.Holder),
  }
}

/**
 * `MPTokenIssuanceCreateFlags` bit values, in the exact order the Custody
 * gateway emits them when it reconstructs the operation to verify the intent
 * signature.
 *
 * This order is load-bearing, not cosmetic. Every intent is signed over the
 * JCS-canonicalized request (RFC 8785), and JCS preserves array order — it only
 * sorts object keys. The gateway decodes our `flags` array to a bitmask, then
 * re-encodes it to a string array in *this* fixed order before it canonicalizes
 * and verifies. If our array is in any other order the two canonical forms
 * differ and the gateway rejects the intent with `InvalidSignatureError`. The
 * order is a hand-maintained server enum (it matches no sort of the bit values),
 * so it is pinned here empirically and must be kept in lockstep with the gateway.
 */
const MPT_ISSUANCE_CREATE_FLAGS: ReadonlyArray<
  readonly [
    number,
    components['schemas']['Core_Xrpl_MPTokenIssuanceCreateFlag'],
  ]
> = [
  [MPTokenIssuanceCreateFlags.tfMPTCanTransfer, 'tfMPTCanTransfer'],
  [MPTokenIssuanceCreateFlags.tfMPTCanLock, 'tfMPTCanLock'],
  [MPTokenIssuanceCreateFlags.tfMPTRequireAuth, 'tfMPTRequireAuth'],
  [MPTokenIssuanceCreateFlags.tfMPTCanTrade, 'tfMPTCanTrade'],
  [MPTokenIssuanceCreateFlags.tfMPTCanClawback, 'tfMPTCanClawback'],
  [MPTokenIssuanceCreateFlags.tfMPTCanEscrow, 'tfMPTCanEscrow'],
]

/**
 * Map an xrpl `MPTokenIssuanceCreate` to Custody's native operation.
 * Custody models all 6 xrpl flags — no coverage gap here.
 *
 * @param tx - The `MPTokenIssuanceCreate` transaction.
 * @returns The Custody `MPTokenIssuanceCreate` operation.
 */
export function mapMPTokenIssuanceCreate(
  tx: MPTokenIssuanceCreate,
): components['schemas']['Core_XrplOperation_MPTokenIssuanceCreate'] {
  const flags = collectFlags(tx.Flags, MPT_ISSUANCE_CREATE_FLAGS)
  return {
    type: 'MPTokenIssuanceCreate',
    flags,
    assetScale: tx.AssetScale,
    transferFee: tx.TransferFee,
    maximumAmount: tx.MaximumAmount,
    metadata:
      tx.MPTokenMetadata === undefined
        ? undefined
        : { value: tx.MPTokenMetadata, type: 'HexEncodedMetadata' },
  }
}

/**
 * Map an xrpl `MPTokenIssuanceDestroy` to Custody's native operation.
 *
 * @param tx - The `MPTokenIssuanceDestroy` transaction.
 * @returns The Custody `MPTokenIssuanceDestroy` operation.
 */
export function mapMPTokenIssuanceDestroy(
  tx: MPTokenIssuanceDestroy,
): components['schemas']['Core_XrplOperation_MPTokenIssuanceDestroy'] {
  return {
    type: 'MPTokenIssuanceDestroy',
    tokenIdentifier: toMptIdentifier(tx.MPTokenIssuanceID),
  }
}

/**
 * Map an xrpl `MPTokenIssuanceSet` to Custody's native operation.
 *
 * @param tx - The `MPTokenIssuanceSet` transaction.
 * @returns The Custody `MPTokenIssuanceSet` operation.
 */
export function mapMPTokenIssuanceSet(
  tx: MPTokenIssuanceSet,
): components['schemas']['Core_XrplOperation_MPTokenIssuanceSet'] {
  const flags = collectFlags(tx.Flags, [
    [MPTokenIssuanceSetFlags.tfMPTLock, 'tfMPTLock'],
    [MPTokenIssuanceSetFlags.tfMPTUnlock, 'tfMPTUnlock'],
  ])
  return {
    type: 'MPTokenIssuanceSet',
    tokenIdentifier: toMptIdentifier(tx.MPTokenIssuanceID),
    holder: tx.Holder === undefined ? undefined : toDestination(tx.Holder),
    flags,
  }
}
