# Interface: AccountRef

Defined in: [domain/model.ts:29](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L29)

A minimal reference to an account: its r-address plus the owning custodian's
native identifier, if any.

## Extended by

- [`Account`](Account.md)

## Properties

### address

> `readonly` **address**: `string`

Defined in: [domain/model.ts:31](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L31)

The XRPL r-address — the canonical key the core and verticals use.

***

### custodianRef?

> `readonly` `optional` **custodianRef**: [`CustodianRef`](../type-aliases/CustodianRef.md)

Defined in: [domain/model.ts:34](https://github.com/ripple/simpleXRPL/blob/289015b3acf1efe50075248af6c8f99635c1f164/src/domain/model.ts#L34)

The owning custodian's native id, opaque to everything but that custodian.
