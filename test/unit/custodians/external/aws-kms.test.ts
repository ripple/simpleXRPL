import { createPublicKey } from 'node:crypto'

import { GetPublicKeyCommand, SignCommand } from '@aws-sdk/client-kms'
import type { KMSClient } from '@aws-sdk/client-kms'
import { secp256k1 } from '@noble/curves/secp256k1'
import { verify } from 'ripple-keypairs'
import { decode, deriveAddress, encodeForSigning } from 'xrpl'
import type { Payment, Transaction, TxResponse } from 'xrpl'

import { AwsKmsSigner } from '../../../../src/custodians/external/adapters/aws-kms.js'
import { ExternalSigner } from '../../../../src/index.js'
import type { LedgerPort, SubmissionContext } from '../../../../src/index.js'

const PRIV = Uint8Array.from(
  Buffer.from(
    'c9537c5a2f3f7e1d4b6a8c0e2f4d6b8a1c3e5f7091b3d5f7a9c1e3050709b0d0f',
    'hex',
  ),
)
const PUB_COMPRESSED = Buffer.from(secp256k1.getPublicKey(PRIV, true))
  .toString('hex')
  .toUpperCase()

/**
 * Build the SPKI-DER public key AWS KMS `GetPublicKey` would return.
 *
 * @returns The SPKI-DER encoding of the test public key.
 */
function spkiDer(): Uint8Array {
  const uncompressed = secp256k1.getPublicKey(PRIV, false)
  const der = createPublicKey({
    key: {
      kty: 'EC',
      crv: 'secp256k1',
      x: Buffer.from(uncompressed.slice(1, 33)).toString('base64url'),
      y: Buffer.from(uncompressed.slice(33, 65)).toString('base64url'),
    },
    format: 'jwk',
  }).export({ format: 'der', type: 'spki' })
  return Uint8Array.from(der)
}

/** A fake KMS: records the last sign command, answers like KMS would. */
interface FakeKms {
  client: KMSClient
  lastSign?: SignCommand
}

/**
 * Build a fake KMS client backed by the test key.
 *
 * @returns The fake, exposing its client and the last sign command seen.
 */
function fakeKms(): FakeKms {
  const fake: FakeKms = {} as FakeKms
  fake.client = {
    async send(command: GetPublicKeyCommand | SignCommand): Promise<unknown> {
      if (command instanceof GetPublicKeyCommand) {
        return { PublicKey: spkiDer() }
      }
      fake.lastSign = command
      const digest = command.input.Message as Uint8Array
      return { Signature: secp256k1.sign(digest, PRIV).toDERRawBytes() }
    },
  } as unknown as KMSClient
  return fake
}

/**
 * A ledger that echoes the built transaction and returns a canned response.
 *
 * @returns The fake ledger.
 */
function ledgerStub(): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => tx,
    submit: async () => ({}) as never,
    submitAndWait: async () =>
      ({ result: { hash: 'HASH' } }) as unknown as TxResponse,
    request: async <T>() => ({}) as T,
  }
}

describe('AwsKmsSigner', () => {
  it('compresses the SPKI public key from KMS', async () => {
    const signer = AwsKmsSigner.create({ keyId: 'k', client: fakeKms().client })
    expect(await signer.publicKey()).toBe(PUB_COMPRESSED)
    expect(signer.algorithm).toBe('secp256k1')
  })

  it('signs a digest as DIGEST/ECDSA_SHA_256 and parses the DER result', async () => {
    const fake = fakeKms()
    const signer = AwsKmsSigner.create({ keyId: 'my-key', client: fake.client })
    const digest = Uint8Array.from(Buffer.alloc(32, 7))

    const { r, s } = await signer.signDigest(digest)
    const expected = secp256k1.sign(digest, PRIV)
    expect(r).toBe(expected.r)
    expect(s).toBe(expected.s)

    expect(fake.lastSign?.input.KeyId).toBe('my-key')
    expect(fake.lastSign?.input.MessageType).toBe('DIGEST')
    expect(fake.lastSign?.input.SigningAlgorithm).toBe('ECDSA_SHA_256')
  })

  it('drives ExternalSigner to a verifiable on-ledger signature', async () => {
    const signer = AwsKmsSigner.create({ keyId: 'k', client: fakeKms().client })
    const custody = await ExternalSigner.create({ signer })
    const address = custody.primary.address
    expect(address).toBe(deriveAddress(PUB_COMPRESSED))

    const tx: Payment = {
      TransactionType: 'Payment',
      Account: address,
      Destination: deriveAddress(PUB_COMPRESSED),
      Amount: '1000000',
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 100,
    }
    const context: SubmissionContext = {
      account: { address, signer: {} as never },
      ledger: ledgerStub(),
    }
    const envelope = await custody.sign(tx, context)
    const decoded = decode(envelope.txBlob)
    const signingData = encodeForSigning({
      ...tx,
      SigningPubKey: PUB_COMPRESSED,
    })
    expect(
      verify(signingData, decoded.TxnSignature as string, PUB_COMPRESSED),
    ).toBe(true)
  })
})
