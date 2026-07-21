# Interface: DomainWriteOptions

Defined in: [src/verticals/domain.types.ts:4](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.types.ts#L4)

Per-call options shared by the domain verbs.

## Properties

### fee?

> `readonly` `optional` **fee**: [`FeeIntent`](FeeIntent.md)

Defined in: [src/verticals/domain.types.ts:9](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.types.ts#L9)

Fee override.

***

### from?

> `readonly` `optional` **from**: [`AccountSelector`](../type-aliases/AccountSelector.md)

Defined in: [src/verticals/domain.types.ts:6](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/verticals/domain.types.ts#L6)

Source account; defaults to the primary signer's primary account.
