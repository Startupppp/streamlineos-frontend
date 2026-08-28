# 10 — One accessor dual-reads employment, and shouts when the two disagree

**What to build:** There is exactly one way to ask *"what is this person's department / designation / employee number / manager / salary in this organization?"*. It answers from the organization-owned tables, falls back to the legacy columns on `users` only while the migration is in flight, and reports every disagreement rather than quietly preferring one.

**Blocked by:** [09 — Employment truth is backfilled into the organization-owned tables](09-employment-truth-is-backfilled.md)

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the blast radius makes a direct swap impossible — `designation` appears in 90 backend files and 64 frontend files, `employeeId` in 78 and 52, `joiningDate` in 53. That is a wide refactor: one edit across all of them cannot land green, so this ticket is the *expand* that lets tickets 11–13 migrate in batches while both forms exist. `modules/directory/person-seam.ts` already exists and reads both `hrPeople` and `hrEmployments` — check whether it is already this accessor before writing a second one.

## Acceptance criteria

- [x] One accessor, in one place, is the only supported way to read an employment fact; it takes the org and the person and returns the canonical values.

  `modules/directory/employment-facts.service.ts` — `EmploymentFactsService`, provided and exported by `DirectoryModule`. `person-seam.ts` was read first as the ticket asks: it resolves *identity and facets* (`PersonResolution`, `resolvedVia`, `payableAs`) and deliberately returns "identity and flags only", so it is the wrong home for salary/bank/tax. The accessor sits beside it in the same module rather than duplicating it, and both are exported from `DirectoryModule`.

  ```
  getFacts(orgId, userId)                -> EmploymentFacts
  getFactsBatch(orgId, userIds)          -> Map<userId, EmploymentFacts>
  getSensitiveFacts(orgId, userId)       -> SensitiveEmploymentFacts
  getSensitiveFactsBatch(orgId, userIds) -> Map<userId, SensitiveEmploymentFacts>
  ```

  **It shipped with no unit spec at all, which is why the two defects below survived to final review.** `employment-facts.service.spec.ts` now exists — 13 tests, and six of them assert the *generated SQL* rather than a mocked return value, by capturing each join/where condition and rendering it through `PgDialect.sqlToQuery` (a captured Drizzle condition is circular, so `JSON.stringify` throws — this is the only way to read one). That is what makes them regression tests for the predicates rather than restatements of the mock:

  ```
  √ excludes a soft-deleted manager from the resolved reporting line
  √ excludes a soft-deleted manager when listing direct reports
  √ bounds the reporting line on both sides so a future-dated line is not current yet
  √ scopes every join and filter to the requested organization
  √ issues no query for an empty batch
  √ refuses to return a bank record it cannot decrypt
  Tests: 13 passed, 13 total
  ```

  **Two real defects it now pins:**

  - **A terminated manager kept managing.** The subject's own `hr_people`/`hr_employments` joins filtered `deletedAt IS NULL`; the two *manager* aliases did not. A manager whose employment was soft-deleted while their reporting line stayed open was still returned as `managerUserId` — and `getDirectReportUserIds` still returned their reports, so anything gating a manager's view of a subordinate's data answered yes for a former employee. `syncCanonicalReportingLine`'s write path had the filter all along; only the read side was missing it.
  - **A future-dated manager change took effect immediately.** Both reads selected the open line with `effectiveTo = 'infinity'`, ignoring `effectiveFrom`. Because `syncCanonicalReportingLine` accepts a future `effectiveFrom` and closes the *current* line at the day before it, a change scheduled for next month made the new manager current the moment it was recorded. Both sites now use `effectiveFrom <= CURRENT_DATE AND effectiveTo >= CURRENT_DATE`, which is the bound `currentManagerEmploymentId` already used — the read side simply disagreed with the writer. The `employee-reporting-line-lookup` read budget was updated to the same predicate so it measures the query the code issues.

  Also fixed: both batch reads now `ORDER BY hr_employments.id`, so if a data defect ever leaves two employments marked primary for one person the last-write-wins map resolves deterministically instead of by physical row order. There is no unique index enforcing one primary employment — confirmed against `pg_indexes`.

