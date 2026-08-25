import { buildAccountIndex } from '../../../src/client/account-index.js'
import type {
  Account,
  Custodian,
  CustodianKind,
} from '../../../src/domain/index.js'
import {
  AmbiguousAccountError,
  NetworkMismatchError,
} from '../../../src/index.js'

const notImplemented = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/** One discovered record: an r-address optionally scoped to a network. */
interface Record {
  address: string
  networkId?: number
  ledgerId?: string
}

/**
 * Build a custodian whose `listAccounts` returns exactly `records` (each
 * back-referencing the custodian), with the given primary address.
 *
 * @param kind - The custodian kind.
 * @param primaryAddress - The custodian's primary r-address.
 * @param records - The records this custodian discovers.
 * @returns The stub custodian.
 */
function makeSigner(
  kind: CustodianKind,
  primaryAddress: string,
  records: readonly Record[],
): Custodian {
  const custodian: Custodian = {
    kind,
    primary: { address: primaryAddress },
    capabilities: () => ({ nativeOps: new Set(), allowRaw: false }),
    listAccounts: async (): Promise<Account[]> =>
      records.map((record) => ({
        address: record.address,
        networkId: record.networkId,
        ledgerId: record.ledgerId,
        signer: custodian,
      })),
    sign: notImplemented,
    submitAndWait: notImplemented,
    submitAsync: notImplemented,
  }
  return custodian
}

/**
 * A `resolveNetworkId` stub that resolves `value` and counts its invocations.
 *
 * @param value - The network id to resolve.
 * @returns The stub function paired with a live call counter.
 */
function resolver(value: number | undefined): {
  fn: () => Promise<number | undefined>
  calls: () => number
} {
  let count = 0
  return {
    async fn(): Promise<number | undefined> {
      count += 1
      return value
    },
    calls: (): number => count,
  }
}

describe('buildAccountIndex network selection', () => {
  it('binds the record on the connected network when an address spans several', async () => {
    const custody = makeSigner('ripple-custody', 'rMulti', [
      { address: 'rMulti', networkId: 0, ledgerId: 'xrpl-mainnet' },
      { address: 'rMulti', networkId: 1, ledgerId: 'xrpl-testnet' },
    ])
    const probe = resolver(1)

    const { index, networkId } = await buildAccountIndex([custody], probe.fn)

    expect(networkId).toBe(1)
    expect(index.get('rMulti')?.ledgerId).toBe('xrpl-testnet')
    expect(index.get('rMulti')?.networkId).toBe(1)
  })

  it('leaves a non-primary address unbound when it exists only on another network', async () => {
    const custody = makeSigner('ripple-custody', 'rPrimary', [
      { address: 'rPrimary', networkId: 1, ledgerId: 'xrpl-testnet' },
      { address: 'rMainnetOnly', networkId: 0, ledgerId: 'xrpl-mainnet' },
    ])
    const probe = resolver(1)

    const { index } = await buildAccountIndex([custody], probe.fn)

    expect(index.has('rPrimary')).toBe(true)
    expect(index.has('rMainnetOnly')).toBe(false)
  })

  it('throws NetworkMismatchError when a primary exists only on another network', async () => {
    const custody = makeSigner('ripple-custody', 'rPrimary', [
      { address: 'rPrimary', networkId: 0, ledgerId: 'xrpl-mainnet' },
    ])
    const probe = resolver(1)

    const promise = buildAccountIndex([custody], probe.fn)

    await expect(promise).rejects.toBeInstanceOf(NetworkMismatchError)
    await promise.catch((error: unknown) => {
      const mismatch = error as NetworkMismatchError
      expect(mismatch.account).toBe('rPrimary')
      expect(mismatch.clientNetworkId).toBe(1)
      expect(mismatch.availableNetworkIds).toStrictEqual([0])
    })
  })

  it('never probes the network when no record is network-scoped', async () => {
    const local = makeSigner('local', 'rLocal1', [
      { address: 'rLocal1' },
      { address: 'rLocal2' },
    ])
    const probe = resolver(1)

    const { index, networkId } = await buildAccountIndex([local], probe.fn)

    expect(probe.calls()).toBe(0)
    expect(networkId).toBeUndefined()
    expect(
      Array.from(index.keys()).sort((left, right) => left.localeCompare(right)),
    ).toStrictEqual(['rLocal1', 'rLocal2'])
  })

  it('keeps a network-agnostic (local) account alongside a network-scoped one', async () => {
    const custody = makeSigner('ripple-custody', 'rCustody', [
      { address: 'rCustody', networkId: 1, ledgerId: 'xrpl-testnet' },
    ])
    const local = makeSigner('local', 'rLocal', [{ address: 'rLocal' }])
    const probe = resolver(1)

    const { index } = await buildAccountIndex([custody, local], probe.fn)

    expect(index.get('rCustody')?.signer).toBe(custody)
    expect(index.get('rLocal')?.signer).toBe(local)
  })

  it('still rejects an address claimed by two custodians as ambiguous', async () => {
    const custody = makeSigner('ripple-custody', 'rShared', [
      { address: 'rShared', networkId: 1 },
    ])
    const local = makeSigner('local', 'rShared', [{ address: 'rShared' }])
    const probe = resolver(1)

    await expect(
      buildAccountIndex([custody, local], probe.fn),
    ).rejects.toBeInstanceOf(AmbiguousAccountError)
  })

  it('cannot disambiguate a multi-network primary when the probe fails, and errors', async () => {
    const custody = makeSigner('ripple-custody', 'rMulti', [
      { address: 'rMulti', networkId: 0 },
      { address: 'rMulti', networkId: 1 },
    ])
    const probe = resolver(undefined)

    const promise = buildAccountIndex([custody], probe.fn)

    await expect(promise).rejects.toBeInstanceOf(NetworkMismatchError)
    await promise.catch((error: unknown) => {
      const mismatch = error as NetworkMismatchError
      expect(mismatch.account).toBe('rMulti')
      expect(mismatch.clientNetworkId).toBeUndefined()
      expect(
        Array.from(mismatch.availableNetworkIds).sort(
          (left, right) => left - right,
        ),
      ).toStrictEqual([0, 1])
    })
  })
})
