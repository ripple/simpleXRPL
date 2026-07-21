# Function: toLedgerAmount()

> **toLedgerAmount**(`amount`): [`LedgerAmount`](../type-aliases/LedgerAmount.md)

Defined in: [src/amount/amount.ts:41](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/amount/amount.ts#L41)

Convert a display amount to the on-ledger representation, applying decimal and
scale conversion and validating precision.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `amount` | [`Amount`](../interfaces/Amount.md) | The display amount. |

## Returns

[`LedgerAmount`](../type-aliases/LedgerAmount.md)

The ledger amount (drops string, IOU amount, or MPT amount).

## Throws

[IntentValidationError](../classes/IntentValidationError.md) if the value is invalid for the asset.
