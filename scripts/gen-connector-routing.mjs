// Generates the Connector Routing Table from the source of truth: each
// custodian's native-operation set and the transactors the verticals emit.
// Run with `npm run docgen:routing`. Reads source files directly (no build
// step) so the table can never drift from the code.
//
// Output: docs/connector-routing.md

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Extract the string members of a `new Set([...])` assigned to a named const.
 *
 * @param {string} file - Repo-relative path to the source file.
 * @param {string} constName - The exported const holding the Set.
 * @returns {string[]} The quoted string members, in source order.
 */
function readSetLiteral(file, constName) {
  const src = readFileSync(join(ROOT, file), 'utf8')
  const anchor = src.indexOf(constName)
  if (anchor === -1) throw new Error(`${constName} not found in ${file}`)
  const open = src.indexOf('new Set(', anchor)
  const start = src.indexOf('[', open)
  const end = src.indexOf(']', start)
  const body = src.slice(start + 1, end)
  return [...body.matchAll(/'([^']+)'/g)].map((m) => m[1])
}

/**
 * Collect the `TransactionType: 'X'` literals each vertical file emits.
 *
 * @returns {Map<string, Set<string>>} vertical file stem → transactor set.
 */
function verticalTransactors() {
  const dir = join(ROOT, 'src/verticals')
  // Skip barrels and pure type files; include `.helpers`/`.vertical` since
  // they also build transactions, merging them into their base vertical.
  const skip = /\.types\.ts$|^index\.ts$/u
  const out = new Map()
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.ts') || skip.test(name)) continue
    const src = readFileSync(join(dir, name), 'utf8')
    const found = [...src.matchAll(/TransactionType:\s*'([A-Za-z]+)'/g)].map(
      (m) => m[1],
    )
    if (found.length === 0) continue
    const base = name.replace(/\.(helpers|vertical)\.ts$|\.ts$/u, '')
    const set = out.get(base) ?? new Set()
    for (const t of found) set.add(t)
    out.set(base, set)
  }
  return out
}

const RIPPLE = new Set(
  readSetLiteral(
    'src/custodians/ripple/mapping/xrpl-operations.ts',
    'NATIVE_XRPL_TRANSACTORS',
  ),
)
const PALISADE = new Set(
  readSetLiteral(
    'src/custodians/palisade/mapping/submit-operations.ts',
    'PALISADE_NATIVE_TRANSACTORS',
  ),
)
const byVertical = verticalTransactors()

const universe = [
  ...new Set([
    ...RIPPLE,
    ...PALISADE,
    ...[...byVertical.values()].flatMap((s) => [...s]),
  ]),
].sort((a, b) => a.localeCompare(b))

// simpleXRPL write operations → the XRPL transactor(s) they emit, mirroring the
// "Underlying Transactor" column of the API Surface. A trailing `true` marks an
// operation that carries an MPT amount (see MPT_NATIVE below). Read operations
// emit no transactor and `Account.create` is local key generation — both omitted.
const OPERATIONS = [
  ['XRP.transfer', ['Payment']],
  ['IOU.issue', ['TrustSet', 'AccountSet']],
  ['IOU.authorize', ['TrustSet']],
  ['IOU.lock', ['TrustSet']],
  ['IOU.unlock', ['TrustSet']],
  ['IOU.clawback', ['Clawback']],
  ['IOU.transfer', ['Payment']],
  ['IOU.buyOffer', ['OfferCreate']],
  ['IOU.sellOffer', ['OfferCreate']],
  ['IOU.cancelOffer', ['OfferCancel']],
  ['Token.issue', ['MPTokenIssuanceCreate']],
  ['Token.authorize', ['MPTokenAuthorize']],
  ['Token.unauthorize', ['MPTokenAuthorize']],
  ['Token.grantHolder', ['MPTokenAuthorize']],
  ['Token.revokeHolder', ['MPTokenAuthorize']],
  ['Token.lock', ['MPTokenIssuanceSet']],
  ['Token.unlock', ['MPTokenIssuanceSet']],
  ['Token.destroy', ['MPTokenIssuanceDestroy']],
  ['Token.transfer', ['Payment'], true],
  ['Token.createOffer', ['OfferCreate']],
  ['Token.cancelOffer', ['OfferCancel']],
  ['Domain.create', ['PermissionedDomainSet']],
  ['Domain.setCredentials', ['PermissionedDomainSet']],
  ['Domain.delete', ['PermissionedDomainDelete']],
  ['Credential.issue', ['CredentialCreate']],
  ['Credential.accept', ['CredentialAccept']],
  ['Credential.delete', ['CredentialDelete']],
  ['Account.fund', ['Payment', 'AccountSet']],
  ['Account.activate', ['Payment', 'AccountSet']],
  ['Account.set', ['AccountSet']],
  ['Account.setRegularKey', ['SetRegularKey']],
  ['Account.depositPreauth', ['DepositPreauth']],
]

