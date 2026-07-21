# Interface: HttpTransport

Defined in: [src/ports/http.ts:51](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/ports/http.ts#L51)

The HTTP transport port custodian adapters depend on. Backed by a real client
in production and by in-memory fakes in tests, so adapter mapping and
orchestration are exercised offline.

## Properties

### request()

> `readonly` **request**: \<`T`\>(`req`) => `Promise`\<[`HttpResponse`](HttpResponse.md)\<`T`\>\>

Defined in: [src/ports/http.ts:53](https://github.com/ripple/simpleXRPL/blob/bfe89ecb7cd8ddb36efb9e36e9918f11957e1898/src/ports/http.ts#L53)

Issue a request and resolve with the typed response.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`HttpRequest`](HttpRequest.md) |

#### Returns

`Promise`\<[`HttpResponse`](HttpResponse.md)\<`T`\>\>
