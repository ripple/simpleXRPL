import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, it } from 'node:test'

import { compressVersions } from './custody-availability.mjs'
import {
  loadCustodySpecs,
  normalizeInstanceDocument,
  sameInstanceDocument,
} from './custody-specs.mjs'

const doc = (version) =>
  JSON.stringify({
    openapi: '3.0.1',
    info: { 'x-app-version': version },
    paths: {},
  })

describe('loadCustodySpecs', () => {
  let root
  const put = (path, content = doc('1.43')) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), content)
  }
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'custody-specs-'))
    put('openapi/custody/official/public.json')
    put('openapi/custody/capabilities.json', '{}')
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it('tags each spec with its channel, surface and build', () => {
    put('openapi/custody/official/internal.json')
    put('openapi/custody/devbox/cmpt/public.json', doc('1.36.2'))
    const tags = loadCustodySpecs(root).map(
      ({ channel, surface, build, appVersion }) => ({
        channel,
        surface,
        build,
        appVersion,
      }),
    )
    assert.deepEqual(tags, [
      {
        channel: 'devbox',
        surface: 'public',
        build: 'cmpt',
        appVersion: '1.36.2',
      },
      {
        channel: 'official',
        surface: 'internal',
        build: undefined,
        appVersion: '1.43',
      },
      {
        channel: 'official',
        surface: 'public',
        build: undefined,
        appVersion: '1.43',
      },
    ])
  })

  it('rejects anything outside the layout', () => {
    for (const stray of [
      'openapi/custody/stray.json',
      'openapi/custody/official/openapi-1-44.json',
      'openapi/custody/devbox/Bad_Name/public.json',
      'openapi/custody/devbox/cmpt/nested/public.json',
    ]) {
      put(stray)
      assert.throws(
        () => loadCustodySpecs(root),
        /See openapi\/README.md/u,
        stray,
      )
      rmSync(join(root, stray), { recursive: true })
      rmSync(join(root, 'openapi/custody/devbox'), {
        recursive: true,
        force: true,
      })
    }
  })

  it('requires the official public spec and an x-app-version', () => {
    put('openapi/custody/official/internal.json', JSON.stringify({ info: {} }))
    assert.throws(() => loadCustodySpecs(root), /no info.x-app-version/u)
    rmSync(join(root, 'openapi/custody/official'), { recursive: true })
    mkdirSync(join(root, 'openapi/custody/official'))
    assert.throws(() => loadCustodySpecs(root), /public.json is missing/u)
  })
})

describe('instance document normalization', () => {
  const served = {
    tags: [{ name: 'Vaults', description: 'x' }, { name: 'Accounts' }],
    paths: { '/b': { get: {} }, '/a': { post: {}, get: {} } },
    info: { 'x-app-version': '1.43.4' },
  }

  it('sorts object keys and tags, keeping content', () => {
    const normalized = normalizeInstanceDocument(served)
    assert.deepEqual(Object.keys(normalized), ['info', 'paths', 'tags'])
    assert.deepEqual(Object.keys(normalized.paths), ['/a', '/b'])
    assert.deepEqual(Object.keys(normalized.paths['/a']), ['get', 'post'])
    assert.deepEqual(
      normalized.tags.map((tag) => tag.name),
      ['Accounts', 'Vaults'],
    )
  })

  it('treats documents differing only in order or tag metadata as the same', () => {
    const reordered = {
      info: served.info,
      paths: { '/a': { get: {}, post: {} }, '/b': { get: {} } },
      tags: [{ name: 'Vaults' }],
    }
    assert.ok(sameInstanceDocument(served, reordered))
    assert.ok(
      !sameInstanceDocument(served, {
        ...reordered,
        paths: { '/a': { get: {} } },
      }),
    )
  })
})

describe('compressVersions', () => {
  it('collapses consecutive known versions into ranges', () => {
    const ordered = ['1.15', '1.16', '1.17', '1.18', '1.19']
    assert.equal(
      compressVersions(new Set(['1.15', '1.16', '1.18']), ordered),
      '1.15–1.16, 1.18',
    )
    assert.equal(compressVersions(new Set(ordered), ordered), '1.15–1.19')
    assert.equal(compressVersions(new Set(), ordered), '')
  })
})
