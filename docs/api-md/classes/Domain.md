# Class: Domain

Defined in: [verticals/domain.ts:29](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.ts#L29)

The Domain vertical: create, update, and delete permissioned domains.

## Constructors

### new Domain()

> **new Domain**(`host`): [`Domain`](Domain.md)

Defined in: [verticals/domain.ts:37](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.ts#L37)

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

Defined in: [verticals/domain.ts:70](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.ts#L70)

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

Defined in: [verticals/domain.ts:123](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.ts#L123)

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

### list()

> **list**(`params`?): `Promise`\<[`DomainListResult`](../interfaces/DomainListResult.md)\>

Defined in: [verticals/domain.ts:59](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.ts#L59)

List every permissioned domain owned by an account. No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params`? | [`DomainListParams`](../interfaces/DomainListParams.md) | The owner account (default: the primary signer's account). |

#### Returns

`Promise`\<[`DomainListResult`](../interfaces/DomainListResult.md)\>

The domain ids and shaped domains, index-aligned.

***

### retrieve()

> **retrieve**(`params`): `Promise`\<[`DomainRetrieveResult`](../interfaces/DomainRetrieveResult.md)\>

Defined in: [verticals/domain.ts:47](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.ts#L47)

Retrieve a permissioned domain by id (point-in-time). No signer required.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`DomainRetrieveParams`](../interfaces/DomainRetrieveParams.md) | The domain id to fetch. |

#### Returns

`Promise`\<[`DomainRetrieveResult`](../interfaces/DomainRetrieveResult.md)\>

The domain id and snapshot (or `undefined` data if absent).

***

### setCredentials()

> **setCredentials**(`params`, `options`?): `Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

Defined in: [verticals/domain.ts:96](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/verticals/domain.ts#L96)

Update the accepted credentials of an existing permissioned domain.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`DomainSetCredentialsParams`](../interfaces/DomainSetCredentialsParams.md) | The domain id and its new accepted credentials. |
| `options`? | [`DomainWriteOptions`](../interfaces/DomainWriteOptions.md) | Source account and fee override. |

#### Returns

`Promise`\<[`SubmissionResult`](../type-aliases/SubmissionResult.md)\<[`DomainIntent`](../interfaces/DomainIntent.md)\>\>

The result, echoing the domain id.
