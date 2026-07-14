import { resolveSigningPublicKey } from '../../../src/custodians/ripple/submission/account-key.js'
import { SignerCapabilityError } from '../../../src/errors.js'

import { DOMAIN_ID, apiAccountBody, makeClient, ok } from './test-utils.js'

describe('resolveSigningPublicKey', () => {
  it('returns the base64 public key when a PublicKey vault key is on file', async () => {
    const { client } = makeClient(() => ok(apiAccountBody('acc-1', 'cHVia2V5')))

    await expect(
      resolveSigningPublicKey(client, DOMAIN_ID, 'acc-1'),
    ).resolves.toBe('cHVia2V5')
  })

  it('throws SignerCapabilityError when the account has no key on file yet', async () => {
    const { client } = makeClient(() =>
      ok({
        data: {
          id: 'acc-1',
          domainId: DOMAIN_ID,
          alias: '',
          providerDetails: {
            vaultId: 'vault-1',
            keyStrategy: 'VaultHard',
            keyInformation: { type: 'VaultDerived' },
            type: 'Vault',
          },
          lock: 'Unlocked',
          metadata: {},
        },
        signature: '',
        signingKey: '',
      }),
    )

    await expect(
      resolveSigningPublicKey(client, DOMAIN_ID, 'acc-1'),
    ).rejects.toThrow(SignerCapabilityError)
  })

  it('throws SignerCapabilityError for an extended (non-exportable) public key', async () => {
    const { client } = makeClient(() =>
      ok({
        data: {
          id: 'acc-1',
          domainId: DOMAIN_ID,
          alias: '',
          providerDetails: {
            vaultId: 'vault-1',
            keyStrategy: 'VaultHard',
            keyInformation: {
              type: 'VaultDerived',
              publicKey: {
                type: 'ExtendedPublicKey',
                value: 'x',
                chainCode: 'y',
              },
            },
            type: 'Vault',
          },
          lock: 'Unlocked',
          metadata: {},
        },
        signature: '',
        signingKey: '',
      }),
    )

    await expect(
      resolveSigningPublicKey(client, DOMAIN_ID, 'acc-1'),
    ).rejects.toThrow(SignerCapabilityError)
  })
})
