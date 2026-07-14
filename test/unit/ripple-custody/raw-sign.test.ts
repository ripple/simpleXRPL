import { Wallet, decode, encodeForSigning } from 'xrpl'
import type { Payment } from 'xrpl'

import {
  assembleSignedTransaction,
  buildSigningPreimage,
} from '../../../src/custodians/ripple/submission/raw-sign.js'

/**
 * Encode a hex string as base64, mirroring how Custody's API carries binary
 * fields.
 *
 * @param hex - The hex-encoded bytes.
 * @returns The same bytes, base64-encoded.
 */
function hexToBase64(hex: string): string {
  return Buffer.from(hex, 'hex').toString('base64')
}

describe('buildSigningPreimage / assembleSignedTransaction', () => {
  it('reproduces exactly what Wallet.sign() computes and returns, given the same signature', () => {
    const wallet = Wallet.generate()
    const destination = Wallet.generate().classicAddress
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: wallet.classicAddress,
      Destination: destination,
      Amount: '1000000',
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 100,
    }

    const { preparedTx, preimageBase64 } = buildSigningPreimage(
      tx,
      hexToBase64(wallet.publicKey),
    )

    expect(preparedTx.SigningPubKey).toBe(wallet.publicKey)
    expect(
      Buffer.from(preimageBase64, 'base64').toString('hex').toUpperCase(),
    ).toBe(encodeForSigning(preparedTx))

    // The real, trusted signing path — used here only as an oracle for the
    // signature bytes an external signer (Custody) would independently produce.
    const reallySigned = wallet.sign(tx)
    const decoded = decode(reallySigned.tx_blob) as { TxnSignature: string }

    const reassembled = assembleSignedTransaction(
      preparedTx,
      hexToBase64(decoded.TxnSignature),
    )

    expect(reassembled.txBlob).toBe(reallySigned.tx_blob)
    expect(reassembled.hash).toBe(reallySigned.hash)
  })
})
