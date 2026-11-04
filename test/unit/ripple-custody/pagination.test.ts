import {
  collectPages,
  paginate,
} from '../../../src/custodians/ripple/pagination.js'
import type { CursorPage } from '../../../src/custodians/ripple/pagination.js'
import { SimpleXRPLError } from '../../../src/errors.js'

/**
 * A page of `items` whose cursor is `next`.
 *
 * @param items - The page's items.
 * @param next - The cursor to the next page.
 * @returns The page.
 */
function page<Item>(items: Item[], next?: string | null): CursorPage<Item> {
  return { items, nextStartingAfter: next }
}

/**
 * A `fetchPage` over fixed pages, cursored by index, recording each cursor.
 *
 * @param pages - The pages, in order.
 * @returns The fetcher and the cursors it received.
 */
function pagesOf<Item>(pages: Array<CursorPage<Item>>): {
  fetchPage: jest.Mock<Promise<CursorPage<Item>>, [string | undefined]>
  cursors: Array<string | undefined>
} {
  const cursors: Array<string | undefined> = []
  const fetchPage = jest.fn(async (startingAfter: string | undefined) => {
    cursors.push(startingAfter)
    const index = startingAfter === undefined ? 0 : Number(startingAfter)
    if (index >= pages.length) {
      throw new Error(`no page after ${String(startingAfter)}`)
    }
    return pages[index]
  })
  return { fetchPage, cursors }
}

/**
 * Drain an async iterable into an array.
 *
 * @param items - The iterable.
 * @returns Its items.
 */
async function drain<Item>(items: AsyncIterable<Item>): Promise<Item[]> {
  const all: Item[] = []
  for await (const item of items) {
    all.push(item)
  }
  return all
}

describe('paginate', () => {
  it('yields every item across pages, in order', async () => {
    const { fetchPage, cursors } = pagesOf([
      page(['a', 'b'], '1'),
      page(['c', 'd'], '2'),
      page(['e']),
    ])

    expect(await drain(paginate(fetchPage))).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect(cursors).toEqual([undefined, '1', '2'])
  })

  it.each([
    ['no cursor', undefined],
    ['a null cursor', null],
    ['an empty cursor', ''],
  ])('stops at a page with %s', async (_case, next) => {
    const { fetchPage } = pagesOf([page(['only'], next)])

    expect(await drain(paginate(fetchPage))).toEqual(['only'])
    expect(fetchPage).toHaveBeenCalledTimes(1)
  })

  it('yields nothing for an empty collection', async () => {
    const { fetchPage } = pagesOf([page([])])

    expect(await drain(paginate(fetchPage))).toEqual([])
  })

  it('follows the cursor past an empty page', async () => {
    const { fetchPage } = pagesOf([
      page(['a'], '1'),
      page([], '2'),
      page(['c']),
    ])

    expect(await drain(paginate(fetchPage))).toEqual(['a', 'c'])
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('resumes after a given cursor', async () => {
    const { fetchPage, cursors } = pagesOf([page(['a'], '1'), page(['b'])])

    expect(await drain(paginate(fetchPage, '1'))).toEqual(['b'])
    expect(cursors).toEqual(['1'])
  })

  it('throws when the cursor does not advance', async () => {
    const fetchPage = jest.fn(async (startingAfter: string | undefined) =>
      page([startingAfter ?? 'a'], 'stuck'),
    )

    const drained = drain(paginate(fetchPage))

    await expect(drained).rejects.toThrow(SimpleXRPLError)
    await expect(drained).rejects.toThrow(/pagination stalled/u)
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('fetches the next page only once the current one is used up', async () => {
    const { fetchPage } = pagesOf([page(['a', 'b'], '1'), page(['c'])])
    const iterator = paginate(fetchPage)

    await iterator.next()
    await iterator.next()
    expect(fetchPage).toHaveBeenCalledTimes(1)
    await iterator.next()
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('stops requesting after an early break', async () => {
    const { fetchPage } = pagesOf([page(['a', 'b'], '1'), page(['c'])])

    for await (const item of paginate(fetchPage)) {
      if (item === 'a') {
        break
      }
    }

    expect(fetchPage).toHaveBeenCalledTimes(1)
  })
})

describe('collectPages', () => {
  it('collects every item', async () => {
    const { fetchPage } = pagesOf([page([1, 2], '1'), page([3])])

    expect(await collectPages(fetchPage)).toEqual([1, 2, 3])
  })
})
