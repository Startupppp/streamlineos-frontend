# Build module — Codex UI verification handoff

Status: **READY_FOR_CODEX_UI**. Every automated gate this environment can run is green. Browser verification has **not** been performed by this coordinator — that is Codex's job, per the brief this closure effort ran against. Nothing here should be read as a claim of visual or interactive correctness.

## Final commit SHAs

| Repo | Branch | HEAD SHA |
|---|---|---|
| Backend (`hrms-integration-backend`, a worktree of `streamlineos-backend`) | `build/phase1-closure` | `8e9eca825` |
| Frontend/root (`hrms-integration-frontend`, a worktree of `streamlineos-frontend`) | `build/phase1-closure` | `4cd7e40af` |

Neither branch has been merged into `main` or pushed to `origin` yet. That is a deliberate stop, not an oversight — see **Not done** below.

## Migrations

Two new migrations landed this session, both hand-authored, journalled, and rollback-equipped:

- `1165_build_automation_run_history.sql` — `project_automation_runs` / `project_automation_run_actions` (durable automation run history)
- `1166_build_incident_postmortem_fields.sql` — `release_id` link, `incident_decisions`, `incident_follow_up_actions`
- `1167_invoices_deal_id.sql` — `deal_id` on `invoices` for freelancer client/deal traceability (renumbered from a colliding `1165` during integration; see commit `912ee2d12`)
- `1164_candidate_consent_at.sql` — pre-existing, pending at session start; this session added its missing rollback (`1164_candidate_consent_at.down.sql`)

**Applied-migration evidence does not exist for any of these.** The database is unreachable from every environment available to this session: `aws sts get-caller-identity` resolves to an AWS account (`922384915031:root`) with zero visibility into the RDS instance (`aws rds describe-db-instances` returns an empty list in the relevant region), and a validly-generated RDS IAM auth token is still rejected with `PAM authentication failed`. `pnpm check:migration-ledger` and the DB-touching half of `pnpm check:migration-chain` both fail on connection, not on logic. `docs/build-module/99-open-questions.md` independently confirms `.env`/`.env.production` resolve to the **same production RDS host** — there is no non-production database anywhere in this stack. Before/after ledger counts cannot be produced without real access.

**Action required before this can go further:** someone with working credentials (the AWS profile that actually owns the RDS instance, or VPN-gated access) needs to run `pnpm check:migration-ledger` and `pnpm check:migration-chain`, then apply `1164`, `1165`, `1166`, `1167` with the repository's real migration command (`db:migrate` per existing scripts — do not invent a substitute), and report the resulting ledger watermark.

## What's actually done (automated evidence)

| Gate | Result |
|---|---|
| Root `check:route-census` | PASS — 74 Build routes, 65 pages, 0 weak cold-load gates |
| Root `check:build-execution-plan` | PASS |
| Root `typecheck:web` | PASS, 0 errors |
| Frontend `check:contract-parity` | PASS — 0 new contract gaps (571 pre-existing frozen baseline entries unchanged) |
| Frontend Build+timesheets suite (`jest features/build lib/build features/timesheets`) | **215/215 suites, 1798/1798 tests** |
| Frontend production build (`next build`) | PASS |
| Backend `typecheck` | PASS, 0 errors |
| Backend `check:build-authz-census` | PASS — **VULNERABLE 0, NEEDS-REVIEW 0, CLOSED 40, VERIFIED 285**, 325 handlers across 49 controllers |
| Backend `check:migration-discipline` | PASS, 0 new violations (923 SQL files) |
| Backend `check:migration-rollback` | PASS, 0 violations |
| Backend `check:openapi-path-params` | PASS — 3958 operations, all path params declared |
| Backend `check:test-typecheck` | PASS, 0 errors |
| Backend `check:spec-typecheck` | PASS, 0 errors |
| Backend Build suite (`jest src/modules/build`) | **220/220 suites, 2132/2132 tests** |
| Backend production build (`nest build`) | PASS |
| Backend `check:migration-ledger` / DB half of `check:migration-chain` | **BLOCKED — DB unreachable, see above** |

One pre-existing, unrelated failure is known and explicitly out of scope: `src/modules/directory/worker-number-reservation.spec.ts` fails on a stale DB mock (`this.db.select(...).from(...).innerJoin is not a function`). Confirmed via git history to predate this entire session (unrelated to any file this closure effort touched) and outside the Build module — not fixed here.

## Security work this session closed

All 99 previously-NEEDS-REVIEW authorization findings were hand-reviewed (not rubber-stamped — each evidence line was independently read against live source). Result: 98 were genuinely safe (now VERIFIED/CLOSED), and **4 were real, confirmed authorization bypasses**, all fixed with regression tests:

