import { AccountSetAsfFlags } from 'xrpl'
import type { AccountSet, DepositPreauth, SetRegularKey } from 'xrpl'

import type { SubmissionResult } from '../domain/index.js'
import { SimpleXRPLError } from '../errors.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import type {
  AccountSetParams,
  AccountWriteOptions,
  DepositPreauthParams,
  SetRegularKeyParams,
} from './account.types.js'
import { percentToTransferRate } from './fee.js'
import { toHex } from './hex.js'

/** Maps each named `Account.set` flag to its `AccountSetAsfFlags` value. */
const FLAG_MAP: ReadonlyArray<readonly [keyof AccountSetParams, number]> = [
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

/**
 * The Account vertical: account settings, regular key, and deposit preauth.
 * Named `AccountVertical` to avoid colliding with the `Account` record type;
 * reached as `client.account`.
 */
export class AccountVertical {
  private readonly host: SubmissionHost

  /**
   * Construct the Account vertical.
   *
   * @param host - The client the pipeline runs against.
   */
  public constructor(host: SubmissionHost) {
    this.host = host
  }

  /**
   * Update account settings. Flags are named booleans (`true` enables, `false`
   * disables); `transferRate`, `tickSize`, and `domain` are set directly. At
   * least one parameter is required.
   *
   * @param params - The settings to change.
   * @param options - Source account and fee override.
   * @returns The submission result.
   * @throws {@link SimpleXRPLError} if no parameter is given, or more than one
   *   flag is toggled in the same direction (an `AccountSet` limitation).
   */
  public async set(
    params: AccountSetParams,
    options?: AccountWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    const account = this.host.resolveAccount(options?.from)
    const { setFlag, clearFlag } = resolveFlags(params)
    const tx: AccountSet = {
      TransactionType: 'AccountSet',
      Account: account.address,
    }
    if (setFlag !== undefined) {
      tx.SetFlag = setFlag
    }
    if (clearFlag !== undefined) {
      tx.ClearFlag = clearFlag
    }
    if (params.transferRate !== undefined) {
      tx.TransferRate = percentToTransferRate(params.transferRate)
    }
    if (params.tickSize !== undefined) {
      tx.TickSize = params.tickSize
    }
    if (params.domain !== undefined) {
      tx.Domain = toHex(params.domain)
    }
    // Only TransactionType + Account means nothing was set.
    if (Object.keys(tx).length === 2) {
      throw new SimpleXRPLError('Account.set requires at least one parameter')
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, undefined)
  }

  /**
   * Set or remove the account's regular key.
   *
   * @param params - The regular key to set; omit to remove it.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async setRegularKey(
    params: SetRegularKeyParams = {},
    options?: AccountWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: SetRegularKey = {
      TransactionType: 'SetRegularKey',
      Account: account.address,
    }
    if (params.regularKey !== undefined) {
      tx.RegularKey = params.regularKey
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, undefined)
  }

  /**
   * Grant or revoke deposit preauthorization for another account.
   *
   * @param params - The account to authorize or unauthorize.
   * @param options - Source account and fee override.
   * @returns The submission result.
   */
  public async depositPreauth(
    params: DepositPreauthParams,
    options?: AccountWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    const account = this.host.resolveAccount(options?.from)
    const tx: DepositPreauth = {
      TransactionType: 'DepositPreauth',
      Account: account.address,
    }
    if (params.authorize !== undefined) {
      tx.Authorize = params.authorize
    }
    if (params.unauthorize !== undefined) {
      tx.Unauthorize = params.unauthorize
    }
    const result = await submitTransaction(this.host, {
      transaction: tx,
      account,
      fee: options?.fee,
    })
    return withIntent(result, undefined)
  }
}

/**
 * Translate the named boolean flags into `SetFlag`/`ClearFlag` values. A single
 * `AccountSet` enables at most one flag and disables at most one.
 *
 * @param params - The account-set parameters.
 * @returns The resolved flag to enable and/or disable.
 * @throws {@link SimpleXRPLError} if more than one flag is toggled the same way.
 */
function resolveFlags(params: AccountSetParams): {
  setFlag?: number
  clearFlag?: number
} {
  let setFlag: number | undefined
  let clearFlag: number | undefined
  for (const [name, flag] of FLAG_MAP) {
    const value = params[name]
    if (value === true) {
      if (setFlag !== undefined) {
        throw new SimpleXRPLError(
          'Account.set enables at most one flag per call; call set() once per flag',
        )
      }
      setFlag = flag
    } else if (value === false) {
      if (clearFlag !== undefined) {
        throw new SimpleXRPLError(
          'Account.set disables at most one flag per call; call set() once per flag',
        )
      }
      clearFlag = flag
    }
  }
  return { setFlag, clearFlag }
}
