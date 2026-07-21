import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import {
  AccountNotFoundError,
  LocalSigner,
  RippledSubmitError,
  SimpleXRPLError,
} from '../../../src/index.js'
import type { SubmissionContext } from '../../../src/index.js'

function contextFor(address: string): SubmissionContext {
  return { account: { address } } as SubmissionContext
}

function paymentFrom(account: string, destination: string): Transaction {
  return {
    TransactionType: 'Payment',
    Account: account,
    Destination: destination,
    Amount: '1000000',
    Sequence: 1,
    Fee: '12',
    LastLedgerSequence: 100,
  }
}

describe('LocalSigner', () => {
  describe('fromSeed', () => {
    it('builds a single-account local signer', async () => {
      const wallet = Wallet.generate()
      const signer = LocalSigner.fromSeed(wallet.seed as string)
      expect(signer.kind).toBe('local')
      expect(signer.primary.address).toBe(wallet.classicAddress)
      const accounts = await signer.listAccounts()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].address).toBe(wallet.classicAddress)
      expect(accounts[0].signer).toBe(signer)
    })
  })

  describe('capabilities', () => {
    it('allows raw signing with no native operations', () => {
      const signer = LocalSigner.fromSeed(Wallet.generate().seed as string)
      const capabilities = signer.capabilities()
      expect(capabilities.allowRaw).toBe(true)
      expect(capabilities.nativeOps.size).toBe(0)
    })
  })

  describe('create', () => {
    it('holds multiple wallets and defaults primary to the first', async () => {
      const first = Wallet.generate()
      const second = Wallet.generate()
      const signer = LocalSigner.create({ wallets: [first, second] })
      expect(signer.primary.address).toBe(first.classicAddress)
      const accounts = await signer.listAccounts()
      const byAddress = (left: string, right: string): number =>
        left.localeCompare(right)
      expect(
        accounts.map((account) => account.address).sort(byAddress),
      ).toStrictEqual(
        [first.classicAddress, second.classicAddress].sort(byAddress),
      )
    })

    it('honors an explicit primary', () => {
      const first = Wallet.generate()
      const second = Wallet.generate()
      const signer = LocalSigner.create({
        wallets: [first, second],
        primary: second.classicAddress,
      })
      expect(signer.primary.address).toBe(second.classicAddress)
    })

    it('rejects a primary that is not among the wallets', () => {
      const wallet = Wallet.generate()
      const stranger = Wallet.generate()
      expect(() =>
        LocalSigner.create({
          wallets: [wallet],
          primary: stranger.classicAddress,
        }),
      ).toThrow(SimpleXRPLError)
    })

    it('rejects an empty wallet list', () => {
      expect(() => LocalSigner.create({ wallets: [] })).toThrow(SimpleXRPLError)
    })
  })

  describe('fromEnv', () => {
    it('builds one account per XRPL_*_SEED, primary first in scan order', async () => {
      const treasury = Wallet.generate()
      const ops = Wallet.generate()
      const signer = LocalSigner.fromEnv({
        env: {
          XRPL_TREASURY_SEED: treasury.seed,
          XRPL_OPS_SEED: ops.seed,
        },
      })
      expect(signer.primary.address).toBe(treasury.classicAddress)
      const accounts = await signer.listAccounts()
      expect(accounts).toHaveLength(2)
    })

    it('ignores non-matching keys and honors XRPL_SEED', async () => {
      const wallet = Wallet.generate()
      const signer = LocalSigner.fromEnv({
        env: {
          SOME_OTHER: 'ignored',
          XRPL_NOT_A_KEY: 'ignored',
          XRPL_SEED: wallet.seed,
        },
      })
      const accounts = await signer.listAccounts()
      expect(accounts).toHaveLength(1)
      expect(accounts[0].address).toBe(wallet.classicAddress)
    })

    it('honors an explicit primary', () => {
      const treasury = Wallet.generate()
      const ops = Wallet.generate()
      const signer = LocalSigner.fromEnv({
        primary: ops.classicAddress,
        env: { XRPL_TREASURY_SEED: treasury.seed, XRPL_OPS_SEED: ops.seed },
      })
      expect(signer.primary.address).toBe(ops.classicAddress)
    })

    it('throws when no seed variables are present', () => {
      expect(() => LocalSigner.fromEnv({ env: { PATH: '/usr/bin' } })).toThrow(
        SimpleXRPLError,
      )
    })
  })

  describe('sign', () => {
    it('signs with the wallet for the context account', async () => {
      const wallet = Wallet.generate()
      const destination = Wallet.generate().classicAddress
      const signer = LocalSigner.fromSeed(wallet.seed as string)
      const tx = paymentFrom(wallet.classicAddress, destination)

      const envelope = await signer.sign(tx, contextFor(wallet.classicAddress))
      const expected = wallet.sign(
        paymentFrom(wallet.classicAddress, destination),
      )
      expect(envelope.txBlob).toBe(expected.tx_blob)
      expect(envelope.hash).toBe(expected.hash)
    })

    it('throws AccountNotFoundError for an unknown account', async () => {
      const wallet = Wallet.generate()
      const signer = LocalSigner.fromSeed(wallet.seed as string)
      const tx = paymentFrom(wallet.classicAddress, wallet.classicAddress)
      await expect(
        signer.sign(tx, contextFor('rNotMine')),
      ).rejects.toBeInstanceOf(AccountNotFoundError)
    })
  })

  describe('submission', () => {
    it('signs and submits through the ledger, returning a rippled result', async () => {
      const wallet = Wallet.generate()
      const signer = LocalSigner.fromSeed(wallet.seed as string)
      const tx = paymentFrom(
        wallet.classicAddress,
        Wallet.generate().classicAddress,
      )
      const submitted: string[] = []
      const ctx = {
        account: { address: wallet.classicAddress, signer },
        ledger: {
          async submitAndWait(blob: string) {
            submitted.push(blob)
            return { result: { hash: 'LOCALHASH' } }
          },
        },
      } as unknown as SubmissionContext

      const result = await signer.submitAndWait(tx, ctx)
      expect(result.source).toBe('rippled')
      expect(result.txHash).toBe('LOCALHASH')
      expect(submitted).toHaveLength(1)
      expect(typeof submitted[0]).toBe('string')
    })

    it('throws RippledSubmitError on a non-tesSUCCESS engine result', async () => {
      const wallet = Wallet.generate()
      const signer = LocalSigner.fromSeed(wallet.seed as string)
      const tx = paymentFrom(
        wallet.classicAddress,
        Wallet.generate().classicAddress,
      )
      const ctx = {
        account: { address: wallet.classicAddress, signer },
        ledger: {
          async submitAndWait() {
            return {
              result: {
                hash: 'H',
                meta: { TransactionResult: 'tecNO_ISSUER' },
              },
            }
          },
        },
      } as unknown as SubmissionContext

      await expect(signer.submitAndWait(tx, ctx)).rejects.toBeInstanceOf(
        RippledSubmitError,
      )
    })

    it('submitAsync returns a pre-resolved handle over the submitted transaction', async () => {
      const wallet = Wallet.generate()
      const signer = LocalSigner.fromSeed(wallet.seed as string)
      const tx = paymentFrom(
        wallet.classicAddress,
        Wallet.generate().classicAddress,
      )
      const ctx = {
        account: { address: wallet.classicAddress, signer },
        ledger: {
          async submitAndWait(blob: string) {
            return {
              result: {
                hash: 'LOCALHASH',
                meta: { TransactionResult: 'tesSUCCESS' },
              },
              blob,
            }
          },
        },
      } as unknown as SubmissionContext

      const handle = await signer.submitAsync(tx, ctx)

      expect(handle.kind).toBe('local')
      expect(handle.id).toBe('LOCALHASH')
      expect(handle.custodian).toBe(signer)
      // Local is terminal immediately: poll and wait yield the same result.
      const polled = await handle.poll()
      const waited = await handle.wait()
      expect(polled.txHash).toBe('LOCALHASH')
      expect(waited.txHash).toBe('LOCALHASH')
      expect(polled).toStrictEqual(waited)
    })
  })
})
