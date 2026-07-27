# StreamlineOS Cleanup Pass — dead code, dead API, dead schema

> Paste this file as the task prompt. Fill in the two lines below. One mode, one target,
> per run. Do not run repo-wide.

**MODE:** `A` (backend module) or `B` (frontend page)
**TARGET:** `<MODULE>` for Mode A · `<ROUTE>` for Mode B

---

## Module inventory (from the live Modules switcher)

Thirteen tiles ship today. **Display name is not the code name** — confirm every code name
against `sidebar-nav-items.ts`, the product-switcher config and `org_modules` values before
using it. Never guess a folder or module key.

| Display name | Subtitle shown | Likely code name — **verify** | Mode A eligible |
|---|---|---|---|
| Home | Overview & activity | — (always on, not entitled) | No |
| CRM | Leads, deals & contacts | `crm` | Yes |
| HRMS | People & payroll ⚠️ | `hr` / `hrms` | Yes |
| Product Management | Plan & deliver work | `product-management` | **Blocked** |
| Timesheets | Track, approve & bill time | ? | Yes — after scoping |
| Inventory | Stock & orders | `inventory` | Yes |
| Finance | Accounts & books | `accounting` ? | Yes |
| Helpdesk | Tickets & support | `support` ? | Yes |
| Documents | Knowledge base | `kb` ? | Yes |
| Surveys | Surveys & feedback | ? | Yes — after scoping |
| Administration | Settings & access | `administration` | **Blocked** |
| Payroll | Runs, payslips & compliance | `payroll` | Yes |
| SignOS | Envelopes & e-signatures | ? | Yes — after scoping |

**Blocked (uncommitted wave work):** `access` · `organization` · `product-management` ·
`directory` · `administration`. Do not run this prompt against them until that work is
committed and its migrations applied.

**Billing is not a module.** Per §7.2 it is an Administration subsection, not a switcher
tile. Do not treat it as a Mode A target.

### Known defects visible in the current switcher — fix when in scope

1. ⚠️ **HRMS subtitle says "People & payroll"** while Payroll is a separate tile. §7.1
   requires HRMS to drop "payroll" from its description. It misleads
   Payroll-without-HRMS customers into thinking HRMS is a prerequisite. Copy-only fix.
2. **Timesheets, Surveys and SignOS are absent from the redesign plan** (it lists PM, CRM,
   Inventory, HRMS, Payroll, Accounting, Support, KB "and others"). Each still needs: a
   Module Admin role, a module Access screen, module-optional empty states, an entitlement
   entry, and confirmation it owns no duplicate person/project/party master. **Timesheets
   is the priority** — it likely references Workforce/Engagement and PM Project data and is
   a strong candidate for the same conflation class as products-in-two-modules.
3. **Verify tile visibility rules** — §7.7 requires the switcher to show only enabled and
   entitled modules, plus a distinct locked/disabled affordance for Owner/Org Admin only.
   If all thirteen render regardless of entitlement, that is a defect to report, not fix
   in this pass.

---

## Requirement coverage map

Every numbered requirement from the task brief, and where it is enforced. Nothing dropped.

