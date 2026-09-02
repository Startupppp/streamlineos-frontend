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
2. **Reuse before you create.** New code only when nothing existing fits, and minimally.
3. **Page by page, audit-first.** Only pages I name: AUDIT → PLAN → my confirmation → edit.
4. **Business logic is backend-only** (`streamlineos-api`). Frontend = UI, client state, Query hooks. (§5)
5. **Authorize at the data layer**, every read AND write, tenant-scoped. Middleware and client checks are advisory.
6. **Strict TypeScript.** No `any`, no cast hacks, no `@ts-ignore`/`@ts-expect-error`, no `!` abuse.
7. **Verify before "done".** Types pass (build where it is the only proof), then update `PAGES.md`.
8. **Small files.** ≤300 lines target, 500 hard review. Exceptions in §7.
9. **Leave less code than you found.** Delete dead code and its files. No speculative abstractions.
10. **Living rules.** Any rule I state mid-task goes into the right file immediately — shared here, side-specific in that side's file.
11. **Git is orchestrator-only.** MAY `commit` verified work on the current branch between tasks. NEVER push/checkout/branch/merge/pull/fetch/reset/stash/rebase. Subagents run no git.

## 2. Stack

Multi-tenant enterprise SaaS, two repos.
- **Frontend** — Next.js 16 App Router · React 19 · TS strict · Tailwind 4 (CSS-first: tokens in `globals.css`, no `tailwind.config`) · shadcn/ui · TanStack Query v5 · react-hook-form + Zod 4 · Sonner · Framer Motion · pnpm.
- **Backend (`streamlineos-api`)** — NestJS 11 · Drizzle · Neon Postgres · Redis · Zod 4. **Owns all business logic, APIs, schema.**

Simplicity over cleverness · normalize data · deny by default · fail fast at boundaries · YAGNI. Judge like a CTO + Principal Engineer + Security Engineer + DB Architect: improve the architecture, not just the code.

## 3. Workflow

- Audit → plan (change/remove/add) → **wait for confirmation** → edit. **"go"** = next unchecked page in `PAGES.md`.
- Ambiguous + structural → ask briefly. Check `.claude/` rules first.
- **`tsc --noEmit` is the default proof and always allowed. Never run lint or tests unless I ask** — report them *not run*, never as passing.
- After fixing: typecheck (plus `next build` / `nest build` where it is the only proof), then update `PAGES.md`.
- **Parallelism:** independent sub-tasks, one subagent each, commit between tasks.

## 4. Before coding

Identify from the real codebase: module · entities · existing schema, APIs, cache keys, RBAC keys/guards, components, services, hooks · a simpler alternative. Audit across architecture · DB · API · cache · backend · frontend · UI/UX · security · performance · product completeness → implement → validate.

**Architecture re-review is a delta audit.** Read `architecture-refactor/PRD-IN-SCOPE.md` §27, verify prior findings against current source, and classify them as VERIFIED DONE, REGRESSED, STILL PENDING or NEW. A verified fix appears once under DONE and is not reintroduced as pending without current regression evidence.

## 5. Frontend ↔ Backend Boundary