// Whether each custodian natively models MPT amounts. Palisade rejects every MPT
// field (src/custodians/palisade/mapping/currency.ts throws), so an MPT-carrying
// operation (Token.transfer) falls back to raw there even though `Payment` is
// otherwise native. Ripple Custody maps MPT natively (`MultiPurposeToken`).
const MPT_NATIVE = { ripple: true, palisade: false }

// Class name per vertical file stem (XRP/IOU are acronyms).
const CLASS_OF = { xrp: 'XRP', iou: 'IOU' }
const className = (stem) =>
  CLASS_OF[stem] ?? stem[0].toUpperCase() + stem.slice(1)
// Public class methods that are not ledger-writing operations. `Account.create`
// (local key generation) is skipped separately, since `Domain.create` IS a write.
const NON_OPERATIONS = new Set([
  'constructor',
  'retrieve',
  'list',
  'listOffers',
])

// Guard: keep the map honest against the code. (1) Every transactor must exist
// in the source-derived universe. (2) Every operation must be a real public
// method on its vertical, and every public write method must be listed — so a
// phantom or a newly-added-but-undocumented operation both throw.
const known = new Set(universe)
const mapped = new Set(OPERATIONS.map(([op]) => op))
for (const [operation, transactors] of OPERATIONS) {
  for (const transactor of transactors) {
    if (!known.has(transactor)) {
      throw new Error(
        `OPERATIONS lists \`${transactor}\` for ${operation}, but no source ` +
          `file emits it. Update the OPERATIONS map or the vertical.`,
      )
    }
  }
  const [prefix, method] = operation.split('.')
  const src = readFileSync(
    join(ROOT, `src/verticals/${prefix.toLowerCase()}.ts`),
    'utf8',
  )
  if (!new RegExp(`public (?:async )?${method}\\(`, 'u').test(src)) {
    throw new Error(
      `OPERATIONS lists ${operation}, but ${prefix.toLowerCase()}.ts has no ` +
        `such public method.`,
    )
  }
}
for (const name of readdirSync(join(ROOT, 'src/verticals'))) {
  const stem = /^([a-z]+)\.ts$/u.exec(name)?.[1]
  if (stem === undefined || stem === 'index') continue
  const prefix = className(stem)
  const src = readFileSync(join(ROOT, `src/verticals/${name}`), 'utf8')
  for (const [, method] of src.matchAll(/public (?:async )?([a-zA-Z]+)\(/gu)) {
    if (NON_OPERATIONS.has(method)) continue
    // Account.create is local key generation, not a ledger write.
    if (prefix === 'Account' && method === 'create') continue
    if (!mapped.has(`${prefix}.${method}`)) {
      throw new Error(
        `${prefix}.${method} is a public write method but is missing from the ` +
          `OPERATIONS map — add it (with its transactor) to keep the doc complete.`,
      )
    }
  }
}

/**
 * The routing cell for one custodian and transactor.
 *
 * @param {Set<string>} nativeSet - That custodian's native-ops set.
 * @param {string} transactor - The XRPL transactor type.
 * @returns {string} The rendered routing cell.
 */
function cell(nativeSet, transactor) {
  return nativeSet.has(transactor) ? '**native**' : 'raw fallback¹'
}

const rows = universe
  .map(
    (t) =>
      `| \`${t}\` | signs locally | ${cell(RIPPLE, t)} | ${cell(PALISADE, t)} |`,
  )
  .join('\n')

/**
 * The support cell for one custodian and an operation. Native only when EVERY
 * transactor it emits is native (a multi-step operation routes each step
 * independently) AND, if it carries an MPT amount, that custodian supports MPT.
 *
 * @param {Set<string>} nativeSet - That custodian's native-ops set.
 * @param {boolean} mptNative - Whether the custodian supports MPT amounts.
 * @param {string[]} transactors - The transactors the operation emits.
 * @param {boolean} carriesMpt - Whether the operation carries an MPT amount.
 * @returns {string} The rendered support cell.
 */
function opCell(nativeSet, mptNative, transactors, carriesMpt) {
  const allNative = transactors.every((t) => nativeSet.has(t))
  return allNative && (!carriesMpt || mptNative)
    ? '**native**'
    : 'raw fallback¹'
}

const operationRows = OPERATIONS.map(
  ([operation, transactors, carriesMpt = false]) =>
    `| \`${operation}()\` | ${transactors
      .map((t) => `\`${t}\``)
      .join(', ')} | ${opCell(
      RIPPLE,
      MPT_NATIVE.ripple,
      transactors,
      carriesMpt,
    )} | ${opCell(PALISADE, MPT_NATIVE.palisade, transactors, carriesMpt)} |`,
).join('\n')

const verticalRows = [...byVertical.entries()]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(
    ([vertical, set]) =>
      `| \`${vertical}\` | ${[...set]
        .sort((a, b) => a.localeCompare(b))
        .map((t) => `\`${t}\``)
        .join(', ')} |`,
  )
  .join('\n')

const md = `# Connector Routing Table

