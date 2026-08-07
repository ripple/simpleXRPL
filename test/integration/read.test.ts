import { Client } from 'xrpl'

import { SimpleXRPL, SimpleXRPLError, XrplLedger } from '../../src/index.js'
import { TESTNET_WS } from '../helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('Reads without a signer (live testnet)', () => {
  it(
    'retrieves a funded account through a credential-free client',
    async () => {
      // Fund a fresh account with the faucet, then read it back through a
      // client that holds no signers at all — reads need no credentials.
      const faucet = new Client(TESTNET_WS)
      await faucet.connect()
      const funded = (await faucet.fundWallet()).wallet
      await faucet.disconnect()

      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        ledger: new XrplLedger(TESTNET_WS),
      })
      await client.connect()
      try {
        const retrieved = await client.account.retrieve({
          account: funded.classicAddress,
        })
        expect(retrieved.data.address).toBe(funded.classicAddress)
        expect(Number(retrieved.data.xrpBalance)).toBeGreaterThan(0)

        // With no signer and no explicit account, the read has nothing to
        // default to and reports that clearly.
        await expect(client.account.retrieve()).rejects.toThrow(SimpleXRPLError)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
