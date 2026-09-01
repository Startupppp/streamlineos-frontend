# SLO catalogue — one objective, owner, alert and runbook per module and per queue

**Written: 2026-09-01.** Closes the PRD §11 item *"Define an SLO, owner, alert and runbook for each
included module and critical queue."*

This document is a rendering, not the source. The source is
`backend/src/common/slo/` and it is enforced by `backend/src/common/slo/slo-catalogue.spec.ts`,
which runs in the default jest suite. Prose drifts; that spec cannot.

---

## What the spec enforces

Fourteen assertions, each of which fails the build rather than warning:

| Assertion | What it stops |
|---|---|
| Every in-scope module in `MODULE_REGISTRY` has a read AND a write objective | A new module shipping with no owner and no objective |
| No objective exists for an excluded product domain | Scope creep into CRM/Inventory |
| Every queue file discovered on disk has an objective | A new consumer or worker with nobody watching it |
| No queue subject names a file that has been deleted or moved | A catalogue that silently stops describing reality |
| Every objective's owner is in the single owner vocabulary | Two spellings of the same team |
| Every owner used by the alert registry is in that same vocabulary | The alert and SLO vocabularies drifting apart |
| Every objective points at an alert registered for dispatch | An objective nobody is paged for |
| Every objective points at a runbook heading that exists | A paged operator opening a dead link |
| Every **dispatchable alert** points at a runbook heading that exists | The same, for alerts with no SLO |
| Every seam objective names a declared `SEAM_BUDGETS` key | An objective measured against an invented number |
| Every queue target equals the number its alert actually fires on | A published objective the alert never enforces |
| Every job-backed queue is registered in `alert-job-queue-age.mjs` | A job table nobody polls |
| Discovery is not vacuous (≥15 queue files, ≥20 modules) | A broken scan reporting "all covered" |
| Objective ids are unique | Silent overwrite |

The queue-file discovery walks `backend/src/` for `*.consumer.ts`, `*-worker.service.ts` and
`*-outbox-relay.service.ts`. It is deliberately a filesystem walk, not a hand-list: a hand-list
agrees with reality only on the day it is written.

## Two defects this work found and fixed

**1. The `queue-age` alert linked to a runbook heading that does not exist.** The alert registry in
`alert-dispatch.mjs` built every runbook URL as `RUNBOOKS.md` + anchor, but `queue-age`'s anchor is
`#queue-backlog`, which lives in `FAILURE-RUNBOOKS.md`. `RUNBOOKS.md` has no such heading. An
operator paged for a backing-up outbox received a dead link. Fixed by giving a registry entry an
optional `runbookFile`. The spec assertion "every dispatchable alert points at a runbook heading that
exists" reproduces the original failure exactly when the fix is reverted — that is the proof it bites,
not an assertion that it does.

**2. Eight durable job queues were watched by nothing.** `alert-queue-age` polls `outbox_events`
only; `alert-dead-delivery` polls `notification_deliveries` only. Every other durable queue —
`ai_jobs`, `payroll_jobs`, `payroll_run_export_jobs`, `expense_export_jobs`,
`finance_report_export_jobs`, `hr_export_jobs`, `gdpr_export_jobs`, `kb_export_jobs` — is drained by
its own worker against its own table. A stopped worker left rows queued indefinitely and paged
nobody. `backend/src/scripts/alert-job-queue-age.mjs` closes this, with a
`## job-queue-age` runbook section and registration in `check-alert-system.mjs`.

The new alert exits 2 — a configuration error, not a clear — when its registry names a table that no
longer exists, because a stale registry silently stops watching a live queue.

---

## Module objectives

40 objectives across 20 in-scope modules (every `MODULE_REGISTRY` entry except the excluded CRM and
Inventory domains). Each module carries a read objective against the `route.cached.read` seam budget
and a write objective against `route.write`, both alerted by `seam-latency`
(runbook `RUNBOOKS.md#seam-latency`).

The budgets are not invented for this document — they are the existing `SEAM_BUDGETS` values derived
from the c28 PRD latency objectives: `route.cached.read` p95 150 ms (alert threshold 112 ms),
`route.write` p95 500 ms excluding declared async work (alert threshold 375 ms).

| Module | Owner | Read surface | Write surface |
|---|---|---|---|
| hr | people-team | employee, leave, attendance and recruitment lists | employment, leave and onboarding mutations |
| payroll | people-team | run, payslip and component lists | run posting and payslip release |
| timesheets | people-team | timesheet and approval lists | timesheet submission and approval |
| directory | people-team | people directory and worker lookups | person, worker and engagement mutations |
| build | delivery-team | board, backlog, ticket and sprint lists | ticket, sprint and QA mutations |
| workflows | delivery-team | workflow definition and run lists | definition and manual-run mutations |
| sign | delivery-team | envelope and recipient lists | envelope send, sign and void |
| surveys | delivery-team | survey and response lists | publish and response submission |
| feedbucket | support-team | feedback item lists | feedback capture and triage |
| support | support-team | ticket, queue and SLA lists | ticket create, assign and resolve |
| accounting | finance-team | ledger, invoice and report lists | journal posting and invoice issue |
| billing | payments-team | plan, invoice, seat and AI-credit reads | checkout, verification and credit settlement |
| kb | knowledge-team | space, page and retrieval reads | page authoring, publish and reindex |
| blog | knowledge-team | public post reads | post authoring and publish |
| chat | communications-team | conversation and message history reads | message send and reaction |
| mail | communications-team | mailbox and thread reads | send, reply and label mutations |
| calendar | communications-team | aggregated calendar source reads | event, recurrence and attendee mutations |
| home | communications-team | dashboard, For Me and announcement reads | self-service actions surfaced on Home |
| notifications | notifications-team | inbox, unread-count and cursor reads | read, dismiss and preference mutations |
| settings | platform-reliability | organization, hierarchy and access-governance reads | organization, role and module-enablement mutations |

