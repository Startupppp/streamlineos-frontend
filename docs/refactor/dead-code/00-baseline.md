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
