import { ed25519 } from '@noble/curves/ed25519'
import { secp256k1 } from '@noble/curves/secp256k1'
import { verify } from 'ripple-keypairs'
import { decode, deriveAddress, encodeForSigning, Wallet } from 'xrpl'
import type { Payment, Transaction, TxResponse } from 'xrpl'

import {
  ExternalSigner,
  XrpldSubmitError,
  dispatch,
  isNativePath,
} from '../../../../src/index.js'
import type {
  EcdsaSignature,
  Ed25519SignerPort,
  ExternalSignerPort,
  LedgerPort,
  SubmissionContext,
} from '../../../../src/index.js'

// A fixed test private key (never used on-ledger). The "KMS/HSM" signs digests
// with it in-process; the real port would delegate to the provider.
const PRIV = Uint8Array.from(
  Buffer.from(
    'c9537c5a2f3f7e1d4b6a8c0e2f4d6b8a1c3e5f7091b3d5f7a9c1e3050709b0d0f',
    'hex',
  ),
)
const PUB_HEX = Buffer.from(secp256k1.getPublicKey(PRIV, true))
  .toString('hex')
  .toUpperCase()
const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
const HALF_N = SECP256K1_N / 2n

/**
 * A fake external signer backed by the test key.
 *
 * @param highS - Return a non-canonical (high-`s`) signature, to exercise the
 * SDK's low-S normalization.
 * @returns An {@link ExternalSignerPort} over the test key.
 */
function fakePort(highS = false): ExternalSignerPort {
  return {
    algorithm: 'secp256k1',
    publicKey: async (): Promise<string> => PUB_HEX,
    async signDigest(digest: Uint8Array): Promise<EcdsaSignature> {
      const sig = secp256k1.sign(digest, PRIV)
      const sNorm = highS ? SECP256K1_N - sig.s : sig.s
      return { r: sig.r, s: sNorm }
    },
  }
}

// A fixed ed25519 test key. XRPL prefixes the 32-byte public key with `ED`.
const ED_PRIV = Uint8Array.from(
  Buffer.from(
    '9d61b19deffebc3a6c1f6b2d7e5f8a0b1c2d3e4f5061728394a5b6c7d8e9f001',
    'hex',
  ),
)
const ED_PUB_HEX =
  `ED${Buffer.from(ed25519.getPublicKey(ED_PRIV)).toString('hex')}`.toUpperCase()

/**
 * A fake ed25519 external signer backed by the test key.
 *
 * @returns An {@link Ed25519SignerPort} over the ed25519 test key.
 */
function fakeEd25519Port(): Ed25519SignerPort {
  return {
    algorithm: 'ed25519',
    publicKey: async (): Promise<string> => ED_PUB_HEX,
    signMessage: async (message: Uint8Array): Promise<Uint8Array> =>
      ed25519.sign(message, ED_PRIV),
  }
}

/**
 * A ledger that echoes the built transaction and returns a canned response.
 *
 * @param response - The response `submitAndWait` resolves to (default success).
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
 * Build a submission context for an account and ledger.
 *
 * @param address - The acting account's r-address.
 * @param ledger - The ledger port.
 * @returns The submission context.
 */
function contextFor(address: string, ledger: LedgerPort): SubmissionContext {
  return { account: { address, signer: {} as never }, ledger }
}

/**
 * A valid, fully-resolved Payment from `account`.
 *
 * @param account - The sending account's r-address.
 * @returns The Payment transaction.
 */
function paymentFrom(account: string): Payment {
  return {
    TransactionType: 'Payment',
    Account: account,
    Destination: Wallet.generate().classicAddress,
    Amount: '1000000',
    Sequence: 1,
    Fee: '12',
    LastLedgerSequence: 100,
  }
}

describe('ExternalSigner.create', () => {
  it('derives the account address from the public key', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort() })
    expect(custody.kind).toBe('external')
    expect(custody.primary.address).toBe(deriveAddress(PUB_HEX))
    expect((await custody.listAccounts())[0].address).toBe(
      custody.primary.address,
    )
  })

  it('honors an explicit address (regular-key case)', async () => {
    const address = Wallet.generate().classicAddress
    const custody = await ExternalSigner.create({ signer: fakePort(), address })
    expect(custody.primary.address).toBe(address)
  })

  it('reports raw-only capabilities', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort() })
    const caps = custody.capabilities()
    expect(caps.allowRaw).toBe(true)
    expect(caps.nativeOps.size).toBe(0)
  })
})

