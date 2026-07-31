# 03 — Build Change Map

**Date:** 2026-07-31 · **Scope:** Build module only · **Status:** Phase 3 deliverable, awaiting approval
**Companion:** `04-schema-design.md` (schema target + migration runbook)

**Standing constraints for every batch:**
- **No commits** (user directive, 2026-07-31). Work stays in the working tree until lifted.
- **No branch** — CLAUDE.md §0.11 beats brief H11 (H12 resolves the conflict).
- **LOC cap 500 hard / 300 target** — CLAUDE.md §9 beats brief H9's 600 (lower wins).
- **H3 is the governing rule.** This module mostly works. Every intentional break is listed in §4.
- `typecheck + lint + build` green before the next batch. Baseline verified green in both repos.

Legend — **Sev:** P0 security/data · P1 correctness/perf · P2 quality · P3 hygiene.
**V:** ✓ = orchestrator-verified against source · ~ = lane-reported, verify before editing.

---

## 1. Change map

### Batch 1 — Backend security (no schema, no UI, no migration)

| ID | Layer | Target file:line | Cat | Sev | V | Current | Problem (rule) | Fix | Breaking? | Blast radius | Dep |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1-01 | API | `build/projects.controller.ts:142` | RBAC | P0 | ✓ | `@RequirePermission("build:view")` on `POST :projectId/members` | Write gated by read; §21, H6 | → `"build:manage"` | **Yes** — `build:view`-only users lose add-member | 1 endpoint | — |
| B1-02 | API | `build/projects.controller.ts:153` | RBAC | P0 | ✓ | same on `DELETE :projectId/members` | " | → `"build:manage"` | Yes | 1 | — |
| B1-03 | API | `build/projects.controller.ts:164` | RBAC | P0 | ✓ | same on `PATCH :projectId/members/:memberUserId` | " | → `"build:manage"` | Yes | 1 | — |
| B1-04 | API | `build/projects.controller.ts:185` | RBAC | P0 | ✓ | same on `POST :projectId/custom-states` | " | → `"build:manage"` | Yes | 1 | — |
| B1-05 | API | `build/projects.controller.ts:196` | RBAC | P0 | ✓ | same on `PATCH …/custom-states/:stateId` | " | → `"build:manage"` | Yes | 1 | — |
| B1-06 | API | `build/projects.controller.ts:208` | RBAC | P0 | ✓ | same on `DELETE …/custom-states/:stateId` | " | → `"build:manage"` | Yes | 1 | — |
| B1-07 | API | `build/projects-automations.controller.ts:33` | RBAC | P0 | ✓ | same on `POST :projectId/automations` | " | → `"build:manage"` | Yes | 1 | — |
| B1-08 | API | `build/projects-automations.controller.ts:44` | RBAC | P0 | ✓ | same on `PATCH …/:automationId` | " | → `"build:manage"` | Yes | 1 | — |
| B1-09 | API | `build/projects-automations.controller.ts:55` | RBAC | P0 | ✓ | same on `DELETE …/:automationId` | " | → `"build:manage"` | Yes | 1 | — |
| B1-10 | API | `build/projects-by-id.controller.ts:43` | RBAC | P0 | ✓ | same on `PATCH :projectId` (update project) | " | → **`"build:update"`** (catalogued `permissions/shared.ts:48`, enforced 0×) | Yes | 1 | — |
| B1-11 | API | `build/projects-webhooks-dispatch.service.ts:106` | Security | P1 | ✓ | `fetch(endpoint.url)` — no allowlist/blocklist | SSRF; §20 A07 | Resolve+validate URL: block RFC1918, loopback, link-local `169.254.0.0/16`, IPv6 ULA; re-check after redirect | No | webhook delivery | — |
| B1-12 | API | `build/projects-webhooks.controller.ts:70` | Perf | P1 | ~ | `await sendTest(...)` in request path, 10s timeout | Blocks worker; brief API §11 | Queue it, return 202 | Minor UX | test button | B1-11 |
| B1-13 | Billing | `billing/plan-limits.service.ts:153` | Correctness | P0 | ✓ | counts `project_automations` toward paid quota | Charging for a feature that never runs (§P0-2) | Remove from the `automations` count until B13 lands | No | quota math | — |

> **Note on B1-01…B1-10:** services also call `assertCanManageProject`, so exploitability depends on
> that helper. The guard is the stated contract and it is wrong — fix at the decorator. The same
> files already use `build:manage` for labels (`:94,:104,:114,:225`) and `build:create` for creates
> (`:66,:77`), which is what proves this is inconsistency rather than design.

### Batch 2 — Verified deletions (frontend routes only)

