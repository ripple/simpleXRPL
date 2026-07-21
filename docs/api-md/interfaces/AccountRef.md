# Interface: AccountRef

Defined in: [src/domain/model.ts:25](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L25)

A minimal reference to an account: its r-address plus the owning custodian's
native identifier, if any.

## Extended by

- [`Account`](Account.md)

## Properties

### address

> `readonly` **address**: `string`

Defined in: [src/domain/model.ts:27](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L27)

The XRPL r-address — the canonical key the core and verticals use.

***

### custodianRef?

> `readonly` `optional` **custodianRef**: [`CustodianRef`](../type-aliases/CustodianRef.md)

Defined in: [src/domain/model.ts:30](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/domain/model.ts#L30)

The owning custodian's native id, opaque to everything but that custodian.
