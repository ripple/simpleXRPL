# Interface: Clock

Defined in: [ports/clock.ts:5](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/ports/clock.ts#L5)

A source of wall-clock time, injected so timeout and token-expiry logic is
deterministic and testable.

## Properties

### now()

> `readonly` **now**: () => `number`

Defined in: [ports/clock.ts:7](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/ports/clock.ts#L7)

The current time in epoch milliseconds.

#### Returns

`number`
