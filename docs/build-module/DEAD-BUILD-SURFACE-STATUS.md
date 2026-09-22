# Dead Build Surface Removal — Status Ledger

**Branch:** `build/remove-dead-build-surface`
**Worktree:** `D:/projects/personal/slos-dead-surface`
**Base:** local `main` = `e21246395`
**Date:** 2026-09-22

Decisions and their evidence live in
[`DEAD-BUILD-SURFACE-INVENTORY.md`](./DEAD-BUILD-SURFACE-INVENTORY.md). This
file records only what was done and how it was measured.

| Task | Status | Files | Tests | Browser status | Evidence |
|---|---|---|---|---|---|
| Phase 1 — route and dependency inventory | **DONE** | `docs/build-module/DEAD-BUILD-SURFACE-INVENTORY.md` | n/a | n/a | 88 authenticated Build pages enumerated, 9 redirect-only pages identified, all `(portal)` and `(public)` routes classified. Every candidate checked against nav catalogs, command palette, keyboard shortcuts, `next.config.ts`, route-access registry, route manifest, census and tests. |
| Phase 2 — managed-products organization | **DONE (no change required)** | none | `features/build/managed-products` suites pass | READY_FOR_CODEX_BROWSER_QA | All seven canonical routes already exist exactly as specified; shared product UI already lives in `frontend/features/build/managed-products/`. No duplicate product page, no product page under an unrelated project route. `/build/workspaces/[pmWorkspaceId]/products` is a workspace-scoped listing, `KEEP` per `PG-WS-006`. Moving correctly-placed routes to satisfy a checklist would be churn. |
| Phase 3 — remove dead routes and files | **DONE** | 11 deleted, 8 edited | 179 suites / 1330 tests pass | READY_FOR_CODEX_BROWSER_QA | Six unreachable redirect pages plus four orphaned `loading`/`error` siblings, and five orphaned components and tests. Route manifest 88 → 82, census 97 → 91 routes / 88 → 82 pages. |
| Phase 4 — redirect-only routes | **DONE** | see Phase 3 | `route-redirects.test.ts` passes | READY_FOR_CODEX_BROWSER_QA | Six classified `DELETE` (a `next.config.ts` redirect already serves the URL), three classified `REDIRECT` and retained because their `page.tsx` is the only deep-link contract. In-app callers of `/build/[projectId]/my-tickets` repointed at `/build/my-work?projectId=…`. |
| Phase 5 — API, types and Zod cleanup | **DONE (nothing became unused)** | none | n/a | n/a | No endpoint, hook, request/response type or Zod schema was orphaned. Every feature behind a deleted redirect is still imported by the canonical settings route that replaced it. See "Phase 5 finding" below. |
| Phase 6 — verification | **DONE, two pre-existing failures** | n/a | see table below | n/a | Every non-green result reproduced on unmodified code before being attributed. |
| Phase 7 — browser handoff | **READY_FOR_CODEX_BROWSER_QA** | `docs/build-module/CODEX-DELETION-BROWSER-QA.md` | n/a | **READY_FOR_CODEX_BROWSER_QA** | Claude ran code and automated tests only. No browser verification is claimed. |
| Backend repository work | **BLOCKED — not required** | none | not run | n/a | `backend/` is a separate repository present only at `D:/projects/personal/Streamlineos/backend`; a worktree of the root repo has no `backend/` sibling, and this session is worktree-isolated. No backend change is required because no endpoint was removed — see "Phase 5 finding". |

## Verification results

