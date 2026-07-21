import { encode, Wallet } from 'xrpl'
import type { Payment, Transaction, TxResponse } from 'xrpl'

import type {
  HttpRequest,
  HttpResponse,
  PalisadeHttpPort,
} from '../../../../src/custodians/palisade/transport/http-port.js'
import {
  AccountNotFoundError,
  IntentPendingError,
  PalisadeCustody,
  RippledSubmitError,
  SignerCapabilityError,
  SimpleXRPLError,
} from '../../../../src/index.js'
import type {
  Account,
  LedgerPort,
  SubmissionContext,
} from '../../../../src/index.js'

const BASE_URL = 'https://palisade.example'
const PRIMARY = { vaultId: 'v1', walletId: 'w1' }
// Real r-addresses so the raw path's binary-codec `encode` accepts them.
const PRIMARY_ADDR = Wallet.generate().classicAddress
const DEST_ADDR = Wallet.generate().classicAddress

/** A programmable Palisade transport: canned token + wallet list + per-call
 * handlers keyed by a URL substring. Records POST bodies for assertions. */
interface FakePort extends PalisadeHttpPort {
  readonly posts: Array<{ url: string; body: unknown }>
  readonly puts: Array<{ url: string }>
}

function fakePort(handlers: {
  wallets?: unknown
  onSubmit?: (subPath: string) => unknown
  onGet?: () => unknown
  onRaw?: () => unknown
}): FakePort {
  const posts: Array<{ url: string; body: unknown }> = []
  const puts: Array<{ url: string }> = []
  const ok = (value: unknown): HttpResponse => ({
    status: 200,
    body: JSON.stringify(value),
  })
  const wallets = handlers.wallets ?? {
    wallets: [
      {
        id: 'w1',
        vaultId: 'v1',
        address: PRIMARY_ADDR,
        name: 'primary',
        status: 'PROVISIONED',
      },
    ],
  }
  const send = async (request: HttpRequest): Promise<HttpResponse> => {
    const { url, method, body } = request
    if (url.includes('/credentials/oauth/token')) {
      return ok({ accessToken: 'tok', expiresIn: 3600 })
    }
    if (url.includes('/v2/wallets')) {
      return ok(wallets)
    }
    if (method === 'PUT') {
      puts.push({ url })
      return { status: 200, body: '' }
    }
    if (method === 'GET') {
      return ok(handlers.onGet?.())
    }
    const parsed: unknown = body === undefined ? undefined : JSON.parse(body)
    posts.push({ url, body: parsed })
    if (url.endsWith('/transactions/raw')) {
      return ok(handlers.onRaw?.())
    }
    return ok(handlers.onSubmit?.(url.split('/transactions/')[1]))
  }
  return { send, posts, puts }
}

function ledgerStub(response?: TxResponse): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => ({
      ...tx,
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 100,
    }),
    submit: async () => ({}) as never,
    submitAndWait: async () =>
      response ?? ({ result: { hash: 'RAWHASH' } } as unknown as TxResponse),
    request: async <T>() => ({}) as T,
  }
}

function contextFor(
  account: Account,
  ledger: LedgerPort,
  extra?: { timeoutMs?: number },
): SubmissionContext {
  return { account, ledger, timeoutMs: extra?.timeoutMs }
}

async function makeCustody(
  port: PalisadeHttpPort,
  allowRawSigning = false,
): Promise<PalisadeCustody> {
  return PalisadeCustody.create({
    baseUrl: BASE_URL,
    clientId: 'id',
    clientSecret: 'secret',
    primary: PRIMARY,
    allowRawSigning,
    http: port,
  })
}

const payment: Payment = {
  TransactionType: 'Payment',
  Account: PRIMARY_ADDR,
  Destination: DEST_ADDR,
  Amount: '1000000',
  Sequence: 1,
  Fee: '12',
  LastLedgerSequence: 100,
}

