# Function: txToNativeSubmit()

> **txToNativeSubmit**(`tx`, `idempotencyKey`?): [`NativeSubmit`](../interfaces/NativeSubmit.md)

Defined in: [custodians/palisade/mapping/submit-operations.ts:53](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/palisade/mapping/submit-operations.ts#L53)

Map a built xrpl.js transaction to its Palisade native submission. Fields
with no native slot throw [SignerCapabilityError](../classes/SignerCapabilityError.md) rather than being
dropped; the custodian turns that into the raw path when enabled.

`idempotencyKey` is carried as Palisade's `externalId` dedup key, but only
`transfer` models that field — the `xrp/*` operation bodies have no slot for
it, so a retry of one of those is not deduplicated custodian-side.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The transaction to map. |
| `idempotencyKey`? | `string` | The submission's idempotency key, when set. |

## Returns

[`NativeSubmit`](../interfaces/NativeSubmit.md)

The native sub-path and request body.

## Throws

[SignerCapabilityError](../classes/SignerCapabilityError.md) if the transactor isn't natively modeled.
