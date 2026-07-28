# Interface: HttpTransport

Defined in: [ports/http.ts:51](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/ports/http.ts#L51)

The HTTP transport port custodian adapters depend on. Backed by a real client
in production and by in-memory fakes in tests, so adapter mapping and
orchestration are exercised offline.

## Properties

### request()

> `readonly` **request**: \<`T`\>(`req`) => `Promise`\<[`HttpResponse`](HttpResponse.md)\<`T`\>\>

Defined in: [ports/http.ts:53](https://github.com/ripple/simpleXRPL/blob/8629f04f582da783f29526205caf1624754edd0d/src/ports/http.ts#L53)

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
