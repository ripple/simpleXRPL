import { AccountSetAsfFlags, Wallet } from 'xrpl'
import type { AccountSet, DepositPreauth, SetRegularKey } from 'xrpl'

import { IntentValidationError, SimpleXRPLError } from '../../../src/index.js'
import { recordingClient } from '../helpers/recording-ledger.js'

describe('Account vertical', () => {
  it('set maps named boolean flags to SetFlag/ClearFlag', async () => {
    const enabled = await recordingClient()
    await enabled.client.account.set({ requireDest: true })
    expect((enabled.txs[0] as AccountSet).SetFlag).toBe(
      AccountSetAsfFlags.asfRequireDest,
    )
    expect((enabled.txs[0] as AccountSet).ClearFlag).toBeUndefined()

    const disabled = await recordingClient()
    await disabled.client.account.set({ requireDest: false })
    expect((disabled.txs[0] as AccountSet).ClearFlag).toBe(
      AccountSetAsfFlags.asfRequireDest,
    )
    expect((disabled.txs[0] as AccountSet).SetFlag).toBeUndefined()
  })

  it('set enables one flag while disabling another, plus fields', async () => {
    const { client, txs } = await recordingClient()
    await client.account.set({
      defaultRipple: true,
      requireAuth: false,
      domain: 'example.com',
      transferRate: 2,
      tickSize: 5,
    })
    const tx = txs[0] as AccountSet
    expect(tx.SetFlag).toBe(AccountSetAsfFlags.asfDefaultRipple)
    expect(tx.ClearFlag).toBe(AccountSetAsfFlags.asfRequireAuth)
    expect(tx.Domain).toBe(
      Buffer.from('example.com', 'utf8').toString('hex').toUpperCase(),
    )
    // 2% → integer rate 1e9 * 1.02
    expect(tx.TransferRate).toBe(1_020_000_000)
    expect(tx.TickSize).toBe(5)
  })

  it('set rejects an out-of-range transferRate percentage', async () => {
    const { client } = await recordingClient()
    await expect(
      client.account.set({ transferRate: 150 }),
    ).rejects.toBeInstanceOf(SimpleXRPLError)
  })

  it('set maps the clawback and locking flags', async () => {
    const { client, txs } = await recordingClient()
    await client.account.set({ clawbackEnabled: true })
    expect((txs[0] as AccountSet).SetFlag).toBe(
      AccountSetAsfFlags.asfAllowTrustLineClawback,
    )
  })

  it('set rejects an empty parameter set', async () => {
    const { client } = await recordingClient()
    await expect(client.account.set({})).rejects.toBeInstanceOf(SimpleXRPLError)
  })

  it('set rejects enabling more than one flag in a call', async () => {
    const { client } = await recordingClient()
    await expect(
      client.account.set({ requireDest: true, requireAuth: true }),
    ).rejects.toBeInstanceOf(SimpleXRPLError)
  })

  it('set rejects an out-of-range TickSize as IntentValidationError', async () => {
    const { client } = await recordingClient()
    await expect(client.account.set({ tickSize: 20 })).rejects.toBeInstanceOf(
      IntentValidationError,
    )
  })

  it('setRegularKey sets the key, and omits it to remove', async () => {
    const withKey = await recordingClient()
    const regularKey = Wallet.generate().classicAddress
    await withKey.client.account.setRegularKey({ regularKey })
    expect((withKey.txs[0] as SetRegularKey).RegularKey).toBe(regularKey)

    const removed = await recordingClient()
    await removed.client.account.setRegularKey()
    expect((removed.txs[0] as SetRegularKey).RegularKey).toBeUndefined()
  })

  it('depositPreauth authorizes an account', async () => {
    const { client, txs } = await recordingClient()
    const authorize = Wallet.generate().classicAddress
    await client.account.depositPreauth({ authorize })
    const tx = txs[0] as DepositPreauth
    expect(tx.TransactionType).toBe('DepositPreauth')
    expect(tx.Authorize).toBe(authorize)
    expect(tx.Unauthorize).toBeUndefined()
  })

  it('depositPreauth unauthorizes an account', async () => {
    const { client, txs } = await recordingClient()
    const unauthorize = Wallet.generate().classicAddress
    await client.account.depositPreauth({ unauthorize })
    const tx = txs[0] as DepositPreauth
    expect(tx.TransactionType).toBe('DepositPreauth')
    expect(tx.Unauthorize).toBe(unauthorize)
    expect(tx.Authorize).toBeUndefined()
  })
})
