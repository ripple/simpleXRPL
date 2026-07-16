import { fundedClientWithSigners } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('IOU vertical (live testnet)', () => {
  it(
    'issues, locks/unlocks, and transfers an IOU end-to-end',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [issuer, holder] = wallets
      // eslint-disable-next-line n/no-process-env -- IOU.issue sources its bootstrap accounts from these env vars by design
      process.env.XRPL_ISSUER_SEED = issuer.seed
      // eslint-disable-next-line n/no-process-env -- IOU.issue sources its bootstrap accounts from these env vars by design
      process.env.XRPL_HOT_WALLET_SEED = holder.seed
      try {
        // Issuer enables rippling, holder extends trust up to the max
        // allowable limit — the `AccountSet` + `TrustSet` sequence. No value
        // exists yet; `issue` doesn't run a `Payment`.
        const iou = await client.iou.issue({ ticker: 'USD' })
        expect(iou.iouID).toBe(`USD.${issuer.classicAddress}`)

        const linesAfterIssue = await client.ledger.request<{
          result: {
            lines: Array<{ currency: string; limit: string; balance: string }>
          }
        }>({
          command: 'account_lines',
          account: holder.classicAddress,
          peer: issuer.classicAddress,
        })
        const lineAfterIssue = linesAfterIssue.result.lines.find(
          (line) => line.currency === 'USD',
        )
        // The ledger normalizes issued-currency amounts (e.g. returns
        // "9999999999999990e-1"), so compare the limit numerically.
        expect(Number(lineAfterIssue?.limit)).toBe(Number('9'.repeat(15)))
        expect(Number(lineAfterIssue?.balance)).toBe(0)

        // Lock then unlock the holder's line — exercises the two-step
        // Individual Freeze + Deep Freeze sequencing (and its reverse) against
        // the real ledger's precondition that deep freeze requires the line
        // already be individually frozen.
        const locked = await iou.lock({ holder: holder.classicAddress })
        expect(locked.source).toBe('rippled')
        expect(locked.txHash).toMatch(/^[0-9A-F]{64}$/u)

        const unlocked = await iou.unlock({ holder: holder.classicAddress })
        expect(unlocked.source).toBe('rippled')
        expect(unlocked.txHash).toMatch(/^[0-9A-F]{64}$/u)

        // Issuer sends the holder a first balance.
        const transferred = await iou.transfer({
          destination: holder.classicAddress,
          amount: 50,
        })
        expect(transferred.source).toBe('rippled')
        expect(transferred.txHash).toMatch(/^[0-9A-F]{64}$/u)

        // Verify the on-ledger effect of the transfer.
        const linesAfterTransfer = await client.ledger.request<{
          result: { lines: Array<{ currency: string; balance: string }> }
        }>({
          command: 'account_lines',
          account: holder.classicAddress,
          peer: issuer.classicAddress,
        })
        const lineAfterTransfer = linesAfterTransfer.result.lines.find(
          (line) => line.currency === 'USD',
        )
        expect(Number(lineAfterTransfer?.balance)).toBe(50)
      } finally {
        // eslint-disable-next-line n/no-process-env -- cleaning up the seeded env vars after the test
        delete process.env.XRPL_ISSUER_SEED
        // eslint-disable-next-line n/no-process-env -- cleaning up the seeded env vars after the test
        delete process.env.XRPL_HOT_WALLET_SEED
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
