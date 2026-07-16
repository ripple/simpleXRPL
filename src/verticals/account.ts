import { AccountSetAsfFlags, Wallet, xrpToDrops } from 'xrpl'
import type { AccountSet, DepositPreauth, Payment, SetRegularKey } from 'xrpl'

import type { SubmissionResult } from '../domain/index.js'
import { SimpleXRPLError } from '../errors.js'
import type { SubmissionHost } from '../pipeline/index.js'
import { submitTransaction, withIntent } from '../pipeline/index.js'

import type {
  AccountActivateParams,
  AccountCredentials,
  AccountFundParams,
  AccountSetParams,
  AccountWriteOptions,
  DepositPreauthParams,
  SetRegularKeyParams,
} from './account.types.js'
import { percentToTransferRate } from './fee.js'
import { toHex } from './hex.js'

/** XRP added on top of the base reserve by `activate` so the new account can
 * afford its own `defaultRipple` transaction. */
const ACTIVATION_BUFFER_XRP = 1

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
   * Generate a new XRPL keypair locally and register it so it can be funded and
   * used right away. Nothing is written to the ledger until the account is
   * funded; store the returned `seed` securely (it is the only way to control
   * the account). Use this only to mint an additional account outside of
   * `SimpleXRPL.init`.
   *
   * @returns The new account's address, public key, private key, and seed.
   * @throws {@link SimpleXRPLError} if key generation yields no seed.
   */
  public create(): AccountCredentials {
    const wallet = Wallet.generate()
    if (wallet.seed === undefined) {
      throw new SimpleXRPLError('Wallet.generate did not return a seed')
    }
    this.host.registerLocalAccount(wallet.seed)
    return {
      address: wallet.classicAddress,
      publicKey: wallet.publicKey,
      privateKey: wallet.privateKey,
      seed: wallet.seed,
    }
  }

  /**
   * Fund a created account via the network faucet (testnet/devnet), then enable
   * rippling (`defaultRipple`). The account must be one this client can sign for
   * (e.g. from {@link create}).
   *
   * @param params - The destination address to fund.
   * @param options - Fee override for the follow-up settings transaction.
   * @returns The result of the `defaultRipple` settings change.
   * @throws {@link SimpleXRPLError} if the ledger exposes no faucet.
   */
  public async fund(
    params: AccountFundParams,
    options?: AccountWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    if (this.host.ledger.fundViaFaucet === undefined) {
      throw new SimpleXRPLError(
        'Account.fund requires a faucet-capable ledger (testnet/devnet). ' +
          'Use Account.activate to fund from an operator account instead.',
      )
    }
    // Call as a method so the ledger keeps its `this` binding.
    await this.host.ledger.fundViaFaucet(params.destination)
    return this.set(
      { defaultRipple: true },
      { from: params.destination, fee: options?.fee },
    )
  }

  /**
   * Activate a created account by sending it XRP from the operator (primary)
   * account, then enable rippling. The any-network counterpart to {@link fund};
   * the account must be signable by this client (e.g. from {@link create}).
   *
   * @param params - The destination and optional XRP amount (default: base reserve).
   * @param options - Fee override for the transactions.
   * @returns The result of the `defaultRipple` settings change.
   */
  public async activate(
    params: AccountActivateParams,
    options?: AccountWriteOptions,
  ): Promise<SubmissionResult<undefined>> {
    const operator = this.host.resolveAccount()
    // Default to the base reserve plus a buffer so the new account can afford
    // the follow-up defaultRipple transaction's fee without dropping below it.
    const amountXrp =
      params.amount ??
      String((await this.baseReserveXrp()) + ACTIVATION_BUFFER_XRP)
    const payment: Payment = {
      TransactionType: 'Payment',
      Account: operator.address,
      Destination: params.destination,
      Amount: xrpToDrops(amountXrp),
    }
    await submitTransaction(this.host, {
      transaction: payment,
      account: operator,
      fee: options?.fee,
    })
    return this.set(
      { defaultRipple: true },
      { from: params.destination, fee: options?.fee },
    )
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

  /**
   * Fetch the network's base reserve (in XRP) from `server_info`.
   *
   * @returns The base reserve as an XRP string.
   * @throws {@link SimpleXRPLError} if the base reserve is not reported.
   */
  private async baseReserveXrp(): Promise<number> {
    const info = await this.host.ledger.request<{
      result: { info: { validated_ledger?: { reserve_base_xrp?: number } } }
    }>({ command: 'server_info' })
    const reserve = info.result.info.validated_ledger?.reserve_base_xrp
    if (reserve === undefined) {
      throw new SimpleXRPLError(
        'Could not determine the base reserve from server_info',
      )
    }
    return reserve
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
