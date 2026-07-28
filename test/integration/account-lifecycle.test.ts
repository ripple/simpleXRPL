import { SimpleXRPL, XrplLedger } from '../../src/index.js'

import {
  fundedClientWithSigners,
  TESTNET_FAUCET,
  TESTNET_WS,
} from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

interface AccountInfo {
  result: {
    account_data: { Account?: string }
    account_flags: { defaultRipple?: boolean }
  }
}

describe('Account lifecycle (live testnet)', () => {
  it(
    'create + fund faucets a new account and enables defaultRipple',
    async () => {
      // A signer-less client whose ledger has a faucet configured.
      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        ledger: new XrplLedger(TESTNET_WS, TESTNET_FAUCET),
      })
      await client.connect()
      try {
        const created = client.account.create()
        const funded = await client.account.fund({
          destination: created.address,
        })
        expect(funded.source).toBe('xrpld')

        const info = await client.ledger.request<AccountInfo>({
          command: 'account_info',
          account: created.address,
        })
        expect(info.result.account_data.Account).toBe(created.address)
        expect(info.result.account_flags.defaultRipple).toBe(true)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )

  it(
    'create + activate funds a new account from the operator and enables defaultRipple',
    async () => {
      // wallets[0] is the funded operator/primary.
      const { client } = await fundedClientWithSigners(1)
      try {
        const created = client.account.create()
        const activated = await client.account.activate({
          destination: created.address,
        })
        expect(activated.source).toBe('xrpld')

        const info = await client.ledger.request<AccountInfo>({
          command: 'account_info',
          account: created.address,
        })
        expect(info.result.account_data.Account).toBe(created.address)
        expect(info.result.account_flags.defaultRipple).toBe(true)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
