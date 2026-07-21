# Interface: Clock

Defined in: [src/ports/clock.ts:5](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/clock.ts#L5)

A source of wall-clock time, injected so timeout and token-expiry logic is
deterministic and testable.

## Properties

### now()

> `readonly` **now**: () => `number`

Defined in: [src/ports/clock.ts:7](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/clock.ts#L7)

The current time in epoch milliseconds.

#### Returns

`number`
