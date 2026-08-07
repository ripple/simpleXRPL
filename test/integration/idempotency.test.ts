import { fundedTestnetClient } from '../helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000
const UUID_V7_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u

describe('Idempotency key (live testnet)', () => {
  it(
    'surfaces a fresh UUIDv7 idempotency key on each submission',
    async () => {
      const { client, destination } = await fundedTestnetClient()
      try {
        const first = await client.xrp.transfer({
          to: destination.classicAddress,
          amount: '5',
        })
        expect(first.source).toBe('xrpld')
        expect(first.idempotencyKey).toMatch(UUID_V7_RE)

        const second = await client.xrp.transfer({
          to: destination.classicAddress,
          amount: '5',
        })
        // A distinct submission gets a distinct, later-sorting key.
        expect(second.idempotencyKey).toMatch(UUID_V7_RE)
        expect(second.idempotencyKey).not.toBe(first.idempotencyKey)
        // Local dedupes on-ledger by Sequence; custody backends dedupe on this
        // key (exercised in the contract tier, which needs a sandbox).
        expect(
          (first.idempotencyKey ?? '') < (second.idempotencyKey ?? ''),
        ).toBe(true)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
