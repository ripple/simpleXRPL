import { runDryRun } from '../../../src/custodians/ripple/submission/dry-run.js'
import {
  DryRunFailedError,
  IntentValidationError,
} from '../../../src/errors.js'

import { AUTHOR_USER_ID, DOMAIN_ID, makeClient, ok } from './test-utils.js'

const PAYLOAD = {
  id: 'payload-1',
  accountId: 'acc-1',
  parameters: {
    type: 'XRPL' as const,
    feeStrategy: { type: 'Priority' as const, priority: 'Low' as const },
    memos: [],
  },
  customProperties: {},
  type: 'v0_CreateTransactionOrder' as const,
}

describe('runDryRun', () => {
  it('POSTs to /v1/intents/dry-run and resolves silently on success', async () => {
    const { client, http } = makeClient(() =>
      ok({ success: true, type: 'v0_CreateTransactionOrder' }),
    )

    await expect(
      runDryRun(client, {
        domainId: DOMAIN_ID,
        authorUserId: AUTHOR_USER_ID,
        payload: PAYLOAD,
        customProperties: {},
      }),
    ).resolves.toBeUndefined()

    expect(http.requests[0]?.method).toBe('POST')
    expect(http.requests[0]?.url).toContain('/v1/intents/dry-run')
  })

  it('throws IntentValidationError with the joined diagnostics on failure', async () => {
    const { client } = makeClient(() =>
      ok({
        success: false,
        errors: ['bad thing', 'other thing'],
        type: 'v0_CreateTransactionOrder',
      }),
    )
    const run = async (): Promise<void> =>
      runDryRun(client, {
        domainId: DOMAIN_ID,
        authorUserId: AUTHOR_USER_ID,
        payload: PAYLOAD,
        customProperties: {},
      })

    // A DryRunFailedError, still catchable as the IntentValidationError it
    // has always been.
    await expect(run()).rejects.toBeInstanceOf(DryRunFailedError)
    await expect(run()).rejects.toBeInstanceOf(IntentValidationError)
    await expect(run()).rejects.toThrow(/bad thing; other thing/u)
  })

  it('carries Custody’s full response, and names the result and estimate failures', async () => {
    const response = {
      success: false,
      result: {
        type: 'Failure',
        reason: 'destination does not exist',
        hint: 'InvalidDestination',
      },
      estimate: {
        type: 'Failure',
        reason: 'insufficient funds',
        hint: 'CurrentlyNotEnoughFunds',
      },
      type: 'v0_CreateTransactionOrder',
    }
    const { client } = makeClient(() => ok(response))

    let error: DryRunFailedError | undefined
    try {
      await runDryRun(client, {
        domainId: DOMAIN_ID,
        authorUserId: AUTHOR_USER_ID,
        payload: PAYLOAD,
        customProperties: {},
      })
    } catch (caught) {
      error = caught as DryRunFailedError
    }

    expect(error?.message).toBe(
      'Custody dry-run failed for v0_CreateTransactionOrder: ' +
        'result: destination does not exist (InvalidDestination); ' +
        'estimate: insufficient funds (CurrentlyNotEnoughFunds)',
    )
    expect(error?.response).toEqual(response)
  })

  it('posts a fresh envelope id, not the payload’s', async () => {
    const { client, http } = makeClient(() =>
      ok({ success: true, type: 'v0_CreateTransactionOrder' }),
    )

    await runDryRun(client, {
      domainId: DOMAIN_ID,
      authorUserId: AUTHOR_USER_ID,
      payload: PAYLOAD,
      customProperties: { note: 'x' },
    })

    const body = JSON.parse(http.requests[0]?.body ?? '{}') as {
      id: string
      payload: { id: string }
      customProperties: Record<string, string>
      type?: string
    }
    expect(body.id).not.toBe(PAYLOAD.id)
    expect(body.payload.id).toBe(PAYLOAD.id)
    expect(body.customProperties).toEqual({ note: 'x' })
    // A dry-run request carries no propose `type`.
    expect(body).not.toHaveProperty('type')
  })

  it('falls back to a generic message when no errors are given', async () => {
    const { client } = makeClient(() =>
      ok({ success: false, type: 'v0_SignManifest' }),
    )

    await expect(
      runDryRun(client, {
        domainId: DOMAIN_ID,
        authorUserId: AUTHOR_USER_ID,
        payload: PAYLOAD,
        customProperties: {},
      }),
    ).rejects.toThrow(/no diagnostic provided/u)
  })
})
