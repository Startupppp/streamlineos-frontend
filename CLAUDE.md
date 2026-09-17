# CLAUDE.md — StreamlineOS Constitution (shared)

> Always in force. Holds only what binds **both** repos; each side owns its own rules.

| Working in… | Read + obey | Owns |
|---|---|---|
| `backend/**` | **`backend/CLAUDE.md`** | NestJS · Drizzle/Neon · security · RBAC engine · caching |
| `frontend/**` | **`frontend/CLAUDE.md`** | Next.js · Query · components & memoization · forms · UI/UX system · templates |
| both | both files | — |

**Load them before editing, not after.** A change under `backend/` made without `backend/CLAUDE.md` open is unreviewed by definition; same for `frontend/`. Unsure which side a task touches → read both. §12 resolves conflicts.

---

## 1. Cardinal Rules — violating one fails the task

1. **Inspect before you change.** Confirm every file, symbol, route, API, schema exists. Never assume.
2. **Reuse before you create.** Search first; create only when nothing existing fits, and minimally. (§4)
3. **One definition per job.** Two symbols doing the same work is a defect — consolidate. (§4)
4. **Never add a code comment.** Not narration, not "why", not invariants. (§6)
5. **Delete what is not needed** — files, functions, constants, types, props, validation, DB calls. (§10)
6. **Work within the assigned flow.** Audit source, make a bounded change, verify. An audit/handoff request produces evidence and assignments; it does not authorize unrelated implementation.
7. **Business logic is backend-only.** Frontend = UI, client state, Query hooks. (§5)
8. **Authorize at the data layer**, every read AND write, tenant-scoped. Middleware and client checks are advisory.
9. **Strict TypeScript.** No `any`, no cast hacks, no `@ts-ignore`/`@ts-expect-error`, no `!` abuse.
10. **Verify before "done".** Types pass (build where it is the only proof), then update `PAGES.md`.
11. **Cohesive files.** Use the existing size gates and exception process. File length alone never justifies fragmentation or a repo-wide refactor.
12. **Repair the customer outcome.** Reuse existing implementations. Remove code only after proving it unused; a correctness fix may legitimately add code or tests.
13. **Stable rules.** Record durable user decisions in the appropriate rule file. Session status, measurements and task instructions go in the indexed delivery lane, not into every agent's context.
14. **Git is orchestrator-only.** MAY `commit` verified work on the current branch between tasks. NEVER push/checkout/branch/merge/pull/fetch/reset/stash/rebase. Subagents run no git.
15. **No cyclic dependencies.** Both import graphs stay acyclic. Never hide a cycle behind `forwardRef`, dynamic imports, barrels, duplicated types or pass-through wrappers — move the shared contract to its neutral owner. (§9)

## 2. Stack

Multi-tenant enterprise SaaS, two repos.
- **Frontend** — Next.js 16 App Router · React 19 · TS strict · Tailwind 4 (CSS-first: tokens in `globals.css`, no `tailwind.config`) · shadcn/ui · TanStack Query v5 · react-hook-form + Zod 4 · Sonner · Framer Motion · pnpm.
- **Backend (`streamlineos-api`)** — NestJS 11 · Drizzle · Neon Postgres · Redis · Zod 4. **Owns all business logic, APIs, schema.**

Simplicity over cleverness · normalize data · deny by default · fail fast at boundaries · YAGNI. Ship work that is reliable, correct, efficient, clean and extensible, with the best UI/UX — judge like a CTO + Principal Engineer + Security Engineer + DB Architect: improve the architecture, not just the code.

## 3. Workflow