describe('PalisadeCustody.create', () => {
  it('discovers wallets, binds the primary, and reports capabilities', async () => {
    const custody = await makeCustody(fakePort({}), true)
    expect(custody.kind).toBe('palisade-custody')
    expect(custody.primary.address).toBe(PRIMARY_ADDR)
    expect((await custody.listAccounts())[0].address).toBe(PRIMARY_ADDR)
    const caps = custody.capabilities()
    expect(caps.allowRaw).toBe(true)
    expect(caps.nativeOps.has('Payment')).toBe(true)
  })

  it('defaults allowRaw to false', async () => {
    const custody = await makeCustody(fakePort({}))
    expect(custody.capabilities().allowRaw).toBe(false)
  })

  it('throws when the configured primary wallet is not discovered', async () => {
    const port = fakePort({
      wallets: {
        wallets: [
          {
            id: 'other',
            vaultId: 'vX',
            address: 'rOther',
            name: 'x',
            status: 'PROVISIONED',
          },
        ],
      },
    })
    await expect(makeCustody(port)).rejects.toBeInstanceOf(AccountNotFoundError)
  })
})

describe('PalisadeCustody.submitAndWait — native', () => {
  it('posts the native op and returns a palisade result on CONFIRMED', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'CONFIRMED', hash: 'H1' }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    const result = await custody.submitAndWait(
      payment,
      contextFor(account, ledgerStub()),
    )
    expect(result.source).toBe('palisade')
    expect(result.intentId).toBe('tx1')
    expect(result.txHash).toBe('H1')
    expect(port.posts[0].url).toContain(
      '/vaults/v1/wallets/w1/transactions/transfer',
    )
  })

  it('throws when the native submission is REJECTED', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'REJECTED' }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    await expect(
      custody.submitAndWait(payment, contextFor(account, ledgerStub())),
    ).rejects.toBeInstanceOf(SimpleXRPLError)
  })

  it('throws IntentPendingError when it never reaches a terminal status', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'SIGNATURE_PENDING' }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    await expect(
      custody.submitAndWait(
        payment,
        contextFor(account, ledgerStub(), { timeoutMs: 1 }),
      ),
    ).rejects.toBeInstanceOf(IntentPendingError)
  })
})

describe('PalisadeCustody.submitAndWait — raw fallback', () => {
  const escrow: Transaction = {
    TransactionType: 'EscrowFinish',
    Account: PRIMARY_ADDR,
    Owner: DEST_ADDR,
    OfferSequence: 5,
  }

  it('signs via the raw path and submits the blob through the ledger', async () => {
    const port = fakePort({
      onRaw: () => ({
        id: 'raw1',
        status: 'SIGNED',
        signedTransaction: 'SIGNEDBLOB',
      }),
    })
    const custody = await makeCustody(port, true)
    const account = (await custody.listAccounts())[0]
    const result = await custody.submitAndWait(
      escrow,
      contextFor(account, ledgerStub()),
    )
    expect(result.source).toBe('rippled')
    expect(result.txHash).toBe('RAWHASH')
    expect(port.posts[0].url).toContain('/transactions/raw')
    expect(port.posts[0].body).toMatchObject({ signOnly: true })
  })

  it('surfaces a non-tesSUCCESS engine result as RippledSubmitError', async () => {
    const port = fakePort({
      onRaw: () => ({
        id: 'raw1',
        status: 'SIGNED',
        signedTransaction: 'BLOB',
      }),
    })
    const custody = await makeCustody(port, true)
    const account = (await custody.listAccounts())[0]
    const failing = ledgerStub({
      result: { hash: 'H', meta: { TransactionResult: 'tecNO_LINE' } },
    } as unknown as TxResponse)
    await expect(
      custody.submitAndWait(escrow, contextFor(account, failing)),
    ).rejects.toBeInstanceOf(RippledSubmitError)
  })

  it('falls back to raw when a native transactor has an unsupported field', async () => {
    const port = fakePort({
      onRaw: () => ({
        id: 'raw1',
        status: 'SIGNED',
        signedTransaction: 'BLOB',
      }),
    })
    const custody = await makeCustody(port, true)
    const account = (await custody.listAccounts())[0]
    // Payment is native, but SendMax has no native slot → raw fallback.
    const withSendMax: Payment = { ...payment, SendMax: '2000000' }
    const result = await custody.submitAndWait(
      withSendMax,
      contextFor(account, ledgerStub()),
    )
    expect(result.source).toBe('rippled')
    expect(port.posts[0].url).toContain('/transactions/raw')
  })

  it('rethrows SignerCapabilityError when raw signing is disabled', async () => {
    const custody = await makeCustody(fakePort({}), false)
    const account = (await custody.listAccounts())[0]
    await expect(
      custody.submitAndWait(escrow, contextFor(account, ledgerStub())),
    ).rejects.toBeInstanceOf(SignerCapabilityError)
  })
})

