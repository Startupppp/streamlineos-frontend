# 03 — Name the migration guards for what they protect

**What to build:** Two directories are named after a delivery phase rather than a concept, so a reader cannot tell from the tree whether their contents are runtime code, architecture tests, or dead files. They are in fact regression guards that scan the source tree and assert a completed migration stays completed. Rename them to say so.

Keep the guards themselves. They scan with an empty allowlist, which is a stronger invariant than any static gate, and they must stay green.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [ ] No directory in the Build module is named after a delivery phase
- [ ] The guards live under a name describing what they protect
- [ ] Every guard still runs and still passes, with its allowlist still empty
- [ ] The test runner discovers them at the new location
