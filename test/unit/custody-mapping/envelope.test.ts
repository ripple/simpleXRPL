import type { OfferCancel, Payment } from 'xrpl'

import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import { buildProposeIntentBody } from '../../../src/custodians/ripple/mapping/envelope.js'
import { SignerCapabilityError } from '../../../src/errors.js'
import type { components } from '../../../src/generated/custody.js'
import { generateTestKey } from '../custody-auth/test-utils.js'

const MS_PER_SECOND = 1000
const SECONDS_PER_MINUTE = 60
const MINUTES_PER_HOUR = 60
const HOURS_PER_DAY = 24
const ONE_DAY_MS =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND

/** Allowed clock drift between test execution and the envelope's own `Date.now()` call. */
const EXPIRY_TOLERANCE_MS = 5000

function makeSigner(): IntentSigner {
  const pem = generateTestKey('ed25519')
  return new IntentSigner(KeypairService.fromPrivateKey(pem), pem)
}

const PAYMENT_TX: Payment = {
  TransactionType: 'Payment',
  Account: 'rFrom',
  Destination: 'rTo',
  Amount: '1000000',
}

type ProposeIntentBody = ReturnType<typeof buildProposeIntentBody>

/**
 * Narrow the payload to the `v0_CreateTransactionOrder` variant this envelope
 * always builds.
 *
 * @param body - The built envelope.
 * @returns The narrowed payload.
 * @throws {@link Error} if the payload is some other variant (would indicate
 * a bug in {@link buildProposeIntentBody}).
 */
function transactionOrderPayload(
  body: ProposeIntentBody,
): components['schemas']['Core_Propose_v0_CreateTransactionOrder'] {
  const { payload } = body.request
  if (payload.type !== 'v0_CreateTransactionOrder') {
    throw new Error(`expected v0_CreateTransactionOrder, got ${payload.type}`)
  }
  return payload
}

/**
 * Narrow the order parameters to the `XRPL` ledger variant.
 *
 * @param body - The built envelope.
 * @returns The narrowed XRPL parameters.
 * @throws {@link Error} if the parameters are some other ledger's variant
 * (would indicate a bug in {@link buildProposeIntentBody}).
 */
function xrplParameters(
  body: ProposeIntentBody,
): components['schemas']['Core_TransactionOrderParameters_XRPL'] {
  const { parameters } = transactionOrderPayload(body)
  if (parameters.type !== 'XRPL') {
    throw new Error(`expected XRPL parameters, got ${parameters.type}`)
  }
  return parameters
}

describe('buildProposeIntentBody', () => {
  it('builds a signed envelope with the author, domain, account, and mapped operation', () => {
    const body = buildProposeIntentBody(makeSigner(), {
      domainId: 'domain-1',
      authorUserId: 'user-1',
      accountId: 'account-1',
      transaction: PAYMENT_TX,
    })

    expect(body.signature).toBeTruthy()
    expect(body.request.author).toEqual({ id: 'user-1', domainId: 'domain-1' })
    expect(body.request.targetDomainId).toBe('domain-1')
    expect(body.request.type).toBe('Propose')
    expect(transactionOrderPayload(body).accountId).toBe('account-1')
    expect(xrplParameters(body)).toEqual({
      feeStrategy: { type: 'Priority', priority: 'Low' },
      maximumFee: undefined,
      memos: [],
      operation: {
        type: 'Payment',
        destination: { address: 'rTo', type: 'Address' },
        amount: '1000000',
        destinationTag: undefined,
      },
      type: 'XRPL',
    })
  })

  it('stamps matching customProperties on both the request and the payload', () => {
    const body = buildProposeIntentBody(makeSigner(), {
      domainId: 'domain-1',
      authorUserId: 'user-1',
      accountId: 'account-1',
      transaction: PAYMENT_TX,
    })

    const expected = {
      transactionType: 'Payment',
      account: 'rFrom',
      destination: 'rTo',
      amount: '1000000 drops',
    }
    expect(body.request.customProperties).toEqual(expected)
    expect(transactionOrderPayload(body).customProperties).toEqual(expected)
  })

  it('uses the given idempotencyKey as both the request id and the payload id', () => {
    const body = buildProposeIntentBody(makeSigner(), {
      domainId: 'domain-1',
      authorUserId: 'user-1',
      accountId: 'account-1',
      transaction: PAYMENT_TX,
      idempotencyKey: 'retry-key-1',
    })

    expect(body.request.id).toBe('retry-key-1')
    expect(transactionOrderPayload(body).id).toBe('retry-key-1')
  })

  it('generates a fresh id when no idempotencyKey is given, and keeps request/payload ids in sync', () => {
    const body = buildProposeIntentBody(makeSigner(), {
      domainId: 'domain-1',
      authorUserId: 'user-1',
      accountId: 'account-1',
      transaction: PAYMENT_TX,
    })

    expect(body.request.id).toBeTruthy()
    expect(body.request.id).toBe(transactionOrderPayload(body).id)
  })

  it('defaults expiryAt to ~1 day out', () => {
    const before = Date.now()
    const body = buildProposeIntentBody(makeSigner(), {
      domainId: 'domain-1',
      authorUserId: 'user-1',
      accountId: 'account-1',
      transaction: PAYMENT_TX,
    })
    const expiryMs = new Date(body.request.expiryAt).getTime()
    expect(expiryMs).toBeGreaterThanOrEqual(
      before + ONE_DAY_MS - EXPIRY_TOLERANCE_MS,
    )
    expect(expiryMs).toBeLessThanOrEqual(
      before + ONE_DAY_MS + EXPIRY_TOLERANCE_MS,
    )
  })

  it('carries a fee override into the fee strategy', () => {
    const body = buildProposeIntentBody(makeSigner(), {
      domainId: 'domain-1',
      authorUserId: 'user-1',
      accountId: 'account-1',
      transaction: PAYMENT_TX,
      fee: { priority: 'high', maxFeeDrops: '5000' },
    })
    expect(xrplParameters(body)).toMatchObject({
      feeStrategy: { type: 'Priority', priority: 'High' },
      maximumFee: '5000',
    })
  })

  it('propagates SignerCapabilityError for a transactor with no native mapping', () => {
    const tx: OfferCancel = {
      TransactionType: 'OfferCancel',
      Account: 'rFrom',
      OfferSequence: 1,
    }
    expect(() =>
      buildProposeIntentBody(makeSigner(), {
        domainId: 'domain-1',
        authorUserId: 'user-1',
        accountId: 'account-1',
        transaction: tx,
      }),
    ).toThrow(SignerCapabilityError)
  })
})
