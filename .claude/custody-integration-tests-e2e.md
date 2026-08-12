# Running the Custody Integration Tests End-to-End

This walks through the `test/integration` suite as it relates to Ripple
Custody transaction flows: what runs out of the box today, and what's
missing. See [`README.md`](../README.md) for the general test tiers and
[`test/integration/ripple-raw.test.ts`](../test/integration/ripple-raw.test.ts)
for the source of truth.

## Why "custody" integration coverage isn't fully running today

| Test file | Custodian path | Gate | Runs in CI? |
|---|---|---|---|
| `ripple-raw.test.ts` | Ripple raw-signing (build preimage → external sign → reassemble → submit) | None — funds itself via the public XRPL Testnet faucet | Yes, every PR (`.github/workflows/ci.yml` → `integration` job) |
| — | Real Ripple Custody API adapter (`custody-http-client.ts`, `custody-auth.service.ts`) | No live/sandbox integration test exists at all — only unit tests under `test/unit/` | N/A |

So today's "custody" coverage that actually exercises a network end-to-end is
the raw-signing path against XRPL Testnet. The Ripple Custody HTTP adapter
has no integration-level test at all yet — unit tests only, with mocked HTTP
— though `scripts/custody-e2e-demo.mjs` (see
[`using-ripple-custody.md`](./using-ripple-custody.md)) exercises it manually
against a real gateway.

## 1. Run the always-on tier (raw-sign, live XRPL Testnet)

No credentials needed — this funds itself via the public faucet.

```bash
npm ci
npm run test:integration -- ripple-raw
```

What it does (see `ripple-raw.test.ts`):
1. `fundedTestnetClient()` faucet-funds a source and destination wallet on
   `wss://s.altnet.rippletest.net:51233` (override with `XRPL_TESTNET_WS`).
2. Builds a `Payment` and autofills it via `client.ledger.autofill(...)`.
3. `buildSigningPreimage(...)` produces the exact bytes a custodian vault
   would be asked to sign (`Core_ManifestValue_Unsafe.signature` equivalent).
4. The funded wallet signs that preimage locally, standing in for the vault.
5. `assembleSignedTransaction(...)` reassembles the signed blob exactly as a
   real signer response would.
6. Submits with `client.ledger.submitAndWait(...)` and asserts
   `tesSUCCESS` plus a matching transaction hash.

Run the full integration tier the same way CI does:

```bash
npm run test:integration -- --runInBand
```

## 2. Ripple Custody API adapter — no packaged live test yet

`custody-http-client.ts` and `custody-auth.service.ts` (the real Ripple
Custody REST client) are only covered by mocked unit tests today:

```bash
npm test -- custody-http-client custody-auth.service ripple-custody
```

There's no `describe.skip`-gated integration test pointed at a live Ripple
Custody gateway yet. The closest thing today is running
[`scripts/custody-e2e-demo.mjs`](../scripts/custody-e2e-demo.mjs) manually
with `RIPPLE_CUSTODY_*` env vars set — see
[`using-ripple-custody.md`](./using-ripple-custody.md) for the full
construction + discovery walkthrough.

To close this gap properly: add a
`test/integration/ripple-custody-contract.test.ts` gated on required env vars
(gateway URL, signing key, token URL, domain id, primary address),
`describe.skip` when absent, mirroring the discover → bind → capabilities →
submit flow the demo script already runs manually.

## Quick reference

```bash
# Everything that runs without any setup:
npm ci
npm run test:integration -- ripple-raw

# Full integration tier, serial (matches CI):
npm run test:integration -- --runInBand

# Manual live-gateway run against Ripple Custody:
npm run build
RIPPLE_CUSTODY_GATEWAY_URL=... RIPPLE_CUSTODY_AUTH_SIGNING_KEY=... \
RIPPLE_CUSTODY_AUTH_TOKEN_URL=... RIPPLE_CUSTODY_DOMAIN_ID=... \
RIPPLE_CUSTODY_PRIMARY_ADDRESS=... \
  npm run demo:custody
```
