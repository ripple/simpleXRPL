# Examples

Runnable, copy-pasteable code samples for simpleXRPL. Every file is a
self-contained TypeScript module that imports from `simplexrpl` and is
type-checked against the current API (`npm run typecheck:examples`), so the
samples can't drift from the code.

They illustrate the API surface; running them live needs a funded testnet
account (and, for the Palisade samples, sandbox credentials).

## SDK mechanics

| File | Shows |
| ---- | ----- |
| [01-initialization.ts](./01-initialization.ts) | Choosing a network, connectors, primary signer, and binding/registering accounts |
| [02-custodian-connections.ts](./02-custodian-connections.ts) | Constructing each connector (Local, Palisade, Ripple Custody) |
| [03-account-discovery.ts](./03-account-discovery.ts) | Listing, resolving, and re-discovering accounts across connectors |
| [04-routing-report.ts](./04-routing-report.ts) | Reporting how each transactor routes for an account (`dispatch` / `isNativePath`) |

## Operations

| File | Shows |
| ---- | ----- |
| [05-rwa-through-ripple-custody.ts](./05-rwa-through-ripple-custody.ts) | Issuing a Real-World Asset as an MPT (XLS-89 metadata) through Ripple Custody |
| [06-iou-issue-and-distribute.ts](./06-iou-issue-and-distribute.ts) | Issuing and distributing an IOU |
| [07-place-dex-order.ts](./07-place-dex-order.ts) | Placing DEX orders (IOU offers and generic token offers) |
| [08-permissioned-domain.ts](./08-permissioned-domain.ts) | Creating a permissioned domain and scoping an offer to it |
| [09-cross-custodian-workflow.ts](./09-cross-custodian-workflow.ts) | Sequencing work across two custodians — Ripple Custody + Palisade — via vertical verbs and `runMultiStep` |