| ID | Layer | Target | Cat | Sev | V | Problem | Fix | Breaking? | Dep |
|---|---|---|---|---|---|---|---|---|---|
| B2-01 | Route | `build/[projectId]/pages/` | Dead | P2 | ✓ | `error.tsx`+`loading.tsx`, **no `page.tsx`** → unroutable | Delete directory | No | — |
| B2-02 | Route | `build/settings/layout.tsx` | Dead | P3 | ✓ | no-op `return <>{children}</>` | Delete; parent layout applies | No | — |
| B2-03 | Route | `build/[projectId]/workload/page.tsx` + its `loading.tsx` | Redirect-only | P2 | ✓ | redirects to `?view=workload`; loading never reached | Move to `next.config` redirect | No (URL preserved) | — |
| B2-04 | Route | `build/page.tsx` ↔ `build/all/page.tsx` | Structure | P2 | ✓ | `/build` re-exports from `/build/all`, but PAGES.md:411 makes `/build` canonical | **Invert**: move impl to `build/page.tsx`, make `/build/all` the thin re-export | No | — |

> **Rejected deletions** (a lane proposed these; both would remove live routes):
> `build/customers/page.tsx` is the **correct** App Router re-export pattern per CLAUDE.md §9 — keep.
> `build/page.tsx` must not be deleted — it *is* `/build`; invert instead (B2-04).

### Batch 3 — Shared-primitive consolidation (mechanical, no logic change)

Highest value-to-risk ratio in the module. **Every primitive already exists** — nothing new is built,
satisfying "reuse before you create".

| ID | Layer | Target | Cat | Sev | V | Current | Fix | Blast radius |
|---|---|---|---|---|---|---|---|---|
| B3-01 | UI | 38 files in `features/build` | Duplication | P1 | ✓ | inline `AlertDialog`+Title+Description+Footer; only `members-page.tsx:612` uses shared | Swap to `components/ui/confirm-dialog.tsx` | 38 files, ~-900 LOC est. |
| B3-02 | UI | 7 badge files (`shared/status-badge`, `approvals/`, `managed-products/`, `pm-workspaces/`, `portfolios/`, `meetings/`) | Duplication | P2 | ✓ | parallel implementations | Generic badge parameterised by status→style/label map, over `components/ui/semantic-badge.tsx` | 7 files |
| B3-03 | UI | `teams/workspace-member-picker.tsx` (145 LOC, 1 importer) | Duplication | P2 | ~ | reimplements Command+Popover+Avatar | Use `components/members/member-picker.tsx` `scope="workspace"`; delete local | 1 importer |
| B3-04 | UI | `project-list/project-card-inline-fields.tsx:15` | Duplication | P2 | ~ | raw `Calendar`, own date picker | Use `components/ui/date-picker.tsx` (has year bounds, disablePast, a11y) | 1 file |
| B3-05 | UI | 3 inline priority colour maps | Duplication | P3 | ~ | copies of `shared/priority-badge.tsx` | Import canonical | 3 files |

> **Correction carried from Phase 1:** `ManagedProductStatusBadge` / `PmWorkspaceStatusBadge` are
> **not** byte-identical — they differ by status enum. B3-02 needs a generic, not a deletion.

### Batch 4 — Mobile/responsive conformance

| ID | Layer | Target | Cat | Sev | V | Current | Fix |
|---|---|---|---|---|---|---|---|
| B4-01 | UI | 25 files raw `<Popover>` vs 9 using `ResponsivePopover` | Responsive | P1 | ✓ | desktop Popover on mobile | Adopt `components/ui/responsive-popover.tsx` (Drawer < `md`). Exempt: 1–3 item menus, date pickers |
| B4-02 | UI | `project-create/steps/step-basics.tsx:306`; `settings/project-members-section.tsx:204` | Responsive | P2 | ✓ | `w-[var(--radix-popover-trigger-width)]` clips long labels | → `min-w-[…]` |
| B4-03 | UI | `bugs/bugs-page.tsx:261-279` | Responsive | P2 | ~ | fixed `w-32`/`w-28` filter Selects, no mobile stacking | Match `/users` filter pattern |
| B4-04 | UI | `ai/ai-chat-panel.tsx:80,107,168,317` | Tokens | P3 | ✓ | `rounded-2xl` in shell (AP-4) | → `rounded-lg`/`rounded-xl` per UI-UX §4 |
| B4-05 | UI | 3 `SheetContent` without `p-0` | Tokens | P3 | ✓ | AP-1 double padding | Add `p-0 flex flex-col gap-0` |

> Do **not** touch pages already responsive. AP sweep found **zero** gradient-text, ad-hoc `<h1>`,
> inline hex, `min-h-screen`, or banned icon libraries — this module is largely conformant.

### Batch 5 — Frontend data layer

