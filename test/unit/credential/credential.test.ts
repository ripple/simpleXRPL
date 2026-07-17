import { Wallet } from 'xrpl'
import type { CredentialAccept, CredentialCreate, CredentialDelete } from 'xrpl'

import { IntentValidationError } from '../../../src/index.js'
import { recordingClient } from '../helpers/recording-ledger.js'

// 'KYC' UTF-8 hex, uppercase.
const KYC_HEX = '4B5943'

describe('Credential vertical', () => {
  it('issue builds CredentialCreate with hex type and URI', async () => {
    const { client, txs } = await recordingClient()
    const destination = Wallet.generate().classicAddress
    const result = await client.credential.issue({
      destination,
      credType: 'KYC',
      expiration: 900,
      URI: 'https://issuer.example/kyc',
    })
    expect(result.intent).toStrictEqual({ destination, credType: 'KYC' })
    const tx = txs[0] as CredentialCreate
    expect(tx.TransactionType).toBe('CredentialCreate')
    expect(tx.Subject).toBe(destination)
    expect(tx.CredentialType).toBe(KYC_HEX)
    expect(tx.Expiration).toBe(900)
    expect(tx.URI).toBe(
      Buffer.from('https://issuer.example/kyc', 'utf8')
        .toString('hex')
        .toUpperCase(),
    )
  })

  it('accept builds CredentialAccept with hex type', async () => {
    const { client, txs } = await recordingClient()
    const issuer = Wallet.generate().classicAddress
    await client.credential.accept({ issuer, credType: 'KYC' })
    const tx = txs[0] as CredentialAccept
    expect(tx.TransactionType).toBe('CredentialAccept')
    expect(tx.Issuer).toBe(issuer)
    expect(tx.CredentialType).toBe(KYC_HEX)
  })

  it('delete (as issuer) builds CredentialDelete with the holder', async () => {
    const { client, txs } = await recordingClient()
    const holder = Wallet.generate().classicAddress
    await client.credential.delete({ credType: 'KYC', holder })
    const tx = txs[0] as CredentialDelete
    expect(tx.TransactionType).toBe('CredentialDelete')
    expect(tx.CredentialType).toBe(KYC_HEX)
    expect(tx.Subject).toBe(holder)
    expect(tx.Issuer).toBeUndefined()
  })

  it('delete (as holder) sets Issuer and leaves Subject undefined', async () => {
    const { client, txs } = await recordingClient()
    const issuer = Wallet.generate().classicAddress
    await client.credential.delete({ credType: 'KYC', issuer })
    const tx = txs[0] as CredentialDelete
    expect(tx.TransactionType).toBe('CredentialDelete')
    expect(tx.Issuer).toBe(issuer)
    expect(tx.Subject).toBeUndefined()
  })

  it('rejects an empty credential type as IntentValidationError', async () => {
    const { client } = await recordingClient()
    const destination = Wallet.generate().classicAddress
    await expect(
      client.credential.issue({ destination, credType: '' }),
    ).rejects.toBeInstanceOf(IntentValidationError)
  })
})