| # | Requirement | Where enforced |
|---|---|---|
| 1 | Schema efficient at millions of rows; no JSONB arrays for lifecycle entities; remove unnecessary schema | § Schema hunt list · `CLAUDE.md` §19 |
| 2 | API efficiency: projections, limits/offsets, caching + invalidation, status codes, `Promise.all`, Zod, DTOs, role validation | § API hunt list · `CLAUDE.md` §11, §18, §19, §20, §22 |
| 3 | Proper naming; fix at the right layer, not by bolting on checks | § Minimal-fix principle |
| 4 | Hooks in own files; one API client; TanStack for all calls; `refetchOnWindowFocus` global; debounce inputs; no forced types; cache-update over invalidate | Mode B steps 2–4 · `CLAUDE.md` §10, §11 |
| 5 | Find repeated patterns → one reusable component; reuse existing before creating | Mode B step 5 · `CLAUDE.md` §0.2, §8 |
| 6 | Responsive; mobile Drawer instead of Popover/Sheet/Dialog; popover min-width and trigger-matched width | Mode B step 6 · `CLAUDE.md` §14 living rules (2026-07-19, 2026-07-23) |
| 7 | Empty/error states use full width and height | Mode B step 6 · `CLAUDE.md` §15 |
| 8 | Delete redirect-only pages; fix routes; typed; Zod; real error messages | Mode B step 1 · § Deletion classes |
| 9 | No forced types; page line cap; folder structure; shared code to common; skeletons mirror the real layout | Mode B steps 5, 7 · `CLAUDE.md` §7, §9, §15 · **see conflict note** |
| 10 | Remove unnecessary files, types, Zod schemas, components; reduce bundle | Both modes, Phase 4 |
| 11 | Test every API before claiming done; ask questions | Phase 0 · Phase 5 check 5 |

**Conflict note (resolve before starting):** the brief says max 600 lines per page;
`CLAUDE.md` §9 says target ≤300, hard-review at 500. This prompt applies **§9 (stricter)**.
Raise it in Phase 0 if you want 600.

---

## PHASE -1 — Preconditions

1. `git status` clean, or every uncommitted change is intentional and known to me.
   **Uncommitted schema work spanning multiple files → STOP and report.** Never run a
   deletion pass on top of an unlanded diff.
2. No other agent/session editing this target. If unsure, ask.
3. Build, lint, typecheck green *before* any change. Record the baseline.

Any failure: report and stop. Do not work around it.

---

## PHASE 0 — Questions first (mandatory, one batch)

Read `CLAUDE.md` in full, skim the target, then output **every** question at once:

- Surfaces where the caller cannot be determined statically.
- Columns whose purpose is unclear from schema + usage.
- Suspected external consumers (webhook, integration, mobile, third party).
- Conflicts between `CLAUDE.md`, the redesign plan, and the actual code.
- Protected-list items you believe are wrongly protected.
- The line-cap conflict above, if you disagree with the default.

Then **wait**. No discovery with open questions. Asking mid-run is what stalls a pass.

---

## Role and non-negotiables

Senior engineer doing a *removal* pass. Leave the target smaller and structurally correct.
No shims, no unrelated refactors, no rewriting working logic.

1. **Evidence before deletion.** Recorded proof of non-use for every removal. "Looks
   unused" is not evidence.
2. **No patch work.** Dead means delete: code, file, DTO, Zod schema, types, hook, test,
   barrel entry, route registration. Never comment out, never leave `@deprecated` on
   something proven dead, never leave an orphan folder.
3. **Shims only for LIVE legacy contracts** with a real caller you cannot change now. Dead
   code has nothing to alias.
4. **One purpose per migration**, named. Never hand-edit generated SQL — regenerate.
5. **Phases -1 to 2 write no code.** Stop at the Phase 3 gate.
6. **Scope lock.** Only the target and its direct consumers. Everything else goes to "Out
   of scope findings" unfixed.
7. **Never leave the repo red.** Every commit builds, lints, typechecks.

### Minimal-fix principle (requirement 3)

Fix at the layer that owns the problem. If a concern belongs to a layout, fix the layout —
do not add per-route checks. If a concern belongs to a provider default, set the default —
do not patch each call site. Before writing a fix, state in one line which layer owns it
and why. A fix that touches N files where 1 would do is a defect, not thoroughness.

---

## PHASE 1 — Discovery (read-only, parallelizable)

Parallel subagents are allowed **here only** — one per area, read-only, no file writes, each
returning its inventory section. Execution in Phase 4 is strictly serial, single agent: two
agents editing schema or migrations in one tree lose work. Per `CLAUDE.md` §0.11 subagents
run no git; only the orchestrator commits.

