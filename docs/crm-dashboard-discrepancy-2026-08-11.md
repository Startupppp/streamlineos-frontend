# CRM dashboard discrepancy report — SCH-002

**Date:** 2026-08-11 · **Status:** report only — **no figures changed**
**Why a report and not a fix:** the Execution Protocol's default for untrusted report data is *produce a
discrepancy report, change no figures*. Repointing five aggregation services blind, with no data to compare
against (see Measurement below), would silently change every number on the sales dashboards with no way to prove
the new ones right.

---

## The defect

The CRM has **two parallel entity families**. The canonical one is written by the app; the legacy one is
read-only:

| Entity | Canonical (full CRUD service + controller) | Legacy (read-only) |
|---|---|---|
| Person | `contacts` (`schema/crm/contacts.ts:112`) | `crm_people` (`schema/crm/analytics.ts:10`) |
| Company | `crm_organizations` (`contacts.ts:87`) | `crm_companies` (`analytics.ts:30`) |
| Deal | `deals` (`schema/crm/deals.ts:36`) | `crm_deals` (`analytics.ts:45`) |

**The dashboards read the legacy family.** So sales figures are computed from a hand-seeded roster rather than from
the deals the app actually creates.

## Measured table usage

Counts are `grep -oE` occurrences of each symbol per service, run 2026-08-11.

| Service | `crm_deals` | `crm_companies` | `crm_people` | canonical `deals` | Verdict |
|---|---:|---:|---:|---:|---|
| `sales-dashboard.service.ts` | **63** | — | 1 | 3 | Almost entirely legacy |
| `crm-sales-dashboard.service.ts` | **18** | — | 1 | 3 | Almost entirely legacy |
| `sales-analytics.service.ts` | **18** | — | 4 | **23** | ⚠️ **Mixed — reads both** |
| `crm-people.service.ts` | 4 | 4 | 6 | 1 | Legacy roster |
| `crm-support-dashboard.service.ts` | — | **15** | — | — | Legacy accounts |

**`sales-analytics.service.ts` is the worst case:** it imports *both* families, so a single screen can show a
deal-cycle metric derived from real `deals` beside a rep-comparison derived from legacy `crm_deals`. Two numbers on
one page, two different sources of truth, no indication which is which.

## Structural consequences beyond wrong numbers

1. **`crm_deals.salesRepId → crm_people.id`**, not `users.id`. There is no join path from a dashboard "rep" to a real
   org member, so rep attribution cannot be reconciled with anything else in the platform.
2. **`territory_reps.crm_person_id → crm_people.id`** (`deals.ts:639`). Territory assignment therefore points at the
   legacy roster, and territory features are live (`crm-territories.controller.ts`). This is `SCH-010`.
3. **`crm_activities.personId → crm_people.id`** (`analytics.ts:60`), and `tasks.service.ts:216` writes into it — so
   task-completion activity lands in a table the canonical timeline never reads. This is `SCH-003`.

## Measurement — why no numeric comparison is included

Queried directly this session against the configured `DATABASE_URL`:

| Table | Rows | Distinct orgs |
|---|---:|---:|
| `contacts` · `crm_people` · `crm_companies` · `crm_deals` · `crm_leads` · `crm_organizations` · `deals` · `leads` | **0** | **0** |

Every CRM table is empty — a freshly rebuilt dev database. So a legacy-vs-canonical numeric diff is **not
computable here**, and 0 rows in dev says nothing about production. Per the protocol default ("assume live
production tenants"), production is assumed populated and no table is dropped.

## What must happen before any repoint

1. **Run this report's queries against a populated environment** and record, per org, the delta for each dashboard
   metric between legacy and canonical sources. That delta is the thing stakeholders must accept before the numbers
   move — a silent change to closed-won totals is not acceptable.
2. **Decide the fate of the legacy rows**: backfill into canonical, or accept the discontinuity and annotate the
   dashboards with an "as of" cutover date. This is a business decision, not an engineering one.
3. **Fix the two FKs first** (`territory_reps`, `crm_activities`) — repointing dashboards while territory and
   activity still reference `crm_people` leaves the model half-migrated.
4. Only then repoint the five services, one metric at a time, each with a before/after figure recorded.

## Blocked

Steps 2–3 need schema migrations, which are hard-blocked — see `DECISIONS-CRM.md#D-009`
(`drizzle-kit generate` requires an interactive TTY for its enum-conflict prompt).

## Not changed

No query was repointed. No figure was altered. No table was dropped. `SCH-002` remains open in `TASKS-CRM.md`
with this report as its prerequisite.
