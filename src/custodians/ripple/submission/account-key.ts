import { createPublicKey } from 'node:crypto'

import { SignerCapabilityError, SimpleXRPLError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type ApiAccount = components['schemas']['Core_ApiAccount']

/** Custody's id for a vault account's secp256k1 key — its XRPL key. */
const XRPL_KEY_ID = 'SECP256K1_CUSTODY_1'

/** An uncompressed secp256k1 point: `0x04`, then 32-byte x and y. */
const UNCOMPRESSED_POINT_LENGTH = 65
const UNCOMPRESSED_POINT_PREFIX = 0x04
const COORDINATE_LENGTH = 32

/**
 * Compress a secp256k1 point to XRPL's 33-byte form: `02` or `03` (the parity
 * of y), then x.
 *
 * @param x - The x coordinate.
 * @param y - The y coordinate.
 * @returns The compressed key, uppercase hex.
 */
function compressPoint(x: Buffer, y: Buffer): string {
  const prefix = y[y.length - 1] % 2 === 0 ? '02' : '03'
  return `${prefix}${x.toString('hex')}`.toUpperCase()
}

/**
 * Convert a public key as Custody encodes it to the form XRPL uses
 * (`SigningPubKey`): compressed secp256k1, uppercase hex.
 *
 * Custody sends vault keys as base64 SPKI DER, which is compressed here; a raw
 * uncompressed point is compressed too, and any other raw bytes (an
 * already-compressed key) are hex-encoded as they are.
 *
 * @param base64 - The key, base64.
 * @returns The XRPL public key, uppercase hex.
 */
export function toXrplPublicKey(base64: string): string {
  const bytes = Buffer.from(base64, 'base64')
  try {
    const jwk = createPublicKey({
      key: bytes,
      format: 'der',
      type: 'spki',
    }).export({ format: 'jwk' })
    if (jwk.crv === 'secp256k1' && jwk.x !== undefined && jwk.y !== undefined) {
      return compressPoint(
        Buffer.from(jwk.x, 'base64url'),
        Buffer.from(jwk.y, 'base64url'),
      )
    }
  } catch {
    // Not SPKI: fall through to the raw encodings.
  }
  if (
    bytes.length === UNCOMPRESSED_POINT_LENGTH &&
    bytes[0] === UNCOMPRESSED_POINT_PREFIX
  ) {
    return compressPoint(
      bytes.subarray(1, 1 + COORDINATE_LENGTH),
      bytes.subarray(1 + COORDINATE_LENGTH),
    )
  }
  return bytes.toString('hex').toUpperCase()
}

/**
 * Read a Custody account's XRPL public key. Vault accounts list their keys in
 * `providerDetails.keys`, where the XRPL key is `SECP256K1_CUSTODY_1`; older
 * Custody versions only had the now-deprecated `keyInformation.publicKey`,
 * which is used when `keys` carries none.
 *
 * @param client - The authenticated Custody client.
 * @param domainId - The Custody domain the account belongs to.
 * @param accountId - The Custody account UUID.
 * @returns The XRPL public key (compressed, uppercase hex), or `undefined`
 *   when the account has none on file yet (e.g. still provisioning).
 */
export async function fetchXrplPublicKey(
  client: CustodyHttpClient,
  domainId: string,
  accountId: string,
): Promise<string | undefined> {
  const account = await client.get<ApiAccount>(
    `/v1/domains/${domainId}/accounts/${accountId}`,
  )
  const details = account.data.providerDetails
  const key =
    details.keys?.find((entry) => entry.id === XRPL_KEY_ID)?.publicKey ??
    details.keyInformation.publicKey
  return key === undefined ? undefined : toXrplPublicKey(key.value)
}

/**
 * Fetch a Custody account's XRPL public key for raw signing, which stamps it
 * as `SigningPubKey` in the preimage (RippleRaw).
 *
 * @param client - The authenticated Custody client.
 * @param domainId - The Custody domain the account belongs to.
 * @param accountId - The Custody account UUID.
 * @returns The account's XRPL public key, uppercase hex.
 * @throws {@link SignerCapabilityError} if the account has no key on file yet.
 */
export async function resolveSigningPublicKey(
  client: CustodyHttpClient,
  domainId: string,
  accountId: string,
): Promise<string> {
  const publicKey = await fetchXrplPublicKey(client, domainId, accountId)
  if (publicKey === undefined) {
    throw new SignerCapabilityError(
      `RippleCustody has no XRPL public key on file for account '${accountId}' yet, so raw signing is unavailable for it.`,
    )
  }
  return publicKey
}

/**
 * Read a Custody account's XRPL public key, for callers that need it to exist.
 *
 * @param client - The authenticated Custody client.
 * @param domainId - The Custody domain the account belongs to.
 * @param accountId - The Custody account UUID.
 * @returns The account's XRPL public key, uppercase hex.
 * @throws {@link SimpleXRPLError} if the account has no key on file yet.
 */
export async function requireXrplPublicKey(
  client: CustodyHttpClient,
  domainId: string,
  accountId: string,
): Promise<string> {
  const publicKey = await fetchXrplPublicKey(client, domainId, accountId)
  if (publicKey === undefined) {
    throw new SimpleXRPLError(
      `Custody account ${accountId} has no XRPL public key on file yet (it may still be provisioning)`,
    )
  }
  return publicKey
}
