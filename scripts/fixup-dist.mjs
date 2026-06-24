// Dual-build fixup: stamp a `type` marker into each output directory so Node's
// module resolver reads `dist/cjs` as CommonJS and `dist/esm` as ESM, regardless
// of the root package.json `"type": "module"`. Run after both `tsc` passes.
import { mkdirSync, writeFileSync } from 'node:fs'

const targets = [
  ['dist/cjs', { type: 'commonjs' }],
  ['dist/esm', { type: 'module' }],
]

for (const [dir, contents] of targets) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(`${dir}/package.json`, `${JSON.stringify(contents, null, 2)}\n`)
  console.log(`fixup: wrote ${dir}/package.json (${contents.type})`)
}
