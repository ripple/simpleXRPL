# Interface: Account

Defined in: [domain/model.ts:37](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L37)

A discovered account, keyed by r-address, with a back-reference to the
custodian that owns and signs for it.

## Extends

- [`AccountRef`](AccountRef.md)

## Properties

### address

> `readonly` **address**: `string`

Defined in: [domain/model.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L27)

The XRPL r-address — the canonical key the core and verticals use.

#### Inherited from

[`AccountRef`](AccountRef.md).[`address`](AccountRef.md#address)

***

### alias?

> `readonly` `optional` **alias**: `string`

Defined in: [domain/model.ts:39](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L39)

Custodian-side alias, when the backend exposes one.

***

### custodianRef?

> `readonly` `optional` **custodianRef**: [`CustodianRef`](../type-aliases/CustodianRef.md)

Defined in: [domain/model.ts:30](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L30)

The owning custodian's native id, opaque to everything but that custodian.

#### Inherited from

[`AccountRef`](AccountRef.md).[`custodianRef`](AccountRef.md#custodianref)

***

### ledgerId?

> `readonly` `optional` **ledgerId**: `string`

Defined in: [domain/model.ts:46](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L46)

The custodian-specific ledger id backing this address, when the backend
needs one disambiguated (e.g. Ripple Custody's multi-ledger Vault
accounts, which carry no ledger default of their own).

***

### metadata?

> `readonly` `optional` **metadata**: \{ `kind`: [`CustodianKind`](../type-aliases/CustodianKind.md); `tags`: readonly `string`[]; \}

Defined in: [domain/model.ts:59](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L59)

Optional, advisory-only metadata.

#### kind?

> `readonly` `optional` **kind**: [`CustodianKind`](../type-aliases/CustodianKind.md)

#### tags?

> `readonly` `optional` **tags**: readonly `string`[]

***

### publicKey?

> `readonly` `optional` **publicKey**: `string`

Defined in: [domain/model.ts:53](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L53)

The account's XRPL public key (hex), when the custodian exposes it. Used to
populate `SigningPubKey` on transactions signed by a backend that returns
only the signature (e.g. Palisade's raw sign-only path).

***

### signer

> `readonly` **signer**: [`Custodian`](Custodian.md)

Defined in: [domain/model.ts:56](https://github.com/ripple/simpleXRPL/blob/main/src/domain/model.ts#L56)

The custodian that discovered and signs for this account.
