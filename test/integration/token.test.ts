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
        // Issuer creates a transferable MPT issuance.
        const issued = await client.token.issue({
          assetScale: 0,
          flags: { canTransfer: true },
        })
        expect(issued.source).toBe('rippled')
        expect(issued.txHash).toMatch(/^[0-9A-F]{64}$/u)
        const mptIssuanceId = issued.intent.mptIssuanceId
        expect(mptIssuanceId).toMatch(/^[0-9A-F]{48}$/u)

        // Holder opts in to hold the token.
        const authorized = await client.token.authorize(
          { mptIssuanceId },
          { from: holder.classicAddress },
        )
        expect(authorized.source).toBe('rippled')

        // The issuance object exists on the issuer's account.
        const issuerObjects = await client.ledger.request<{
          result: { account_objects: unknown[] }
        }>({
          command: 'account_objects',
          account: issuer.classicAddress,
          type: 'mpt_issuance',
        })
        expect(
          issuerObjects.result.account_objects.length,
        ).toBeGreaterThanOrEqual(1)

        // Issuer sends 100 base units to the holder.
        const transferred = await client.token.transfer({
          to: holder.classicAddress,
          amount: { asset: mpt(mptIssuanceId, 0), value: '100' },
        })
        expect(transferred.source).toBe('rippled')
        expect(transferred.txHash).toMatch(/^[0-9A-F]{64}$/u)

        // Verify the on-ledger effect: the holder actually holds 100 units.
        const holderObjects = await client.ledger.request<{
          result: {
            account_objects: Array<{
              MPTokenIssuanceID?: string
              MPTAmount?: string
            }>
          }
        }>({
          command: 'account_objects',
          account: holder.classicAddress,
          type: 'mptoken',
        })
        const held = holderObjects.result.account_objects.find(
          (object) => object.MPTokenIssuanceID === mptIssuanceId,
        )
        expect(held?.MPTAmount).toBe('100')
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
