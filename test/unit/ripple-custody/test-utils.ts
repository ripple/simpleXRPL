import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { CustodyHttpClient } from '../../../src/custodians/ripple/transport/custody-http-client.js'
import type {
  HttpRequest,
  HttpResponse,
} from '../../../src/custodians/ripple/transport/http-port.js'
import {
  FakeAuthPort,
  generateTestKey,
  makeJwt,
} from '../custody-auth/test-utils.js'
import { FakeHttpPort, ok } from '../custody-discovery/test-utils.js'

export { FakeHttpPort, ok, status } from '../custody-discovery/test-utils.js'
export { fakeLedger } from '../pipeline/fake-ledger.js'

/** A JSON-ish fixture body. */
type JsonBody = Record<string, unknown>

/** A syntactically valid signing key for tests (deterministic enough for canonicalization tests). */
export const SIGNING_KEY = generateTestKey('ed25519')

/** The Custody domain id used across these tests. */
export const DOMAIN_ID = 'domain-1'

/** The intent-author's own Custody user id, as `GET /v1/me` would resolve it. */
export const AUTHOR_USER_ID = 'author-1'

/**
 * Build a CustodyHttpClient wired to a per-test HTTP handler, authenticated
 * with a synthetic never-expiring JWT.
 *
 * @param handler - Decides the response for each request.
 * @returns The ready client and the underlying fake port (for request assertions).
 */
export function makeClient(
  handler: (request: HttpRequest, callIndex: number) => HttpResponse,
): { client: CustodyHttpClient; http: FakeHttpPort } {
  const http = new FakeHttpPort(handler)
  const auth = new CustodyAuthService({
    authPort: new FakeAuthPort(makeJwt({ exp: 9_999_999_999 })),
    privateKey: SIGNING_KEY,
  })
  return {
    client: new CustodyHttpClient({
      gatewayUrl: 'https://custody.example.com',
      http,
      auth,
    }),
    http,
  }
}

/**
 * Build a `GET /v1/me` body naming one domain/user pair.
 *
 * @param domainId - The domain id the user belongs to.
 * @param userId - The user's own id within that domain.
 * @returns The `Core_MeReference` body.
 */
export function meBody(domainId: string, userId: string): JsonBody {
  return {
    publicKey: '',
    domains: [
      {
        id: domainId,
        alias: 'domain',
        userReference: { id: userId, alias: 'author', roles: [] },
      },
    ],
  }
}

/**
 * Build a `GET /v1/domains/{domainId}/accounts/{accountId}` body carrying a
 * `PublicKey`-type vault key.
 *
 * @param accountId - The account id.
 * @param publicKeyBase64 - The account's XRPL public key, base64.
 * @returns The `Core_ApiAccount` body.
 */
export function apiAccountBody(
  accountId: string,
  publicKeyBase64: string,
): JsonBody {
  return {
    data: {
      id: accountId,
      domainId: DOMAIN_ID,
      alias: 'treasury',
      providerDetails: {
        vaultId: 'vault-1',
        keyStrategy: 'VaultHard',
        keyInformation: {
          type: 'VaultDerived',
          publicKey: { type: 'PublicKey', value: publicKeyBase64 },
        },
        type: 'Vault',
      },
      lock: 'Unlocked',
      metadata: {},
    },
    signature: '',
    signingKey: '',
  }
}

/**
 * Build a `Core_TrustedIntent` body for a given status.
 *
 * @param intentId - The intent id.
 * @param status - The intent's current status.
 * @param errorMessage - Optional error detail for a rejected/failed intent.
 * @param errorMessage.code - The error code.
 * @param errorMessage.message - The error message.
 * @returns The trusted-intent body.
 */
export function intentBody(
  intentId: string,
  status: string,
  errorMessage?: { code: string; message: string },
): JsonBody {
  return {
    data: {
      id: intentId,
      details: {
        payload: { id: intentId, type: 'v0_CreateTransactionOrder' },
        expiryAt: '2099-01-01T00:00:00Z',
        author: { id: AUTHOR_USER_ID, domainId: DOMAIN_ID },
        targetDomainId: DOMAIN_ID,
        metadata: { createdAt: '2026-01-01T00:00:00Z', customProperties: {} },
        proposalSignature: '',
      },
      state: {
        status,
        error: errorMessage,
      },
    },
    signature: '',
    signingKey: '',
  }
}

/**
 * Build a `Core_ApiManifest` body carrying an `Unsafe`-type signature value.
 *
 * @param manifestId - The manifest id.
 * @param signatureBase64 - The signature Custody produced, base64.
 * @returns The `Core_ApiManifest` body.
 */
export function apiManifestBody(
  manifestId: string,
  signatureBase64: string,
): JsonBody {
  return {
    data: {
      id: manifestId,
      domainId: DOMAIN_ID,
      accountId: 'acc-1',
      content: { value: '', type: 'Unsafe' },
      value: { signature: signatureBase64, type: 'Unsafe' },
      metadata: {},
    },
    signature: '',
    signingKey: '',
  }
}

/**
 * A 202-Accepted response for `POST /v1/intents`.
 *
 * @returns The HTTP response.
 */
export function accepted(): HttpResponse {
  return ok({ requestId: 'req-1' })
}
