import type { Account } from '../../../src/domain/index.js'
import { AccountNotFoundError } from '../../../src/errors.js'
import { AccountContext } from '../../../src/custodians/ripple/discovery/account-context.js'

import { makeFakeSigner } from './test-utils.js'

const SIGNER = makeFakeSigner()

const ACCOUNTS: Account[] = [
  {
    address: 'rTreasury',
    alias: 'treasury',
    custodianRef: 'acc-1',
    signer: SIGNER,
  },
  { address: 'rOps', custodianRef: 'acc-2', signer: SIGNER },
]

describe('AccountContext', () => {
  it('lists the indexed accounts', () => {
    const ctx = new AccountContext(ACCOUNTS)
    expect(ctx.list().map((account) => account.address)).toEqual([
      'rTreasury',
      'rOps',
    ])
  })

  it('resolves by r-address, alias, and object refs', () => {
    const ctx = new AccountContext(ACCOUNTS)
    expect(ctx.resolve('rTreasury')).toEqual({
      address: 'rTreasury',
      accountId: 'acc-1',
    })
    expect(ctx.resolve('treasury').accountId).toBe('acc-1')
    expect(ctx.resolve({ address: 'rOps' }).accountId).toBe('acc-2')
    expect(ctx.resolve({ alias: 'treasury' }).accountId).toBe('acc-1')
  })

  it('throws AccountNotFoundError for an unknown reference', () => {
    const ctx = new AccountContext(ACCOUNTS)
    expect(() => ctx.resolve('rNope')).toThrow(AccountNotFoundError)
    expect(() => ctx.resolve({ alias: 'missing' })).toThrow(
      AccountNotFoundError,
    )
  })

  it('throws when the matched account has no Custody id', () => {
    const ctx = new AccountContext([{ address: 'rNoRef', signer: SIGNER }])
    expect(() => ctx.resolve('rNoRef')).toThrow(AccountNotFoundError)
  })

  it('validatePrimary passes for a discovered primary and throws otherwise', () => {
    const ctx = new AccountContext(ACCOUNTS)
    expect(() => ctx.validatePrimary('rTreasury')).not.toThrow()
    expect(() => ctx.validatePrimary('rUnknown')).toThrow(AccountNotFoundError)
  })
})
