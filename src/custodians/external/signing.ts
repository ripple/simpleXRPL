import { createHash } from 'node:crypto'

import { encode, encodeForSigning, hashes } from 'xrpl'
import type { Transaction } from 'xrpl'

import type { SignedEnvelope } from '../../domain/index.js'

import type {
  EcdsaSignature,
  Ed25519SignerPort,
  ExternalSignerPort,
  Secp256k1SignerPort,
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
 * Produce the `TxnSignature` hex for a secp256k1 key: hash the signing data to
 * XRPL's SHA-512Half digest, delegate to the port, normalize to low-S, then
 * DER-encode.
 *
 * @param signingDataHex - The hex from `encodeForSigning`.
 * @param port - The secp256k1 external signer.
 * @returns The uppercase DER signature hex.
 */
async function secp256k1Signature(
  signingDataHex: string,
  port: Secp256k1SignerPort,
): Promise<string> {
  const signature = await port.signDigest(signingDigest(signingDataHex))
  return derEncode({ r: signature.r, s: normalizeLowS(signature.s) })
}

/**
 * Produce the `TxnSignature` hex for an ed25519 key: sign the signing-data
 * bytes directly (ed25519 hashes internally) and hex-encode the 64-byte result.
 *
 * @param signingDataHex - The hex from `encodeForSigning`.
 * @param port - The ed25519 external signer.
 * @returns The uppercase signature hex.
 */
async function ed25519Signature(
  signingDataHex: string,
  port: Ed25519SignerPort,
): Promise<string> {
  const signature = await port.signMessage(Buffer.from(signingDataHex, 'hex'))
  return Buffer.from(signature).toString('hex').toUpperCase()
}

/**
 * Sign a transaction with an external (KMS/HSM) key: set the signing public
 * key, produce the scheme-specific signature via the port (the private key
 * never enters the process), attach it, and serialize.
 *
 * @param tx - The autofilled transaction to sign.
 * @param publicKeyHex - The signer's XRPL-format public key.
 * @param port - The external signer.
 * @returns The signed envelope (blob + hash).
 */
export async function signTransactionExternally(
  tx: Transaction,
  publicKeyHex: string,
  port: ExternalSignerPort,
): Promise<SignedEnvelope> {
  const toSign = { ...tx, SigningPubKey: publicKeyHex }
  const signingDataHex = encodeForSigning(toSign)
  const txnSignature =
    port.algorithm === 'ed25519'
      ? await ed25519Signature(signingDataHex, port)
      : await secp256k1Signature(signingDataHex, port)
  const txBlob = encode({ ...toSign, TxnSignature: txnSignature })
  return { txBlob, hash: hashes.hashSignedTx(txBlob) }
}
