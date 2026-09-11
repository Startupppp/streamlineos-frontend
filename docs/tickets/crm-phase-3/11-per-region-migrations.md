# 11 — Migrations run per region with a per-region result

**Status:** done — `pnpm db:migrate:regions`.
**Track:** C — regions
**Blocked by:** 08

## Why

A partial rollout must be visible rather than assumed.

## Acceptance criteria

- [ ] One command migrates every configured region.
- [ ] The result is reported **per region**, including failures, rather than aggregated to a single pass or fail.
- [ ] A region that fails does not stop the others being reported.
- [ ] The command is idempotent: re-running after a partial failure completes the remainder.

## Notes (2026-08-26)

Runs the pending-migration worker once per configured region and reports per
region. A single pass saying only "ok" or "failed" hides a partial rollout, which
is the state that actually hurts: two regions migrated, one not, and an
application booting against all three.

**The migration logic is not duplicated.** `run-pending-migrations.mjs` stays the
one place that knows how to read the journal, compute the watermark and apply a
file; the new driver decides which database it points at and nothing else. A
per-region copy of the worker is how two copies drift, and a migration runner
that drifts is a schema that drifts.

A failing region does not stop the others being attempted or reported, and the
process still exits non-zero so a deploy does not proceed on a partial rollout. A
region configured without a database is named rather than skipped. Only the
primary inherits the flat `DATABASE_URL` — a secondary falling back to it would
migrate the primary twice under two names and report both healthy.

Verified in both shapes: single-region with no `REGION_KEYS` resolves one region
and runs what `db:migrate` ran before; three regions with one unconfigured
reports two attempts and names the third.