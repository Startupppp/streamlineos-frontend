# Ticket 25 — thin authenticated route modules

**Ratchet before: 58 in-scope thick route modules. Ratchet after: 0.**
`BASELINE.inScopeThick` in `frontend/scripts/check-route-module-thinness.mjs` was lowered 58 → 0 to
hold the gain. It was never raised. The out-of-scope CRM/Inventory partition is unchanged at 67.

## What was done

All 58 in-scope offenders were `"use client"` page modules that owned state, queries, forms or
`apiClient` calls. Each was converted the same way:

1. The whole client component moved verbatim into a feature-owned file
   (`features/<module>/<area>/<name>-page.tsx`), keeping its `"use client"` directive, its
   `useCan(...)` gates and its behaviour byte-for-byte.
2. The route module became a thin composition shim, matching the convention already in the tree
   (`app/(authenticated)/accounting/purchase-bills/page.tsx`, `.../assets/[assetId]/page.tsx`):

```tsx
import { RecurringBillsPage } from "@/features/accounting/purchases/recurring-bills-page";

export default function Page() {
  return <RecurringBillsPage />;
}
```

3. The 17 dynamic routes now resolve params **server-side** and pass typed props down, so the
   client component no longer unwraps a promise or reads `useParams()`:

```tsx
export default async function Page({ params }: { params: Promise<{ billId: string }> }) {
  const { billId } = await params;
  return <PurchaseBillDetailPage billId={billId} />;
}
```

4. The 9 feature files that would have landed over 300 lines were **split**, not relocated —
   16 further feature-owned components were extracted (columns factories, dialogs, cards, section
   bands, page skeletons, a schema/state module). `check:over-300` fell 518 → 510.
5. Two non-route modules living inside `app/` were moved into their feature folders and the
   originals deleted: `accounting/settings/accounting-settings-schema.ts` and
   `accounting/assets/depreciation/depreciation-schema.ts`.

Client pages fell from **200 → 142** of 600 (`check:client-pages`, ceiling 304).

## Authorization — nothing was dropped, and two holes were closed

**No client gate was removed.** Because each client body moved intact, every gate travelled with
it. A scripted comparison against the pre-change source confirms all **47 `useCan("…")` keys across
the 22 gated pages survive verbatim — 0 missing, 0 renamed, 0 invented.**

**No thinned route module acquired a permission key.** `grep` over all 58 returns zero
`requirePermission` / `enforceRouteAccess` occurrences. Platform-core surfaces (`/chat`,
`/notifications/*`, `/dashboard`, `/me/*`) keep only the `(authenticated)` layout's
`requireSession()`, per root CLAUDE.md §8.

**The P1 relayed from ticket 16 is fixed.** Four pages in this territory were reachable by any
active member because their only gates were advisory client checks and no layout enforced anything:

| Route | Was | Now |
|---|---|---|
| `/ai/executive-brief` | no gate at all, no `ai/layout.tsx` | `app/(authenticated)/ai/executive-brief/layout.tsx` → `enforceRouteAccess("/ai/executive-brief")` |
| `/surveys/new`, `/surveys/[surveyId]/participants`, `/surveys/live/[sessionId]/host` | `<DashboardGate>` + `<RequireModule>` only | `app/(authenticated)/surveys/layout.tsx` → `enforceRouteAccess("/surveys")` |

I verified the registry claim myself rather than taking it on trust: `resolveRouteAccess` resolves
`/surveys`, `/surveys/new`, `/surveys/1`, `/surveys/1/participants` and `/surveys/live/1/host` to
`module:surveys + surveys:view`, `/surveys/access` to `module:surveys + surveys:access:view`, and
`/ai/executive-brief` to `ai:executive-brief:view` — so a single `surveys/layout.tsx` covers the
whole subtree without over- or under-gating `/surveys/access`. The layout for the brief sits on the
leaf segment, not on `/ai`, because `/ai` itself resolves to `unknown`.

