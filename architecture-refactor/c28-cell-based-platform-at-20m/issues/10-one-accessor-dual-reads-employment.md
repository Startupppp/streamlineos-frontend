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

  The public surface is four methods taking `(orgId, userId)` and returning plain facts. `hr_people` → `hr_employments` → `hr_reporting_lines` → `hr_employee_sensitive_fields`, the effective-dated manager resolution, the envelope decryption and the legacy fallback are all inside. No caller in tickets 11–13 names a table.

- [ ] Salary, bank and tax reads go through the same accessor but stay behind their existing permission gate — widening the read surface is not part of this change.
- [ ] Adding a new employment fact means adding it here, enforced by the legacy columns being unreachable from anywhere else once ticket 13 lands.

  Both depend on the reader batches; see tickets 11–13.

**Batch form shipped before ticket 11 started,** as the Todo asks: `getFactsBatch` / `getSensitiveFactsBatch` resolve a whole list in one query, so a directory page does not turn into N+1.

## Todo

- [x] Read both first. `person-seam.ts` resolves identity and facets and returns "identity and flags only" by design, so it is the wrong home for salary; `person-employment-sync.service.ts` is the writer, and the backfill reuses it rather than replacing it. The accessor is a new sibling in the same module, not a second seam.
- [x] Batch form shipped before ticket 11 started — `getFactsBatch`, `getSensitiveFactsBatch`, and later `getSensitiveFactsByPersonBatch` for payees with no login.
- [x] The drift alert is tested against the line the application actually writes, captured from real `reportError` output and fed to the real script as a child process — not a hand-written fixture.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
