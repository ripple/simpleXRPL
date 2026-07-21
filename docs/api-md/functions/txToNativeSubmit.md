# Function: txToNativeSubmit()

> **txToNativeSubmit**(`tx`): [`NativeSubmit`](../interfaces/NativeSubmit.md)

Defined in: [src/custodians/palisade/mapping/submit-operations.ts:46](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/custodians/palisade/mapping/submit-operations.ts#L46)

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
