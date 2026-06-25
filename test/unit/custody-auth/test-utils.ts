import { generateKeyPairSync } from 'node:crypto'

import type {
  CustodyAuthPort,
  SignedChallenge,
  TokenResponse,
} from '../../../src/custodians/ripple/auth/ports.js'

/**
 * Generate a PEM private key for an algorithm, in the format Custody expects.
 *
 * @param algorithm - The algorithm to generate a key for.
 * @returns The PEM-encoded private key.
 */
export function generateTestKey(
  algorithm: 'secp256k1' | 'secp256r1' | 'ed25519',
): string {
  if (algorithm === 'ed25519') {
    const { privateKey } = generateKeyPairSync('ed25519')
    return privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
  }
  const namedCurve = algorithm === 'secp256k1' ? 'secp256k1' : 'prime256v1'
  const { privateKey } = generateKeyPairSync('ec', {
    namedCurve,
    privateKeyEncoding: { type: 'sec1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'der' },
  })
  return privateKey
}

/**
 * Build a syntactically valid (unsigned) JWT with the given claims.
 *
 * @param claims - The payload claims (e.g. an `exp`).
 * @returns A `header.payload.signature` JWT string.
 */
export function makeJwt(claims: Record<string, unknown>): string {
  const encode = (obj: unknown): string =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(claims)}.sig`
}

/**
 * In-memory CustodyAuthPort fake. Records every form it receives and returns a
 * configurable token, so the auth state machine runs with zero network.
 */
export class FakeAuthPort implements CustodyAuthPort {
  public readonly calls: SignedChallenge[] = []
  private readonly nextTokens: string[] = []
  private failNext = false

  public constructor(private readonly defaultToken: string) {}

  /**
   * Queue tokens to return on subsequent calls (falls back to the default).
   *
   * @param tokens - Tokens to return, in order, on the next fetches.
   */
  public queueTokens(...tokens: string[]): void {
    this.nextTokens.push(...tokens)
  }

  /** Make the next fetchToken throw, simulating a transport/auth failure. */
  public failOnce(): void {
    this.failNext = true
  }

  /**
   * Record the challenge form and return the next queued or default token.
   *
   * @param form - The signed challenge form.
   * @returns The token response.
   */
  public async fetchToken(form: SignedChallenge): Promise<TokenResponse> {
    this.calls.push(form)
    if (this.failNext) {
      this.failNext = false
      throw new Error('simulated transport failure')
    }
    return { access_token: this.nextTokens.shift() ?? this.defaultToken }
  }
}
