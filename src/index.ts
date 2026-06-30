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

// Error classes are part of the public contract (TDD §11). NOTE (DGE-7462/7463):
// stubbed subset; the full error model lands with DGE-7452.
export {
  SimpleXRPLError,
  CustodyAuthError,
  CustodyApiError,
  AccountNotFoundError,
} from './core/errors.js'

// Core domain types (TDD §4). NOTE (DGE-7463): stubbed subset; the full domain
// model lands with DGE-7452.
export type { Account, AccountRef, CustodianRef } from './core/account.js'
export type {
  Custodian,
  CustodianKind,
  SignerCapabilities,
} from './core/custodian.js'
