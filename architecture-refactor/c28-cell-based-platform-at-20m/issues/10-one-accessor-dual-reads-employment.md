# 10 — One accessor dual-reads employment, and shouts when the two disagree

**What to build:** There is exactly one way to ask *"what is this person's department / designation / employee number / manager / salary in this organization?"*. It answers from the organization-owned tables, falls back to the legacy columns on `users` only while the migration is in flight, and reports every disagreement rather than quietly preferring one.

**Blocked by:** [09 — Employment truth is backfilled into the organization-owned tables](09-employment-truth-is-backfilled.md)

**Status:** done (1 criterion un-ticked on measurement — the deep-interface claim)

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

- [ ] The accessor is a *deep* interface: callers ask for the fact, not for the join. Its storage and the fallback are implementation details that tickets 11–13 do not need to know about.

  **Partially met, and previously ticked on prose alone. Un-ticked on measurement.**

  The first half holds: the public surface is six methods taking `(orgId, …)` and returning plain facts, and the effective-dated manager resolution, the envelope decryption and (while it existed) the legacy fallback are all inside.

  The second half does not. "No caller names a table" is false — a scan of the migrated readers finds many still joining the canonical tables directly in SQL:

  ```
  $ rg -l "hrEmployments|hrPeople|hrReportingLines|hrEmployeeSensitiveFields" src/modules --type ts       | grep -v "\.spec\.ts" | grep -vE "directory/(employment-facts|person-seam)|hr/core/(person-employment-sync|hr-sensitive|hr-employments|hr-people|hr-timeline|hr-effective)"
  branches/branches.service.ts            dashboard/resignation-approval-scope.ts
  dashboard/dashboard-leave.service.ts    dashboard/dashboard-hr.service.ts
  users/organization-users.reader.ts      users/user-ops.service.ts
  rbac/roles.service.ts                   payroll/insights/lib/report-builders.ts   … and more
  ```

  That was a deliberate trade, not an oversight: a `WHERE department_id = ?` predicate and a list projection cannot be served by a per-person accessor call without either pulling the whole organization into memory or going N+1, so those sites join `hr_people → hr_employments` in the same query. The accessor is the single source for *resolving a person's facts*; it is not the only thing that names the tables.

  What would close it honestly: a query-builder helper on the accessor that returns the join fragment, so a predicate site composes it rather than hand-writing the join. That is a real piece of work and is not in these six tickets.

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
