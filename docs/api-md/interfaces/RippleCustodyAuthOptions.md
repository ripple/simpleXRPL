# Interface: RippleCustodyAuthOptions

Defined in: [custodians/ripple/construction.ts:20](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L20)

Auth construction options (TDD §3.3).

## Properties

### publicKey?

> `readonly` `optional` **publicKey**: `string`

Defined in: [custodians/ripple/construction.ts:24](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L24)

Matching public key, base64 SPKI DER. Derived from `signingKey` if omitted.

***

### signingKey

> `readonly` **signingKey**: `string`

Defined in: [custodians/ripple/construction.ts:22](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L22)

Intent-author private key: PEM contents, or a path to a `.pem` file.

***

### tokenUrl

> `readonly` **tokenUrl**: `string`

Defined in: [custodians/ripple/construction.ts:26](https://github.com/ripple/simpleXRPL/blob/main/src/custodians/ripple/construction.ts#L26)

The Custody token endpoint URL.
