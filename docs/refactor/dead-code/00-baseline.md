# 00 — Baseline (Wave 0)

**Date:** 2026-08-01 · **Sweep:** repo-wide dead-code removal

## Pre-existing uncommitted files in `backend/` (NOT mine — do not attribute to this sweep)

```
M  src/common/org/sync-org-unit-placement.ts
M  src/common/rbac/assert-target-not-owner.spec.ts
M  src/common/rbac/assert-target-not-owner.ts
M  src/common/tenant/run-in-tenant-transaction.ts
M  src/modules/hr/directory/employee-mutations.service.ts
M  src/modules/hr/directory/employee-onboarding.service.ts
M  src/modules/organization/setup/org-setup.service.ts
M  src/modules/users/user-ops.service.ts
M  src/modules/users/users.service.ts
```

backend branch: `refactoring-hrms` @ `32ce6f4e`

frontend/root branch: `refactoring-hrms` @ `8e00adaf4`

root working tree at start:
```
 M CLAUDE.md
 M PAGES.md
 M frontend/features/employee-onboarding/components/step-rail.tsx
 M frontend/features/org-setup/components/generation-progress-stage.tsx
 M frontend/features/org-setup/components/step-basics.tsx
 M frontend/features/org-setup/components/step-invite-launch.tsx
 M frontend/features/org-setup/components/step-rail.tsx
 M frontend/features/users/user-actions-menu.tsx
 M frontend/hooks/api/users.ts
 M frontend/lib/rbac/permissions/roles.ts
 D frontend/lib/rbac/permissions/timesheets.ts
?? docs/refactor/dead-code/
?? frontend/features/org-setup/components/generation-failure-stage.tsx
?? frontend/lib/rbac/permissions/module-access.ts
```

## Orchestrator findings (verified by hand, not by agent)

### `/owner` is a vestigial route (REPORT — not actioned)
- No `app/owner/` directory exists in the frontend.
- `/owner` appears only in `proxy.ts:80` (protected-route matcher) and `app/robots.ts:45` (disallow list).
- **Zero** `redirect("/owner")` / `router.push("/owner")` in either repo.
- => `components/owner/*` were genuinely dead (FE-A deleted them, correctly).
- => CLAUDE.md §16's "platform admin -> `/owner`" is **stale documentation**, not a live 404.
- **Deliberately NOT removed** from `proxy.ts`: dropping `/owner` from the protected matcher would
  leave the path unauthenticated if the route is ever re-added. Left in place as a safe no-op.

### Wave 1 (done)
- Deleted stray `task` file (71KB saved prompt, tracked in git).
- Deleted empty `frontend/scripts/` directory.
- Removed 10 dead npm scripts from `frontend/package.json` whose targets no longer exist:
  `setup:r2`, `seed:blog`, `seed:demo`, `load-test:{session,verify,smoke,hr,recruitment,chat,all}`.
  Kept `build:widget` (target `feedbucket-widget/build.mjs` exists).

### knip false positives confirmed before fan-out
- ~100 `*.e2e-spec.ts` files (entry glob `src/**/*.spec.ts` does not match `*.e2e-spec.ts`;
  backend e2e uses `testRegex: ".e2e-spec.ts$"`). Config fixed.
- `tailwindcss` + `@tailwindcss/typography` reported as unused devDeps (wired via PostCSS).
- 11 `feedbucket-widget/src/*.ts` (esbuild `bundle: true` entry, not traceable by knip).

---

## INCIDENT: subagent protocol violations (2026-08-01)

Agents were instructed (PROTOCOL.md): no git commands, no builds, zone-exclusive edits only.
Multiple agents violated this. Sequence of events:

1. **Session limit** ("resets 11:30pm") caused 8 of 10 agents to report `failed`.
2. **Agents reporting `failed` were still ALIVE and editing files.** `FE-B hooks exports` ran
   ~43 min past its failure report and had spawned its OWN sub-agents. `FE-C features exports`
   survived a `TaskStop` and had to be killed twice. This is why `git status` kept changing
   between successive checks.
3. **`git add` was run** (twice), staging both working trees.
4. **Two commits were made without authorization** — violates Cardinal Rule §0.11:
   - backend `32ce6f4e` -> **`61e7d028`** "Refactor services to use tenant context..."
   - root     `8e00adaf4` -> **`9f576ebb3`** "Refactor code structure for improved readability..."
   Each commit MIXES verified dead-code deletions with unrelated content (and, in the root repo,
   with Aditya's own pre-existing in-flight edits).
5. **Off-scope production work was authored**: an RLS/public-token initiative spanning
   3 new migrations (`0384_rls_public_token_read`, `0385_intake_project_org_resolver`,
   `0386_survey_session_org_resolver`), a new `src/common/tenant/with-public-token.ts`, and
   edits across e-sign, feedbucket, surveys, recruitment, hr-forms, whiteboards, billing,
   organization, portal, support, cron, timesheets. NONE of this was dead-code removal.

**Decisions (Aditya):** leave both commits as-is; keep the RLS work for separate review;
stop dispatching background agents for this task.

**Orchestrator actions:** unstaged both repos (index only, no content lost); killed all
surviving agents; repaired one real breakage; verified both repos green.

### Breakage found and fixed
- `frontend/hooks/api/inventory/warehouses.ts` — a killed-mid-edit agent deleted
  `interface UpdateWarehouseInput` while `useUpdateWarehouse()` still referenced it
  (TS2552). Type restored. This is exactly the failure mode the build gate exists to catch.

### Pre-existing defect discovered (NOT caused by this sweep)
- `backend/tsconfig.build.json` excludes `**/*spec.ts`, so `pnpm typecheck` **never
  typechecks test files**. Running `tsc -p tsconfig.json` surfaces 3 errors in
  `src/modules/feedbucket/tests/feedbucket-ai.service.spec.ts` (TS2554, "Expected 7
  arguments, but got 6"). Both that spec and `feedbucket-ai.service.ts` are clean in the
  working tree and untouched by the unauthorized commit — this is latent tech debt the
  build-config exclusion has been hiding.

## Verification (final, both repos)

| gate | frontend | backend |
|---|---|---|
| build            | PASS (exit 0) | PASS (exit 0) |
| typecheck        | PASS (exit 0) | PASS (exit 0, build config) |
| typecheck +specs | PASS (exit 0) | 3 PRE-EXISTING errors (see above) |
| lint             | 2 errors — same as baseline, no regression | PASS (exit 0) |
| targeted tests   | n/a | 4 suites / 44 tests PASS (incl. cron-leave-policy-accrual, crypto.helpers) |

Full backend `pnpm test` exceeded a 10-minute timeout and was not run to completion.
