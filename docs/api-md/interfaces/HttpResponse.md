# Interface: HttpResponse\<T\>

Defined in: [src/ports/http.ts:35](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L35)

A parsed HTTP response.

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

### data

> `readonly` **data**: `T`

Defined in: [src/ports/http.ts:40](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L40)

The parsed response body.

***

### headers

> `readonly` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/ports/http.ts:43](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L43)

Response headers, lower-cased keys.

***

### status

> `readonly` **status**: `number`

Defined in: [src/ports/http.ts:37](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L37)

The HTTP status code.
