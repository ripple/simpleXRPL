import { pollIntentUntilExecuted } from '../../../src/custodians/ripple/submission/intent-polling.js'
import {
  CustodyApiError,
  IntentPendingError,
  IntentValidationError,
} from '../../../src/errors.js'

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
