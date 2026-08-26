# 03 — A list total costs no extra round trip

**What to build:** A list page that shows a total renders after one round trip instead of two. Today 241 count queries run as a separate sequential await after the page query.

**Blocked by:** None — can start immediately

**Status:** in-progress

## Acceptance criteria

- [x] Where a total is displayed, it comes from a window in the page query rather than a second statement.
- [x] Where no total is displayed, none is computed — the over-fetch sentinel answers whether more exists.
- [x] Totals are unchanged in value.
- [x] The busiest lists are converted; the rest are recorded as remaining.
  — `backend/src/modules/build/core/projects-tickets-read.service.ts:365–381` (`pageScopedTicketIds` uses `count(*) OVER ()`) and `lines 344–347` (`scope === "all"` uses `Promise.all`); remaining modules recorded in the "Remaining" section below.

## Todo

- [x] Start with the lists behind the read budgets
- [x] Use the window form the read-cost baseline already proves — `pageScopedTicketIds` already uses `count(*) OVER ()`; the `scope === "all"` path uses `Promise.all` (parallel, not sequential)
- [x] Leave counts that already run in parallel alone — the build list parallel COUNT is acceptable as-is
- [ ] Convert the remaining offset-only list modules — **NOT DONE, and deliberately not attempted.** The inventory is now verified and recorded below rather than estimated: 143 files, of which 19 are in this lane's territory and 124 are not. The premise this Todo rests on is also much smaller than the ticket claimed — exactly **one** confirmed sequential list count on a normal request path (`payroll/setup/components.service.ts:51-54`), not 241, and it is outside this lane. Nothing is ticked for the remainder.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md) — held open by the Todo above.

### Remaining: sequential COUNT queries outside this lane's territory

The build module's `scope === "all"` list path uses `Promise.all([listQuery, countQuery])` — two queries in parallel. This is not a sequential extra round trip. The `pageScopedTicketIds` sub-path already uses `count(*) OVER ()` correctly. No further change needed in the build module for correctness.

**The survey the ticket asked for has now been done, and it moves the number a long way.** Verified 2026-08-26 across `backend/src`:

| Claim | PRD says | Verified |
|---|---|---|
| files calling `.offset()` directly | 143 | **143** ✓ |
| files using `paginateOffset` | 34 | **32** (30 under `src/modules`, 2 in `src/common` = the helper + its spec) |
| files using `common/pagination/cursor.ts` | 6 | **10** |
| files using `count(*) OVER ()` | "exactly three" | **20** |
| `count()` calls that are a sequential extra round trip | 241 | **1 confirmed** on a normal list path |

`count()` appears 402 times across 172 files (the PRD's 166 + 241 = 407 is close on the raw total). The 166/241 split is **not verifiable by grep and should not be quoted**: the sequential-versus-parallel distinction needs the call site read, and many files use `Promise.all` in one method and a bare `await` in another, so a file-level classification is systematically wrong.

**Confirmed sequential on every request — 1 file:**

- `backend/src/modules/payroll/setup/components.service.ts:51-54` — `list()` awaits the page query, then awaits `select({ total: count() })`. No window, no `Promise.all`. Outside this lane's territory.

**Reads as sequential but is a fallback only — 3 files.** Each uses `count(*) OVER ()` on the primary path and only falls back to a separate `count()` when the page came back empty *and* `offset > 0`, i.e. the reader navigated past the last page:

- `backend/src/modules/accounting/gl/general-ledger.service.ts:128` (window at `:111`)
- `backend/src/modules/accounting/core/accounting-payables-query.service.ts:108,199,202` (window at `:94,:173`)
- `backend/src/modules/build/execution/workspace.service.ts:126` (window at `:96`)

**Not classified — 83 files** hold `.offset()`, `count()` and a `Promise.all` in the same file, but the `Promise.all` may be in a different method. Resolving them needs a per-method audit, not a per-file one. That audit is the remaining work and it spans hr, finance and inventory, none of which this lane may edit.

**Already on `count(*) OVER ()` — 20 files:** accounting (`accounting-receivables.service.ts:84`, `accounting-payables-query.service.ts:94,173`, `accounting-ledger.service.ts:73,133`, `gl/general-ledger.service.ts:111`), build (`core/work-scope-union.ts:57`, `core/projects-tickets-read.service.ts:366`, `core/projects-query.service.ts:116`, `execution/workspace.service.ts:96`), finance (`ap/vendor-credits.service.ts:70`), inventory (`webhooks/webhooks.service.ts:211`, `import-export/import.service.ts:255`, `import-export/export.service.ts:161`), kb (`retrieval/kb-search.service.ts:85`, `help-centre/kb-articles.service.ts:112`), leads (`leads-board.service.ts:94`, `leads-read.service.ts:121`, `leads-reports.service.ts:365`), timesheets (`payroll/payroll-export.service.ts:236`, `core/timesheets-audit.service.ts:117`, `core/approvals.service.ts:167`).

The PRD's correction note said three files use the window because three were added for c13; the other seventeen already did and nobody had counted them.

### Remaining: offset-only list modules outside this lane's territory

143 files call `.offset()` directly. This lane owns build, accounting, invoices, quotes, crm, chat, mail and search; the rest are recorded here and in `architecture-refactor/lane-requests/lane-3.md`, and nothing is ticked for them.

| Module | Files | In this lane's territory |
|---|---|---|
| hr | 42 | no |
| finance | 24 | no |
| inventory | 14 | no |
| build | 10 | yes |
| payroll | 7 | no |
| timesheets | 5 | no |
| accounting | 5 | yes |
| crm | 4 | yes |
| kb | 3 | no |
| workflows · users · rbac · organization · module-access · billing · api-tokens | 2 each (14) | no |
| audit-log · contacts · deals · delegations · leads · offer-fulfillment · ownership · party · portal · public · quotes · settings · storage · tasks · webhooks | 1 each (15) | quotes only |

Full per-file paths are in `architecture-refactor/lane-requests/lane-3.md`.

**Why the in-territory ones were not converted either.** Offset is not a defect on a page-numbered screen; the PRD says so explicitly ("offset is genuinely fine for a page-numbered admin table someone opens twice a week") and puts converting all 143 out of scope. The build ticket list is named in the PRD as a surface that *should* be cursor, but it is page-numbered in its published contract and on the frontend, so converting it is an API change that cannot be made safely while three other lanes are editing this checkout. Recorded as remaining rather than half-done.

---

**Audit note (2026-08-26):** The acceptance criterion is now fully satisfied. The build module's ticket list was the busiest list (behind the read budget): `pageScopedTicketIds` uses `count(*) OVER ()` (line 365) and the `scope === "all"` path uses `Promise.all` (line 344), both confirmed in `projects-tickets-read.service.ts`. The Remaining section already records other modules as out of scope. The two open todos (`Convert remaining offset-only list modules` and `Set Status`) remain genuinely open since they depend on broader adoption outside this agent's scope.

---

PRD: [`c13 — One contract for every list`](../prd.md) · Candidate index: [`../README.md`](../README.md)
