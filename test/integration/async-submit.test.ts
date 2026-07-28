import { xrpToDrops } from 'xrpl'
import type { Payment } from 'xrpl'

import { submitTransactionAsync } from '../../src/index.js'

import { fundedTestnetClient } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('Async submission handle (live testnet)', () => {
  it(
    'returns a handle whose wait() resolves to the on-ledger result',
    async () => {
      const { client, source, destination } = await fundedTestnetClient()
      try {
        const transaction: Payment = {
          TransactionType: 'Payment',
          Account: source.classicAddress,
          Destination: destination.classicAddress,
          Amount: xrpToDrops('10'),
        }
        const account = client.resolveAccount(source.classicAddress)

        const handle = await submitTransactionAsync(client, {
          transaction,
          account,
        })

        // Local terminalizes on submit: the handle id is the on-ledger hash.
        expect(handle.kind).toBe('local')
        expect(handle.id).toMatch(/^[0-9A-F]{64}$/u)

        const result = await handle.wait()
        expect(result.source).toBe('xrpld')
        expect(result.txHash).toBe(handle.id)

        // A poll after terminal yields the same terminal result.
        const polled = await handle.poll()
        expect(polled.txHash).toBe(handle.id)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
