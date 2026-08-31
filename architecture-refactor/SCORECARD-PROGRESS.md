# Scorecard progress — live

Updated as each lane reports **and is independently verified**. A row moves to DONE only
when its evidence was reproduced here, not when a lane claimed it.

Legend: `[x]` verified done · `[~]` lane running · `[ ]` not started · `[!]` operator-blocked

## Partially completed

| # | Area | Item | State | Evidence / lane |
|---|---|---|---|---|
| 1 | Organization | Actor contraction (readers + contract migrations) | `[~]` | A1. Expand half DONE: 0745 applied, both FKs `convalidated=true`, `ON DELETE SET NULL` scoped to the new column |
| 2 | Organization | Schema cleanup | `[~]` | A1 |
| 3 | Home | Live P95 / read-budget evidence | `[~]` | A2. Existing read-cost guard covers 2 of 3,385 routes |
| 4 | Home | Calendar privacy proof | `[~]` | A11 |
| 5 | Payroll | Large-service decomposition | `[~]` | A3 |
| 6 | Payroll | Final pagination audit | `[~]` | A3. 10 endpoints done, capped 100, `LIMIT` in-query; 87 suites / 738 tests |
| 7 | Accounting | Async expense export | `[~]` | A5 |
| 8 | Accounting | Retention proof | `[~]` | A5 |
| 9 | Accounting | Reminder measurement | `[~]` | A6 |
| 10 | Accounting | Event-consumer decision | `[~]` | A6 |
| 11 | Chat | Legacy actor contraction | `[~]` | A8 |
| 12 | Chat | Reaction normalization | `[~]` | A8 |
| 13 | Chat | Hook-level mutation gates | `[~]` | A8 |
| 14 | Calendar | Actor cutover | `[~]` | A11 |
| 15 | Calendar | Reminder cancellation guarantees | `[~]` | A11 |
| 16 | Calendar | Export bounds | `[~]` | A11 |
| 17 | KB | Ingestion evidence | `[~]` | A13 |
| 18 | KB | Revisions | `[~]` | A13 |
| 19 | KB | Performance evidence | `[~]` | A13 |
| 20 | KB | Lifecycle evidence | `[x]` | ACL reindex bulk + chunk purge moved inside `softDelete` tx; 2 new bite-proven specs; 21 tests / 6 suites |
| 21 | Inbox | Unified cross-domain contract | `[~]` | A15 |
| 22 | OpenAPI | Final operation coverage | `[~]` | A16. Error shapes 100%, response schemas 100%, mutating bodies ~85% |
| 23 | OpenAPI | Parameter-contract reconciliation | `[~]` | A16 |

## Still not completed

| # | Item | State | Evidence / lane |
|---|---|---|---|
| 24 | Independent production cells | `[~]` | A19 (code-side); infra provisioning stays operator |
| 25 | Physical read-replica validation | `[!]` | Scripts exist and self-test bites; `DB_REPLICA_URL` unset, Neon replica not provisioned |
| 26 | PITR restore drill | `[~]` | A17 |
| 27 | Production-shaped load / 40% headroom | `[!]` | `cell:load` asserts the floor and its self-test proves a 39% case FAILS; needs a colocated run — current numbers carry an 80ms public-internet floor |
| 28 | Per-cell cost measurement | `[x]` partial | AI spend per org verified live: 400 rows, `lifetime_consumed` 500000, 0 rows cross-tenant. Non-AI (DB time, Redis, egress) is not instrumentable in-app — operator capture path specified |
| 29 | Live alert delivery + acknowledgement | `[~]` | A18. `ALERT_WEBHOOK_URL` unset everywhere |
| 30 | Operator-access approval | `[~]` | A18. `0734_operator_access_grants` applied |
| 31 | Export / erasure / legal-hold drills | `[~]` | A17 |
| 32 | Final independent audit of every PRD row | `[ ]` | Runs last, after every lane reports |

## Landed this session (verified here, not taken on report)

- **Boot was broken and every gate was green.** `CrmBriefService` had an injected parameter typed `unknown` — no DI token, so Nest could not start. `tsc` accepts it, ts-jest and SWC are transpile-only, and `check:module-di` only compared exports to providers.
- **`check:module-di` rebuilt** into a real constructor-resolvability gate (undeclared token · non-injectable type · `import type` on an injected class). Proven by reintroducing the actual defect: it flags, exit 1. 1,549 classes checked. Open: 88 classes still unchecked.
- **The full suite is 1,367 suites / 11,674 tests**, and it was red — 20 suites / 66 tests. Earlier sessions reported green from path-filtered runs. 19 of 20 repaired so far.
- **Migrations 0745 + 0746** applied and verified in `pg_catalog`. 0745 arrived with an unscoped composite `ON DELETE SET NULL` that would have failed `23502` on any member deletion; 0746 arrived with `CONCURRENTLY` (rejected inside `db:migrate`'s transaction) and **no journal entry at all** — absent, it never applies while printing success.
- **5 false `@BodylessAction()` marks** removed from handlers that do read a body, including two on a public endpoint.
- **Cache**: three keys were read and invalidated under different names; one key omitted the filter discriminators.
