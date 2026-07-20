import { IntentInspector } from '../../../src/client/intent-inspector.js'
import { SimpleXRPLError } from '../../../src/errors.js'
import type {
  Account,
  Custodian,
  IntentObserver,
  SignerCapabilities,
  SubmissionHandle,
  SubmissionResult,
} from '../../../src/index.js'

const notImplemented = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

const capabilities = (): SignerCapabilities => ({
  nativeOps: new Set(),
  allowRaw: false,
})

const noAccounts = async (): Promise<Account[]> => []

/**
 * Build a snapshot result the fake handle returns, tagged by which call
 * produced it (`poll` vs `wait`).
 *
 * @param intentId - The intent id being observed.
 * @param tag - Which handle method produced the result.
 * @returns A stand-in submission result.
 */
function fakeResult(intentId: string, tag: string): SubmissionResult {
  return { source: 'custody', response: { tag }, intent: undefined, intentId }
}

/**
 * A custodian that records the intent ids and wait timeouts it was asked to
 * observe, so the inspector's delegation can be asserted.
 */
interface RecordingObserver extends Custodian, IntentObserver {
  readonly observed: string[]
  readonly waited: Array<number | undefined>
}

/**
 * Build a recording governance-observer custodian.
 *
 * @returns The fake observer with `observed`/`waited` call logs.
 */
function makeObserver(): RecordingObserver {
  const observed: string[] = []
  const waited: Array<number | undefined> = []
  const observer: RecordingObserver = {
    kind: 'ripple-custody',
    primary: { address: 'rObserver' },
    observed,
    waited,
    capabilities,
    listAccounts: noAccounts,
    sign: notImplemented,
    submitAndWait: notImplemented,
    submitAsync: notImplemented,
    observeIntent(intentId: string): SubmissionHandle {
      observed.push(intentId)
      return {
        kind: 'ripple-custody',
        id: intentId,
        custodian: observer,
        async poll(): Promise<SubmissionResult> {
          return fakeResult(intentId, 'poll')
        },
        async wait(timeoutMs?: number): Promise<SubmissionResult> {
          waited.push(timeoutMs)
          return fakeResult(intentId, 'wait')
        },
      }
    },
  }
  return observer
}

/**
 * Build a plain custodian with no intent-observation capability (e.g. Local).
 *
 * @returns A custodian that is not an {@link IntentObserver}.
 */
function makeLocal(): Custodian {
  return {
    kind: 'local',
    primary: { address: 'rLocal' },
    capabilities,
    listAccounts: noAccounts,
    sign: notImplemented,
    submitAndWait: notImplemented,
    submitAsync: notImplemented,
  }
}

describe('IntentInspector', () => {
  it('status(id) delegates to the observer handle poll snapshot', async () => {
    const observer = makeObserver()
    const inspector = new IntentInspector([observer])

    const snapshot = await inspector.status('intent-1')

    expect(observer.observed).toEqual(['intent-1'])
    expect(snapshot.intentId).toBe('intent-1')
    expect(snapshot.response).toEqual({ tag: 'poll' })
  })

  it('await(id, timeoutMs) delegates to the observer handle wait', async () => {
    const observer = makeObserver()
    const inspector = new IntentInspector([observer])

    const result = await inspector.await('intent-2', 5000)

    expect(observer.observed).toEqual(['intent-2'])
    expect(observer.waited).toEqual([5000])
    expect(result.response).toEqual({ tag: 'wait' })
  })

  it('finds the governance observer among mixed signers (Local ignored)', async () => {
    const observer = makeObserver()
    const inspector = new IntentInspector([makeLocal(), observer])

    await inspector.status('intent-3')

    expect(observer.observed).toEqual(['intent-3'])
  })

  it('throws when no configured custodian can observe intents', () => {
    const inspector = new IntentInspector([makeLocal()])

    expect(() => inspector.handleFor('intent-4')).toThrow(SimpleXRPLError)
  })
})
