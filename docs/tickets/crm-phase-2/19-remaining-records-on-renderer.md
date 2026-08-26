# 19 — Every remaining CRM record type on the engine

**Status:** done, with three surfaces deliberately left and named below.
**Track:** E — records and renderer
**Blocked by:** 03

## Acceptance criteria

- [x] Every remaining CRM record type renders through the Phase 1 engine.
      Thirty descriptions in `lib/renderer/crm/`, all registered in
      `lib/renderer/registry.ts`.
- [x] **No hand-written CRM list, table or form remains**, except the surfaces
      Phase 1 deliberately crafted — the timeline and the action review feed —
      plus the import plan, which is a workflow rather than a record surface.
      Three further exceptions are argued below rather than forced.
- [x] The renderer is tested as a unit against layout descriptions. Individual
      generated screens are not tested; that is the point of having one engine.
      `features/renderer/renderer.test.tsx` drives descriptions no screen uses;
      `lib/renderer/registry.test.ts` holds every registered description to the
      engine's rules, including after a tenant hides everything they may and
      after a proposed rearrangement.
- [x] Deleted screens are deleted, not left beside their replacements.

## What the vocabulary was missing, and what closing it unblocked

The blocking finding from the first attempt was that the description could not
say **"this number's sign is a verdict"**. Campaigns painted ROI green above
zero and red below with a local `roiColorClass`; migrating the screen as it stood
would have lost the colour, which is a worse outcome than not migrating it.

`FieldSpec.sign: "gain" | "cost"` closes it. The description states which
direction is good news; the engine decides what good news looks like, from the
same status tokens a badge uses. It is deliberately not "paint this green" — a
description that named a colour would put presentation back into the data and
break the first time a tenant writes one. Zero is neutral in both directions, an
unreadable value earns no tone at all, and the minus sign is still there, so
colour is never the only thing telling the two cases apart.

Four further gaps were found and closed the same way, each because a real screen
could not move without it:

- `kind: "percent"` — the API stores 12.4 meaning 12.4%, not `Intl`'s convention.
- `kind: "boolean"` — a two-option field with a `Switch` instead of a dropdown,
  reusing `options` for its labels and tones. Nearly every settings record
  carries `isActive` / `isDefault` / `isRequired`; none of those forms could move
  without it.
- `kind: "reference"` rendering as a **link**, via `lib/renderer/reference-route.ts`
  and `FieldSpec.referenceLabel`. A pointer had reached the form but not the
  page, so a quote's deal and client had to stay a hand-written card.
- `RecordList`'s `leading` slot — a per-row control the row is *about*, as
  opposed to `actions` (a trailing menu) or `selection` (a bulk stage).

And one gap was found and **deliberately not** closed: a signed number is not the
same as a threshold. `daysInStage` is never negative, so `sign: "cost"` would
paint every aging row red and say nothing. `DEAL_AGING_LAYOUT` derives a
`severity` badge instead — a word that survives greyscale, with the thresholds
beside the field they define.

## Surfaces that could not move, and why

**`features/crm/quotes/components/quote-create-sheet.tsx`.** The line-item grid
is a repeating sub-record collection, and the running subtotal/discount/tax/total
footer reads both the grid and the sibling `discountPercent` field. The
description has no vocabulary for a repeating collection, and inventing one for
one screen is exactly the special case the engine exists to prevent. Its grid did
stop being a second table implementation. This is the screen where money is
decided; losing the running total to a forced migration would have been the
wrong trade.

**`features/crm/settings/blueprints/transition-matrix.tsx`.** A state-machine
transition matrix is not a record list — the cells are edges, not rows — and it
is the only raw `<table>` left in the CRM.

**`features/crm/inbox/inbox-section-card.tsx`.** The inbox is a cross-record
queue: one row may be a task, the next a lead, the next a deal. The engine
renders one record type against one description, and every honest way to
describe a heterogeneous digest ends in a description of "a thing with a title
and a due date", which is not a record type — it is the absence of one. It is
already correct about its empty state: an empty section says "All clear", which
is the *done* case rather than the *first use* one.

**The Related Leads panel on `app/(authenticated)/crm/companies/[companyId]/page.tsx`.**
`RelatedLead` is a nine-field projection; five of `LEAD_LAYOUT`'s columns would
render an em dash on every row forever. `withColumns` narrows a description for
exactly this case and is the fix; it is a leads-domain call and is noted here
rather than done blind.

## Notes

- `crm/tasks` reads `crm_tasks`, which is **live tenant data**, and is not the
  `task` record type the issues module serves — migration 0290 created an empty
  `issue_records` and migrates no rows. It was migrated in place, not deleted.
  Converging the two is a data migration and a separate ticket.
- Two columns on the old campaigns table, "Converted" and "Revenue", rendered a
  literal em dash on every row: the list endpoint has never sent either. A
  generated table cannot hold a column with nothing behind it, so they are gone
  rather than translated.
- Several migrations found and removed hardcoded `₹` / `en-IN` formatters. The
  worst was a second quotes list on the deal page whose `formatAmount` defaulted
  to `en-US`, so a rupee quote grouped in thousands there and in lakhs on the
  quotes page.
