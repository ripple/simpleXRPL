# Interface: SignerCapabilities

Defined in: [domain/capabilities.ts:13](https://github.com/ripple/simpleXRPL/blob/main/src/domain/capabilities.ts#L13)

What a custodian is able to sign. The dispatcher consults this at the moment
a write runs to choose a path: a transactor in `nativeOps` goes the native
route, otherwise the raw-signing fallback is used when `allowRaw` is set.

## Properties

### allowRaw

> `readonly` **allowRaw**: `boolean`

Defined in: [domain/capabilities.ts:18](https://github.com/ripple/simpleXRPL/blob/main/src/domain/capabilities.ts#L18)

Whether the raw-signing fallback is enabled for this custodian.

***

### nativeOps

> `readonly` **nativeOps**: `ReadonlySet`\<`"SetFee"` \| `"AMMBid"` \| `"AMMClawback"` \| `"AMMCreate"` \| `"AMMDelete"` \| `"AMMDeposit"` \| `"AMMVote"` \| `"AMMWithdraw"` \| `"AccountDelete"` \| `"AccountSet"` \| `"Batch"` \| `"CheckCancel"` \| `"CheckCash"` \| `"CheckCreate"` \| `"Clawback"` \| `"CredentialAccept"` \| `"CredentialCreate"` \| `"CredentialDelete"` \| `"DIDDelete"` \| `"DIDSet"` \| `"DelegateSet"` \| `"DepositPreauth"` \| `"EscrowCancel"` \| `"EscrowCreate"` \| `"EscrowFinish"` \| `"LoanBrokerSet"` \| `"LoanBrokerCoverClawback"` \| `"LoanBrokerCoverDeposit"` \| `"LoanBrokerCoverWithdraw"` \| `"LoanBrokerDelete"` \| `"LoanSet"` \| `"LoanDelete"` \| `"LoanManage"` \| `"LoanPay"` \| `"MPTokenAuthorize"` \| `"MPTokenIssuanceCreate"` \| `"MPTokenIssuanceDestroy"` \| `"MPTokenIssuanceSet"` \| `"NFTokenAcceptOffer"` \| `"NFTokenBurn"` \| `"NFTokenCancelOffer"` \| `"NFTokenCreateOffer"` \| `"NFTokenMint"` \| `"NFTokenModify"` \| `"OfferCancel"` \| `"OfferCreate"` \| `"OracleDelete"` \| `"OracleSet"` \| `"Payment"` \| `"PaymentChannelClaim"` \| `"PaymentChannelCreate"` \| `"PaymentChannelFund"` \| `"PermissionedDomainSet"` \| `"PermissionedDomainDelete"` \| `"SetRegularKey"` \| `"SignerListSet"` \| `"TicketCreate"` \| `"TrustSet"` \| `"VaultClawback"` \| `"VaultCreate"` \| `"VaultDelete"` \| `"VaultDeposit"` \| `"VaultSet"` \| `"VaultWithdraw"` \| `"XChainAccountCreateCommit"` \| `"XChainAddAccountCreateAttestation"` \| `"XChainAddClaimAttestation"` \| `"XChainClaim"` \| `"XChainCommit"` \| `"XChainCreateBridge"` \| `"XChainCreateClaimID"` \| `"XChainModifyBridge"` \| `"EnableAmendment"` \| `"UNLModify"`\>

Defined in: [domain/capabilities.ts:15](https://github.com/ripple/simpleXRPL/blob/main/src/domain/capabilities.ts#L15)

The transactors this custodian models natively.
