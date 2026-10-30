import {
  decode,
  deriveAddress,
  ECDSA,
  encode,
  verifySignature,
  Wallet,
} from 'xrpl'
import type { Payment, Transaction, TxResponse } from 'xrpl'

import {
  ExternalSigner,
  SignedTransactionMismatchError,
  SignerCapabilityError,
  isTransactionSignerPort,
} from '../../../../src/index.js'
import type {
  LedgerPort,
  SignedTransactionBlob,
  SubmissionContext,
  TransactionSignerPort,
} from '../../../../src/index.js'

// Fixed seeds so the suite is deterministic (never used on-ledger).
const DEVICE = Wallet.fromEntropy(new Uint8Array(16).fill(1), {
  algorithm: ECDSA.ed25519,
})
const DEVICE_SECP = Wallet.fromEntropy(new Uint8Array(16).fill(2), {
  algorithm: ECDSA.secp256k1,
})
const OTHER = Wallet.fromEntropy(new Uint8Array(16).fill(3), {
  algorithm: ECDSA.ed25519,
})

/**
 * A fake whole-transaction signer — what a Ledger XRP app (or a relay to the
 * Ledger Button in a browser) looks like to the SDK. It records what it was
 * asked to sign, and lets a test tamper with the result.
 *
 * @param wallet - The key the "device" holds.
 * @param tamper - Optional mutation applied to the transaction before signing.
 * @returns The port plus the list of transactions it received.
 */
function fakeDevice(
  wallet: Wallet,
  tamper?: (tx: Transaction) => Transaction,
): { port: TransactionSignerPort; seen: Transaction[] } {
  const seen: Transaction[] = []
  const port: TransactionSignerPort = {
    publicKey: async (): Promise<string> => wallet.publicKey,
    async signTransaction(tx: Transaction) {
      seen.push(tx)
      return { txBlob: wallet.sign(tamper ? tamper(tx) : tx).tx_blob }
    },
  }
  return { port, seen }
}

/**
 * A port that returns a fixed blob regardless of input.
 *
 * @param wallet - The key whose public key the port reports.
 * @param blob - Builds the blob to return from the requested transaction.
 * @returns The port.
 */
function fixedBlobPort(
  wallet: Wallet,
  blob: (tx: Transaction) => string,
): TransactionSignerPort {
  return {
    publicKey: async (): Promise<string> => wallet.publicKey,
    signTransaction: async (tx: Transaction) => ({ txBlob: blob(tx) }),
  }
}

/**
 * A ledger that returns a canned success.
 *
 * @param response - Optional response override.
 * @returns The fake ledger.
 */
function ledgerStub(response?: TxResponse): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => tx,
    submit: async () => ({}) as never,
    submitAndWait: async () =>
      response ?? ({ result: { hash: 'HASH' } } as unknown as TxResponse),
    request: async <T>() => ({}) as T,
  }
}

/**
 * Build a submission context.
 *
 * @param address - The acting account.
 * @returns The context.
 */
function contextFor(address: string): SubmissionContext {
  return { account: { address, signer: {} as never }, ledger: ledgerStub() }
}

/**
 * A fully resolved Payment from `account`.
 *
 * @param account - The sender.
 * @returns The Payment.
 */
function paymentFrom(account: string): Payment {
  return {
    TransactionType: 'Payment',
    Account: account,
    Destination: OTHER.classicAddress,
    Amount: '1000000',
    Sequence: 1,
    Fee: '12',
    LastLedgerSequence: 100,
  }
}

describe('isTransactionSignerPort', () => {
  it('distinguishes whole-transaction ports from digest ports', () => {
    expect(isTransactionSignerPort(fakeDevice(DEVICE).port)).toBe(true)
    expect(
      isTransactionSignerPort({
        algorithm: 'secp256k1',
        publicKey: async () => '',
        signDigest: async () => ({ r: 0n, s: 0n }),
      }),
    ).toBe(false)
  })
})

