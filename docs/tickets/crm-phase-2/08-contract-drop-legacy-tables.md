# 08 — Contract: drop the legacy tables, and make regression impossible

**Status:** expand complete — every blocking `client_id` now carries a populated party beside it, kept in step by a trigger. Two of four readers cleared. **The contract (dropping `client_id`, then the tables) is the remaining ticket.**
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


---

## Re-measured 2026-08-26 (second pass)

The reader ratchet is down to **18, and 13 of those are the seam itself** —
`party-legacy-*.ts`, the divergence report and their specs, all of which are
deleted along with the tables. Five real readers remain:

| File | What it reads the legacy table for |
|---|---|
| `invoices/invoices.service.ts` | `client: { columns: { id: true, name: true } }` |
| `csat/csat.service.ts` | the same, twice |
| `inventory/sales-orders/so-core.service.ts` | the same |
| `support/core/support-tickets.service.ts` | the same, twice |
| `ai/core/crm-copilot.service.phase2.spec.ts` | a fixture |

**All four production readers are the identical line.** Each is a Drizzle
relational include pulling a client's `id` and `name` to put a label on a row —
none of them reads anything Party does not already hold. Each becomes a join
through `client_party_map` onto `business_parties`. That is worth stating
precisely, because "five readers left" sounds like five investigations and it is
one mechanical change repeated four times.

### Why that still does not finish the ticket

Clearing those readers does not let the tables be dropped. **The four modules
holding them are also the modules holding the foreign keys** —
`invoices.client_id`, `csat_surveys.client_id`, `inv_sales_orders.client_id`,
`support_tickets.client_id` — and a foreign key is what a `DROP TABLE` actually
refuses. `legacy-identity-drop-cost.mjs` still reports **65 foreign keys from 31
tables outside the seam**, unchanged.

So the remaining work is not the readers. It is turning every `client_id` in six
modules into a `party_id`, which is an expand–contract per table across
accounting, inventory, support, build and timesheets.

### Why it was not started here

Those are precisely the modules being rewritten by another workstream right now.
An expand–contract on `invoices` while `invoices` is being rebuilt is two
rewrites of one table in parallel, which is the situation that produces a merge
nobody can review. The mirror costs nothing while it stands, and a wrong drop is
not recoverable by a revert.

**What would unblock it:** those modules migrating their own `client_id` columns
as part of their rewrite, at which point the drop is one migration rather than a
programme. Re-run the script rather than trusting this paragraph — the number
moves.
## Re-count (2026-08-26)

Re-ran the ratchet rather than trusting the earlier number. It passes, and the
register still holds **26** readers: 13 under `party/` — the seam itself, which
is deleted along with the tables — and 13 under `finance/` (11) and
`accounting/` (2). Unchanged since the last count, so the accounting rewrite
that owns those 13 has not landed yet and this ticket is still one migration
behind it. Nothing regressed either: the ratchet fails on a *new* reader as well
as a departed one, so the count moving in neither direction is the honest state.

Checked the other thing that could make the `DROP` unsafe: `src/scripts/purge-user.mjs`
enumerates foreign keys from `pg_constraint` at runtime rather than naming
tables, so removing `leads`, `clients`, `contacts` and `crm_organizations` does
not strand it. That is one fewer reason to hesitate when the finance half is
ready; it is not permission to drop them now.


---

## The migration, done (2026-08-26)

Asked for directly, after the concern about colliding with the in-flight
accounting and inventory rewrites was raised and overruled. Recorded so the
sequencing is visible later.

### Expand

**Thirteen tables** gained a party column beside their legacy id —
`invoices`, `purchase_bills`, `csat_surveys`, `support_tickets`,
`support_vip_clients`, `inv_sales_orders`, `inv_vendors`,
`inv_customer_returns`, `client_opportunities`, `client_onboarding_items`,
`timesheet_rates` and `build.tickets`. Each carries a **composite** foreign key
on `(org_id, party_id)`: a bare `REFERENCES business_parties(party_id)` would
permit exactly the cross-tenant reference the identity model exists to prevent,
and the database is the only place that can refuse it unconditionally.

Named for the role rather than all being `party_id` —
`purchase_bills.vendor_id` and `build.tickets.customer_id` point at the same
table for different reasons, and one name would lose the only thing that says
which.

`node --env-file=.env src/scripts/legacy-identity-drop-cost.mjs` now reports
**13 of 14 blocking columns carry a party**; the fourteenth is
`client_party_map.client_id`, which is the seam and goes with the tables.

### The dual write is a trigger

Twelve insert sites in six modules, and they are not the only writers — the
importer, background jobs and raw SQL reach these tables too. Dual-writing in
application code covers the paths somebody remembered; **the thirteenth writer
is the one that breaks it**, and the symptom is a row that silently keeps no
party, invisible until the contract migration tries to make the column NOT NULL
and finds years of holes.

`set_org_id_from_parent` already establishes the pattern here. `0273` adds one
generic function attached to each table, rather than eleven near-identical ones
for one of them to differ subtly. Verified against the live database: an insert
with a client fills the party, an insert without one leaves it null, an update
that sets the client fills it, and a second table behaves identically. The
cross-tenant case is refused one layer earlier by an existing composite key,
which is a better place for it than a trigger.

It is expand-phase scaffolding and the contract migration drops it.

### What the invariant found that the catalogue could not

`inv_customer_returns.client_id` declares `.references(() => clients.id)` in
Drizzle and **the database has no such foreign key** — no migration ever created
it. So the "sixty-five foreign keys" figure *understated* the problem: a column
that points at `clients` in the application's mind but not the database's blocks
the drop just as firmly while being invisible to the query that counts blockers.

`party-column-invariant.spec.ts` is **table-scoped, not file-scoped**, and that
distinction is not pedantic: the first version passed while two of the three
tables in `crm/contacts.ts` were missing their column, because one
`clientPartyId` anywhere in the file satisfied all three. An invariant that a
neighbour can satisfy is not an invariant. Verified to fail by removing a column
and watching it name the exact table.

### Readers

Four services read `clients` for one thing — a label. `partyNamesFor` gives them
the name from Party, `client_id` is untouched and still returned as `client.id`,
and **no response changed shape**.

`csat` and `support_tickets` are off the register. `invoices` and
`inv_sales_orders` keep one detail path each asking for `client: true` — the
whole row — and that is where a mechanical migration stops: `gstin` maps to
`tax_number`, `designation` to `job_title`, `account_manager_id` to
`owner_user_id`, and `is_vendor` to nothing obvious. Each is a per-field
decision about what a caller is entitled to see, so they stay listed rather than
being guessed at.

### What is left

1. The two `client: true` detail paths, per field.
2. The remaining `leads`, `contacts` and `crm_organizations` foreign keys — this
   pass covered `clients`, which was the largest of the four.
3. **The contract**: drop `client_id`, drop the triggers, drop the tables. That
   is the destructive half and it should be its own ticket with its own review.
