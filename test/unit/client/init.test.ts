import {
  AccountNotFoundError,
  AmbiguousAccountError,
  NoSignerError,
  SimpleXRPL,
  SimpleXRPLClient,
  SimpleXRPLError,
} from '../../../src/index.js'

import { makeCustodian } from './test-utils.js'

const XRPLD = 'wss://example.invalid'

describe('SimpleXRPL.init', () => {
  it('returns a SimpleXRPLClient bound to the network', async () => {
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      faucetUrl: 'https://faucet.invalid',
    })
    expect(client).toBeInstanceOf(SimpleXRPLClient)
    expect(client.network.xrpldUrl).toBe(XRPLD)
    expect(client.network.faucetUrl).toBe('https://faucet.invalid')
  })

  it('builds the account index from every signer', async () => {
    const local = makeCustodian('local', ['rLocal1', 'rLocal2'])
    const custody = makeCustodian('ripple-custody', ['rCustody1'])
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [local, custody],
    })
    expect(
      Array.from(client.accounts.keys()).sort((left, right) =>
        left.localeCompare(right),
      ),
    ).toStrictEqual(['rCustody1', 'rLocal1', 'rLocal2'])
    expect(client.accounts.get('rLocal1')?.signer).toBe(local)
    expect(client.accounts.get('rCustody1')?.signer).toBe(custody)
  })

  it('defaults primarySigner to the first signer', async () => {
    const local = makeCustodian('local', ['rA'])
    const custody = makeCustodian('ripple-custody', ['rB'])
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [local, custody],
    })
    expect(client.primarySigner).toBe(local)
  })

  it('honors an explicit primarySigner', async () => {
    const local = makeCustodian('local', ['rA'])
    const custody = makeCustodian('ripple-custody', ['rB'])
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [local, custody],
      primarySigner: custody,
    })
    expect(client.primarySigner).toBe(custody)
  })

  it('rejects a primarySigner that is not among the signers', async () => {
    const local = makeCustodian('local', ['rA'])
    const stranger = makeCustodian('palisade-custody', ['rZ'])
    await expect(
      SimpleXRPL.init({
        xrpldUrl: XRPLD,
        signers: [local],
        primarySigner: stranger,
      }),
    ).rejects.toBeInstanceOf(SimpleXRPLError)
  })

  it('throws AmbiguousAccountError when an r-address is claimed by two custodians', async () => {
    const local = makeCustodian('local', ['rShared'])
    const custody = makeCustodian('ripple-custody', ['rShared'])
    const promise = SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [local, custody],
    })
    await expect(promise).rejects.toBeInstanceOf(AmbiguousAccountError)
    await promise.catch((error: unknown) => {
      expect(error).toBeInstanceOf(AmbiguousAccountError)
      const ambiguous = error as AmbiguousAccountError
      expect(ambiguous.account).toBe('rShared')
      expect(ambiguous.custodians).toStrictEqual(['local', 'ripple-custody'])
    })
  })

  it('does not treat one custodian listing the same address twice as ambiguous', async () => {
    const local = makeCustodian('local', ['rDup', 'rDup'])
    const client = await SimpleXRPL.init({
      xrpldUrl: XRPLD,
      signers: [local],
    })
    expect(client.accounts.size).toBe(1)
    expect(client.accounts.get('rDup')?.signer).toBe(local)
  })

  describe('no-signer mode', () => {
    it('starts empty and usable when no signers are configured', async () => {
      const client = await SimpleXRPL.init({ xrpldUrl: XRPLD })
      expect(client.signers).toStrictEqual([])
      expect(client.primarySigner).toBeUndefined()
      expect(client.accounts.size).toBe(0)
    })

    it('throws NoSignerError from requireSigner and default resolveAccount', async () => {
      const client = await SimpleXRPL.init({ xrpldUrl: XRPLD })
      expect(() => client.requireSigner()).toThrow(NoSignerError)
      expect(() => client.resolveAccount()).toThrow(NoSignerError)
    })
  })

  describe('resolveAccount', () => {
    it('resolves by address, explicit address, signer, and signer/account pair', async () => {
      const local = makeCustodian('local', ['rPrimary', 'rSecond'])
      const client = await SimpleXRPL.init({
        xrpldUrl: XRPLD,
        signers: [local],
      })
      expect(client.resolveAccount('rSecond').address).toBe('rSecond')
      expect(client.resolveAccount({ address: 'rSecond' }).address).toBe(
        'rSecond',
      )
      expect(client.resolveAccount({ signer: local }).address).toBe('rPrimary')
      expect(
        client.resolveAccount({ signer: local, account: 'rSecond' }).address,
      ).toBe('rSecond')
    })

    it('uses the primary signer primary account with no selector', async () => {
      const local = makeCustodian('local', ['rPrimary', 'rSecond'])
      const client = await SimpleXRPL.init({
        xrpldUrl: XRPLD,
        signers: [local],
      })
      expect(client.resolveAccount().address).toBe('rPrimary')
    })

    it('throws AccountNotFoundError for an unknown address', async () => {
      const local = makeCustodian('local', ['rKnown'])
      const client = await SimpleXRPL.init({
        xrpldUrl: XRPLD,
        signers: [local],
      })
      expect(() => client.resolveAccount('rUnknown')).toThrow(
        AccountNotFoundError,
      )
    })

    it('rejects a { signer, account } pair the signer does not own', async () => {
      const local = makeCustodian('local', ['rLocalOwned'])
      const custody = makeCustodian('ripple-custody', ['rCustodyOwned'])
      const client = await SimpleXRPL.init({
        xrpldUrl: XRPLD,
        signers: [local, custody],
      })
      expect(() =>
        client.resolveAccount({ signer: local, account: 'rCustodyOwned' }),
      ).toThrow(AccountNotFoundError)
    })

    it('throws AccountNotFoundError when the primary is not among discovered accounts', async () => {
      const local = makeCustodian('local', ['rReal'], 'rGhostPrimary')
      const client = await SimpleXRPL.init({
        xrpldUrl: XRPLD,
        signers: [local],
      })
      expect(() => client.resolveAccount()).toThrow(AccountNotFoundError)
      expect(() => client.resolveAccount({ signer: local })).toThrow(
        AccountNotFoundError,
      )
    })
  })

  describe('refreshAccounts', () => {
    it('picks up added accounts and drops removed ones', async () => {
      const local = makeCustodian('local', ['rA'])
      const client = await SimpleXRPL.init({
        xrpldUrl: XRPLD,
        signers: [local],
      })
      expect(client.accounts.size).toBe(1)

      local.setAddresses(['rA', 'rB'])
      await client.refreshAccounts()
      expect(
        Array.from(client.accounts.keys()).sort((left, right) =>
          left.localeCompare(right),
        ),
      ).toStrictEqual(['rA', 'rB'])

      local.setAddresses(['rB'])
      await client.refreshAccounts()
      expect(client.accounts.has('rA')).toBe(false)
      expect(() => client.resolveAccount('rA')).toThrow(AccountNotFoundError)
    })
  })
})
