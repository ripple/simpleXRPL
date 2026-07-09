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

// Internal domain model: the Custodian seam, accounts, capabilities, and the
// typed submission result.
export * from './domain/index.js'

// Typed error hierarchy (the single canonical error module; the Custody adapter
// imports these too).
export * from './errors.js'

// Injected I/O ports (HTTP, ledger, clock, logger) — advanced / testing seams.
export * from './ports/index.js'
