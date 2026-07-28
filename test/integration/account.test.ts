import { fundedTestnetClient } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('Account (live testnet)', () => {
  it(
    'applies AccountSet and reflects the change in account_info',
    async () => {
      const { client, source } = await fundedTestnetClient()
      try {
        const result = await client.account.set({
          requireDest: true,
          domain: 'example.com',
        })
        expect(result.source).toBe('xrpld')

        const info = await client.ledger.request<{
          result: {
            account_data: { Domain?: string }
            account_flags: { requireDestinationTag?: boolean }
          }
        }>({ command: 'account_info', account: source.classicAddress })

        expect(info.result.account_data.Domain).toBe(
          Buffer.from('example.com', 'utf8').toString('hex').toUpperCase(),
        )
        expect(info.result.account_flags.requireDestinationTag).toBe(true)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
