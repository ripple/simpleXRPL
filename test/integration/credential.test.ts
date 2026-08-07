import { fundedClientWithSigners } from '../helpers/testnet.js'

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
        expect(created.source).toBe('xrpld')

        // Subject accepts it.
        const accepted = await client.credential.accept(
          { issuer: issuer.classicAddress, credType: 'KYC' },
          { from: subject.classicAddress },
        )
        expect(accepted.source).toBe('xrpld')

        // Read it back through the SDK: retrieve reports it accepted, and it
        // shows up in the subject's credential list.
        const retrieved = await client.credential.retrieve({
          credType: 'KYC',
          issuer: issuer.classicAddress,
          account: subject.classicAddress,
        })
        expect(retrieved.data?.accepted).toBe(true)
        expect(retrieved.data?.credType).toBe('KYC')
        const listed = await client.credential.list({
          account: subject.classicAddress,
        })
        expect(listed.data.some((cred) => cred.credType === 'KYC')).toBe(true)

        // The issuer deletes it, and it drops off both reads.
        const deleted = await client.credential.delete({
          holder: subject.classicAddress,
          credType: 'KYC',
        })
        expect(deleted.source).toBe('xrpld')

        const afterDelete = await client.credential.retrieve({
          credType: 'KYC',
          issuer: issuer.classicAddress,
          account: subject.classicAddress,
        })
        expect(afterDelete.data).toBeUndefined()
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
