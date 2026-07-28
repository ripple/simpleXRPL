import {
  AccountNotFoundError,
  AmbiguousAccountError,
  CustodyApiError,
  CustodyAuthError,
  DuplicateSignerError,
  IntentPendingError,
  IntentValidationError,
  MultiStepFailureError,
  NoSignerError,
  PalisadeApiError,
  PalisadeAuthError,
  XrpldSubmitError,
  SignerCapabilityError,
  SimpleXRPLError,
} from '../../src/index.js'

describe('error hierarchy', () => {
  const simpleClasses = [
    IntentValidationError,
    SignerCapabilityError,
    NoSignerError,
    CustodyAuthError,
    PalisadeAuthError,
  ]

  it.each(simpleClasses)('%p extends SimpleXRPLError and Error', (Cls) => {
    const err = new Cls('boom')
    expect(err).toBeInstanceOf(Cls)
    expect(err).toBeInstanceOf(SimpleXRPLError)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe(Cls.name)
    expect(err.message).toBe('boom')
  })

  it('base error defaults to an empty message', () => {
    expect(new SimpleXRPLError().message).toBe('')
    expect(new SimpleXRPLError().name).toBe('SimpleXRPLError')
  })

  it('AccountNotFoundError carries the account and a default message', () => {
    const err = new AccountNotFoundError('rTest')
    expect(err.account).toBe('rTest')
    expect(err.message).toContain('rTest')
    expect(err).toBeInstanceOf(SimpleXRPLError)
  })

  it('AmbiguousAccountError carries the account and custodian kinds', () => {
    const err = new AmbiguousAccountError('rTest', ['local', 'ripple-custody'])
    expect(err.account).toBe('rTest')
    expect(err.custodians).toStrictEqual(['local', 'ripple-custody'])
  })

  it('DuplicateSignerError carries the kind and tenant id', () => {
    const err = new DuplicateSignerError('ripple-custody', 'domain-x')
    expect(err.kind).toBe('ripple-custody')
    expect(err.tenantId).toBe('domain-x')
    expect(err.message).toContain('domain-x')
    expect(err).toBeInstanceOf(SimpleXRPLError)
  })

  it('CustodyApiError preserves status, hint, and raw body', () => {
    const raw = { error: 'nope' }
    const err = new CustodyApiError(403, raw, 'insufficient role')
    expect(err.status).toBe(403)
    expect(err.hint).toBe('insufficient role')
    expect(err.raw).toBe(raw)
    expect(err.message).toContain('403')
  })

  it('CustodyApiError leaves hint undefined when omitted', () => {
    const err = new CustodyApiError(500, { error: 'boom' })
    expect(err.hint).toBeUndefined()
    expect(err.status).toBe(500)
  })

  it('PalisadeApiError preserves status and raw body', () => {
    const raw = { code: 'x' }
    const err = new PalisadeApiError(500, raw)
    expect(err.status).toBe(500)
    expect(err.raw).toBe(raw)
  })

  it('IntentPendingError carries resume metadata', () => {
    const err = new IntentPendingError(
      'intent-1',
      'ripple-custody',
      'AwaitingApproval',
    )
    expect(err.intentId).toBe('intent-1')
    expect(err.custodian).toBe('ripple-custody')
    expect(err.lastState).toBe('AwaitingApproval')
  })

  it('XrpldSubmitError preserves the engine result', () => {
    const err = new XrpldSubmitError('tecPATH_DRY', { foo: 1 })
    expect(err.engineResult).toBe('tecPATH_DRY')
    expect(err.raw).toStrictEqual({ foo: 1 })
  })

  it('MultiStepFailureError carries committed steps and the failure', () => {
    const inner = new IntentValidationError('bad step')
    const err = new MultiStepFailureError([], { step: 2, error: inner })
    expect(err.committed).toStrictEqual([])
    expect(err.failed.step).toBe(2)
    expect(err.failed.error).toBe(inner)
    expect(err.message).toContain('2')
  })

  it('is catchable as the base class', () => {
    try {
      throw new NoSignerError('no signer configured')
    } catch (caught) {
      expect(caught).toBeInstanceOf(SimpleXRPLError)
    }
  })
})
