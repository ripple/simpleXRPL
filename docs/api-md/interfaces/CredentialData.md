# Interface: CredentialData

Defined in: [verticals/credential.types.ts:64](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L64)

A shaped credential (from `ledger_entry` / `account_objects`); no hex.

## Extends

- [`CredentialRef`](CredentialRef.md)

## Properties

### accepted

> `readonly` **accepted**: `boolean`

Defined in: [verticals/credential.types.ts:66](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L66)

Whether the holder has accepted the credential (`lsfAccepted`).

***

### credType

> `readonly` **credType**: `string`

Defined in: [verticals/credential.types.ts:56](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L56)

The credential type.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`credType`](CredentialRef.md#credtype)

***

### expiration?

> `readonly` `optional` **expiration**: `number`

Defined in: [verticals/credential.types.ts:70](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L70)

Expiration (seconds since the Ripple epoch), if set.

***

### holder

> `readonly` **holder**: `string`

Defined in: [verticals/credential.types.ts:60](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L60)

The holder (subject) r-address.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`holder`](CredentialRef.md#holder)

***

### issuer

> `readonly` **issuer**: `string`

Defined in: [verticals/credential.types.ts:58](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L58)

The issuer r-address.

#### Inherited from

[`CredentialRef`](CredentialRef.md).[`issuer`](CredentialRef.md#issuer)

***

### uri?

> `readonly` `optional` **uri**: `string`

Defined in: [verticals/credential.types.ts:68](https://github.com/ripple/simpleXRPL/blob/main/src/verticals/credential.types.ts#L68)

The optional URI (decoded from hex).
