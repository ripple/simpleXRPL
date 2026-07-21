import { fundedClientWithSigners } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

describe('Mixed-signer per-account dispatch (live testnet)', () => {
  it(
    'routes each account to its own signer instance across a cross-account flow',
    async () => {
      const { client, wallets } = await fundedClientWithSigners(2)
      const [alpha, beta] = wallets
      try {
        // Each account is backed by a distinct LocalSigner instance.
        const alphaAccount = client.resolveAccount(alpha.classicAddress)
        const betaAccount = client.resolveAccount(beta.classicAddress)
        expect(alphaAccount.signer).not.toBe(betaAccount.signer)

        // alpha -> beta, signed by alpha's signer.
        const first = await client.xrp.transfer(
          { to: beta.classicAddress, amount: '5' },
          { from: alpha.classicAddress },
        )
        expect(first.source).toBe('rippled')
        expect(first.txHash).toMatch(/^[0-9A-F]{64}$/u)

        // beta -> alpha, signed by beta's signer (a different custodian).
        const second = await client.xrp.transfer(
          { to: alpha.classicAddress, amount: '5' },
          { from: beta.classicAddress },
        )
        expect(second.source).toBe('rippled')
        expect(second.txHash).toMatch(/^[0-9A-F]{64}$/u)
        expect(second.txHash).not.toBe(first.txHash)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
