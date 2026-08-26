# 19 — Every remaining CRM record type on the engine

**Status:** done — 39 registered descriptions, and measured on `main` with comments stripped: **0** hand-built CRM tables outside the import plan's two files, **1** raw `<table>` (the blueprint transition matrix), **0** hand-rolled forms. The 14 settings surfaces this ticket originally left behind are migrated.
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
- `visibleWhen` — a field that only applies while a sibling holds one of a small
  set of values. Several settings records are one shape with several arms (a
  validation rule's configuration depends on its type), and the alternative was
  rendering every arm at once, which is a worse form than the one it replaces.
  It is domain rather than presentation: a pattern is not *hidden* when the rule
  is numeric, it does not *apply* — so it is not validated, and a required field
  on another arm cannot block a submit it has nothing to do with, and it is not
  submitted, so the API is never sent a leftover. Equality against a small set
  and nothing more: an expression language would be a program in the
  description, and a description that can compute is no longer data a tenant can
  be shown.
- `createOnly` — the mirror of `editOnly`, for a field decided once and then
  fixed. Offering one on an edit form is a control whose value the API drops,
  which reads to the person using it as a change that did not save.
- A **singleton** description — no list columns at all — is valid. One record,
  reached from a settings page, never listed.
- `referenceToField` — the sibling carrying a *polymorphic* pointer's domain,
  the way `referenceLabel` carries its name. Two migrations hit this
  independently and both stopped rather than describe a lie.
- `withColumns` and `withFormFields` — a description narrowed for a
  related-records panel, and for a quick-action composer. Neither is a
  `LayoutAdjustment`: an adjustment is what a tenant wants everywhere, these are
  how one screen frames a record type it is embedding. Both are applied *after*
  the tenant's arrangement, so they can only narrow what the tenant already
  sees. Without them, every embedded panel and every "log a note against this
  lead" box forks the description, and the fork is where the two quietly stop
  agreeing about what a lead is.

One defect was found the same way and fixed rather than declared: the mobile
card rendered neither `leading` nor `actions`, so below the breakpoint a task
could not be ticked done and a row could not be opened — on the device where
principle 5 says those are most of the job. The card drops columns; it does not
drop capability.

Two gaps were found and **deliberately not** closed, because closing them would
have put behaviour into the description:

- **Drag-to-reorder** on assignment rules, where priority order *is* the record's
  meaning. Row reordering belongs to the one platform table, not to the layout
  vocabulary, and adding it for a single surface is a table change wearing a
  vocabulary change's clothes. That page stays hand-written.
- **Cross-field derivation** — a pipeline's key derived from its name as you
  type. A description that computes values is a program.

And one distinction was found and **deliberately not** collapsed: a signed number is not the
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

**`features/crm/settings/assignment-rule-sheet.tsx` and the assignment-rules
page.** The list is a drag-to-reorder priority list: first match wins, so the
order *is* the record's meaning, and the one platform table has no row
reordering. The form has five branches on `assignmentType`, a `useFieldArray`
conditions editor and weighted-member sliders. `visibleWhen` covers the
branching; the ordering is the blocker, and adding row-drag to the platform
table for one surface is a table change wearing a vocabulary change's clothes.

**`features/crm/settings/pipelines/create-pipeline-dialog.tsx` and
`stage-advanced-sheet.tsx`.** The dialog derives a pipeline's key from its name
as you type, and a description that computes values is a program. The sheet
edits one stage inside a pipeline's stage array — not a record with an endpoint
of its own.

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