- `PATCH`/`DELETE /build/:projectId/automations/:automationId` — a project-scoped manager (no org-wide `build:manage`) could rewrite or destroy another project's automation rule by ID; the mutation's `WHERE` never re-bound `projectId`. Fixed.
- `POST /build/:projectId/tickets/:ticketId/comments/:commentId/reactions` and its `DELETE` counterpart — `:projectId` was validated in the URL but never bound anywhere in the call chain; any `build:tickets:update` holder could react to any comment on any ticket in the org regardless of project. Fixed with a new ticket-in-project existence check.

Also closed: the Intake list endpoint returned `{ items }` instead of the `{ data }` its own schema and the frontend both expected — root cause of the `/build/[projectId]/intake` crash named in the original baseline. (The original baseline used `/build/5` as the example project; project 5 does not exist in the active organisation — use project 6 for QA. Verified 2026-09-23: `frontend/app/(authenticated)/build/[projectId]/intake/page.tsx` exists and is a live product route.) Client-portal grant checks now enforce `expiresAt`, not just `status = "ACTIVE"`. `ApprovalsService.softDeleteApproval` now audit-logs, matching every sibling mutation.

## Freelancer billing chain (previously the one genuinely unbuilt Phase 3/4 item)

The prior baseline described this as largely unbuilt; the real state was narrower — an `invoices` module, `TimesheetInvoicingService`, and canonical CRM `deals`/`clientAccounts` already existed. Three real gaps were closed:
1. `voidInvoice` now releases the timesheet entries it had claimed back to `UNINVOICED` in the same transaction — this is the actual fix for stranded `INVOICE_DRAFTED` records the brief named.
2. `invoices.deal_id` added, defaulted from the project's own deal.
3. `POST /timesheets/billing/release-draft` — a new endpoint to un-stick entries stranded by the export-only draft path, with a `DraftedEntriesBanner` surfaced on the existing Billing Queue page.

`assertTimesheetEntriesLinkable` deliberately still admits an `INVOICE_DRAFTED` entry into a generic invoice create — an existing test explicitly pins this as intentional. Not touched; narrowing it would redesign semantics nobody asked to change.

## Automation run history & incident postmortems (Phase 5)

`BuildAutomationRunnerService` previously had no persistent record of any rule execution. Added `project_automation_runs`/`project_automation_run_actions`, wired through the file's existing `registerAfterCommit` mechanism (not a new one), plus depth-3 loop prevention (`AsyncLocalStorage`-keyed) and a `300/min` per-org-project rate limit. A read endpoint exists at `GET /build/:projectId/automations/runs`.

Incidents gained `release_id` (links to the one canonical release entity in this codebase — there is no separate service catalog), an append-only `incident_decisions` table, and `incident_follow_up_actions` with title/owner/status/due-date lifecycle.

## Known deferred items, with rationale

