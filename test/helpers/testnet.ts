import { Client, dropsToXrp, Wallet } from 'xrpl'

import { LocalSigner, SimpleXRPL, XrplLedger } from '../../src/index.js'
import type { SimpleXRPLClient } from '../../src/index.js'

/** Minimum XRP an account should hold before it's considered funded. */
const MIN_FUNDED_XRP = 25

/** How long to wait for faucet funding to appear in a validated ledger. */
const FUNDING_POLL_ATTEMPTS = 20
const FUNDING_POLL_INTERVAL_MS = 1000

const DEFAULT_TESTNET_WS = 'wss://s.altnet.rippletest.net:51233'

// eslint-disable-next-line n/no-process-env -- the live harness reads its target endpoint from the environment
const configuredWs = process.env.XRPL_TESTNET_WS

/**
 * The XRPL WebSocket endpoint the live tier runs against. Defaults to the public
 * Testnet; override via `XRPL_TESTNET_WS` to point the same harness at another
 * network (e.g. a custodian sandbox's devnet).
 */
export const TESTNET_WS = configuredWs ?? DEFAULT_TESTNET_WS

/** The public Testnet faucet HTTP endpoint (funds an address via POST). */
export const TESTNET_FAUCET = 'https://faucet.altnet.rippletest.net/accounts'

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
      xrpldUrl: TESTNET_WS,
      signers: [LocalSigner.fromSeed(source.seed as string)],
      ledger: new XrplLedger(TESTNET_WS),
    })
    await client.connect()
    return { client, source, destination }
  } finally {
    await faucet.disconnect()
  }
}

/**
 * A connected client whose signers are all the funded wallets. `wallets[0]` is
 * the primary signer.
 */
export interface MultiSignerFixture {
  readonly client: SimpleXRPLClient
  readonly wallets: readonly Wallet[]
}

/**
 * Faucet-fund `count` accounts and return a connected client that holds a local
 * signer for each (the first is the primary). Useful for multi-account flows
 * such as an IOU or MPT issuer plus a holder.
 *
 * @param count - How many accounts to fund (default 2).
 * @returns A connected client and its funded wallets.
 */
export async function fundedClientWithSigners(
  count = 2,
): Promise<MultiSignerFixture> {
  const faucet = new Client(TESTNET_WS)
  await faucet.connect()
  try {
    const funded = await Promise.all(
      Array.from({ length: count }, async () => faucet.fundWallet()),
    )
    const wallets = funded.map((result) => result.wallet)
    const client = await SimpleXRPL.init({
      xrpldUrl: TESTNET_WS,
      signers: wallets.map((wallet) =>
        LocalSigner.fromSeed(wallet.seed as string),
      ),
      ledger: new XrplLedger(TESTNET_WS),
    })
    await client.connect()
    return { client, wallets }
  } finally {
    await faucet.disconnect()
  }
}

/**
 * The validated XRP balance of an address, or 0 when the account is unfunded.
 *
 * @param client - A connected testnet client.
 * @param address - The r-address to check.
 * @returns The balance in XRP.
 */
async function validatedBalanceXrp(
  client: Client,
  address: string,
): Promise<number> {
  try {
    const info = await client.request({
      command: 'account_info',
      account: address,
      ledger_index: 'validated',
    })
    return Number(dropsToXrp(info.result.account_data.Balance))
  } catch {
    // account_info throws `actNotFound` for an unfunded account.
    return 0
  }
}

/**
 * Faucet-fund an existing address when it holds less than {@link
 * MIN_FUNDED_XRP}, then wait until the balance appears in a validated ledger so
 * a first transaction doesn't race the funding (see the funding-wait note in
 * the repo's testing conventions). Idempotent — a funded account is untouched.
 *
 * Mirrors how the xrpl integration suite faucet-funds accounts, but targets
 * a pre-existing address (e.g. a custodian-held wallet) via `destination`
 * rather than generating a fresh wallet.
 *
 * @param address - The r-address to fund.
 * @throws Error if the faucet request fails or funding never lands.
 */
export async function ensureFunded(address: string): Promise<void> {
  const client = new Client(TESTNET_WS)
  await client.connect()
  try {
    if ((await validatedBalanceXrp(client, address)) >= MIN_FUNDED_XRP) {
      return
    }
    const response = await fetch(TESTNET_FAUCET, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: address }),
    })
    if (!response.ok) {
      throw new Error(`Testnet faucet funding failed (HTTP ${response.status})`)
    }
    /* eslint-disable no-await-in-loop -- polling for validated funding is sequential */
    for (let attempt = 0; attempt < FUNDING_POLL_ATTEMPTS; attempt += 1) {
      if ((await validatedBalanceXrp(client, address)) >= MIN_FUNDED_XRP) {
        return
      }
      await new Promise((resolve) => {
        setTimeout(resolve, FUNDING_POLL_INTERVAL_MS)
      })
    }
    /* eslint-enable no-await-in-loop */
    throw new Error(
      `Address ${address} did not reach ${MIN_FUNDED_XRP} XRP after funding`,
    )
  } finally {
    await client.disconnect()
  }
}
