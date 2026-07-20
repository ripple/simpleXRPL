import { Wallet } from 'xrpl'
import type { Transaction } from 'xrpl'

import {
  DuplicateSignerError,
  SignerCapabilityError,
  SimpleXRPL,
  runMultiStep,
  submitTransaction,
} from '../../../src/index.js'
import type {
  Account,
  Custodian,
  CustodianKind,
  SignerCapabilities,
  SubmissionResult,
} from '../../../src/index.js'
import { fakeLedger } from '../pipeline/fake-ledger.js'

const RIPPLED = 'wss://x.invalid'

const notImplemented = async (): Promise<never> => {
  throw new Error('not implemented in tests')
}

/** A custodian that records every transaction it was asked to submit. */
interface RecordingCustodian extends Custodian {
  readonly submitted: Transaction[]
}

/**
 * Build a fake custodian owning one account that records `submitAndWait` calls.
 *
 * @param kind - The custodian kind.
 * @param address - The r-address it owns (also its primary).
 * @param options - Optional tenant id and whether it can sign natively.
 * @param options.tenantId - The backend tenant id, if any.
 * @param options.canSign - Whether it accepts the transactor natively (default true).
 * @returns The recording custodian.
 */
function makeRecordingCustodian(
  kind: CustodianKind,
  address: string,
  options: { tenantId?: string; canSign?: boolean } = {},
): RecordingCustodian {
  const submitted: Transaction[] = []
  const canSign = options.canSign ?? true
  const capabilities = (): SignerCapabilities => ({
    nativeOps: canSign ? new Set(['Payment']) : new Set(),
    allowRaw: false,
  })
  const submitAndWait = async (tx: Transaction): Promise<SubmissionResult> => {
    submitted.push(tx)
    return { source: 'custody', response: {}, intent: undefined }
  }
  // Declared before the closure below so account.signer can back-reference it.
  let custodian: RecordingCustodian
  const listAccounts = async (): Promise<Account[]> => [
    { address, custodianRef: `ref-${address}`, signer: custodian },
  ]
  custodian = {
    kind,
    tenantId: options.tenantId,
    primary: { address },
    submitted,
    capabilities,
    listAccounts,
    sign: notImplemented,
    submitAndWait,
    submitAsync: notImplemented,
  }
  return custodian
}

const PAYMENT_TO = Wallet.generate().classicAddress

function paymentFrom(account: string): Transaction {
  return {
    TransactionType: 'Payment',
    Account: account,
    Destination: PAYMENT_TO,
    Amount: '1000000',
  }
}

describe('mixed-signer: per-account dispatch across custodians', () => {
  it('routes a verb to the custodian that owns the resolved account', async () => {
    const alpha = makeRecordingCustodian('ripple-custody', 'rAlpha1', {
      tenantId: 'domain-a',
    })
    const beta = makeRecordingCustodian('palisade-custody', 'rBeta2', {
      tenantId: 'org-b',
    })
    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [alpha, beta],
      ledger: fakeLedger(),
    })

    await client.xrp.transfer(
      { to: PAYMENT_TO, amount: '1' },
      { from: 'rBeta2' },
    )

    // beta owns rBeta2, so beta signs — alpha never sees it.
    expect(beta.submitted).toHaveLength(1)
    expect(beta.submitted[0].Account).toBe('rBeta2')
    expect(alpha.submitted).toHaveLength(0)
  })

  it('routes each step of a cross-account flow to its own account custodian', async () => {
    const alpha = makeRecordingCustodian('ripple-custody', 'rAlpha1', {
      tenantId: 'domain-a',
    })
    const beta = makeRecordingCustodian('palisade-custody', 'rBeta2', {
      tenantId: 'org-b',
    })
    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [alpha, beta],
      ledger: fakeLedger(),
    })

    await runMultiStep(client, [
      {
        transaction: paymentFrom('rAlpha1'),
        account: client.resolveAccount('rAlpha1'),
      },
      {
        transaction: paymentFrom('rBeta2'),
        account: client.resolveAccount('rBeta2'),
      },
    ])

    expect(alpha.submitted.map((tx) => tx.Account)).toEqual(['rAlpha1'])
    expect(beta.submitted.map((tx) => tx.Account)).toEqual(['rBeta2'])
  })

  it('raises a clear SignerCapabilityError when the owning custodian cannot sign', async () => {
    const alpha = makeRecordingCustodian('ripple-custody', 'rAlpha1', {
      tenantId: 'domain-a',
    })
    const beta = makeRecordingCustodian('palisade-custody', 'rBeta2', {
      tenantId: 'org-b',
      canSign: false,
    })
    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [alpha, beta],
      ledger: fakeLedger(),
    })

    await expect(
      submitTransaction(client, {
        transaction: paymentFrom('rBeta2'),
        account: client.resolveAccount('rBeta2'),
      }),
    ).rejects.toBeInstanceOf(SignerCapabilityError)
  })
})

describe('mixed-signer: init tenant deduplication', () => {
  it('rejects two signers with the same kind and tenant id', async () => {
    const first = makeRecordingCustodian('ripple-custody', 'rOne1', {
      tenantId: 'domain-x',
    })
    const second = makeRecordingCustodian('ripple-custody', 'rTwo2', {
      tenantId: 'domain-x',
    })

    await expect(
      SimpleXRPL.init({
        rippledUrl: RIPPLED,
        signers: [first, second],
        ledger: fakeLedger(),
      }),
    ).rejects.toBeInstanceOf(DuplicateSignerError)
  })

  it('allows the same kind with different tenant ids', async () => {
    const first = makeRecordingCustodian('ripple-custody', 'rOne1', {
      tenantId: 'domain-x',
    })
    const second = makeRecordingCustodian('ripple-custody', 'rTwo2', {
      tenantId: 'domain-y',
    })

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [first, second],
      ledger: fakeLedger(),
    })
    expect(client.signers).toHaveLength(2)
  })

  it('allows multiple tenant-less signers of the same kind (e.g. local wallets)', async () => {
    const first = makeRecordingCustodian('local', 'rLocalA')
    const second = makeRecordingCustodian('local', 'rLocalB')

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [first, second],
      ledger: fakeLedger(),
    })
    expect(client.signers).toHaveLength(2)
  })
})
