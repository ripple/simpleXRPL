import type { Payment } from 'xrpl'

import { PalisadeCustody, SimpleXRPL, XrplLedger } from '../../src/index.js'
import type { Account, PalisadeCustodyConfig } from '../../src/index.js'

import { ensureFunded, TESTNET_WS } from './helpers/testnet.js'

/**
 * Palisade contract tests: run the real adapter against a live Palisade
 * sandbox to verify our assumptions about its API still hold.
 *
 * These are gated on sandbox credentials and skip entirely when they're
 * absent — CI and local offline runs stay green without a Palisade account.
 * Palisade scopes one permission set per credential, so a full setup needs two
 * credentials: a wallet-read one (discovery) and a transactions one (signing).
 * Provide all of the following env vars to enable them:
 *
 *   PALISADE_BASE_URL              HTTPS base URL of the sandbox
 *   PALISADE_WALLETS_CLIENT_ID     Wallet-read credential's client id
 *   PALISADE_WALLETS_CLIENT_SECRET Wallet-read credential's client secret
 *   PALISADE_TX_CLIENT_ID          Transactions credential's client id
 *   PALISADE_TX_CLIENT_SECRET      Transactions credential's client secret
 *   PALISADE_VAULT_ID              Primary wallet's vault id
 *   PALISADE_WALLET_ID             Primary wallet id
 *
 * Optional:
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
    PALISADE_WALLETS_CLIENT_ID: walletsId,
    PALISADE_WALLETS_CLIENT_SECRET: walletsSecret,
    PALISADE_TX_CLIENT_ID: txId,
    PALISADE_TX_CLIENT_SECRET: txSecret,
    PALISADE_VAULT_ID: vaultId,
    PALISADE_WALLET_ID: walletId,
  } = env
  // Treat blank as absent: an unset GitHub Actions secret expands to an empty
  // string (not `undefined`), so `=== undefined` alone would let the suite run
  // with empty credentials and fail the token exchange instead of skipping.
  if (
    !baseUrl ||
    !walletsId ||
    !walletsSecret ||
    !txId ||
    !txSecret ||
    !vaultId ||
    !walletId
  ) {
    return undefined
  }
  return {
    baseUrl,
    credentials: {
      wallets: { clientId: walletsId, clientSecret: walletsSecret },
      transactions: { clientId: txId, clientSecret: txSecret },
    },
    primary: { vaultId, walletId },
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

/* eslint-disable n/no-process-env -- optional contract-test inputs from the environment */
// A second org wallet's r-address, used as the Payment destination.
const destAddress = process.env.PALISADE_DEST_ADDRESS
// A credential scoped to the `Policies` permission set — enables the tag-based
// routing (option b) test; skipped when absent.
const policyClientId = process.env.PALISADE_POLICY_CLIENT_ID
const policyClientSecret = process.env.PALISADE_POLICY_CLIENT_SECRET
// Opt-in flag for the mutating freeze/cancel test, which needs a wallet whose
// approval policy keeps intents pending long enough to freeze.
const cancelOptIn = process.env.PALISADE_CANCEL_TEST
// Opt-in flag for the raw-signing test: Palisade signs raw transactions
// asynchronously (the POST returns before `signedTransaction` is populated),
// and the SDK's sign() reads it synchronously — so this only passes against a
// wallet/tier that returns the signature inline. See notes on the test.
const rawOptIn = process.env.PALISADE_RAW_TEST
/* eslint-enable n/no-process-env */

