// Load `.env` for the live tiers (integration + contract), so the same suites
// run locally and in CI without a wrapper.
//
// `dotenv` never overwrites a variable that is already set, so CI wins: the
// `contract-tests` job injects GitHub secrets into the process environment and
// this file is a no-op there (no `.env` is checked out). Locally it fills the
// same variables from `.env`, which is git-ignored.
//
// Deliberately NOT wired into the unit tier: those tests must stay offline and
// independent of developer environment, and some of them assert on the absence
// of `fromEnv` variables.
require('dotenv').config({ quiet: true })
