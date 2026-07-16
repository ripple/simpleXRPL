import { fundedClientWithSigners } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('Domain (live testnet)', () => {
  it(
    'creates, verifies, and deletes a permissioned domain',
    async () => {
      // The accepted-credential issuer must be a real (funded) account, so use
      // a second funded wallet rather than a generated address.
      const { client, wallets } = await fundedClientWithSigners(2)
      const [owner, issuer] = wallets
      try {
        const created = await client.domain.create({
          credList: [{ issuer: issuer.classicAddress, credType: 'KYC' }],
        })
        expect(created.source).toBe('rippled')
        expect(created.intent.domainID).toMatch(/^[0-9A-F]{64}$/u)

        const objects = await client.ledger.request<{
          result: { account_objects: unknown[] }
        }>({
          command: 'account_objects',
          account: owner.classicAddress,
          type: 'permissioned_domain',
        })
        expect(objects.result.account_objects.length).toBeGreaterThanOrEqual(1)

        const deleted = await client.domain.delete({
          domain: created.intent.domainID,
        })
        expect(deleted.source).toBe('rippled')

        // The domain is gone from the owner's objects after deletion.
        const afterDelete = await client.ledger.request<{
          result: { account_objects: unknown[] }
        }>({
          command: 'account_objects',
          account: owner.classicAddress,
          type: 'permissioned_domain',
        })
        expect(afterDelete.result.account_objects).toHaveLength(0)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
