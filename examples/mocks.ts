/**
 * Test scaffolding shared by the runnable examples — NOT production code.
 *
 * In a real app you omit `ledger` from `SimpleXRPL.init` and the SDK uses the
 * live XRPL connection. This in-memory stand-in lets the signing examples run
 * offline: it fills the network fields and reports a successful submission
 * without touching a network.
 */
import { secp256k1 } from '@noble/curves/secp256k1'
import type {
  LedgerPort,
  SubmitResponse,
  Transaction,
  TxResponse,
} from 'simplexrpl'

/**
 * An in-memory {@link LedgerPort}: accepts any signed blob and reports success.
 *
 * @returns A ledger that runs the pipeline offline.
 */
export function inMemoryLedger(): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => ({
      ...tx,
      Sequence: 1,
      Fee: '12',
      LastLedgerSequence: 100,
    }),
    submit: async (): Promise<SubmitResponse> =>
      ({ result: {} }) as unknown as SubmitResponse,
    submitAndWait: async (): Promise<TxResponse> =>
      ({
        result: { hash: 'MOCKHASH', meta: { TransactionResult: 'tesSUCCESS' } },
      }) as unknown as TxResponse,
    request: async <T>(): Promise<T> => ({}) as T,
  }
}

/**
 * The raw shape a PKCS#11 HSM exposes: fetch the key's EC point and sign a
 * 32-byte digest. Matches the `Hsm` interface in the HSM example.
 */
export interface DemoHsm {
  /** The uncompressed public point (`0x04‖X‖Y`), as a real device returns. */
  readonly ecPoint: () => Promise<Uint8Array>
  /** Sign a 32-byte digest, returning the raw 64-byte `r‖s`. */
  readonly signDigest: (digest: Uint8Array) => Promise<Uint8Array>
}

/**
 * DEMO ONLY: an in-process secp256k1 key that stands in for a real HSM so the
 * PKCS#11 example runs end to end offline. It returns exactly the shapes a
 * PKCS#11 binding would — an uncompressed EC point and a raw `r‖s` signature —
 * so the signer adapter in the example is identical against this stub or a real
 * device. In production you delete this and wire the adapter to your device.
 *
 * @returns A stand-in HSM.
 */
export function demoHsm(): DemoHsm {
  const priv = Buffer.from(
    'c9537c5a2f3f7e1d4b6a8c0e2f4d6b8a1c3e5f7091b3d5f7a9c1e3050709b0d0f',
    'hex',
  )
  return {
    ecPoint: async (): Promise<Uint8Array> =>
      secp256k1.getPublicKey(priv, false),
    signDigest: async (digest: Uint8Array): Promise<Uint8Array> =>
      secp256k1.sign(digest, priv).toCompactRawBytes(),
  }
}
