import { FetchHttpPort } from '../../../src/custodians/ripple/transport/fetch-http-port.js'

describe('FetchHttpPort', () => {
  let fetchSpy: jest.SpyInstance

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('{}', { status: 200 }))
  })
  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('passes an abort signal when the request carries a timeout', async () => {
    await new FetchHttpPort().send({
      method: 'GET',
      url: 'https://custody.example.com/api/OpenAPI',
      headers: {},
      timeoutMs: 1000,
    })

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('leaves the request unbounded when no timeout is given', async () => {
    const response = await new FetchHttpPort().send({
      method: 'GET',
      url: 'https://custody.example.com/v1/me',
      headers: {},
    })

    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(init.signal).toBeUndefined()
    expect(response).toEqual({ status: 200, body: '{}' })
  })
})
