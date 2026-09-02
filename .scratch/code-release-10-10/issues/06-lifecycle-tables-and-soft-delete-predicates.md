# 06 — Verify normalized lifecycle tables and the archived predicate on every active read

**What to build:** Lifecycle and relationship state is held in normalized tables rather than JSON arrays or polymorphic authority columns, and every active read filters deleted/archived rows. A read that forgets the predicate surfaces archived records as live data, which for organization hierarchy means an archived branch reappears in a parent selector.

**Blocked by:** 05.

**Status:** ready-for-agent

- [ ] Actionable JSON arrays and polymorphic authority relationships are normalized; EAV appears only behind the approved custom-field seam.
- [ ] Every active read carries its deleted/archived predicate, with partial indexes where the access pattern needs them.
- [ ] Organization hierarchy remains archive/restore with no hard-delete path; child-assignment selectors offer only active, non-deleted parents.
- [ ] Dependency conflicts on archive keep the dialog open, list every actionable dependency with counts, and confirm nothing changed.
- [ ] Focused behavior tests cover the archived-row-excluded case for each corrected read.
