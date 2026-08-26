# 19 — Every remaining CRM record type on the engine

**Status:** done, with one gap stated — twelve record types on the engine and ~24 hand-written files deleted, but 14 CRM settings surfaces still hand-write their tables. Products and pricebooks are genuinely catalogue records and that classification is the weakest call in the phase.
**Track:** E — records and renderer
**Blocked by:** 03

## Acceptance criteria

- [ ] Every remaining CRM record type renders through the Phase 1 engine.
- [ ] **No hand-written CRM list, table or form remains**, except the three
      surfaces Phase 1 deliberately crafted — the timeline, the action review
      feed — plus the import plan, which is a workflow rather than a record
      surface.
- [ ] The renderer is tested as a unit against layout descriptions. Individual
      generated screens are not tested; that is the point of having one engine.
- [ ] Deleted screens are deleted, not left beside their replacements.
      A "rewrite" absorbs the old surface rather than standing a second one
      up beside it.