describe('PalisadeCustody.sign / submitAsync', () => {
  it('sign returns the Palisade-signed blob', async () => {
    const port = fakePort({
      onRaw: () => ({
        id: 'raw1',
        status: 'SIGNED',
        signedTransaction: 'SIGNEDBLOB',
      }),
    })
    const custody = await makeCustody(port, true)
    const account = (await custody.listAccounts())[0]
    const envelope = await custody.sign(
      payment,
      contextFor(account, ledgerStub()),
    )
    expect(envelope.txBlob).toBe('SIGNEDBLOB')
    // The encoded raw body carries the binary-codec hex of the tx.
    expect(port.posts[0].body).toMatchObject({
      encodedTransaction: encode(payment),
    })
  })

  it('submitAsync rejects a transactor with no native path', async () => {
    const custody = await makeCustody(fakePort({}), true)
    const account = (await custody.listAccounts())[0]
    const escrow: Transaction = {
      TransactionType: 'EscrowFinish',
      Account: PRIMARY_ADDR,
      Owner: DEST_ADDR,
      OfferSequence: 5,
    }
    await expect(
      custody.submitAsync(escrow, contextFor(account, ledgerStub())),
    ).rejects.toBeInstanceOf(SimpleXRPLError)
  })
})

describe('PalisadeCustody.submitAsync — handle lifecycle', () => {
  it('returns a handle over the pending intent without blocking', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'SIGNATURE_PENDING' }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    const handle = await custody.submitAsync(
      payment,
      contextFor(account, ledgerStub()),
    )
    expect(handle.kind).toBe('palisade-custody')
    expect(handle.id).toBe('tx1')
    expect(handle.custodian).toBe(custody)
    expect(port.posts[0].url).toContain('/transactions/transfer')
  })

  it('poll returns a non-blocking snapshot of the current state', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'SIGNATURE_PENDING' }),
      onGet: () => ({
        transaction: { id: 'tx1', status: 'SIGNATURE_PENDING' },
      }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    const handle = await custody.submitAsync(
      payment,
      contextFor(account, ledgerStub()),
    )
    const snapshot = await handle.poll()
    expect(snapshot.source).toBe('palisade')
    expect(snapshot.intentId).toBe('tx1')
  })

  it('wait resolves once the intent reaches a terminal status', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'SIGNATURE_PENDING' }),
      onGet: () => ({
        transaction: { id: 'tx1', status: 'CONFIRMED', hash: 'H1' },
      }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    const handle = await custody.submitAsync(
      payment,
      contextFor(account, ledgerStub()),
    )
    const result = await handle.wait()
    expect(result.txHash).toBe('H1')
    expect(result.intentId).toBe('tx1')
  })

  it('wait throws IntentPendingError when it never goes terminal', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'SIGNATURE_PENDING' }),
      onGet: () => ({
        transaction: { id: 'tx1', status: 'SIGNATURE_PENDING' },
      }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    const handle = await custody.submitAsync(
      payment,
      contextFor(account, ledgerStub()),
    )
    await expect(handle.wait(1)).rejects.toBeInstanceOf(IntentPendingError)
  })

  it('cancel issues a freeze PUT while the intent is still pending', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'SIGNATURE_PENDING' }),
      onGet: () => ({
        transaction: { id: 'tx1', status: 'SIGNATURE_PENDING' },
      }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    const handle = await custody.submitAsync(
      payment,
      contextFor(account, ledgerStub()),
    )
    await handle.cancel?.()
    expect(port.puts[0].url).toContain('/transactions/tx1/freeze')
    expect(port.puts[0].url).toContain('reason=')
  })

  it('cancel rejects once the intent is already terminal', async () => {
    const port = fakePort({
      onSubmit: () => ({ id: 'tx1', status: 'SIGNATURE_PENDING' }),
      onGet: () => ({ transaction: { id: 'tx1', status: 'CONFIRMED' } }),
    })
    const custody = await makeCustody(port)
    const account = (await custody.listAccounts())[0]
    const handle = await custody.submitAsync(
      payment,
      contextFor(account, ledgerStub()),
    )
    await expect(handle.cancel?.()).rejects.toBeInstanceOf(SimpleXRPLError)
    expect(port.puts).toHaveLength(0)
  })
})
