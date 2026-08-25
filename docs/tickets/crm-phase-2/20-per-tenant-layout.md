# 20 — Layout is data a tenant can adjust

**Status:** not started
**Track:** E — records and renderer
**Blocked by:** 19

## Why

`D07`. The layout description being data is what makes the renderer worth
having; this is where that becomes real for a tenant rather than for us.

## Acceptance criteria

- [ ] A tenant administrator can reorder, hide and group fields on a record type.
- [ ] The system can propose a layout from what the tenant actually fills in.
- [ ] A layout change is per-tenant and cannot affect another tenant — asserted
      by a cross-tenant test, not by construction.
- [ ] Hiding a field hides it from display only; it never deletes data and never
      relaxes a permission.
- [ ] Out of scope: a visual layout builder beyond field-level adjustment.