describe('ExternalSigner.sign', () => {
  it('produces a blob whose signature verifies against the public key', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort() })
    const tx = paymentFrom(custody.primary.address)

    const envelope = await custody.sign(
      tx,
      contextFor(custody.primary.address, ledgerStub()),
    )
    const decoded = decode(envelope.txBlob)
    expect(decoded.SigningPubKey).toBe(PUB_HEX)

    // End-to-end: ripple-keypairs re-hashes the signing data and verifies.
    const signingData = encodeForSigning({ ...tx, SigningPubKey: PUB_HEX })
    expect(verify(signingData, decoded.TxnSignature as string, PUB_HEX)).toBe(
      true,
    )
  })

  it('signs with an ed25519 key (message signed directly, no digest)', async () => {
    const custody = await ExternalSigner.create({ signer: fakeEd25519Port() })
    expect(custody.primary.address).toBe(deriveAddress(ED_PUB_HEX))

    const tx = paymentFrom(custody.primary.address)
    const envelope = await custody.sign(
      tx,
      contextFor(custody.primary.address, ledgerStub()),
    )
    const decoded = decode(envelope.txBlob)
    expect(decoded.SigningPubKey).toBe(ED_PUB_HEX)

    const signingData = encodeForSigning({ ...tx, SigningPubKey: ED_PUB_HEX })
    expect(
      verify(signingData, decoded.TxnSignature as string, ED_PUB_HEX),
    ).toBe(true)
  })

  it('normalizes a high-S signature to canonical low-S', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort(true) })
    const tx = paymentFrom(custody.primary.address)

    const envelope = await custody.sign(
      tx,
      contextFor(custody.primary.address, ledgerStub()),
    )
    const decoded = decode(envelope.txBlob)
    const sig = secp256k1.Signature.fromDER(decoded.TxnSignature as string)
    expect(sig.s <= HALF_N).toBe(true)
    expect(sig.hasHighS()).toBe(false)

    // Still a valid signature after normalization.
    const signingData = encodeForSigning({ ...tx, SigningPubKey: PUB_HEX })
    expect(verify(signingData, decoded.TxnSignature as string, PUB_HEX)).toBe(
      true,
    )
  })
})

describe('ExternalSigner.submitAndWait / submitAsync', () => {
  it('submits through the ledger and returns a xrpld result', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort() })
    const result = await custody.submitAndWait(
      paymentFrom(custody.primary.address),
      contextFor(custody.primary.address, ledgerStub()),
    )
    expect(result.source).toBe('xrpld')
    expect(result.txHash).toBe('HASH')
  })

  it('throws XrpldSubmitError on a non-tesSUCCESS engine result', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort() })
    const failing = ledgerStub({
      result: { hash: 'H', meta: { TransactionResult: 'tecUNFUNDED_PAYMENT' } },
    } as unknown as TxResponse)
    await expect(
      custody.submitAndWait(
        paymentFrom(custody.primary.address),
        contextFor(custody.primary.address, failing),
      ),
    ).rejects.toBeInstanceOf(XrpldSubmitError)
  })

  it('submitAsync returns a pre-resolved handle keyed by tx hash', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort() })
    const handle = await custody.submitAsync(
      paymentFrom(custody.primary.address),
      contextFor(custody.primary.address, ledgerStub()),
    )
    expect(handle.kind).toBe('external')
    expect(handle.id).toBe('HASH')
    expect((await handle.poll()).txHash).toBe('HASH')
    expect((await handle.wait()).txHash).toBe('HASH')
    expect(handle.cancel).toBeUndefined()
  })
})

describe('dispatch — external', () => {
  it('routes an external account to the external (shared-ledger) path', async () => {
    const custody = await ExternalSigner.create({ signer: fakePort() })
    const account = (await custody.listAccounts())[0]
    const path = dispatch(account, 'Payment')
    expect(path).toBe('external')
    expect(isNativePath(path)).toBe(false)
  })
})
