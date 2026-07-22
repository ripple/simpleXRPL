import type { SubmissionHost } from '../pipeline/index.js'
import { ledgerEntryNode, readAccountAddress } from '../reads/read-helpers.js'

import type {
  AcceptedCredential,
  DomainData,
  DomainListParams,
  DomainListResult,
  DomainRetrieveParams,
  DomainRetrieveResult,
} from './domain.types.js'
import { fromHex } from './hex.js'

/** An accepted-credential entry as stored on a `PermissionedDomain`. */
interface LedgerAcceptedCredential {
  readonly Credential: {
    readonly Issuer: string
    readonly CredentialType: string
  }
}

/** The `PermissionedDomain` fields this read shapes. */
interface DomainNode {
  readonly index?: string
  readonly Owner: string
  readonly AcceptedCredentials?: readonly LedgerAcceptedCredential[]
}

/**
 * Shape a raw `PermissionedDomain` node, decoding credential types from hex.
 *
 * @param node - The raw domain node.
 * @param domainID - The domain's on-chain id.
 * @returns The shaped domain.
 */
function shapeDomain(node: DomainNode, domainID: string): DomainData {
  const credList: AcceptedCredential[] = (node.AcceptedCredentials ?? []).map(
    (entry) => ({
      issuer: entry.Credential.Issuer,
      credType: fromHex(entry.Credential.CredentialType),
    }),
  )
  return { domainID, owner: node.Owner, credList }
}

/**
 * Retrieve a single permissioned domain by id. No signer required.
 *
 * @param host - The client the read runs against.
 * @param params - The domain id to fetch.
 * @returns The domain id and its snapshot (or `undefined` if absent).
 */
export async function retrieveDomain(
  host: SubmissionHost,
  params: DomainRetrieveParams,
): Promise<DomainRetrieveResult> {
  const node = await ledgerEntryNode<DomainNode>(host, {
    index: params.domainID,
  })
  return {
    domainID: params.domainID,
    data: node === undefined ? undefined : shapeDomain(node, params.domainID),
  }
}

/**
 * List every permissioned domain owned by an account. No signer required.
 *
 * @param host - The client the read runs against.
 * @param params - The owner account (default: the primary signer's account).
 * @returns The domain ids and shaped domains, index-aligned.
 */
export async function listDomains(
  host: SubmissionHost,
  params?: DomainListParams,
): Promise<DomainListResult> {
  const account = readAccountAddress(host, params?.account)
  const response = await host.ledger.request<{
    result: { account_objects: ReadonlyArray<DomainNode & { index: string }> }
  }>({
    command: 'account_objects',
    account,
    type: 'permissioned_domain',
    ledger_index: 'validated',
  })
  const data = response.result.account_objects.map((object) =>
    shapeDomain(object, object.index),
  )
  return { domains: data.map((domain) => domain.domainID), data }
}
