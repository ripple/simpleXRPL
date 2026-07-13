import { AccountSetAsfFlags } from 'xrpl'
import type { AccountSet, Payment, TrustSet } from 'xrpl'

import {
  MultiStepFailureError,
  SimpleXRPL,
  SimpleXRPLError,
} from '../../../src/index.js'
import { IOU } from '../../../src/verticals/index.js'
import { fakeResult, makeStepCustodian } from '../orchestration/test-utils.js'

const RIPPLED = 'wss://example.invalid'

describe('IOU.issue', () => {
  it('runs AccountSet, TrustSet, then Payment against the right accounts', async () => {
    const issuer = makeStepCustodian('local', 'rIssuer')
    const holder = makeStepCustodian('local', 'rHolder')
    issuer.queue(fakeResult('ACCOUNTSET_HASH'), fakeResult('PAYMENT_HASH'))
    holder.queue(fakeResult('TRUSTSET_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [issuer.account.signer, holder.account.signer],
    })
    const iou = new IOU(client)

    const results = await iou.issue({
      issuer: 'rIssuer',
      holder: 'rHolder',
      currency: 'USD',
      value: '1000',
    })

    expect(results.map((result) => result.txHash)).toEqual([
      'ACCOUNTSET_HASH',
      'TRUSTSET_HASH',
      'PAYMENT_HASH',
    ])
    // Step 1 (AccountSet) and step 3 (Payment) are signed by the issuer;
    // step 2 (TrustSet) is signed by the holder.
    expect(issuer.calls).toHaveLength(2)
    expect(holder.calls).toHaveLength(1)

    const accountSet = issuer.calls[0]?.tx as AccountSet
    expect(accountSet.TransactionType).toBe('AccountSet')
    expect(accountSet.Account).toBe('rIssuer')
    expect(accountSet.SetFlag).toBe(AccountSetAsfFlags.asfDefaultRipple)

    const trustSet = holder.calls[0]?.tx as TrustSet
    expect(trustSet.TransactionType).toBe('TrustSet')
    expect(trustSet.Account).toBe('rHolder')
    expect(trustSet.LimitAmount).toEqual({
      currency: 'USD',
      issuer: 'rIssuer',
      value: '1000',
    })

    const payment = issuer.calls[1]?.tx as Payment
    expect(payment.TransactionType).toBe('Payment')
    expect(payment.Account).toBe('rIssuer')
    expect(payment.Destination).toBe('rHolder')
    expect(payment.Amount).toEqual({
      currency: 'USD',
      issuer: 'rIssuer',
      value: '1000',
    })
  })

  it('propagates MultiStepFailureError when the holder rejects the TrustSet', async () => {
    const issuer = makeStepCustodian('local', 'rIssuer')
    const holder = makeStepCustodian('local', 'rHolder')
    issuer.queue(fakeResult('ACCOUNTSET_HASH'))
    holder.queue(new SimpleXRPLError('trust line rejected'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [issuer.account.signer, holder.account.signer],
    })
    const iou = new IOU(client)

    let error: unknown
    try {
      await iou.issue({
        issuer: 'rIssuer',
        holder: 'rHolder',
        currency: 'USD',
        value: '1000',
      })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MultiStepFailureError)
    const multiStepError = error as MultiStepFailureError
    expect(multiStepError.committed).toHaveLength(1)
    expect(multiStepError.committed[0]?.txHash).toBe('ACCOUNTSET_HASH')
    expect(multiStepError.failed.step).toBe(1)
    // The Payment step's custodian has nothing queued, so if it were ever
    // called it would throw a different, unscripted error — this confirms
    // the orchestrator stopped instead of continuing to step 3.
    expect(issuer.calls).toHaveLength(1)
  })
})

describe('IOU.transfer', () => {
  it('sends a Payment from the resolved source to the destination', async () => {
    const sender = makeStepCustodian('local', 'rSender')
    sender.queue(fakeResult('PAYMENT_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [sender.account.signer],
    })
    const iou = new IOU(client)

    const result = await iou.transfer({
      to: 'rExternalHolder',
      currency: 'USD',
      issuer: 'rIssuer',
      value: '50',
    })

    expect(result.txHash).toBe('PAYMENT_HASH')
    expect(sender.calls).toHaveLength(1)
    const payment = sender.calls[0]?.tx as Payment
    expect(payment).toMatchObject({
      TransactionType: 'Payment',
      Account: 'rSender',
      Destination: 'rExternalHolder',
      Amount: { currency: 'USD', issuer: 'rIssuer', value: '50' },
    })
  })

  it('defaults the source to the primary signer when `from` is omitted', async () => {
    const primary = makeStepCustodian('local', 'rPrimary')
    primary.queue(fakeResult('PAYMENT_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [primary.account.signer],
    })
    const iou = new IOU(client)

    await iou.transfer({
      to: 'rExternalHolder',
      currency: 'USD',
      issuer: 'rIssuer',
      value: '50',
    })

    expect((primary.calls[0]?.tx as Payment).Account).toBe('rPrimary')
  })

  it('honors an explicit `from` account', async () => {
    const primary = makeStepCustodian('local', 'rPrimary')
    const other = makeStepCustodian('local', 'rOther')
    other.queue(fakeResult('PAYMENT_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [primary.account.signer, other.account.signer],
    })
    const iou = new IOU(client)

    await iou.transfer(
      {
        to: 'rExternalHolder',
        currency: 'USD',
        issuer: 'rIssuer',
        value: '50',
      },
      { from: 'rOther' },
    )

    expect(other.calls).toHaveLength(1)
    expect(primary.calls).toHaveLength(0)
  })
})