**Mode A — backend module.** Every controller route (method, path, `@RequirePermission`,
`@RequireModule`, guards, DTO in, response shape); every service public method and its
callers; every owned Drizzle table (columns, types, nullability, defaults, indexes, FKs,
unique constraints); every DTO / Zod schema / exported type; every enum, constant, permission
catalog entry; every frontend hook and component consuming this module; permission keys
present in `permissions.constants.ts` and `ROLE_DEFAULT_PERMISSIONS` versus orphaned.

**Mode B — frontend page.** Every component the route renders and where each lives; every
hook it uses and whether the hook is defined at page level; every API call and how it is
issued; every type and Zod schema it declares; every state variable and whether it is UI
state or server state; its loading, empty, error, no-permission and disabled states; its
responsive behaviour at 375/768/1280; its file sizes against the cap.

---

## PHASE 2 — Classification and hunt lists

| Label | Meaning | Bar |
|---|---|---|
| `DELETE` | No caller anywhere, no external consumer | Evidence rules pass |
| `DELETE-DB` | Column/index/constraint with zero reads and writes | Evidence + migration plan |
| `DEDUPE` | Real duplication with an existing shared component/hook | Name the existing one |
| `EXTRACT` | Duplication with no existing shared version | Only if ≥3 real occurrences |
| `DEPRECATE` | Live caller, wrong surface | Replacement + owner + removal condition |
| `KEEP` | In use and correct | — |
| `KEEP-PROTECTED` | Appears unused, is protected | Cite reason |

### Schema hunt list (requirement 1)

Flag every instance, with a fix proposal:
- JSONB/text arrays holding lifecycle entities (invitations, members, approvals, comments,
  notifications, audit rows, tasks, events, documents) — these must be their own tables with
  PK, `org_id` FK, `status`, `created_at`, indexes. **Canonical failure: invites stored as an
  array on the org row — every update reads the org, scans the array, rewrites the whole
  column. Non-indexable, non-paginable, non-atomic. Split it.**
- Tenant tables missing non-nullable `org_id` or a leading composite index.
- Bare `.unique()` where tenant-scoped `uniqueIndex(org_id, col)` is required (§19 living rule).
- Unindexed FKs; unindexed columns that lead a real `WHERE`/`ORDER BY`.
- Composite indexes not ordered most-selective-first / not leading with `org_id`.
- Money stored as float rather than integer cents.
- `serial` where `generatedAlwaysAsIdentity()` belongs.
- Columns duplicating a master record that another table already owns.
- Missing `deleted_at` where soft delete is the pattern.
- **Cross-module ownership conflation** — this module holding its own copy of a concept
  another module owns: a person/employee master (Directory and Workforce own those), a
  product/offer/item (Managed Product vs CRM Offer vs Inventory Item/SKU are four distinct
  aggregates), a customer/vendor (Business Party owns those), or a project/ticket
  reference that duplicates rather than references PM. Report each with the owning module
  named. Do **not** merge tables in this pass — this is a finding, not a fix.
- **Module-optionality violation** — a table or query in this module that hard-depends on
  another optional module's tables. Each module must work standalone.

### API hunt list (requirement 2, "remaining unnecessary API calls")

Flag every instance:
- **Unbounded lists** — no pagination, or no hard 100/page cap.
- **Hardcoded pagination inside a hook** — `?page=1&limit=100` then `select`-away the
  envelope. Banned (§14 living rule). The hook takes `{ page, limit, … }` and returns the
  real `{ data, pagination }`.
- **Collection hydrated through a parent-detail endpoint** — `with: { tickets: {…} }` on
  `GET /projects/:id`. Rows come from their own projected paginated endpoint (§11 living rule).
- **N+1** — per-row queries in a loop instead of a join or one `IN`.
- **`select *` / no column projection**; nested relations uncapped.
- **Sequential awaits** for independent fetches — use `Promise.all`.
- **Ungated queries** — a `useQuery` hitting a permission- or module-gated endpoint without
  `enabled: useCan("<exact @RequirePermission key>")`. Every one of these 403-spams and burns
  Neon CPU. Check especially globally-mounted surfaces and dashboard widgets.
