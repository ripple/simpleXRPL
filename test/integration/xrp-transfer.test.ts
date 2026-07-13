import { fundedTestnetClient } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('XRP.transfer (live testnet)', () => {
  it(
    'funds accounts, transfers XRP, and confirms the payment on-ledger',
    async () => {
      const { client, destination } = await fundedTestnetClient()
      try {
        const result = await client.xrp.transfer({
          to: destination.classicAddress,
          amount: '10',
        })

        expect(result.source).toBe('rippled')
        expect(result.txHash).toMatch(/^[0-9A-F]{64}$/u)
        expect(result.intent).toStrictEqual({
          to: destination.classicAddress,
          amount: '10',
        })
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
