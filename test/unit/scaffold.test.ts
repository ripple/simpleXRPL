import { VERSION } from '../../src/index.js'

describe('scaffold', () => {
  it('exposes a package version', () => {
    expect(typeof VERSION).toBe('string')
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+/u)
  })
})