- **The clobber bug** — `{ …, ...options, enabled: !!orgId }`, where a re-declared `enabled`
  after the spread silently overrides the caller's gate. Combine instead.
- **Invalidate-instead-of-cache-update** — a mutation that refetches when `onMutate` could
  patch the exact cache the view reads. Also: heavy aggregate queries invalidated on every
  field change.
- **Duplicate in-flight requests** — N callers each firing the same token/session fetch.
- **Missing `staleTime`** / everything at the default 0.
- **Missing cache invalidation** on a backend mutation, or user-scoped data in a shared cache.
- **Wrong status codes** — DB `23505` surfacing as 500 instead of a 409 `ConflictException`;
  writes inside GET handlers.
- **Missing Zod at the boundary**; inline non-trivial Zod schemas that belong in `*-schema.ts`.
- **Missing `@RequirePermission`**, or a frontend gate whose key does not match the backend.
- **Missing `bumpPermissionsVersion`** on a role/permission mutation.

### Frontend hunt list (requirements 4–10)

**Reference page:** `/users` is the canonical responsive pattern for a filter-heavy list.
Match it; do not diverge from it.

**Structure and reuse**
- Redirect-only pages → delete, fix the routes that pointed at them.
- Hooks defined inside page files → move to `features/<feature>/hooks/`.
- Raw `fetch`/`axios` in components; `useEffect` firing API calls.
- Repeated blocks an existing shared component already covers — check each before
  extracting anything: `TablePagination` (never a hand-rolled prev/next footer),
  `StatCardGrid` (never a bespoke `grid grid-cols-*` around stat cards; it is one
  horizontally-scrolling row at every breakpoint), `LoadingButton` (never hand-rolled
  `disabled={isPending}` + spinner), `PageWrapper`, `EmptyState`, `ErrorState`,
  `ResponsivePopover`, `AnimatedIconButton`, member/entity selects.
- Files over the cap; components/hooks/types in the wrong folder; genuinely shared code
  sitting inside one feature.
- Unused files, types, Zod schemas, components, exports — zero importers.
- Unbounded `items.map()` with no pagination, `slice`, or windowing (`react-window` v2).

**States (requirement 7)**
- Empty / error / loading / no-permission / disabled-module regions that do not fill full
  width and height.
- Skeletons that do not mirror the real layout; lone spinners.
- **Four causes conflated into one state.** Disabled module, no permission/assignment, no
  data, and suspended-membership/stale-context are *different* states with different copy
  and different recovery actions. A permission error shown for an empty table is a bug.
- Full-region empties missing an illustration from `components/illustrations` and one
  primary CTA.
- Hand-rolled `error instanceof Error ? … : "…"` ternaries → the single
  `getErrorMessage(error: unknown)` helper.
- Raw IDs rendered anywhere user-visible (cards, tables, exports, tooltips, activity logs,
  filter chips) → resolve to display names. A visible UUID is a bug.

**Chrome and layout**
- Missing `PageWrapper`; page-level `min-h-screen`, page-level gradients, ad-hoc `<h1>`.
- `backHref` on a page that has its own sidebar nav entry; `variant="display"` on a
  standard list page; a bare row count as the whole subtitle or title badge.
- Filter rows wrapped in an outer `rounded-xl border bg-card` panel (nested cards) → flat
  toolbar row.
- Literal `blue-*`/violet on theme-accent surfaces → theme tokens (`bg-primary`,
  `border-l-primary`, `--ring`). Colored light-tint chips missing their `dark:` pairing.
- **HRMS is an explicit exception** — preserve its gradient hero, tone tiles and tinted
  chrome. Do not flatten it in a conformance pass.

**Responsive and accessibility (requirement 6, plan §7.12)**
- Raw `Popover`/`Sheet`/`Dialog` for a mobile filter/menu/multi-section panel →
  `ResponsivePopover` or Drawer. Exempt: 1–3 item menus, date pickers.
