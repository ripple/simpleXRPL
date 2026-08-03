# Function: uuidV7()

> **uuidV7**(`nowMs`): `string`

Defined in: [ids/uuid-v7.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/ids/uuid-v7.ts#L27)

Generate a UUIDv7 (RFC 9562): a 48-bit big-endian unix-millisecond timestamp
followed by 74 random bits, with the version and variant fields set. The
leading timestamp makes ids time-ordered — lexicographically sortable and
index-friendly — which is why the SDK uses them for client-generated intent
ids (§8): a retry reuses the same id, and ids stay ordered for the backend.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `nowMs` | `number` | The unix-millisecond timestamp to embed (defaults to now; injectable for deterministic tests). |

## Returns

`string`

A canonical lower-case UUIDv7 string.
