import { pollTransactionOnChain } from '../../../src/custodians/ripple/submission/transaction-polling.js'

import { DOMAIN_ID, makeClient, ok } from './test-utils.js'

// A real signed MPTokenIssuanceCreate blob (issuer rMJvBxh…, Sequence
// 19495980) and the issuance id the ledger derives from it. Custody returns
// this in `rawTransaction` even when it leaves the structured `ledgerData`
// null, so it is the only source of the id in the sandbox.
const MPT_CREATE_RAW =
  '12003622000000322401297C2C201B01323E9C6840000000000000C873' +
  '2102218AB4A0A775F860183DE429BB86862D134C91D4D885A0AAF10C5AA1E350C794' +
  '74473045022100B64DF0C394D95E4D398D9B53874D3AF8FE44C504C6605C318F8E82' +
  '8085ACF86602205E288887028EE670EC536B8B63552C5F895C4E6118603D3350CE3F' +
  '9BB8610772701EC1197B227469636B6572223A22494E5350222C226E616D65223A22' +
  '496E73706563746F7220546F6B656E222C2269636F6E223A22646174613A696D6167' +
  '652F706E673B6261736536342C6956424F5277304B47676F414141414E5355684555' +
  '674141414145414141414243415941414141664663534A4141414144556C45515652' +
  '34326D4E6B2B4D39514477414468674741576A5239617741414141424A5253453572' +
  '6B4A6767673D3D222C2261737365745F636C617373223A226F74686572222C226973' +
  '737565725F6E616D65223A22496E73706563746F72227D' +
  '8114DEC5FC9E0628D406B1A134ED2718C9CAFCFAACF1'
const MPT_CREATE_ID = '01297C2CDEC5FC9E0628D406B1A134ED2718C9CAFCFAACF1'

// A signed Payment blob for the same account — decodes fine, but must never
// yield an issuance id.
const PAYMENT_RAW =
  '1200002401297C2C6140000000000F424068400000000000000A73008114DEC5FC9E' +
  '0628D406B1A134ED2718C9CAFCFAACF18314DEC5FC9E0628D406B1A134ED2718C9CA' +
  'FCFAACF1'

const INTENT_ID = 'intent-1'

/**
 * A one-item transactions collection carrying the given ledger data.
 *
 * @param ledgerTransactionData - The `ledgerTransactionData` field to attach.
 * @returns A `Core_TransactionsCollection`-shaped body.
 */
function txCollection(ledgerTransactionData: unknown): Record<string, unknown> {
  return {
    count: 1,
    items: [
      {
        id: 'tx-1',
        orderReference: { id: INTENT_ID, domainId: DOMAIN_ID },
        ledgerTransactionData,
      },
    ],
  }
}

describe('pollTransactionOnChain', () => {
  const options = { domainId: DOMAIN_ID, intentId: INTENT_ID, timeoutMs: 5000 }

  it('returns the issuance id from structured ledgerData when present', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH1',
          ledgerData: { type: 'Xrpl', tokenData: { issuanceId: 'STRUCTURED' } },
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH1', mptIssuanceId: 'STRUCTURED' })
  })

  it('reconstructs the issuance id from rawTransaction when ledgerData is null', async () => {
    // The Custody sandbox confirms MPT issuances yet returns `ledgerData: null`,
    // so the id has to be recovered from the signed blob.
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH2',
          ledgerData: null,
          rawTransaction: MPT_CREATE_RAW,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH2', mptIssuanceId: MPT_CREATE_ID })
  })

  it('prefers structured tokenData over the raw blob when both are present', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH3',
          ledgerData: { type: 'Xrpl', tokenData: { issuanceId: 'STRUCTURED' } },
          rawTransaction: MPT_CREATE_RAW,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result?.mptIssuanceId).toBe('STRUCTURED')
  })

  it('omits the issuance id for a confirmed non-MPT transaction', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH4',
          ledgerData: null,
          rawTransaction: PAYMENT_RAW,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH4' })
  })

  it('omits the issuance id when neither structured data nor a raw blob is present', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Confirmed',
          ledgerTransactionId: 'HASH5',
          ledgerData: null,
        }),
      ),
    )

    const result = await pollTransactionOnChain({ client, ...options })

    expect(result).toEqual({ txHash: 'HASH5' })
  })

  it('returns undefined when confirmation never arrives before the timeout', async () => {
    const { client } = makeClient(() =>
      ok(
        txCollection({
          ledgerStatus: 'Pending',
          ledgerTransactionId: '',
          ledgerData: null,
        }),
      ),
    )

    // The first backoff (5s) already exceeds this deadline, so the poll gives
    // up on the opening attempt without sleeping.
    const result = await pollTransactionOnChain({
      client,
      domainId: DOMAIN_ID,
      intentId: INTENT_ID,
      timeoutMs: 500,
    })

    expect(result).toBeUndefined()
  })
})
