# simpleXRPL — Implementation Plan & Estimation

Epic: **DGE-7045**. Builds on the spike **DGE-7044** (in review). InfoSec review tracked as **DGE-7478**.

## Tickets (dependency order)

| ID       | Ticket                                                                                                                      | Effort (d) | Depends on                 | Phase |
| -------- | --------------------------------------------------------------------------------------------------------------------------- | :--------: | -------------------------- | ----- |
| DGE-7451 | Scaffold: TS dual ESM+CJS build, Jest unit/integration configs, CI, OpenAPI type-gen (Custody + Palisade)                   |    1.5     | —                          | 1     |
| DGE-7452 | Core types: `Custodian` iface, `Account`, `SignerCapabilities`, `AccountRef`, `SubmissionResult`, error classes, I/O ports  |    1.5     | DGE-7451                   | 1     |
| DGE-7453 | `SimpleXRPL.init` + client + account index + no-signer mode + `AmbiguousAccountError`                                       |     1      | DGE-7452                   | 1     |
| DGE-7454 | `LocalSigner` (wallets; fromSeed/Mnemonic/Env/create)                                                                       |     1      | DGE-7452                   | 2     |
| DGE-7455 | Pipeline spine (Build→Validate→Resolve→Dispatch→Sign+submit→Wait+Wrap) end-to-end for `XRP.transfer`                        |    2.5     | DGE-7453,DGE-7454          | 2     |
| DGE-7456 | Testnet harness (faucet funding, Live tier, `--runInBand`)                                                                  |    0.5     | DGE-7455                   | 2     |
| DGE-7457 | Amount & asset model (XRP/IOU/MPT representation + decimal/scale conversion)                                                |    1.5     | DGE-7455                   | 3     |
| DGE-7458 | `Token` vertical (MPT family + offers) on Local                                                                             |     2      | DGE-7457                   | 3     |
| DGE-7459 | `IOU` vertical + multi-step orchestrator + `MultiStepFailureError`                                                          |     2      | DGE-7457                   | 3     |
| DGE-7460 | `XRP` + `Credential` + `Domain` + `Account` verticals on Local                                                              |     2      | DGE-7457                   | 3     |
| DGE-7461 | Validate hardening: flag matrix, `customProperties` generator + golden tests, 100% dispatcher coverage                      |    1.5     | DGE-7458,DGE-7459,DGE-7460 | 3     |
| DGE-7462 | Custody auth (challenge→JWT, algo-detect, single-flight refresh, 401-retry, canonicalize + intent-signing) — _human review_ |     3      | DGE-7452                   | 4     |
| DGE-7463 | Custody account discovery + context resolution                                                                              |     1      | DGE-7462                   | 4     |
| DGE-7464 | Custody native intent mapping (`txToOperation`) + envelope + fee strategy + `customProperties`                              |    2.5     | DGE-7463,DGE-7458,DGE-7459 | 4     |
| DGE-7465 | RippleRaw path + `allowRawSigning` gating + dry-run Validate layer                                                          |     2      | DGE-7464                   | 4     |
| DGE-7466 | Governance observation + async (`intent.status/await`, `submitAsync`, `IntentPendingError`, `expiryAt`/`Expired`)           |    1.5     | DGE-7464                   | 4     |
| DGE-7467 | Custody contract tests vs sandbox                                                                                           |    1.5     | DGE-7464–DGE-7466          | 4     |
| DGE-7468 | Palisade auth (API key) + vault/wallet discovery + r-address resolution                                                     |     1      | DGE-7452                   | 5     |
| DGE-7469 | Palisade native `Submit*` mapping + raw path (`RawTransaction`/`SignPlaintext`)                                             |    2.5     | DGE-7468,DGE-7458,DGE-7459 | 5     |
| DGE-7470 | Palisade async/cancel + contract tests vs sandbox                                                                           |    1.5     | DGE-7469                   | 5     |
| DGE-7471 | Mixed-signer (per-account dispatch across custodians, cross-account flows)                                                  |     1      | DGE-7464,DGE-7469          | 6     |
| DGE-7472 | Idempotency (UUIDv7 ids, retry safety, multi-step resume)                                                                   |     1      | DGE-7464,DGE-7469          | 6     |
| DGE-7473 | Logging/redaction + secret-manager sourcing + security pass (§12)                                                           |     1      | DGE-7471,DGE-7472          | 6     |
| DGE-7474 | Docs: TypeDoc/`docgen`, getting-started guides, per-verb examples + CI smoke, mapping doc                                   |     2      | DGE-7471                   | 6     |
| DGE-7475 | Release prep (semver, dual-build verify, version pinning, GA checklist)                                                     |     1      | all                        | 6     |

