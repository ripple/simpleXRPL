# Function: validateTokenMetadata()

> **validateTokenMetadata**(`metadata`): `string`[]

Defined in: [verticals/token.helpers.ts:172](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/token.helpers.ts#L172)

Check MPT metadata against the XLS-89 standard without throwing — the
pre-flight companion to `Token.issue`. Accepts a structured object or a raw
string, so callers can validate before (or independent of) issuing.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `metadata` | `string` \| `MPTokenMetadata` | Structured metadata or a raw string. |

## Returns

`string`[]

A list of problems; an empty array means the metadata is valid.
