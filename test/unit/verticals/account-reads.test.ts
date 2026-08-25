import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import { LocalSigner, SimpleXRPL, SimpleXRPLError } from '../../../src/index.js'
import type {
  LedgerPort,
  LedgerRequest,
  SimpleXRPLClient,
} from '../../../src/index.js'

/**
 * A ledger that answers `account_info` with a canned snapshot.
 *
 * @param requests - Captures each ledger request for assertions.
 * @param balanceDrops - The `Balance` to report, in drops.
 * @returns The fake ledger.
 */
function fakeLedger(
  requests: LedgerRequest[],
  balanceDrops = '25000000',
): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => tx,
    submit: async () => ({}) as never,
    submitAndWait: async () => ({}) as never,
    async request<T>(req: LedgerRequest): Promise<T> {
      requests.push(req)
      return {
        result: {
          account_data: {
            Account: req.account,
            // 25 XRP, in drops, unless the test overrides it.
            Balance: balanceDrops,
            Sequence: 7,
            OwnerCount: 2,
          },
          account_flags: { defaultRipple: true, requireAuthorization: false },
        },
      } as unknown as T
    },
  }
}

async function signerClient(
  requests: LedgerRequest[],
): Promise<SimpleXRPLClient> {
  return SimpleXRPL.init({
    xrpldUrl: 'wss://x.invalid',
    signers: [LocalSigner.fromSeed(Wallet.generate().seed as string)],
    ledger: fakeLedger(requests),
  })
}

describe('Account.retrieve — drops→XRP is exact at every scale', () => {
  // `String(dropsToXrp(drops))` silently truncated above 2^53 drops (~9.007e9
  // XRP), because xrpl returns a JS number: 50000000000000001 drops read back
  // as "50000000000", losing a whole drop with no error. Balances at that scale
  // are real (treasury and escrow accounts) and this is the value callers
  // reconcile against, so the conversion is done in decimal.
  it.each([
    ['1', '0.000001'],
    ['25000000', '25'],
    ['9007199254740991', '9007199254.740991'],
    ['9007199254740993', '9007199254.740993'],
    ['50000000000000001', '50000000000.000001'],
    ['100000000000000001', '100000000000.000001'],
  ])('reports %s drops as %s XRP', async (drops, xrp) => {
    const client = await SimpleXRPL.init({
      xrpldUrl: 'wss://x.invalid',
      signers: [LocalSigner.fromSeed(Wallet.generate().seed as string)],
      ledger: fakeLedger([], drops),
    })
    const { data } = await client.account.retrieve()
    expect(data.xrpBalance).toBe(xrp)
  })
})

describe('Account.retrieve', () => {
  it('shapes account_info: drops→XRP, sequence, ownerCount, flags', async () => {
    const client = await signerClient([])
    const { data } = await client.account.retrieve()
    expect(data.xrpBalance).toBe('25')
    expect(data.sequence).toBe(7)
    expect(data.ownerCount).toBe(2)
    expect(data.flags.defaultRipple).toBe(true)
    expect(data.address).toBe(client.primaryAddress())
  })

  it('reads an explicit account without a signer', async () => {
    const requests: LedgerRequest[] = []
    const client = await SimpleXRPL.init({
      xrpldUrl: 'wss://x.invalid',
      ledger: fakeLedger(requests),
    })
    const { data } = await client.account.retrieve({
      account: 'rSomeAccount000000000000000000000000',
    })
    expect(data.address).toBe('rSomeAccount000000000000000000000000')
    expect(requests[0].account).toBe('rSomeAccount000000000000000000000000')
  })

  it('throws without a signer and without an account', async () => {
    const client = await SimpleXRPL.init({
      xrpldUrl: 'wss://x.invalid',
      ledger: fakeLedger([]),
    })
    await expect(client.account.retrieve()).rejects.toBeInstanceOf(
      SimpleXRPLError,
    )
  })
})