**Total ≈ 39.5 engineer-days.**

## 2-engineer parallel timeline

**Engineer 1** = core + Local + Palisade-vertical track. **Engineer 2** = Custody-adapter + cross-cutting track. (1 day = 1 working day; ✓ = ticket complete.)

| Day | Task(s) / focus                                                   | Engineer 1                                                       | Engineer 2                                                |
| :-: | ----------------------------------------------------------------- | ---------------------------------------------------------------- | --------------------------------------------------------- |
|  1  | Foundation · _InfoSec design review starts (async, off the doc)_  | DGE-7451 — scaffold, dual build, Jest/CI                         | Pair on DGE-7451 + OpenAPI type-gen (Custody + Palisade)  |
|  2  | Foundation                                                        | DGE-7452 — core types, `Custodian` iface, ports, errors          | Type-gen + CI + test-harness scaffolding                  |
|  3  | Foundation / Custody auth                                         | DGE-7453 — `init` + client + account index                       | DGE-7462 — Custody auth (challenge→JWT) 1/3               |
|  4  | Foundation / Custody auth                                         | DGE-7454 — `LocalSigner`                                         | DGE-7462 — auth (signing + canonicalization) 2/3          |
|  5  | Pipeline / Custody auth                                           | DGE-7455 — pipeline spine 1/2                                    | DGE-7462 — auth 3/3 ✓                                     |
|  6  | Pipeline / Custody discovery · _InfoSec: auth code review begins_ | DGE-7455 — pipeline spine 2/2 ✓                                  | DGE-7463 — discovery/context + DGE-7456 testnet harness ✓ |
|  7  | Amount model / Palisade auth                                      | DGE-7457 — amount & asset model ✓                                | DGE-7468 — Palisade auth + discovery ✓                    |
|  8  | Local verticals                                                   | DGE-7458 — Token vertical 1/2                                    | DGE-7459 — IOU + multi-step 1/2                           |
|  9  | Local verticals                                                   | DGE-7458 — Token 2/2 ✓                                           | DGE-7459 — IOU + multi-step 2/2 ✓                         |
| 10  | Verticals / Custody mapping                                       | DGE-7460 — XRP/Credential/Domain/Account 1/2                     | DGE-7464 — Custody native mapping 1/2                     |
| 11  | Verticals / Custody mapping                                       | DGE-7460 — 2/2 ✓                                                 | DGE-7464 — native mapping 2/2 ✓                           |
| 12  | Hardening / RippleRaw · _InfoSec: raw-signing review_             | DGE-7461 — validate hardening (flags / golden / 100% dispatch) ✓ | DGE-7465 — RippleRaw + dry-run 1/2                        |
| 13  | Palisade native / RippleRaw                                       | DGE-7469 — Palisade native + raw 1/2                             | DGE-7465 — RippleRaw + dry-run 2/2 ✓                      |
| 14  | Palisade native / governance                                      | DGE-7469 — 2/2 ✓                                                 | DGE-7466 — governance / async ✓                           |
| 15  | Contract tests                                                    | DGE-7470 — Palisade async + contract tests ✓                     | DGE-7467 — Custody contract tests ✓                       |
| 16  | Mixed-signer / docs                                               | DGE-7474 — docs (TypeDoc, guides) 1/2                            | DGE-7471 — mixed-signer ✓                                 |
| 17  | Idempotency / docs · _InfoSec: idempotency review_                | DGE-7474 — docs + per-verb examples 2/2 ✓                        | DGE-7472 — idempotency ✓                                  |
| 18  | Hardening · _InfoSec: hardening review_                           | Buffer / examples-CI + help DGE-7473                             | DGE-7473 — logging/redaction/security ✓                   |
| 19  | Release · _InfoSec final sign-off_                                | DGE-7475 — release prep (shared)                                 | DGE-7475 — release prep (shared)                          |

~19 working days ≈ ~4 weeks raw; ~5 weeks with buffer + InfoSec remediation. Load: E1 ≈ 20.5 d, E2 ≈ 20 d.