describeIfSandbox('PalisadeCustody (live sandbox contract)', () => {
  // Non-null: describeIfSandbox is `describe.skip` when config is undefined,
  // so the body never runs without a config.
  const cfg = config as PalisadeCustodyConfig

  // Setup: faucet-fund the primary (discovered via the wallets credential) and,
  // when configured, the destination wallet — so the Payment has a balance to
  // send and a live recipient. Idempotent. Requires the sandbox wallets to live
  // on the same network as TESTNET_WS's faucet.
  beforeAll(async () => {
    const custody = await PalisadeCustody.create(cfg)
    await ensureFunded(custody.primary.address)
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

  // The typed secondary surface (`palisade.api.call`) against the live API.
  // Read-only operations only — safe to run without mutating sandbox state.
  describe('palisade.api (typed secondary surface)', () => {
    it(
      'lists org wallets via api.call, routing to the wallet-read credential',
      async () => {
        const custody = await PalisadeCustody.create(cfg)
        const result = await custody.api.call(
          'VaultService_ListGlobalWallets',
          {
            query: { pageSize: 100 },
          },
        )

        // The generated route resolves, the read credential authorizes, and the
        // response is typed: the configured primary is in the org's wallet list.
        expect(result.wallets).toBeDefined()
        expect(
          result.wallets?.some(
            (wallet) =>
              wallet.id === cfg.primary.walletId &&
              wallet.vaultId === cfg.primary.vaultId,
          ),
        ).toBe(true)
      },
      LIVE_TIMEOUT_MS,
    )

    it(
      'reads wallet balances via api.call, interpolating live path params',
      async () => {
        const custody = await PalisadeCustody.create(cfg)
        const balances = await custody.api.call(
          'BalanceService_GetWalletBalances',
          {
            path: {
              vaultId: cfg.primary.vaultId,
              walletId: cfg.primary.walletId,
            },
            query: { currencyCode: 'USD' },
          },
        )

        // Path params interpolated into `/v2/vaults/{vaultId}/wallets/{walletId}
        // /balances` and the response echoes the requested currency.
        expect(balances.currencyCode).toBe('USD')
      },
      LIVE_TIMEOUT_MS,
    )
  })

  itIfDest(
    'submitAsync returns a handle that polls and waits to a terminal state',
    async () => {
      // The async native path: Palisade accepts the intent and hands back a
      // handle to observe, rather than blocking to terminal like submitAndWait.
      const custody = await PalisadeCustody.create(cfg)
      const ledger = new XrplLedger(TESTNET_WS)
      const accounts = await custody.listAccounts()
      const account = accounts.find(
        (acct) => acct.address === custody.primary.address,
      ) as Account
      const payment: Payment = {
        TransactionType: 'Payment',
        Account: custody.primary.address,
        Destination: destAddress as string,
        Amount: '1',
      }
      try {
        const handle = await custody.submitAsync(payment, {
          account,
          ledger,
          async: true,
          timeoutMs: SUBMIT_TIMEOUT_MS,
        })
        expect(handle.kind).toBe('palisade-custody')
        expect(typeof handle.id).toBe('string')
        expect(handle.id.length).toBeGreaterThan(0)

        // A non-blocking snapshot, then block to a terminal state.
        const snapshot = await handle.poll()
        expect(snapshot.source).toBe('palisade')
        const final = await handle.wait(SUBMIT_TIMEOUT_MS)
        expect(final.source).toBe('palisade')
        expect(final.txHash).toMatch(/^[0-9A-F]{64}$/u)
      } finally {
        await ledger.disconnect()
      }
    },
    SUBMIT_TEST_TIMEOUT_MS,
  )

  // Palisade signs raw transactions asynchronously: the POST to
  // `/transactions/raw` returns before `signedTransaction` is populated, and
  // sign() reads it inline (it does not poll like the native path). So this
  // runs only when PALISADE_RAW_TEST names a wallet/tier that signs inline.
  const itIfRaw = rawOptIn ? it : it.skip
  itIfRaw(
    'raw-signs a non-native transactor and submits it through the ledger',
    async () => {
      // MPTokenIssuanceCreate has no native Palisade op, so with raw signing
      // enabled it takes the sign-only path and submits through the shared XRPL
      // ledger — the result is xrpld-sourced, not palisade-governed.
      const custody = await PalisadeCustody.create({
        ...cfg,
        allowRawSigning: true,
      })
      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        signers: [custody],
        ledger: new XrplLedger(TESTNET_WS),
      })
      await client.connect()
      try {
        const result = await client.token.issue({
          metadata: {
            ticker: 'RAWT',
            name: 'Raw Path Contract Test',
            icon: 'https://example.com/raw.png',
            asset_class: 'other',
            issuer_name: 'simpleXRPL contract test',
          },
        })
        expect(result.source).toBe('xrpld')
        expect(result.intent.mptIssuanceId).toMatch(/^[0-9A-F]+$/u)
      } finally {
        await client.disconnect()
      }
    },
    SUBMIT_TEST_TIMEOUT_MS,
  )

  // FreezeTransaction-as-cancel mutates sandbox state and needs an intent that
  // stays pending (an approval policy) — opt in with PALISADE_CANCEL_TEST and a
  // wallet dedicated to contract testing; skipped otherwise.
  const itIfCancel = cancelOptIn ? it : it.skip
  itIfCancel(
    'cancel places a reversible freeze hold on a pending intent',
    async () => {
      const custody = await PalisadeCustody.create(cfg)
      const ledger = new XrplLedger(TESTNET_WS)
      const accounts = await custody.listAccounts()
      const account = accounts.find(
        (acct) => acct.address === custody.primary.address,
      ) as Account
      const payment: Payment = {
        TransactionType: 'Payment',
        Account: custody.primary.address,
        Destination: destAddress ?? custody.primary.address,
        Amount: '1',
      }
      try {
        const handle = await custody.submitAsync(payment, {
          account,
          ledger,
          async: true,
          timeoutMs: SUBMIT_TIMEOUT_MS,
        })
        expect(handle.cancel).toBeDefined()
        // Freeze the still-pending intent; a terminal one would reject.
        await (handle.cancel as () => Promise<void>)()
        const after = await handle.poll()
        expect(after.source).toBe('palisade')
      } finally {
        await ledger.disconnect()
      }
    },
    SUBMIT_TEST_TIMEOUT_MS,
  )

  // Tag-based routing (option b) needs a credential scoped to the operation's
  // permission set; supply PALISADE_POLICY_CLIENT_ID/SECRET to enable it.
  const itIfPolicy = policyClientId && policyClientSecret ? it : it.skip
  itIfPolicy(
    'routes a scoped operation to its registered credential (tag-based)',
    async () => {
      const custody = await PalisadeCustody.create({
        ...cfg,
        credentials: {
          ...cfg.credentials,
          scoped: {
            Policies: {
              clientId: policyClientId as string,
              clientSecret: policyClientSecret as string,
            },
          },
        },
      })
      // A `Policies`-scoped GET authorizes through the registered credential,
      // not the wallet-read one its HTTP method would otherwise select.
      const limits = await custody.api.call(
        'PolicyService_ListGlobalWalletLimits',
      )
      expect(limits.walletLimits).toBeDefined()
    },
    LIVE_TIMEOUT_MS,
  )
})
