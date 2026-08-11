import { fundedTestnetClient } from '../helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

interface RegularKeyInfo {
  result: { account_data: { RegularKey?: string } }
}

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

  it(
    'sets and then removes a regular key, reflected in account_info',
    async () => {
      // setRegularKey changes who may sign for the account, so the on-ledger
      // effect (and the removal, which omits the field entirely) is worth
      // proving live rather than only asserting the built transaction.
      const { client, source, destination } = await fundedTestnetClient()
      try {
        const set = await client.account.setRegularKey({
          regularKey: destination.classicAddress,
        })
        expect(set.source).toBe('xrpld')

        const request = {
          command: 'account_info',
          account: source.classicAddress,
          ledger_index: 'validated',
        } as const
        const withKey = await client.ledger.request<RegularKeyInfo>(request)
        expect(withKey.result.account_data.RegularKey).toBe(
          destination.classicAddress,
        )

        // Omitting `regularKey` removes it.
        const removed = await client.account.setRegularKey()
        expect(removed.source).toBe('xrpld')
        const withoutKey = await client.ledger.request<RegularKeyInfo>(request)
        expect(withoutKey.result.account_data.RegularKey).toBeUndefined()
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
