import { encode, encodeForSigning, hashes } from 'xrpl'
import type { Transaction } from 'xrpl'

import type { SignedEnvelope } from '../../../domain/index.js'

/**
 * Convert a base64 string (Custody's wire encoding) to uppercase hex (XRPL's).
 *
 * @param base64 - The base64-encoded bytes.
 * @returns The same bytes, hex-encoded and uppercased.
 */
function base64ToUpperHex(base64: string): string {
  return Buffer.from(base64, 'base64').toString('hex').toUpperCase()
}

/**
 * Build the canonical signing preimage an external signer must sign over
 * (RippleRaw): stamp `SigningPubKey` on the autofilled transaction, then
 * serialize it exactly as `Wallet.sign()` would before hashing/signing.
 * `SigningPubKey` has to be present in the preimage itself — XRPL includes it
 * in what gets signed, not just in the final blob.
 *
 * @param tx - The fully autofilled transaction (Sequence/Fee/LastLedgerSequence set).
 * @param signingPubKeyBase64 - The account's XRPL public key, base64 (Custody's encoding).
 * @returns The transaction with `SigningPubKey` stamped, and the base64 preimage
 * to send Custody as `Core_ManifestContent_Unsafe.value`.
 */
export function buildSigningPreimage(
  tx: Transaction,
  signingPubKeyBase64: string,
): { preparedTx: Transaction; preimageBase64: string } {
  const signingPubKey = base64ToUpperHex(signingPubKeyBase64)
  const preparedTx: Transaction = { ...tx, SigningPubKey: signingPubKey }
  const preimageHex = encodeForSigning(preparedTx)
  return {
    preparedTx,
    preimageBase64: Buffer.from(preimageHex, 'hex').toString('base64'),
  }
}

/**
 * Reassemble a fully signed, submittable transaction from Custody's returned
 * signature (RippleRaw): stamp `TxnSignature`, re-serialize, and hash
 * — the same shape `Wallet.sign()` returns, so it drops straight into
 * {@link LedgerPort.submitAndWait}.
 *
 * @param preparedTx - The transaction returned by {@link buildSigningPreimage}
 * (already carries `SigningPubKey`).
 * @param signatureBase64 - Custody's signature over the preimage, base64
 * (`Core_ManifestValue_Unsafe.signature`).
 * @returns The signed transaction blob (hex) and its hash.
 */
export function assembleSignedTransaction(
  preparedTx: Transaction,
  signatureBase64: string,
): SignedEnvelope {
  const signedTx: Transaction = {
    ...preparedTx,
    TxnSignature: base64ToUpperHex(signatureBase64),
  }
  const txBlob = encode(signedTx)
  return { txBlob, hash: hashes.hashSignedTx(txBlob) }
}
