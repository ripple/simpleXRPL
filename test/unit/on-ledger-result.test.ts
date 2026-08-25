import type { TxResponse } from 'xrpl'

import {
  assertOnLedgerSuccess,
  engineResultOf,
} from '../../src/custodians/on-ledger-result.js'
import { IntentPendingError, XrpldSubmitError } from '../../src/errors.js'
import type { LedgerPort } from '../../src/ports/index.js'

/**
 * Shape one `tx` response `result` from a loose partial, defaulting `hash`.
 *
 * @param partial - Fields to set on `result` (e.g. `validated`, `meta`).
 * @returns A `TxResponse` carrying those fields.
 */
function txResult(partial: Record<string, unknown>): TxResponse {
  return { result: { hash: 'H', ...partial } } as unknown as TxResponse
}

/**
 * A ledger whose `tx` lookup returns each scripted response in turn, repeating
 * the last one once the script is exhausted. Only `request` is exercised here.
 *
 * @param responses - The `tx` responses to return, in order.
 * @returns A ledger port and a counter of `request` calls made.
 */
function scriptedLedger(responses: TxResponse[]): {
  ledger: LedgerPort
  calls: () => number
} {
  let call = 0
  const ledger: LedgerPort = {
    autofill: async (tx) => tx,
    submit: async () => ({}) as never,
    submitAndWait: async () => ({}) as never,
    async request<T>(): Promise<T> {
      const response = responses[Math.min(call, responses.length - 1)]
      call += 1
      return response as unknown as T
    },
  }
  return { ledger, calls: () => call }
}

const OPTIONS = {
  txHash: 'H',
  custodian: 'ripple-custody' as const,
  intentId: 'intent-1',
}

describe('engineResultOf', () => {
  it('reads the engine result from structured metadata', () => {
    const response = txResult({ meta: { TransactionResult: 'tesSUCCESS' } })
    expect(engineResultOf(response)).toBe('tesSUCCESS')
  })

  it('returns undefined when metadata is absent', () => {
    expect(engineResultOf(txResult({}))).toBeUndefined()
  })

  it('returns undefined when metadata is a bare (binary) string', () => {
    const response = txResult({ meta: 'BINARY' })
    expect(engineResultOf(response)).toBeUndefined()
  })
})

describe('assertOnLedgerSuccess', () => {
  it('resolves when the transaction is validated with tesSUCCESS', async () => {
    const { ledger, calls } = scriptedLedger([
      txResult({ validated: true, meta: { TransactionResult: 'tesSUCCESS' } }),
    ])

    await expect(
      assertOnLedgerSuccess({ ledger, ...OPTIONS }),
    ).resolves.toBeUndefined()
    // A validated result is authoritative on the first read — no polling.
    expect(calls()).toBe(1)
  })

  it('throws XrpldSubmitError when the validated engine result is a tec', async () => {
    const { ledger } = scriptedLedger([
      txResult({
        validated: true,
        meta: { TransactionResult: 'tecUNFUNDED_PAYMENT' },
      }),
    ])

    let caught: unknown
    try {
      await assertOnLedgerSuccess({ ledger, ...OPTIONS })
    } catch (error) {
      caught = error
    }
    expect(caught).toBeInstanceOf(XrpldSubmitError)
    expect((caught as XrpldSubmitError).engineResult).toBe(
      'tecUNFUNDED_PAYMENT',
    )
  })

  it('polls past an unvalidated read until the transaction is validated', async () => {
    jest.useFakeTimers()
    try {
      const { ledger, calls } = scriptedLedger([
        // Not yet validated — must not be read as success.
        txResult({ validated: false }),
        txResult({
          validated: true,
          meta: { TransactionResult: 'tesSUCCESS' },
        }),
      ])

      const promise = assertOnLedgerSuccess({ ledger, ...OPTIONS })
      await jest.advanceTimersByTimeAsync(2000)

      await expect(promise).resolves.toBeUndefined()
      expect(calls()).toBe(2)
    } finally {
      jest.useRealTimers()
    }
  })

  it('throws IntentPendingError when the transaction never validates', async () => {
    jest.useFakeTimers()
    try {
      // Always in flight: no validated result ever arrives.
      const { ledger } = scriptedLedger([txResult({ validated: false })])

      const promise = assertOnLedgerSuccess({ ledger, ...OPTIONS })
      const assertion =
        expect(promise).rejects.toBeInstanceOf(IntentPendingError)
      await jest.advanceTimersByTimeAsync(31_000)
      await assertion
    } finally {
      jest.useRealTimers()
    }
  })

  it('keeps polling through a txnNotFound (thrown) lookup', async () => {
    jest.useFakeTimers()
    try {
      let call = 0
      const ledger: LedgerPort = {
        autofill: async (tx) => tx,
        submit: async () => ({}) as never,
        submitAndWait: async () => ({}) as never,
        async request<T>(): Promise<T> {
          call += 1
          if (call === 1) {
            throw new Error('txnNotFound')
          }
          return txResult({
            validated: true,
            meta: { TransactionResult: 'tesSUCCESS' },
          }) as unknown as T
        },
      }

      const promise = assertOnLedgerSuccess({ ledger, ...OPTIONS })
      await jest.advanceTimersByTimeAsync(2000)

      await expect(promise).resolves.toBeUndefined()
      expect(call).toBe(2)
    } finally {
      jest.useRealTimers()
    }
  })
})
