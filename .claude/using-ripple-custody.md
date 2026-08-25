# Using Ripple Custody with simpleXRPL

How to wire `RippleCustody` into simpleXRPL and manually run a transaction
end-to-end — from a business-intent call down to an on-ledger result. The
steps below are drawn directly from the live integration tests, which are
the only place in the repo that exercises these paths against a real backend
rather than a mock:

- [`test/integration/ripple-raw.test.ts`](../test/integration/ripple-raw.test.ts) — live XRPL Testnet, raw-signing primitives
- [`test/integration/async-submit.test.ts`](../test/integration/async-submit.test.ts) — the async submission handle
- [`test/unit/ripple-custody/*.test.ts`](../test/unit/ripple-custody/) — every `RippleCustody` code path, against a fake HTTP transport

There is no live sandbox integration test for `RippleCustody` yet — the
manual steps here are the closest thing, run directly against a real
Custody gateway.

## Just run it

[`scripts/custody-e2e-demo.mjs`](../scripts/custody-e2e-demo.mjs) puts every
stage below into one runnable script. The default way to run it is via a
git-ignored `.env` file at the **repo root** (`.env` — not `.env.local` or
anything else; that's the name `.gitignore` already covers alongside
`.env.*` and `*.pem`, and what the rest of the repo's live tier expects, see
`README.md`'s test-tier table):

```bash
npm run build          # the script imports the built package, not src/
set -a && source .env && set +a && npm run demo:custody
```

With no `RIPPLE_CUSTODY_*` vars set (or no `.env` at all), it still runs
Stage 1 for real — faucet-funds two Testnet accounts and submits a live
Payment through the Local signer, e.g.:

```
=== Stage 1 — Local signer, live XRPL Testnet ===
source:      rLuCMK8aGZxBnCV7Mp4docQGmYhMGPiYxi
destination: rGyuNwAHWCD6Eh943yr42NH8nBSNzAZLbH
submitted:   9A6F86FE2C4C347ED7A95DAF0DF721C7435F2E04340E1C84C157FE1EC637EF8A
source:      rippled
```

Put `RIPPLE_CUSTODY_*` (see the script's header comment for the full list)
in `.env` to also run Stage 2 against a real Custody gateway — it prints
what it needs and skips itself cleanly if those vars are absent. An example
`.env` (private key referenced by path, per section 2 below):

```bash
RIPPLE_CUSTODY_GATEWAY_URL=https://<gateway-host>
RIPPLE_CUSTODY_AUTH_SIGNING_KEY=./ripple-custody-signing-key.pem
RIPPLE_CUSTODY_AUTH_TOKEN_URL=https://<auth-host>/realms/<realm>/protocol/openid-connect/token
RIPPLE_CUSTODY_DOMAIN_ID=<domain-id>
RIPPLE_CUSTODY_PRIMARY_ADDRESS=<r-address>
```

Extra runtime flags (also read from `.env` or passed inline):

| Variable | Effect |
|---|---|
| `RIPPLE_CUSTODY_ALLOW_RAW=true` | opt into the raw-signing fallback |
| `CUSTODY_DEMO_SUBMIT=true` + `CUSTODY_DEMO_DESTINATION=<r-address>` | actually submit a real Payment, not just discover — **caution**: native submission goes through Custody's own backend, not the script's `rippledUrl`, so if your primary account is activated on both a production and a test ledger (check `listAccounts()`/`capabilities()` output first), you can't assume this lands on testnet |
| `CUSTODY_DEMO_DEBUG=true` | log every raw HTTP request/response to/from Custody |

## 1. What `RippleCustody` actually does

`RippleCustody` (`src/custodians/ripple/ripple-custody.ts`) wraps the Custody
REST API behind the SDK's `Custodian` interface:

- **Native transactors** (`AccountSet`, `Payment`, etc. — see
  `NATIVE_XRPL_TRANSACTORS`) submit as a governed `v0_CreateTransactionOrder`
  intent. Custody signs and submits atomically; there's no separate signed
  blob to inspect.
- **Everything else** falls back to the raw-signing path
  (`v0_SignManifest` + `Unsafe`), only if you opt in with
  `allowRawSigning: true`.

## 2. Construct a `RippleCustody` instance

Two ways, both ending in an authenticated, account-discovered custodian.

### Option A — explicit options

```ts
import { RippleCustody } from 'simplexrpl'

const custody = await RippleCustody.create({
  gatewayUrl: 'https://custody.example.com',
  auth: {
    signingKey: '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----',
    // publicKey is optional — derived from signingKey if omitted
    tokenUrl: 'https://auth.example.com/oauth/token',
  },
  domainId: 'domain-abc123',
  primary: 'rYourPrimaryAccountAddress...',
  allowRawSigning: true, // needed for any non-native transactor (e.g. Payment)
  defaultTimeoutMs: 60_000,
})
```

`signingKey` can be literal PEM contents or a path to a `.pem` file —
`resolveSigningKeyPem` in `construction.ts` checks for the `-----BEGIN` marker
and reads the file for you if it's a path.

### Option B — from environment variables

This is the path the demo script uses, and the recommended default: put the
five `RIPPLE_CUSTODY_*` vars in a `.env` file at the repo root (see "Just run
it" above for the exact names/example), load it, then call `fromEnv()`:

```bash
set -a && source .env && set +a
```

```ts
import { RippleCustody } from 'simplexrpl'

const custody = await RippleCustody.fromEnv({
  primary: process.env.RIPPLE_CUSTODY_PRIMARY_ADDRESS!,
  allowRawSigning: true,
})
```

`fromEnv()` reads `RIPPLE_CUSTODY_PRIMARY_ADDRESS` from `.env` for you if you
pass it through as shown above — everything else (`gatewayUrl`, `auth.*`,
`domainId`) comes straight from the matching `RIPPLE_CUSTODY_*` vars, no
other wiring needed. Required env vars (`construction.ts` →
`resolveFromEnvOptions`):

| Variable | Purpose |
|---|---|
| `RIPPLE_CUSTODY_GATEWAY_URL` | Custody REST API base URL |
| `RIPPLE_CUSTODY_AUTH_SIGNING_KEY` | Intent-author private key (PEM or path to `.pem`) |
| `RIPPLE_CUSTODY_AUTH_TOKEN_URL` | OAuth token endpoint — the realm-specific path, e.g. `https://<auth-host>/realms/<realm>/protocol/openid-connect/token`, not just the auth host root |
| `RIPPLE_CUSTODY_DOMAIN_ID` | The Custody domain to operate in |

`create()`/`fromEnv()` will:
1. Authenticate against `tokenUrl` and mint a JWT.
2. Call `GET /v1/me` and confirm the authenticated user has access to
   `domainId` (throws `CustodyAuthError` if not).
3. Call `listAccounts()` and validate that `primary` is one of the domain's
   discovered XRPL accounts (throws `AccountNotFoundError` if not).

## 3. Bind it to a `SimpleXRPLClient`

```ts
import { SimpleXRPL } from 'simplexrpl'

const client = await SimpleXRPL.init({
  rippledUrl: 'wss://s.altnet.rippletest.net:51233', // or your production rippled
  signers: [custody],
})
```

From here, every business-intent verb on `client` (`client.xrp`, `client.iou`,
`client.token`, `client.credential`, `client.domain`, `client.account`)
resolves to `custody` automatically for any account it discovered.

## 4. Run a native transaction end-to-end (governed intent)

This is the common path — a native transactor (e.g. a `Payment`) goes through
Custody's governance flow.

**Blocking, wait for terminal state** (mirrors `submitAndWait` in
`ripple-custody.ts`, exercised by `test/unit/ripple-custody/ripple-custody.test.ts`):

```ts
const result = await client.xrp.transfer({
  to: 'rDestinationAddress...',
  amount: '10',
})
// result.source === 'custody-native' (or similar) once the intent resolves
// terminally; result.txHash is the on-ledger hash.
```

**Non-blocking, hand back a handle** (mirrors `submitAsync` +
`IntentObserver`, and the pattern in `test/integration/async-submit.test.ts`
for the Local equivalent):

```ts
import { submitTransactionAsync } from 'simplexrpl'

const account = client.resolveAccount('rYourPrimaryAccountAddress...')
const handle = await submitTransactionAsync(client, {
  transaction: {
    TransactionType: 'Payment',
    Account: account.address,
    Destination: 'rDestinationAddress...',
    Amount: '10000000', // drops
  },
  account,
})

// Poll or block on the handle whenever you're ready — useful for M-of-N
// approval flows that may span hours.
const status = await handle.poll()
// ...or...
const result = await handle.wait()
```

Async submission only works for native transactors — attempting it for a
raw-signed one throws `SimpleXRPLError` (`ripple-custody.ts`'s `submitAsync`).

Resume/inspect a pending intent later via `client.intent`
(`IntentInspector`), without needing the original handle object.

## 5. Run a raw-signed transaction end-to-end (non-native transactor)

When the transactor isn't in `NATIVE_XRPL_TRANSACTORS` and you've set
`allowRawSigning: true`, Custody signs a preimage instead of governing the
whole operation, and *you* submit the resulting blob yourself. This exact
sequence — build preimage → external sign → reassemble → submit — is what
`test/integration/ripple-raw.test.ts` proves against a real testnet account,
just standing in a local wallet for what Custody's vault does:

```ts
import { decode } from 'xrpl'
import {
  assembleSignedTransaction,
  buildSigningPreimage,
} from 'simplexrpl' // internal path: src/custodians/ripple/submission/raw-sign.js

// 1. Autofill the transaction as usual.
const autofilled = await client.ledger.autofill({
  TransactionType: 'Payment',
  Account: sourceAddress,
  Destination: destinationAddress,
  Amount: '10',
})

// 2. Ask Custody to sign it (this is what `custody.sign(tx, ctx)` does under
//    the hood via `signRawTransaction` in submission/raw-flow.ts):
const envelope = await custody.sign(autofilled, {
  ledger: client.ledger,
  // ...other SubmissionContext fields as required by your call site
})

// `envelope.txBlob` is ready to submit; `envelope.hash` is the resulting
// transaction hash, computed locally so you can assert it matches what
// rippled records.
const response = await client.ledger.submitAndWait(envelope.txBlob)
// response.result.meta.TransactionResult === 'tesSUCCESS'
// response.result.hash === envelope.hash
```

Under the hood, `buildSigningPreimage` produces the exact bytes Custody's
`v0_SignManifest` is asked to sign (base64), and
`assembleSignedTransaction` takes the base64 signature Custody returns
(`Core_ManifestValue_Unsafe.signature`) and reassembles the final signed
blob — this is the pair of primitives the integration test exercises
directly, without going through the full `RippleCustody` wrapper, to prove
the wire format survives a real rippled round-trip.

## 6. Dry-run before submitting (optional)

`RippleCustody` supports pre-flighting a write through Custody's dry-run
endpoint before it's actually submitted — set `defaultDryRun: true` at
construction, or pass an equivalent per-call option if your call site exposes
one (see `submission/dry-run.ts`'s `runDryRun`). Useful for surfacing policy
rejections before spending a real submission attempt.

## 7. Manually verifying against a live gateway

There's no packaged integration test for this yet (see
[`docs/custody-integration-tests-e2e.md`](./custody-integration-tests-e2e.md)),
but `scripts/custody-e2e-demo.mjs`'s Stage 2 does exactly what sections 2–3 above
describe: construct via `fromEnv()` → `listAccounts()` → confirm the primary
is discovered → check `capabilities()`.

Put the five `RIPPLE_CUSTODY_*` vars from "Just run it" above into a `.env`
file at the repo root, then:

```bash
npm run build
set -a && source .env && set +a && npm run demo:custody
```

The always-on raw-signing test needs no credentials at all:

```bash
npm run test:integration -- ripple-raw
```
