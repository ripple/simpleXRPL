import type {
  Account,
  Custodian,
  CustodianKind,
  SignerCapabilities,
} from '../../../src/index.js'

// A test custodian whose discovered accounts can be changed between calls.
export interface FakeCustodian extends Custodian {
  setAddresses: (addresses: readonly string[]) => void
}

// Build a fake custodian that discovers `addresses` (each account back-refers to
// this custodian). `primaryAddress` defaults to the first address.
export function makeCustodian(
  kind: CustodianKind,
  addresses: readonly string[],
  primaryAddress: string = addresses[0],
): FakeCustodian {
  let current = addresses
  // Declared before the closures below so account.signer can back-reference it.
  let custodian: FakeCustodian

  const capabilities = (): SignerCapabilities => ({
    nativeOps: new Set(),
    allowRaw: false,
  })
  const listAccounts = async (): Promise<Account[]> =>
    current.map((address) => ({ address, signer: custodian }))
  const notImplemented = async (): Promise<never> => {
    throw new Error('not implemented in tests')
  }
  const setAddresses = (next: readonly string[]): void => {
    current = next
  }

  custodian = {
    kind,
    primary: { address: primaryAddress },
    capabilities,
    listAccounts,
    sign: notImplemented,
    submitAndWait: notImplemented,
    submitAsync: notImplemented,
    setAddresses,
  }
  return custodian
}
