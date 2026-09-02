# 02 — Current-head clean-bootstrap parity at the full journal

**What to build:** The retained bootstrap evidence proves a 634-entry journal. The chain has moved past it, so that evidence covers a former head and does not close the gate. Reproduce it at one release commit: two independent clean bootstraps from zero plus one interrupted-then-resumed bootstrap, all reaching the same entry count with zero failures and byte-identical catalogs.

**Blocked by:** 01 — the applied set must be final before parity means anything.

**Status:** ready-for-agent

- [ ] Two independent clean bootstraps from an empty database reach the full journal count with zero failures.
- [ ] One bootstrap is interrupted mid-chain and resumed, reaching the same terminal state — this is the path that previously exposed a migration ordering defect, so it is not optional.
- [ ] Catalogs match exactly across tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state.
- [ ] Every target used is a scratch database. The harness must refuse a database whose name lacks `scratch`; confirm that refusal still fires.
- [ ] Record the release SHA, each command, database identity and journal hash/count.
- [ ] Run `VACUUM ANALYZE` after the rewrite before any count or plan is trusted.