- The user's current request defines the scope. Proceed with already-authorized repairs; ask only for unresolved product choices, destructive operations, or external actions outside that scope. **"go"** continues the assigned task, not an arbitrary unchecked page.
- Use `architecture-refactor/prd/completion-plan.md` to find the active delivery lane. Historical reports are reference evidence, not new work. Check `.claude/` instructions for the assigned task.
- Verification is part of an authorized repair: run the smallest relevant typecheck, regression, contract or browser check. Review the command first; DB writes and provider transactions require a named disposable/test environment. Never load production credentials merely to make a test pass.
- Before changing behavior capture a failing reproduction where feasible, and distinguish source proof, mocked checks, DB checks and deployed evidence — a passing typecheck or mock suite does not certify a customer journey. After fixing, rerun the reproduction and relevant checks; build for bundling/runtime wiring changes. Update only the assigned lane and affected `PAGES.md` entries, preserving concurrent edits.
- **Fan out across parallel agents for any broad sweep** — audits, duplicate hunts, contract-drift scans, multi-file cleanups. Each gets a bounded task, explicit file ownership and a demand for file:line evidence; share a contract before parallel frontend/backend work. **The coordinator owns integration and commits:** never let two agents edit one file, or any shared auth/schema/cache file, at once — prefer read-only audit agents and apply the findings yourself. A report is a lead — verify each finding against source before acting.
- **Reservation before shared edits:** record exclusive ownership in the indexed lane for shared guards, auth hooks, schema, query factories and cache primitives. Others may inspect and propose while reserved. Review actual diffs at one frontend/backend revision pair; a peer's summary is not integration proof.
- **Credit and machine control:** one concrete outcome per assignment. Run only tests for the changed code and its direct callers/contracts, with explicit paths or a bounded filter. One test batch at a time, one worker/in-band where supported; never overlap heavy builds/typechecks. Do not run the whole suite or watch mode without an explicit request. Stop after two failed repair hypotheses: report the missing discriminator and continue independent work.

## 4. Before coding — reuse, then create

Identify from the real codebase: module · entities · existing schema, APIs, cache keys, RBAC keys/guards, components, services, hooks · a simpler alternative. Audit across architecture · DB · API · cache · backend · frontend · UI/UX · security · performance · product completeness → implement → validate.

- **Search before adding anything** — type, interface, function, class, component, hook, schema, DTO, constant, enum, utility, service, query key, config object. Check the file you are editing first, then its module, then both repos with `rg` for declarations, exports and call sites. Never decide from the current folder alone.
- **If it exists, import it.** Do not copy it, rename a copy, wrap it in a pass-through, make a second local version, or duplicate its shape inline.
- **A symbol is exported from exactly ONE module — re-exporting it under an alias is a duplicate, not a convenience.** `export type X = LibX;` or `export { X } from "./elsewhere"` outside a sanctioned barrel gives the codebase two import paths for one thing, and the second one rots: consumers split across both, a change lands on one, and the two drift until a contract throws. Point every consumer at the owning module and delete the alias. This is also how cycles start — `types/` aliasing a `lib/` symbol while `lib/` imports from `types/` closes the loop, which is why §9's acyclic rule and this one fail together. Verify with `rg "export (type )?<Name>"` returning a single file, then `pnpm check:cycles` (both repos, expected zero).
- **Two symbols doing the same job must become one.** Consolidate into the best-owned implementation and delete the duplicate once every consumer is migrated. Keep them separate only when domain meaning or behavior genuinely differs — then say so in their names and tests.
- **Shared by two or more owners → move it to a neutral home** (`common/`, `lib/`, `components/shared`), update every import, delete the original. One implementation, one source of truth. A helper living in one feature and imported by another is a defect.
- **Derive types, never re-declare them:** `z.infer` from Zod, Drizzle `$inferSelect`/`$inferInsert` from tables, indexed/access types from existing models. A hand-written parallel interface will drift.
- **New files are the last resort** — only when no existing file owns the responsibility and adding it there would make that module less clear. File-size limits never justify duplicate helpers, one-symbol files, re-export shells or artificial fragmentation.
- **Close the loop:** before calling it done, search again for the new symbol's purpose and confirm one canonical definition, all consumers on it, obsolete definitions and files deleted, graph still acyclic.


## 5. Frontend ↔ Backend Boundary

