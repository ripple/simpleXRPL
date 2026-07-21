# Function: txToNativeSubmit()

> **txToNativeSubmit**(`tx`): [`NativeSubmit`](../interfaces/NativeSubmit.md)

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:46](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/custodians/palisade/mapping/submit-operations.ts#L46)

Map a built xrpl.js transaction to its Palisade native submission. Fields
with no native slot throw [SignerCapabilityError](../classes/SignerCapabilityError.md) rather than being
dropped; the custodian turns that into the raw path when enabled.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `tx` | `Transaction` | The transaction to map. |

## Returns

[`NativeSubmit`](../interfaces/NativeSubmit.md)

The native sub-path and request body.

## Throws

[SignerCapabilityError](../classes/SignerCapabilityError.md) if the transactor isn't natively modeled.
