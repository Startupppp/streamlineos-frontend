# Lane 3 blockers — freelancer chain (deal → quote → project → time → invoice → payment)

Date: 2026-09-23. Each item blocks a decision I refused to guess. Evidence is file:line.

---

## B1. An invoice has no direct link back to its deal

**Question.** Should `invoices` carry `deal_id`, or is `invoice → project → deal` the intended path?

**Why it blocks.** "Without re-keying" wants every hop to persist its provenance FK. Every other hop has one:
`quotes.deal_id`, `projects.deal_id`, `invoices.project_id`, `invoice_items.timesheet_entry_id`,
`payments.invoice_id`. An invoice generated from approved time has none pointing at a deal.

**Evidence.**
- `backend/src/db/schema/crm/invoicing.ts:24-69` — the `invoices` column list. No `deal_id`.
- `backend/src/db/schema/build/core.ts:44` — `projects.dealId`, so the 2-hop path exists.
- `backend/src/modules/quotes/**` — `quotes.convertedInvoiceId` is the only invoice↔deal seam today,
  and it only exists for invoices born from a quote.

**Options.**
1. Leave it. Reach the deal through `invoices.project_id → projects.deal_id`. Free, but null whenever the
   selected time spans two projects (the service deliberately leaves `projectId` unset then —
   `invoices-from-timesheets.service.ts`).
2. Add `invoices.deal_id` (nullable, indexed, composite FK on `org_id`). Needs a migration.

**Status.** Routed around with option 1. Option 2 is barred here: no non-production Postgres is reachable,
so BE-66 (prove by replay on an empty DB) cannot be satisfied and an unproven migration must not ship.

---

## B2. Which id space is `invoices.client_id`?

**Question.** When an invoice is generated from approved time, should the client be resolved automatically,
and from what?

**Why it blocks.** `invoices.client_id` is a bare `integer` with no foreign key. Two different id spaces
could plausibly fill it, and they are not interchangeable.

**Evidence.**
- `backend/src/db/schema/crm/invoicing.ts:27` — `clientId: integer("client_id")`, no `.references(...)`.
- `backend/src/db/schema/build/core.ts:38` — `projects.clientMembershipId` is an **organization membership** id.
- `backend/src/db/schema/crm/deals.ts:23` — `deals.clientId` is a **CRM client** id.
- `backend/src/modules/invoices/dto/invoice-response.schemas.ts:96-122` — the detail read joins a CRM client
  row, so the CRM space is what readers assume; nothing enforces it.

**Options.**
1. Leave `clientId` unset on a generated invoice; the user picks the client on the invoice. **(shipped)**
2. Resolve `project → deal → deals.client_id`. Correct only if `invoices.client_id` is the CRM space,
   and silently wrong if a project's client was set from the membership space.
3. Decide the space, then add the FK. Migration — barred, see B1.

---

## B3. `create-invoice-draft` strands entries at `INVOICE_DRAFTED` forever

**Question.** Should `POST /timesheets/billing/create-invoice-draft` be retired now that
`POST /invoices/from-timesheets` produces a real invoice?

**Why it blocks.** The draft route flips entries to `INVOICE_DRAFTED` and writes only a JSON snapshot into
`timesheet_exports`. No invoice row is ever created, and nothing moves an entry back. The billing queue
filters on `= 'UNINVOICED'`, so an abandoned draft removes those hours from the queue permanently.

**Evidence.**
- `backend/src/modules/timesheets/core/lib/billing-export.ts:206-287` — flips to `INVOICE_DRAFTED`,
  inserts into `timesheet_exports`, never into `invoices`.
- `backend/src/modules/timesheets/core/billing.service.ts:47` — `getUninvoiced` requires
  `invoicingStatus = 'UNINVOICED'`.
- `backend/src/modules/timesheets/core/timesheet-invoicing.service.ts` — the new read deliberately uses
  `!= 'INVOICED'` so stranded drafts are recoverable through the new route.

**Consequence of the split, unresolved.** The billing page's stat cards (`= UNINVOICED`) and the new wizard's
entry list (`!= INVOICED`) can now disagree by exactly the stranded-draft population.

**Options.**
1. Retire `create-invoice-draft` and its dialog; keep the new route as the only path.
2. Keep both and widen `getUninvoiced` to `!= 'INVOICED'` so the two reads agree.
3. Keep both as-is and document the divergence.

---

## B4. Voiding an invoice does not release the time it billed

**Question.** When an invoice generated from timesheets is voided, should its entries return to `UNINVOICED`?

**Why it blocks.** Today they do not, so voiding a mistaken invoice makes those hours permanently unbillable.
Fixing it is a behaviour decision (auto-revert on void vs. an explicit "release time" action), and it changes
what `INVOICED` means.

**Evidence.**
- `backend/src/modules/invoices/invoices-lifecycle.service.ts` — `voidInvoice` touches no timesheet row.
- `backend/src/modules/invoices/invoices-write.service.ts:212-221` — the void path, which only
  invalidates `invoices:list`.

**Options.**
1. On void, reset every `invoice_items.timesheet_entry_id` of that invoice to `UNINVOICED`, in the void
   transaction. Loses the record that the hours were once billed.
2. Add a separate `timesheets:billing:invoice`-gated release action.
3. Treat `INVOICED` as terminal and require a credit note instead.

---

## B5. Client financial visibility in the Client Portal

**Question.** For BLD-02B-A04, what does a portal client see of invoices and payments — nothing, invoice
status only, or full line items including the timesheet descriptions each line quotes?

**Why it blocks.** The generated invoice lines embed the timesheet entry's own `description`
(`invoices-from-timesheets.service.ts`, `lineFor`). If the portal renders line items, an internal work note
becomes client-visible. I will not guess a disclosure boundary.

**Evidence.**
- `backend/src/db/schema/timesheets/entries.ts:37` — `description` is free text written by the worker.
- `backend/src/modules/invoices/dto/invoice-response.schemas.ts:144-156` — the detail contract already
  exposes `lineItems[].description` and `lineItems[].timesheetEntryId`.

**Options.** (1) portal shows invoice number/status/total only; (2) plus line descriptions; (3) a separate
client-facing description field on the line, defaulting to the project name and date without the note.

---

## B6. Not decided, not attempted

- **Retention** of `timesheet_exports` snapshots once a real invoice exists.
- **Intake** — no decision on how a freelancer's client submits work requests.
- **Change Request cardinality** — one per project, one per deal, or many-to-many. Nothing in schema today.
