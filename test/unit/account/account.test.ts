import { AccountSetAsfFlags, Wallet } from 'xrpl'
import type { AccountSet, DepositPreauth, Payment, SetRegularKey } from 'xrpl'

import { IntentValidationError, SimpleXRPLError } from '../../../src/index.js'
import { recordingClient } from '../helpers/recording-ledger.js'

describe('Account vertical', () => {
  it('create generates a fresh local keypair without touching the ledger', async () => {
    const { client, txs } = await recordingClient()
    const created = client.account.create()
    expect(created.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/u)
    expect(created.seed).toMatch(/^s[1-9A-HJ-NP-Za-km-z]+$/u)
    expect(created.publicKey.length).toBeGreaterThan(0)
    expect(created.privateKey.length).toBeGreaterThan(0)
    // Purely local: nothing was submitted.
    expect(txs).toHaveLength(0)
    // Each call is a distinct account.
    expect(client.account.create().address).not.toBe(created.address)
  })

  it('fund faucets the destination then enables defaultRipple', async () => {
    const { client, txs, fauceted } = await recordingClient()
    const created = client.account.create()
    await client.account.fund({ destination: created.address })
    expect(fauceted).toStrictEqual([created.address])
    // A single AccountSet enabling defaultRipple, signed by the new account.
    const tx = txs[0] as AccountSet
    expect(tx.TransactionType).toBe('AccountSet')
    expect(tx.Account).toBe(created.address)
    expect(tx.SetFlag).toBe(AccountSetAsfFlags.asfDefaultRipple)
  })

  it('activate pays from the operator then enables defaultRipple', async () => {
    const { client, txs, signers } = await recordingClient()
    const operator = signers[0].classicAddress
    const created = client.account.create()
    await client.account.activate({
      destination: created.address,
      amount: '10',
    })
    // First a Payment from the operator to the new account (10 XRP → drops).
    const payment = txs[0] as Payment
    expect(payment.TransactionType).toBe('Payment')
    expect(payment.Account).toBe(operator)
    expect(payment.Destination).toBe(created.address)
    expect(payment.Amount).toBe('10000000')
    // Then defaultRipple on the new account.
    const settings = txs[1] as AccountSet
    expect(settings.TransactionType).toBe('AccountSet')
    expect(settings.Account).toBe(created.address)
    expect(settings.SetFlag).toBe(AccountSetAsfFlags.asfDefaultRipple)
  })

  it('activate defaults the amount to the network base reserve plus a buffer', async () => {
    const { client, txs } = await recordingClient()
    // Report a 10 XRP base reserve; the default funding must clear it with room
    // for the follow-up defaultRipple fee, or the new account is stuck.
    Object.defineProperty(client.ledger, 'request', {
      value: async () => ({
        result: { info: { validated_ledger: { reserve_base_xrp: 10 } } },
      }),
    })
    const created = client.account.create()
    await client.account.activate({ destination: created.address })
    // 10 XRP reserve + 1 XRP buffer = 11 XRP.
    expect((txs[0] as Payment).Amount).toBe('11000000')
  })

  it('activate reports a server_info that does not disclose the base reserve', async () => {
    const { client } = await recordingClient()
    Object.defineProperty(client.ledger, 'request', {
      value: async () => ({ result: { info: {} } }),
    })
    const created = client.account.create()
    await expect(
      client.account.activate({ destination: created.address }),
    ).rejects.toThrow(/base reserve/u)
  })

  it('fund throws when the ledger has no faucet', async () => {
    const { client } = await recordingClient()
    const created = client.account.create()
    // Strip the faucet capability to simulate a non-faucet network.
    Object.defineProperty(client.ledger, 'fundViaFaucet', { value: undefined })
    await expect(
      client.account.fund({ destination: created.address }),
    ).rejects.toBeInstanceOf(SimpleXRPLError)
  })

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

  it('set rejects disabling more than one flag in a call', async () => {
    // An AccountSet carries at most one ClearFlag; silently dropping the second
    // would leave a flag the caller believes is off still enabled.
    const { client } = await recordingClient()
    await expect(
      client.account.set({ requireDest: false, requireAuth: false }),
    ).rejects.toThrow(/disables at most one flag/u)
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
