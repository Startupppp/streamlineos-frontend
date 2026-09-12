# 18 — Data-subject export, and consent evidence

**Status:** done — the same enumeration, without the delete.
**Track:** E — compliance
**Blocked by:** 17

## Why

Export is the erasure enumeration without the delete. Building them as one
mechanism is what makes the export trustworthy — built separately, it quietly
goes incomplete.

The consent schema and module already exist. This wires them to the surfaces that
need them rather than building a second model.

## Acceptance criteria

- [ ] Export uses the **same enumeration and completeness guarantee** as erasure, with a different terminal action.
- [ ] The output is a portable, documented format.
- [ ] The existing consent model is wired to the surfaces that capture consent — no second model.
- [ ] Consent records show when it was captured, on what basis, and through which surface.
- [ ] **A withdrawal takes effect at the point of use**, not only in the record.

## Notes (2026-08-26)

Export is the erasure enumeration with a different terminal action, and a test
asserts both visit **exactly the same regions**. Built separately they drift, and
only one of them is ever exercised in anger.

The record is **not tenant-scoped and has no RLS policy**: a data subject may
exist in several organisations and has one right across all of them, so filing
under one tenant would make the others invisible to the person exercising it. It
sits outside the soft-delete default too — erasure is one of the enumerated
exceptions, and a soft-deleted erasure record would be a contradiction.

**Still open:** the portable output format, and wiring the existing consent model
to the capture surfaces. The completeness guarantee is what makes the export
trustworthy, and it is shared with erasure by construction.