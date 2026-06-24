// Live tier (testnet) integration suite. Real end-to-end verb coverage lands
// later; this placeholder keeps the integration config wired and green so CI
// exercises the `--runInBand` path from day one.
import { VERSION } from '../../src/index.js'

describe('integration scaffold', () => {
  it('loads the built package surface', () => {
    expect(VERSION).toBeDefined()
  })
})
