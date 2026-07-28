# Interface: Account

Defined in: [domain/model.ts:41](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L41)

A discovered account, keyed by r-address, with a back-reference to the
custodian that owns and signs for it.

## Extends

- [`AccountRef`](AccountRef.md)

## Properties

### address

> `readonly` **address**: `string`

Defined in: [domain/model.ts:31](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L31)

The XRPL r-address — the canonical key the core and verticals use.

#### Inherited from

[`AccountRef`](AccountRef.md).[`address`](AccountRef.md#address)

***

### alias?

> `readonly` `optional` **alias**: `string`

Defined in: [domain/model.ts:43](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L43)

Custodian-side alias, when the backend exposes one.

***

### custodianRef?

> `readonly` `optional` **custodianRef**: [`CustodianRef`](../type-aliases/CustodianRef.md)

Defined in: [domain/model.ts:34](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L34)

The owning custodian's native id, opaque to everything but that custodian.

#### Inherited from

[`AccountRef`](AccountRef.md).[`custodianRef`](AccountRef.md#custodianref)

***

### metadata?

> `readonly` `optional` **metadata**: \{ `kind`: [`CustodianKind`](../type-aliases/CustodianKind.md); `tags`: readonly `string`[]; \}

Defined in: [domain/model.ts:49](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L49)

Optional, advisory-only metadata.

#### kind?

> `readonly` `optional` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

#### tags?

> `readonly` `optional` **tags**: readonly `string`[]

***

### signer

> `readonly` **signer**: [`Custodian`](Custodian.md)

Defined in: [domain/model.ts:46](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L46)

The custodian that discovered and signs for this account.
