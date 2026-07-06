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

// Error classes are part of the public contract.
// NOTE: stubbed subset; a fuller error model is planned for later.
export {
  SimpleXRPLError,
  CustodyAuthError,
  CustodyApiError,
} from './core/errors.js'
