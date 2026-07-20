import type { Payment, Transaction } from 'xrpl'

import { IntentSigner } from '../../../src/custodians/ripple/auth/intent-signer.js'
import { KeypairService } from '../../../src/custodians/ripple/auth/keypair.service.js'
import { buildCustomProperties } from '../../../src/custodians/ripple/mapping/custom-properties.js'
import { buildProposeIntentBody } from '../../../src/custodians/ripple/mapping/envelope.js'
import { buildSignManifestIntentBody } from '../../../src/custodians/ripple/mapping/manifest-envelope.js'
import { generateTestKey } from '../custody-auth/test-utils.js'

import { validateAgainstSpec } from './spec-validator.js'

const DOMAIN_ID = '11111111-1111-1111-1111-111111111111'
const AUTHOR_ID = '22222222-2222-2222-2222-222222222222'
const ACCOUNT_ID = '33333333-3333-3333-3333-333333333333'
const IDEMPOTENCY_KEY = '44444444-4444-4444-4444-444444444444'
const ISSUER = 'rIssuer1111111111111111111111'
const HOLDER = 'rHolder1111111111111111111111'
const DEST = 'rDest11111111111111111111111'
const MPT_ID = '00000001ABCDEF0123456789ABCDEF0123456789ABCDEF01'

const IOU = { currency: 'USD', issuer: ISSUER, value: '10' }

/** Representative transaction for each of the 11 natively-mapped transactors. */
const NATIVE_TRANSACTIONS: ReadonlyArray<{ name: string; tx: Transaction }> = [
  {
    name: 'AccountSet',
    tx: {
      TransactionType: 'AccountSet',
      Account: ISSUER,
      SetFlag: 8,
    },
  },
  {
    name: 'Clawback',
    tx: {
      TransactionType: 'Clawback',
      Account: ISSUER,
      Holder: HOLDER,
      Amount: IOU,
    },
  },
  {
    name: 'DepositPreauth',
    tx: {
      TransactionType: 'DepositPreauth',
      Account: ISSUER,
      Authorize: HOLDER,
    },
  },
  {
    name: 'EscrowFinish',
    tx: {
      TransactionType: 'EscrowFinish',
      Account: ISSUER,
      Owner: HOLDER,
      OfferSequence: 5,
    },
  },
  {
    name: 'MPTokenAuthorize',
    tx: {
      TransactionType: 'MPTokenAuthorize',
      Account: HOLDER,
      MPTokenIssuanceID: MPT_ID,
    },
  },
  {
    name: 'MPTokenIssuanceCreate',
    tx: {
      TransactionType: 'MPTokenIssuanceCreate',
      Account: ISSUER,
      AssetScale: 2,
    },
  },
  {
    name: 'MPTokenIssuanceDestroy',
    tx: {
      TransactionType: 'MPTokenIssuanceDestroy',
      Account: ISSUER,
      MPTokenIssuanceID: MPT_ID,
    },
  },
  {
    name: 'MPTokenIssuanceSet',
    tx: {
      TransactionType: 'MPTokenIssuanceSet',
      Account: ISSUER,
      MPTokenIssuanceID: MPT_ID,
      Flags: 1,
    },
  },
  {
    name: 'OfferCreate',
    tx: {
      TransactionType: 'OfferCreate',
      Account: ISSUER,
      TakerGets: '1000000',
      TakerPays: IOU,
    },
  },
  {
    name: 'Payment',
    tx: {
      TransactionType: 'Payment',
      Account: ISSUER,
      Destination: DEST,
      Amount: '1000000',
    },
  },
  {
    name: 'TrustSet',
    tx: {
      TransactionType: 'TrustSet',
      Account: HOLDER,
      LimitAmount: IOU,
    },
  },
]

function makeSigner(): IntentSigner {
  const pem = generateTestKey('ed25519')
  return new IntentSigner(KeypairService.fromPrivateKey(pem), pem)
}

describe('Custody request-body spec conformance (offline)', () => {
  const signer = makeSigner()

  it.each(NATIVE_TRANSACTIONS)(
    'builds a $name propose body that conforms to Core_ProposeIntentBody',
    ({ tx }) => {
      const body = buildProposeIntentBody(signer, {
        domainId: DOMAIN_ID,
        authorUserId: AUTHOR_ID,
        accountId: ACCOUNT_ID,
        transaction: tx,
        idempotencyKey: IDEMPOTENCY_KEY,
      })

      const { valid, errors } = validateAgainstSpec(
        'Core_ProposeIntentBody',
        body,
      )
      expect(errors).toEqual([])
      expect(valid).toBe(true)
    },
  )

  it('builds a v0_SignManifest propose body that conforms to Core_ProposeIntentBody', () => {
    const tx: Payment = {
      TransactionType: 'Payment',
      Account: ISSUER,
      Destination: DEST,
      Amount: '1000000',
    }
    const body = buildSignManifestIntentBody(
      signer,
      buildCustomProperties(tx),
      {
        domainId: DOMAIN_ID,
        authorUserId: AUTHOR_ID,
        accountId: ACCOUNT_ID,
        preimageBase64: Buffer.from('preimage').toString('base64'),
        idempotencyKey: IDEMPOTENCY_KEY,
      },
    )

    const { valid, errors } = validateAgainstSpec(
      'Core_ProposeIntentBody',
      body,
    )
    expect(errors).toEqual([])
    expect(valid).toBe(true)
  })

  it('rejects a body whose operation type is not in the spec (negative control)', () => {
    const body = buildProposeIntentBody(signer, {
      domainId: DOMAIN_ID,
      authorUserId: AUTHOR_ID,
      accountId: ACCOUNT_ID,
      transaction: NATIVE_TRANSACTIONS[9].tx,
      idempotencyKey: IDEMPOTENCY_KEY,
    })
    // Corrupt the mapped operation to a type the spec's union does not allow.
    const corrupted = JSON.parse(JSON.stringify(body)) as {
      request: { payload: { parameters: { operation: { type: string } } } }
    }
    corrupted.request.payload.parameters.operation = {
      type: 'NotARealOperation',
    }

    expect(validateAgainstSpec('Core_ProposeIntentBody', corrupted).valid).toBe(
      false,
    )
  })
})
