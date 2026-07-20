import { toDestination } from '../../../src/custodians/ripple/mapping/destination.js'

describe('toDestination', () => {
  it('wraps an r-address as an Address-typed destination', () => {
    expect(toDestination('rDest')).toEqual({
      address: 'rDest',
      type: 'Address',
    })
  })
})