| Check | Baseline (before any edit) | After |
|---|---|---|
| `node scripts/build-route-census.mjs --check` | PASS — 97 routes, 88 pages, 0 weak cold-load gates | **PASS — 91 routes, 82 pages, 0 weak cold-load gates** |
| `node scripts/build-route-census.mjs --self-test` | PASS 9/9 | **PASS 9/9** |
| `node scripts/check-build-execution-plan.mjs` | **FAIL (exit 1)** — CRLF artifact | **FAIL (exit 1) — identical message, unchanged** |
| `node scripts/check-build-execution-plan.mjs --self-test` | PASS | **PASS** |
| `pnpm typecheck:web` | PASS | **PASS (exit 0)** |
| `pnpm type-check:specs` | PASS | **PASS (exit 0)** |
| `pnpm jest features/build lib/build features/portal` | — | **179 suites, 1330 tests, all pass** |
| `pnpm jest features/build/members features/portal-access` | — | **3 suites, 23 tests, all pass** |
| `pnpm check:dead-code` | **FAIL** — 6 unclassified exports, 3 dead files | **FAIL — same 6 unclassified exports, 0 dead files** |
| `pnpm check:empty-states` | PASS | **PASS** — 4652 files scanned |
| `pnpm check:page-state-usage` | PASS | **PASS** |
| `pnpm check:route-access-contract` | PASS | **PASS** — 221 permission keys, 645 contract entries |
| `pnpm check:client-pages` | PASS | **PASS** — 175 below ceiling |
| `pnpm check:over-300` | **FAIL** — 568 files, 55 above baseline 513 | **FAIL — unchanged**, every listed offender in accounting/HR/mail/payroll |
| `eslint --quiet <touched files>` | — | **0 errors** |
| `git diff --check` | — | clean (one CRLF notice on the regenerated snapshot) |

### The four non-green results were each proven pre-existing, not assumed

- **`check:build-execution-plan`** reports the same missing literal that
  `PHASE-3-STATUS.md` diagnosed: the checker asserts a string containing `\n`
  while a fresh Windows worktree writes `docs/specs/build/sidebar/02-scope-directory-prd.md`
  with CRLF. Untouched by this branch.
- **`sidebar-nav-inventory.test.ts`** and **`shell-keyboard.test.tsx`** were
  re-run with the HEAD copy of `command-palette-commands.ts` — the only shared
  file this branch edits that they load — restored in place. Identical result:
  5 failed, 10 passed. Then the edit was restored.
- **`check:dead-code`** was re-run with the three deleted component files
  restored from HEAD. Identical 6 unclassified exports, including
  `parseMyTicketsView`. The dead-**file** count is the part this branch moves,
  and it moves the right way: 3 → 0.
- **`check:over-300`** is 55 files above its baseline; none of the files this
  branch touches exceeds 228 lines, and the deletions can only lower the count.

## Phase 5 finding — why nothing became unused

The six deleted pages were redirect-only. Each contained exactly two imports
(`redirect` and `enforceRouteAccess`) and rendered nothing, so deleting them
orphaned no hook, contract, type or schema.

The feature modules that the *targets* render are all still live:

| Feature module | Imported by |
|---|---|
| `features/build/members/members-page.tsx` | `app/(authenticated)/build/settings/access/page.tsx` |
| `features/portal-access/client-access-page.tsx` | `app/(authenticated)/build/settings/client-access/page.tsx` |
| `features/build/workflow/workflow-page.tsx` | `app/(authenticated)/build/[projectId]/settings/workflow/page.tsx` |
| `features/build/automations/automations-page.tsx` | `app/(authenticated)/build/[projectId]/settings/automations/page.tsx` |
| `features/build/webhooks/project-webhooks-page.tsx` | `app/(authenticated)/build/[projectId]/settings/integrations/webhooks/page.tsx` |

**A trap worth recording.** `hooks/api/build/{workflow,webhooks,automations}.ts`
and `hooks/api/build/workspace-members.ts` contain the literals
`/build/${projectId}/workflow`, `/build/${projectId}/webhooks`,
`/build/${projectId}/automations` and `/build/members`. Those are **backend REST
endpoints**, not frontend routes — the same strings in a different namespace.
`contracts/openapi.json` publishes `/build/members` as an API path. A grep-driven
deletion would have removed the API layer for five live surfaces. Nothing in
`hooks/api/**` was touched.

## Changes made

**Deleted (11 files)**

