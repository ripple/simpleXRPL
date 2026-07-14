import { fundedClientWithSigners } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('DepositPreauth (live testnet)', () => {
  it(
    'authorizes and then unauthorizes another account',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [owner, authorized] = wallets
      try {
        const granted = await client.account.depositPreauth({
          authorize: authorized.classicAddress,
        })
        expect(granted.source).toBe('rippled')

        // A DepositPreauth object now sits under the owner.
        const objects = await client.ledger.request<{
          result: { account_objects: unknown[] }
        }>({
          command: 'account_objects',
          account: owner.classicAddress,
          type: 'deposit_preauth',
        })
        expect(objects.result.account_objects).toHaveLength(1)

        // Revoking it removes the object.
        const revoked = await client.account.depositPreauth({
          unauthorize: authorized.classicAddress,
        })
        expect(revoked.source).toBe('rippled')

        const afterRevoke = await client.ledger.request<{
          result: { account_objects: unknown[] }
        }>({
          command: 'account_objects',
          account: owner.classicAddress,
          type: 'deposit_preauth',
        })
        expect(afterRevoke.result.account_objects).toHaveLength(0)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
