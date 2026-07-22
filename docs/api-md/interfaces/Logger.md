# Interface: Logger

Defined in: [ports/logger.ts:10](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/logger.ts#L10)

Structured logger interface used across the SDK. Implementations receive the
redaction list below so known-sensitive fields never reach log output.

## Properties

### debug()

> `readonly` **debug**: (`message`, `fields`?) => `void`

Defined in: [ports/logger.ts:12](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/logger.ts#L12)

Log at debug level.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `fields`? | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### error()

> `readonly` **error**: (`message`, `fields`?) => `void`

Defined in: [ports/logger.ts:21](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/logger.ts#L21)

Log at error level.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `fields`? | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### info()

> `readonly` **info**: (`message`, `fields`?) => `void`

Defined in: [ports/logger.ts:15](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/logger.ts#L15)

Log at info level.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `fields`? | `Record`\<`string`, `unknown`\> |

#### Returns

`void`

***

### warn()

> `readonly` **warn**: (`message`, `fields`?) => `void`

Defined in: [ports/logger.ts:18](https://github.com/ripple/simpleXRPL/blob/bbdadc487c293be68597bc186ee6ad3a108d3261/src/ports/logger.ts#L18)

Log at warn level.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `fields`? | `Record`\<`string`, `unknown`\> |

#### Returns

`void`
