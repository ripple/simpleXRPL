import { fundedClientWithSigners } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('Credential (live testnet)', () => {
  it(
    'issues a credential and the subject accepts it',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [issuer, subject] = wallets
      try {
        // Issuer (primary signer) issues the credential.
        const created = await client.credential.issue({
          destination: subject.classicAddress,
          credType: 'KYC',
        })
        expect(created.source).toBe('rippled')

        // Subject accepts it.
        const accepted = await client.credential.accept(
          { issuer: issuer.classicAddress, credType: 'KYC' },
          { from: subject.classicAddress },
        )
        expect(accepted.source).toBe('rippled')

        // The accepted credential is on-ledger under the subject.
        const objects = await client.ledger.request<{
          result: { account_objects: unknown[] }
        }>({
          command: 'account_objects',
          account: subject.classicAddress,
          type: 'credential',
        })
        expect(objects.result.account_objects.length).toBeGreaterThanOrEqual(1)

        // The issuer deletes it, and it drops off the subject's objects.
        const deleted = await client.credential.delete({
          holder: subject.classicAddress,
          credType: 'KYC',
        })
        expect(deleted.source).toBe('rippled')

        const afterDelete = await client.ledger.request<{
          result: { account_objects: unknown[] }
        }>({
          command: 'account_objects',
          account: subject.classicAddress,
          type: 'credential',
        })
        expect(afterDelete.result.account_objects).toHaveLength(0)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
