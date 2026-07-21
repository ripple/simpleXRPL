# Interface: Clock

Defined in: [src/ports/clock.ts:5](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/clock.ts#L5)

A source of wall-clock time, injected so timeout and token-expiry logic is
deterministic and testable.

## Properties

### now()

> `readonly` **now**: () => `number`

Defined in: [src/ports/clock.ts:7](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/clock.ts#L7)

The current time in epoch milliseconds.

#### Returns

`number`
