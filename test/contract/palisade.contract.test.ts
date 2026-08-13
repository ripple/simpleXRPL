import type { Payment } from 'xrpl'

import { PalisadeCustody, SimpleXRPL, XrplLedger } from '../../src/index.js'
import type { Account, PalisadeCustodyConfig } from '../../src/index.js'
import { ensureFunded, TESTNET_WS } from '../helpers/testnet.js'

import { contractSuite } from './helpers/contract-gate.js'

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
const describeIfSandbox = contractSuite('Palisade', [
  'PALISADE_BASE_URL',
  'PALISADE_WALLETS_CLIENT_ID',
  'PALISADE_WALLETS_CLIENT_SECRET',
  'PALISADE_TX_CLIENT_ID',
  'PALISADE_TX_CLIENT_SECRET',
  'PALISADE_VAULT_ID',
  'PALISADE_WALLET_ID',
])

/* eslint-disable n/no-process-env -- optional contract-test inputs from the environment */
// A second org wallet's r-address, used as the Payment destination.
const destAddress = process.env.PALISADE_DEST_ADDRESS
// NOTE: no cancel/freeze test. `handle.cancel()` was removed for Palisade —
// see TODO(palisade-cancel) in tx-tracker.ts. Freezing a pending intent is
// rejected (`400 "cannot freeze/unfreeze transaction"`, PAL010.008) and the API
// exposes no reject/cancel-approval endpoint, so it can't be tested end-to-end.
// Opt-in flag for the raw sign-only test: raw signing must be enabled in the
// wallet's settings, otherwise every raw tx comes back a policy Violation.
//
// The earlier "Invalid signature" failure on this path was ours, not Palisade's:
// we sent `encode` output, but the endpoint signs the caller's bytes verbatim
// and adds no prefix, so the signature covered the wrong preimage. Sending
// `encodeForSigning` output (STX-prefixed) resolves it — confirmed by Palisade
// against Testnet on both signOnly modes.
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

  // Palisade signs raw transactions asynchronously — the POST to
  // `/transactions/raw` returns before `signedTransaction` is populated — so
  // sign() polls until the signature is ready (a sign-only tx stops at SIGNED).
  // Opt-in: needs a raw-permitting wallet (PALISADE_RAW_TEST) and a known
  // destination; the polling itself is covered by unit tests.
  const itIfRaw = rawOptIn && destAddress ? it : it.skip
  itIfRaw(
    'raw-signs a non-native transactor and submits it through the ledger',
    async () => {
      // A Payment carrying InvoiceID has no native Palisade transfer slot, so
      // it falls back to the raw sign-only path: Palisade signs asynchronously
      // (polled to SIGNED), then the SDK submits the blob through the shared
      // ledger — the result is xrpld-sourced, not palisade-governed. The
      // destination is the known org wallet the native transfer test also uses,
      // so it clears the wallet's transfer policy.
      const custody = await PalisadeCustody.create({
        ...cfg,
        allowRawSigning: true,
      })
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
        InvoiceID: 'A'.repeat(64),
      }
      try {
        const result = await custody.submitAndWait(payment, {
          account,
          ledger,
          timeoutMs: SUBMIT_TIMEOUT_MS,
        })
        expect(result.source).toBe('xrpld')
        expect(result.txHash).toMatch(/^[0-9A-F]{64}$/u)
        // Emit the validated hash so a contract run leaves independently
        // checkable evidence in the log (this path had a signing regression).
        // eslint-disable-next-line no-console -- deliberate evidence in the contract-run log
        console.log(
          `raw-signed tx validated on XRPL: ${result.txHash as string}`,
        )
      } finally {
        await ledger.disconnect()
      }
    },
    SUBMIT_TEST_TIMEOUT_MS,
  )

  it(
    'tag-based routing sends a scoped operation to its registered credential',
    async () => {
      // Listing wallet transactions is a `Transactions`-tagged GET. Under
      // method-based routing (a) it goes to the wallet-read credential, which
      // lacks transaction-read scope → 403. Registering a `Transactions`-scoped
      // credential (b) routes it there instead, and it succeeds — proving the
      // scope override changes which credential authorizes the call.
      const args = {
        path: { vaultId: cfg.primary.vaultId, walletId: cfg.primary.walletId },
      } as const

      const unscoped = await PalisadeCustody.create(cfg)
      await expect(
        unscoped.api.call('TransactionsService_ListWalletTransactions', args),
      ).rejects.toThrow()

      const scoped = await PalisadeCustody.create({
        ...cfg,
        credentials: {
          ...cfg.credentials,
          scoped: { Transactions: cfg.credentials.transactions },
        },
      })
      const res = await scoped.api.call(
        'TransactionsService_ListWalletTransactions',
        args,
      )
      expect(res.transactions).toBeDefined()
    },
    LIVE_TIMEOUT_MS,
  )

  it(
    'signs and submits a native AccountSet through Palisade',
    async () => {
      // AccountSet maps to Palisade's native /xrp/account-set endpoint. Set a
      // benign Domain (non-gating, unlike a flag) so it can't affect the other
      // tests, and confirm it reaches a terminal palisade-governed result.
      const custody = await PalisadeCustody.create(cfg)
      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        signers: [custody],
        ledger: new XrplLedger(TESTNET_WS),
      })
      await client.connect()
      try {
        const result = await client.account.set({
          domain: 'contract-test.simplexrpl.example',
        })
        expect(result.source).toBe('palisade')
        expect(result.txHash).toMatch(/^[0-9A-F]{64}$/u)
      } finally {
        await client.disconnect()
      }
    },
    SUBMIT_TEST_TIMEOUT_MS,
  )

  it(
    'places and cancels a native DEX offer through Palisade',
    async () => {
      // OfferCreate and OfferCancel map to Palisade's native /xrp/offer-create
      // and /xrp/offer-cancel. The primary issues USD; rest a limit sell offer,
      // then cancel it by sequence — both are palisade-governed native ops.
      const custody = await PalisadeCustody.create(cfg)
      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        signers: [custody],
        ledger: new XrplLedger(TESTNET_WS),
      })
      await client.connect()
      try {
        const offer = await client.iou.sellOffer({
          ticker: 'USD',
          amount: '1',
          orderType: 'limit',
          price: { currency: 'XRP', amount: '1' },
        })
        expect(offer.source).toBe('palisade')
        expect(offer.txHash).toMatch(/^[0-9A-F]{64}$/u)

        const mine = await client.account.listOffers()
        expect(mine.data.length).toBeGreaterThan(0)
        const cancel = await client.iou.cancelOffer({
          offerSequence: mine.data[mine.data.length - 1].offerSequence,
        })
        expect(cancel.source).toBe('palisade')
      } finally {
        await client.disconnect()
      }
    },
    SUBMIT_TEST_TIMEOUT_MS,
  )

  // NOTE: intent polling for Palisade is covered by the submitAsync test above
  // (handle.poll()/wait()). The client-level `client.intent.status/await`
  // resume-by-id surface is RippleCustody-only: it requires an `IntentObserver`
  // custodian, and Palisade's GET-transaction is wallet-scoped (no global
  // /transactions/{id}), so an intent id alone can't address it.
})