- Backend owns **all** APIs and business logic. **No `app/api/**` business routes, no `lib/services/**` business logic in the frontend** — the only frontend `route.ts` is NextAuth / auth-bridge.
- **Schema source of truth `backend/src/db/schema/**`;** Drizzle config + `backend/migrations/` live there and migrate there only (`pnpm -C backend db:generate | db:push | db:migrate`).
- **Frontend has NO database access** — no client, schema, adapter, migration. NextAuth is `strategy: "jwt"`; server components fetch with the session's `backendJwt` (`lib/rbac/get-server-access.ts`).
- **Third-party connectivity goes through Composio**, backend `integrations` module, server-side only. Never direct provider OAuth or provider tokens in our DB; mirror only `user_integration_connections`.
- **Identity comes from the token.** `JwtAuthGuard` sets `req.user.userId` (JWT `sub`) / `orgId`; read via `@CurrentUser()`. The client never sends its own actor id (`userId`/`actorId`/`createdById`/`authorId` = impersonation) or the active org id (= cross-tenant hole). Self reads use `/me` routes, never `?userId=<self>`. Legit to send: a DIFFERENT person's id, a DIFFERENT org's id (`POST /organization/switch`, membership-checked), `@Public()` routes where URL `orgId` is the only tenant selector, client-only values (cache keys, localStorage, realtime channels).
- **An optional `userId` filter that widens scope must be authorized, and the gate must bite.** Unchecked, any holder of the *read* key reads anyone; absent, the whole org. Force it to the caller unless they hold the widening permission — and confirm that permission excludes the roles holding the read key (`hr:employees:manage` sits beside `:view` in HR_ADMIN/BRANCH_HR/RECRUITER, so gating on `manage` is a no-op). Gate on the scopable key's DataScope instead.
- **Contracts match exactly.** Client request/response types mirror the backend Zod schema — drift silently strips fields into no-ops. A key used in `useCan` must exist verbatim in the backend catalog.
- **Retired:** `pnpm sync:schema`, `pnpm check:schema`.

## 6. TypeScript & Code Quality

- `strict: true`. No `any` (`unknown` + narrowing), no `@ts-ignore`, no `!` abuse.
- `noUncheckedIndexedAccess` is **NOT enabled** in either repo and this rule has been aspirational, not
  enforced. Measured 2026-09-02: backend **574 errors / 190 files**, frontend **184 / 84** — and both
  are **floors**, because each build config excludes tests and scripts, so the flag would report "on"
  while much of the code went unchecked. Deliberately left off for the 10/10 code release rather than
  half-migrated; a half-enabled strictness flag is worse than an honest absent one. Tracked as a NEW
  REQUIREMENT needing an owner, not as a passing rule. Do not turn it on without owning the migration
  and stating what it does not cover.
- **Never force types.** No `as X` / `as unknown as X`. Raw `db.execute(sql\`…\`)` rows are `Record<string, unknown>` — convert at the use site (`Number(row.count)`, `row?.field ?? fallback`). If a cast feels necessary, fix the source type or the projection.
- **Discriminated unions** for state machines and API responses; exhaustive `switch` + `assertNever`.
- **Zod-validate every untrusted boundary** (bodies, params, env); types are compile-time only. **Schemas live in `*-schema.ts`** beside the feature (frontend) or the module's `dto/` (backend) — never inline in a controller, route, component or hook. Type via `z.infer`, never a parallel `interface`. Trivial single-field guards may stay inline.
- **Named event handlers only.** **Single-statement `if`/`for` bodies omit braces.**
- **No comments in code.** Delete stray comments, commented-out code, `console.log`s. If something genuinely needs explaining, **at most one** comment — otherwise remove it.
- Mentally test: error, loading, empty, network failure, invalid input, auth, concurrency, StrictMode double-invoke.

## 7. Structure & Naming (both repos)

- **kebab-case for every file and folder** (CI case-safety); PascalCase symbol inside.
- **File size** ≤300 lines target, 500 hard review → split by responsibility. Exceptions: generated files, unmodified shadcn primitives, `*.d.ts`.
- **Name the module for the module, the entity service for the entity.** Build sub-domains are `BuildQaModule`, `build-approvals.module.ts` — never `Projects*`; but `build/core/` keeps `ProjectsService` (it owns the `projects` entity). `project` ≠ `product` ≠ Build module (§8).
- **Permission catalogs are folders, not files** — one file per module behind a barrel (backend `modules/rbac/permissions/`, frontend `lib/rbac/permissions/`). Never a monolithic `permissions.constants.ts`; a cohesive catalog may exceed 500 lines rather than split artificially. **The two must not drift:** a frontend-only key fails `useCan` forever, a backend-only key can't be gated.
- Per-side layout: `backend/CLAUDE.md` §1, `frontend/CLAUDE.md` §6.

## 8. Product Rules