- **Saved scenario planning** (Phase 3) — no specification anywhere in `docs/build-module/` requires it. Confirmed independently by two separate investigations this session. Deferred per the brief's own instruction to not build speculative UI.
- **`/build/[projectId]/intake` route consolidation** — blocked on a genuine, unresolved product decision (`99-open-questions.md` #11): the route manifest says CONSOLIDATE into `/build/[projectId]/forms`, but `99-kill-list.md` describes the replacement as a Forms/Triage **split**, implying submissions land on `/triage` instead. These two documents disagree on the actual destination. Not executed — picking one would be a guess on a routing decision that changes real deep links.
- **`build:sprints:view` permission key** (`99-open-questions.md` #12) — the last surviving "sprint" vocabulary artifact (nav entry, cycle entity card) after the Sprint→Cycle contraction. Left as-is: renaming breaks every already-issued grant, and no `build:cycles:*` key exists yet to migrate to.
- **Portfolios vs. Programs distinction, Wiki ownership model, freelancer org billing/permission model, AI-processing data classification, retention/legal-hold requirements** (`99-open-questions.md` #3, #4, #6, #9, #10) — genuine unanswered product decisions, not implementation gaps. Left alone rather than guessed at.
- **`worker-number-reservation.spec.ts`** — pre-existing failure outside the Build module, confirmed to predate this session. Not fixed (out of mandate).

## Seed data and test prerequisites — read this before testing

**There is no seed script that creates a fresh Build-enabled organization**, and **no non-production database exists** (`.env` / `.env.production` resolve to the same RDS host, confirmed in `99-open-questions.md` #13). Any manual verification touches real data. The one documented fixture: **project `6`** is referred to internally as "Build QA Sandbox"; **project `1`** contains representative work but is not a sandbox. No specific organization ID is documented anywhere — find one via the running app's own org switcher after authenticating, or ask the org owner which org those two project IDs live under.

**Minting an authenticated session without a browser login flow:**
```
node --env-file=.env scripts/mint-session-cookie.mjs --user-id=<uuid> --email=<address> --out=.session-cookie
```
(run from `frontend/`). This calls `next-auth/jwt`'s `encode()` directly using the same `NEXTAUTH_SECRET` the running app validates against — no password, no browser. Has a `--self-test` flag. The resulting `authjs.session-token` cookie value only needs to carry identity; the app's session callback re-fetches role/org/plan/modules from the backend on first use.

**To run the app locally:** both servers need to be started (backend NestJS + frontend Next.js), each with its own `.env`. Force dark mode via `localStorage` if the org's theme preference isn't set. No further specifics are given here to avoid duplicating instructions that may drift — check each repo's own README/package.json scripts for the current start commands at the time of testing.

## Routes for verification, grouped by priority

74 routes, 65 physical pages (per `frontend/lib/build/build-route-manifest.ts` and `check:route-census`). Grouped by where they're most likely to break, not by a hard desktop/mobile split — verify every route at both sizes, but budget more time on the "desktop-priority" group first since those are edit-dense.

### Desktop-priority (detail/edit-dense — dense forms, multi-panel layouts, keyboard-heavy)
Project-scoped: `tickets/[ticketKey]`, `qa/runs/[runId]`, `cycles/[cycleId]`, `feedbucket/[submissionId]`, `incidents/[incidentId]`, `meetings/[meetingId]`, `forms/[formId]`, `wiki/[pageId]`, `whiteboard`, `settings`, `settings/automations`, `settings/integrations/webhooks`, `settings/workflow`.
Org-scoped: `goals/[goalId]`, `managed-products/[managedProductId]` (+ its `feedback`/`goals`/`insights`/`projects`/`roadmap` sub-tabs), `portfolios/[portfolioId]`, `teams/[teamId]`, `settings/access`, `settings/client-access`, `settings/integrations`.

### Both priorities equally (list/dashboard surfaces — must work well at both sizes)
Project-scoped: root list, `approvals`, `backlog`, `budget`, `change-requests`, `chat`, `client-portal`, `cycles`, `decisions`, `epics`, `feedbucket`, `files`, `forms`, `issues`, `meetings`, `milestones`, `modules`, `qa`, `releases`, `reports`, `risks`, `triage`, `updates`, `wiki`, `workload`.
Org-scoped: `all-work`, `approvals`, `command-center`, `goals`, `inbox`, `managed-products`, `my-work`, `portfolios`, `programs`, `roadmap`, `teams`, `templates`.

### Deliberately not executed — do not test as if live
`/build/[projectId]/intake` (see **Known deferred items**).

## Required interactions and expected results, by route category

**List/dashboard pages** — create (opens the canonical create surface: Dialog ≤5 fields, Sheet for 6+/multi-section, never a hand-rolled form), edit inline where the field is optimistic-safe (status/priority/assignee/dates/estimate/labels only — never financial/access/approval/publication fields), delete via `ConfirmDialog destructive`, filter/sort/group changes reflected in the URL and reset pagination to page 1, browser back/forward respects filter state, keyboard (`/` search, `c` create, `j/k` move, `Enter` open, `?` help) works outside text inputs and is silent inside them. Expect: loading shows a skeleton matching final geometry (not a spinner), empty state distinguishes "nothing yet" from "filtered to nothing," a denied read shows `NoPermissionState` (never a false empty state), a 402 shows the module's real upgrade path (never a generic error).

**Detail pages** — edit persists and the URL/tab state survives a refresh, delete/archive confirms first, a concurrent edit surfaces a version-conflict comparison (not a silent overwrite) where that's implemented (ticket detail — `ProjectsTicketConflictException` is real and tested; not every detail page has this).

**Client portal / public routes** (`client-portal`, `feedbucket` public submission, public forms) — an expired or revoked grant now correctly denies access (fixed this session) rather than treating status alone as sufficient; a cross-tenant/nonexistent resource id returns an indistinguishable 404, never a 403 that confirms existence.

**Settings pages** — every mutation that should audit-log does (spot-checked this session: approvals now do, automations/incidents were already covered from their own build).

**Responsive** — test at 375 / 768 / 1280px per FE-120. Rung-2+ popovers and filter/menu panels should become a Drawer below `md`.

## What Codex should NOT assume

- That any of the above renders correctly in a real browser — nothing here is visual/interactive proof, only static/unit-level evidence.
- That migrations 1164–1167 are applied anywhere. They are not, and cannot be from this environment.
- That the two branches are on `main`. They are not merged or pushed.
- That `/build/[projectId]/intake` is reachable in its final form — it isn't; the destination is genuinely undecided.