- Select dropdowns clipped by `w-[var(--radix-select-trigger-width)]` → use `min-w-`;
  triggers with long values force-narrowed → size to content.
- Popovers below a sensible minimum width; content wider than the trigger not widening.
- A lone filter or lone action not filling width on mobile.
- Verify 375 / 768 / 1280, **200% zoom, keyboard-only, reduced motion, light and dark**.
- Touch targets under 44×44px where practical; dense tables pushing page-level horizontal
  scroll instead of scrolling inside their own region; Drawers losing safe areas or focus trap.
- Missing focus visibility, focus restoration after close, programmatic labels/descriptions,
  announced async results. Colour as the only carrier of meaning.
- Destructive or ownership actions without named confirmation, or losing focus on failure.
- Nav that is *disabled* rather than *omitted* when unauthorized; a direct URL that briefly
  renders protected content before its 403/404.

**Terminology (plan §7.9 ban list)**
- Bare **Workspace** in visible copy outside Product Management — org-setup, onboarding,
  loading and toast strings included. Compatibility *symbols* may keep the name; product
  copy may not.
- Bare **Team** → qualify as Delivery Team (PM) or Organization Team / Organization Unit.
- Bare **Product** → Managed Product, CRM Offer, Inventory Item, Inventory SKU, or Module.
- **People, never Employees** in directory copy unless HRMS owns that surface. Payroll copy
  says payees/workers, not HR employees.
- Canonical nouns apply to headings, breadcrumbs, aria labels, empty/error text, audit
  descriptions and any URL introduced after cutover.

---

## Evidence rules

**API route** dead only when: zero matches for its path across `frontend/` (literal path
segment *and* the query-key factory, not just the hook name); zero matches across `backend/`;
not `@Public`, not a webhook receiver, not auth-bridge; not the sole owner of a permission
key other code reads. Record commands and hit counts.

**Schema column** dead only when: zero references in any `select`/`insert`/`update`/`where`/
`orderBy`/relational `with`; not in any index, unique constraint, FK or check; not read by a
migration, backfill or seed; not in any DTO or response; not named in the redesign plan as a
target or compatibility column.

**Component / hook / type** dead only when it has zero importers and its barrel export goes too.

**Ambiguous evidence → `KEEP`.** Ambiguity never breaks toward deletion.

---

## Protected list — never delete

- `project_workspace_members`, `project_team_assignments` — pending migration targets.
- `managed_products` — shipped Wave 7; `pm_workspace_id` lands later.
- `organizations.enabled_modules` — projection; contracts after `org_modules` parity.
- `organizations.owner_membership_id`, `organization_members.status` + lifecycle timestamps.
- `users.role` — legacy reads; removal gated on membership-based RBAC.
- `/projects` routes and `projects:*` permission keys — compatibility contracts.
- `organization_people`, `workers`, `worker_engagements` — Wave 3, in flight.
- Module-admin roles (`HR_ADMIN`, `CRM_ADMIN`, `INVENTORY_ADMIN`, `PRODUCT_MANAGEMENT_ADMIN`,
  `MEMBER`) — Wave 5, in flight.
- `permissions.constants.ts`, `role-templates.constants.ts` — no edits without my say-so.
- All AI endpoints, `AiActionsMenu`, credit ledger — out of scope entirely.
- Applied Drizzle migrations — never delete or edit.

---

## Regression guards — behaviours you must not break

A deletion pass breaks security by *removing something that looked redundant*. Before
deleting any guard, state, check or branch, confirm it is not one of these. If a change
touches any of them, add it to the Phase 3 report and re-test it explicitly in Phase 5.

**Tenancy and ownership**
- Sole owner cannot leave or self-remove; the path forces Transfer Ownership.
- Ownership derives from the owner pointer, never a JWT `isOwner` claim or a role row.
- Transfer is one locked transaction; two concurrent transfers → one commits, the loser 409s.
- A cross-tenant ID in body/query/params is rejected before mutation, even when some other
  supplied `organizationId` is valid. Tenant is never inferred from the child alone.