Both keys were taken from the contract's own `x-permission` (`GET /surveys` → `surveys:view`,
`GET /ai/executive-brief` → `ai:executive-brief:view`) and confirmed verbatim in **both** catalogs:
`backend/src/modules/rbac/permissions/surveys.ts` + `ai.ts`, and
`frontend/lib/rbac/permissions/surveys.ts` + `permission-key-extended.ts`. Nothing was invented, and
nothing needed adding to ticket 16's `SESSION_ONLY_BY_DESIGN` allowlist.

## Gates run (all output read)

| Gate | Result |
|---|---|
| `check:route-thinness` | ✔ IN SCOPE thick **0** (was 58); self-test 9/9 |
| `check:over-300` | ✔ 510 / 5116 (was 518; baseline 519) |
| `check:client-pages` | ✔ 142 / 600 (was 200; ceiling 304) |
| `check:route-access-contract` | ✔ 203 keys checked, 627 contract permissions |
| `check:routes` | ✔ no business route handlers |
| `check:properties` (routes, colors, effect-fetches, icon-labels, `madge --circular`) | ✔ "No circular dependency found!" over 5130 files |
| `jest lib/rbac/route-access/__tests__/page-level-gates.test.ts` | ✔ 10/10 |
| `check:query-signal`, `check:empty-states`, `check:module-manifest`, `check:home-manifest`, `check:command-catalog`, `check:seo-metadata`, `check:contract-drift` | ✔ all pass |
| `tsc --noEmit` (8 GB heap) | ✔ clean apart from the 22 known `.next/types/validator.ts` errors |

The 17 `Property 'projectId' does not exist on type 'IntrinsicAttributes'` errors the orchestrator
saw were a mid-refactor snapshot taken between the file move and the param rewiring. They are gone;
the final typecheck produced **zero** errors outside the stale generated validator.

## Pre-existing red, NOT caused by this work

Four gates are red on environment artifacts. Every offending path they print is inside the
generated `.next-buildmart/` build directory or `.scratch/`:

- `check:file-sizes` — only `.next-buildmart/dev/**` chunks.
- `check:query-scope` — 6 hash-fn + 9 key-prefix + 15 inline-key findings, **all** in
  `.next-buildmart/dev/static/chunks/*.js`. Filtering that directory out leaves zero.
- `check:formatters` — 18 local `Intl.NumberFormat`s, all in `.next-buildmart` chunks.
- `check:dead-code` — 3 unused files: `.next-buildmart/dev/types/routes.d.ts`,
  `.next-buildmart/dev/types/validator.ts`, `.scratch/mint-session.mjs`.
