/**
 * Identity types.
 *
 * NOTE (DGE-7463): Minimal stubs of the DGE-7452 domain model — only the fields
 * the Custody discovery/resolution layer needs. When DGE-7452 lands, replace
 * these with the shared definitions. Shapes follow the Technical Design
 * Document §4.
 */

/** A custodian's native identifier for an account. Opaque to the SDK core. */
export type CustodianRef = string | { vaultId: string; walletId: string }

/**
 * One discovered account, keyed by its XRPL r-address (the canonical key the
 * core and verticals use). `custodianRef` is the owning custodian's native id —
 * a Custody account UUID, a Palisade `{vaultId, walletId}` pair, or absent for
 * a local wallet.
 */
export interface Account {
  /** The XRPL r-address (canonical key). */
  address: string
  /** Custodian-side alias, if any. */
  alias?: string
  /** Opaque native id; read only by the owning custodian. */
  custodianRef?: CustodianRef
  /** Optional advisory metadata. */
  metadata?: { kind?: string; tags?: string[] }
}

/**
 * How a caller points at an account. The richer `{ signer, account }` form
 * (TDD §4) is resolved at the client level (DGE-7453) and not modeled here.
 */
export type AccountRef = string | { address?: string; alias?: string }
