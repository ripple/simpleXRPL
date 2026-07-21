# Class: Credential

Defined in: [src/verticals/credential.ts:18](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.ts#L18)

The Credential vertical: issue, accept, and delete on-ledger credentials.

## Constructors

### new Credential()

> **new Credential**(`host`): [`Credential`](Credential.md)

Defined in: [src/verticals/credential.ts:26](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.ts#L26)

Construct the Credential vertical.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`Credential`](Credential.md)

## Methods

### accept()

> **accept**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `credType`: `string`; `issuer`: `string`; \}\>\>

Defined in: [src/verticals/credential.ts:72](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.ts#L72)

Accept a credential issued to the source account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`CredentialAcceptParams`](../interfaces/CredentialAcceptParams.md) | Credential type and issuer. |
| `options`? | [`CredentialWriteOptions`](../interfaces/CredentialWriteOptions.md) | Source account (the holder) and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `credType`: `string`; `issuer`: `string`; \}\>\>

The result, echoing the issuer and credential type.

***

### delete()

> **delete**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `credType`: `string`; \}\>\>

Defined in: [src/verticals/credential.ts:101](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.ts#L101)

Delete a credential (as either its issuer or its holder).

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`CredentialDeleteParams`](../interfaces/CredentialDeleteParams.md) | Credential type, plus the counterparty (holder or issuer). |
| `options`? | [`CredentialWriteOptions`](../interfaces/CredentialWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `credType`: `string`; \}\>\>

The result, echoing the credential type.

***

### issue()

> **issue**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `credType`: `string`; `destination`: `string`; \}\>\>

Defined in: [src/verticals/credential.ts:37](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/verticals/credential.ts#L37)

Issue a credential to a destination account.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`CredentialIssueParams`](../interfaces/CredentialIssueParams.md) | Destination, credential type, and optional expiration/URI. |
| `options`? | [`CredentialWriteOptions`](../interfaces/CredentialWriteOptions.md) | Source account (the issuer) and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<\{ `credType`: `string`; `destination`: `string`; \}\>\>

The result, echoing the destination and credential type.
