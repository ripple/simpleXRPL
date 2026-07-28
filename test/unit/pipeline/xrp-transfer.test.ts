import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import {
  IntentValidationError,
  LocalSigner,
  SimpleXRPL,
  submitTransaction,
} from '../../../src/index.js'
import type { Account, SubmissionHost } from '../../../src/index.js'

import { fakeLedger } from './fake-ledger.js'

describe('XRP.transfer (pipeline spine)', () => {
  it('runs build -> validate -> resolve -> sign+submit -> wrap on Local', async () => {
    const wallet = Wallet.generate()
    const to = Wallet.generate().classicAddress
    const ledger = fakeLedger('E2EHASH')
    const client = await SimpleXRPL.init({
      xrpldUrl: 'wss://x.invalid',
      signers: [LocalSigner.fromSeed(wallet.seed as string)],
      ledger,
    })

    const result = await client.xrp.transfer({ to, amount: '10' })

    expect(result.source).toBe('xrpld')
    expect(result.txHash).toBe('E2EHASH')
    expect(result.intent).toStrictEqual({ to, amount: '10' })
    // A signed blob (hex string) was submitted through the ledger.
    expect(ledger.submitted).toHaveLength(1)
    expect(typeof ledger.submitted[0]).toBe('string')
  })

  it('wraps a protocol-validation failure as IntentValidationError', async () => {
    const wallet = Wallet.generate()
    const signer = LocalSigner.fromSeed(wallet.seed as string)
    const account = { address: wallet.classicAddress, signer } as Account
    const host = {
      ledger: fakeLedger(),
      resolveAccount: () => account,
    } as unknown as SubmissionHost
    // A Payment with no Destination/Amount fails xrpl's protocol validator.
    const badTx = {
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
    } as unknown as Transaction

    await expect(
      submitTransaction(host, { transaction: badTx, account }),
    ).rejects.toBeInstanceOf(IntentValidationError)
  })
})
