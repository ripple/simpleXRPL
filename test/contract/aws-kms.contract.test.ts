import { AwsKmsSigner } from '../../src/custodians/external/adapters/aws-kms.js'
import { ExternalSigner, SimpleXRPL } from '../../src/index.js'
import { TESTNET_FAUCET, TESTNET_WS } from '../helpers/testnet.js'

/**
 * AWS KMS contract test: verify the adapter end to end against a real KMS key —
 * simpleXRPL funds a KMS-derived account and submits a KMS-signed payment
 * through the SDK. Gated on credentials and skipped when they're absent, so CI
 * and offline runs stay green without an AWS account.
 *
 * Provide, in the environment:
 *   AWS_KMS_KEY_ID   an ECC_SECG_P256K1 (secp256k1) KMS key id or ARN
 *   AWS_REGION       the key's region
 * plus the usual AWS credential chain (env vars, profile, or role).
 */
const LIVE_TIMEOUT_MS = 120_000

/**
 * Read the KMS key id from the environment, requiring a region too — the AWS
 * SDK errors on an empty region before it ever reaches the key.
 *
 * @returns The key id, or `undefined` if the key id or region is unset/blank.
 */
function kmsKeyId(): string | undefined {
  /* eslint-disable n/no-process-env -- contract tests read KMS config from the environment by design */
  const keyId = process.env.AWS_KMS_KEY_ID
  const region = process.env.AWS_REGION
  /* eslint-enable n/no-process-env */
  // Treat blank as absent: an unset GitHub Actions secret expands to an empty
  // string (not `undefined`), so a truthiness check skips instead of erroring.
  return keyId && region ? keyId : undefined
}

const keyId = kmsKeyId()
const describeIfKms = keyId === undefined ? describe.skip : describe

describeIfKms('AwsKmsSigner (live KMS contract)', () => {
  it(
    'funds a KMS-derived account and submits a KMS-signed payment via the SDK',
    async () => {
      const signer = AwsKmsSigner.create({ keyId: keyId as string })
      const custody = await ExternalSigner.create({ signer })

      // The account derives from the KMS public key.
      expect(custody.primary.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,}$/u)

      const client = await SimpleXRPL.init({
        xrpldUrl: TESTNET_WS,
        faucetUrl: TESTNET_FAUCET,
        signers: [custody],
      })
      try {
        // Fund the KMS account and a fresh destination through the SDK's faucet.
        const destination = client.account.create().address
        await client.account.fund({ destination: custody.primary.address })
        await client.account.fund({ destination })

        // Submit a KMS-signed payment through simpleXRPL — the private key never
        // leaves KMS; the SDK builds, KMS signs the digest, the SDK submits.
        const result = await client.xrp.transfer({
          to: destination,
          amount: '10',
        })
        expect(result.source).toBe('xrpld')
        expect(result.txHash).toMatch(/^[0-9A-F]{64}$/u)
      } finally {
        await client.disconnect()
      }
    },
    LIVE_TIMEOUT_MS,
  )
})
