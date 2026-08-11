# Interface: RippleCustodyAuthOptions

Defined in: [custodians/ripple/construction.ts:25](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L25)

Auth construction options (TDD §3.3).

## Properties

### clientId?

> `readonly` `optional` **clientId**: `string`

Defined in: [custodians/ripple/construction.ts:33](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L33)

The OIDC client id to authenticate as. Defaults to `'customer_api'`.

***

### publicKey?

> `readonly` `optional` **publicKey**: `string`

Defined in: [custodians/ripple/construction.ts:29](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L29)

Matching public key, base64 SPKI DER. Derived from `signingKey` if omitted.

***

### signingKey

> `readonly` **signingKey**: `string`

Defined in: [custodians/ripple/construction.ts:27](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L27)

Intent-author private key: PEM contents, or a path to a `.pem` file.

***

### tokenUrl

> `readonly` **tokenUrl**: `string`

Defined in: [custodians/ripple/construction.ts:31](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L31)

The Custody token endpoint URL.
