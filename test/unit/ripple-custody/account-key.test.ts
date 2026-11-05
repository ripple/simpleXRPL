import { generateKeyPairSync } from 'node:crypto'

import { secp256k1 } from '@noble/curves/secp256k1'

import {
  fetchXrplPublicKey,
  resolveSigningPublicKey,
  toXrplPublicKey,
} from '../../../src/custodians/ripple/submission/account-key.js'
import { SignerCapabilityError } from '../../../src/errors.js'

import { DOMAIN_ID, makeClient, ok } from './test-utils.js'

/** A secp256k1 key as Custody sends it (SPKI DER, base64), and its XRPL form. */
interface Secp256k1Key {
  readonly spkiBase64: string
  readonly uncompressed: Buffer
  readonly xrpl: string
}

/**
 * A fresh secp256k1 key, with its XRPL form computed independently.
 *
 * @returns The key in each encoding.
 */
function secp256k1Key(): Secp256k1Key {
  const { publicKey } = generateKeyPairSync('ec', { namedCurve: 'secp256k1' })
  const spki = publicKey.export({ type: 'spki', format: 'der' })
  // The uncompressed point is the last 65 bytes of a secp256k1 SPKI.
  const uncompressed = spki.subarray(spki.length - 65)
  return {
    spkiBase64: spki.toString('base64'),
    uncompressed,
    xrpl: secp256k1.ProjectivePoint.fromHex(uncompressed)
      .toHex(true)
      .toUpperCase(),
  }
}

/**
 * A `GET /v1/domains/{domainId}/accounts/{accountId}` body.
 *
 * @param providerDetails - The account's key fields.
 * @returns The account body.
 */
function accountWith(
  providerDetails: Record<string, unknown>,
): Record<string, unknown> {
  return {
    data: {
      id: 'acc-1',
      domainId: DOMAIN_ID,
      alias: '',
      providerDetails: {
        vaultId: 'vault-1',
        keyStrategy: 'VaultHard',
        type: 'Vault',
        ...providerDetails,
      },
      lock: 'Unlocked',
      metadata: {},
    },
    signature: '',
    signingKey: '',
  }
}

describe('toXrplPublicKey', () => {
  it('compresses an SPKI secp256k1 key, for either parity of y', () => {
    // Enough keys that both 02 and 03 prefixes all but surely appear.
    const keys = Array.from({ length: 16 }, secp256k1Key)

    for (const key of keys) {
      expect(toXrplPublicKey(key.spkiBase64)).toBe(key.xrpl)
    }
    expect(new Set(keys.map((key) => key.xrpl.slice(0, 2)))).toEqual(
      new Set(['02', '03']),
    )
  })

  it('compresses a raw uncompressed point', () => {
    const key = secp256k1Key()

    expect(toXrplPublicKey(key.uncompressed.toString('base64'))).toBe(key.xrpl)
  })

  it('hex-encodes an already-compressed key as it is', () => {
    const key = secp256k1Key()

    expect(
      toXrplPublicKey(Buffer.from(key.xrpl, 'hex').toString('base64')),
    ).toBe(key.xrpl)
  })
})

describe('fetchXrplPublicKey', () => {
  it('reads the SECP256K1_CUSTODY_1 key from keys[], ignoring the others', async () => {
    const xrplKey = secp256k1Key()
    const { client, http } = makeClient(() =>
      ok(
        accountWith({
          keyInformation: { type: 'VaultDerived', derivationPath: 'm/0' },
          keys: [
            {
              id: 'ED25519_CUSTODY_1',
              type: 'VaultDerived',
              derivationPath: 'm/1',
              publicKey: {
                type: 'ExtendedPublicKey',
                value: 'ZWQ=',
                chainCode: 'Yw==',
              },
            },
            {
              id: 'SECP256K1_CUSTODY_1',
              type: 'VaultDerived',
              derivationPath: 'm/0',
              publicKey: {
                type: 'ExtendedPublicKey',
                value: xrplKey.spkiBase64,
                chainCode: 'Yw==',
              },
            },
          ],
        }),
      ),
    )

    await expect(fetchXrplPublicKey(client, DOMAIN_ID, 'acc-1')).resolves.toBe(
      xrplKey.xrpl,
    )
    expect(http.requests[0]?.url).toContain(
      `/v1/domains/${DOMAIN_ID}/accounts/acc-1`,
    )
  })

  it('prefers keys[] over the deprecated keyInformation', async () => {
    const current = secp256k1Key()
    const deprecated = secp256k1Key()
    const { client } = makeClient(() =>
      ok(
        accountWith({
          keyInformation: {
            type: 'VaultDerived',
            derivationPath: 'm/0',
            publicKey: { type: 'PublicKey', value: deprecated.spkiBase64 },
          },
          keys: [
            {
              id: 'SECP256K1_CUSTODY_1',
              type: 'VaultReserved',
              publicKey: { type: 'PublicKey', value: current.spkiBase64 },
            },
          ],
        }),
      ),
    )

    await expect(fetchXrplPublicKey(client, DOMAIN_ID, 'acc-1')).resolves.toBe(
      current.xrpl,
    )
  })

  it('falls back to keyInformation on instances without keys[]', async () => {
    const key = secp256k1Key()
    const { client } = makeClient(() =>
      ok(
        accountWith({
          keyInformation: {
            type: 'VaultDerived',
            derivationPath: 'm/0',
            publicKey: { type: 'PublicKey', value: key.spkiBase64 },
          },
        }),
      ),
    )

    await expect(fetchXrplPublicKey(client, DOMAIN_ID, 'acc-1')).resolves.toBe(
      key.xrpl,
    )
  })

  it('returns undefined when the account has no key on file yet', async () => {
    const { client } = makeClient(() =>
      ok(accountWith({ keyInformation: { type: 'VaultDerived' } })),
    )

    await expect(
      fetchXrplPublicKey(client, DOMAIN_ID, 'acc-1'),
    ).resolves.toBeUndefined()
  })
})

describe('resolveSigningPublicKey', () => {
  it('returns the XRPL key for raw signing', async () => {
    const key = secp256k1Key()
    const { client } = makeClient(() =>
      ok(
        accountWith({
          keyInformation: { type: 'VaultDerived', derivationPath: 'm/0' },
          keys: [
            {
              id: 'SECP256K1_CUSTODY_1',
              type: 'VaultDerived',
              derivationPath: 'm/0',
              publicKey: {
                type: 'ExtendedPublicKey',
                value: key.spkiBase64,
                chainCode: 'Yw==',
              },
            },
          ],
        }),
      ),
    )

    await expect(
      resolveSigningPublicKey(client, DOMAIN_ID, 'acc-1'),
    ).resolves.toBe(key.xrpl)
  })

  it('throws SignerCapabilityError when the account has no key on file yet', async () => {
    const { client } = makeClient(() =>
      ok(accountWith({ keyInformation: { type: 'VaultDerived' } })),
    )

    await expect(
      resolveSigningPublicKey(client, DOMAIN_ID, 'acc-1'),
    ).rejects.toThrow(SignerCapabilityError)
  })
})
