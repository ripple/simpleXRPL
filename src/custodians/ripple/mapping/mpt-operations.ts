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
 * Map an xrpl.js `MPTokenAuthorize` to Custody's native operation.
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

/** `MPTokenIssuanceCreateFlags` bit values, in the exact order Custody's enum lists them. */
const MPT_ISSUANCE_CREATE_FLAGS: ReadonlyArray<
  readonly [
    number,
    components['schemas']['Core_Xrpl_MPTokenIssuanceCreateFlag'],
  ]
> = [
  [MPTokenIssuanceCreateFlags.tfMPTRequireAuth, 'tfMPTRequireAuth'],
  [MPTokenIssuanceCreateFlags.tfMPTCanClawback, 'tfMPTCanClawback'],
  [MPTokenIssuanceCreateFlags.tfMPTCanTransfer, 'tfMPTCanTransfer'],
  [MPTokenIssuanceCreateFlags.tfMPTCanEscrow, 'tfMPTCanEscrow'],
  [MPTokenIssuanceCreateFlags.tfMPTCanLock, 'tfMPTCanLock'],
  [MPTokenIssuanceCreateFlags.tfMPTCanTrade, 'tfMPTCanTrade'],
]

/**
 * Map an xrpl.js `MPTokenIssuanceCreate` to Custody's native operation.
 * Custody models all 6 xrpl.js flags — no coverage gap here.
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
 * Map an xrpl.js `MPTokenIssuanceDestroy` to Custody's native operation.
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
 * Map an xrpl.js `MPTokenIssuanceSet` to Custody's native operation.
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
