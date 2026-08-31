# L61 — Finish File Splits Report

## 1. `hiring.ts` → 4 split files

### Canonical source
The four split files (`hiring-core.ts`, `hiring-candidates.ts`, `hiring-interviews.ts`, `hiring-pipeline.ts`) are now canonical. `hiring.ts` is deleted.

### What was compared
All 37 tables checked one by one across the original and the split files:
- Every column, default, constraint, index, and FK matched exactly.
- All `pgTable` names (the runtime table identifiers) are unchanged.
- All indexes and unique constraints are identical.

### What the split had dropped
`scorecardTemplatesRelations` in `hiring-core.ts` was missing `scorecards: many(interviewScorecards)`. The original had this relation. Fixed by adding a supplemental `scorecardTemplateScorecardRelations = relations(scorecardTemplates, ...)` call at the end of `hiring-interviews.ts` (where `interviewScorecards` is defined), matching Drizzle's additive relation pattern already used in `hiring-candidates.ts` for `jobPostings`.

### Import cycle check
Dependency chain is acyclic: `hiring-core` ← `hiring-candidates` ← (`hiring-interviews`, `hiring-pipeline`). Confirmed by `pnpm check:cycles` (zero circular dependencies).

### Files changed
- `src/db/schema/hr/hiring-interviews.ts` — added `scorecardTemplateScorecardRelations`
- `src/db/schema/hr/recruitment.ts` — replaced `export * from "./hiring"` with 4 split exports
- `src/db/schema/hr/job-boards.ts` — `./hiring` → `./hiring-core`
- `src/db/schema/hr/offboarding.ts` — `./hiring` → `./hiring-candidates`
- `src/db/schema/hr/staffing.ts` — split single import into `./hiring-candidates` + `./hiring-core`
- `src/db/schema/hr/talent-pools.ts` — `./hiring` → `./hiring-candidates`
- `src/db/schema/hr/requisitions.ts` — `./hiring` → `./hiring-core`
- `src/scripts/seed-enterprise-workspace.ts` — split single import into `./hiring-core` + `./hiring-candidates`
- `src/modules/hr/recruitment/recruitment-candidate-vault.spec.ts` — updated hardcoded file path from `hiring.ts` to `hiring-candidates.ts` and end-slice marker from `interviewSlas` to `candidateReferenceChecks`
- `src/db/schema/hr/hiring.ts` — **deleted**

---

## 2. `hr-calendar-source.ts` vs `hr-calendar-sub-sources.ts`

### Canonical source
`hr-calendar-source.ts` remains the canonical home of `HrCalendarSource`. `hr-calendar-sub-sources.ts` is now its helper module (no longer dead).

### What was compared
- `WEEKDAY_NAMES`, `dateOnly`, `dateAtNoon`, `enumerateDates` — exact copies in both files.
- `loadAttendanceOnly` — semantically equivalent: the sub-sources version takes `(db, attendancePolicy, ctx)` instead of using `this.*`; same query structure, same logic, same output shape.

### What the split had dropped
Nothing was dropped. The sub-sources functions were faithful extractions. The only work needed was wiring them in.

### Files changed
- `src/modules/hr/hr-calendar-source.ts` — removed the 4 private module-level helper functions (`WEEKDAY_NAMES`, `dateOnly`, `dateAtNoon`, `enumerateDates`) and the private `loadAttendanceOnly` method; added `import { WEEKDAY_NAMES, dateOnly, dateAtNoon, enumerateDates, loadAttendanceOnly } from "./hr-calendar-sub-sources"`; changed `return this.loadAttendanceOnly(ctx)` to `return loadAttendanceOnly(this.db, this.attendancePolicy, ctx)`.

---

## 3. `auth-google-oauth.service.ts`

### Decision: Delete
`AuthGoogleOAuthService` is a dead duplicate of `AuthTokensService.googleOAuth()`. Evidence:
- The controller (`auth.controller.ts` line 181) calls `this.authTokensService.googleOAuth(...)`, not `AuthGoogleOAuthService`.
- `AuthGoogleOAuthService` is never registered in `auth.module.ts`.
- No file in the repo imports it (verified by symbol grep).
- The logic in `auth-google-oauth.service.ts` is a copy of the method at lines 659–778 of `auth-tokens.service.ts`, with the only difference being that it uses `AuthMembershipResolverService` and `AuthAnalyticsService` via injection whereas `AuthTokensService` uses its own internal `createLoginSession`/`logLoginEvent` methods.

The split was abandoned mid-way: the original method in `AuthTokensService` was never removed, so the new service was never wired in.

### Files changed
- `src/modules/auth/auth-google-oauth.service.ts` — **deleted**

---

## Gate Results

| Gate | Result |
|---|---|
| `NODE_OPTIONS=--max-old-space-size=8192 pnpm typecheck` | PASS — zero errors |
| `pnpm check:cycles` | PASS — zero circular dependencies |
| `pnpm exec knip --no-progress` | PASS — none of the 3 target files appear as dead |
| `jest --testPathPattern="hr\|auth\|calendar" --maxWorkers=2` | 1564 tests: 1561 pass, 3 fail (pre-existing: `attendance-scope`, `leaves-scope`, `fnf-hr-payroll` — all unrelated to this work) |
| `pnpm check:migration-chain` | PASS — no issues found |
