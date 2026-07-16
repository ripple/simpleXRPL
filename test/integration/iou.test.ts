import type { SimpleXRPLClient } from '../../src/index.js'

import { fundedClientWithSigners } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

/** Trust line as returned by `account_lines` (only the fields we assert). */
interface TrustLine {
  currency: string
  balance: string
  limit: string
  peer_authorized?: boolean
  freeze_peer?: boolean
}

/**
 * Read the holder→issuer USD trust line, or undefined if absent.
 *
 * @param client - The connected client.
 * @param holder - The holder r-address (the `account_lines` account).
 * @param issuer - The issuer r-address (the peer).
 * @returns The USD trust line, or undefined.
 */
async function usdLine(
  client: SimpleXRPLClient,
  holder: string,
  issuer: string,
): Promise<TrustLine | undefined> {
  const lines = await client.ledger.request<{ result: { lines: TrustLine[] } }>(
    { command: 'account_lines', account: holder, peer: issuer },
  )
  return lines.result.lines.find((line) => line.currency === 'USD')
}

/**
 * Seed the env vars `IOU.issue` reads with the funded issuer/holder seeds.
 *
 * @param issuerSeed - The issuer wallet seed.
 * @param holderSeed - The hot-wallet (holder) seed.
 */
function seedEnv(issuerSeed: string, holderSeed: string): void {
  // eslint-disable-next-line n/no-process-env -- IOU.issue sources its accounts from these by design
  process.env.XRPL_ISSUER_SEED = issuerSeed
  // eslint-disable-next-line n/no-process-env -- IOU.issue sources its accounts from these by design
  process.env.XRPL_HOT_WALLET_SEED = holderSeed
}

function clearEnv(): void {
  // eslint-disable-next-line n/no-process-env -- cleaning up the seeded env vars
  delete process.env.XRPL_ISSUER_SEED
  // eslint-disable-next-line n/no-process-env -- cleaning up the seeded env vars
  delete process.env.XRPL_HOT_WALLET_SEED
}

describe('IOU vertical (live testnet)', () => {
  it(
    'issues, freezes/unfreezes (verified on-ledger), and transfers',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [issuer, holder] = wallets
      seedEnv(issuer.seed as string, holder.seed as string)
      try {
        const iou = await client.iou.issue({ ticker: 'USD' })
        expect(iou.iouID).toBe(`USD.${issuer.classicAddress}`)

        const afterIssue = await usdLine(
          client,
          holder.classicAddress,
          issuer.classicAddress,
        )
        expect(Number(afterIssue?.limit)).toBe(Number('9'.repeat(15)))
        expect(Number(afterIssue?.balance)).toBe(0)

        // Lock, and verify the issuer's freeze actually landed on the line.
        await iou.lock({ holder: holder.classicAddress })
        const locked = await usdLine(
          client,
          holder.classicAddress,
          issuer.classicAddress,
        )
        expect(locked?.freeze_peer).toBe(true)

        // Unlock, and verify the freeze cleared.
        await iou.unlock({ holder: holder.classicAddress })
        const unlocked = await usdLine(
          client,
          holder.classicAddress,
          issuer.classicAddress,
        )
        expect(unlocked?.freeze_peer ?? false).toBe(false)

        await iou.transfer({ destination: holder.classicAddress, amount: 50 })
        const afterTransfer = await usdLine(
          client,
          holder.classicAddress,
          issuer.classicAddress,
        )
        expect(Number(afterTransfer?.balance)).toBe(50)
      } finally {
        clearEnv()
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )

  it(
    'claws back a holder balance (issuer clawback enabled)',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [issuer, holder] = wallets
      seedEnv(issuer.seed as string, holder.seed as string)
      try {
        // Clawback must be enabled before the issuer owns any trust lines.
        await client.account.set(
          { clawbackEnabled: true },
          { from: issuer.classicAddress },
        )
        const iou = await client.iou.issue({ ticker: 'USD' })
        await iou.transfer({ destination: holder.classicAddress, amount: 50 })

        const funded = await usdLine(
          client,
          holder.classicAddress,
          issuer.classicAddress,
        )
        expect(Number(funded?.balance)).toBe(50)

        await iou.clawback({ holder: holder.classicAddress, amount: 50 })
        const clawed = await usdLine(
          client,
          holder.classicAddress,
          issuer.classicAddress,
        )
        expect(Number(clawed?.balance)).toBe(0)
      } finally {
        clearEnv()
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )

  it(
    'places a sell offer that rests, then cancels it',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [issuer, holder] = wallets
      seedEnv(issuer.seed as string, holder.seed as string)
      try {
        const iou = await client.iou.issue({ ticker: 'USD' })

        // Issuer offers to sell 10 USD for 5 XRP; it should rest in the book.
        await iou.sellOffer({
          amount: 10,
          orderType: 'limit',
          price: { currency: 'XRP', amount: 5 },
        })
        const resting = await client.ledger.request<{
          result: { offers: Array<{ seq: number }> }
        }>({ command: 'account_offers', account: issuer.classicAddress })
        expect(resting.result.offers.length).toBe(1)
        const offerSequence = resting.result.offers[0].seq

        await iou.cancelOffer({ offerSequence })
        const afterCancel = await client.ledger.request<{
          result: { offers: unknown[] }
        }>({ command: 'account_offers', account: issuer.classicAddress })
        expect(afterCancel.result.offers).toHaveLength(0)
      } finally {
        clearEnv()
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )

  it(
    'authorizes a holder line when the issuer requires authorization',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [issuer, holder] = wallets
      seedEnv(issuer.seed as string, holder.seed as string)
      try {
        // requireAuth must be set before the issuer owns any trust lines.
        await client.account.set(
          { requireAuth: true },
          { from: issuer.classicAddress },
        )
        const iou = await client.iou.issue({ ticker: 'USD' })

        await iou.authorize({ holder: holder.classicAddress })
        const line = await usdLine(
          client,
          holder.classicAddress,
          issuer.classicAddress,
        )
        expect(line?.peer_authorized).toBe(true)
      } finally {
        clearEnv()
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
