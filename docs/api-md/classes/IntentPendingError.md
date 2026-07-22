# Class: IntentPendingError

Defined in: [errors.ts:171](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L171)

Not a failure — a "still waiting" signal raised when a custodian intent has
not reached a terminal state before the SDK's timeout. Resume later with the
carried `intentId`.

## Extends

- [`SimpleXRPLError`](SimpleXRPLError.md)

## Constructors

### new IntentPendingError()

> **new IntentPendingError**(`intentId`, `custodian`, `lastState`): [`IntentPendingError`](IntentPendingError.md)

Defined in: [errors.ts:183](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L183)

Construct an IntentPendingError.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `intentId` | `string` | The custodian intent id to resume with. |
| `custodian` | `"ripple-custody"` \| `"palisade-custody"` | The custodian kind that owns the intent. |
| `lastState` | `string` | The last observed (non-terminal) state. |

#### Returns

[`IntentPendingError`](IntentPendingError.md)

#### Overrides

[`SimpleXRPLError`](SimpleXRPLError.md).[`constructor`](SimpleXRPLError.md#constructors)

## Properties

### custodian

> `readonly` **custodian**: `"ripple-custody"` \| `"palisade-custody"`

Defined in: [errors.ts:173](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L173)

***

### intentId

> `readonly` **intentId**: `string`

Defined in: [errors.ts:172](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L172)

***

### lastState

> `readonly` **lastState**: `string`

Defined in: [errors.ts:174](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L174)

***

### name

> `readonly` **name**: `string`

Defined in: [errors.ts:9](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/errors.ts#L9)

#### Inherited from

[`SimpleXRPLError`](SimpleXRPLError.md).[`name`](SimpleXRPLError.md#name)
