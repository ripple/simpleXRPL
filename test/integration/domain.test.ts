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
        expect(created.source).toBe('xrpld')
        expect(created.intent.domainID).toMatch(/^[0-9A-F]{64}$/u)

        // Read it back through the SDK: retrieve echoes the accepted-credential
        // list (decoded from hex), and it appears in the owner's domain list.
        const domainID = created.intent.domainID
        const retrieved = await client.domain.retrieve({ domainID })
        expect(retrieved.data?.owner).toBe(owner.classicAddress)
        expect(retrieved.data?.credList).toEqual([
          { issuer: issuer.classicAddress, credType: 'KYC' },
        ])
        const listed = await client.domain.list()
        expect(listed.domains).toContain(domainID)

        const deleted = await client.domain.delete({ domain: domainID })
        expect(deleted.source).toBe('xrpld')

        // After deletion the domain is absent from both reads.
        expect(
          (await client.domain.retrieve({ domainID })).data,
        ).toBeUndefined()
        expect((await client.domain.list()).domains).not.toContain(domainID)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
