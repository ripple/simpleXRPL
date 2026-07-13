import type { Transaction } from 'xrpl'

import { MultiStepFailureError, SimpleXRPLError } from '../../../src/index.js'
import { runMultiStep } from '../../../src/orchestration/index.js'

import {
  fakeResult,
  makeFakeHost,
  makeStepCustodian,
  testAddress,
} from './test-utils.js'

/**
 * A minimal, protocol-valid `AccountSet` for the given r-address.
 *
 * @param account - The r-address to set as the transaction's `Account`.
 * @returns The `AccountSet` transaction.
 */
function accountSetTx(account: string): Transaction {
  return { TransactionType: 'AccountSet', Account: account }
}

describe('runMultiStep', () => {
  it('returns an empty result list for zero steps', async () => {
    const host = makeFakeHost([])
    await expect(runMultiStep(host, [])).resolves.toEqual([])
  })

  it('runs every step and returns the results in order', async () => {
    const first = makeStepCustodian('ripple-custody', testAddress())
    const second = makeStepCustodian('ripple-custody', testAddress())
    first.queue(fakeResult('HASH1'))
    second.queue(fakeResult('HASH2'))
    const host = makeFakeHost([first.account, second.account])

    const results = await runMultiStep(host, [
      {
        transaction: accountSetTx(first.account.address),
        account: first.account,
      },
      {
        transaction: accountSetTx(second.account.address),
        account: second.account,
      },
    ])

    expect(results.map((result) => result.txHash)).toEqual(['HASH1', 'HASH2'])
  })

  it("dispatches through each step account's own custodian and passes fee overrides", async () => {
    const custodian = makeStepCustodian('ripple-custody', testAddress())
    custodian.queue(fakeResult('HASH1'))
    const host = makeFakeHost([custodian.account])

    await runMultiStep(host, [
      {
        transaction: accountSetTx(custodian.account.address),
        account: custodian.account,
        fee: { priority: 'high' },
      },
    ])

    expect(custodian.calls).toHaveLength(1)
    expect(custodian.calls[0]?.ctx.account).toBe(custodian.account)
    expect(custodian.calls[0]?.ctx.fee).toEqual({ priority: 'high' })
  })

  it('stops at the failing step and never dispatches the remaining ones', async () => {
    const first = makeStepCustodian('ripple-custody', testAddress())
    const second = makeStepCustodian('ripple-custody', testAddress())
    first.queue(fakeResult('HASH1'))
    second.queue(new SimpleXRPLError('step 2 rejected'))
    const host = makeFakeHost([first.account, second.account])

    const steps = [
      {
        transaction: accountSetTx(first.account.address),
        account: first.account,
      },
      {
        transaction: accountSetTx(second.account.address),
        account: second.account,
      },
      // A third step whose custodian has nothing queued — if it were ever
      // called, makeStepCustodian would throw "no scripted outcome queued"
      // instead of the expected MultiStepFailureError.
      {
        transaction: accountSetTx(second.account.address),
        account: second.account,
      },
    ]

    await expect(runMultiStep(host, steps)).rejects.toBeInstanceOf(
      MultiStepFailureError,
    )
  })

  it('carries the already-committed results and the failed step index', async () => {
    const first = makeStepCustodian('ripple-custody', testAddress())
    const second = makeStepCustodian('ripple-custody', testAddress())
    first.queue(fakeResult('HASH1'))
    const failure = new SimpleXRPLError('step 2 rejected')
    second.queue(failure)
    const host = makeFakeHost([first.account, second.account])

    let error: unknown
    try {
      await runMultiStep(host, [
        {
          transaction: accountSetTx(first.account.address),
          account: first.account,
        },
        {
          transaction: accountSetTx(second.account.address),
          account: second.account,
        },
      ])
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MultiStepFailureError)
    const multiStepError = error as MultiStepFailureError
    expect(multiStepError.committed).toHaveLength(1)
    expect(multiStepError.committed[0]?.txHash).toBe('HASH1')
    expect(multiStepError.failed.step).toBe(1)
    expect(multiStepError.failed.error).toBe(failure)
  })

  it('wraps a non-SimpleXRPLError thrown by a custodian', async () => {
    const custodian = makeStepCustodian('ripple-custody', testAddress())
    custodian.queue(new Error('network blip'))
    const host = makeFakeHost([custodian.account])

    let error: unknown
    try {
      await runMultiStep(host, [
        {
          transaction: accountSetTx(custodian.account.address),
          account: custodian.account,
        },
      ])
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MultiStepFailureError)
    const multiStepError = error as MultiStepFailureError
    expect(multiStepError.failed.error).toBeInstanceOf(SimpleXRPLError)
    expect(multiStepError.failed.error.cause).toBeInstanceOf(Error)
  })
})
