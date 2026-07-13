import { Client, Wallet } from 'xrpl'

import { LocalSigner, SimpleXRPL, XrplLedger } from '../../../src/index.js'
import type { SimpleXRPLClient } from '../../../src/index.js'

const DEFAULT_TESTNET_WS = 'wss://s.altnet.rippletest.net:51233'

// eslint-disable-next-line n/no-process-env -- the live harness reads its target endpoint from the environment
const configuredWs = process.env.XRPL_TESTNET_WS

/**
 * The XRPL WebSocket endpoint the live tier runs against. Defaults to the public
 * Testnet; override via `XRPL_TESTNET_WS` to point the same harness at another
 * network (e.g. a custodian sandbox's devnet).
 */
export const TESTNET_WS = configuredWs ?? DEFAULT_TESTNET_WS

/**
 * A ready-to-use live client plus the funded accounts backing it: `client` is
 * wired to a real `XrplLedger` with `source` as its signer, and `destination`
 * is a second faucet-funded account.
 */
export interface TestnetFixture {
  readonly client: SimpleXRPLClient
  readonly source: Wallet
  readonly destination: Wallet
}

/**
 * Faucet-fund a fresh source and destination account on the target network and
 * return a connected client whose sole signer is a local wallet for the source.
 *
 * Funding is faucet-based (Local path); custodian tiers provision accounts in
 * their own sandboxes and reuse only the connection/assertion parts.
 *
 * @returns A connected client and its two funded accounts.
 */
export async function fundedTestnetClient(): Promise<TestnetFixture> {
  const faucet = new Client(TESTNET_WS)
  await faucet.connect()
  try {
    const source = (await faucet.fundWallet()).wallet
    const destination = (await faucet.fundWallet()).wallet
    const client = await SimpleXRPL.init({
      rippledUrl: TESTNET_WS,
      signers: [LocalSigner.fromSeed(source.seed as string)],
      ledger: new XrplLedger(TESTNET_WS),
    })
    await client.connect()
    return { client, source, destination }
  } finally {
    await faucet.disconnect()
  }
}
