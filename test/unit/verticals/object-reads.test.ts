import { encodeMPTokenMetadata, Wallet } from 'xrpl'
import type { MPTokenMetadata, Transaction } from 'xrpl'

import { LocalSigner, SimpleXRPL } from '../../../src/index.js'
import type {
  LedgerPort,
  LedgerRequest,
  SimpleXRPLClient,
} from '../../../src/index.js'
import { toHex } from '../../../src/verticals/hex.js'

const ISSUER = Wallet.generate().classicAddress
const HOLDER = Wallet.generate().classicAddress
const DOMAIN_ID = 'A'.repeat(64)
const MPT_ID = '00002403C84A0A28E0190E208E982C352BBD5006600555CF'

const METADATA: MPTokenMetadata = {
  ticker: 'TBILL',
  name: 'Acme T-Bill',
  icon: 'https://acme.example/i.png',
  asset_class: 'rwa',
  asset_subclass: 'treasury',
  issuer_name: 'Acme',
}

/**
 * A ledger that answers `ledger_entry` / `account_objects` from a routing map.
 *
 * @param handlers - Per-command response factories.
 * @param handlers.ledgerEntry - Returns the `ledger_entry` node (or undefined).
 * @param handlers.accountObjects - Returns the `account_objects` array.
 * @returns The fake ledger.
 */
function fakeLedger(handlers: {
  ledgerEntry?: () => unknown
  accountObjects?: () => unknown
}): LedgerPort {
  return {
    autofill: async (tx: Transaction): Promise<Transaction> => tx,
    submit: async () => ({}) as never,
    submitAndWait: async () => ({}) as never,
    async request<T>(req: LedgerRequest): Promise<T> {
      if (req.command === 'ledger_entry') {
        const node = handlers.ledgerEntry?.()
        if (node === undefined) {
          throw new Error('entryNotFound')
        }
        return { result: { node } } as unknown as T
      }
      return {
        result: { account_objects: handlers.accountObjects?.() ?? [] },
      } as unknown as T
    },
  }
}

/**
 * Build a client with a signer and the given fake ledger.
 *
 * @param ledger - The fake ledger.
 * @returns The client.
 */
async function clientWith(ledger: LedgerPort): Promise<SimpleXRPLClient> {
  return SimpleXRPL.init({
    rippledUrl: 'wss://x.invalid',
    signers: [LocalSigner.fromSeed(Wallet.generate().seed as string)],
    ledger,
  })
}

describe('Domain reads', () => {
  const node = {
    Owner: ISSUER,
    AcceptedCredentials: [
      { Credential: { Issuer: ISSUER, CredentialType: toHex('KYC') } },
    ],
  }

  it('retrieve decodes the accepted credential list', async () => {
    const client = await clientWith(fakeLedger({ ledgerEntry: () => node }))
    const { domainID, data } = await client.domain.retrieve({
      domainID: DOMAIN_ID,
    })
    expect(domainID).toBe(DOMAIN_ID)
    expect(data?.owner).toBe(ISSUER)
    expect(data?.credList).toEqual([{ issuer: ISSUER, credType: 'KYC' }])
  })

  it('retrieve returns undefined data when the domain is absent', async () => {
    const client = await clientWith(
      fakeLedger({ ledgerEntry: () => undefined }),
    )
    const { data } = await client.domain.retrieve({ domainID: DOMAIN_ID })
    expect(data).toBeUndefined()
  })

  it('list shapes each owned domain', async () => {
    const client = await clientWith(
      fakeLedger({ accountObjects: () => [{ ...node, index: DOMAIN_ID }] }),
    )
    const { domains, data } = await client.domain.list()
    expect(domains).toEqual([DOMAIN_ID])
    expect(data[0].credList[0].credType).toBe('KYC')
  })
})

describe('Credential reads', () => {
  const node = {
    Issuer: ISSUER,
    Subject: HOLDER,
    CredentialType: toHex('KYC'),
    // lsfAccepted.
    Flags: 0x00010000,
    URI: toHex('https://acme.example/kyc'),
  }

  it('retrieve decodes type/URI and the accepted flag', async () => {
    const client = await clientWith(fakeLedger({ ledgerEntry: () => node }))
    const result = await client.credential.retrieve({
      credType: 'KYC',
      issuer: ISSUER,
      account: HOLDER,
    })
    expect(result.holder).toBe(HOLDER)
    expect(result.data?.credType).toBe('KYC')
    expect(result.data?.accepted).toBe(true)
    expect(result.data?.uri).toBe('https://acme.example/kyc')
  })

  it('list filters by role', async () => {
    const objects = [
      node,
      // Same issuer, a different holder.
      { ...node, Subject: Wallet.generate().classicAddress },
    ]
    const client = await clientWith(
      fakeLedger({ accountObjects: () => objects }),
    )
    const asHolder = await client.credential.list({ account: HOLDER })
    expect(asHolder.data).toHaveLength(1)
    expect(asHolder.data[0].holder).toBe(HOLDER)

    const asIssuer = await client.credential.list({
      role: 'issuer',
      account: ISSUER,
    })
    // Both are issued by ISSUER.
    expect(asIssuer.data).toHaveLength(2)
  })
})

describe('Token reads', () => {
  const node = {
    Issuer: ISSUER,
    // canTransfer | canClawback.
    Flags: 0x0020 | 0x0040,
    AssetScale: 2,
    OutstandingAmount: '1000',
    // 0.5% = 500 units of 1/1000 percent.
    TransferFee: 500,
    MPTokenMetadata: encodeMPTokenMetadata(METADATA),
  }

  it('retrieve decodes flags, transfer fee, and metadata', async () => {
    const client = await clientWith(fakeLedger({ ledgerEntry: () => node }))
    const { tokenID, data } = await client.token.retrieve({
      mptIssuanceId: MPT_ID,
    })
    expect(tokenID).toBe(MPT_ID)
    expect(data?.transferFee).toBe(0.5)
    expect(data?.flags.canTransfer).toBe(true)
    expect(data?.flags.canClawback).toBe(true)
    expect(data?.flags.canEscrow).toBe(false)
    expect(data?.metadata?.ticker).toBe('TBILL')
  })

  it('retrieve returns undefined data when the issuance is absent', async () => {
    const client = await clientWith(
      fakeLedger({ ledgerEntry: () => undefined }),
    )
    const { data } = await client.token.retrieve({ mptIssuanceId: MPT_ID })
    expect(data).toBeUndefined()
  })
})
