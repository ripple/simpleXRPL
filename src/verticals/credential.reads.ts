import type { SubmissionHost } from '../pipeline/index.js'
import { ledgerEntryNode, readAccountAddress } from '../reads/read-helpers.js'

import type {
  CredentialData,
  CredentialListParams,
  CredentialListResult,
  CredentialRetrieveParams,
  CredentialRetrieveResult,
} from './credential.types.js'
import { fromHex, toHex } from './hex.js'

/** `lsfAccepted` on a `Credential` ledger object. */
const LSF_ACCEPTED = 0x00010000

/** The `Credential` fields this read shapes. */
interface CredentialNode {
  readonly Issuer: string
  readonly Subject: string
  readonly CredentialType: string
  readonly Flags?: number
  readonly URI?: string
  readonly Expiration?: number
}

/**
 * Shape a raw `Credential` node, decoding hex fields and the accepted flag.
 *
 * @param node - The raw credential node.
 * @returns The shaped credential.
 */
function shapeCredential(node: CredentialNode): CredentialData {
  // eslint-disable-next-line no-bitwise -- test a ledger flag bit.
  const accepted = ((node.Flags ?? 0) & LSF_ACCEPTED) !== 0
  return {
    credType: fromHex(node.CredentialType),
    issuer: node.Issuer,
    holder: node.Subject,
    accepted,
    uri: node.URI === undefined ? undefined : fromHex(node.URI),
    expiration: node.Expiration,
  }
}

/**
 * Retrieve a single credential by type and issuer. No signer required.
 *
 * @param host - The client the read runs against.
 * @param params - The credential type, issuer, and holder (default primary).
 * @returns The identifiers and snapshot (or `undefined` data if absent).
 */
export async function retrieveCredential(
  host: SubmissionHost,
  params: CredentialRetrieveParams,
): Promise<CredentialRetrieveResult> {
  const holder = readAccountAddress(host, params.account)
  const node = await ledgerEntryNode<CredentialNode>(host, {
    credential: {
      subject: holder,
      issuer: params.issuer,
      credential_type: toHex(params.credType),
    },
  })
  return {
    credType: params.credType,
    issuer: params.issuer,
    holder,
    data: node === undefined ? undefined : shapeCredential(node),
  }
}

/**
 * List every credential an account holds (or issued). No signer required.
 *
 * @param host - The client the read runs against.
 * @param params - The role and account (default: the primary signer's account).
 * @returns The credential identifiers and shaped credentials, index-aligned.
 */
export async function listCredentials(
  host: SubmissionHost,
  params?: CredentialListParams,
): Promise<CredentialListResult> {
  const account = readAccountAddress(host, params?.account)
  const role = params?.role ?? 'holder'
  const response = await host.ledger.request<{
    result: { account_objects: readonly CredentialNode[] }
  }>({
    command: 'account_objects',
    account,
    type: 'credential',
    ledger_index: 'validated',
  })
  const data = response.result.account_objects
    .filter((node) => {
      const owner = role === 'issuer' ? node.Issuer : node.Subject
      return owner === account
    })
    .map(shapeCredential)
  const credentials = data.map((entry) => ({
    credType: entry.credType,
    issuer: entry.issuer,
    holder: entry.holder,
  }))
  return { credentials, data }
}
