# 23 — No organization-owned query bypasses placement

**What to build:** Proof, not confidence. Every query touching organization-owned data goes through placement resolution, and a query that does not is a failing build — so the one someone adds next year cannot quietly reach the primary database for a tenant that no longer lives there.

**Blocked by:** [20 — Placement is a record, not a column](20-placement-is-a-record.md)

**Status:** ready-for-agent

**Grounding (2026-08-28, evidence not instruction — re-read at source):** this is a listed Phase 1 exit criterion — *"prove no organization-owned query bypasses placement."* The escape hatches already exist and are legitimate: `runOutsideTenantContext` is used by the placement lookup itself (`region.module.ts:44`), and `no-tenant-transaction.decorator.ts` exists for genuinely global work. The check's job is to make each of those deliberate and enumerated rather than available by default. Two warnings from this program apply directly: a text scan under-reports on its first run in every case recorded here, and a scan that reports "everything is fine" is usually a broken scan — test it against a defect you already know.

## Acceptance criteria

- [ ] A check enumerates every path that reaches the database outside a tenant transaction and fails on one that is not on an explicit allowlist.
- [ ] Each allowlist entry carries a reason; an entry with no reason is removed rather than kept.
- [ ] The check is self-tested against a deliberately bypassing query, and fails on it — a check that has never failed proves nothing.
- [ ] Raw `db.execute(sql\`…\`)` call sites are covered; they are the ones a Drizzle-shaped scan misses.
- [ ] Background jobs, cron sweeps and post-commit hooks are covered — after-commit work had no tenant context at all until it was fixed systemically, and it is exactly the class that escapes a request-path scan.
- [ ] The check runs in CI and fails the build non-zero, not as a warning.

## Todo

- [ ] Write the check against the known-bad case first, then run it clean. Every CI check in this program under-reported on its first run.
- [ ] Cover dynamic and re-exported forms; a from-based scanner cannot see a bare side-effect import and has already cost a live file here.
- [ ] Count the allowlist. If it is long, the boundary is in the wrong place and the check is documenting a problem rather than preventing one.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