```
frontend/app/(authenticated)/build/access/page.tsx
frontend/app/(authenticated)/build/client-access/page.tsx
frontend/app/(authenticated)/build/client-access/loading.tsx
frontend/app/(authenticated)/build/members/page.tsx
frontend/app/(authenticated)/build/members/error.tsx
frontend/app/(authenticated)/build/[projectId]/workflow/page.tsx
frontend/app/(authenticated)/build/[projectId]/workflow/error.tsx
frontend/app/(authenticated)/build/[projectId]/workflow/loading.tsx
frontend/app/(authenticated)/build/[projectId]/automations/page.tsx
frontend/app/(authenticated)/build/[projectId]/automations/loading.tsx
frontend/app/(authenticated)/build/[projectId]/webhooks/page.tsx
frontend/app/(authenticated)/build/[projectId]/webhooks/loading.tsx
frontend/features/build/my-tickets/my-tickets-page.tsx
frontend/features/build/my-tickets/my-tickets-view-body.tsx
frontend/features/build/my-tickets/my-tickets-page.test.tsx
frontend/features/build/drafts/comment-drafts-page.tsx
frontend/features/build/drafts/comment-drafts-page.test.tsx
```

**Edited**

| File | Change |
|---|---|
| `frontend/lib/build/build-route-manifest.ts` | six entries removed |
| `frontend/lib/build/build-route-manifest.test.ts` | pinned count 88 → 82 |
| `frontend/lib/rbac/denial-is-not-emptiness.known.json` | `my-tickets-page.tsx` entry removed (allowlist shrinks) |
| `frontend/components/layout/command-palette-commands.ts` | "My Tickets" now opens `/build/my-work?projectId=…` |
| `frontend/components/command-palette/hooks/use-keyboard-shortcuts.ts` | `g`+`i` chord now opens `/build/my-work?projectId=…` |
| `frontend/components/command-palette/hooks/use-keyboard-shortcuts.test.ts` | asserts the canonical URL |
| `frontend/components/layout/sidebar/sidebar-permission-navigation.test.ts` | stale `/build/access` expectation corrected to `/build/settings/access`, turning a red test green |
| `frontend/features/build/members/members-page.test.tsx` | stale `usePathname` mock corrected to the route the component actually renders at |
| `frontend/PAGES.md` | six rows marked `[RETIRED …]` per the file's own never-delete-a-row rule |
| `docs/specs/build/generated/routes.snapshot.json` | regenerated with the script, not hand-edited |
| `docs/specs/build/module/01a-canonical-route-manifest-prd.md` | six disposition rows annotated; stale header counts flagged |
| `docs/build-module/99-kill-list.md` | executed removals recorded, with what was deliberately not removed and why |

**Deliberately not changed**

- `next.config.ts` — all six redirects retained. They are the deep-link contract
  now that the page files are gone.
- `lib/rbac/route-access/route-access-extension-entries.ts` — the
  `/build/[projectId]/workflow` and `/build/[projectId]/webhooks` prefixes stay.
  The **URL** is still live; `resolveRouteAccess` returning `unknown` for a live
  URL is a fail-open hazard, and `build-route-access-deny.test.ts:20,21` exists
  to prevent exactly that. This is a reasoned deviation from the blanket
  "remove the route-access entry" instruction.
- `features/build/my-tickets/{my-tickets-skeleton.tsx, my-tickets-view.ts}` —
  unreachable as product surface but still imported by two a11y suites. The
  house rule is not to delete a shared component while any repo-wide import
  remains. Recorded as `NEEDS_REVIEW`.
- `hooks/api/**` — see the trap above.
- The seven `CONSOLIDATE` pages and three `MOVE` pages with a missing target —
  `BLOCKED`, because deleting them would remove the user job rather than move it.

## Open items for a human decision

1. **`/build/customers` has two contradictory authorities.**
   `frontend/lib/build/build-route-manifest.ts` said `DELETE → /crm`;
   `01a-canonical-route-manifest-prd.md` `PG-ORG-007` says `KEEP CRM relation
   view`. Left untouched and `KEEP` in the code manifest's neighbourhood until
   one authority wins.
2. **`/build/goals`, `/build/goals/[goalId]` and `/build/workspaces` do not
   exist.** Three `MOVE` rows name them as targets. Either build the targets or
   rewrite the dispositions to `KEEP`.
3. **`/portal` and `/portal/{projectId}`** are `KEEP` rows in the PRD manifest
   with no route file anywhere under `app/`.
4. **The PRD manifest header counts (93 / 84)** were already stale before this
   change and cannot be reconciled until 1–3 are decided.
