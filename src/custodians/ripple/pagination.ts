import { SimpleXRPLError } from '../../errors.js'
import type { CUSTODY_ROUTES } from '../../generated/custody-routes.js'
import type { operations } from '../../generated/custody.js'

import type { ResponseBody } from './api-call.js'

/**
 * One page of a Custody collection: its items, and the cursor to the next page.
 * Custody sends a literal `null` (or nothing, or `''`) for the cursor on the
 * last page.
 */
export interface CursorPage<Item> {
  readonly items: readonly Item[]
  readonly nextStartingAfter?: string | null
}

/** The item type of a cursor-paginated response (`never` if it isn't one). */
type PageItem<Res> = 'nextStartingAfter' extends keyof Res
  ? Res extends { items: ReadonlyArray<infer Item> }
    ? Item
    : never
  : never

/** A Custody operationId with both a route and typed schema. */
type OperationId = keyof typeof CUSTODY_ROUTES & keyof operations

/** Every Custody operationId whose response is a cursor-paginated collection. */
export type CustodyPaginatedOperationId = {
  [Op in OperationId]: [PageItem<ResponseBody<operations, Op>>] extends [never]
    ? never
    : Op
}[OperationId]

/** One item of a paginated operation's collection. */
export type CustodyPageItem<Op extends CustodyPaginatedOperationId> = PageItem<
  ResponseBody<operations, Op>
>

/**
 * Walk a cursor-paginated Custody collection, yielding every item in order.
 *
 * Lazy: a page is fetched only once the previous one's items are used up, so
 * breaking out of a `for await` stops the requests. An empty page with a cursor
 * is followed rather than taken as the end, since server-side filtering can
 * leave a page empty while later pages still match.
 *
 * @param fetchPage - Fetches one page, given the cursor (`undefined` first).
 * @param firstCursor - Resume after this cursor instead of from the start.
 * @yields Every item, across all pages.
 * @throws {@link SimpleXRPLError} if a page hands back the cursor that fetched
 *   it, which would otherwise repeat that page forever.
 */
export async function* paginate<Item>(
  fetchPage: (startingAfter: string | undefined) => Promise<CursorPage<Item>>,
  firstCursor?: string,
): AsyncGenerator<Item, void, undefined> {
  let cursor = firstCursor
  do {
    // Sequential by design: each page's cursor comes from the previous page.
    // eslint-disable-next-line no-await-in-loop -- Cursor pagination is inherently sequential.
    const page = await fetchPage(cursor)
    yield* page.items
    const next = page.nextStartingAfter ?? undefined
    if (next !== undefined && next !== '' && next === cursor) {
      throw new SimpleXRPLError(
        `Custody pagination stalled: the page after '${cursor}' pointed back to '${next}'`,
      )
    }
    cursor = next
  } while (cursor !== undefined && cursor !== '')
}

/**
 * Collect every item of a cursor-paginated Custody collection.
 *
 * @param fetchPage - Fetches one page, given the cursor (`undefined` first).
 * @returns All items, across all pages.
 */
export async function collectPages<Item>(
  fetchPage: (startingAfter: string | undefined) => Promise<CursorPage<Item>>,
): Promise<Item[]> {
  const all: Item[] = []
  for await (const item of paginate(fetchPage)) {
    all.push(item)
  }
  return all
}
