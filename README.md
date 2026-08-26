# simpleXRPL

A high-level TypeScript SDK for the XRP Ledger, scoped to the institutional /
Web2 audience. simpleXRPL collapses the distance between a business intent
(_"transfer this token"_, _"freeze that holder"_, _"issue this credential"_) and
the XRPL transactions that realize it — without forcing the caller to learn
transactor-specific details, flag combinations, or signing-backend differences.

Writes dispatch to one of four signing backends behind a single `Custodian`
abstraction: **local** (`xrpl` wallets), **Ripple Custody**, **Palisade**, and
**external signers** — keys held in a KMS or HSM that never leave the secure
boundary (a built-in AWS KMS adapter ships at `simplexrpl/aws-kms`; other devices
implement the same `ExternalSigner` seam). Reads go straight through `xrpl`.

The SDK ships six business-intent verticals — `xrp`, `iou`, `token`,
`credential`, `domain`, and `account` — behind a single `SimpleXRPL.init(...)`
entry point.

> **Status:** pre-1.0 and under active development. The public API may still
> change between releases.

## Requirements

- Node.js >= 20.19 (`.nvmrc` pins the dev version to 22)

simpleXRPL is **Node-targeted** and not intended to run in the browser. For
browser-based reads or local signing, use the [`xrpl`](https://www.npmjs.com/package/xrpl)
package directly.

## Installation

```bash
npm install simplexrpl
```

## Quick start

```ts
import { SimpleXRPL, LocalSigner } from 'simplexrpl'

// Bind one or more signing backends and connect to a network.
const client = await SimpleXRPL.init({
  xrpldUrl: 'wss://s.altnet.rippletest.net:51233',
  signers: [LocalSigner.fromEnv()],
})

// Each vertical exposes business-intent operations; the SDK builds, signs, and
// submits the underlying XRPL transaction for you.
await client.xrp.transfer({ to: 'rDestination...', amount: '10' })
```

See the [API reference](./docs/api-md/README.md) for every vertical, method, and
type, and [`examples/`](./examples) for runnable, type-checked samples. Writes
dispatch to whichever signing backend owns the account — local, Ripple Custody,
Palisade, or an external signer — with no change to the call.

## Native operations and the raw-signing fallback

Each custodian models a subset of XRPL transactors as **native operations**: the
SDK hands the backend a structured, typed operation, and the backend's own
controls — transfer policies, allow-lists, and M-of-N approval rules — can
inspect what they are approving.

For anything outside that subset, the SDK can fall back to **raw signing**: it
builds and validates the transaction locally, then asks the backend to sign an
opaque payload. This is off by default and must be enabled per custodian with
`allowRawSigning: true`.

> [!WARNING]
> On the raw path the custodian cannot inspect what it is signing. Its
> transaction-level policies and approval rules operate on operation semantics,
> and a raw payload has none to read — Ripple Custody types it `Unsafe` for
> exactly this reason, and additionally requires the operator to enable that
> manifest capability server-side. Protocol validation still runs (xrpl's
> `validate()` executes on every path, so malformed transactions are still
> rejected); what you lose is the custodian's ability to reason about intent.
>
> Treat `allowRawSigning` as a deliberate, audited exception rather than a
> default. Where a transactor matters to your controls, prefer a signing backend
> that models it natively.

Which transactors are native differs per backend — see
[`docs/connector-routing.md`](./docs/connector-routing.md) for the current
matrix, and note that a transactor can be native while a specific _field_ on it
is not, in which case that call also takes the raw path.

## Development

Install dependencies with `npm install`.

The package ships a **dual ESM + CJS build** and is type-checked with `tsc`;
tests run on Jest via `ts-jest`.

| Script                     | What it does                                                              |
| -------------------------- | ------------------------------------------------------------------------- |
| `npm run typegen`          | Regenerate committed custodian types from the vendored specs (`openapi/`) |
| `npm run typecheck`        | `tsc --noEmit` over the public surface                                    |
| `npm run build`            | Clean, then emit `dist/esm` + `dist/cjs` and stamp `type` markers         |
| `npm test`                 | Unit tier (offline)                                                       |
| `npm run test:integration` | Live tier (testnet, `--runInBand`)                                        |
| `npm run lint`             | ESLint (type-aware)                                                       |
| `npm run format`           | Prettier write                                                            |
| `npm run docgen`           | TypeDoc reference (HTML) into `docs/api`                                  |
| `npm run docgen:md`        | TypeDoc reference (Markdown) into `docs/api-md`                           |
| `npm run docgen:routing`   | Generate the connector routing table into `docs/connector-routing.md`     |

### Custodian types are generated, not hand-authored

`openapi-typescript` turns the pinned specs in [`openapi/`](./openapi) into
`src/generated/{custody,palisade}.ts`. The compiler then checks each adapter's
mapping against the real contract, so an upstream API change surfaces as a type
error instead of a silent drift. The generated files are **committed** (CI fails
if they drift from the specs); regenerate with `npm run typegen` when bumping a
vendored spec.

## License

ISC
