# CRM Phase 2 — pending work

Source: [`docs/specs/2026-08-24-crm-phase-2-widening-prd.md`](../../specs/2026-08-24-crm-phase-2-widening-prd.md)

This is the single working list for the remaining CRM Phase 2 work, and the only
active CRM Phase 2 task file. Every former ticket file has been merged here and
deleted; the renderer and per-tenant-layout decisions from tickets 19 and 20 went
to the PRD's *Rendering* section instead. Recover any of them with
`git show HEAD:docs/tickets/crm-phase-2/<name>.md`.

## Current status

- Identity convergence is complete on the CRM side. The ratchet
  `src/modules/party/legacy-reader-ratchet.spec.ts` enumerates every file
  importing `leads`, `clients`, `contacts` or `crm_organizations` from the
  schema and fails both on a file that joins the list and on one that leaves it,
  so a passing run is a live count rather than a stale allowlist. It fell from
  **71 readers to 26**: party 13 (the seam itself, deleted with the tables),
  finance 11, accounting 2 — and **0** in crm, leads, ai, email, contacts,
  clients, ingress, deals, search and dashboard.
- **The contract drop is blocked on an unwritten decision, not on effort** — see
  track B. Expand is complete and every production reader is migrated.
- Ticket 25 is partially complete: backend organization-to-Party convergence
  exists, but the Companies, Clients and Parties frontend route trees are still
  separate.
- Tickets 09–11 have tested normalizers/services, but no production transport
  consumer or controller reaches the ingress seam.
- **Permission denial is done for CRM** and open everywhere else — see track D.
- `src/modules/crm-import/` still needs to move under `src/modules/crm/` with
  all imports updated.
- **Per-tenant layout was never run against a real database.** The
  `record_layout_adjustments` table, its RLS policy and the backfill are
  unexercised until migrations `0265` and `0266` are applied and verified.

## Consolidated pending tasks

### A. Finish the long-tail identity migration (former 03–07)

Batches 03–06 and the long tail (07) each landed criterion 1 only — the ratchet
count above. **Criteria 2 onward were never evidenced on any batch**, and they
need what a ratchet cannot answer: a display-regression check and a per-query
tenant-scoping review. The long tail covered `surveys`, `rbac`, `dashboard`,
`billing`, `timesheets`, `support`, `settings` and `search` — roughly 14 module
files — and walked into six live defects on the way.

- [ ] Route every remaining legacy-table read in the long-tail modules through
  the Party resolver; remove compatibility mirrors after the migration.
- [ ] Make every long-tail write Party-only, preserving existing behavior and
  e2e coverage.
- [ ] Preserve display behavior, tenant scoping, Party search indexing and
  dashboard counts; stale legacy indexes must not serve results.
- [ ] Move `src/modules/crm-import/` under `src/modules/crm/` and update its
  import paths.
- [ ] Deals, quotes and pipelines anchor to Party, not to a legacy id.
- [ ] Lead conversion produces one Party that was already the lead, never a
  second row.
- [ ] Extraction and party resolution in the ingress path read Party directly,
  removing the legacy hop Phase 1 left in place.
- [ ] No prompt or eval fixture still names a legacy table — the ratchet reads
  schema imports and cannot see a fixture.
- [ ] The contact/client distinction survives as a Party role, not as a table.

### B. Converge organizations and remove legacy contracts (former 25 + 08)

**Expand is complete: 31 of 31 blocking columns have a party column beside them,
31 dual-write triggers are live and verified, and there are 0 production readers
of the legacy tables.** Still on the register: the seam's own 14 files and one
spec fixture.

**What blocks the contract, and it is not a migration.** `leads.id`, `clients.id`
and `contacts.id` are serial integers and they are the CRM's *public*
identifiers — `ParseIntPipe` parses them in 4 leads routes, 5 contacts, 11
clients; the frontend routes on them (`/crm/leads/[leadId]`, every hook typed
`leadId: number`); the 31 expanded columns still hold them. Party's identifier is
a UUID, so dropping these tables changes **what a lead is called**, in every API
path, every stored link, every customer bookmark and every frontend route param.