- [x] It reads the canonical tables first and the `users` columns only as fallback, and every fallback hit increments a counter that is visible in the drift dashboard.

  Decision logic extracted to a pure seam, `modules/directory/employment-fact-resolution.ts`, so the rule is testable without a database. Counter in `employment-fallback-counter.ts`, read with `snapshotEmploymentFallbacks()` and by `pnpm report:employment-drift`.

  ```
  $ node ./node_modules/jest/bin/jest.js src/modules/directory/employment-fact-resolution.spec.ts
  PASS src/modules/directory/employment-fact-resolution.spec.ts
    employment fact resolution
      √ prefers the canonical value and never counts a fallback (10 ms)
      √ falls back to the legacy column only when the canonical value is absent (1 ms)
      √ keeps the canonical value and flags a disagreement when the two differ (1 ms)
      √ does not flag a disagreement when the two agree (1 ms)
      √ resolves nothing when neither side has a value (1 ms)
      √ compares structured values such as bank details by content (1 ms)
      √ treats zero and false as present values rather than absent ones (1 ms)
  Tests:       7 passed, 7 total
  ```

- [x] A disagreement between the two sources emits a structured alert with the org, the field and both values — not a log line. A log line is not an alert until it reaches a person.

  `reportEmploymentDrift` goes through `reportError` → `LogErrorReporter`, the same path `alert-tenant-ctx-errors` reads, and `src/scripts/alert-employment-drift.mjs` fires on it at threshold 0 (`pnpm alert:employment-drift`, `:self-test`).

  **The predicate is tested against the real emission, not a hand-written fixture.** `employment-drift-alert.spec.ts` captures the actual stderr line the application writes, feeds it to the actual alert script as a child process, and asserts exit code 1 — the failure mode this program hit once before, where an alert grepped for a string no log line contained.

  ```
  $ node ./node_modules/jest/bin/jest.js src/modules/directory/employment-drift-alert.spec.ts
  PASS src/modules/directory/employment-drift-alert.spec.ts
    employment drift alert
      √ fires on the line the application actually emits for a disagreement (87 ms)
      √ fires on the line the application actually emits for a legacy fallback (97 ms)
      √ never puts a sensitive value in the alert payload (111 ms)
      √ stays clear on an unrelated error line (92 ms)
      √ counts every fallback so ticket 14 has a gate to read (2 ms)
  Tests:       5 passed, 5 total

  $ node src/scripts/alert-employment-drift.mjs --self-test
  {"selfTest":true,"kind":"any","pass":true,"count":2,"expectedCount":2,"fired":true,...}
  exit=0
  ```

  Sensitive values never reach the alert payload — `salaryAmountCents`, `bankDetails` and `taxId` are reported as `<redacted>`, asserted by the third test above.

- [x] The accessor is a *deep* interface: callers ask for the fact, not for the join. Its storage and the fallback are implementation details that tickets 11–13 do not need to know about.

  **Closed properly on the second attempt.** It was first ticked on prose, then un-ticked on measurement (a scan found callers still hand-writing the join), then closed by building the thing that was missing rather than by narrowing the criterion.

  The first half always held: the public surface is six methods taking `(orgId, …)` and returning plain facts, with effective-dated manager resolution and envelope decryption inside.

  The second half is now met by **`src/modules/directory/employment-query.ts`** — composable, org-scoped Drizzle `SQL` fragments that own the join *rules* so no caller re-derives them:

  ```
  livePersonOfUser(orgId, userIdColumn, people?)     livePerson(orgId, people?)
  livePersonOfEmployment(orgId, employments?, people?)
  primaryEmploymentOfPerson(orgId, people?, employments?)
  liveEmployment(orgId, employments?)
  currentPrimaryReportingLine(orgId, lines?)         reportingLineOfEmployment(orgId, employments?, lines?)
  managerEmploymentOfLine(orgId, lines, managerEmployments)
  orgUnitInOrg(orgId, unitIdColumn, units?)
  ```

  This is the honest resolution of the trade recorded before: a `WHERE department_id = ?` predicate still cannot be a per-person call without going N+1, so those sites still write a join — but they no longer decide **what the join means**. Tenant scope, soft-delete, `is_primary` and the effective-date window are defined once. `EmploymentFactsService` itself was refactored onto the fragments first, so they are proved against the real shape rather than invented for the callers.

  **34 files now compose the fragments.** The six that still name `hrEmployments.isPrimary` inline are `WHERE` clauses and writes, not join conditions — `person-employment-sync` (the writer), plus five sites where `isPrimary` is a filter or a sort preference rather than a join rule.

  `employment-query.spec.ts` pins the rules by rendering each fragment through `PgDialect.sqlToQuery` — 18 tests asserting every fragment carries `org_id`, that the manager aliases carry `deleted_at IS NULL`, that the reporting line is bounded on both sides, and that the rules survive aliasing.

  **The migration found latent defects in 13 files, which is the argument for the criterion.** Each was a caller that had re-derived the join and got one rule wrong:

  | Defect | Where | Consequence |
  |---|---|---|
  | No `deleted_at` on either table | `hr/payroll-inputs/payroll-inputs-build.service.ts` | soft-deleted employments entered **payroll input snapshots**; the join also had no `orgId` on `hr_people` |
  | No `is_primary` in a recursive CTE's recursive leg | `hr/directory/employee-mutations.service.ts` | reporting-line **cycle detection** could walk a non-primary employment |
  | No `is_primary` on either employment alias | `dashboard/resignation-approval-scope.ts` | resignation approval scope resolved through non-primary employments |
  | No `deleted_at` on `hr_people` ×4 | `hr/import/hr-import-commit.service.ts` | imported leave, attendance, assets and documents attached to a soft-deleted person |
  | No `deleted_at` on either table | `hr/global/contracts.service.ts` | a stale userId fed to the automation engine |
  | No `deleted_at` on `hr_people` ×2 | `hr/lifecycle/probation.service.ts` | `extend` and `confirm` wrote against a deleted person |
  | No `deleted_at` / no `orgId` on `hr_people` | `hr/onboarding/core/onboarding-probation.service.ts` | same class |
  | No `orgId` on `org_units` ×3 | `hr/time/attendance.service.ts`, `payroll/insights/lib/report-builders.ts`, `payroll/insights/reports.service.ts` | **cross-tenant** department names |
  | No `orgId` on `hr_employee_sensitive_fields` / `org_unit_members` | `hr/lifecycle/hr-dashboard.service.ts`, `hr-dashboard-reports.service.ts` | tenant predicate resting on an FK rather than stated |

  Two sites were deliberately **not** changed and are recorded as such: `org-hierarchy-dependencies.service.ts` counts historical assignments on purpose (a soft-deleted assignment must still block an archive), and `probation-review-reader.probationCoverageOn` intentionally spans all of a person's employments rather than the primary one.

  The `effective_to = 'infinity'` sentinel was replaced by the `CURRENT_DATE` window everywhere it was *read*, and `reporting-line-sentinel.spec.ts` walks all 2,000+ source files to fail the build if a reader reintroduces it — with a self-test proving the scan detects the pattern it hunts.