<!-- GENERATED by scripts/gen-connector-routing.mjs — do not edit by hand.
     Regenerate with \`npm run docgen:routing\`. -->

How simpleXRPL dispatches each XRPL transactor per connector. Derived directly
from each custodian's native-operation set and the transactors the verticals
build, so it always matches the code.

## Transactor → connector path

The pipeline routes by transactor type: **Local** signs everything in-process;
a custodian uses its **native** operation when the transactor is in its
capability set, otherwise the **raw** sign-only fallback, otherwise the write
is rejected.

| Transactor | Local | Ripple Custody | Palisade |
| ------ | ------ | ------ | ------ |
${rows}

¹ **raw fallback** applies only when raw signing is enabled on that custodian
(\`allowRawSigning\`). With raw signing disabled, a non-native transactor is
rejected with \`SignerCapabilityError\` — use a Local account or a custodian
that natively supports it. The raw path signs the encoded transaction and
submits it through the shared XRPL connection.

## Vertical → transactors

Which XRPL transactors each vertical builds. Cross-reference with the table
above to see how a given method routes on each connector.

| Vertical | Transactors emitted |
| ------ | ------ |
${verticalRows}

## Operation → native support

Each simpleXRPL write operation, the XRPL transactor(s) it emits, and whether
that operation is **native** on each custodian (all its transactors are in the
custodian's native-ops set) or falls back to **raw** signing. Local signs every
operation in-process. Read operations emit no transactor and are omitted.

| Operation | Transactor(s) | Ripple Custody | Palisade |
| ------ | ------ | ------ | ------ |
${operationRows}

¹ **raw fallback** applies only when raw signing is enabled on that custodian
(\`allowRawSigning\`); otherwise the operation is rejected with
\`SignerCapabilityError\`. A multi-transactor operation (e.g. \`IOU.issue\`) is
native only when every step is native. **Palisade has no native MPT support**,
so \`Token.transfer\` — which carries an MPT amount — falls back to raw there
even though \`Payment\` is otherwise native; Ripple Custody handles MPT natively.
\`Token.createOffer\` / \`Token.cancelOffer\` stay **native** on Palisade because
they don't carry an MPT — an offer can't hold an MPT (it isn't DEX-tradeable),
so they operate on XRP/IOU legs via \`OfferCreate\` / \`OfferCancel\`.

---

_Native-ops sets: \`NATIVE_XRPL_TRANSACTORS\` (Ripple Custody),
\`PALISADE_NATIVE_TRANSACTORS\` (Palisade). Local signs all transactors._
`

mkdirSync(join(ROOT, 'docs'), { recursive: true })
writeFileSync(join(ROOT, 'docs/connector-routing.md'), md)
console.log(
  `connector-routing.md: ${universe.length} transactors, ` +
    `${byVertical.size} verticals`,
)
