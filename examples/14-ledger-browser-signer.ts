/**
 * Signing with a Ledger device through the Ledger Button, from a Node server.
 *
 * simpleXRPL runs in Node; the Ledger Button (`@ledgerhq/ledger-wallet-provider`
 * + `@ledgerhq/ledger-wallet-provider-xrp`) runs in the browser and talks to
 * the device over USB/BLE. The Ledger XRP app signs whole transactions — it
 * parses and displays every field — so it plugs into the whole-transaction
 * seam, `TransactionSignerPort`, rather than the digest seam used for KMS/HSM.
 *
 * Flow: the server builds and autofills the transaction with a vertical verb;
 * the port parks it as a pending request; the browser fetches it, the user
 * approves it on the device, and the browser posts the signed blob back. The
 * SDK then checks the blob is byte-for-byte the transaction it asked for and
 * that the signature verifies, before submitting it.
 *
 * As shipped this file is illustrative: wire `relay.pending()` and
 * `relay.complete()` to your own HTTP or WebSocket endpoints.
 */
import { randomUUID } from 'node:crypto'

import { ExternalSigner, SimpleXRPL } from 'simplexrpl'
import type { SignedTransactionBlob, TransactionSignerPort } from 'simplexrpl'
import type { Transaction } from 'xrpl'

/** One transaction waiting for the user to approve it on their device. */
interface PendingSignature {
  readonly id: string
  readonly tx: Transaction
  readonly resolve: (signed: SignedTransactionBlob) => void
  readonly reject: (error: Error) => void
}

/**
 * A `TransactionSignerPort` that relays each transaction to the user's browser
 * and waits for the Ledger Button to return it signed. One relay per user
 * session (one Ledger account).
 */
class BrowserSigningRelay implements TransactionSignerPort {
  private readonly queue = new Map<string, PendingSignature>()

  /**
   * No `publicKey()`: the Ledger Button reports only the address on connect,
   * so the SDK learns the key from the first signature (see `payFromLedger`).
   *
   * @param timeoutMs - How long to wait for the user before giving up. Keep it
   *   inside the transaction's LastLedgerSequence window.
   */
  public constructor(private readonly timeoutMs = 60_000) {}

  public readonly signTransaction = async (
    tx: Transaction,
  ): Promise<SignedTransactionBlob> =>
    new Promise((resolve, reject) => {
      const id = randomUUID()
      const timer = setTimeout(() => {
        this.queue.delete(id)
        reject(new Error('Timed out waiting for device approval'))
      }, this.timeoutMs)
      this.queue.set(id, {
        id,
        tx,
        resolve: (signed) => {
          clearTimeout(timer)
          resolve(signed)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
    })

  /**
   * GET /sign-requests: what the browser should put in front of the device.
   *
   * @returns The pending transactions.
   */
  public pending(): { id: string; tx: Transaction }[] {
    return [...this.queue.values()].map(({ id, tx }) => ({ id, tx }))
  }

  /**
   * POST /sign-requests/:id: the browser reports the outcome.
   *
   * @param id - The request id.
   * @param result - The signed blob, or the user's rejection.
   */
  public complete(
    id: string,
    result: { txBlob: string } | { error: string },
  ): void {
    const entry = this.queue.get(id)
    if (entry === undefined) return
    this.queue.delete(id)
    if ('txBlob' in result) entry.resolve({ txBlob: result.txBlob })
    else entry.reject(new Error(result.error))
  }
}

// === Server side: what you write with simpleXRPL ===
// `address` comes from the browser once the user has connected their Ledger.
// The verb below is ordinary simpleXRPL; only the signer differs.
async function payFromLedger(address: string): Promise<void> {
  const relay = new BrowserSigningRelay()
  const ledgerAccount = await ExternalSigner.create({ signer: relay, address })

  const client = await SimpleXRPL.init({
    xrpldUrl: 'wss://s.altnet.rippletest.net:51233', // XRPL Testnet
    signers: [ledgerAccount],
  })

  // Blocks until the user approves on the device (or the relay times out).
  const result = await client.xrp.transfer({
    to: 'rPT1Sjq2YGrBMTttX4GZHjKu9dyfzbpAYe',
    amount: '10',
  })
  console.log(`Signed on device and submitted: ${result.txHash ?? ''}`)
  await client.disconnect()
}

// === Browser side (not part of this file's build) ===
// The Ledger Button announces its XRP provider with a window-event handshake:
//
//   import { initializeLedgerProvider } from '@ledgerhq/ledger-wallet-provider'
//   import { xrpBlockchainProviderFactory } from '@ledgerhq/ledger-wallet-provider-xrp'
//
//   initializeLedgerProvider({ dAppIdentifier, apiKey,
//     blockchainProviderFactories: [xrpBlockchainProviderFactory] })
//
//   window.addEventListener('ledger-xrpl:announceProvider', async (e) => {
//     const xrp = e.detail.provider
//     const { address } = await xrp.connect()      // send the address to the server
//     for (const { id, tx } of await getSignRequests()) {
//       try {
//         const { tx_blob } = await xrp.sign(tx)     // user approves on the device
//         await postSignResult(id, { txBlob: tx_blob })
//       } catch (err) {
//         await postSignResult(id, { error: String(err) })
//       }
//     }
//   })
//   window.dispatchEvent(new Event('ledger-xrpl:requestProvider'))
//
// Use `sign`, not `signAndSubmit`: the server submits, so simpleXRPL keeps
// result tracking and the blob is verified before it reaches the network.

export { BrowserSigningRelay, payFromLedger }