**Membership and session**
- Suspended or left membership fails closed on the next request — banner, read-only or
  sign-out, never silent partial chrome.
- A stale JWT after an org switch re-validates membership and active org from the DB.
- Access caches key by org + membership + access version + audience, never by user alone.
  Cache failure fails closed. A role/permission mutation bumps the version in the same
  transaction.

**RBAC**
- Module Admin cannot grant outside its module allowlist, cannot grant `settings:manage`,
  ownership or billing, cannot escalate through a custom role, cannot assign equal or
  higher rank without explicit peer-delegation.
- Org-wide Access is hidden *and* backend-denied for Module Admin; direct URL → 403.
- Unknown permission keys are rejected, never silently filtered.
- `team` scope fails validation — it must never silently degrade to `own` or widen to `all`.

**Module lifecycle**
- A module disabled mid-request or mid-job: the transaction rechecks lifecycle before the
  write or side effect, fails closed, retains data.
- An archived org during queued work: the worker's lifecycle fence prevents the side effect.
- Disabled module ≠ no permission. Two different states, two different UIs.

**Portal audience**
- A portal principal cannot reach internal routes or call internal APIs, even with a
  malformed internal role.
- An internal token presented to a portal endpoint is rejected on audience before resource
  authorization.
- A revoked or expired grant fails on the next request; previously hidden fields never
  remain cached as accessible.

**Do not regress (requirement 6)**
- If a surface already handles mobile correctly, leave it alone. This pass fixes what is
  broken; it does not restyle what works. Every UI change must be justified by a specific
  finding in the Phase 3 report.

Report, then wait:

1. Inventory (Phase 1). 2. Classification table with evidence. 3. Deletion manifest — exact
paths, symbols, columns. 4. Schema hunt findings with fix proposals. 5. API hunt findings.
6. Frontend hunt findings (Mode B). 7. Migration plan, one per purpose, named, ordered.
8. Blast radius per `DELETE-DB`. 9. Out of scope findings. 10. Anything Phase 0 left open.

No code until I reply.

---

## PHASE 4 — Execution (serial, after approval)

Commit between steps. Each step green before the next.

**Mode A — backend module**
1. Frontend consumers: hooks, query keys, types, components.
2. Backend routes and controllers.
3. Services, DTOs, Zod schemas, types.
4. API hunt fixes: projections, pagination, `Promise.all`, `enabled` gates, `staleTime`,
   cache invalidation, status codes.
5. Permission catalog entries for removed surfaces only; `bumpPermissionsVersion` where any
   grant row changes.
6. Schema: `db:generate` → review generated SQL line by line → `db:migrate`. Never
   `db:push` outside local.
7. Delete emptied files, folders, barrel entries.

**Mode B — frontend page**
1. Delete redirect-only pages; repoint routes.
2. Move page-level hooks into `features/<feature>/hooks/`; route all calls through the
   single API client and TanStack Query.
3. Fix query hygiene: `enabled` gates matching the exact backend key, calibrated
   `staleTime`, `mutationKey`, optimistic cache updates over invalidation, debounced inputs
   (server state only — UI state stays separate and immediate).
4. Remove forced types; type against the real backend contract.
5. Dedupe into existing shared components; extract new ones only at ≥3 occurrences; move
   genuinely shared code to the common folders; split files over the cap by responsibility.
6. States: loading skeletons mirroring the real layout; empty/error/no-permission/disabled
   filling full width and height; mobile Drawer for filter/menu panels; popover and select
   widths correct.
7. Delete unused files, types, Zod schemas, components, exports.

**Continuation rule.** Do not stop mid-phase for permission. Do not pause between steps. Do
not end a turn with the build red. Work the todo list to the end. If blocked and the blocker
is in scope, fix it; if out of scope, revert that step cleanly, record it, continue. The only
sanctioned stops are the Phase 0 question batch, the Phase 3 gate, and a failed precondition.

