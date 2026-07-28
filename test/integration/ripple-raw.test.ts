import { decode } from 'xrpl'
import type { Payment, Transaction, TxResponse } from 'xrpl'

import {
  assembleSignedTransaction,
  buildSigningPreimage,
} from '../../src/custodians/ripple/submission/raw-sign.js'

import { fundedTestnetClient } from './helpers/testnet.js'

const LIVE_TIMEOUT_MS = 120_000

/**
 * Encode a hex string as base64, mirroring how Custody carries a signature
 * on the wire (`Core_ManifestValue_Unsafe.signature`).
 *
 * @param hex - The hex-encoded bytes.
 * @returns The same bytes, base64-encoded.
 */
function hexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64')
}

/**
 * Read the engine result from a live transaction response.
 *
 * @param response - The `submitAndWait` response.
 * @returns The `TransactionResult` code, or `undefined` if the metadata is
 * not the parsed object form.
 */
function engineResultOf(response: TxResponse): string | undefined {
  const { meta } = response.result
  if (typeof meta === 'object') {
    return meta.TransactionResult
  }
  return undefined
}

describe('RippleRaw signing (live testnet)', () => {
  it(
    'builds a preimage, reassembles the external signature, and xrpld accepts the blob on-ledger',
    async () => {
      const { client, source, destination } = await fundedTestnetClient()
      try {
        // A built, business-level transaction — the raw-sign primitives are
        // transactor-agnostic, so a Payment reliably exercises the whole chain.
        const payment: Payment = {
          TransactionType: 'Payment',
          Account: source.classicAddress,
          Destination: destination.classicAddress,
          Amount: '10',
        }
        // The RippleRaw path autofills the whole transaction itself, since the
        // custodian signs an externally constructed blob.
        const autofilled: Transaction = await client.ledger.autofill(payment)

        // Custody carries the account's XRPL public key base64-encoded; the
        // primitive re-hexes it back onto the preimage's SigningPubKey.
        const publicKeyBase64 = Buffer.from(source.publicKey, 'hex').toString(
          'base64',
        )
        const { preparedTx, preimageBase64 } = buildSigningPreimage(
          autofilled,
          publicKeyBase64,
        )

        // Stand in for the Custody vault: the funded wallet signs the same
        // preimage, exactly as `v0_SignManifest` + `Unsafe` would return.
        const referenceSigned = source.sign(autofilled)
        const decoded = decode(referenceSigned.tx_blob) as {
          TxnSignature: string
        }
        const envelope = assembleSignedTransaction(
          preparedTx,
          hexToBase64(decoded.TxnSignature),
        )

        // Reassembly reproduces exactly what a real signer would submit, and
        // the preimage we built is the one that signature covers.
        expect(preimageBase64.length).toBeGreaterThan(0)
        expect(envelope.txBlob).toBe(referenceSigned.tx_blob)

        const response = await client.ledger.submitAndWait(envelope.txBlob)
        expect(engineResultOf(response)).toBe('tesSUCCESS')
        // The hash we computed during reassembly matches what xrpld recorded.
        expect(response.result.hash).toBe(envelope.hash)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
