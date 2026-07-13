import { SimpleXRPLClient } from './client.js'
import type { SimpleXRPLConfig } from './config.js'

/**
 * The SDK entry point. `SimpleXRPL.init(...)` is the only way to obtain a
 * {@link SimpleXRPLClient}; the client is never constructed via `new`.
 */
export const SimpleXRPL = {
  /**
   * Bind custodians to a network and build the account index.
   *
   * @param config - Network endpoints and pre-constructed custodians.
   * @returns A ready client.
   */
  async init(config: SimpleXRPLConfig): Promise<SimpleXRPLClient> {
    return SimpleXRPLClient.init(config)
  },
}
