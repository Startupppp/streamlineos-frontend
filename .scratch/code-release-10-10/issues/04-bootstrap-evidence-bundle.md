# 04 — Retain the bootstrap and migration evidence bundle

**What to build:** A durable, hashed evidence record for the current-head database work, so a later reviewer can tell what was proven, at which commit, against which database — and cannot mistake the older evidence for current.

**Blocked by:** 02, 03.

**Status:** ready-for-agent

- [ ] The bundle records release SHA, every command run, database identity, dataset shape, journal hash and count, catalog diff and artifact hashes.
- [ ] Sanitized logs only — no connection string appears in any retained artifact.
- [ ] Pass/fail/skip counts are recorded literally. A gate that did not run is reported as not run, never as passing.
- [ ] The superseded evidence is explicitly marked as covering the former head, so it cannot be cited as current-head proof.
- [ ] The bundle is linked from the PRD's verification snapshot.
