import type {
  MPTokenIssuanceDestroy,
  OfferCreate,
  Payment,
  Transaction,
  TrustSet,
} from 'xrpl'

import { buildCustomProperties } from '../../../src/custodians/ripple/mapping/custom-properties.js'

describe('buildCustomProperties', () => {
  it('surfaces the MPT issuance id so two issuance ops are distinguishable', () => {
    const tx: MPTokenIssuanceDestroy = {
      TransactionType: 'MPTokenIssuanceDestroy',
      Account: 'rFrom',
      MPTokenIssuanceID: '00000001ABCDEF0123456789ABCDEF0123456789ABCDEF01',
    }
    expect(buildCustomProperties(tx)).toEqual({
      transactionType: 'MPTokenIssuanceDestroy',
      account: 'rFrom',
      mptIssuanceId: '00000001ABCDEF0123456789ABCDEF0123456789ABCDEF01',
    })
  })

  it('describes a TrustSet by its limitAmount, so two TrustSets are distinguishable', () => {
    const tx: TrustSet = {
      TransactionType: 'TrustSet',
      Account: 'rFrom',
      LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
    }
    expect(buildCustomProperties(tx)).toEqual({
      transactionType: 'TrustSet',
      account: 'rFrom',
      limitAmount: '100 USD issued by rIssuer',
    })
  })

  it('describes an OfferCreate by its takerGets/takerPays, so two offers are distinguishable', () => {
    const tx: OfferCreate = {
      TransactionType: 'OfferCreate',
      Account: 'rFrom',
      TakerGets: '1000000',
      TakerPays: { currency: 'USD', issuer: 'rIssuer', value: '10' },
    }
    expect(buildCustomProperties(tx)).toEqual({
      transactionType: 'OfferCreate',
      account: 'rFrom',
      takerGets: '1000000 drops',
      takerPays: '10 USD issued by rIssuer',
    })
  })

  it('includes destination when present', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: '1000',
    }
    expect(buildCustomProperties(tx)).toEqual({
      transactionType: 'Payment',
      account: 'rFrom',
      destination: 'rTo',
      amount: '1000 drops',
    })
  })

  it('describes an IOU amount with its issuer', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: { currency: 'USD', issuer: 'rIssuer', value: '10' },
    }
    expect(buildCustomProperties(tx).amount).toBe('10 USD issued by rIssuer')
  })

  it('describes an MPT amount', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: 'rFrom',
      Destination: 'rTo',
      Amount: { mpt_issuance_id: 'ABCDEF', value: '10' },
    }
    expect(buildCustomProperties(tx).amount).toBe('10 (MPT ABCDEF)')
  })

  // Golden coverage of every natively-mapped transactor's approver summary.
  // A change to the generator surfaces here as a snapshot diff in review.
  describe('golden — all native transactors', () => {
    const MPT_ID = '00000001ABCDEF0123456789ABCDEF0123456789ABCDEF01'
    const IOU_AMOUNT = { currency: 'USD', issuer: 'rIssuer', value: '10' }
    const transactors: ReadonlyArray<readonly [string, Transaction]> = [
      ['AccountSet', { TransactionType: 'AccountSet', Account: 'rAcct' }],
      [
        'Clawback',
        {
          TransactionType: 'Clawback',
          Account: 'rIssuer',
          Amount: { currency: 'USD', issuer: 'rHolder', value: '25' },
        },
      ],
      [
        'DepositPreauth',
        {
          TransactionType: 'DepositPreauth',
          Account: 'rAcct',
          Authorize: 'rOther',
        },
      ],
      [
        'EscrowFinish',
        {
          TransactionType: 'EscrowFinish',
          Account: 'rAcct',
          Owner: 'rOwner',
          OfferSequence: 5,
        },
      ],
      [
        'MPTokenAuthorize',
        {
          TransactionType: 'MPTokenAuthorize',
          Account: 'rHolder',
          MPTokenIssuanceID: MPT_ID,
        },
      ],
      [
        'MPTokenIssuanceCreate',
        { TransactionType: 'MPTokenIssuanceCreate', Account: 'rIssuer' },
      ],
      [
        'MPTokenIssuanceDestroy',
        {
          TransactionType: 'MPTokenIssuanceDestroy',
          Account: 'rIssuer',
          MPTokenIssuanceID: MPT_ID,
        },
      ],
      [
        'MPTokenIssuanceSet',
        {
          TransactionType: 'MPTokenIssuanceSet',
          Account: 'rIssuer',
          MPTokenIssuanceID: MPT_ID,
        },
      ],
      [
        'OfferCreate',
        {
          TransactionType: 'OfferCreate',
          Account: 'rFrom',
          TakerGets: '1000000',
          TakerPays: IOU_AMOUNT,
        },
      ],
      [
        'Payment',
        {
          TransactionType: 'Payment',
          Account: 'rFrom',
          Destination: 'rTo',
          Amount: IOU_AMOUNT,
        },
      ],
      [
        'TrustSet',
        {
          TransactionType: 'TrustSet',
          Account: 'rFrom',
          LimitAmount: { currency: 'USD', issuer: 'rIssuer', value: '100' },
        },
      ],
    ]

    it.each(transactors)('%s', (_name, tx) => {
      expect(buildCustomProperties(tx)).toMatchSnapshot()
    })
  })
})
