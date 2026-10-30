import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { mergeSurface } from './custody-merge.mjs'

/** A tagged spec, as loadCustodySpecs returns it. */
function spec(channel, appVersion, doc, build) {
  return {
    channel,
    build,
    surface: 'public',
    appVersion,
    path: '',
    doc: { openapi: '3.0.1', info: { 'x-app-version': appVersion }, ...doc },
  }
}

const OFFICIAL = spec('official', '1.43', {
  paths: {
    '/v1/me': { get: { operationId: 'getMe' } },
    '/v1/intents': { post: { operationId: 'createIntent' } },
  },
  components: {
    schemas: {
      Op: {
        oneOf: [{ $ref: '#/components/schemas/Op_Payment' }],
        discriminator: {
          propertyName: 'type',
          mapping: { Payment: '#/components/schemas/Op_Payment' },
        },
      },
      Op_Payment: {
        required: ['type', 'amount'],
        properties: { type: { type: 'string' }, amount: { type: 'string' } },
      },
      Status: { type: 'string', enum: ['Open', 'Closed'] },
    },
  },
})

const DEVBOX = spec(
  'devbox',
  '1.36.2',
  {
    paths: {
      '/v1/me': { get: { operationId: 'getMe', summary: 'older' } },
      '/v1/intents': { get: { operationId: 'listIntents' } },
      '//v1/compute': { post: { operationId: 'compute' } },
      '/v1/legacy/me': { get: { operationId: 'getMe' } },
    },
    components: {
      schemas: {
        Op: {
          oneOf: [
            { $ref: '#/components/schemas/Op_Payment' },
            { $ref: '#/components/schemas/Op_Batch' },
          ],
          discriminator: {
            propertyName: 'type',
            mapping: {
              Payment: '#/components/schemas/Op_Payment',
              Batch: '#/components/schemas/Op_Batch',
            },
          },
        },
        Op_Batch: { properties: { type: { type: 'string' } } },
        Op_Payment: {
          required: ['type', 'amount', 'mutableFlags'],
          properties: {
            type: { type: 'string' },
            amount: { type: 'integer' },
            mutableFlags: { type: 'array' },
          },
        },
        Status: { type: 'string', enum: ['Open', 'Draft'] },
      },
    },
  },
  'cmpt',
)

describe('mergeSurface', () => {
  const { doc, report } = mergeSurface([DEVBOX, OFFICIAL])
  const schemas = doc.components.schemas

  it('keeps the official spec as the base, untouched where both define it', () => {
    assert.equal(doc.info['x-app-version'], '1.43')
    assert.deepEqual(doc.paths['/v1/me'].get, { operationId: 'getMe' })
    assert.deepEqual(schemas.Op_Payment.properties.amount, { type: 'string' })
    assert.equal(report.base, 'official 1.43')
  })

  it('adds devbox paths, operations and schemas', () => {
    assert.ok(doc.paths['/v1/intents'].get, 'operation on an official path')
    assert.ok(doc.paths['/v1/compute'].post, 'doubled slash normalized')
    assert.ok(schemas.Op_Batch)
  })

  it('extends shared unions and enums', () => {
    assert.equal(schemas.Op.oneOf.length, 2)
    assert.equal(
      schemas.Op.discriminator.mapping.Batch,
      '#/components/schemas/Op_Batch',
    )
    assert.deepEqual(schemas.Status.enum, ['Open', 'Closed', 'Draft'])
  })

  it('adds devbox properties as optional, never touching `required`', () => {
    assert.ok(schemas.Op_Payment.properties.mutableFlags)
    assert.deepEqual(schemas.Op_Payment.required, ['type', 'amount'])
  })

  it('drops an added operationId that is already taken, and reports it', () => {
    assert.equal(doc.paths['/v1/legacy/me'].get.operationId, undefined)
    assert.deepEqual(report.droppedOperationIds, ['getMe (GET /v1/legacy/me)'])
  })

  it('does not modify its inputs', () => {
    assert.equal(OFFICIAL.doc.components.schemas.Op.oneOf.length, 1)
    assert.equal(OFFICIAL.doc.paths['/v1/intents'].get, undefined)
  })

  it('uses the newest devbox build as the base when no official spec exists', () => {
    const older = spec(
      'devbox',
      '1.30.0',
      { paths: { '/a': { get: {} } } },
      'a',
    )
    const newer = spec(
      'devbox',
      '1.36.2',
      { paths: { '/b': { get: {} } } },
      'b',
    )
    const merged = mergeSurface([older, newer])
    assert.equal(merged.report.base, 'devbox b 1.36.2')
    assert.deepEqual(Object.keys(merged.doc.paths), ['/b', '/a'])
  })

  it('rejects two official specs for one surface, and an empty input', () => {
    assert.throws(
      () => mergeSurface([OFFICIAL, OFFICIAL]),
      /Only one official/u,
    )
    assert.throws(() => mergeSurface([]), /No specs/u)
  })
})
