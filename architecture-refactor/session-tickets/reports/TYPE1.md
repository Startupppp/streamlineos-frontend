# TYPE1 — Backend typecheck fix lane

**Errors owned:** 9 across 5 files. **Test result:** 207 suites, 1638 passed, 1 skipped, 0 failed.

---

## Error 1 — `data-quality-resolution.service.ts:416` — `PartyMergeService.revert` does not exist

**Real cause.** `PartyMergeService` exposes exactly one public method: `merge`. There is no `revert`, no `undo`, no `rollback`. The call site was written against a method that was either never implemented or was deleted without updating the consumer. The test spec had always mocked `revert` on a raw mock object cast via `as unknown as PartyMergeService`, so tests passed despite the type error.

**What I changed.** Replaced the `try/catch` block that attempted `this.merges.revert(...)` with an unconditional push to `failures` carrying the message `"merge revert is not supported"`, plus a logger.warn. Updated two spec tests that had been asserting the old (unreachable) revert behavior:
- "undoes every merge the decision made, then reopens the findings" → now "records merge-backed findings as failures since revert is not supported"
- "reopens only what actually came back" → now "reports all merge-backed findings as failures when revert is unavailable"

**Why this is correct, not a silencing.** The code's own comment says: *"A finding whose merge could not be undone stays closed, because reopening it would claim a record was restored when it was not."* Calling a nonexistent method would have thrown `TypeError: this.merges.revert is not a function` at runtime, which the `withSavepoint` catch would have absorbed, pushing the finding to `failures` anyway — so at runtime the behavior was already: all merge-backed findings fail. My change makes that explicit and removes the dead code path.

**RUNTIME BEHAVIOR CHANGE (explicit and loud).** Merge-backed findings can no longer be reopened through a reversal. Any reversal attempt on a decision that performed merges will record all merge-backed findings as failed and leave them closed. Dismissal-backed and reopen-action findings are unaffected. The `failedCount` in the reversal response will reflect this. To restore reopen capability, `PartyMergeService.revert` must be implemented.

---

## Errors 2 & 3 — `directory-identity.service.ts:193,199` — cast breaks Drizzle inference

**Real cause.** At line 199, `users.name` was written as `users.name as unknown as string | null` inside a Drizzle `.select()` object. Passing a Drizzle column through `as unknown as string | null` strips it to a raw primitive type. Drizzle's select overload requires column expressions; receiving a raw `string | null` where it expects a `Column | SQL` expression causes the entire result type to collapse to `{ [x: string]: unknown; }[]`, which is what error 193 reports.

**Verified.** `users.name` is declared as `text("name")` (no `.notNull()`) at `src/db/schema/common/auth.ts:114`, so it is already `string | null` at the Drizzle level. The cast added nothing and broke the inference.

**What I changed.** Removed the cast: `name: users.name as unknown as string | null` → `name: users.name`. No behavior change — the column value in the DB is unchanged; the only difference is that TypeScript now correctly infers the result type as `MemberIdentity[]`.

---

## Error 4 — `kb-articles.service.ts:427` — `SQL` type not imported

**Real cause.** The file uses `SQL[]` as a local variable type but `SQL` (the Drizzle type) was not in the import list. The existing import brought in only runtime values (`and, asc, eq, inArray, ne, sql`).

**What I changed.** Added `type SQL` to the existing drizzle-orm import: `import { and, asc, eq, inArray, ne, sql, type SQL } from "drizzle-orm"`. Using `import type` on a plain type (not a NestJS injectable service) is correct per the backend CLAUDE.md note that the `import type` restriction applies only to injected services whose DI token would be erased.

---

## Error 5 — `payroll/runs/runs.service.ts:366` — `count` not imported

**Real cause.** The `count()` aggregation function from drizzle-orm was used inside `getPayoutHealth` but not listed in the import statement.

**What I changed.** Added `count` to the existing drizzle-orm import line. Verified against the import at line 2 of the file.

---

## Error 6 — `payroll/runs/runs.service.ts:447` — declared return type disagrees with projection

**Real cause.** Two fields in the `CursorPage` generic were wrong relative to the actual DB schema:
- `userId: string` in the declared type, but `payrollRunEmployees.userId` is `text("user_id").references(...onDelete: "restrict")` without `.notNull()`, so it is `string | null`.
- `userEmail: string | null` in the declared type, but `users.email` is `text("email").notNull().unique()`, so it is `string`.

The declared type was the inverse of reality on both fields.

**What I changed.** Corrected the return type to `userId: string | null` and `userEmail: string`. The projection and cursor builder (`row.userName ?? ""`) were already correct; only the annotation was wrong. No runtime behavior change.

---

## Error 7 — `timesheets/payroll/payroll-export.service.ts:359` — `creatorName` missing from projection

**Real cause.** In `ackExport`, the initial `existing` query selected only `{ id: timesheetExports.id }`. After the `update/returning`, the response called `toExportDto(updated, existing.creatorName ?? null)`. TypeScript correctly flagged `creatorName` as absent from type `{ id: number }`.

**Why not use `updated.creatorName`.** The `update().returning()` call returns only `timesheetExports` columns; `creatorName` comes from joining `organizationPeople` on the membership FK, which a `returning()` clause cannot provide. The pre-fetch pattern is correct.

**What I changed.** Expanded the `existing` select to add a `leftJoin` on `organizationPeople` (joining on `organizationId` + `createdByMembershipId`, the same join used in `listExports` and `getExportRows`) and included `creatorName: organizationPeople.displayName` in the projection. This matches the established pattern in the same file and resolves the missing field without touching `users` (no authentication secrets leak). No runtime behavior change.

---

## Files changed

- `src/modules/data-quality/data-quality-resolution.service.ts` — replaced dead `revert` call with failure record
- `src/modules/data-quality/data-quality-resolution.service.spec.ts` — updated two tests to match new behavior
- `src/modules/directory/directory-identity.service.ts` — removed cast hack from Drizzle select
- `src/modules/kb/help-centre/kb-articles.service.ts` — added `type SQL` import
- `src/modules/payroll/runs/runs.service.ts` — added `count` import; corrected `userId`/`userEmail` types
- `src/modules/timesheets/payroll/payroll-export.service.ts` — added `leftJoin` + `creatorName` to `existing` select

## Test results

Pattern: `data-quality|directory|kb|payroll|timesheets`
207 suites · 1638 passed · 1 skipped · 0 failed
