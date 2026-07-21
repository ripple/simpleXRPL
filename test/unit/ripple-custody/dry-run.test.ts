import { runDryRun } from '../../../src/custodians/ripple/submission/dry-run.js'
import { IntentValidationError } from '../../../src/errors.js'

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

    await expect(run()).rejects.toBeInstanceOf(IntentValidationError)
    await expect(run()).rejects.toThrow(/bad thing; other thing/u)
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