## Queue objectives

25 objectives across 17 queue subjects. Outbox-backed subjects carry both a freshness and a
durability objective; job and delivery subjects carry freshness only, because their dead state is
the same signal.

| Queue | Drains | Owner | Freshness alert | Durability alert |
|---|---|---|---|---|
| workflow-outbox-relay | outbox_events | delivery-team | queue-age | dead-outbox |
| notification-outbox-relay | outbox_events | notifications-team | queue-age | dead-outbox |
| chat-fanout-outbox | outbox_events | communications-team | queue-age | dead-outbox |
| expense-outbox | outbox_events | finance-team | queue-age | dead-outbox |
| ar-reminder-outbox | outbox_events | finance-team | queue-age | dead-outbox |
| finance-report-export-outbox | outbox_events | finance-team | queue-age | dead-outbox |
| gdpr-export-outbox | outbox_events | platform-reliability | queue-age | dead-outbox |
| hr-helpdesk-events | outbox_events | people-team | queue-age | dead-outbox |
| notification-delivery | notification_deliveries | notifications-team | dead-delivery | — |
| ai-jobs | ai_jobs | platform-reliability | job-queue-age | — |
| payroll-jobs | payroll_jobs | people-team | job-queue-age | — |
| payroll-run-export | payroll_run_export_jobs | people-team | job-queue-age | — |
| expense-export | expense_export_jobs | finance-team | job-queue-age | — |
| finance-report-export | finance_report_export_jobs | finance-team | job-queue-age | — |
| hr-export | hr_export_jobs | people-team | job-queue-age | — |
| gdpr-export | gdpr_export_jobs | platform-reliability | job-queue-age | — |
| org-purge | organization_purge_confirmations | platform-reliability | job-queue-age | — |

Targets, each equal to the value its alert actually fires on and asserted equal by the spec:

- outbox freshness — oldest PENDING row ≤ 300 s, cumulative retry pressure ≤ 500
- job freshness — oldest queued/running row ≤ 900 s
- durability and delivery — zero rows reach DEAD state in a 24 h window

---

## What is still open, and why

**Owner names are role identifiers, not a rota.** `people-team`, `delivery-team`, `finance-team`,
`knowledge-team`, `communications-team` and `support-team` are new; `platform-reliability`,
`notifications-team` and `payments-team` already existed in the alert registry. Mapping each role to
named humans and an on-call schedule is the repository owner's decision, not a code artifact. The
vocabulary is enforced in one place (`SLO_OWNERS`) so the mapping has exactly one place to land.

**Module objectives are attributed per module — this gap is now closed.** `backend/src/scripts/route-attribution.mjs`
is the single route-to-module resolver:

- It maps an API route's first path segment through the same logic as `moduleOwningNamespace()` in
  `module-vocabulary.ts` — Home administering `chat`, `mail`, `calendar` and `notifications` is
  encoded, CRM administering `party` is encoded, and the two route-segment exceptions (`/knowledge`
  → `kb`, `/dashboard` → `home`) where the module id differs from the route segment are also handled.
- `PLATFORM_NAMESPACES` (`health`, `auth`, `cron`, `platform`) is declared explicitly so a new
  namespace that appears in neither the module map nor that set is returned as `{ unattributable: true }`
  rather than silently defaulted to `platform-reliability`.
- Modules excluded from the SLO scope (`crm`, `inventory`) return `{ sloExcluded: true }` and are
  routed to `platform-reliability` so they page someone, but are distinguishable from platform surfaces.

`alert-p95.mjs` now adds an `attribution` field to every endpoint in `hottest` and `breached`.
`alert-seam-latency.mjs` now groups route-level seam spans (`route.cached.read`, `route.write`) by
module and includes `attributedModules` in every breached seam entry — so a seam page names the
owning team alongside each contributing module.

Four self-tests cover the cases: `/hr/...` → people-team, `/chat/...` → communications-team (via
home), `/health` → platform-reliability, undeclared namespace → `unattributable`. An anti-vacuity
guard asserts that HR and chat return different owners, so a resolver that maps everything to one
team fails the test. All fourteen alert scripts pass `node src/scripts/check-alert-system.mjs` and
the spec suite at `src/common/slo/slo-catalogue.spec.ts` covers the attribution logic.

**No alert reaches a human in any environment.** `ALERT_WEBHOOK_URL` is unset. Every objective above
is measured and every alert fires with the correct payload and a working runbook link, but the
transport terminates at a local sink. This is the single operator action that turns this catalogue
from a measurement into an on-call contract, and it is tracked in
`PRODUCTION-OPERATIONS-STATUS.md` §6.
