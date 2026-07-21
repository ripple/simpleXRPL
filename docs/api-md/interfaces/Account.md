# Interface: Account

Defined in: [src/domain/model.ts:37](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L37)

A discovered account, keyed by r-address, with a back-reference to the
custodian that owns and signs for it.

## Extends

- [`AccountRef`](AccountRef.md)

## Properties

### address

> `readonly` **address**: `string`

Defined in: [src/domain/model.ts:27](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L27)

The XRPL r-address — the canonical key the core and verticals use.

#### Inherited from

[`AccountRef`](AccountRef.md).[`address`](AccountRef.md#address)

***

### alias?

> `readonly` `optional` **alias**: `string`

Defined in: [src/domain/model.ts:39](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L39)

Custodian-side alias, when the backend exposes one.

***

### custodianRef?

> `readonly` `optional` **custodianRef**: [`CustodianRef`](../type-aliases/CustodianRef.md)

Defined in: [src/domain/model.ts:30](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L30)

The owning custodian's native id, opaque to everything but that custodian.

#### Inherited from

[`AccountRef`](AccountRef.md).[`custodianRef`](AccountRef.md#custodianref)

***

### metadata?

> `readonly` `optional` **metadata**: \{ `kind`: [`CustodianKind`](../type-aliases/CustodianKind.md); `tags`: readonly `string`[]; \}

Defined in: [src/domain/model.ts:45](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L45)

Optional, advisory-only metadata.

#### kind?

> `readonly` `optional` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

#### tags?

> `readonly` `optional` **tags**: readonly `string`[]

***

### signer

> `readonly` **signer**: [`Custodian`](Custodian.md)

Defined in: [src/domain/model.ts:42](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/domain/model.ts#L42)

The custodian that discovered and signs for this account.
