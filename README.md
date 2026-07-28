# simpleXRPL

A high-level TypeScript SDK for the XRP Ledger, scoped to the institutional /
Web2 audience. simpleXRPL collapses the distance between a business intent
(_"transfer this token"_, _"freeze that holder"_, _"issue this credential"_) and
the XRPL transactions that realize it — without forcing the caller to learn
transactor-specific details, flag combinations, or signing-backend differences.

Writes dispatch to one of three signing backends behind a single `Custodian`
abstraction: **local** (`xrpl` wallets), **Ripple Custody**, and **Palisade**.
Reads go straight through `xrpl`.

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

See the [API reference](#) for every vertical, method, and type. Writes dispatch
to whichever signing backend owns the account — local, Ripple Custody, or
Palisade — with no change to the call.

## Development

Install dependencies with `npm install`.



The package ships a **dual ESM + CJS build** and is type-checked with `tsc`;
tests run on Jest via `ts-jest`.

| Script                     | What it does                                                            |
| -------------------------- | ----------------------------------------------------------------------- |
| `npm run typegen`          | Regenerate committed custodian types from the vendored specs (`openapi/`) |
| `npm run typecheck`        | `tsc --noEmit` over the public surface                                  |
| `npm run build`            | Clean, then emit `dist/esm` + `dist/cjs` and stamp `type` markers        |
| `npm test`                 | Unit tier (offline)                                                     |
| `npm run test:integration` | Live tier (testnet, `--runInBand`)                                      |
| `npm run lint`             | ESLint (type-aware)                                                     |
| `npm run format`           | Prettier write                                                          |
| `npm run docgen`           | TypeDoc reference (HTML) into `docs/api`                                 |
| `npm run docgen:md`        | TypeDoc reference (Markdown) into `docs/api-md`                          |
| `npm run docgen:routing`   | Generate the connector routing table into `docs/connector-routing.md`   |

### Custodian types are generated, not hand-authored

`openapi-typescript` turns the pinned specs in [`openapi/`](./openapi) into
`src/generated/{custody,palisade}.ts`. The compiler then checks each adapter's
mapping against the real contract, so an upstream API change surfaces as a type
error instead of a silent drift. The generated files are **committed** (CI fails
if they drift from the specs); regenerate with `npm run typegen` when bumping a
vendored spec.

## License

ISC
