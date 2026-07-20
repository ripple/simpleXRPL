import {
  AccountSetAsfFlags,
  MPTokenIssuanceCreateFlags,
  OfferCreateFlags,
} from 'xrpl'
import type { AccountSet } from 'xrpl'

import type {
  AccountSetParams,
  MptIssueFlags,
  OfferFlags,
} from '../../../src/index.js'
import { orderTypeFlags } from '../../../src/verticals/iou.helpers.js'
import { issueFlags, offerFlags } from '../../../src/verticals/token.helpers.js'
import { recordingClient } from '../helpers/recording-ledger.js'

// A full matrix over every SDK-exposed flag: each named flag must map to the
// exact xrpl flag value, in both directions where applicable. This hardens the
// Build layer against silent flag-mapping regressions.

describe('Account.set flag matrix', () => {
  const flags: ReadonlyArray<[keyof AccountSetParams, AccountSetAsfFlags]> = [
    ['noFreeze', AccountSetAsfFlags.asfNoFreeze],
    ['clawbackEnabled', AccountSetAsfFlags.asfAllowTrustLineClawback],
    ['trustLineLocking', AccountSetAsfFlags.asfAllowTrustLineLocking],
    ['disableMaster', AccountSetAsfFlags.asfDisableMaster],
    ['requireAuth', AccountSetAsfFlags.asfRequireAuth],
    ['requireDest', AccountSetAsfFlags.asfRequireDest],
    ['defaultRipple', AccountSetAsfFlags.asfDefaultRipple],
    ['globalFreeze', AccountSetAsfFlags.asfGlobalFreeze],
    ['disallowXRP', AccountSetAsfFlags.asfDisallowXRP],
  ]

  it.each(flags)(
    '%s: true → SetFlag %d, false → ClearFlag',
    async (name, value) => {
      const enabled = await recordingClient()
      await enabled.client.account.set({ [name]: true })
      const setTx = enabled.txs[0] as AccountSet
      expect(setTx.SetFlag).toBe(value)
      expect(setTx.ClearFlag).toBeUndefined()

      const disabled = await recordingClient()
      await disabled.client.account.set({ [name]: false })
      const clearTx = disabled.txs[0] as AccountSet
      expect(clearTx.ClearFlag).toBe(value)
      expect(clearTx.SetFlag).toBeUndefined()
    },
  )
})

describe('Token issuance capability flag matrix', () => {
  const flags: ReadonlyArray<
    [keyof MptIssueFlags, MPTokenIssuanceCreateFlags]
  > = [
    ['canLock', MPTokenIssuanceCreateFlags.tfMPTCanLock],
    ['requireAuth', MPTokenIssuanceCreateFlags.tfMPTRequireAuth],
    ['canEscrow', MPTokenIssuanceCreateFlags.tfMPTCanEscrow],
    ['canTrade', MPTokenIssuanceCreateFlags.tfMPTCanTrade],
    ['canTransfer', MPTokenIssuanceCreateFlags.tfMPTCanTransfer],
    ['canClawback', MPTokenIssuanceCreateFlags.tfMPTCanClawback],
  ]
  const allOff: Required<MptIssueFlags> = {
    canLock: false,
    requireAuth: false,
    canEscrow: false,
    canTrade: false,
    canTransfer: false,
    canClawback: false,
  }

  it.each(flags)('%s in isolation → its bit', (name, bit) => {
    expect(issueFlags({ ...allOff, [name]: true })).toBe(bit)
  })

  it('combines every capability into one mask', () => {
    const all: Required<MptIssueFlags> = {
      canLock: true,
      requireAuth: true,
      canEscrow: true,
      canTrade: true,
      canTransfer: true,
      canClawback: true,
    }
    const expected = flags.reduce((mask, [, bit]) => mask | bit, 0)
    expect(issueFlags(all)).toBe(expected)
  })

  it('returns undefined when every capability is off', () => {
    expect(issueFlags(allOff)).toBeUndefined()
  })

  it('defaults (no flags arg) to every capability except requireAuth', () => {
    const expected =
      MPTokenIssuanceCreateFlags.tfMPTCanLock |
      MPTokenIssuanceCreateFlags.tfMPTCanEscrow |
      MPTokenIssuanceCreateFlags.tfMPTCanTrade |
      MPTokenIssuanceCreateFlags.tfMPTCanTransfer |
      MPTokenIssuanceCreateFlags.tfMPTCanClawback
    expect(issueFlags()).toBe(expected)
  })
})

describe('Offer flag matrix', () => {
  const orderTypes = [
    ['limit', 0],
    ['market', OfferCreateFlags.tfImmediateOrCancel],
    ['fok', OfferCreateFlags.tfFillOrKill],
    ['passive', OfferCreateFlags.tfPassive],
  ] as const

  it.each(orderTypes)('buy %s → its flag (no tfSell)', (orderType, bit) => {
    expect(orderTypeFlags(orderType, false)).toBe(bit === 0 ? undefined : bit)
  })

  it.each(orderTypes)('sell %s → its flag | tfSell', (orderType, bit) => {
    expect(orderTypeFlags(orderType, true)).toBe(bit | OfferCreateFlags.tfSell)
  })

  const offerBits: ReadonlyArray<[keyof OfferFlags, OfferCreateFlags]> = [
    ['passive', OfferCreateFlags.tfPassive],
    ['immediateOrCancel', OfferCreateFlags.tfImmediateOrCancel],
    ['fillOrKill', OfferCreateFlags.tfFillOrKill],
    ['sell', OfferCreateFlags.tfSell],
  ]
  it.each(offerBits)('token offer flag %s → its bit', (name, bit) => {
    expect(offerFlags({ [name]: true })).toBe(bit)
  })

  it('token offerFlags returns undefined when none set', () => {
    expect(offerFlags({})).toBeUndefined()
  })
})