**Resume rule.** This prompt is re-runnable. On a fresh session, read the todo list state and
the last commits first; resume from the first unchecked item rather than restarting Phase 1.
Re-running a completed step must change nothing.

**Partial approval.** If I approve only part of the Phase 3 manifest, execute exactly that
part and leave the rest labelled and unexecuted. Never widen an approval by inference.

---

## PHASE 5 — Final verification (run once, mechanically)

Twelve checks, each pass/fail with recorded evidence. Do not re-review subjectively — run
these, report results, and if all pass the task is complete.

1. `pnpm build` green, both repos.
2. `pnpm lint` green, both repos.
3. `tsc --noEmit` green — zero new `any`, casts, `@ts-ignore`, `!` abuse.
4. Every remaining route in scope has `@RequirePermission` and resolves.
5. **Every touched endpoint exercised** — happy path, unauthorized, cross-tenant, empty,
   paginated boundary. Paste request/response status for each. (Requirement 11.)
6. Specs pass; specs for deleted surfaces deleted, not skipped.
7. `grep` each deleted symbol across both repos → zero hits. Paste counts.
8. Every generated migration reviewed line by line; no unintended `DROP`; applies to a clone
   and to local.
9. No file in scope over the cap without a §9 exception.
10. Manual pass at 375/768/1280: no 404s, no 403 console spam, no state broken by a deleted
    hook, empty/error regions fill the region, mobile panels are Drawers.
11. Bundle: report before/after for the touched route where measurable.
12. `git status` shows only intended changes; every commit builds.

Then report: files deleted, lines removed, columns dropped, endpoints removed, duplicates
consolidated, before/after file count. Update `PAGES.md` / `WAVES.md`.

---

## Output format

`CLAUDE.md` §28. Per phase: Findings · Root cause · Recommended action · Files changed ·
Validation. No prose beyond what justifies a decision.

**Practices ledger (requirement 2).** The Phase 3 report ends with the explicit list of
coding practices this pass applied — the query, caching, validation, status-code, RBAC and
component rules actually used, each with the file where it was applied. Not a generic list
of principles: a record of what was enforced and where.

---

## TODO list

- [ ] -1.1 Preconditions: clean tree, no concurrent session, green baseline.
- [ ] 0.1 Read `CLAUDE.md`; confirm mode + target in one line.
- [ ] 0.2 Full question batch, including the line-cap conflict. **STOP.**
- [ ] 1.1 Inventory: routes / components (per mode).
- [ ] 1.2 Inventory: services + callers / hooks + their location.
- [ ] 1.3 Inventory: schema tables, indexes, FKs, constraints.
- [ ] 1.4 Inventory: DTOs, Zod schemas, types, enums, constants.
- [ ] 1.5 Inventory: frontend consumers, query keys, states.
- [ ] 1.6 Permission-key cross-check.
- [ ] 2.1 Label every row.
- [ ] 2.2 Evidence (commands + hit counts) for every `DELETE*`.
- [ ] 2.3 Schema hunt list — findings + fix proposals.
- [ ] 2.4 API hunt list — findings, including every unnecessary/ungated/unbounded call.
- [ ] 2.5 Frontend hunt list — duplication, states, responsive, types, file sizes.
- [ ] 3.1 Approval report. **STOP.**
- [ ] 4.1 Step 1 (per mode). Commit.
- [ ] 4.2 Step 2. Commit.
- [ ] 4.3 Step 3. Commit.
- [ ] 4.4 Step 4. Commit.
- [ ] 4.5 Step 5. Commit.
- [ ] 4.6 Step 6. Commit.
- [ ] 4.7 Step 7 — delete emptied files/folders/barrels. Commit.
- [ ] 4.8 Regression guards re-tested for anything the diff touched.
- [ ] 5.1 Twelve-point checklist; report each result.
- [ ] 5.2 API test evidence table (requirement 11).
- [ ] 5.3 Practices ledger — rules enforced and where.
- [ ] 5.4 Removal report; update `PAGES.md` / `WAVES.md`.