Closing it takes three steps, and only the first is missing:

1. **A decision on identity.** Either the CRM's public ids become party UUIDs
   with redirects from every integer URL, or the integers are preserved
   independently of the legacy tables — e.g. a `party_legacy_id` that survives
   them. The second keeps every existing link working and is almost certainly
   right, but it is a decision, not an implementation detail. **This is the
   ticket that was never written.**
2. The type seam, once (1) is settled.
3. The destructive migration: drop 31 columns, 31 triggers, 4 tables.

Steps 2 and 3 are a day's work once step 1 exists.

Blast radius, measured — **65 foreign keys, 31 tables outside the seam, six
modules**. Re-measure rather than trusting this table:
`node --env-file=.env src/scripts/legacy-identity-drop-cost.mjs`.

| Legacy table | Tables outside the seam still pointing at it |
|---|---|
| `clients` | **12** — `invoices`, `purchase_bills`, `inv_sales_orders`, `inv_vendors`, `support_tickets`, `support_vip_clients`, `csat_surveys`, `timesheet_rates`, `build.tickets`, `deals`, `client_onboarding_items`, `client_opportunities` |
| `leads` | **9** — `deals`, `lead_activities`, `lead_emails`, `lead_notes`, `lead_tasks`, `calendar_events`, `client_accounts`, `crm_lead_touchpoints`, `survey_participants` |
| `contacts` | **7** — `crm_contact_roles`, `crm_contact_channel_consent`, `crm_contact_consent_events`, `crm_deal_stakeholders`, `survey_participants`, `build.feedback_posts`, `build.feedbucket_submissions` |
| `crm_organizations` | **3** — `build.tickets`, `build.feedback_posts`, `build.feedbucket_submissions` |

Three things the expand pass settled, each of which would otherwise be redone:

- **Every party column carries a composite foreign key on `(org_id, party_id)`.**
  A bare `REFERENCES business_parties(party_id)` would permit exactly the
  cross-tenant reference the identity model exists to prevent, and the database
  is the only place that can refuse it unconditionally. Columns are named for the
  role, not all `party_id` — `purchase_bills.vendor_id` and
  `build.tickets.customer_id` point at the same table for different reasons.
  Migration `0273` attaches **one generic trigger function** to each table rather
  than eleven near-identical ones for one to drift.
- **`inv_customer_returns.client_id` declares `.references(() => clients.id)` in
  Drizzle and the database has no such foreign key** — no migration ever created
  it. The "65 foreign keys" figure therefore *understates* the problem: a column
  that points at `clients` in the application's mind but not the database's
  blocks the drop just as firmly while being invisible to the query that counts
  blockers.
- **`party-column-invariant.spec.ts` is table-scoped, not file-scoped.** The
  first version passed while two of the three tables in `crm/contacts.ts` were
  missing their column, because one `clientPartyId` anywhere in the file
  satisfied all three. An invariant a neighbour can satisfy is not an invariant.

- [ ] Complete the company-shaped Party model, including
  `employer_party_id`, tenant-composite FKs, organization-to-Party resolution,
  backfill and merge convergence.
- [ ] Route every `crm_organizations` write through the Party mirror and
  converge Companies, Business Parties and organization surfaces.
- [ ] Replace the three frontend route trees (`/crm/companies`, `/crm/clients`
  and `/parties`) with one canonical Party-backed surface.
- [ ] Migrate the 16 Finance/Accounting readers and the Calendar reader at
  `backend/src/modules/calendar/calendar-linked-crm.ts`; register the reader
  with the ratchet while it remains.
- [ ] Map the last two whole-row readers. `invoices` and `inv_sales_orders` each
  keep one detail path asking for `client: true`, and that is where a mechanical
  migration stops: `gstin` → `tax_number`, `designation` → `job_title`,
  `account_manager_id` → `owner_user_id`, and `is_vendor` → nothing obvious.
- [ ] Decide identity (step 1 above), then the type seam, then the drop: remove
  compatibility writers, drop `contacts`, `clients`, `leads` and
  `business_parties`, and retain a reversible snapshot.
- [ ] Keep the resolver working after the drop and retain a lint/test guard
  that rejects new legacy-table readers.

