// The capability extractor that builds the bundled data (scripts/lib) and the
// one the SDK runs against a live document (src/) must agree, or a pinned
// version and a detected one would judge the same instance differently. This
// compares them on every vendored spec — official and devbox, public and
// internal — plus the endpoint normalization both sides key on.
//
// Runs under `node --import tsx --test`, which is what lets a .mjs test import
// the TypeScript runtime module.

import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'

import {
  endpointKey as runtimeEndpointKey,
  extractCapabilityLists,
} from '../../src/custodians/ripple/versioning/capabilities.ts'

import { endpointKey as scriptEndpointKey } from './custody-availability.mjs'
import { extractCapabilities } from './custody-docs.mjs'
import { loadCustodySpecs } from './custody-specs.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

describe('capability extraction parity', () => {
  for (const spec of loadCustodySpecs(ROOT)) {
    it(`agrees on ${spec.path}`, () => {
      const fromScript = extractCapabilities(spec.doc)
      const fromRuntime = extractCapabilityLists(spec.doc)
      assert.deepEqual(fromRuntime.endpoints, fromScript.endpoints)
      assert.deepEqual(fromRuntime.xrplOperations, fromScript.xrplOperations)
      assert.deepEqual(fromRuntime.intentTypes, fromScript.intentTypes)
      assert.ok(fromRuntime.endpoints.length > 0, 'extracted something')
    })
  }

  it('normalizes endpoints identically', () => {
    for (const [method, path] of [
      ['get', '/v1/domains/{domainId}/accounts/{accountId}'],
      ['GET', '//v1/health'],
      ['post', '/v1/domain/{id}/account/{entityId}/sponsored-accounts'],
      ['DELETE', '/internal/v1/users/{userId}'],
    ]) {
      assert.equal(
        runtimeEndpointKey(method, path),
        scriptEndpointKey(method, path),
      )
    }
  })
})
