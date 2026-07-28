# Function: readAccountAddress()

> **readAccountAddress**(`host`, `account`?): `string`

Defined in: [reads/read-helpers.ts:21](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/reads/read-helpers.ts#L21)

Resolve the account a read targets. Reads never require a signer: pass an
explicit `account`, or fall back to the primary signer's account when one is
configured.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `host` | [`SubmissionHost`](../interfaces/SubmissionHost.md) | The client the read runs against. |
| `account`? | `string` | An explicit r-address to query, if any. |

## Returns

`string`

The r-address to query.

## Throws

[SimpleXRPLError](../classes/SimpleXRPLError.md) if no account is given and there is no primary.
