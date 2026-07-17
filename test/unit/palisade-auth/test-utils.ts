import type {
  PalisadeAuthPort,
  PalisadeTokenResponse,
} from '../../../src/custodians/palisade/auth/ports.js'

/**
 * In-memory {@link PalisadeAuthPort} fake. Records every `(clientId,
 * clientSecret)` pair it receives and returns a configurable token, so the
 * auth state machine runs with zero network.
 */
export class FakeAuthPort implements PalisadeAuthPort {
  public readonly calls: Array<{ clientId: string; clientSecret: string }> = []
  private readonly nextTokens: PalisadeTokenResponse[] = []
  private failNext = false

  public constructor(private readonly defaultToken: PalisadeTokenResponse) {}

  /**
   * Queue token responses to return on subsequent calls (falls back to the default).
   *
   * @param tokens - Token responses to return, in order, on the next fetches.
   */
  public queueTokens(...tokens: PalisadeTokenResponse[]): void {
    this.nextTokens.push(...tokens)
  }

  /** Make the next exchangeCredential throw, simulating a transport/auth failure. */
  public failOnce(): void {
    this.failNext = true
  }

  /**
   * Record the credential pair and return the next queued or default token.
   *
   * @param clientId - The Palisade client ID.
   * @param clientSecret - The Palisade client secret.
   * @returns The token response.
   */
  public async exchangeCredential(
    clientId: string,
    clientSecret: string,
  ): Promise<PalisadeTokenResponse> {
    this.calls.push({ clientId, clientSecret })
    if (this.failNext) {
      this.failNext = false
      throw new Error('simulated transport failure')
    }
    return this.nextTokens.shift() ?? this.defaultToken
  }
}