| ID | Layer | Target | Cat | Sev | V | Current | Fix |
|---|---|---|---|---|---|---|---|
| B5-01 | Hooks | 44 of 50 files in `hooks/api/build/` | RBAC gate | P1 | ✓ | no `enabled` gate (e.g. `useProjects` `projects.ts:113` → `/build`) | `enabled: useCan("<exact backend key>") && (options?.enabled ?? true)`. **Combine, never re-declare after `...options`** |
| B5-02 | Provider | `providers/query-provider.tsx:17` | Perf | P1 | ~ | `retry: 1`, no 4xx guard | Don't retry 4xx; every 403 currently fires twice |
| B5-03 | Hooks | `tickets.ts:96-110,302-316` | Perf | P1 | ~ | create/delete blanket-invalidate `projectReports.all` | Gate per-field; §11 forbids invalidating heavy aggregates on every change |
| B5-04 | Hooks | 5 key factories with trailing `undefined` | Correctness | P2 | ~ | breaks prefix invalidation | Omit the slot |
| B5-05 | Hooks | 7 inline query keys | Consistency | P2 | ~ | not in factory | Move to factory |

> `...options` is spread **last** in these hooks, so the historical clobber bug is **absent** — do not
> "fix" what isn't broken, and do not introduce it while doing B5-01.

### Batch 6 — LOC splits (29 files > 500)

| ID | Target | LOC | Split into |
|---|---|---|---|
| B6-01 | `features/build/views/list-view.tsx` | 886 | `ListViewItem` + `ListViewGroup` + drag context |
| B6-02 | `features/build/tickets/create-ticket-dialog.tsx` | 743 | attachments / AI / properties sections |
| B6-03 | `app/(authenticated)/build/[projectId]/page.tsx` | 707 | extract filter/URL-sync into a hook |
| B6-04 | `features/build/ai/ticket-detail-ai.tsx` | 701 | per-action modules |
| B6-05 | `app/(authenticated)/build/[projectId]/automations/page.tsx` | 686 | move `AutomationCard`/`RemoveButton`/inline Zod → `features/build/automations/` |
| B6-06 | `backend/build/projects.service.ts` | 682 | split by responsibility |
| B6-07…B6-29 | remaining 23 files 500–658 | — | same principle; split by concern, never to hit a number |

Route files must end ≤500 (§9). `app/` keeps only route files; components move to `features/build/`
and Zod schemas to `*-schema.ts` (§7, §9).

### Batch 7–11 — Schema (see `04-schema-design.md` §5 for full runbook)

| ID | Migration | Cat | Sev | V | Change | Breaking? | Dep |
|---|---|---|---|---|---|---|---|
| B7-01 | M1 | Tenancy | P0 | ✓ | `project_members.org_id` + composite FK/unique + `(org_id,user_id)` index | No (expand→backfill→enforce) | — |
| B7-02 | M1 | Tenancy | P1 | ✓ | same for `ticket_checklist_items`, `project_template_tickets` | No | — |
| B7-03 | — | Tenancy | P1 | ✓ | add `org_id` to WHERE in `projects.service.ts:598`, `projects-members.service.ts:343-355` | No | B7-01 |
| B8-01 | M3 | Unbounded | P0 | ✓ | split `feedbucket_submissions.console_logs/network_logs` → child table + ingest cap | No (dual-write) | — |
| B8-02 | M3 | Hot/cold | P1 | ~ | `project_whiteboards.data`, `pages.content` → sibling content tables | No | B8-01 |
| B9-01 | M2 | Money | P1 | ~ | `projects.budget`, `project_members.hourly_rate` → minor units + ISO-4217 | No (dual-read) | B7-01 |
| B10-01 | M4 | Capacity | P1 | ✓ | PK `serial`→`bigint` on `ticket_activity_log`, `webhook_deliveries` first, then 4 more | No, but **highest-risk batch** | — |
| B10-02 | — | Capacity | P1 | ✓ | retention/pruning for activity log, webhook deliveries, daily snapshots (H8) | No | B10-01 |
| B11-01 | M5 | Index | P2 | ✓ | DROP `idx_tickets_org_project` (prefix dup of `…_status`) | No | — |
| B11-02 | M5 | Index | P1 | ✓ | ADD GIN trgm on `projects.name` — `ILIKE '%x%'` has no index today (brief §17) | No | — |
| B11-03 | M6 | Dead | P2 | ✓ | DROP `reports` table (0 query refs) after bare-import re-check | No | — |

### Batch 12–14 — Deferred / blocked

| ID | Item | Sev | Status |
|---|---|---|---|
| B12-01 | Migrate `project_automations` onto the generic `modules/automation/automation.service.ts` engine (approved default) | P0 | Ready after B1-13 |
| B13-01 | Wire `ModuleGuard` into 39 Build controllers | P0 | **BLOCKED** — needs the `org_modules` query (§3) |
| B14-01 | Wire `test:e2e` into a real command; fix stale assertions | P1 | Enables Phase 6 |

### Deferred to Phase 5 (prove-then-delete)

`GET build/resource-allocation`, `build/programs/*`, `POST :projectId/reports/snapshot`,
`GET /whiteboards` (hub missing the `build/` prefix) — all reported 0 frontend callers, **unverified**.
Each needs symbol + path + **bare side-effect import** greps before deletion.

---

## 1a. Batch 1 — EXECUTED 2026-07-31

