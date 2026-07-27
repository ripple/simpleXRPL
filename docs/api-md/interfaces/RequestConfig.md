# Interface: RequestConfig

Defined in: [ports/http.ts:4](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/http.ts#L4)

Common per-request options for the HTTP transport.

## Extended by

- [`HttpRequest`](HttpRequest.md)

## Properties

### headers?

> `readonly` `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [ports/http.ts:12](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/http.ts#L12)

Extra request headers.

***

### signal?

> `readonly` `optional` **signal**: `AbortSignal`

Defined in: [ports/http.ts:9](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/http.ts#L9)

External abort signal.

***

### timeout?

> `readonly` `optional` **timeout**: `number`

Defined in: [ports/http.ts:6](https://github.com/ripple/simpleXRPL/blob/0609f879e05ccf687564ae843137111d9fc00580/src/ports/http.ts#L6)

Abort the request after this many milliseconds.
