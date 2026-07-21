# Class: Domain

Defined in: [src/verticals/domain.ts:24](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.ts#L24)

The Domain vertical: create, update, and delete permissioned domains.

## Constructors

### new Domain()

> **new Domain**(`host`): [`Domain`](Domain.md)

Defined in: [src/verticals/domain.ts:32](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.ts#L32)

Construct the Domain vertical.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the pipeline runs against. |

#### Returns

[`Domain`](Domain.md)

## Methods

### create()

> **create**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

Defined in: [src/verticals/domain.ts:43](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.ts#L43)

Create a new permissioned domain.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`DomainCreateParams`](../interfaces/DomainCreateParams.md) | The credentials the new domain accepts. |
| `options`? | [`DomainWriteOptions`](../interfaces/DomainWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

The result, with the new domain id as its intent output.

***

### delete()

> **delete**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

Defined in: [src/verticals/domain.ts:94](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.ts#L94)

Delete a permissioned domain.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`DomainDeleteParams`](../interfaces/DomainDeleteParams.md) | The domain id to delete. |
| `options`? | [`DomainWriteOptions`](../interfaces/DomainWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

The result, echoing the domain id.

***

### setCredentials()

> **setCredentials**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

Defined in: [src/verticals/domain.ts:68](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.ts#L68)

Update the accepted credentials of an existing permissioned domain.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`DomainSetCredentialsParams`](../interfaces/DomainSetCredentialsParams.md) | The domain id and its new accepted credentials. |
| `options`? | [`DomainWriteOptions`](../interfaces/DomainWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

The result, echoing the domain id.