- Backend owns **all** APIs and business logic. **No `app/api/**` business routes, no `lib/services/**` business logic in the frontend** — the only frontend `route.ts` is NextAuth / auth-bridge.
- **Schema source of truth `backend/src/db/schema/**`;** Drizzle config and migrations stay backend-owned. Follow backend/CLAUDE.md's journaled migration workflow and named disposable-environment requirements; do not assume generation or schema push is supported.
- **Frontend has NO database access** — no client, schema, adapter, migration. NextAuth is `strategy: "jwt"`; server components fetch with the session's `backendJwt` (`lib/rbac/get-server-access.ts`).
- **Third-party connectivity goes through Composio**, backend `integrations` module, server-side only. Never direct provider OAuth or provider tokens in our DB; mirror only `user_integration_connections`.
- **Identity comes from the token.** `JwtAuthGuard` sets `req.user.userId` (JWT `sub`) / `orgId`; read via `@CurrentUser()`. The client never sends its own actor id (`userId`/`actorId`/`createdById`/`authorId` = impersonation) or the active org id (= cross-tenant hole). Self reads use `/me` routes, never `?userId=<self>`. Legit to send: a DIFFERENT person's id, a DIFFERENT org's id (`POST /organization/switch`, membership-checked), `@Public()` routes where URL `orgId` is the only tenant selector, client-only values (cache keys, localStorage, realtime channels).
- **An optional `userId` filter that widens scope must be authorized, and the gate must bite.** Unchecked, any holder of the *read* key reads anyone; absent, the whole org. Force it to the caller unless they hold the widening permission — and confirm that permission excludes the roles holding the read key (`hr:employees:manage` sits beside `:view` in HR_ADMIN/BRANCH_HR/RECRUITER, so gating on `manage` is a no-op). Gate on the scopable key's DataScope instead.
- **Contracts match the backend exactly, field for field.** `applyContract` returns the *parsed* object, so a field the contract omits is **silently stripped** (the screen renders an empty state) and a field typed or nulled wrongly **throws** (the screen errors, the action fails). Check name, type, nullability and optionality against the Drizzle column and the service's actual returned literal — the backend's own `@ResponseSchema` can be wrong too. A key used in `useCan` must exist verbatim in the backend catalog.
- **Retired:** `pnpm sync:schema`, `pnpm check:schema`.

## 6. TypeScript & Code Quality

- `strict: true`. No `any` (`unknown` + narrowing), no `@ts-ignore`, no `!` abuse.
- **Never add a code comment.** Not narration, not "why", not invariants — when the reason is subtle, put it in a **test name**. Existing comments stay. Within the flow you touch, delete stale, misleading, duplicate, code-restating and commented-out code; keep licences, generated markers and tool directives. Remove a TODO only once its work is verified done or carried into the completion plan. Never bulk-strip comments or delete protective directives to silence a gate.
- **Never force types.** No `as X` / `as unknown as X`. Raw `db.execute(sql\`…\`)` rows are `Record<string, unknown>` — convert at the use site (`Number(row.count)`, `row?.field ?? fallback`). If a cast feels necessary, fix the source type or the projection.
- **Discriminated unions** for state machines and API responses; exhaustive `switch` + `assertNever`.
- **Zod-validate every untrusted boundary** (bodies, params, env) — and no more: a second guard over data the boundary already validated is dead weight. **Schemas live in `*-schema.ts`** beside the feature (frontend) or the module's `dto/` (backend), never inline in a controller, route, component or hook. Type via `z.infer`, never a parallel `interface`. Trivial single-field guards may stay inline.
- **Named handler functions inside components and pages.** Every JSX event or action callback references a named handler declared in that component or page (`onClick={handleSave}`), never an inline arrow. Handlers coordinate the local UI event; reusable state, validation, data access and business behavior live in the proper hook, service or module. **Single-statement `if`/`for` bodies omit braces.**
- **Two strictness flags are deliberately OFF; do not flip them casually.** `noUncheckedIndexedAccess` (floor: backend 574 errors/190 files, frontend 184/84) and unused-symbol enforcement (`noUnusedLocals`/`noUnusedParameters` + `@typescript-eslint/no-unused-vars`, today `warn` with `argsIgnorePattern`/`varsIgnorePattern`/`caughtErrorsIgnorePattern` all `^_`; 4,186 violations, 69.6% named `_*` and existing only because that escape does). Both floors understate: build configs exclude tests and scripts, and `--noUnusedParameters` exempts `_`-prefixed params by construction, so tsc cannot enforce the second at all. Each is a NEW REQUIREMENT needing an owner — enable only by owning the migration, stating what it misses, and deleting those three `^_` patterns in the same change.
- Mentally test: error, loading, empty, network failure, invalid input, auth, concurrency, StrictMode double-invoke.

## 7. Structure & Naming (both repos)

