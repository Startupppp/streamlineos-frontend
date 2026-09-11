# 20 — Layout is data a tenant can adjust

**Status:** done — the four `/renderer/layouts/*` routes, `record_layout_adjustments` with RLS, `settings:record-layouts:manage` in both catalogues with a backfill, and a cross-tenant test putting two orgs through one QueryClient.
exist. Everything below is built, wired and tested against the contract, and
none of it does anything for a tenant until the server answers.
**Track:** E — records and renderer
**Blocked by:** 19

## Why

`D07`. The layout description being data is what makes the renderer worth
having; this is where that becomes real for a tenant rather than for us.

## Acceptance criteria

- [x] A tenant administrator can reorder, hide and group fields on a record type.
      `/crm/settings/layouts` — `features/renderer/layout-settings/`. The picker
      offers only record types the account may read, from `LAYOUT_REGISTRY`.
- [x] The system can propose a layout from what the tenant actually fills in.
      `proposeFromFill` reads server-counted fill rates and proposes hiding any
      field **no record has ever carried a value for** — never a threshold, and
      never applied without an administrator saying yes.
- [x] A layout change is per-tenant and cannot affect another tenant — asserted
      by a cross-tenant test, not by construction.
      `hooks/api/renderer/layouts.test.tsx`, "two tenants sharing one browser".
- [x] Hiding a field hides it from display only; it never deletes data and never
      relaxes a permission. `applyAdjustment` never touches `layout.fields`;
      `lib/renderer/layout-adjustment.test.ts` and
      `features/renderer/layout-settings/arrangement-draft.test.ts` assert it.
- [x] Out of scope: a visual layout builder beyond field-level adjustment.

## What is stored, and where

An **overlay**, not a layout. `LayoutAdjustment` names an order, a hidden set and
a set of groups — never a field the description does not declare. A tenant who
hid one column in 2026 still receives the field we add in 2027, which a forked
copy of the description could not do.

Addressed by `(orgId, layoutKey)` and never by `layoutKey` alone. That is the
whole isolation story, and it is why the cross-tenant test drives one browser
with two organisations: a user who belongs to both signs into both with the same
profile, and a store keyed on the record type would show them the other tenant's
arrangement quietly, because a rearranged screen looks like a working screen.

**It is stored on the server and only there.** An arrangement made by an
administrator has to reach every colleague on every device; a layout kept in
`localStorage` is not per tenant at all, it is per browser. That was the first
implementation and it was replaced rather than kept beside — it would also have
passed the isolation test for the wrong reason, since two tenants never collide
if nothing is ever shared.

## The blocking dependency

`hooks/api/renderer/layouts.ts` is written against four routes that **do not
exist yet**. They are written out rather than substituted for, because the
substitute is what would ship.

    GET    /renderer/layouts/:layoutKey        -> LayoutAdjustment | null
    PUT    /renderer/layouts/:layoutKey        <- { order?, hidden?, groups? }
    DELETE /renderer/layouts/:layoutKey
    GET    /renderer/layouts/:layoutKey/usage  -> { sample, filled }

All four scope to the caller's organisation with the same tenant guard every
other CRM route uses; `layoutKey` is never a global address. The server owns
`updatedAt` and the fill counting — a proposal computed from the page of rows a
list happens to have loaded is a proposal about page one.

Until they land: every read fails once, does not retry, and every surface renders
the description as declared. Nothing is broken; nothing is adjustable.

## Notes

- Two fields are withheld from hiding, and neither is a policy choice: the title
  field, because hiding it produces an untitled record, and any required field,
  because hiding it produces a create form that cannot succeed. The tenant would
  not have removed a column, they would have removed the ability to add a record.
- Grouping is only stored when the tenant has actually regrouped something, so a
  tenant who merely reordered columns is not silently holding a frozen copy of
  today's sections.
- `withColumns` is deliberately *not* a `LayoutAdjustment`. An adjustment is what
  a tenant wants; `withColumns` is how one screen frames a related-records panel,
  and it is applied after the tenant's arrangement so it can only narrow what
  they already see.

## Notes (2026-08-26)

The blocking dependency is cleared. All four routes are built, and the client
needed no change beyond swapping the placeholder gate for the real key.

**The read is ungated.** An arrangement carries no record data — only field names
the layout description already publishes — and every list, detail view and form
reads it to render at all. Gating it would mean a member without an
administration permission renders the declared layout while their colleague
renders the tenant's, which is a worse failure than the one the gate prevents.
`PermissionGuard` is not global, so it sits on the three writing handlers rather
than the class; on the class it would deny the read, which carries no key.

**`settings:record-layouts:manage` is the write gate**, in both catalogues, with
`0266` backfilling it onto whoever already holds `settings:custom-fields:manage`.
The hook had been using `settings:manage` with a note that a dedicated key was
right and had to exist on the backend first; it now does, and it is deliberately
narrower.

**Reverting deletes the row.** Storing `{order: [], hidden: []}` would mean
"arranged to have nothing arranged", which reads identically to the default and
then needs special-casing at every render.

### Usage is partial, and says so

Thirty-nine layouts are registered; the usage endpoint knows two — `party`, over
the nullable columns a tenant may or may not populate, and `subject:<key>`, over
the fields a tenant declared itself. A backend map of all thirty-nine would be a
second copy of the frontend registry drifting from it silently, and **a wrong
proposal is worse than none**: it tells an administrator to hide a field their
team uses. An unknown key returns an empty proposal *without querying*, which the
client already renders as "no suggestion".

Widening it is cheap when a layout earns it. It is not cheap to un-mislead an
administrator who hid a field on bad advice.

### Verification

Backend `tsc` 0, `madge --circular` 0, 15 new tests over the service and the
usage mapper. Frontend `tsc` clean on every file this touched, 24 tests across
`lib/rbac` and `hooks/api/renderer`, catalogue-sync green in both directions.

**Not run against a real database.** The table, its RLS policy and the backfill
are unexercised until `0265`/`0266` are applied.

One thing left for whoever commits `migrations/meta/_journal.json`: it carries
this branch's other workstreams' entries alongside these two, and six of the
`.sql` files it references are still untracked in their sessions, so committing
it here would have referenced files that do not exist in the commit. The entries
for `0265` and `0266` are in the working tree and land with it.
