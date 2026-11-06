import { pollTransactionOnChain } from '../../../src/custodians/ripple/submission/transaction-polling.js'
import {
  CustodyTimeoutError,
  IntentValidationError,
} from '../../../src/errors.js'

import { DOMAIN_ID, makeClient, ok } from './test-utils.js'

// A real signed MPTokenIssuanceCreate blob (issuer rMJvBxh…, Sequence
// 19495980) and the issuance id the ledger derives from it. Custody returns
// this in `rawTransaction` even when it leaves the structured `ledgerData`
// null, so it is the only source of the id in the sandbox.
const MPT_CREATE_RAW =
  '12003622000000322401297C2C201B01323E9C6840000000000000C873' +
  '2102218AB4A0A775F860183DE429BB86862D134C91D4D885A0AAF10C5AA1E350C794' +
  '74473045022100B64DF0C394D95E4D398D9B53874D3AF8FE44C504C6605C318F8E82' +
  '8085ACF86602205E288887028EE670EC536B8B63552C5F895C4E6118603D3350CE3F' +
  '9BB8610772701EC1197B227469636B6572223A22494E5350222C226E616D65223A22' +
  '496E73706563746F7220546F6B656E222C2269636F6E223A22646174613A696D6167' +
  '652F706E673B6261736536342C6956424F5277304B47676F414141414E5355684555' +
  '674141414145414141414243415941414141664663534A4141414144556C45515652' +
  '34326D4E6B2B4D39514477414468674741576A5239617741414141424A5253453572' +
  '6B4A6767673D3D222C2261737365745F636C617373223A226F74686572222C226973' +
  '737565725F6E616D65223A22496E73706563746F72227D' +
  '8114DEC5FC9E0628D406B1A134ED2718C9CAFCFAACF1'
const MPT_CREATE_ID = '01297C2CDEC5FC9E0628D406B1A134ED2718C9CAFCFAACF1'

// A signed Payment blob for the same account — decodes fine, but must never
// yield an issuance id.
const PAYMENT_RAW =
  '1200002401297C2C6140000000000F424068400000000000000A73008114DEC5FC9E' +
  '0628D406B1A134ED2718C9CAFCFAACF18314DEC5FC9E0628D406B1A134ED2718C9CA' +
  'FCFAACF1'

const INTENT_ID = 'intent-1'

/**
 * A one-item transactions collection carrying the given ledger data.
 *
 * @param ledgerTransactionData - The `ledgerTransactionData` field to attach.
 * @returns A `Core_TransactionsCollection`-shaped body.
 */
function txCollection(ledgerTransactionData: unknown): Record<string, unknown> {
  return {
    count: 1,
    items: [
      {
        id: 'tx-1',
        orderReference: { id: INTENT_ID, domainId: DOMAIN_ID },
        ledgerTransactionData,
      },
    ],
  }
}

