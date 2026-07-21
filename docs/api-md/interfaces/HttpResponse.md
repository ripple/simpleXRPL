# Interface: HttpResponse\<T\>

Defined in: [src/ports/http.ts:35](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/http.ts#L35)

A parsed HTTP response.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### data

> `readonly` **data**: `T`

Defined in: [src/ports/http.ts:40](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/http.ts#L40)

The parsed response body.

***

### headers

> `readonly` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/ports/http.ts:43](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/http.ts#L43)

Response headers, lower-cased keys.

***

### status

> `readonly` **status**: `number`

Defined in: [src/ports/http.ts:37](https://github.com/ripple/simpleXRPL/blob/97d2f39b8206ea726601258e09c68a8b23b57199/src/ports/http.ts#L37)

The HTTP status code.