- **Every name says what it identifies — `id` is never a name.** A route param, folder, DTO field, query-key segment, function argument and local variable each carry the entity: `user/:userId`, not `user/:id`; `[reimbursementId]`, not `[id]`. **The four spellings must match end to end** — backend `@Post("users/:userId/…")` + `@Param("userId")` + the variable, and the frontend folder `[userId]` + `await params`. A bare `:id`/`[id]` says nothing, stops matching its counterpart across the two repos, and makes an adjacent-argument swap invisible. The same bar applies to any throwaway name — `data`, `res`, `tmp`, `item2`, `x` — outside a trivial one-line callback.
- **kebab-case for every file and folder** (CI case-safety); PascalCase symbol inside.
- **File size** ≤300 lines target, 500 hard review → split by responsibility. Exceptions: generated files, unmodified shadcn primitives, `*.d.ts`.
- **Name the module for the module, the entity service for the entity.** Build sub-domains are `BuildQaModule`, `build-approvals.module.ts` — never `Projects*`; but `build/core/` keeps `ProjectsService` (it owns the `projects` entity). `project` ≠ `product` ≠ Build module (§8).
- **Permission catalogs are folders, not files** — one file per module behind a barrel (backend `modules/rbac/permissions/`, frontend `lib/rbac/permissions/`). Never a monolithic `permissions.constants.ts`; a cohesive catalog may exceed 500 lines rather than split artificially. **The two must not drift:** a frontend-only key fails `useCan` forever, a backend-only key can't be gated.
- Per-side layout: `backend/CLAUDE.md` §1, `frontend/CLAUDE.md` §6.

## 8. Product Rules

- A screen exposes only actions its customer workflow requires. Read-only, aggregate, onboarding and billing screens do not acquire CRUD controls for checklist completeness. Applicable loading, error, empty, denied and populated states are explicit; collections are bounded and authorized.
- **The delivery/strategy module is "Build"** — project management (`projects`, tickets, sprints, QA, backlog) AND product management (`managed_products`, roadmap, OKRs, feedback). Route `/build` (`/projects` redirects), RBAC `build:*`, module key `BUILD`, folders `build/`. **`project` ≠ `product`:** distinct tables, never merged; only the namespace is `build`.
- **Employee self-service and knowledge are platform core, not paid entitlements.** Every active member keeps Home, mail, chat, notifications, dashboard, their own time off/attendance/expenses/pay/employment documents, announcements, referrals + internal job openings (never the candidate pipeline, interviews or hiring administration), people directory and KB reading — whatever their enabled products. The *surface* is universal; actions inside stay permission-gated. Canonical routes `/me/*`; handlers use `self:*`, derive the subject from `@CurrentUser()`, never accept a self `userId`, never carry `@RequireModule`. KB reads keep space/audience/record ACLs; HR/payroll/finance administration and KB authoring/analytics/settings stay permission- and module-gated. Enforce in backend effective permissions and shared navigation — never as a visible-only exception or a frontend entitlement constant.
- **Home holds universal work only:** dashboard/communication, `For Me`, announcements, people directory. Recruitment, interviews, employee administration, policies, payroll runs, accounting and every other module destination stay in their owning product nav.
- **Route ownership is a product contract.** Global administration = `/settings/*`; module configuration = `/<module>/settings/*`. Settings owns configuration and access governance, never operational work — workforce lives at `/directory/workers`, employee pay is self-service, payroll administration stays under `/payroll/*`. **Module-owned surfaces** (custom fields, automations, integrations, data-hub import/export) live in each module's settings, never global `/settings/*`. When a page moves to its canonical route, **delete the old route files — no legacy redirects** — and update every link.
- **One unified calendar.** `/calendar` serves everyone; module events (holidays, leaves, birthdays, review cycles, training, travel, interviews) are toggleable SOURCES from backend aggregates. Never module-specific calendar pages.
- **HR:** onboarding/profile forms collect only real new-joiner data — personal (phone, DOB, gender, address, emergency contact), bank/payroll, ID & document uploads. No recruitment-only fields (experience, skills). The onboarding form is **never** shown to org owners or platform admins — gate server-side and redirect (owner → setup/dashboard; platform admin → `/owner`).
- **Workspace gating:** no workspace → `/org-setup` (platform admins → `/owner`), enforced by the live-session check in `app/(authenticated)/layout.tsx`. Completing OR skipping a wizard is durable — server stamps the DB, invalidates the `userSession` cache, client calls `completeOnboardingGate` (`lib/onboarding-gate.ts`). Never bounce a user back into a skipped wizard.
- **Plan entitlements** FREE / PAID / ENTERPRISE resolve server-side from `subscriptions` via `PlanLimitsService`. Every creation endpoint for a limited resource calls `assertWithinLimit(orgId, key)` before insert. Paid-only modules (payroll, inventory) are blocked at `setModuleEnabled` on FREE; existing enablement is not revoked. Frontend reads `GET /billing/entitlements` via `useEntitlements`.
- **Platform billing is exactly 2 Settings pages:** `/settings/billing` (plan + promo + seats + usage · invoices & payments · billing profile) and `/settings/billing/ai-credits` (wallet, top-ups, auto-top-up, history). `/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` are deleted — never resurrect them. `/billing/invoices` is the org's own customer invoicing (accounting).
- **AI billing is token-metered:** `computeTokenCharge(model, in, out)`, never flat per-action; `AI_FEATURE_COSTS` are reserve ceilings only. The ledger stores integer **milli-credits**; APIs emit fractional credits; settle refunds under-run and debits overage. New AI endpoints use the gateway `*WithUsage` variants, return `aiUsage` meta, render `AiUsageChip`.
- **Organization hierarchy is archive/restore, never hard delete.** Business units, branches, departments, teams, locations, cost centers archive via a status mutation through `HierarchyArchiveDialog` — never add a permanent-delete control. A dependency conflict keeps the dialog open, lists every actionable dependency + count, and confirms nothing changed. Child-assignment selectors offer only `ACTIVE`, non-deleted parents. Every hierarchy mutation invalidates the `queryKeys.hierarchy.all` prefix.