- Every page has list, create, edit, delete, filters, pagination, permissions, all states. ADD what's missing, REMOVE what isn't required (including files), fix folder placement + imports.
- **The delivery/strategy module is "Build"** — project management (`projects`, tickets, sprints, QA, backlog) AND product management (`managed_products`, roadmap, OKRs, feedback). Route `/build` (`/projects` redirects), RBAC `build:*`, module key `BUILD`, folders `build/`. **`project` ≠ `product`:** distinct tables, never merged; only the namespace is `build`.
- **Employee self-service and knowledge are platform core, not paid entitlements.** Every active member keeps Home, mail, chat, notifications, dashboard, their own time off/attendance/expenses/pay/employment documents, announcements, referrals + internal job openings (never the candidate pipeline, interviews or hiring administration), people directory and KB reading — even when their only enabled product is Build/CRM. The surface is universal; actions inside stay permission-gated. Canonical routes `/me/*`; handlers use `self:*`, derive the subject from `@CurrentUser()`, never accept a self `userId`, never carry `@RequireModule`. KB reads keep space/audience/record ACLs. HR/payroll/finance administration and KB authoring/analytics/settings stay permission- and module-gated. Enforce in backend effective permissions and shared navigation — never as a visible-only exception or a frontend entitlement constant.
- **Home holds universal work only:** dashboard/communication, `For Me`, announcements, people directory. Recruitment, interviews, employee administration, policies, payroll runs, accounting and every other module destination stay in their owning product nav.
- **Route ownership is a product contract.** Global administration = `/settings/*`; module configuration = `/<module>/settings/*`. Settings owns configuration and access governance, never operational work — workforce lives at `/directory/workers`, employee pay is self-service, payroll administration stays under `/payroll/*`. **Module-owned surfaces** (custom fields, automations, integrations, data-hub import/export) live in each module's settings, never global `/settings/*`. When a page moves to its canonical route, **delete the old route files — no legacy redirects** — and update every link.
- **One unified calendar.** `/calendar` serves everyone; module events (holidays, leaves, birthdays, review cycles, training, travel, interviews) are toggleable SOURCES from backend aggregates. Never module-specific calendar pages.
- **HR:** onboarding/profile forms collect only real new-joiner data — personal (phone, DOB, gender, address, emergency contact), bank/payroll, ID & document uploads. No recruitment-only fields (experience, skills). The onboarding form is **never** shown to org owners or platform admins — gate server-side and redirect (owner → setup/dashboard; platform admin → `/owner`).
- **Workspace gating:** no workspace → `/org-setup` (platform admins → `/owner`), enforced by the live-session check in `app/(authenticated)/layout.tsx`. Completing OR skipping a wizard is durable — server stamps the DB, invalidates the `userSession` cache, client calls `completeOnboardingGate` (`lib/onboarding-gate.ts`). Never bounce a user back into a skipped wizard.
- **Plan entitlements** FREE / PAID / ENTERPRISE resolve server-side from `subscriptions` via `PlanLimitsService`. Every creation endpoint for a limited resource calls `assertWithinLimit(orgId, key)` before insert. Paid-only modules (payroll, inventory) are blocked at `setModuleEnabled` on FREE; existing enablement is not revoked. Frontend reads `GET /billing/entitlements` via `useEntitlements`.
- **Platform billing is exactly 2 Settings pages:** `/settings/billing` (plan + promo + seats + usage · invoices & payments · billing profile) and `/settings/billing/ai-credits` (wallet, top-ups, auto-top-up, history). `/billing`, `/billing/ai-credits`, `/settings/subscription`, `/billing/seats` are deleted — never resurrect them. `/billing/invoices` is the org's own customer invoicing (accounting).
- **AI billing is token-metered:** `computeTokenCharge(model, in, out)`, never flat per-action; `AI_FEATURE_COSTS` are reserve ceilings only. The ledger stores integer **milli-credits**; APIs emit fractional credits; settle refunds under-run and debits overage. New AI endpoints use the gateway `*WithUsage` variants, return `aiUsage` meta, render `AiUsageChip`.
- **Organization hierarchy is archive/restore, never hard delete.** Business units, branches, departments, teams, locations, cost centers archive via a status mutation through `HierarchyArchiveDialog` — never add a permanent-delete control. A dependency conflict keeps the dialog open, lists every actionable dependency + count, and confirms nothing changed. Child-assignment selectors offer only `ACTIVE`, non-deleted parents. Every hierarchy mutation invalidates the `queryKeys.hierarchy.all` prefix.