- `check:contract-vendor` — needs `backend/openapi.json` at a sibling path this machine's repo
  layout does not have (see AGENT-BRIEF's path table).

**Finding for the orchestrator (P2):** five separate gates scan `.next-buildmart/` and go red on
it. Either that directory needs adding to every scanner's ignore list or it needs deleting before a
gate sweep, otherwise a real violation will be invisible in the noise.

## Files outside my territory that I edited (2 lines total, both ratchet maintenance)

- `frontend/scripts/check-route-module-thinness.mjs` — `BASELINE.inScopeThick` 58 → 0. This is the
  script's own instruction when it is under baseline ("lower BASELINE.inScopeThick to 0 to hold the
  gain") and it is a tightening, not a raise.
- `frontend/scripts/check-dead-code.mjs` — deleted the now-stale `EXPORT_VERDICTS` entry
  `hooks/api/workflows.ts:WorkflowAnalytics`. The split gave that type a real importer
  (`features/workflows/list/workflow-analytics-stats.tsx`), so the manual "dead but keep" verdict
  became stale and the script failed on it by design. Removing it is a tightening too.

## Change set

**Route modules rewritten as thin shims (58)** — every path in the ticket's worklist under
`frontend/app/(authenticated)/`: accounting (19), hr (16), build (9), notifications (6),
workflows (5), plus `chat`, `settings/roles/[roleId]`, `surveys/[surveyId]/participants`.

**New server gates (2)**
- `frontend/app/(authenticated)/surveys/layout.tsx`
- `frontend/app/(authenticated)/ai/executive-brief/layout.tsx`

**Deleted from `app/` (2)**
- `frontend/app/(authenticated)/accounting/settings/accounting-settings-schema.ts`
- `frontend/app/(authenticated)/accounting/assets/depreciation/depreciation-schema.ts`

**New feature files (76)** — 58 extracted `*-page.tsx` under `frontend/features/**`, 2 relocated
schemas, and 16 components split out of the 9 oversized extracts:

- `features/accounting/assets/` — `depreciation-page.tsx`, `depreciation-schema.ts`,
  `depreciation-run-status-badge.tsx`, `reverse-depreciation-run-button.tsx`,
  `depreciation-run-columns.tsx`, `run-depreciation-dialog.tsx`
- `features/accounting/planning/` — `scenarios-page.tsx`, `scenario-card.tsx`, `budget-detail-page.tsx`
- `features/accounting/sales/` — `recurring-invoices-page.tsx`, `recurring-template-row-actions.tsx`,
  `customers-page.tsx`, `customer-detail-page.tsx`
- `features/accounting/purchases/` — `recurring-bills-page.tsx`, `purchase-bill-detail-page.tsx`,
  `new-purchase-bill-page.tsx`, `payment-runs-page.tsx`
- `features/accounting/taxes/` — `gstr-1-page.tsx`, `gstr-3b-page.tsx`
- `features/accounting/settings/` — `accounting-settings-page.tsx`, `accounting-settings-schema.ts`,
  `payment-providers-page.tsx`
- `features/accounting/core/journal-entry-detail-page.tsx`,
  `features/accounting/vendors/vendor-detail-page.tsx`,
  `features/accounting/reports/cash-flow-page.tsx`,
  `features/accounting/expenses/{team-expenses-page,reimbursement-batch-detail-page}.tsx`
- `features/hr/automations/` — `automations-settings-page.tsx`, `automation-rule-card.tsx`
- `features/hr/announcements/` — `announcements-admin-page.tsx`, `announcements-body.tsx`
- `features/hr/onboarding/` — `onboarding-list-page.tsx`, `onboarding-detail-page.tsx`,
  `onboarding-task-card.tsx`, `probation-page.tsx`
- `features/hr/recruitment/` — `interviews-page.tsx`, `candidate-intake-page.tsx`, `jobs-page.tsx`
- `features/hr/employees/` — `find-expert-page.tsx`, `skills-matrix-page.tsx`
- `features/hr/{templates,workflows,travel,policies,leave-policies,custom-fields}/` —
  `templates-settings-page.tsx`, `workflows-settings-page.tsx`, `travel-page.tsx`,
  `policy-versions-page.tsx`, `leave-policies-page.tsx`, `custom-fields-settings-page.tsx`
- `features/build/sprints/` — `project-sprints-page.tsx`, `sprint-sections.tsx`,
  `sprints-page-skeleton.tsx`
- `features/build/` — `webhooks/project-webhooks-page.tsx`, `backlog/project-backlog-page.tsx`,
  `cycles/cycle-detail-page.tsx`, `milestones/project-milestones-page.tsx`,
  `templates/build-templates-page.tsx`, `roadmap/roadmap-list-page.tsx`,
  `project-detail/{project-budget-page,project-chat-page}.tsx`
- `features/workflows/list/` — `workflows-list-page.tsx`, `workflow-analytics-stats.tsx`,
  `workflow-card-grid.tsx`, `delete-workflow-dialog.tsx`
- `features/workflows/` — `builder/workflow-detail-page.tsx`, `executions/executions-page.tsx`,
  `variables/variables-page.tsx`, `templates/workflow-templates-page.tsx`
- `features/notifications/admin/` — `notification-policy-page.tsx`, `notification-policy-state.ts`,
  `notification-policy-sections.tsx`, `broadcasts-page.tsx`, `notification-templates-page.tsx`,
  `notification-events-page.tsx`, `notification-providers-page.tsx`
- `features/notifications/inbox/notifications-inbox-page.tsx`
- `features/chat/chat-home-page.tsx`, `features/settings/roles/role-detail-page.tsx`,
  `features/surveys/participants/survey-participants-page.tsx`

No git command was run at any point.
