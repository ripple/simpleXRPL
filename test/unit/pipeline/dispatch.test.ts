import { dispatch, SignerCapabilityError } from '../../../src/index.js'
import type {
  Account,
  Custodian,
  CustodianKind,
  SignedEnvelope,
  SignerCapabilities,
  SubmissionHandle,
  SubmissionResult,
} from '../../../src/index.js'

function makeCustodian(
  kind: CustodianKind,
  caps: SignerCapabilities,
): Custodian {
  return {
    kind,
    primary: { address: 'rPrimary' },
    capabilities(): SignerCapabilities {
      return caps
    },
    async listAccounts(): Promise<Account[]> {
      return []
    },
    async sign(): Promise<SignedEnvelope> {
      return { txBlob: '' }
    },
    async submitAndWait(): Promise<SubmissionResult> {
      return { source: 'rippled', response: {} as never, intent: undefined }
    },
    async submitAsync(): Promise<SubmissionHandle> {
      throw new Error('not used')
    },
  }
}

function accountOn(signer: Custodian): Account {
  return { address: 'rAccount', signer }
}

describe('dispatch', () => {
  it('routes local to the Local path', () => {
    const signer = makeCustodian('local', {
      nativeOps: new Set(),
      allowRaw: true,
    })
    expect(dispatch(accountOn(signer), 'Payment')).toBe('local')
  })

  it('routes a natively-supported custody op to ripple-native', () => {
    const signer = makeCustodian('ripple-custody', {
      nativeOps: new Set(['Payment']),
      allowRaw: false,
    })
    expect(dispatch(accountOn(signer), 'Payment')).toBe('ripple-native')
  })

  it('falls back to ripple-raw when raw signing is allowed', () => {
    const signer = makeCustodian('ripple-custody', {
      nativeOps: new Set(),
      allowRaw: true,
    })
    expect(dispatch(accountOn(signer), 'Payment')).toBe('ripple-raw')
  })

  it('routes palisade native and raw', () => {
    const native = makeCustodian('palisade-custody', {
      nativeOps: new Set(['TrustSet']),
      allowRaw: false,
    })
    const raw = makeCustodian('palisade-custody', {
      nativeOps: new Set(),
      allowRaw: true,
    })
    expect(dispatch(accountOn(native), 'TrustSet')).toBe('palisade-native')
    expect(dispatch(accountOn(raw), 'TrustSet')).toBe('palisade-raw')
  })

  it('throws when a custodian can neither natively nor raw-sign', () => {
    const signer = makeCustodian('ripple-custody', {
      nativeOps: new Set(),
      allowRaw: false,
    })
    expect(() => dispatch(accountOn(signer), 'Payment')).toThrow(
      SignerCapabilityError,
    )
  })
})