| ID | Status | Evidence |
|---|---|---|
| B1-01…B1-06 | ✅ Done | `projects.controller.ts` — 6 write decorators `build:view` → `build:manage` |
| B1-07…B1-09 | ✅ Done | `projects-automations.controller.ts:33,44,55` → `build:manage` |
| B1-10 | ✅ Done | `projects-by-id.controller.ts:43` → `build:update` |
| B1-10a | ✅ Added | `role-templates.constants.ts` — granted `build:update` to `project_manager` (it was granted to **no** role; without this, PATCH would have 403'd for everyone but owners) |
| B1-11 | ✅ Done | New `webhook-url-guard.ts` + applied in **both** `attempt()` and `sendTest()`; `redirect: "error"` on both fetches; 19 unit tests |
| B1-12 | ⏸ Deferred | Queueing the test-webhook needs queue infrastructure I have not verified exists. Deferring beats inventing it. Still open. |
| B1-13 | ✅ Done | `plan-limits.service.ts:153` + `:282` — `project_automations` removed from the paid automation quota |

**Verification**
- `tsc`: **14 errors, identical to baseline, 0 in changed files.**
- `eslint` on all 8 changed files: **exit 0**.
- `jest` build+billing+rbac: **251/252**; the 1 failure (`build-execution/whiteboard-access.spec.ts`) is
  **pre-existing** — file unmodified, imports nothing changed, and asserts platform-admin behaviour
  while passing no platform-admin flag (stale since the "remove platform admin role dependency" commit).
- New `webhook-url-guard.spec.ts`: **19/19**. It caught a real bug in the guard during development —
  `new URL()` normalises `::ffff:127.0.0.1` to `::ffff:7f00:1`, which the first implementation let through.

**Baseline correction.** Phase 1 reported both repos "typecheck green (exit 0)". That was **wrong for the
backend**: the command was piped (`pnpm typecheck | tail`), so bash reported `tail`'s exit code, not
`tsc`'s. True state: **frontend green (0 errors)**; **backend has 14 pre-existing errors in 7 files**
(`automation/*`, `users/*`, `organization/invitations.service.ts`, 2 seed scripts). `HEAD` itself is
broken — `automation.module.ts:7` imports `../feature-flags/feature-flags.module`, which was deleted in
an earlier commit. All 14 are outside Build. Working baseline is now **"14 errors / 7 files, none in Build"**,
re-checked after every batch.

**B1 is less breaking than §4 estimated.** The frontend *already* gates these actions correctly —
`useCan("build:update")` at `project-card.tsx:55`, `project-table.tsx:107,191`; `useCan("build:manage")`
at `kanban-add-column.tsx:34`, `step-team.tsx:19`, `use-can-manage-project.ts:8`. The UI was **stricter
than the API**: `build:view`-only users never saw these controls but could still call the endpoints
directly. So no frontend change is required, and the only users affected are direct API callers —
which is precisely the vulnerability. This also confirms the decorators were the defect, not the design.

---

## 1b. Batch 2 — EXECUTED 2026-07-31

| ID | Status | Evidence |
|---|---|---|
| B2-01 | ✅ Deleted | `build/[projectId]/pages/` (error.tsx + loading.tsx, no page.tsx → unroutable). Confirmed no nested routes; all `/pages` grep hits were unrelated KB imports (`@/hooks/api/kb/pages`) |
| B2-02 | ✅ Deleted | `build/settings/layout.tsx` — no-op passthrough, only a default export. `/build/settings/integrations` **verified still routed** after removal |
| B2-03 | ✅ Replaced | `build/[projectId]/workload/` deleted; URL preserved via `next.config.ts` redirect → `/build/:projectId?view=workload`. Nav already pointed at `?view=workload` (`project-nav-config.ts:194`), so the route was orphaned |
| B2-04 | ❌ **REJECTED** | See below |

**B2-04 rejected — the change map was wrong.** `/build/all` is referenced in six places
(`quick-create-groups.ts:71`, `all-work-page.tsx:216`, `command-center-jump-links.tsx:41,109`,
`command-center-page.tsx:97,146`), so **`/build/all` is the canonical route in code** and `/build` is a
one-line alias — a legitimate App Router pattern, not a defect. Inverting would relocate a 470-line
client component for zero user benefit and real regression risk (H3). The actual defect is the stale
`PAGES.md:411` claim, which already says `/projects/*` throughout. Fix the doc, not the code.

**Verification**
- `pnpm type-check`: **exit 0, 0 errors.**
- `pnpm build`: **exit 0.** Route table confirms `/build`, `/build/all`, `/build/settings/integrations`
  all present and the three deleted routes absent.
- Note: the first build failed on stale `.next/dev/types` referencing the removed routes. That is a
  generated-cache artifact, not a source error — `rm -rf .next` then rebuild is clean. Worth knowing:
  after deleting a route, an incremental typecheck reports phantom errors until `.next` is cleared.

---

## 1c. Batch 3 — EXECUTED 2026-07-31 (shared-primitive consolidation)

**34 of 38 files converted** to the shared `ConfirmDialog`; 4 skipped for specific behavioural reasons.

| Scope | Result |
|---|---|
| Controlled dialogs (4 parallel agents, exclusive file ownership) | 29 converted, 4 skipped |
| Trigger-based dialogs (orchestrator) | 4 converted |
| Reference implementation (orchestrator) | 1 converted (`releases-page.tsx`, 366→342) |
| Files still inlining `AlertDialog` | **38 → 4** |
| Files importing shared `ConfirmDialog` | **1 → 35** |

**`ConfirmDialog` was extended rather than forcing 4 state lifts.** The trigger-based sites were
uncontrolled Radix dialogs. Instead of adding `useState` to each, the shared component gained an
optional `trigger` via a **discriminated union** (CLAUDE.md §7):
```ts
type ConfirmDialogProps = Base & (
  | { trigger: ReactNode; open?: never; onOpenChange?: never }
  | { trigger?: never; open: boolean; onOpenChange: (open: boolean) => void }
);
```
This makes "both owners of open state" unrepresentable. **Verified backward compatible against all
28 ConfirmDialog consumers outside Build** (accounting, crm, organization, settings, blog, hr, sign,
users, calendar) — zero type errors.

**Skips (all correct — a forced conversion would have changed behaviour):**

| File | Reason |
|---|---|
| `drafts/comment-drafts-page.tsx` | `AlertDialogAction asChild` + `LoadingButton loadingText="Clearing…"` — the visible pending text would be lost |
| `feedbucket/widget-setup-sheet.tsx` | Bare `LoadingButton` with no `AlertDialogAction`, so the dialog intentionally stays open during `mutateAsync`; `AlertDialogAction` closes on click |
| `project-list/project-card-dialogs.tsx` | `handleArchiveConfirm` is `(e: MouseEvent) => void` and calls `e.preventDefault()` to suppress auto-close; `onConfirm` is `() => void` |
| `sidebar/delete-project-dialog.tsx` | Type-to-confirm `<Input>`, JSX description, `disabled={!confirmMatches}` — not a simple confirm |

**Verification:** `pnpm type-check` **exit 0, 0 errors** · `eslint features/build` **exit 0**
(2 pre-existing warnings unrelated to this work) · `pnpm build` **exit 0, 582 routes**.

---

## 1d. Page inventory — not-required vs needed (user directive, 2026-07-31)

Evidence-driven, not guesswork: every sidebar/project-nav `href` was diffed against the 68 routes in
the production build output, and every backend `build*` controller prefix against the frontend hooks.

**No broken nav links.** Every declared Build nav href resolves to a real built route.

**Pages removed as not required** (Batch 2): `[projectId]/pages/` (unroutable),
`settings/layout.tsx` (no-op), `[projectId]/workload/` (redirect-only → `next.config`).
**Rejected as wrongly flagged:** `customers/page.tsx` and `build/page.tsx` — both are live routes.

**Page ADDED as needed: `/build/programs`.** ✅ Done.

Programs was a **complete backend vertical with zero UI** — the single largest capability gap in the
module:

| Evidence | Value |
|---|---|
| Backend endpoints (`build-portfolios/programs.controller.ts:39-100`) | **7** — list, get, create, update, delete, link project, unlink project |
| Catalogued permissions | `build:programs:view`, `build:programs:manage` (`permissions/build.ts:247,253`) |
| Frontend hooks / components / routes before | **0 / 0 / 0** |
| Tables | `project_programs`, `program_projects` |

Portfolios has the identical shape and *does* have a page, so the omission was an oversight, not a
decision. Shipped as a full vertical mirroring Portfolios exactly:

- `types/projects/portfolios.ts` — `Program`, `ProgramDetail`, `CreateProgramInput`, `UpdateProgramInput`
  (matched to the backend `select()` projection and Zod schemas, not hand-guessed)
- `lib/query-keys.ts` — `projects.programs.{list,detail}` factory entries
- `hooks/api/build/programs.ts` — 6 hooks, **RBAC-gated from the start**
  (`enabled: useCan("build:programs:view")`, matching the exact `@RequirePermission` key)
- `features/build/programs/` — page (369 LOC), form sheet (240), `program-form-schema.ts` (§7: Zod in
  its own file)
- `app/(authenticated)/build/programs/{page,loading}.tsx` — skeleton mirrors the real table layout
- Sidebar entry gated on `build:programs:view`

**Reuse over creation:** Programs share the Portfolio status/health enums, so
`PortfolioStatusBadge` / `PortfolioHealthBadge` are reused rather than duplicated — no new badge
components (this is the §B3-02 duplication class, not added to).

**Verification:** type-check **0 errors** · eslint **exit 0** · build **exit 0**, `/build/programs`
registered, route count **582 → 583**.

**Still UI-less, deliberately not built** (analytics/infra, not pages):
`GET build/resource-allocation` (a widget, not a page), `POST :projectId/reports/snapshot` (job-shaped),
`GET /whiteboards` hub (project-scoped whiteboard page already exists; the hub also lacks the `build/`
route prefix — see the deletion candidates in §1).

---

## 1e. Batches 4 & 5 — EXECUTED 2026-07-31

### Batch 4 — responsive / mobile conformance

| ID | Status | Evidence |
|---|---|---|
| B4-01 | ✅ Done | **Raw `<Popover>` files 25 → 9; `ResponsivePopover` files 9 → 26.** 3 parallel agents + orchestrator. Below `md` these now render as Drawers. |
| B4-02 | ✅ Done + root fix | See "structural root" below |
| B4-03 | ✅ Done | `bugs/bugs-page.tsx` filter selects now use `FILTER_SELECT_TRIGGER` + `h-9`, matching the `/users` reference and the §14 living rule |
| B4-04 | ⏸ Deferred | `ai/ai-chat-panel.tsx` `rounded-2xl` ×4 — these are **chat message bubbles** (`rounded-2xl rounded-br-md`), a deliberate chat idiom. AP-4 targets cards/panels. Flattening to `rounded-lg` would visibly degrade a working surface (H3) for nominal compliance. Raising rather than silently churning. |
| B4-05 | ❌ **Not a defect** | All 3 `SheetContent` already carry `p-0`. The Phase 1 finding was a **false positive** — a line-scoped `grep -v "p-0"` missed it because the className sits on a different line from `<SheetContent`. Zero AP-1 violations exist. |

**Exemptions applied correctly by the agents** (all verified against the living rule): colour-swatch
pickers (`status-row`, `team-form-sheet`, `kanban-column-header` `ColumnColorPicker`), date pickers
(which go through the `<DatePicker>` wrapper, not raw `Popover`), 1–3 action menus
(`ticket-detail-actions` delete confirm), single-field inline edit forms, and `filter-command-menu`
(explicitly exempt — it already has a custom mobile Drawer).

**Structural root fix (better than the change-map's per-file plan).** One agent reported it could not
apply the width rule because the offending value lived in a *shared constant*, and another patched
around it inline. Both symptoms, one cause — fixed at the source in `components/ui/field-control.ts`:

```
FIELD_POPOVER_CONTENT_CLASS         "w-[--radix-popover-trigger-width]"
FIELD_SEARCH_POPOVER_CONTENT_CLASS  "min-w-[…] w-[…]"     ← the w- defeated the min-w-
    →  "min-w-[var(--radix-popover-trigger-width)] w-auto max-w-[var(--radix-popover-content-available-width)]"
```
Plus `components/ui/combobox.tsx:117`, the last remaining fixed-width popover. Now: at least trigger
width, grows with content, never exceeds the viewport. **Every consumer is fixed at once**
(`member-picker`, `ai-field-popover-*`, `ticket-parent-control`, `ticket-detail-ai`, combobox) instead
of two files being patched and the rest left broken.

### Batch 5 — data layer

| ID | Status | Evidence |
|---|---|---|
| B5-01 | ✅ Done | **Hook files with `useCan` 6 → 13; 25 queries gated.** Orchestrator did `projects.ts` (4); an agent did `reports.ts` (6 × `build:view`), `all-work.ts`, `ticket-search.ts` (`build:tickets:view`), `advanced.ts` (7), `tickets.ts` (6). |
| B5-02 | ✅ Done | `query-provider.tsx` — `retry: 1` → `shouldRetryQuery`, which never retries 4xx except 408/429 |
| B5-03 | ❌ **Rejected** | See below |

**Permission keys were derived, not guessed.** I generated the endpoint→permission map by parsing
every `@RequirePermission` decorator across all 39 `build*` controllers and handed the agent that map
with an explicit "do not invent a key" instruction. This is the failure mode recorded in
[[audit-agent-identifier-guesses]] (6 of 13 keys guessed wrong in a prior audit).

**Clobber-bug check passed.** All 4 post-spread `enabled` sites fold in `options?.enabled ?? true`; a
scripted scan for `enabled:` within 2 lines after `...options` that ignores `options?.enabled` returned
**empty**. Mutations were left untouched.

**B5-03 rejected — the lane was wrong.** It claimed ticket create/delete "blanket-invalidate
`projectReports.all`". In fact `tickets.ts:270-280` **already** gates report invalidation behind
`affectsSprintAggregates`, which is the correct pattern. For create/delete, invalidating aggregates is
*correct* — a ticket appearing or disappearing genuinely moves burndown, velocity and CFD. And
TanStack only refetches **active** queries, so an unmounted reports page costs nothing. Changing this
would add complexity and lose correctness.

**Verification (both batches):** `pnpm type-check` **exit 0, 0 errors** · `eslint` **exit 0**
(0 errors, 6 pre-existing warnings) · `pnpm build` **exit 0, 583 routes**.

---

## 1f. Batch 6 (partial) — LOC splits, EXECUTED 2026-07-31

Prioritised the three files that were **principled §9 violations** rather than merely long — two `app/`
route files defining components and inline Zod schemas (`app/` must hold route files only), and the
backend DTO god-file.

| ID | File | Before → After | Extracted into |
|---|---|---|---|
| B6-05 | `app/…/build/[projectId]/automations/page.tsx` | **686 → 10** | `features/build/automations/`: `automation-schema.ts` (32), `remove-button.tsx` (23), `new-automation-button.tsx` (19), `automation-card.tsx` (169), `automation-sheet.tsx` (307), `automations-page.tsx` (246) |
| B6-03 | `app/…/build/[projectId]/page.tsx` | **707 → 207** | `features/build/views/use-board-url-state.ts` (460), `project-board-content.tsx` (284) |
| B6-06b | `backend/…/build/dto/projects.schemas.ts` | **653 → 6 (barrel)** | `project-core` (154), `project-state` (51), `ticket` (315), `template` (35), `analytics` (12), `roadmap` (103) |

**The DTO split used a barrel, which is why it was zero-risk:** `projects.schemas.ts` became
`export * from …`, so **all 25 existing importers needed no change at all**. No import churn, no
chance of a missed call site.

**One deliberate deviation, disclosed by the agent and accepted.** In the board split, every one of the
19 `useCallback`/`useMemo` dependency arrays was preserved verbatim except `handleBulkUpdate`: its body
called `setSelectedIds(new Set())`, and once selection state moved into the hook that became
`handleClearSelection()`, which was added to the deps. `handleClearSelection` is a `useCallback(…, [])`
so it is provably stable — recomputation frequency is unchanged. Recording it because a silent
dependency-array change is exactly the kind of thing that causes a subtle render regression.

**Progress:** files over the 500 cap **29 → 26**; the largest `app/` route file is now 496
(`webhooks/page.tsx`), down from 707. Remaining >500 offenders are all in `features/build/`
(`list-view.tsx` 886, `create-ticket-dialog.tsx` 743, `ticket-detail-ai.tsx` 701, …) plus
`db/schema/build/tasks.ts` (593), which is a cohesive table-definition file and a reasonable exception.

**Verification:** frontend `pnpm type-check` **exit 0, 0 errors** · backend `pnpm typecheck` **14 errors
— exactly the pre-existing baseline, 0 in `modules/build/**`** · `pnpm build` **exit 0, 583 routes**,
with `/build/[projectId]`, `/build/[projectId]/automations` and `/build/programs` all confirmed present.

---

## 1g. B12 (automations) — ASSESSED, DEFERRED with reason

**Status: blocked on DB access, not on design.** The immediate financial harm is already fixed
(B1-13 stopped `project_automations` counting toward the paid quota). What remains is that users can
still create Build automations that never fire.

**What the assessment found:**

- The generic engine `modules/automation/automation.service.ts` (`runAutomationsForEvent`) is
  healthy and used by **~20 call sites** across HR, CRM, support, e-sign, expenses and onboarding.
- It reads the `automation_rules` table. Build's CRUD writes a **different** table,
  `project_automations`, which no runner ever reads.
- `AUTOMATION_TRIGGERS` (`db/schema/automation/rules.ts:5`) already has `ticket.*` triggers — but those
  are **Support** tickets (`support_tickets`), emitted from `support-tickets.service.ts:235,352,357`.
  Build tickets are a different entity (`tickets`). So there is **no existing trigger Build can reuse**.

**Therefore a real fix is four coupled changes:**
1. Add Build trigger constants (e.g. `build.ticket.created`, `build.ticket.status_changed`) to `AUTOMATION_TRIGGERS`.
2. Emit them from the Build ticket create/update services.
3. **Migrate existing `project_automations` rows into `automation_rules`** — mapping trigger names,
   conditions and actions across two different shapes.
4. Retire the Build-specific table, CRUD and DTOs.

Step 3 is a data migration: under H1 it needs a reviewed reversible script with dry-run row counts, and
this session has no DB connection.

**Why not ship steps 1, 2 and 4 now:** doing so would make the engine *capable* of Build events while
every existing user rule still sits in the wrong table, silently dead. That is a half-fix that looks
complete and isn't — worse than the current honest state. Deferring whole.

**Sequencing when unblocked:** run step 3's dry-run counts first
(`SELECT count(*), trigger_event FROM project_automations GROUP BY 2;`). If the table is empty, the
migration collapses to steps 1/2/4 and becomes low-risk.

---

## 2. Target folder tree (changes only)

```
backend/src/modules/build/
  projects.service.ts            → split (682 → ≤300 each)
  projects-members.service.ts    → split (619)
  dto/projects.schemas.ts        → split by domain (653): ticket / roadmap / template / checklist
  projects-webhooks-dispatch.service.ts  + url-guard.ts   (new, SSRF allowlist)

backend/src/db/schema/build/
  feedback.ts                    → misplaced: Feedbucket tables owned by the feedbucket module (§9)
  + feedbucket-submission-logs   (new child table, B8-01)
  core.ts                        → drop `reports` (B11-03)

frontend/features/build/
  automations/                   (new — from the 686-line route file)
  shared/grouping-sidebar.tsx    (new — merges project-list/ + my-work/ copies)
  views/list-view.tsx            → list-view-item.tsx + list-view-group.tsx + list-view.tsx
  teams/workspace-member-picker.tsx  → DELETE (use shared member-picker)

frontend/app/(authenticated)/build/
  page.tsx                       → becomes the implementation (B2-04)
  all/page.tsx                   → becomes the thin re-export
  settings/layout.tsx            → DELETE
  [projectId]/pages/             → DELETE (unroutable)
  [projectId]/workload/          → DELETE (→ next.config redirect)
```

**Shared contract location (brief §19), to define before Batch 1:** there is no shared package today —
the frontend hand-maintains types in `frontend/types/`. Recommendation: **defer**. Introducing a
contract package touches both repos (separate git repos) and every import, which is a large H3 risk
for no user-visible gain. Revisit after the schema batches settle. Recorded as an explicit deferral,
not an oversight.

---

## 3. Blocking question (one)

**B13-01 cannot proceed without this.** Please run:

```sql
SELECT module_key, enabled, count(*) FROM org_modules
WHERE module_key IN ('build','projects') GROUP BY 1,2;
```

- Rows say **`build`** → safe to wire `ModuleGuard`.
- Any row says **`projects`** → run `docs/schema-migration/rename-projects-to-build-data.sql` **first**;
  wiring the guard before that 403s every Build endpoint for every non-owner (owners bypass, so it
  looks fine to whoever tests it).

Everything else proceeds without it.

---

## 4. Intentional breaks (H3 register)

| Break | Batch | Who feels it | Justification |
|---|---|---|---|
| `build:view`-only users lose member/state/automation/project-edit mutations | B1 | Users holding only `build:view` | That is the vulnerability. Communicate before deploy; grant `build:manage` to roles that legitimately need it. |
| Webhook test returns 202 instead of a synchronous result | B1-12 | Webhook settings UI | Removes a 10s request-path block; UI polls |
| Plan quota drops (automations no longer counted) | B1-13 | Orgs near the automation limit | Correcting an overcharge; only ever loosens |
| `/build/[projectId]/workload` becomes a config redirect | B2-03 | Nobody — URL preserved | Removes an unreachable route file |

**No other breaks are planned.** Anything discovered mid-batch gets added here before it ships.

---

## 5. Risk register

| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R1 | Wiring `ModuleGuard` 403s all Build for non-owners | Med | **Critical** | B13 blocked on §3 query; owners bypass so smoke tests lie — test as a non-owner |
| R2 | PK widening (B10) locks a large table | Med | High | Own batch; rehearse on a restored copy; row counts before/after; start with the 2 danger tables |
| R3 | Tightening RBAC locks out real users | Med | High | Audit which roles hold `build:view` but not `build:manage` **before** B1; grant first, tighten second |
| R4 | 38-file ConfirmDialog swap changes behaviour | Low | Med | Purely mechanical; diff prop-by-prop; build+typecheck each file |
| R5 | Deleting "dead" code that's live via bare import | Med | High | Every deletion greps `import "…"` too — this exact trap bit a prior cleanup |
| R6 | Backfills time out on Neon | Med | Med | Chunked batches; `SET statement_timeout = 0` on heavy DO blocks; discrete migrations, never a monolith |
| R7 | Two repos drift (backend is separate git) | Med | Med | Any API change ships with its frontend change in the same batch (brief API §13) |
| R8 | Regression invisible because e2e specs don't run | **High** | High | B14 early; until then, manual cross-tenant + wrong-role checks per batch |
| R9 | Lane-reported (`~`) items are wrong | Med | Med | 6 of ~50 lane claims were already rejected. Verify every `~` row before editing |

---

## 6. Sequencing

```
B1 security ──► B2 deletions ──► B3 primitives ──► B4 responsive ──► B5 data layer ──► B6 LOC splits
      │                                                                                      │
      └──► B7 org_id ──► B9 money                                                            │
             └──► B8 unbounded JSONB                                                         │
      B10 PK widening (independent, high risk — own window)                                  │
      B11 indexes (independent)                                                              │
      B12 automations ◄── B1-13                                                              │
      B13 ModuleGuard ◄── BLOCKED on §3 query                                                │
      B14 e2e wiring (do early in practice — it is what makes Phase 6 meaningful) ◄──────────┘
```

Backend-security-first, schema after, cosmetics last — matching the sequencing that has worked on
prior modules in this repo.

---

## 7. Definition of done per batch

Typecheck ✓ · Lint ✓ · Build ✓ · no forced types (`any`/`as unknown as`/`@ts-ignore`/`!`) ·
tenant-scoped in the WHERE clause · RBAC gate matches the backend decorator exactly · no file over
500 LOC · `PAGES.md` updated · intentional breaks recorded in §4 · **not committed** until the
directive is lifted.
