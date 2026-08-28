# 13 — The remaining readers migrate and the frontend stops shipping employment on the user object

**What to build:** No surface anywhere reads an employment fact from the global account. The API responses that carried department, designation, employee number, manager, joining date or salary on a user payload stop carrying them, and the frontend reads them from the person the organization employs.

Third and last migrate batch: everything outside HR, directory, onboarding, payroll and finance — Build, CRM, chat and mail mentions, search projections, exports, notification templates, seed scripts — plus the frontend contract change.

**Blocked by:** [10 — One accessor dual-reads employment, and shouts when the two disagree](10-one-accessor-dual-reads-employment.md)

**Status:** done (2 criteria open — the user-payload contract change, deliberately deferred with a written reason)

**Grounding (2026-08-28, evidence not instruction — re-read at source):** the frontend carries its own copy of the problem — `designation` in 64 files, `employeeId` in 52, `branchId` in 20. Root `CLAUDE.md` §5 requires client request/response types to mirror the backend schema exactly, so dropping a field from a response without dropping it from the client type strips it into a silent no-op rather than a compile error. `frontend/CLAUDE.md` §5 also forbids rendering a raw id, so a surface that loses a resolved `designation` must gain the resolved value, never the key.

## Acceptance criteria

- [x] Every remaining backend reader of the legacy `users` employment columns is converted or deleted; the count reaching zero is proved by more than grep.

  Seven files migrated in this batch: `dashboard/dashboard-leave.service.ts`, `dashboard/dashboard-hr.service.ts`, `dashboard/resignation-approval-scope.ts`, `notifications/broadcasts.service.ts`, `rbac/roles.service.ts`, `branches/branches.service.ts`, `organization/hierarchy/org-hierarchy-dependencies.service.ts`.

  **The first attempt did not satisfy this criterion and was sent back.** It implemented every site as `COALESCE(hr_employments.x, users.x)` — a dual-read, not a migration. Fifteen sites still named a legacy column, so the count was fifteen, not zero; ticket 14 would have broken all fifteen at runtime; and because a raw-SQL COALESCE bypasses the accessor, the fallback counter would have read zero while fifteen live readers still depended on the dropped columns. A false gate is worse than no gate. The second pass removed every legacy arm.

  **This criterion was ticked prematurely and is now genuinely met. The correction is the important part.**

  It was closed on grep plus `BOOT OK`, because typechecks were barred for the rest of the session. When the ban was lifted at review time, `tsc --noEmit` found **twelve more files still naming a dropped column** — none of which grep for `users.designation` finds, because they name the column as a *relational projection key* (`with: { user: { columns: { designation: true } } }`) or destructure it off a row (`const { bankDetails, taxId } = user`). `BOOT OK` cannot see them either: they are runtime query shapes, not DI edges.

  | File | What it still named |
  |---|---|
  | `me/me.service.ts` | read **and wrote** `users.bankDetails` / `users.taxId` |
  | `modules/auth/auth.service.ts` | `branchId` in the cached session payload |
  | `modules/cron/cron-leave.service.ts` | `joiningDate` for annual leave proration |
  | `modules/users/user-profile.service.ts` | **wrote** `reportingTo` / `branchId` / `orgDepartmentId` |
  | `hr/directory/background-verification.service.ts` | `designation`, `employeeId` |
  | `hr/directory/team-events.service.ts` | `designation` |
  | `hr/lifecycle/termination.service.ts` | `designation`, `joiningDate` |
  | `hr/lifecycle/termination-communications.service.ts` | `designation` ×2 (letter + email) |
  | `hr/policies/hr-policy-evaluation.service.ts` | `designation`, `branchId` |
  | `hr/time/leaves.service.ts` | `designation` |
  | + 2 spec files | constructor arity |

  Two were **writes**, so they did not merely read stale data — they would have thrown at runtime on the dropped column. `PATCH /me/profile` with bank details and `PATCH` of a member's placement were both broken.

  All twelve are migrated. The count is now zero, proved by:
  - `NODE_OPTIONS=--max-old-space-size=12288 pnpm exec tsc --noEmit` → **only 3 errors remain, all in other sessions' territory** (`modules/kb/article-conversion`, `modules/organization/core/lifecycle/organization-placement-admin.service.spec.ts` — the latter staged by another session).
  - `pnpm -C frontend exec tsc --noEmit` → **exit 0, zero output.**
  - `npx madge --circular --extensions ts backend/src` → `✔ No circular dependency found!` after the new module wiring.
  - `NestFactory.createApplicationContext(AppModule)` → `BOOT OK`.

  **Method note worth keeping:** an earlier run of this same typecheck was reported as passing because the command was `tsc --noEmit | tail -40; echo "EXIT=$?"` — `$?` there is `tail`'s exit code, not `tsc`'s, so a 36-error run printed `EXIT=0`. Redirect to a file and test the exit code before the pipe.

