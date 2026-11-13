import {
  AccountNotFoundError,
  AmbiguousAccountError,
  CustodyApiError,
  CustodyAuthError,
  CustodyPermissionError,
  CustodySignatureError,
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
    CustodySignatureError,
    CustodyPermissionError,
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
    expect(err.message).toBe('Custody API error (500)')
  })

  describe('CustodyApiError reads the Custody error body', () => {
    const body = JSON.stringify({
      reason: 'EntityNotFoundError',
      message: 'Intent 42 not found.',
    })

    it('into the message, reason, and detail', () => {
      const err = new CustodyApiError(404, body)
      expect(err.reason).toBe('EntityNotFoundError')
      expect(err.detail).toBe('Intent 42 not found.')
      expect(err.message).toBe(
        'Custody API error (404 EntityNotFoundError): Intent 42 not found.',
      )
      expect(err.raw).toBe(body)
    })

    it('whether the body is text or already parsed', () => {
      expect(new CustodyApiError(404, JSON.parse(body)).message).toBe(
        new CustodyApiError(404, body).message,
      )
    })

    it('listing any additionalDetails', () => {
      const err = new CustodyApiError(400, {
        reason: 'ValidationError',
        message: 'Invalid request',
        additionalDetails: [
          { reason: 'MissingField', message: 'amount is required' },
          { message: 'expiry is in the past' },
        ],
      })
      expect(err.detail).toBe(
        'Invalid request (MissingField: amount is required; expiry is in the past)',
      )
    })

    it('falling back to an intent error code', () => {
      const err = new CustodyApiError(422, {
        code: 'PolicyRejected',
        message: 'No policy matched',
      })
      expect(err.reason).toBe('PolicyRejected')
    })

    it('quoting the start of a text body', () => {
      const html = `<html>${'x'.repeat(300)}</html>`
      const err = new CustodyApiError(502, `  ${html}\n`)
      expect(err.reason).toBeUndefined()
      expect(err.detail).toBe(`${html.slice(0, 200)}…`)
      expect(new CustodyApiError(502, 'Bad Gateway').message).toBe(
        'Custody API error (502): Bad Gateway',
      )
      expect(new CustodyApiError(502, '').message).toBe(
        'Custody API error (502)',
      )
    })

    it('putting Custody’s hint before an extra one, on its own line', () => {
      const err = new CustodyApiError(
        422,
        { reason: 'PolicyError', processing: { hint: 'add an approver' } },
        'a known bug',
      )
      expect(err.hint).toBe('add an approver\na known bug')
      expect(err.message).toBe(
        'Custody API error (422 PolicyError)\nadd an approver\na known bug',
      )
    })
  })

  it('CustodyApiError serializes to JSON without the raw body', () => {
    const err = new CustodyApiError(
      404,
      { reason: 'EntityNotFoundError', message: 'gone' },
      'try later',
    )
    expect(JSON.parse(JSON.stringify(err))).toEqual({
      name: 'CustodyApiError',
      message: 'Custody API error (404 EntityNotFoundError): gone\ntry later',
      status: 404,
      reason: 'EntityNotFoundError',
      detail: 'gone',
      hint: 'try later',
    })
  })

  it('CustodyAuthError exposes and serializes the Custody 401 it wraps', () => {
    const apiError = new CustodyApiError(401, {
      reason: 'InvalidSignatureError',
      message: 'bad signature',
    })
    const err = new CustodySignatureError(apiError.message, {
      cause: apiError,
    })
    expect(err).toBeInstanceOf(CustodyAuthError)
    expect(err.apiError).toBe(apiError)
    expect(JSON.parse(JSON.stringify(err))).toEqual({
      name: 'CustodySignatureError',
      message: apiError.message,
      apiError: apiError.toJSON(),
    })
  })

  it('CustodyAuthError has no apiError for a local auth failure', () => {
    const err = new CustodyAuthError('bad key', { cause: new Error('parse') })
    expect(err.apiError).toBeUndefined()
    expect(JSON.parse(JSON.stringify(err))).toEqual({
      name: 'CustodyAuthError',
      message: 'bad key',
    })
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
