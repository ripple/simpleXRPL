import { PalisadeWalletContext } from '../../../src/custodians/palisade/discovery/wallet-context.js'
import type { Account } from '../../../src/domain/index.js'
import { AccountNotFoundError } from '../../../src/errors.js'

import { makeFakeSigner } from './test-utils.js'

const SIGNER = makeFakeSigner()

const ACCOUNTS: Account[] = [
  {
    address: 'rTreasury',
    alias: 'treasury',
    custodianRef: { vaultId: 'vault-1', walletId: 'wallet-1' },
    signer: SIGNER,
  },
  {
    address: 'rOps',
    custodianRef: { vaultId: 'vault-1', walletId: 'wallet-2' },
    signer: SIGNER,
  },
]

describe('PalisadeWalletContext', () => {
  it('lists the indexed accounts', () => {
    const ctx = new PalisadeWalletContext(ACCOUNTS)
    expect(ctx.list().map((account) => account.address)).toEqual([
      'rTreasury',
      'rOps',
    ])
  })

  it('resolves by r-address, alias, and object refs', () => {
    const ctx = new PalisadeWalletContext(ACCOUNTS)
    expect(ctx.resolve('rTreasury')).toEqual({
      address: 'rTreasury',
      vaultId: 'vault-1',
      walletId: 'wallet-1',
    })
    expect(ctx.resolve('treasury').walletId).toBe('wallet-1')
    expect(ctx.resolve({ address: 'rOps' }).walletId).toBe('wallet-2')
    expect(ctx.resolve({ alias: 'treasury' }).walletId).toBe('wallet-1')
  })

  it('throws AccountNotFoundError for an unknown reference', () => {
    const ctx = new PalisadeWalletContext(ACCOUNTS)
    expect(() => ctx.resolve('rNope')).toThrow(AccountNotFoundError)
    expect(() => ctx.resolve({ alias: 'missing' })).toThrow(
      AccountNotFoundError,
    )
  })

  it('throws when the matched account has no Palisade vault/wallet ref', () => {
    const ctx = new PalisadeWalletContext([
      { address: 'rNoRef', signer: SIGNER },
    ])
    expect(() => ctx.resolve('rNoRef')).toThrow(AccountNotFoundError)
  })

  it('throws when the matched account has a string (Custody-shaped) ref', () => {
    const ctx = new PalisadeWalletContext([
      { address: 'rWrongShape', custodianRef: 'custody-uuid', signer: SIGNER },
    ])
    expect(() => ctx.resolve('rWrongShape')).toThrow(AccountNotFoundError)
  })

  it('validatePrimary passes for a discovered primary and throws otherwise', () => {
    const ctx = new PalisadeWalletContext(ACCOUNTS)
    expect(() => ctx.validatePrimary('rTreasury')).not.toThrow()
    expect(() => ctx.validatePrimary('rUnknown')).toThrow(AccountNotFoundError)
  })
})
