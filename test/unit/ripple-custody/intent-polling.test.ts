import {
  pollIntentUntilExecuted,
  waitForIntentOutcome,
} from '../../../src/custodians/ripple/submission/intent-polling.js'
import {
  CustodyApiError,
  CustodyTimeoutError,
  IntentPendingError,
  IntentValidationError,
} from '../../../src/errors.js'
import type { components } from '../../../src/generated/custody.js'

import {
  DOMAIN_ID,
  intentBody,
  makeClient,
  ok,
  status as httpStatus,
} from './test-utils.js'

describe('pollIntentUntilExecuted', () => {
  it('returns the executed intent entity once status is Executed', async () => {
    const { client } = makeClient(() => ok(intentBody('intent-1', 'Executed')))

    const entity = await pollIntentUntilExecuted({
      client,
      domainId: DOMAIN_ID,
      intentId: 'intent-1',
      timeoutMs: 5000,
    })

    expect(entity.state.status).toBe('Executed')
  })

  it('polls through non-terminal statuses before reaching Executed', async () => {
    jest.useFakeTimers()
    try {
      let calls = 0
      const { client, http } = makeClient(() => {
        calls += 1
        return ok(intentBody('intent-1', calls < 3 ? 'Open' : 'Executed'))
      })

      const promise = pollIntentUntilExecuted({
        client,
        domainId: DOMAIN_ID,
        intentId: 'intent-1',
        timeoutMs: 10_000,
      })
      await jest.advanceTimersByTimeAsync(5000)

      await expect(promise).resolves.toMatchObject({
        state: { status: 'Executed' },
      })
      expect(http.requests).toHaveLength(3)
    } finally {
      jest.useRealTimers()
    }
  })

  it('throws IntentValidationError on a terminal Rejected status, naming the reason', async () => {
    const { client } = makeClient(() =>
      ok(
        intentBody('intent-1', 'Rejected', {
          code: 'PolicyRejected',
          message: 'quorum not met',
        }),
      ),
    )
    const poll = async (): Promise<unknown> =>
      pollIntentUntilExecuted({
        client,
        domainId: DOMAIN_ID,
        intentId: 'intent-1',
        timeoutMs: 5000,
      })

    await expect(poll()).rejects.toThrow(IntentValidationError)
    await expect(poll()).rejects.toThrow(/PolicyRejected.*quorum not met/u)
  })

  it.each(['Expired', 'Failed'])(
    'throws IntentValidationError on a terminal %s status',
    async (status) => {
      const { client } = makeClient(() => ok(intentBody('intent-1', status)))

      await expect(
        pollIntentUntilExecuted({
          client,
          domainId: DOMAIN_ID,
          intentId: 'intent-1',
          timeoutMs: 5000,
        }),
      ).rejects.toThrow(IntentValidationError)
    },
  )

  it('throws IntentPendingError once the timeout elapses while still non-terminal', async () => {
    jest.useFakeTimers()
    try {
      const { client } = makeClient(() => ok(intentBody('intent-1', 'Open')))

      let error: unknown
      const settled = pollIntentUntilExecuted({
        client,
        domainId: DOMAIN_ID,
        intentId: 'intent-1',
        timeoutMs: 500,
      }).catch((caught: unknown) => {
        error = caught
      })
      await jest.advanceTimersByTimeAsync(2000)
      await settled

      expect(error).toBeInstanceOf(IntentPendingError)
      expect((error as IntentPendingError).intentId).toBe('intent-1')
      expect((error as IntentPendingError).custodian).toBe('ripple-custody')
      expect((error as IntentPendingError).lastState).toBe('Open')
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('pollIntentUntilExecuted — the intent is not readable yet', () => {
  // Custody accepts an intent with 202 and materializes it in the read model a
  // moment later, so a poll that starts immediately after submission can race
  // it and get a 404. That 404 used to propagate as a fatal CustodyApiError —
  // which reported *successful* payments as failures: the intent went on to
  // execute and move funds while the caller saw an error.

  it('keeps polling through 404s and returns once the intent appears', async () => {
    jest.useFakeTimers()
    try {
      let calls = 0
      const { client } = makeClient(() => {
        calls += 1
        // Not visible for the first two polls, then Executed.
        return calls < 3
          ? httpStatus(404, {
              reason: 'EntityNotFoundError',
              message: 'Intent intent-1 not found.',
            })
          : ok(intentBody('intent-1', 'Executed'))
      })

      const promise = pollIntentUntilExecuted({
        client,
        domainId: DOMAIN_ID,
        intentId: 'intent-1',
        timeoutMs: 10_000,
      })
      await jest.advanceTimersByTimeAsync(5000)

      await expect(promise).resolves.toMatchObject({
        state: { status: 'Executed' },
      })
      expect(calls).toBeGreaterThanOrEqual(3)
    } finally {
      jest.useRealTimers()
    }
  })

  it('reports a never-visible intent as pending, not as an API error', async () => {
    jest.useFakeTimers()
    try {
      const { client } = makeClient(() =>
        httpStatus(404, { reason: 'EntityNotFoundError' }),
      )
      let error: unknown
      const settled = pollIntentUntilExecuted({
        client,
        domainId: DOMAIN_ID,
        intentId: 'intent-1',
        timeoutMs: 500,
      }).catch((caught: unknown) => {
        error = caught
      })
      await jest.advanceTimersByTimeAsync(2000)
      await settled

      // Pending, not failed: the intent was accepted and may still execute, so
      // the caller can resume it by id rather than assume it never ran.
      expect(error).toBeInstanceOf(IntentPendingError)
      expect((error as IntentPendingError).lastState).toBe('NotYetVisible')
    } finally {
      jest.useRealTimers()
    }
  })

  it('still surfaces non-404 API errors immediately', async () => {
    // Only "not readable yet" is tolerated. A 500 is a real transport failure
    // and must not be swallowed into a timeout.
    const { client } = makeClient(() =>
      httpStatus(500, { reason: 'ServerError' }),
    )

    await expect(
      pollIntentUntilExecuted({
        client,
        domainId: DOMAIN_ID,
        intentId: 'intent-1',
        timeoutMs: 5000,
      }),
    ).rejects.toBeInstanceOf(CustodyApiError)
  })
})

describe('waitForIntentOutcome', () => {
  /**
   * A reader over fixed responses: each entry is a status to return, `404` for
   * "not readable yet", or an error to throw.
   *
   * @param script - What each successive read does; the last one repeats.
   * @returns The reader and its call count.
   */
  function reader(script: Array<string | 404 | Error>): {
    readIntent: () => Promise<components['schemas']['Core_TrustedIntent']>
    calls: () => number
  } {
    let calls = 0
    return {
      calls: () => calls,
      async readIntent(): Promise<components['schemas']['Core_TrustedIntent']> {
        const step = script[Math.min(calls, script.length - 1)]
        calls += 1
        if (step === 404) {
          throw new CustodyApiError(404, { reason: 'EntityNotFoundError' })
        }
        if (step instanceof Error) {
          throw step
        }
        return intentBody('intent-1', step, {
          code: 'PolicyRejected',
          message: 'no approver',
        }) as unknown as components['schemas']['Core_TrustedIntent']
      },
    }
  }

  it('reports an executed intent as a success, with no reason', async () => {
    const { readIntent } = reader(['Executed'])

    const outcome = await waitForIntentOutcome({
      readIntent,
      intentId: 'intent-1',
      timeoutMs: 5000,
    })

    expect(outcome).toMatchObject({
      intentId: 'intent-1',
      status: 'Executed',
      isTerminal: true,
      isSuccess: true,
      reason: undefined,
    })
    expect(outcome.intent?.data.id).toBe('intent-1')
  })

  it.each(['Rejected', 'Expired', 'Failed'])(
    'reports %s as terminal, without throwing, naming the reason',
    async (status) => {
      const { readIntent } = reader([status])

      const outcome = await waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 5000,
      })

      expect(outcome).toMatchObject({
        status,
        isTerminal: true,
        isSuccess: false,
        reason: `Custody intent intent-1 did not execute: status=${status} (PolicyRejected: no approver)`,
      })
    },
  )

  it('reports an intent still Open when time runs out as likely awaiting approval', async () => {
    jest.useFakeTimers()
    try {
      const { readIntent } = reader(['Open'])

      const promise = waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 3000,
      })
      await jest.advanceTimersByTimeAsync(5000)

      await expect(promise).resolves.toMatchObject({
        status: 'Open',
        isTerminal: false,
        isSuccess: false,
        reason:
          'Custody intent intent-1 is still Open after 3000 ms; it is most likely waiting for an approval',
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('reports an intent still Executing without the approval hint', async () => {
    jest.useFakeTimers()
    try {
      const { readIntent } = reader(['Executing'])

      const promise = waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 3000,
      })
      await jest.advanceTimersByTimeAsync(5000)

      await expect(promise).resolves.toMatchObject({
        reason: 'Custody intent intent-1 is still Executing after 3000 ms',
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('waits through 404s, and reports a never-readable intent', async () => {
    jest.useFakeTimers()
    try {
      const { readIntent } = reader([404])

      const promise = waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 3000,
      })
      await jest.advanceTimersByTimeAsync(5000)

      await expect(promise).resolves.toMatchObject({
        status: undefined,
        isTerminal: false,
        intent: undefined,
        reason:
          'Custody intent intent-1 was not readable within 3000 ms; check the intent id and domain',
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('calls onStatusCheck with each status read and its attempt', async () => {
    jest.useFakeTimers()
    try {
      const { readIntent } = reader([404, 'Open', 'Executing', 'Executed'])
      const checks: Array<[string, number]> = []

      const promise = waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 30_000,
        onStatusCheck: (status, attempt) => checks.push([status, attempt]),
      })
      await jest.advanceTimersByTimeAsync(30_000)
      await promise

      // The 404 read (attempt 1) has no status to report.
      expect(checks).toEqual([
        ['Open', 2],
        ['Executing', 3],
        ['Executed', 4],
      ])
    } finally {
      jest.useRealTimers()
    }
  })

  it('throws errors other than a 404', async () => {
    const failure = new CustodyApiError(500, { reason: 'InternalError' })
    const { readIntent } = reader([failure])

    await expect(
      waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 5000,
      }),
    ).rejects.toBe(failure)
  })
})

describe('waitForIntentOutcome — the time budget', () => {
  it('uses the whole budget, with a last read at the deadline', async () => {
    jest.useFakeTimers()
    try {
      const reads: number[] = []
      const start = Date.now()
      const readIntent = async (): Promise<
        components['schemas']['Core_TrustedIntent']
      > => {
        reads.push(Date.now() - start)
        return intentBody(
          'intent-1',
          'Open',
        ) as unknown as components['schemas']['Core_TrustedIntent']
      }

      let settled = false
      const promise = waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 6500,
      }).finally(() => {
        settled = true
      })

      await jest.advanceTimersByTimeAsync(6400)
      expect(settled).toBe(false)
      await jest.advanceTimersByTimeAsync(200)

      // Backoff of 1 s then 2 s, then a short sleep to land on the deadline.
      expect(reads).toEqual([0, 1000, 3000, 6500])
      await expect(promise).resolves.toMatchObject({
        status: 'Open',
        reason: expect.stringContaining('still Open after 6500 ms') as unknown,
      })
    } finally {
      jest.useRealTimers()
    }
  })

  it('treats a read that timed out as no answer, and keeps waiting', async () => {
    jest.useFakeTimers()
    try {
      let calls = 0
      const readIntent = async (): Promise<
        components['schemas']['Core_TrustedIntent']
      > => {
        calls += 1
        if (calls === 1) {
          throw new CustodyTimeoutError({
            method: 'GET',
            path: '/v1/domains/d/intents/intent-1',
            timeoutMs: 30_000,
          })
        }
        return intentBody(
          'intent-1',
          'Executed',
        ) as unknown as components['schemas']['Core_TrustedIntent']
      }

      const promise = waitForIntentOutcome({
        readIntent,
        intentId: 'intent-1',
        timeoutMs: 10_000,
      })
      await jest.advanceTimersByTimeAsync(2000)

      await expect(promise).resolves.toMatchObject({
        status: 'Executed',
        isSuccess: true,
      })
    } finally {
      jest.useRealTimers()
    }
  })
})
