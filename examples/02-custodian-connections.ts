/**
 * Custodian-specific connections.
 *
 * Each connector is constructed and authenticated independently, then passed to
 * `SimpleXRPL.init`. Once bound, every vertical verb works the same regardless
 * of which connector owns the acting account — the SDK routes each write to the
 * custodian that holds the account.
 */
import { LocalSigner, PalisadeCustody, SimpleXRPL } from 'simplexrpl'

// --- Local signing (in-process xrpl wallets) ------------------------------

// From a single seed:
const fromSeed = LocalSigner.fromSeed('sEdShHHFs...replace...with...a...seed')

// From explicit wallets (advanced — multiple accounts under one signer):
// const fromWallets = LocalSigner.create({ wallets: [Wallet.generate()] })

// From the environment (scans for seed vars; good for scripts and CI):
const fromEnv = LocalSigner.fromEnv()

// --- Palisade (Wallet-as-a-Service) ---------------------------------------

// Palisade authenticates via OAuth client credentials and acts on a specific
// vault/wallet. `create` exchanges credentials and discovers the org's wallets.
const palisade = await PalisadeCustody.create({
  baseUrl: 'https://api.sandbox.palisade.co',
  clientId: process.env.PALISADE_CLIENT_ID ?? '',
  clientSecret: process.env.PALISADE_CLIENT_SECRET ?? '',
  primary: { vaultId: 'vault-id', walletId: 'wallet-id' },
  // Enable the raw sign-only fallback for transactors Palisade has no native
  // operation for. Off by default.
  allowRawSigning: false,
})

// --- Ripple Custody -------------------------------------------------------
// The Ripple Custody connector is in progress. Once it ships, construct it the
// same way (its own `create(...)`) and add it to `signers` below — no other
// code changes; verbs route to it automatically for its accounts.

// --- Bind the connectors --------------------------------------------------

const client = await SimpleXRPL.init({
  rippledUrl: 'wss://s.altnet.rippletest.net:51233',
  signers: [fromSeed, fromEnv, palisade],
  // The default backend for verbs called without an explicit `from`.
  primarySigner: fromEnv,
})

console.log('connected with', client.signers.length, 'connectors')
await client.disconnect()
