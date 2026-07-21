import { SignerCapabilityError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

type ApiAccount = components['schemas']['Core_ApiAccount']

/**
 * Fetch a Custody account's XRPL public key — needed to build the
 * `SigningPubKey`-stamped preimage for raw signing (TDD §7.2 RippleRaw).
 * Custody's vault key information is a union across key strategies, and a
 * key's `publicKey` is itself optional (absent until the vault key is
 * provisioned), so both are narrowed defensively.
 *
 * @param client - The authenticated Custody client.
 * @param domainId - The Custody domain the account belongs to.
 * @param accountId - The Custody account UUID.
 * @returns The account's XRPL public key, base64-encoded.
 * @throws {@link SignerCapabilityError} if the account has no `PublicKey`-type
 * key on file (e.g. still provisioning, or an extended/HD key with no single
 * signing key to export).
 */
export async function resolveSigningPublicKey(
  client: CustodyHttpClient,
  domainId: string,
  accountId: string,
): Promise<string> {
  const account = await client.get<ApiAccount>(
    `/v1/domains/${domainId}/accounts/${accountId}`,
  )
  const { publicKey } = account.data.providerDetails.keyInformation
  if (publicKey?.type !== 'PublicKey') {
    throw new SignerCapabilityError(
      `RippleCustody has no exportable signing public key for account '${accountId}' yet, so raw signing is unavailable for it.`,
    )
  }
  return publicKey.value
}
