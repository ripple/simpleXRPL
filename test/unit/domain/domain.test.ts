import { Wallet } from 'xrpl'
import type { PermissionedDomainDelete, PermissionedDomainSet } from 'xrpl'

import { IntentValidationError } from '../../../src/index.js'
import { recordingClient } from '../helpers/recording-ledger.js'

/** A 64-hex ledger-object index used as a domain id. */
const DOMAIN_ID = 'A'.repeat(64)

describe('Domain vertical', () => {
  it('create maps the credential list and extracts the new domain id', async () => {
    const meta = {
      AffectedNodes: [
        {
          CreatedNode: {
            LedgerEntryType: 'PermissionedDomain',
            LedgerIndex: DOMAIN_ID,
            NewFields: {},
          },
        },
      ],
    }
    const { client, txs } = await recordingClient({ meta })
    const issuer = Wallet.generate().classicAddress
    const result = await client.domain.create({
      credList: [{ issuer, credType: 'KYC' }],
    })
    expect(result.intent).toStrictEqual({ domainID: DOMAIN_ID })
    const tx = txs[0] as PermissionedDomainSet
    expect(tx.TransactionType).toBe('PermissionedDomainSet')
    expect(tx.DomainID).toBeUndefined()
    expect(tx.AcceptedCredentials).toStrictEqual([
      { Credential: { Issuer: issuer, CredentialType: '4B5943' } },
    ])
  })

  it('setCredentials passes through the domain id', async () => {
    const { client, txs } = await recordingClient()
    const issuer = Wallet.generate().classicAddress
    const result = await client.domain.setCredentials({
      domain: DOMAIN_ID,
      credList: [{ issuer, credType: 'KYC' }],
    })
    expect(result.intent).toStrictEqual({ domainID: DOMAIN_ID })
    expect((txs[0] as PermissionedDomainSet).DomainID).toBe(DOMAIN_ID)
  })

  it('delete builds PermissionedDomainDelete', async () => {
    const { client, txs } = await recordingClient()
    const result = await client.domain.delete({ domain: DOMAIN_ID })
    expect(result.intent).toStrictEqual({ domainID: DOMAIN_ID })
    const tx = txs[0] as PermissionedDomainDelete
    expect(tx.TransactionType).toBe('PermissionedDomainDelete')
    expect(tx.DomainID).toBe(DOMAIN_ID)
  })

  it('rejects an empty credential list as IntentValidationError', async () => {
    const { client } = await recordingClient()
    await expect(client.domain.create({ credList: [] })).rejects.toBeInstanceOf(
      IntentValidationError,
    )
  })

  describe('create when the new domain id cannot be read back', () => {
    // The id is mined out of the submission metadata. When the metadata isn't
    // there — string-encoded meta, or no PermissionedDomain CreatedNode — the
    // domain was still created, so `create` reports an empty id rather than
    // failing. These assert that fallback stays explicit.
    it.each([
      ['string-encoded meta', 'AE13'],
      ['absent meta', undefined],
      ['metadata with no PermissionedDomain node', { AffectedNodes: [] }],
      [
        'a CreatedNode of another entry type',
        {
          AffectedNodes: [
            {
              CreatedNode: {
                LedgerEntryType: 'RippleState',
                LedgerIndex: DOMAIN_ID,
                NewFields: {},
              },
            },
          ],
        },
      ],
    ])('reports an empty domain id for %s', async (_label, meta) => {
      const { client } = await recordingClient({ meta })
      const issuer = Wallet.generate().classicAddress
      const result = await client.domain.create({
        credList: [{ issuer, credType: 'KYC' }],
      })
      expect(result.intent).toStrictEqual({ domainID: '' })
    })
  })
})
