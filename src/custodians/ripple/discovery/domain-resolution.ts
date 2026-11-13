import { CustodyAuthError, SimpleXRPLError } from '../../../errors.js'
import type { components } from '../../../generated/custody.js'
import type { CustodyHttpClient } from '../transport/custody-http-client.js'

import { findAddressReferences } from './address-lookup.js'

/** The domain a RippleCustody operates in, and the API user's id there. */
export interface ResolvedDomain {
  readonly domainId: string
  readonly authorUserId: string
}

/**
 * The Custody domain that holds the primary address, for a RippleCustody
 * configured without a `domainId`. Only domains the API user belongs to count.
 *
 * @param client - The authenticated Custody client.
 * @param primary - The primary account's r-address.
 * @param userDomainIds - The domains the API user belongs to (`/v1/me`).
 * @returns The domain id.
 * @throws {@link SimpleXRPLError} if no domain, or more than one, holds the
 *   address; set `domainId` explicitly then.
 */
async function resolvePrimaryDomain(
  client: CustodyHttpClient,
  primary: string,
  userDomainIds: readonly string[],
): Promise<string> {
  const domainIds = Array.from(
    new Set(
      (await findAddressReferences(client, primary))
        .map((reference) => reference.domainId)
        .filter((domainId) => userDomainIds.includes(domainId)),
    ),
  )
  if (domainIds.length > 1) {
    throw new SimpleXRPLError(
      `The primary address ${primary} is held in ${domainIds.length} Custody domains (${domainIds.join(', ')}); set domainId to pick one`,
    )
  }
  if (domainIds.length === 0) {
    throw new SimpleXRPLError(
      `No Custody account in the API user's domains holds the primary address ${primary}; check the address, or set domainId`,
    )
  }
  return domainIds[0]
}

/**
 * Resolve the domain a new RippleCustody operates in — the configured
 * `domainId`, or else the one holding the primary address — and the API
 * user's id in it.
 *
 * @param client - The authenticated Custody client.
 * @param me - The API user, as `/v1/me` returns it.
 * @param config - The configured domain, if any, and the primary address.
 * @param config.domainId - The configured domain.
 * @param config.primary - The primary account's r-address.
 * @returns The domain id and the API user's id in it.
 * @throws {@link CustodyAuthError} if the API user has no access to the
 *   domain.
 * @throws {@link SimpleXRPLError} if no domain is configured and the primary
 *   address isn't in exactly one of the user's domains.
 */
export async function resolveDomain(
  client: CustodyHttpClient,
  me: components['schemas']['Core_MeReference'],
  config: { readonly domainId?: string; readonly primary: string },
): Promise<ResolvedDomain> {
  const domainId =
    config.domainId ??
    (await resolvePrimaryDomain(
      client,
      config.primary,
      me.domains.map((entry) => entry.id),
    ))
  const domain = me.domains.find((entry) => entry.id === domainId)
  if (domain === undefined) {
    throw new CustodyAuthError(
      `The authenticated Custody user has no access to domain '${domainId}'`,
    )
  }
  return { domainId, authorUserId: domain.userReference.id }
}
