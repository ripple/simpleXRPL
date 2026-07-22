import type { SubmissionHost } from '../pipeline/index.js'
import { dropsToXrpString, readAccountAddress } from '../reads/read-helpers.js'

import type {
  AccountRetrieveParams,
  AccountRetrieveResult,
} from './account.types.js'

/** The `account_info` fields this read shapes. */
interface AccountInfoResponse {
  readonly result: {
    readonly account_data: {
      readonly Account: string
      readonly Balance: string
      readonly Sequence: number
      readonly OwnerCount: number
    }
    readonly account_flags?: Readonly<Record<string, boolean>>
  }
}

/**
 * Fetch and shape an account's on-chain state (balance, sequence, reserve
 * driver, flags). No signer required.
 *
 * @param host - The client the read runs against.
 * @param params - The account to read (default: the primary signer's account).
 * @returns The shaped account snapshot.
 */
export async function retrieveAccount(
  host: SubmissionHost,
  params?: AccountRetrieveParams,
): Promise<AccountRetrieveResult> {
  const address = readAccountAddress(host, params?.account)
  const response = await host.ledger.request<AccountInfoResponse>({
    command: 'account_info',
    account: address,
    ledger_index: 'validated',
  })
  const data = response.result.account_data
  return {
    data: {
      address: data.Account,
      xrpBalance: dropsToXrpString(data.Balance),
      sequence: data.Sequence,
      ownerCount: data.OwnerCount,
      flags: response.result.account_flags ?? {},
    },
  }
}
