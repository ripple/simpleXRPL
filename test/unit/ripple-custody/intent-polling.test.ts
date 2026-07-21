import { pollIntentUntilExecuted } from '../../../src/custodians/ripple/submission/intent-polling.js'
import {
  IntentPendingError,
  IntentValidationError,
} from '../../../src/errors.js'

import { DOMAIN_ID, intentBody, makeClient, ok } from './test-utils.js'

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
