import { mpt } from '../../src/index.js'

import { fundedClientWithSigners } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('Token MPT (live testnet)', () => {
  it(
    'issues, authorizes a holder, and transfers an MPT end-to-end',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [issuer, holder] = wallets
      try {
        // Issuer creates a transferable MPT issuance with a 0.5% transfer fee.
        const issued = await client.token.issue({
          assetScale: 0,
          transferFee: 0.5,
          metadata: {
            ticker: 'TBILL',
            name: 'T-Bill Token',
            icon: 'https://example.org/icon.png',
            asset_class: 'other',
            issuer_name: 'Example Co.',
          },
          flags: { canTransfer: true },
        })
        expect(issued.source).toBe('xrpld')
        expect(issued.txHash).toMatch(/^[0-9A-F]{64}$/u)
        const mptIssuanceId = issued.intent.mptIssuanceId
        expect(mptIssuanceId).toMatch(/^[0-9A-F]{48}$/u)

        // Holder opts in to hold the token.
        const authorized = await client.token.authorize(
          { mptIssuanceId },
          { from: holder.classicAddress },
        )
        expect(authorized.source).toBe('xrpld')

        // Read the issuance back through the SDK: flags, fee, and metadata are
        // decoded from the real ledger response.
        const retrieved = await client.token.retrieve({ mptIssuanceId })
        expect(retrieved.data?.issuer).toBe(issuer.classicAddress)
        expect(retrieved.data?.transferFee).toBe(0.5)
        expect(retrieved.data?.flags.canTransfer).toBe(true)
        expect(retrieved.data?.metadata?.ticker).toBe('TBILL')

        // The issuer (primary signer) lists it among its issuances.
        const issued2 = await client.token.list({ role: 'issuer' })
        expect(issued2.tokens).toContain(mptIssuanceId)

        // Issuer sends 100 base units to the holder.
        const transferred = await client.token.transfer({
          to: holder.classicAddress,
          amount: { asset: mpt(mptIssuanceId, 0), value: '100' },
        })
        expect(transferred.source).toBe('xrpld')
        expect(transferred.txHash).toMatch(/^[0-9A-F]{64}$/u)

        // Read the holding back through the SDK: the holder holds 100 units.
        const holdings = await client.token.list({
          role: 'holder',
          account: holder.classicAddress,
        })
        const held = holdings.data.find(
          (entry) => entry.tokenID === mptIssuanceId,
        )
        expect(held?.balance).toBe('100')
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
