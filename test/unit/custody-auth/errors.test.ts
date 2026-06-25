import {
  CustodyApiError,
  CustodyAuthError,
  SimpleXRPLError,
} from '../../../src/core/errors.js'

describe('error hierarchy', () => {
  it('CustodyAuthError is a SimpleXRPLError and carries status + cause', () => {
    const cause = new Error('root')
    const err = new CustodyAuthError('auth failed', { status: 401, cause })
    expect(err).toBeInstanceOf(SimpleXRPLError)
    expect(err).toBeInstanceOf(CustodyAuthError)
    expect(err.name).toBe('CustodyAuthError')
    expect(err.status).toBe(401)
    expect(err.cause).toBe(cause)
  })

  it('CustodyApiError preserves status, hint, and raw verbatim', () => {
    const raw = { processing: { hint: 'policy rejected' } }
    const err = new CustodyApiError('api failed', {
      status: 422,
      hint: 'policy rejected',
      raw,
    })
    expect(err).toBeInstanceOf(SimpleXRPLError)
    expect(err.status).toBe(422)
    expect(err.hint).toBe('policy rejected')
    expect(err.raw).toBe(raw)
  })
})
