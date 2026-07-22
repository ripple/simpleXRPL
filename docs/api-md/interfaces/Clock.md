# Interface: Clock

Defined in: [ports/clock.ts:5](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/clock.ts#L5)

A source of wall-clock time, injected so timeout and token-expiry logic is
deterministic and testable.

## Properties

### now()

> `readonly` **now**: () => `number`

Defined in: [ports/clock.ts:7](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/clock.ts#L7)

The current time in epoch milliseconds.

#### Returns

`number`
