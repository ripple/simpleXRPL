import { inspect } from 'node:util'

import { Wallet } from 'xrpl'

import { PalisadeAuthService } from '../../../src/custodians/palisade/auth/palisade-auth.service.js'
import { CustodyAuthService } from '../../../src/custodians/ripple/auth/custody-auth.service.js'
import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import { LocalSigner } from '../../../src/index.js'
import { generateTestKey } from '../custody-auth/test-utils.js'

/**
 * Secrets must survive being printed or serialized.
 *
 * TypeScript's `private` is erased at compile time, so a `private` field is an
 * ordinary enumerable property at runtime: `console.log(custodian)` (which uses
 * `util.inspect`) and `JSON.stringify(authService)` both walk into it and emit
 * the value in the clear. The fields these tests cover therefore use real JS
 * private fields (`#name`), which are unreachable at runtime and skipped by both.
 *
 * The assertions target the *observable* property — the secret is absent from
 * both renderings — not the mechanism, so they keep holding if the
 * implementation changes (a redacting `toJSON`, a custom inspect hook, …) and
 * fail if a field is reverted to `private`.
 */

const TOKEN = 'test-access-token-value-do-not-leak'
const CLIENT_SECRET = 'test-client-secret-do-not-leak'

/**
 * The base64 body of a PEM key — a needle guaranteed to be key material rather
 * than the `-----BEGIN …-----` boilerplate every PEM shares.
 *
 * @param pem - The PEM-encoded key.
 * @returns A substring of the key body.
 */
function keyBody(pem: string): string {
  const body = pem
    .split('\n')
    .filter((line) => !line.startsWith('-----') && line.trim() !== '')
    .join('')
  return body.slice(0, 24)
}

/**
 * Assert a secret appears in neither of the two renderings that leak it.
 *
 * @param value - The object to render.
 * @param secret - The substring that must not appear.
 */
function expectNotLeaked(value: unknown, secret: string): void {
  expect(secret.length).toBeGreaterThan(8)
  // `depth: null` walks the whole graph, so a secret nested behind several
  // objects (custodian → http client → auth service) is still caught.
  expect(inspect(value, { depth: null })).not.toContain(secret)
  expect(JSON.stringify(value)).not.toContain(secret)
}

describe('CustodyAuthService', () => {
  it('does not expose its signing key to console.log or JSON.stringify', () => {
    const pem = generateTestKey('ed25519')
    const service = new CustodyAuthService({
      authPort: {
        fetchToken: async (): Promise<{ access_token: string }> => ({
          access_token: TOKEN,
        }),
      },
      privateKey: pem,
    })
    // The needle is genuinely part of the key we handed in, so a pass means
    // concealment rather than a mis-built assertion.
    expect(pem).toContain(keyBody(pem))
    expectNotLeaked(service, keyBody(pem))
  })

  it('does not expose the cached bearer token once one is fetched', async () => {
    const service = new CustodyAuthService({
      authPort: {
        fetchToken: async (): Promise<{ access_token: string }> => ({
          access_token: TOKEN,
        }),
      },
      privateKey: generateTestKey('ed25519'),
    })
    await service.getToken()
    // Still reachable through the intended accessor — concealed, not removed.
    expect(service.getCurrentToken()).toBe(TOKEN)
    expectNotLeaked(service, TOKEN)
  })
})

describe('PalisadeAuthService', () => {
  it('does not expose its client secret or cached token', async () => {
    const service = new PalisadeAuthService({
      // Deliberately not the shared `FakeAuthPort`: that fixture records every
      // `(clientId, clientSecret)` pair it receives so other tests can assert
      // on them, which would surface the secret through the *port* rather than
      // the service under test. A port is handed the secret by design; what
      // matters here is that the service's own state doesn't retain it visibly.
      authPort: {
        exchangeCredential: async (): Promise<{
          accessToken: string
          expiresIn: number
        }> => ({ accessToken: TOKEN, expiresIn: 3600 }),
      },
      clientId: 'client-id-is-not-secret',
      clientSecret: CLIENT_SECRET,
    })
    expectNotLeaked(service, CLIENT_SECRET)

    expect(await service.getToken()).toBe(TOKEN)
    expectNotLeaked(service, CLIENT_SECRET)
    expectNotLeaked(service, TOKEN)
  })
})

describe('IntentSigner', () => {
  it('does not expose the key it signs with', () => {
    const pem = generateTestKey('ed25519')
    const signer = new IntentSigner(KeypairService.fromPrivateKey(pem), pem)
    expectNotLeaked(signer, keyBody(pem))
  })
})

describe('LocalSigner', () => {
  it('does not expose the wallet seed or private key', () => {
    const wallet = Wallet.generate()
    const signer = LocalSigner.fromSeed(wallet.seed as string)
    // Still functional — the wallets are concealed, not discarded.
    expect(signer.primary.address).toBe(wallet.classicAddress)
    expectNotLeaked(signer, wallet.seed as string)
    expectNotLeaked(signer, wallet.privateKey)
  })

  it('does not expose any seed when holding multiple wallets', () => {
    const wallets = [Wallet.generate(), Wallet.generate()]
    const signer = LocalSigner.create({ wallets })
    for (const wallet of wallets) {
      expectNotLeaked(signer, wallet.seed as string)
      expectNotLeaked(signer, wallet.privateKey)
    }
  })
})
