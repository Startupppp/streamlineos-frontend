# 08 — Contract: drop the legacy tables, and make regression impossible

**Status:** in progress, and re-scoped — the finance/accounting blocker cleared today (23 readers, 12 of them the seam), but the readers were never the gate. **31 tables outside the seam still hold foreign keys to these four**, across accounting, inventory, support, build and timesheets. Measured, not estimated: `src/scripts/legacy-identity-drop-cost.mjs`.
**Track:** A — identity convergence
**Blocked by:** 03, 04, 05, 06, 07

## Why

The tables come out only when no reader remains. Until then they are load-bearing
for whichever batch has not landed.

The second half matters more than the drop. A migration like this regresses by
accretion — someone adds a call site to a table that still exists, months after
everyone stopped thinking about it. A convention does not stop that; a failing
build does.

## Acceptance criteria

- [ ] Every migrate batch is done and its module's e2e suite passes unchanged.
- [ ] The compatibility mirror writes from ticket 02 are removed.
- [ ] `contacts`, `clients`, `leads` and `business_parties` are dropped, with
      their indexes, constraints and any FK pointing at them.
- [ ] The resolver from ticket 01 survives the drop — external systems and old
      URLs still carry legacy ids, and they must still resolve.
- [ ] **A lint rule and a test fail the build** if a new call site reads a legacy
      identity table or its Drizzle symbol. Both, not either: the rule catches it
      at authoring time, the test catches it when the rule is disabled or the
      file is excluded.
- [ ] The drop is reversible in the sense that matters — a snapshot is taken and
      its restore path is exercised once, in a test, rather than assumed.

## Notes

Check `scripts/purge-user.mjs` before dropping: it enumerates FKs to `users`, so
removing tables changes what it reaches. Phase 1 learned twice that an FK to
`users` is how an audit record gets destroyed by an unrelated offboarding.


---

## Notes (2026-08-26)

### The blocker this ticket was waiting on is gone

The reader ratchet went **36 → 23**, and all **13 `finance/` + `accounting/`
readers are cleared** — that rewrite landed. Twelve of the remaining 23 are the
seam itself (`party-legacy-*.ts` and the divergence report), which is deleted
with the tables. So eleven CRM-owned readers remain.

### And it turns out the readers were never what gated the drop

Counting readers counts *files to edit*. What actually prevents a `DROP TABLE`
is a **foreign key**: a column in somebody else's table that must be migrated,
backfilled and re-pointed first. Measured against the live database:

| Legacy table | Tables outside the seam still pointing at it |
|---|---|
| `clients` | **12** — `invoices`, `purchase_bills`, `inv_sales_orders`, `inv_vendors`, `support_tickets`, `support_vip_clients`, `csat_surveys`, `timesheet_rates`, `build.tickets`, `deals`, `client_onboarding_items`, `client_opportunities` |
| `leads` | **9** — `deals`, `lead_activities`, `lead_emails`, `lead_notes`, `lead_tasks`, `calendar_events`, `client_accounts`, `crm_lead_touchpoints`, `survey_participants` |
| `contacts` | **7** — `crm_contact_roles`, `crm_contact_channel_consent`, `crm_contact_consent_events`, `crm_deal_stakeholders`, `survey_participants`, `build.feedback_posts`, `build.feedbucket_submissions` |
| `crm_organizations` | **3** — `build.tickets`, `build.feedback_posts`, `build.feedbucket_submissions` |

**65 foreign keys, 31 tables outside the seam, six modules.** Accounting,
inventory, support, build and timesheets each hold a `client_id` that has to
become a `party_id` before `clients` can be dropped. None of those modules has
heard of this phase.

That is the honest scope, and it is a programme rather than a migration. The
number moves as other workstreams migrate their own tables, so it is measured by
a script rather than written down: `node --env-file=.env
src/scripts/legacy-identity-drop-cost.mjs`. A count taken in July is not
evidence in September.

### Why this is not being forced

Dropping four tables that 31 others depend on, on a live database, would break
accounting and inventory — two modules being actively rewritten by other
workstreams right now. The mirror costs nothing while it stands. Being wrong
about this is not recoverable by a revert.

### What the eleven remaining readers actually need

They are not lazily unmigrated. Each reads a column Party does not carry, and
three of them say so in their own comments:

- **`clients.lead_id`** — `clients.service.ts` calls it "a legacy-to-legacy
  pointer with no Party equivalent until `leads` is dropped." It does not need
  migrating; it needs deleting with the table, which changes an API response
  shape and therefore needs the frontend.
- **`crm_organizations.parent_id`** — the account hierarchy. A company-to-company
  link Party deliberately did not absorb into `employer_party_id`, because a
  subsidiary's parent is not its employer. **This is the one genuine schema gap**
  and the only new column the expand needs.
- **`lead_activities.lead_id`** and its siblings — the recap cron joins them.
  They are on the FK list above; the reader follows the table.

Most of the rest are already absorbed and were mis-scoped as gaps: conversion
**collapses a lead and a client onto one party** (`lead-conversion.service.ts`),
so `clients.lead_id` is identity; `deals.party_id` exists, so `contacts.deal_id`
is derivable; `business_parties` already carries `status`, `owner_user_id`,
`created_at`, `updated_at` and `employer_party_id`.

### Before any drop

`scripts/purge-user.mjs` enumerates foreign keys to `users` to offboard someone.
Removing tables changes what it reaches, and Phase 1 learned twice that an FK to
`users` is how an audit record gets destroyed by an unrelated offboarding. Re-run
it against the new FK graph before and after.
