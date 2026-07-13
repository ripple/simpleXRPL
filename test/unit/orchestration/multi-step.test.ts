import type { Transaction } from 'xrpl'

import { MultiStepFailureError, SimpleXRPLError } from '../../../src/index.js'
import type { MultiStepPipelineStep } from '../../../src/orchestration/index.js'
import { runMultiStep } from '../../../src/orchestration/index.js'

import { fakeResult, makeStepCustodian } from './test-utils.js'

const TX: Transaction = { TransactionType: 'AccountSet', Account: 'rAny' }

describe('runMultiStep', () => {
  it('returns an empty result list for zero steps', async () => {
    await expect(runMultiStep([])).resolves.toEqual([])
  })

  it('runs every step and returns the results in order', async () => {
    const first = makeStepCustodian('local', 'rFirst')
    const second = makeStepCustodian('local', 'rSecond')
    first.queue(fakeResult('HASH1'))
    second.queue(fakeResult('HASH2'))

    const steps: MultiStepPipelineStep[] = [
      { tx: TX, account: first.account },
      { tx: TX, account: second.account },
    ]

    const results = await runMultiStep(steps)

    expect(results.map((result) => result.txHash)).toEqual(['HASH1', 'HASH2'])
  })

  it("dispatches through each step account's own custodian, merging ctx", async () => {
    const custodian = makeStepCustodian('local', 'rAccount')
    custodian.queue(fakeResult('HASH1'))

    await runMultiStep([
      {
        tx: TX,
        account: custodian.account,
        ctx: { fee: { priority: 'high' } },
      },
    ])

    expect(custodian.calls).toHaveLength(1)
    expect(custodian.calls[0]?.ctx).toEqual({
      account: custodian.account,
      fee: { priority: 'high' },
    })
  })

  it('stops at the failing step and never dispatches the remaining ones', async () => {
    const first = makeStepCustodian('local', 'rFirst')
    const second = makeStepCustodian('local', 'rSecond')
    first.queue(fakeResult('HASH1'))
    second.queue(new SimpleXRPLError('step 2 rejected'))

    const steps: MultiStepPipelineStep[] = [
      { tx: TX, account: first.account },
      { tx: TX, account: second.account },
      // A third step whose custodian has nothing queued — if it were ever
      // called, makeStepCustodian would throw "no scripted outcome queued"
      // instead of the expected MultiStepFailureError.
      { tx: TX, account: second.account },
    ]

    await expect(runMultiStep(steps)).rejects.toBeInstanceOf(
      MultiStepFailureError,
    )
  })

  it('carries the already-committed results and the failed step index', async () => {
    const first = makeStepCustodian('local', 'rFirst')
    const second = makeStepCustodian('local', 'rSecond')
    first.queue(fakeResult('HASH1'))
    const failure = new SimpleXRPLError('step 2 rejected')
    second.queue(failure)

    let error: unknown
    try {
      await runMultiStep([
        { tx: TX, account: first.account },
        { tx: TX, account: second.account },
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
    const custodian = makeStepCustodian('local', 'rAccount')
    custodian.queue(new Error('network blip'))

    let error: unknown
    try {
      await runMultiStep([{ tx: TX, account: custodian.account }])
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MultiStepFailureError)
    const multiStepError = error as MultiStepFailureError
    expect(multiStepError.failed.error).toBeInstanceOf(SimpleXRPLError)
    expect(multiStepError.failed.error.cause).toBeInstanceOf(Error)
  })
})
