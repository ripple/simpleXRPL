# Interface: Clock

Defined in: [ports/clock.ts:5](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/clock.ts#L5)

A source of wall-clock time, injected so timeout and token-expiry logic is
deterministic and testable.

## Properties

### now()

> `readonly` **now**: () => `number`

Defined in: [ports/clock.ts:7](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/clock.ts#L7)

The current time in epoch milliseconds.

#### Returns

`number`