- [x] Salary, bank and tax reads go through the same accessor but stay behind their existing permission gate — widening the read surface is not part of this change.

  `getSensitiveFacts` / `getSensitiveFactsBatch` / `getSensitiveFactsByPersonBatch` are separate methods from the non-sensitive ones, so a caller cannot obtain salary or bank details by asking for a designation.

  No gate changed anywhere in the four modules this session touched — measured rather than asserted:

  ```
  $ git diff 034f13727..HEAD -- src/modules/hr/ src/modules/users/ src/modules/directory/ src/modules/payroll/       | grep -E "^[+-].*(@RequirePermission|@Universal|@Public|UseGuards)"
  (no output — zero added, removed or altered)
  ```

  The accessor moved *where* a value is read from, never *who* may read it.

- [x] Adding a new employment fact means adding it here, enforced by the legacy columns being unreachable from anywhere else once ticket 13 lands.

  Enforced by the strongest mechanism available: the columns no longer exist. Ticket 14 dropped them from both the Drizzle schema and the database, so there is no legacy location for a new fact to be added to and no second path to read one from.

  ```
  $ node scripts/db-query.mjs "select count(*) from information_schema.columns where table_name='users' and column_name in ('designation','employee_id',…)"
  0 of 9 remain; users went 42 -> 33 columns
  ```

> **Note for a later reader.** The dual-read machinery this ticket built — `employment-fact-resolution.ts`, `employment-fallback-counter.ts`, `alert-employment-drift.mjs` and the `report:employment-drift` script — existed to guard the migration window, and that window closed with ticket 14. Once the legacy columns were dropped the counter could no longer increment and the alert could no longer fire, so ticket 14 deleted them rather than leave a guard that structurally cannot trip sitting beside a security-adjacent path. The evidence above is what those files did while they were live; do not expect to find them on disk.

**Batch form shipped before ticket 11 started,** as the Todo asks: `getFactsBatch` / `getSensitiveFactsBatch` resolve a whole list in one query, so a directory page does not turn into N+1.

## Todo

- [x] Read both first. `person-seam.ts` resolves identity and facets and returns "identity and flags only" by design, so it is the wrong home for salary; `person-employment-sync.service.ts` is the writer, and the backfill reuses it rather than replacing it. The accessor is a new sibling in the same module, not a second seam.
- [x] Batch form shipped before ticket 11 started — `getFactsBatch`, `getSensitiveFactsBatch`, and later `getSensitiveFactsByPersonBatch` for payees with no login.
- [x] The drift alert is tested against the line the application actually writes, captured from real `reportError` output and fed to the real script as a child process — not a hand-written fixture.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