`src/scripts/purge-user.mjs` needs no change: it enumerates foreign keys from
`pg_constraint` at runtime rather than naming tables, so removing the four tables
does not strand it.

### C. Wire the inbound communication adapters (former 09–11)

- [ ] Wire telephony, WhatsApp and web-form transports to the ingress seam so
  each produces an `InboundCommunicationEvent` with correct participants,
  threading and metadata.
- [ ] Preserve no-transcript semantics for calls and capture WhatsApp media
  through the existing attachment path.
- [ ] Validate web-form content at the boundary and resolve email/phone fields
  through Party without trusting submitted identity.
- [ ] Use Composio/server-side integration paths with no provider-token
  persistence; drive acceptance from fixtures without provider SDK mocks.
- [ ] Keep all downstream workflow/timeline behavior behind the ingress seam
  unchanged and prove each adapter with end-to-end tests.

### D. Make permission denial visible (former 26) — CRM done, 327 surfaces left

**CRM is complete**: 34 pages, 89 hooks across 22 files, and the ratchet holds
zero CRM entries. Two mechanisms landed and both survive — `useCanState` /
`resolveGate` (`lib/rbac/gate.ts`) short-circuits the render on a denied read,
and `usePermissionGate` carries the verdict with the read itself via
`useGatedQuery` so `EmptyState` can render the refusal. Canaried: disabling the
short-circuit fails 2 of the 8 tests, both on the denial claims.

Four things a future engineer needs before touching this:

- **The root cause is a TanStack Query v5 definition.** In 5.90.12 a *disabled*
  query is `isPending: true, isFetching: false`, and `isLoading` is
  `isPending && isFetching` — so `isLoading` is **false**, and a gated-off query
  looks like a finished empty one.
- **`useCan` answers `false` while the access response is in flight**, so
  "denied" and "not known yet" were the same value. A screen that simply branched
  on the boolean showed *every* user, including a permitted one, a flash of
  "Access Restricted". That is why the fix is `resolveGate`, a function with
  three inputs, and why the ordering is its whole content: not-yet-known outranks
  denied, denied outranks a query that never ran, and emptiness is only emptiness
  once something has looked.
- **Placement is the subtlety: after the last hook, before the first branch that
  can return.** Earlier attempts put the guard before the first `return` a regex
  could see, which in several files sat after an `if (isLoading)` block — hooks
  would then run in a different order on different renders.
  `react-hooks/rules-of-hooks` caught every instance, which is the argument for
  keeping that rule on.
- **The granted path is covered by tests, not by a screenshot.** Swapping to an
  owner session mid-run proved impossible — NextAuth's cookie is `httpOnly` and
  cannot be replaced from the page, and the alternate origin hung on the
  organisation-sync bootstrap. Nobody has watched a permitted user load one of
  the 34 pages since the change.

`lib/rbac/denial-is-not-emptiness.test.ts` collects gated read hooks from source
rather than listing them, finds every component that asserts emptiness without
handling denial, and compares against a frozen list. **The list may only shrink.**

- [ ] Convert the 327 non-CRM surfaces — HR 74, build 68, inventory 54,
  payroll 47 — using `resolveGate` and `useGatedQuery` as above.
- [ ] Preserve the distinction between loading, error, empty, populated and
  denied states; denial is its own fifth state.
- [ ] Watch a permitted user load a converted page, to close the granted-path
  gap above.

## Dependencies and release notes

Tracks C and D can proceed independently once the Party seam is available. The
legacy contract drop in B remains blocked by the identity decision, the
Finance/Accounting rewrite and the Calendar reader. The repository baseline
currently has unrelated failures in `common/http`, `billing`, `kb`, `storage`,
`chat`, `build` and one CRM automation-studio suite; CRM work must not claim
those failures as fixed.

A caution recorded from the ticket-26 verification session: the dev server
already running on :1000 was **not building from that working tree** — a probe
string added to a page never appeared in it. Anything checked against a dev
server somebody else started is unverified until a probe proves it is serving
your code.

The 79 deliberate CRM visual-token exceptions remain separate follow-up work.
