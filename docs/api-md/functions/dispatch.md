# Function: dispatch()

> **dispatch**(`account`, `transactor`): [`SubmissionPath`](../type-aliases/SubmissionPath.md)

Defined in: [pipeline/dispatch.ts:24](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/pipeline/dispatch.ts#L24)

Choose the path for a transaction on a resolved account. Local signs
everything; a custodian uses its native operation when the transactor is in
its capability set, else the raw fallback when enabled, else it is rejected.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `account` | [`Account`](../interfaces/Account.md) | The resolved source account. |
| `transactor` | `"SetFee"` \| `"AMMBid"` \| `"AMMClawback"` \| `"AMMCreate"` \| `"AMMDelete"` \| `"AMMDeposit"` \| `"AMMVote"` \| `"AMMWithdraw"` \| `"AccountDelete"` \| `"AccountSet"` \| `"Batch"` \| `"CheckCancel"` \| `"CheckCash"` \| `"CheckCreate"` \| `"Clawback"` \| `"CredentialAccept"` \| `"CredentialCreate"` \| `"CredentialDelete"` \| `"DIDDelete"` \| `"DIDSet"` \| `"DelegateSet"` \| `"DepositPreauth"` \| `"EscrowCancel"` \| `"EscrowCreate"` \| `"EscrowFinish"` \| `"LoanBrokerSet"` \| `"LoanBrokerCoverClawback"` \| `"LoanBrokerCoverDeposit"` \| `"LoanBrokerCoverWithdraw"` \| `"LoanBrokerDelete"` \| `"LoanSet"` \| `"LoanDelete"` \| `"LoanManage"` \| `"LoanPay"` \| `"MPTokenAuthorize"` \| `"MPTokenIssuanceCreate"` \| `"MPTokenIssuanceDestroy"` \| `"MPTokenIssuanceSet"` \| `"NFTokenAcceptOffer"` \| `"NFTokenBurn"` \| `"NFTokenCancelOffer"` \| `"NFTokenCreateOffer"` \| `"NFTokenMint"` \| `"NFTokenModify"` \| `"OfferCancel"` \| `"OfferCreate"` \| `"OracleDelete"` \| `"OracleSet"` \| `"Payment"` \| `"PaymentChannelClaim"` \| `"PaymentChannelCreate"` \| `"PaymentChannelFund"` \| `"PermissionedDomainSet"` \| `"PermissionedDomainDelete"` \| `"SetRegularKey"` \| `"SignerListSet"` \| `"TicketCreate"` \| `"TrustSet"` \| `"VaultClawback"` \| `"VaultCreate"` \| `"VaultDelete"` \| `"VaultDeposit"` \| `"VaultSet"` \| `"VaultWithdraw"` \| `"XChainAccountCreateCommit"` \| `"XChainAddAccountCreateAttestation"` \| `"XChainAddClaimAttestation"` \| `"XChainClaim"` \| `"XChainCommit"` \| `"XChainCreateBridge"` \| `"XChainCreateClaimID"` \| `"XChainModifyBridge"` \| `"EnableAmendment"` \| `"UNLModify"` | The XRPL transaction type being dispatched. |

## Returns

[`SubmissionPath`](../type-aliases/SubmissionPath.md)

The chosen submission path.

## Throws

[SignerCapabilityError](../classes/SignerCapabilityError.md) if the custodian can neither natively
  nor raw-sign the transactor.
