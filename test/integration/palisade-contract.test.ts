import { PalisadeCustody } from '../../src/index.js'
import type { PalisadeCustodyConfig } from '../../src/index.js'

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
 */
const LIVE_TIMEOUT_MS = 120_000

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
    primary: { vaultId, walletId },
    // Contract tests exercise the native governance path only; raw signing is
    // covered by unit tests and needs no live account.
    allowRawSigning: false,
  }
}

const config = sandboxConfig()
const describeIfSandbox = config === undefined ? describe.skip : describe

describeIfSandbox('PalisadeCustody (live sandbox contract)', () => {
  // Non-null: describeIfSandbox is `describe.skip` when config is undefined,
  // so the body never runs without a config.
  const cfg = config as PalisadeCustodyConfig

  it(
    'discovers the org wallets and binds the configured primary',
    async () => {
      const custody = await PalisadeCustody.create(cfg)
      expect(custody.kind).toBe('palisade-custody')
      expect(custody.primary.custodianRef).toEqual(cfg.primary)

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

  // A native async submission + handle lifecycle. Left as a documented
  // skeleton: enabling it submits a real governance op against the sandbox
  // wallet, so it needs a funded sandbox account and a policy that keeps the
  // op pending long enough to observe a non-terminal poll. Fill in with an
  // idempotent AccountSet once a disposable sandbox wallet is available.
  it.todo('submitAsync returns a handle that polls to a terminal status')

  // FreezeTransaction-as-cancel is custodial-org only and mutates sandbox
  // state; exercise it only against a wallet dedicated to contract testing.
  it.todo('cancel places a reversible freeze hold on a pending intent')
})