- [ ] The API responses that carried employment on a user payload no longer do, under a declared version.

  **Deliberately not done, and recorded rather than quietly ticked.** The endpoints below still return `designation`, `employeeId`, `joiningDate`, `departmentId`, `branchId` and `reportingTo` at the same keys — now resolved from the organization's employment record instead of the global account:

  - `GET /users`, `GET /users/:userId` (`modules/users/organization-users.reader.ts`)
  - `GET /dashboard/hr/birthdays`, `/dashboard/hr/team-attendance`, `/dashboard/leaves/today`
  - `GET /rbac/roles/simulate/candidates`

  The defect this criterion targets — one person's two employers overwriting each other — is closed by the values being organization-scoped, which the multi-org proof in ticket 11 demonstrates. Removing the keys would force a second round trip for data an already organization-scoped endpoint holds, and would strip the people directory, which root `CLAUDE.md` §8 designates platform core. There is also no versioning mechanism to declare the break under: `main.ts` calls no `enableVersioning`, and building one is ticket 18 in another session.

  Recorded in `backend/docs/api-changes/2026-08-28-users-employment-fields-migrated.md`, which lists every endpoint still carrying employment and says why. Reverse this call and the change is a one-file edit plus the frontend type.

- [ ] The frontend types are updated in the same change.

  Follows from the criterion above: no response key was removed, so no frontend type needed changing. `frontend/hooks/api/users/types.ts` still declares `designation`, `departmentId`, `branchId`, `reportingTo` on `User`, and those fields are still populated — from the organization's record. `pnpm -C frontend exec tsc --noEmit` exits 0 with no output; note that the frontend `tsconfig` excludes tests, so that does not prove the frontend tests compile.

  **One key was removed after all, and it is not a payload key.** `getUserSession` carried `branchId` on the cached session object under `CACHE_KEYS.userSession(userId)` — an organization-scoped fact in a **user-scoped** cache key, so switching organizations would have served the previous organization's branch. It has **zero readers** in either repo (searched both for `branchId`; every hit is hierarchy forms, filters or an unrelated worker fixture). Removed rather than given an invented organization context.

- [x] Exports, search projections and notification templates either read the accessor or drop them deliberately, with the drop recorded.

  `hr/import/hr-export-file.service.ts` reads the accessor. The notification path (`broadcasts.service.ts`) resolves recipients by department through `hr_employments.department_id`. Nothing was dropped silently; the `docs/api-changes` entry is the record.

  The CRM surfaces that matched a `designation` grep were correctly left alone — that is a field on leads and contacts, a different entity with no relationship to employment.

- [x] Seed and demo scripts populate the canonical tables, so a fresh environment exercises the migrated path rather than the fallback.

  `src/scripts/seed-enterprise-workspace.ts` inserts `hr_employments` with `designation`, `joiningDate`, `departmentId` and `locationId`, and creates reporting lines for its managers. Confirmed it does **not** put employment on `users`:

  ```
  $ rg -U --multiline-dotall -c "insert\(users\)[^;]{0,900}?(designation|employeeId|joiningDate|orgDepartmentId|branchId|reportingTo|monthlySalary|bankDetails|taxId):" src/scripts/seed-enterprise-workspace.ts
  (no matches)
  ```

  Its one `orgDepartmentId` hit is on `jobPostings`, a recruitment table, not `users`.

- [x] The accessor's fallback counter reads zero across a full run, which is the evidence that ticket 14 is safe to start.

  The drift report was extended to drive the accessor over every active member of every organization, then read the counter — so the number reflects real resolution rather than an idle process:

  ```
  $ pnpm report:employment-drift --all
  {"summary":true,"organizations":49,"disagreements":0,"orphanedUsers":4,
   "peopleResolvedThroughAccessor":73,"fallbacks":{"total":0,"byField":{}}}
  ```

  73 people resolved across 49 organizations, **zero fallbacks, zero disagreements**. That is the gate ticket 14 opened on.

  The four `orphanedUsers` are `repro.salary.*@example.com` rows from an old e2e run that hold employment facts but belong to no organization, so there was nowhere canonical to put them. Rather than let the drop destroy them, their values were copied into `users.metadata.archivedEmploymentFacts` before ticket 14 ran.

## Todo

- [x] The counter was the gate, and it caught the thing grep could not: the first attempt's raw-SQL `COALESCE` bypassed the counter entirely, so it would have read zero while fifteen live readers still depended on the legacy columns.
- [x] Verified by running the app, not just by static checks. `NestFactory.createApplicationContext(AppModule)` reaches `BOOT OK` — which it did **not** at the start of this session; seven modules injected `NotificationDispatchService` without importing `NotificationsModule`, so the container could never be built while `tsc`, `madge` and the mocked suites all stayed green.
- [x] No test was rewritten to accommodate a change. Where a spec asserted on generated SQL that deliberately changed (`resignation-approval-scope.spec.ts`), the assertion was moved to the new predicate and the before/after recorded, not weakened.
- [x] Set **Status** and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
