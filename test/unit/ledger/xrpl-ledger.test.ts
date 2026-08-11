import type { SubmitResponse, Transaction, TxResponse } from 'xrpl'

import { SimpleXRPLError, XrplLedger } from '../../../src/index.js'

const XRPLD_URL = 'wss://xrpld.invalid:51233'
const FAUCET_URL = 'https://faucet.invalid/accounts'
const ADDRESS = 'rP9jPyP5kyvFRb6ZiRghAGw5u8SGAmU4bd'

/** The `xrpl` Client methods {@link XrplLedger} delegates to. */
interface FakeClient {
  connected: boolean
  readonly calls: string[]
  isConnected: () => boolean
  connect: jest.Mock
  disconnect: jest.Mock
  autofill: jest.Mock
  submit: jest.Mock
  submitAndWait: jest.Mock
  request: jest.Mock
}

/**
 * Build an {@link XrplLedger} whose internal `xrpl` Client is replaced by an
 * in-memory fake, so the wrapper's own logic (lazy connect, faucet flow,
 * request bridging) can be asserted with no socket.
 *
 * @param faucetUrl - The faucet endpoint to construct with, if any.
 * @returns The ledger and the fake client backing it.
 */
function fakeLedger(faucetUrl?: string): {
  ledger: XrplLedger
  client: FakeClient
} {
  const calls: string[] = []
  const client: FakeClient = {
    connected: false,
    calls,
    isConnected: (): boolean => client.connected,
    connect: jest.fn(async () => {
      calls.push('connect')
      client.connected = true
    }),
    disconnect: jest.fn(async () => {
      calls.push('disconnect')
      client.connected = false
    }),
    autofill: jest.fn(async (tx: Transaction) => ({ ...tx, Sequence: 7 })),
    submit: jest.fn(async () => ({ result: { engine_result: 'tesSUCCESS' } })),
    submitAndWait: jest.fn(async () => ({ result: { hash: 'ABC' } })),
    request: jest.fn(async () => ({ result: { ok: true } })),
  }
  const ledger = new XrplLedger(XRPLD_URL, faucetUrl)
  // `client` is private/readonly at compile time only; swap the real socket
  // client for the fake so the wrapper is testable offline.
  ;(ledger as unknown as { client: FakeClient }).client = client
  return { ledger, client }
}

describe('XrplLedger — connection lifecycle', () => {
  it('connects once and is idempotent', async () => {
    const { ledger, client } = fakeLedger()
    await ledger.connect()
    await ledger.connect()
    expect(client.connect).toHaveBeenCalledTimes(1)
  })

  it('disconnects only when connected', async () => {
    const { ledger, client } = fakeLedger()
    // Never connected: disconnect is a no-op rather than an error.
    await ledger.disconnect()
    expect(client.disconnect).not.toHaveBeenCalled()

    await ledger.connect()
    await ledger.disconnect()
    expect(client.disconnect).toHaveBeenCalledTimes(1)
    expect(client.connected).toBe(false)
  })
})

describe('XrplLedger — operations connect lazily', () => {
  it('autofill connects first, then delegates', async () => {
    const { ledger, client } = fakeLedger()
    const tx: Transaction = {
      TransactionType: 'Payment',
      Account: ADDRESS,
      Destination: ADDRESS,
      Amount: '1',
    }
    const filled = await ledger.autofill(tx)
    expect(client.calls[0]).toBe('connect')
    expect(client.autofill).toHaveBeenCalledWith(tx)
    expect(filled).toStrictEqual({ ...tx, Sequence: 7 })
  })

  it('submit connects first, then delegates the blob', async () => {
    const { ledger, client } = fakeLedger()
    const response = await ledger.submit('DEADBEEF')
    expect(client.calls[0]).toBe('connect')
    expect(client.submit).toHaveBeenCalledWith('DEADBEEF')
    expect(response).toStrictEqual({
      result: { engine_result: 'tesSUCCESS' },
    } as unknown as SubmitResponse)
  })

  it('submitAndWait connects first, then delegates the blob', async () => {
    const { ledger, client } = fakeLedger()
    const response = await ledger.submitAndWait('DEADBEEF')
    expect(client.calls[0]).toBe('connect')
    expect(client.submitAndWait).toHaveBeenCalledWith('DEADBEEF')
    expect(response).toStrictEqual({
      result: { hash: 'ABC' },
    } as unknown as TxResponse)
  })

  it('request connects first and passes the command through untouched', async () => {
    const { ledger, client } = fakeLedger()
    const req = { command: 'account_info', account: ADDRESS } as const
    const response = await ledger.request<{ result: { ok: boolean } }>(req)
    expect(client.calls[0]).toBe('connect')
    expect(client.request).toHaveBeenCalledWith(req)
    expect(response.result.ok).toBe(true)
  })
})

describe('XrplLedger — fundViaFaucet', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    jest.useRealTimers()
  })

  it('refuses to fund on a network with no faucet configured', async () => {
    const { ledger } = fakeLedger()
    await expect(ledger.fundViaFaucet(ADDRESS)).rejects.toThrow(SimpleXRPLError)
    // The message must point at the non-faucet alternative.
    await expect(ledger.fundViaFaucet(ADDRESS)).rejects.toThrow(
      /Account\.activate/u,
    )
  })

  it('POSTs the address to the faucet and waits for a validated account', async () => {
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch
    const { ledger, client } = fakeLedger(FAUCET_URL)

    await ledger.fundViaFaucet(ADDRESS)

    expect(fetchMock).toHaveBeenCalledWith(FAUCET_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destination: ADDRESS }),
    })
    // The post-funding wait must query the *validated* ledger, or a follow-up
    // transaction can be built against a sequence that never validates.
    expect(client.request).toHaveBeenCalledWith({
      command: 'account_info',
      account: ADDRESS,
      ledger_index: 'validated',
    })
  })

  it('surfaces a failed faucet request with its HTTP status', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: false,
      status: 503,
    })) as unknown as typeof fetch
    const { ledger } = fakeLedger(FAUCET_URL)
    await expect(ledger.fundViaFaucet(ADDRESS)).rejects.toThrow(
      'Faucet request failed with status 503',
    )
  })

  it('retries the account lookup while it 404s, then succeeds', async () => {
    jest.useFakeTimers()
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch
    const { ledger, client } = fakeLedger(FAUCET_URL)
    client.request
      .mockRejectedValueOnce(new Error('actNotFound'))
      .mockRejectedValueOnce(new Error('actNotFound'))
      .mockResolvedValueOnce({ result: { ok: true } })

    const pending = ledger.fundViaFaucet(ADDRESS)
    await jest.advanceTimersByTimeAsync(5000)
    await expect(pending).resolves.toBeUndefined()
    expect(client.request).toHaveBeenCalledTimes(3)
  })

  it('gives up with a clear error when funding never lands', async () => {
    jest.useFakeTimers()
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
    })) as unknown as typeof fetch
    const { ledger, client } = fakeLedger(FAUCET_URL)
    client.request.mockRejectedValue(new Error('actNotFound'))

    const pending = ledger.fundViaFaucet(ADDRESS)
    const assertion = expect(pending).rejects.toThrow(
      `Faucet-funded account ${ADDRESS} did not appear on-ledger in time`,
    )
    // 20 attempts at a 1s interval; run past the whole budget.
    await jest.advanceTimersByTimeAsync(30_000)
    await assertion
    expect(client.request).toHaveBeenCalledTimes(20)
  })
})
