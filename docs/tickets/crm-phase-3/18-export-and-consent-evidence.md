# 18 — Data-subject export, and consent evidence

**Status:** not started
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
