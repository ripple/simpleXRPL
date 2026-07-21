# Interface: HttpRequest

Defined in: [src/ports/http.ts:18](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L18)

A single HTTP request issued by a custodian adapter.

## Extends

- [`RequestConfig`](RequestConfig.md)

## Properties

### body?

> `readonly` `optional` **body**: `unknown`

Defined in: [src/ports/http.ts:29](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L29)

The request body, serialized by the implementation.

***

### headers?

> `readonly` `optional` **headers**: `Record`\<`string`, `string`\>

Defined in: [src/ports/http.ts:12](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L12)

Extra request headers.

#### Inherited from

[`RequestConfig`](RequestConfig.md).[`headers`](RequestConfig.md#headers)

***

### method

> `readonly` **method**: `"GET"` \| `"POST"` \| `"PUT"` \| `"PATCH"` \| `"DELETE"`

Defined in: [src/ports/http.ts:20](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L20)

The HTTP method.

***

### query?

> `readonly` `optional` **query**: `Record`\<`string`, `undefined` \| `string` \| `number` \| `boolean`\>

Defined in: [src/ports/http.ts:26](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L26)

Query-string parameters.

***

### signal?

> `readonly` `optional` **signal**: `AbortSignal`

Defined in: [src/ports/http.ts:9](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L9)

External abort signal.

#### Inherited from

[`RequestConfig`](RequestConfig.md).[`signal`](RequestConfig.md#signal)

***

### timeout?

> `readonly` `optional` **timeout**: `number`

Defined in: [src/ports/http.ts:6](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L6)

Abort the request after this many milliseconds.

#### Inherited from

[`RequestConfig`](RequestConfig.md).[`timeout`](RequestConfig.md#timeout)

***

### url

> `readonly` **url**: `string`

Defined in: [src/ports/http.ts:23](https://github.com/ripple/simpleXRPL/blob/e303b9ef881e97b383dabe0d848c44f29264c41d/src/ports/http.ts#L23)

The absolute request URL.
