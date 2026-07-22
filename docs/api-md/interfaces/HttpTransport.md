# Interface: HttpTransport

Defined in: [ports/http.ts:51](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/http.ts#L51)

The HTTP transport port custodian adapters depend on. Backed by a real client
in production and by in-memory fakes in tests, so adapter mapping and
orchestration are exercised offline.

## Properties

### request()

> `readonly` **request**: \<`T`\>(`req`) => `Promise`\<[`HttpResponse`](HttpResponse.md)\<`T`\>\>

Defined in: [ports/http.ts:53](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/http.ts#L53)

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
