import { PalisadeCustody, SimpleXRPL, XrplLedger } from '../../src/index.js'
import type { PalisadeCustodyConfig } from '../../src/index.js'

import { ensureFunded, TESTNET_WS } from './helpers/testnet.js'

/**
 * Palisade contract tests: run the real adapter against a live Palisade
 * sandbox to verify our assumptions about its API still hold (DGE-7470).
 *
 * These are gated on sandbox credentials and skip entirely when they're
 * absent — CI and local offline runs stay green without a Palisade account.
 * Provide all of the following env vars to enable them:
 *
 *   PALISADE_BASE_URL       HTTPS base URL of the sandbox
 *   PALISADE_CLIENT_ID      OAuth client id
 *   PALISADE_CLIENT_SECRET  OAuth client secret
 *   PALISADE_VAULT_ID       Primary wallet's vault id
 *   PALISADE_WALLET_ID      Primary wallet id
 *
 * Optional:
 *   PALISADE_ADDRESS        Primary wallet's r-address. When set, the SDK skips
 *                           wallet discovery — so a transactions-only API
 *                           credential (no wallet-read scope) works.
 *   PALISADE_DEST_ADDRESS   A second org wallet's r-address, used as the Payment
 *                           destination. Palisade's native transfer only accepts
 *                           destinations it knows (org wallets / Address Book),
 *                           so this must be another wallet in the same org. When
 *                           unset, the Payment test is skipped.
 */
const LIVE_TIMEOUT_MS = 120_000

/** The sandbox is slow to confirm; poll well past its confirmation latency. */
const SUBMIT_TIMEOUT_MS = 180_000

/** Jest timeout for the submission test: the poll plus connection overhead. */
const SUBMIT_TEST_TIMEOUT_MS = 210_000

/**
 * Read the sandbox config from the environment.
 *
 * @returns The config, or `undefined` if any required var is missing.
 */
function sandboxConfig(): PalisadeCustodyConfig | undefined {
  // eslint-disable-next-line n/no-process-env -- contract tests read sandbox credentials from the environment by design
  const env = process.env
  const {
    PALISADE_BASE_URL: baseUrl,
    PALISADE_CLIENT_ID: clientId,
    PALISADE_CLIENT_SECRET: clientSecret,
    PALISADE_VAULT_ID: vaultId,
    PALISADE_WALLET_ID: walletId,
    PALISADE_ADDRESS: address,
  } = env
  if (
    baseUrl === undefined ||
    clientId === undefined ||
    clientSecret === undefined ||
    vaultId === undefined ||
    walletId === undefined
  ) {
    return undefined
  }
  return {
    baseUrl,
    clientId,
    clientSecret,
    // `xrplAddress` (when set) makes the SDK skip wallet discovery, so this
    // works with a transactions-only credential that lacks wallet-read scope.
    primary: { vaultId, walletId, xrplAddress: address },
    // Contract tests exercise the native governance path only; raw signing is
    // covered by unit tests and needs no live account.
    allowRawSigning: false,
    // The sandbox advances a transaction through its status pipeline
    // (REQUESTED → … → CONFIRMED) more slowly than the default timeout, so give
    // the poll longer before it reports the intent still pending.
    defaultTimeoutMs: SUBMIT_TIMEOUT_MS,
  }
}

const config = sandboxConfig()
const describeIfSandbox = config === undefined ? describe.skip : describe

// eslint-disable-next-line n/no-process-env -- optional Payment destination from the environment
const destAddress = process.env.PALISADE_DEST_ADDRESS

describeIfSandbox('PalisadeCustody (live sandbox contract)', () => {
  // Non-null: describeIfSandbox is `describe.skip` when config is undefined,
  // so the body never runs without a config.
  const cfg = config as PalisadeCustodyConfig

  // Setup: faucet-fund the primary (and, when configured, the destination)
  // wallet on testnet so the Payment has a balance to send and a live recipient.
  // Idempotent, and only when an address is configured (the discovery path has
  // no address and needs no funding). Requires the sandbox wallet to live on the
  // same network as TESTNET_WS's faucet.
  beforeAll(async () => {
    const { xrplAddress } = cfg.primary
    if (xrplAddress !== undefined && xrplAddress !== '') {
      await ensureFunded(xrplAddress)
    }
    if (destAddress !== undefined && destAddress !== '') {
      await ensureFunded(destAddress)
    }
  }, LIVE_TIMEOUT_MS)

  it(
    'discovers the org wallets and binds the configured primary',
    async () => {
      const custody = await PalisadeCustody.create(cfg)
      expect(custody.kind).toBe('palisade-custody')
      expect(custody.primary.custodianRef).toEqual({
        vaultId: cfg.primary.vaultId,
        walletId: cfg.primary.walletId,
      })

      const accounts = await custody.listAccounts()
      expect(accounts.length).toBeGreaterThan(0)
      expect(
        accounts.some((acct) => acct.address === custody.primary.address),
      ).toBe(true)

      const caps = custody.capabilities()
      expect(caps.nativeOps.has('AccountSet')).toBe(true)
      expect(caps.nativeOps.has('Payment')).toBe(true)
    },
    LIVE_TIMEOUT_MS,
  )

  const itIfDest =
    destAddress === undefined || destAddress === '' ? it.skip : it
  itIfDest(
    'signs and submits a native XRP Payment through Palisade to a terminal state',
    async () => {
      // Full pipeline: the Palisade custody signs and submits a Payment as one
      // governed native op, and we poll it to a terminal status. The destination
      // is a second org wallet (PALISADE_DEST_ADDRESS) — Palisade's native
      // transfer only accepts destinations it knows (org wallets / Address
      // Book), so a random address is rejected with "address not found".
      // Requires both wallets funded (beforeAll), deposits-only lifted, and no
      // approval group — otherwise the SDK throws IntentPendingError (the intent
      // is awaiting manual approval).
      const custody = await PalisadeCustody.create(cfg)
      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        signers: [custody],
        ledger: new XrplLedger(TESTNET_WS),
      })
      await client.connect()
      try {
        const result = await client.xrp.transfer({
          to: destAddress as string,
          amount: '1',
        })
        expect(result.source).toBe('palisade')
        expect(result.txHash).toMatch(/^[0-9A-F]{64}$/u)
      } finally {
        await client.disconnect()
      }
    },
    SUBMIT_TEST_TIMEOUT_MS,
  )

  // FreezeTransaction-as-cancel is custodial-org only and mutates sandbox
  // state; exercise it only against a wallet dedicated to contract testing.
  it.todo('cancel places a reversible freeze hold on a pending intent')
})