describe('pollTransactionOnChain', () => {
  const options = { domainId: DOMAIN_ID, intentId: INTENT_ID, timeoutMs: 5000 }

  it('returns the issuance id from structured ledgerData when present', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH1',
          ledgerData: { type: 'Xrpl', tokenData: { issuanceId: 'STRUCTURED' } },
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH1', mptIssuanceId: 'STRUCTURED' })
  })

  it('reconstructs the issuance id from rawTransaction when ledgerData is null', async () => {
    // The Custody sandbox confirms MPT issuances yet returns `ledgerData: null`,
    // so the id has to be recovered from the signed blob.
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH2',
          ledgerData: null,
          rawTransaction: MPT_CREATE_RAW,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH2', mptIssuanceId: MPT_CREATE_ID })
  })

  it('prefers structured tokenData over the raw blob when both are present', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH3',
          ledgerData: { type: 'Xrpl', tokenData: { issuanceId: 'STRUCTURED' } },
          rawTransaction: MPT_CREATE_RAW,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result?.mptIssuanceId).toBe('STRUCTURED')
  })

  it('omits the issuance id for a confirmed non-MPT transaction', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH4',
          ledgerData: null,
          rawTransaction: PAYMENT_RAW,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH4' })
  })

  it('omits the issuance id when neither structured data nor a raw blob is present', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH5',
          ledgerData: null,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH5' })
  })

  it('returns undefined when confirmation never arrives before the timeout', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Detected',
          ledgerTransactionId: '',
          ledgerData: null,
        }),
      ),
    )

    // The first backoff (5s) already exceeds this deadline, so the poll gives
    // up on the opening attempt without sleeping.
    const result = await pollTransactionOnChain({
      client,
      domainId: DOMAIN_ID,
      intentId: INTENT_ID,
      timeoutMs: 500,
    })

    expect(result).toBeUndefined()
  })

  it('keeps polling when ledgerTransactionData itself is null (in flight)', async () => {
    // Custody returns the transaction row with a top-level null
    // `ledgerTransactionData` before the XRPL submission lands. That is not a
    // dead transaction — it must not be dereferenced, and the poll should give
    // up cleanly at the timeout rather than throw.
    const { client } = makeClient(() => ok(txCollection(null)))

    const result = await pollTransactionOnChain({
      client,
      domainId: DOMAIN_ID,
      intentId: INTENT_ID,
      timeoutMs: 500,
    })

    expect(result).toBeUndefined()
  })

  it('keeps polling when failure is null on an in-flight transaction', async () => {
    // While the transaction is in flight Custody sends the row with an explicit
    // `failure: null` (not absent). That is not an on-chain failure — it must
    // not be read as terminal, so the poll gives up cleanly at the timeout.
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Detected',
          failure: null,
          ledgerTransactionId: '',
          ledgerData: null,
        }),
      ),
    )

    const result = await pollTransactionOnChain({
      client,
      domainId: DOMAIN_ID,
      intentId: INTENT_ID,
      timeoutMs: 500,
    })

    expect(result).toBeUndefined()
  })

  it.each(['Expired'])(
    'throws IntentValidationError at once when the transaction is %s (terminal)',
    async (ledgerStatus) => {
      const { client, http } = makeClient(() =>
        ok(
          txCollection({
            ledgerStatus,
            ledgerTransactionId: '',
            ledgerData: null,
          }),
        ),
      )

      // A generous timeout: if it polled to the deadline this would hang, so
      // reaching the throw proves the short-circuit fired on the first read.
      await expect(
        pollTransactionOnChain({ client, ...options, timeoutMs: 60_000 }),
      ).rejects.toThrow(IntentValidationError)
      expect(http.requests).toHaveLength(1)
    },
  )

  it('throws IntentValidationError when the transaction records an on-chain failure', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Detected',
          failure: 'FailedOnChain',
          ledgerTransactionId: 'HASH6',
          ledgerData: null,
        }),
      ),
    )

    await expect(
      pollTransactionOnChain({ client, ...options, timeoutMs: 60_000 }),
    ).rejects.toThrow(IntentValidationError)
  })

  it('treats a recorded failure as dead even when the status is Confirmed', async () => {
    // Custody can mark a transaction Confirmed (it reached the ledger) while
    // also recording a failure on it — a tec representation. The failure wins:
    // it must not be reported as the clean success the caller asked for.
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          failure: 'FailedOnChain',
          ledgerTransactionId: 'HASH7',
          ledgerData: null,
        }),
      ),
    )

    await expect(
      pollTransactionOnChain({ client, ...options, timeoutMs: 60_000 }),
    ).rejects.toThrow(IntentValidationError)
  })

  it.each([
    [
      'Failed',
      { status: 'Failed', hint: 'InvalidUserPayload' },
      /Custody failed it before the ledger: InvalidUserPayload/u,
    ],
    [
      'Interrupted',
      { status: 'Interrupted', cause: 'Expiry', reason: 'order expired' },
      /Custody interrupted it \(Expiry\): order expired/u,
    ],
  ])(
    'throws at once when Custody %s the transaction before the ledger',
    async (_status, processing, message) => {
      const { client, http } = makeClient(() =>
        ok({
          count: 1,
          items: [
            {
              id: 'tx-1',
              registeredAt: '2026-11-06T10:00:00Z',
              processing,
              ledgerTransactionData: null,
            },
          ],
        }),
      )

      const polling = pollTransactionOnChain({
        client,
        ...options,
        timeoutMs: 60_000,
      })

      await expect(polling).rejects.toThrow(IntentValidationError)
      await expect(polling).rejects.toThrow(message)
      expect(http.requests).toHaveLength(1)
    },
  )
})

