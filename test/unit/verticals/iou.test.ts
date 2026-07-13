import { AccountSetAsfFlags } from 'xrpl'
import type { AccountSet, Payment, TrustSet } from 'xrpl'

import {
  MultiStepFailureError,
  SimpleXRPL,
  SimpleXRPLError,
} from '../../../src/index.js'
import {
  fakeResult,
  makeStepCustodian,
  testAddress,
} from '../orchestration/test-utils.js'

const RIPPLED = 'wss://example.invalid'

describe('IOU.issue', () => {
  it('runs AccountSet, TrustSet, then Payment against the right accounts', async () => {
    const issuerAddress = testAddress()
    const holderAddress = testAddress()
    const issuer = makeStepCustodian('ripple-custody', issuerAddress)
    const holder = makeStepCustodian('ripple-custody', holderAddress)
    issuer.queue(fakeResult('ACCOUNTSET_HASH'), fakeResult('PAYMENT_HASH'))
    holder.queue(fakeResult('TRUSTSET_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [issuer.account.signer, holder.account.signer],
    })

    const results = await client.iou.issue({
      issuer: issuerAddress,
      holder: holderAddress,
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

    const accountSet = issuer.calls[0]?.transaction as AccountSet
    expect(accountSet.TransactionType).toBe('AccountSet')
    expect(accountSet.Account).toBe(issuerAddress)
    expect(accountSet.SetFlag).toBe(AccountSetAsfFlags.asfDefaultRipple)

    const trustSet = holder.calls[0]?.transaction as TrustSet
    expect(trustSet.TransactionType).toBe('TrustSet')
    expect(trustSet.Account).toBe(holderAddress)
    expect(trustSet.LimitAmount).toEqual({
      currency: 'USD',
      issuer: issuerAddress,
      value: '1000',
    })

    const payment = issuer.calls[1]?.transaction as Payment
    expect(payment.TransactionType).toBe('Payment')
    expect(payment.Account).toBe(issuerAddress)
    expect(payment.Destination).toBe(holderAddress)
    expect(payment.Amount).toEqual({
      currency: 'USD',
      issuer: issuerAddress,
      value: '1000',
    })
  })

  it('propagates MultiStepFailureError when the holder rejects the TrustSet', async () => {
    const issuerAddress = testAddress()
    const holderAddress = testAddress()
    const issuer = makeStepCustodian('ripple-custody', issuerAddress)
    const holder = makeStepCustodian('ripple-custody', holderAddress)
    issuer.queue(fakeResult('ACCOUNTSET_HASH'))
    holder.queue(new SimpleXRPLError('trust line rejected'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [issuer.account.signer, holder.account.signer],
    })

    let error: unknown
    try {
      await client.iou.issue({
        issuer: issuerAddress,
        holder: holderAddress,
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
    const senderAddress = testAddress()
    const destination = testAddress()
    const issuerAddress = testAddress()
    const sender = makeStepCustodian('ripple-custody', senderAddress)
    sender.queue(fakeResult('PAYMENT_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [sender.account.signer],
    })

    const result = await client.iou.transfer({
      to: destination,
      currency: 'USD',
      issuer: issuerAddress,
      value: '50',
    })

    expect(result.txHash).toBe('PAYMENT_HASH')
    expect(result.intent).toEqual({
      to: destination,
      currency: 'USD',
      issuer: issuerAddress,
      value: '50',
    })
    expect(sender.calls).toHaveLength(1)
    const payment = sender.calls[0]?.transaction as Payment
    expect(payment).toMatchObject({
      TransactionType: 'Payment',
      Account: senderAddress,
      Destination: destination,
      Amount: { currency: 'USD', issuer: issuerAddress, value: '50' },
    })
  })

  it('defaults the source to the primary signer when `from` is omitted', async () => {
    const primaryAddress = testAddress()
    const primary = makeStepCustodian('ripple-custody', primaryAddress)
    primary.queue(fakeResult('PAYMENT_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [primary.account.signer],
    })

    await client.iou.transfer({
      to: testAddress(),
      currency: 'USD',
      issuer: testAddress(),
      value: '50',
    })

    expect((primary.calls[0]?.transaction as Payment).Account).toBe(
      primaryAddress,
    )
  })

  it('honors an explicit `from` account', async () => {
    const primaryAddress = testAddress()
    const otherAddress = testAddress()
    const primary = makeStepCustodian('ripple-custody', primaryAddress)
    const other = makeStepCustodian('ripple-custody', otherAddress)
    other.queue(fakeResult('PAYMENT_HASH'))

    const client = await SimpleXRPL.init({
      rippledUrl: RIPPLED,
      signers: [primary.account.signer, other.account.signer],
    })

    await client.iou.transfer(
      {
        to: testAddress(),
        currency: 'USD',
        issuer: testAddress(),
        value: '50',
      },
      { from: otherAddress },
    )

    expect(other.calls).toHaveLength(1)
    expect(primary.calls).toHaveLength(0)
  })
})
