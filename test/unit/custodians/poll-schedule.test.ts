import { pollDelayMs } from '../../../src/custodians/poll-schedule.js'

const SCHEDULE = { initialMs: 1500, maxMs: 30_000 }

describe('pollDelayMs', () => {
  it('starts at the initial delay and doubles', () => {
    expect(pollDelayMs(0, SCHEDULE)).toBe(1500)
    expect(pollDelayMs(1, SCHEDULE)).toBe(3000)
    expect(pollDelayMs(2, SCHEDULE)).toBe(6000)
    expect(pollDelayMs(3, SCHEDULE)).toBe(12_000)
    expect(pollDelayMs(4, SCHEDULE)).toBe(24_000)
  })

  it('holds at the ceiling instead of growing without bound', () => {
    expect(pollDelayMs(5, SCHEDULE)).toBe(30_000)
    expect(pollDelayMs(50, SCHEDULE)).toBe(30_000)
    // 2 ** 2000 overflows to Infinity; the clamp must still hold.
    expect(pollDelayMs(2000, SCHEDULE)).toBe(30_000)
  })

  it('keeps an hour-long wait to ~100 requests, not thousands', () => {
    // The reason this exists: a flat 1.5s interval over the hour a multi-step
    // step may wait costs ~2,400 requests per step, ~7,200 for a 3-step IOU
    // issuance — enough to read as abuse well before the caller's deadline.
    const budgetMs = 3_600_000
    let elapsed = 0
    let polls = 0
    while (elapsed < budgetMs) {
      elapsed += pollDelayMs(polls, SCHEDULE)
      polls += 1
    }
    expect(polls).toBeLessThan(150)
    expect(budgetMs / SCHEDULE.initialMs).toBeGreaterThan(2000)
  })

  it('stays responsive early, so a fast transaction is not delayed', () => {
    // The first four polls all land inside the first ~22 seconds.
    const firstFour = [0, 1, 2, 3].reduce(
      (total, attempt) => total + pollDelayMs(attempt, SCHEDULE),
      0,
    )
    expect(firstFour).toBeLessThanOrEqual(22_500)
  })
})