## 9. Reliability & Performance

**Every screen loads fast and every endpoint answers fast — treat a slow one as a bug, not a tradeoff.**

- **Every DB call must be necessary, projected, indexed and bounded.** No N+1 (join or batch), no `SELECT *` or unprojected relation to global `users`, no unbounded list (cap 100/page), no read whose WHERE clause cannot use an index — composite indexes lead with `org_id`, and under RLS a covering index must contain it. Collapse repeated per-row queries into one grouped query. Delete a query whose result nothing reads.
- **Prefer patching the cache over refetching.** A mutation whose response already carries the new state updates the cache; it does not invalidate a broad prefix. Invalidate the narrowest true key prefix, and remember that invalidating a paginated/infinite query refetches **every loaded page**. Never fire a request for data another live query already returns.
- **Read ownership before caching.** Reuse the existing query/service owner; shell-wide identity/access/badges may be shared, while filtered lists, detail reads and drafts stay with their route/feature. Multiple hook consumers do not prove duplicate HTTP. Measure cold/warm requests before hoisting, adding a cache or adding an endpoint.
- **Every changed cache has a writer matrix:** resource, tenant, actor/session/record scope, response-shaping filters, authority/version, TTL/cardinality, writers, post-commit invalidation, failure behavior, cross-tab effects. Test scope changes, revoked access, rollback and unavailable cache. Cached permission or payment data never substitutes for authoritative atomic writes.
- **Trace the outer transaction.** An inner transaction callback returning is not proof of durable commit when HTTP/outbox infrastructure owns an ambient transaction. Check actual caller context before claiming atomicity, moving invalidation or issuing external effects. Reuse durable outbox/idempotency machinery instead of adding a parallel system.
- **Universal is surface availability, not universal records or administration.** Inbox, calendar and chat stay available to active members; recipient, account, channel, entity and tenant ACLs still govern data and actions. Organization billing administration is not platform merchant authority.
- Idempotent + transactional writes so retries are safe. Stateless services. One-directional flow (features → shared, never shared → features).
- **The import graph stays acyclic, proven by the repo's gate** (`pnpm check:cycles`, wrapping `madge --circular`, plus `check:feature-cycles` on the frontend) — both repos are at zero. Run it before claiming done, and run its `:self-test` sibling before trusting a green result; a gate that resolves no edges reports zero vacuously (the frontend gate needs `--ts-config` for `@/` aliases). Fixes in order: (1) move the shared type to a neutral module — a type beside runtime code drags that file into every importer (`Db`/`TenantTx` in `db/drizzle.types.ts`; a form's Zod schema in `*-schema.ts`); (2) extract the leaf service into its own module — `forwardRef` hides a cycle, it does not remove one, and is banned in new code; (3) never import a barrel from inside its own tree; (4) co-locate mutually-referencing tables (`bugs` ↔ `test_cases`).
- `import type` on an injected Nest service erases the DI token (boot failure, or a silent `null` under `@Optional`) — never use it to break a DI cycle.
- Re-check version-sensitive rules against installed versions. Prefer additive, backward-compatible changes.

