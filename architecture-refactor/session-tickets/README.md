# Session tickets — completing PRD-IN-SCOPE

Ten independent work packages. Each is one Claude session. Run them in **any order**, or several at once — no ticket waits on another. Together they complete `architecture-refactor/PRD-IN-SCOPE.md`.

## How to run one

Completed ticket files are intentionally removed after their evidence is retained in `reports/` and the PRD. Only the active ticket files listed below should be launched.

Open a session in `D:/projects/personal/Streamlineos` and say:

> Read `architecture-refactor/session-tickets/COMMON.md`, then execute
> `architecture-refactor/session-tickets/S06-communications.md` end to end.
> Verify every premise against current source before editing, run every validation
> command, and write the report the ticket asks for.

Substitute the ticket you want. Nothing else is needed.

## How a session behaves

- **Questions come once, at the start.** The session inspects the source, then asks every blocking question in a single message with selectable options. After that it runs to completion without checking in.
- **It ticks its own todo list.** Each ticket is a live checklist of `- [ ]` items. The session marks each `- [x]` as it finishes and proves it, with a verdict of `DONE` · `VERIFIED DONE` · `FALSE PREMISE` · `OPEN`. That file is how the next session — or a resumed one — knows what is left.
- **It stops only when every item is ticked**, or explicitly marked OPEN with a concrete reason.
- **Typechecks and builds run once, at the end** — not after every edit. Fast feedback during the work comes from narrowly scoped jest runs. The backend typecheck needs an 8 GB heap and a full frontend lint run takes 25+ minutes, so running them per change is the biggest waste available.

## Why they are independent

Independence is enforced by **exclusive file ownership**. Every source file in the repo belongs to exactly one ticket. A session that needs a change outside its globs records it under `OUT-OF-OWNERSHIP` in its report instead of making it — the owning session picks it up on its own run. No session ever blocks.

Shared files that could collide, and the rule for each:

| Shared file | Rule |
|---|---|
| `backend/migrations/meta/_journal.json` | Each session appends only its own entries, last. On conflict run `pnpm db:reconcile-journal` — never hand-merge. |
| `backend/openapi.json` + `frontend/contracts/openapi.json` | Any session that changes a route or DTO regenerates and re-vendors at the end of its run. Last writer wins; it is a generated artifact. |
| `backend/src/modules/rbac/permissions/**` + `frontend/lib/rbac/permissions/**` | **S01 owns both catalogs.** Other sessions that need a new key report it; they never add it. Both catalogs must stay byte-aligned or `useCan` breaks. |
| `backend/src/common/**` | **S08 owns it.** Other sessions report needed changes. |
| `frontend/app/**`, `frontend/lib/rbac/route-access/**`, navigation | **S09 owns it.** Backend/domain sessions report needed route changes. |

## The tickets

| # | Ticket | Scope |
|---|---|---|
| S01 | `S01-identity-org-rbac.md` | Auth, sessions, MFA, users, organization, access, RBAC, module-access, settings, ownership, delegations. **Owns both permission catalogs.** |
| S02 | **Archived — complete** | HR, directory, careers, offer-fulfillment, e-sign + HR frontend; evidence in `reports/S02-final-report.md` |
| S03 | **Archived — complete** | Payroll, timesheets, expenses + their frontend; evidence retained in reports and PRD |
| S04 | **Archived — complete** | Build/PM, issues, tasks, goals, reports, workflows, automation + their frontend; evidence retained in reports |
| S05 | **Archived — complete** | Billing, accounting, finance, invoices, quotes + their frontend; evidence in `reports/S05-report.md` |
| S06 | `S06-communications.md` | Chat, calendar, notifications, mail, email, push, webhooks, realtime + their frontend |
| S07 | `S07-knowledge-search-ai.md` | KB, wiki, search, AI, support, blog, surveys, CSAT, feedbucket + their frontend |
| S08 | `S08-home-platform-ops.md` | Home/dashboard, cron, audit-log, storage, ingress, public, portal, `common/**`, OpenAPI coverage, cache proof, operator runbooks |
| S09 | **Archived — complete** | All `frontend/app/**` routes and layouts, route-access registry, navigation, shared UI, formatters, a11y, responsive |
| S10 | **Archived — complete** | CRM + Inventory isolation tests (tests only), dead code, final whole-repo verification matrix; evidence in `reports/S10-final-report.md` |

## Progress so far (do not redo)

A first pass already closed these. Each ticket restates them so you can confirm rather than repeat:

- **The API could not boot.** `FinanceArModule` was missing `OutboxModule`, so `ReminderOutboxConsumer` could not resolve `OutboxConsumerRegistry`. Fixed.
- **Migration chain repaired.** 119 orphan future-dated `__drizzle_migrations` rows deleted; migrations `0661`/`0662` applied; `0659` recorded. `check:migration-chain` PASSES. One known pre-existing difference remains: `expense_export_jobs.requested_by` vs `requested_by_membership_id` (→ S03).
- **RBAC referential integrity repaired.** `seed-enterprise-workspace.ts` inserted 687 permissions without `administering_module_key`, so the catalog FK rejected valid grants. 593 rows repaired and both writers now share one `buildPermissionCatalogRows` builder. `verify:rbac-integrity` 10/10.
- **Zero circular imports** in both repos, proven by `madge@8` to completion (4,159 + 4,703 files).
- **OpenAPI regenerated and re-vendored** — 3,545 operations, **1,917 carrying a Zod contract (54%)**. Raising that is S08's headline item.
- **Route access is now fail-closed.** The universal-route exclusion list was replaced with an allowlist; 6 layouts gained server-side enforcement.
- Dashboard Build visibility, org multi-creation + rate limit, payroll salary-profile repository, notifications decomposition, membership-revocation specs: done.

Verified counts that contradict the PRD text — trust these:

- Oversized in-scope production files: **65 backend / 18 frontend** (PRD says 88/22).
- `event_attendees` and `chat_message_reactions` **already exist** as normalised tables with composite tenant FKs. The remaining work is contracting the legacy columns, not normalising.
- Legacy organisation actors: **555/555 remaining** — expand is done, contraction has not started.
- Tenant-isolation coverage: **154/783 services**, 629 uncovered. Split across the domain tickets.

## Definition of done for the whole programme

Every ticket reports DONE with evidence, and the §28.18 verification matrix is green: both typechecks, zero cycles, zero undeclared handlers, zero permission drift, tenant-isolation coverage complete, migration chain clean, OpenAPI complete and synchronised, no unbounded list, no proved dead code, and the operator-owned infrastructure rows either satisfied or recorded as explicit OPEN blockers.

Operator-blocked infrastructure (independent cells, physical replica, PITR restore, production-shaped load, live alert delivery, cost) is delivered as **runbooks** and stays OPEN until the owner runs it. Never convert missing infrastructure into a passing code-only claim.