## 9. Reliability

- Idempotent + transactional writes so retries are safe. Stateless services. One-directional flow (features → shared, never shared → features).
- **The import graph stays acyclic, proven by `madge --circular` — both repos are at zero.** Run it before claiming done. Fixes in order: (1) move the shared type to a neutral module — a type beside runtime code drags that file into every importer (`Db`/`TenantTx` in `db/drizzle.types.ts`; a form's Zod schema in `*-schema.ts`); (2) extract the leaf service into its own module — `forwardRef` hides a cycle, it does not remove one, and is banned in new code; (3) never import a barrel from inside its own tree; (4) co-locate mutually-referencing tables (`bugs` ↔ `test_cases`).
- `import type` on an injected Nest service erases the DI token (boot failure, or a silent `null` under `@Optional`) — never use it to break a DI cycle.
- Re-check version-sensitive rules against installed versions. Prefer additive, backward-compatible changes.

## 10. Dead Code

Remove dead/duplicate code, unused schemas/APIs/hooks/components/types — and delete their files. **Dead-code claims are proven by a module-graph tool, not grep** — import-search misses side-effect imports (`import "./x";`), dynamic `import()` and re-export chains, which already cost a live file. Prove with **knip** (`pnpm exec knip --no-progress`), confirm with a real `next build` / `nest build` (`tsc --noEmit` misses a missing side-effect import). Deleting a schema file also needs zero symbol references, zero raw table-name references and no dependent FK.

**knip alone NEVER justifies deleting a schema file.** `db/schema/hrms-phase1-sql-managed.ts` is a deliberate holding barrel for tables managed by raw SQL migrations in a pending root, kept out of the runtime barrel so Drizzle never manages them — asserted by `migration-integrity.spec.ts` ("keeps SQL-managed objects outside the Drizzle schema and journal"). Being unimported *is* the design, so knip reports all 11 of its files as unused; deleting them on that basis removes a spec-guarded arrangement. Before removing any schema file: grep the repo for its **path** (not just its symbols) to find specs asserting it, and confirm no barrel outside `db/schema/index.ts` re-exports it.

**Emptiness is not deadness.** A table with zero rows is usually an unseeded feature, not an abandoned one — all 95 empty `hr_*` tables are referenced by live services. Two ways a reference scan lies: a symbol pattern that misses `pgTable(` (capital T) maps nothing and reports *every* table unreferenced, and the table name often sits on the line *after* the `pgTable(` call, so single-line patterns find none. If a scan says "everything is dead", the scan is broken.

## 11. Definition of Done & Testing

Types ✓ (Build ✓ where run; **Lint/Tests only when I explicitly ask — otherwise reported as not run, never as passing**) · CRUD complete · RBAC gated + scoped · tenant-scoped queries · caching invalidated on mutation · responsive (375/768/1280) · accessible · secure (BOLA re-asserted, inputs validated, no secrets leaked) · tests present · no file over 500 lines without a §7 exception · `PAGES.md` updated.

A new module ships **controller e2e specs** (auth + RBAC + scope allow/deny, credit exhaustion, cross-tenant isolation) **and** unit tests for access/credit/permission logic. Two traps: a `db.transaction` mock must invoke its callback (a bare `jest.fn()` silently voids every assertion inside it), and `*e2e-spec` files run only under `pnpm test:e2e`.

## 12. Output & Precedence

**Audit:** violations found + intended changes, then wait. **Fix:** only the modified/added/deleted paths and their changes — no prose unless justifying a decision. Always be able to state: Findings · Root cause · Solution · Files changed · Validation.

Precedence: my instruction now → Cardinal Rules (§1) → the side-specific file on its own domain → this file → the repo's established pattern (and tell me when you rely on it, so we codify it). When genuinely unsure and the choice is structural, **ask briefly** rather than guess.
