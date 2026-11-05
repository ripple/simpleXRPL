import { createPublicKey } from 'node:crypto'
import type { JsonWebKey } from 'node:crypto'

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

/** XRPL's 33-byte public key: a secp256k1 key (`02`/`03`) or ed25519 (`ED`). */
const XRPL_KEY_LENGTH = 33
const SECP256K1_EVEN_PREFIX = 0x02
const SECP256K1_ODD_PREFIX = 0x03
const ED25519_PREFIX = 0xed
const XRPL_KEY_PREFIXES: ReadonlySet<number> = new Set([
  SECP256K1_EVEN_PREFIX,
  SECP256K1_ODD_PREFIX,
  ED25519_PREFIX,
])

/**
 * Read an SPKI key in XRPL's form, if it is one XRPL supports.
 *
 * @param bytes - The candidate SPKI DER.
 * @returns The XRPL key; `undefined` if `bytes` isn't SPKI.
 * @throws {@link SimpleXRPLError} for an SPKI key on a curve XRPL can't use.
 */
function fromSpki(bytes: Buffer): string | undefined {
  let jwk: JsonWebKey
  try {
    jwk = createPublicKey({ key: bytes, format: 'der', type: 'spki' }).export({
      format: 'jwk',
    })
  } catch {
    return undefined
  }
  if (jwk.crv === 'secp256k1' && jwk.x !== undefined && jwk.y !== undefined) {
    return compressPoint(
      Buffer.from(jwk.x, 'base64url'),
      Buffer.from(jwk.y, 'base64url'),
    )
  }
  if (jwk.crv === 'Ed25519' && jwk.x !== undefined) {
    return `ED${Buffer.from(jwk.x, 'base64url').toString('hex')}`.toUpperCase()
  }
  throw new SimpleXRPLError(
    `Custody returned a ${String(jwk.crv ?? jwk.kty)} public key, which XRPL can't use`,
  )
}

/**
 * Convert a public key as Custody encodes it to the form XRPL uses
 * (`SigningPubKey`): uppercase hex of a compressed secp256k1 key, or of an
 * `ED`-prefixed ed25519 key.
 *
 * Custody sends vault keys as base64 SPKI DER, converted here; a raw
 * uncompressed secp256k1 point is compressed, and a key already in XRPL's
 * 33-byte form is kept.
 *
 * @param base64 - The key, base64.
 * @returns The XRPL public key, uppercase hex.
 * @throws {@link SimpleXRPLError} if the key isn't in an encoding XRPL can use,
 *   rather than pass on bytes that would fail as a `SigningPubKey`.
 */
export function toXrplPublicKey(base64: string): string {
  const bytes = Buffer.from(base64, 'base64')
  const spki = fromSpki(bytes)
  if (spki !== undefined) {
    return spki
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
  if (bytes.length === XRPL_KEY_LENGTH && XRPL_KEY_PREFIXES.has(bytes[0])) {
    return bytes.toString('hex').toUpperCase()
  }
  throw new SimpleXRPLError(
    `Custody returned a ${bytes.length}-byte public key in an encoding the SDK doesn't recognise`,
  )
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
