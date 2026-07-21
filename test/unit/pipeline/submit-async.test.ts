import { Wallet, xrpToDrops } from 'xrpl'
import type { Payment } from 'xrpl'

import {
  LocalSigner,
  SimpleXRPL,
  submitTransactionAsync,
} from '../../../src/index.js'

import { fakeLedger } from './fake-ledger.js'

describe('submitTransactionAsync (pipeline spine)', () => {
  it('returns a handle for the submitted transaction on the Local path', async () => {
    const wallet = Wallet.generate()
    const to = Wallet.generate().classicAddress
    const ledger = fakeLedger('ASYNCHASH')
    const client = await SimpleXRPL.init({
      rippledUrl: 'wss://x.invalid',
      signers: [LocalSigner.fromSeed(wallet.seed as string)],
      ledger,
    })
    const account = client.resolveAccount()
    const transaction: Payment = {
      TransactionType: 'Payment',
      Account: account.address,
      Destination: to,
      Amount: xrpToDrops('10'),
    }

    const handle = await submitTransactionAsync(client, {
      transaction,
      account,
    })

    expect(handle.kind).toBe('local')
    expect(handle.id).toBe('ASYNCHASH')
    const result = await handle.wait()
    expect(result.source).toBe('rippled')
    expect(result.txHash).toBe('ASYNCHASH')
    // Exactly one blob was submitted (async didn't double-submit).
    expect(ledger.submitted).toHaveLength(1)
  })
})
