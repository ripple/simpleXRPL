# Function: fromLedgerAmount()

> **fromLedgerAmount**(`ledger`, `asset`): [`Amount`](../interfaces/Amount.md)

Defined in: [amount/amount.ts:70](https://github.com/ripple/simpleXRPL/blob/main/src/amount/amount.ts#L70)

Convert an on-ledger amount back to a display amount for the given asset.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `ledger` | [`LedgerAmount`](../type-aliases/LedgerAmount.md) | The ledger amount. |
| `asset` | [`Asset`](../type-aliases/Asset.md) | The asset the ledger amount belongs to (supplies MPT scale). |

## Returns

[`Amount`](../interfaces/Amount.md)

The display amount.

## Throws

[IntentValidationError](../classes/IntentValidationError.md) if `ledger` does not match the asset shape.
