/**
 * simpleXRPL — a high-level TypeScript SDK for the XRP Ledger.
 *
 * This is the package entry point. The public surface (`SimpleXRPL.init`, the
 * verticals, core types, and error classes) is built out incrementally.
 *
 * @packageDocumentation
 */

// Relative imports use the NodeNext `.js` extension convention so the emitted
// ESM build resolves at runtime; see CLAUDE.md.
export { VERSION } from './version.js'

// Entry point: `SimpleXRPL.init(...)` and the runtime client.
export * from './client/index.js'

// Local signing backend (wallets held in-process).
export * from './custodians/local/index.js'

// External signing backend (KMS/HSM — key never leaves the secure boundary).
export * from './custodians/external/index.js'

// Ripple Custody signing backend (native + raw-signing paths).
export * from './custodians/ripple/index.js'

// Palisade custodian (native Submit* mapping + raw sign-only path).
export * from './custodians/palisade/index.js'

// Amount & asset model (XRP / IOU / MPT representation + decimal/scale conversion).
export * from './amount/index.js'

// Note: multi-step orchestration (`runMultiStep`) is intentionally internal —
// callers sequence work through the vertical verbs, which route each step to
// the owning custodian, rather than assembling raw `(Transaction, Account)`
// steps themselves.

// Verticals (business-intent verbs), e.g. `client.xrp.transfer`, `IOU.issue`.
export * from './verticals/index.js'

// Production ledger port.
export * from './ledger/index.js'

// Pipeline machinery (dispatch, submission host) — advanced / testing seams.
export * from './pipeline/index.js'

// Client-generated id generation (time-ordered UUIDv7 for idempotency).
export * from './ids/index.js'

// Internal domain model: the Custodian seam, accounts, capabilities, and the
// typed submission result.
export * from './domain/index.js'

// Typed error hierarchy (the single canonical error module; the Custody adapter
// imports these too).
export * from './errors.js'

// Injected I/O ports (HTTP, ledger, clock, logger) — advanced / testing seams.
export * from './ports/index.js'

// Re-exported `xrpl` types that appear in this SDK's public API (LedgerPort,
// SubmitRequest, SubmissionResult, Custodian) so callers can build on those
// seams without depending on `xrpl` directly.
export type { SubmitResponse, Transaction, TxResponse } from 'xrpl'

// Read-model helpers (currency decode, credential-free account resolution).
export {
  decodeCurrency,
  dropsToXrpString,
  readAccountAddress,
} from './reads/read-helpers.js'

// Shaped-offer read model (shared by the `listOffers` verbs).
export type { ListOffersResult, OfferSummary } from './reads/offers.js'
