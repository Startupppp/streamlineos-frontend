# 34 — Move the bug-column disposition record out of the production module

**What to build:** A 26-entry mapping that documents where each column of a dropped table went now lives with the spec that verifies it, rather than being exported from a production module with zero production callers. It sits today beside genuinely live mapping functions, so the file reads as a mixture of active adapter code and a design record, and the export invites a future caller who will find the data stale as the schema moves on.

Keep the record — it has documentary value. Move it so the module's surface reflects only what runs.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] The disposition record is no longer exported from a production module
- [ ] The spec that asserts against it still does so, unchanged in coverage
- [ ] The live mapping functions in that file are untouched
- [ ] The design record is not lost