describe('ExternalSigner with a TransactionSignerPort', () => {
  it.each([
    ['ed25519', DEVICE],
    ['secp256k1', DEVICE_SECP],
  ])(
    'hands the device the full transaction and returns a verified blob (%s)',
    async (_label, wallet) => {
      const { port, seen } = fakeDevice(wallet)
      const custody = await ExternalSigner.create({ signer: port })
      expect(custody.kind).toBe('external')
      expect(custody.primary.address).toBe(deriveAddress(wallet.publicKey))

      const tx = paymentFrom(custody.primary.address)
      const envelope = await custody.sign(
        tx,
        contextFor(custody.primary.address),
      )

      // The device saw the whole transaction (not a digest), pubkey attached.
      expect(seen).toHaveLength(1)
      expect(seen[0]).toEqual({ ...tx, SigningPubKey: wallet.publicKey })

      expect(verifySignature(envelope.txBlob, wallet.publicKey)).toBe(true)
      expect(decode(envelope.txBlob).Destination).toBe(OTHER.classicAddress)
    },
  )

  it('rejects a blob whose destination was changed', async () => {
    const { port } = fakeDevice(DEVICE, (tx) => ({
      ...tx,
      Destination: DEVICE_SECP.classicAddress,
    }))
    const custody = await ExternalSigner.create({ signer: port })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toBeInstanceOf(SignedTransactionMismatchError)
  })

  it('rejects a blob with an added field', async () => {
    const { port } = fakeDevice(DEVICE, (tx) => ({
      ...tx,
      Memos: [{ Memo: { MemoData: 'DEADBEEF' } }],
    }))
    const custody = await ExternalSigner.create({ signer: port })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toBeInstanceOf(SignedTransactionMismatchError)
  })

  it('rejects a widened expiry window', async () => {
    const { port } = fakeDevice(DEVICE, (tx) => ({
      ...tx,
      LastLedgerSequence: 10_000,
    }))
    const custody = await ExternalSigner.create({ signer: port })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toBeInstanceOf(SignedTransactionMismatchError)
  })

  it('rejects an unsigned blob', async () => {
    const port = fixedBlobPort(DEVICE, (tx) => encode(tx))
    const custody = await ExternalSigner.create({ signer: port })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toThrow(/without a TxnSignature/u)
  })

  it('rejects a signature from a different key', async () => {
    // Right fields, right SigningPubKey, but signed by someone else.
    const port = fixedBlobPort(DEVICE, (tx) => {
      const forged = decode(
        OTHER.sign({ ...tx, SigningPubKey: undefined }).tx_blob,
      )
      return encode({ ...tx, TxnSignature: forged.TxnSignature as string })
    })
    const custody = await ExternalSigner.create({ signer: port })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toThrow(/does not verify/u)
  })

  it('rejects a blob that does not decode', async () => {
    const port = fixedBlobPort(DEVICE, () => 'not-hex')
    const custody = await ExternalSigner.create({ signer: port })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toBeInstanceOf(SignedTransactionMismatchError)
  })

  it('rejects a blob signed by a different device key', async () => {
    const port: TransactionSignerPort = {
      publicKey: async (): Promise<string> => DEVICE.publicKey,
      signTransaction: async (tx: Transaction) => ({
        txBlob: OTHER.sign({ ...tx, SigningPubKey: undefined }).tx_blob,
      }),
    }
    const custody = await ExternalSigner.create({ signer: port })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toThrow(/different key/u)
  })

  it('keeps the dryRun and fee guards', async () => {
    const custody = await ExternalSigner.create({
      signer: fakeDevice(DEVICE).port,
    })
    const tx = paymentFrom(custody.primary.address)
    const ctx = contextFor(custody.primary.address)
    await expect(
      custody.sign(tx, { ...ctx, dryRun: true }),
    ).rejects.toBeInstanceOf(SignerCapabilityError)
    await expect(
      custody.sign(tx, { ...ctx, fee: { maxFeeDrops: '5000' } }),
    ).rejects.toBeInstanceOf(SignerCapabilityError)
  })

  it('submits the verified blob through the shared ledger', async () => {
    const custody = await ExternalSigner.create({
      signer: fakeDevice(DEVICE).port,
    })
    const result = await custody.submitAndWait(
      paymentFrom(custody.primary.address),
      contextFor(custody.primary.address),
    )
    expect(result.source).toBe('xrpld')
    expect(result.txHash).toBe('HASH')
  })
})

describe('TransactionSignerPort without publicKey (key learned on first sign)', () => {
  /**
   * A device that, like the Ledger Button's XRP provider, exposes only the
   * address up front and sets SigningPubKey itself when it signs.
   *
   * @param wallet - The key the device holds.
   * @returns The port plus the transactions it received.
   */
  function addressOnlyDevice(wallet: Wallet): {
    port: TransactionSignerPort
    seen: Transaction[]
  } {
    const seen: Transaction[] = []
    return {
      seen,
      port: {
        async signTransaction(tx: Transaction): Promise<SignedTransactionBlob> {
          seen.push(tx)
          return { txBlob: wallet.sign(tx).tx_blob }
        },
      },
    }
  }

  it('needs an address', async () => {
    await expect(
      ExternalSigner.create({ signer: addressOnlyDevice(DEVICE).port }),
    ).rejects.toThrow(/needs an address/u)
  })

  it('learns the key from the first signature and pins it', async () => {
    const { port, seen } = addressOnlyDevice(DEVICE_SECP)
    const custody = await ExternalSigner.create({
      signer: port,
      address: DEVICE_SECP.classicAddress,
    })
    const ctx = contextFor(custody.primary.address)

    const first = await custody.sign(paymentFrom(custody.primary.address), ctx)
    expect(seen[0].SigningPubKey).toBeUndefined()
    expect(verifySignature(first.txBlob, DEVICE_SECP.publicKey)).toBe(true)

    await custody.sign(paymentFrom(custody.primary.address), ctx)
    expect(seen[1].SigningPubKey).toBe(DEVICE_SECP.publicKey)
  })

  it("rejects a key that is not the account's master key", async () => {
    const custody = await ExternalSigner.create({
      signer: addressOnlyDevice(OTHER).port,
      address: DEVICE.classicAddress,
    })
    await expect(
      custody.sign(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address),
      ),
    ).rejects.toThrow(/master key/u)
  })
})