describe('pollTransactionOnChain — an order with a replaced attempt', () => {
  const options = { domainId: DOMAIN_ID, intentId: INTENT_ID, timeoutMs: 5000 }

  /**
   * One attempt at the order's transaction.
   *
   * @param id - The transaction id.
   * @param fields - When Custody registered it, its ledger status, and hash.
   * @param fields.at - When Custody registered it.
   * @param fields.status - Its ledger status.
   * @param fields.hash - Its XRPL hash.
   * @returns The transaction.
   */
  function attempt(
    id: string,
    fields: { at: string; status: string; hash?: string },
  ): Record<string, unknown> {
    return {
      id,
      registeredAt: fields.at,
      orderReference: { id: INTENT_ID, domainId: DOMAIN_ID },
      ledgerTransactionData: {
        ledgerStatus: fields.status,
        ledgerTransactionId: fields.hash ?? '',
        ledgerData: null,
      },
    }
  }

  it('ignores the replaced attempt and follows the one that replaced it', async () => {
    // A fee-bumped resubmission: Custody lists the replaced attempt first.
    const { client } = makeClient(() =>
      ok({
        count: 2,
        items: [
          attempt('tx-old', {
            at: '2026-11-06T10:00:00Z',
            status: 'Replaced',
            hash: 'OLD',
          }),
          attempt('tx-new', {
            at: '2026-11-06T10:05:00Z',
            status: 'Confirmed',
            hash: 'NEW',
          }),
        ],
      }),
    )

    await expect(
      pollTransactionOnChain({ client, ...options }),
    ).resolves.toEqual({ txHash: 'NEW' })
  })

  it('takes the newest surviving attempt, whatever the listing order', async () => {
    const { client } = makeClient(() =>
      ok({
        count: 2,
        items: [
          attempt('tx-a', {
            at: '2026-11-06T10:00:00Z',
            status: 'Confirmed',
            hash: 'OLDER',
          }),
          attempt('tx-b', {
            at: '2026-11-06T10:05:00Z',
            status: 'Confirmed',
            hash: 'NEWER',
          }),
        ].reverse(),
      }),
    )

    await expect(
      pollTransactionOnChain({ client, ...options }),
    ).resolves.toEqual({ txHash: 'NEWER' })
  })

  it('keeps waiting while only the replaced attempt is listed', async () => {
    jest.useFakeTimers()
    try {
      let calls = 0
      const { client } = makeClient(() => {
        calls += 1
        const items = [
          attempt('tx-old', {
            at: '2026-11-06T10:00:00Z',
            status: 'Replaced',
            hash: 'OLD',
          }),
        ]
        if (calls > 1) {
          items.push(
            attempt('tx-new', {
              at: '2026-11-06T10:05:00Z',
              status: 'Confirmed',
              hash: 'NEW',
            }),
          )
        }
        return ok({ count: items.length, items })
      })

      const polling = pollTransactionOnChain({
        client,
        ...options,
        timeoutMs: 60_000,
      })
      await jest.advanceTimersByTimeAsync(6000)

      // Previously a lone replaced attempt was reported as dead at once.
      await expect(polling).resolves.toEqual({ txHash: 'NEW' })
    } finally {
      jest.useRealTimers()
    }
  })
})

describe('pollTransactionOnChain — the time budget', () => {
  it('uses the whole budget, with a last read at the deadline', async () => {
    jest.useFakeTimers()
    try {
      const reads: number[] = []
      const start = Date.now()
      const { client } = makeClient(() => {
        reads.push(Date.now() - start)
        return ok(txCollection(null))
      })

      let settled = false
      const polling = pollTransactionOnChain({
        client,
        domainId: DOMAIN_ID,
        intentId: INTENT_ID,
        timeoutMs: 12_000,
      }).finally(() => {
        settled = true
      })

      await jest.advanceTimersByTimeAsync(11_900)
      expect(settled).toBe(false)
      await jest.advanceTimersByTimeAsync(200)

      // A 5 s first backoff, then a 7 s sleep that lands on the deadline (the
      // next backoff, 10 s, would have overshot it).
      expect(reads).toEqual([0, 5000, 12_000])
      await expect(polling).resolves.toBeUndefined()
    } finally {
      jest.useRealTimers()
    }
  })

  it('treats a read that timed out as no answer, and keeps waiting', async () => {
    jest.useFakeTimers()
    try {
      let calls = 0
      const { client } = makeClient(() => {
        calls += 1
        if (calls === 1) {
          throw new CustodyTimeoutError({
            method: 'GET',
            path: `/v1/domains/${DOMAIN_ID}/transactions`,
            timeoutMs: 30_000,
          })
        }
        return ok(
          txCollection({
            ledgerStatus: 'Confirmed',
            ledgerTransactionId: 'HASH8',
            ledgerData: null,
          }),
        )
      })

      const polling = pollTransactionOnChain({
        client,
        domainId: DOMAIN_ID,
        intentId: INTENT_ID,
        timeoutMs: 60_000,
      })
      await jest.advanceTimersByTimeAsync(6000)

      await expect(polling).resolves.toEqual({ txHash: 'HASH8' })
    } finally {
      jest.useRealTimers()
    }
  })
})
