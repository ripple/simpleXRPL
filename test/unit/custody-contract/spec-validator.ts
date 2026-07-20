import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import Ajv from 'ajv'
import type { ValidateFunction } from 'ajv'

/**
 * The pinned Custody OpenAPI spec — the same document `npm run typegen`
 * derives the generated types from. Validating built request bodies against it
 * at runtime complements the compile-time type check: a shape the SDK emits
 * that the spec would reject shows up here, and bumping the pinned spec version
 * re-runs this suite against the new contract.
 */
const SPEC_PATH = join(process.cwd(), 'openapi', 'custody-v1.35-openapi.json')

/**
 * Build the shared validator, with the whole spec registered so `$ref`s into
 * `#/components/schemas` resolve. Unknown OpenAPI formats (`int64`, `base64`,
 * …) are ignored rather than failing compilation; standard formats (`uuid`,
 * `date-time`) are still enforced.
 *
 * @returns The configured Ajv instance.
 */
function loadAjv(): Ajv.Ajv {
  const spec: object = JSON.parse(readFileSync(SPEC_PATH, 'utf8'))
  const ajv = new Ajv({
    allErrors: true,
    unknownFormats: 'ignore',
    logger: false,
  })
  ajv.addSchema(spec, 'custody')
  return ajv
}

const ajv = loadAjv()
const validators = new Map<string, ValidateFunction>()

/**
 * Compile (once per name) a validator for a `components/schemas` entry.
 *
 * @param schemaName - The schema name, e.g. `Core_ProposeIntentBody`.
 * @returns The compiled validator.
 */
function validatorFor(schemaName: string): ValidateFunction {
  const cached = validators.get(schemaName)
  if (cached !== undefined) {
    return cached
  }
  const validate = ajv.compile({
    $ref: `custody#/components/schemas/${schemaName}`,
  })
  validators.set(schemaName, validate)
  return validate
}

/**
 * The outcome of validating a value against a spec schema: whether it conforms
 * (`valid`), plus any human-readable `errors` (empty when valid).
 */
export interface SpecValidation {
  readonly valid: boolean
  readonly errors: readonly string[]
}

/**
 * Validate a value against a named Custody spec schema. The value is
 * round-tripped through JSON first, so it is checked in exactly the shape that
 * goes on the wire (dropping `undefined`-valued optional fields, as
 * `JSON.stringify` does before the POST).
 *
 * @param schemaName - The `components/schemas` entry to validate against.
 * @param value - The value to validate (typically a built request body).
 * @returns Whether it conforms, plus any errors.
 */
export function validateAgainstSpec(
  schemaName: string,
  value: unknown,
): SpecValidation {
  const validate = validatorFor(schemaName)
  const wire: unknown = JSON.parse(JSON.stringify(value))
  const valid = validate(wire) === true
  const errors = (validate.errors ?? []).map((error) =>
    `${error.dataPath} ${error.message ?? ''}`.trim(),
  )
  return { valid, errors }
}
