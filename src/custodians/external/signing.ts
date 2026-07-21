import { createHash } from 'node:crypto'

import { encode, encodeForSigning, hashes } from 'xrpl'
import type { Transaction } from 'xrpl'

import type { SignedEnvelope } from '../../domain/index.js'

import type {
  EcdsaSignature,
  ExternalSignerPort,
} from './external-signer-port.js'

/** The order of the secp256k1 curve. */
const SECP256K1_N =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
/** Half the curve order; `s` above this is non-canonical and XRPL rejects it. */
const SECP256K1_HALF_N =
  0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0n
/** SHA-512Half keeps the first 32 bytes of the SHA-512 digest. */
const DIGEST_BYTES = 32
/** DER tags and the high-bit mask used when encoding integers. */
const DER_SEQUENCE = 0x30
const DER_INTEGER = 0x02
const HIGH_BIT = 0x80
/** Radix for hex string conversion. */
const HEX_RADIX = 16

/**
 * XRPL's secp256k1 signing digest: the first 32 bytes of the SHA-512 of the
 * signing data (a.k.a. SHA-512Half). This is what the external signer must sign.
 *
 * @param signingDataHex - The hex from `encodeForSigning`.
 * @returns The 32-byte digest.
 */
export function signingDigest(signingDataHex: string): Buffer {
  return createHash('sha512')
    .update(Buffer.from(signingDataHex, 'hex'))
    .digest()
    .subarray(0, DIGEST_BYTES)
}

/**
 * Fold `s` into the low half of the curve order. KMS/HSM signatures are not
 * guaranteed canonical, and XRPL rejects a high-`s` signature.
 *
 * @param s - The raw `s` scalar.
 * @returns The canonical low-`s` scalar.
 */
function normalizeLowS(s: bigint): bigint {
  return s > SECP256K1_HALF_N ? SECP256K1_N - s : s
}

/**
 * Encode a non-negative integer as a minimal-length big-endian byte buffer.
 *
 * @param value - The non-negative integer.
 * @returns The big-endian bytes (at least one byte).
 */
function toBigEndianBytes(value: bigint): Buffer {
  const hex = value.toString(HEX_RADIX)
  return Buffer.from(hex.length % 2 === 0 ? hex : `0${hex}`, 'hex')
}

/**
 * DER-encode one signature scalar as an ASN.1 INTEGER, prefixing `0x00` when
 * the high bit is set so it stays positive.
 *
 * @param value - The scalar to encode.
 * @returns The DER INTEGER (tag, length, contents).
 */
function derInteger(value: bigint): Buffer {
  const bytes = toBigEndianBytes(value)
  // eslint-disable-next-line no-bitwise -- DER requires a sign-byte check.
  const highBitSet = (bytes[0] & HIGH_BIT) === HIGH_BIT
  const contents = highBitSet ? Buffer.concat([Buffer.from([0]), bytes]) : bytes
  return Buffer.concat([Buffer.from([DER_INTEGER, contents.length]), contents])
}

/**
 * DER-encode a `{ r, s }` signature as XRPL expects for `TxnSignature`. Both
 * scalars fit well under 128 bytes, so lengths are always single-byte.
 *
 * @param signature - The signature scalars (`s` already normalized).
 * @returns The uppercase DER hex.
 */
function derEncode(signature: EcdsaSignature): string {
  const rDer = derInteger(signature.r)
  const sDer = derInteger(signature.s)
  const sequence = Buffer.concat([
    Buffer.from([DER_SEQUENCE, rDer.length + sDer.length]),
    rDer,
    sDer,
  ])
  return sequence.toString('hex').toUpperCase()
}

/**
 * Sign a transaction with an external (KMS/HSM) key: set the signing public
 * key, hash the signing data, delegate the digest to the port, then normalize,
 * DER-encode, attach, and serialize. The private key never enters the process.
 *
 * @param tx - The autofilled transaction to sign.
 * @param publicKeyHex - The signer's XRPL-format compressed public key.
 * @param port - The external signer.
 * @returns The signed envelope (blob + hash).
 */
export async function signTransactionExternally(
  tx: Transaction,
  publicKeyHex: string,
  port: ExternalSignerPort,
): Promise<SignedEnvelope> {
  const toSign = { ...tx, SigningPubKey: publicKeyHex }
  const digest = signingDigest(encodeForSigning(toSign))
  const signature = await port.signDigest(digest)
  const txnSignature = derEncode({
    r: signature.r,
    s: normalizeLowS(signature.s),
  })
  const txBlob = encode({ ...toSign, TxnSignature: txnSignature })
  return { txBlob, hash: hashes.hashSignedTx(txBlob) }
}