## 10. Delete What Is Not Needed

Remove it and delete its file: dead or duplicate code, unused schemas/APIs/hooks/components/types, **validation that re-checks what a boundary already validated**, **component props and options nothing passes**, **DB calls and endpoints whose result nothing reads**, and any function that merely forwards to another.

- **Dead-code claims are proven by a module-graph tool, not grep** — import-search misses side-effect imports (`import "./x";`), dynamic `import()` and re-export chains. Prove with **knip** (`pnpm exec knip --no-progress`), confirm with a real `next build` / `nest build` (`tsc --noEmit` misses a missing side-effect import). Deleting a schema file also needs zero symbol references, zero raw table-name references and no dependent FK.
- **knip alone NEVER justifies deleting a schema file.** `db/schema/hrms-phase1-sql-managed.ts` is a deliberate holding barrel for raw-SQL-managed tables, kept out of the runtime barrel so Drizzle never manages them, and asserted by `migration-integrity.spec.ts` — being unimported *is* the design, so knip calls all 11 files unused. Before removing any schema file, grep for its **path** (not just its symbols) to find specs asserting it, and confirm no barrel outside `db/schema/index.ts` re-exports it.
- **Emptiness is not deadness.** A table with zero rows is usually unseeded, not abandoned — all 95 empty `hr_*` tables have live services. If a scan says "everything is dead", the scan is broken: a pattern missing `pgTable(` (capital T) maps nothing, and the table name often sits on the line *after* the call, so single-line patterns find none.

## 11. Definition of Done & Testing

For the assigned scope: customer acceptance criteria verified; relevant types/build/regressions pass; authorization and tenant isolation checked; retries and cache invalidation checked; applicable responsive/accessibility states inspected; evidence and residual risks recorded. Report unrun checks explicitly. Production readiness additionally needs the named environment's migration, recovery, provider and monitoring evidence. Never claim zero bugs, a numeric quality score, or product completion from static checks alone.

Write the failing test before changing behavior; its name is where the reason for the fix lives (§6). A new module ships **controller e2e specs** (auth + RBAC + scope allow/deny, credit exhaustion, cross-tenant isolation) **and** unit tests for access/credit/permission logic. Two traps: a `db.transaction` mock must invoke its callback (a bare `jest.fn()` voids every assertion inside it), and `*e2e-spec` runs only under `pnpm test:e2e`. **Separate your regressions from pre-existing ones** — confirm on a clean tree before claiming either.

## 12. Output & Precedence

**Audit/handoff:** current findings, evidence level, smallest repair, owner, dependencies, acceptance checks — with source anchors, ordered work, file ownership, negative tests and exact results, never placeholder files or a duplicate report. **Fix:** outcome, relevant changed paths, verification, remaining limitations. Keep the next step concrete; do not re-request approval for work already authorized. Rules are enforced by type/contract/test/build gates — writing a rule down does not enforce it.

**Markdown maintenance:** keep one current task source. Before removing a document, read it, check inbound links and script/CI references in both repos, and preserve unique requirements, ADRs, migration records and operational evidence. Prefer consolidation into an existing canonical document; list deleted paths and Git recovery info. Duplicate files used by separate installed tools are not automatically unnecessary. Remove broken instruction imports rather than creating empty files to satisfy them.

**Completed tasks:** untick a checkbox only after matching its exact acceptance to durable evidence at the real entry point. Reconcile current source and latest appended evidence before trusting an opening status; a helper-only test does not certify an unwired caller. Preserve provenance, label inference separately from measured behavior, keep failed/unrun/external checks open, merge overlapping assignments under one owner and preserve unique findings.

Precedence: my instruction now → Cardinal Rules (§1) → the side-specific file on its own domain → this file → the repo's established pattern (and tell me when you rely on it, so we codify it). When genuinely unsure and the choice is structural, **ask briefly** rather than guess.
