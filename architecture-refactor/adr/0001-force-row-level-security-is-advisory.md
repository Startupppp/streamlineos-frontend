# ADR 0001 — FORCE ROW LEVEL SECURITY is advisory, not a hard gate

**Status:** Accepted
**Date:** 2026-08-28

## Context

`db-verify-rls.mjs` check #3 counted tables with RLS enabled but `relforcerowsecurity = false` as hard failures, reporting 907 of them. `backend/CLAUDE.md` §4 says "never blanket-enable or FORCE". These two positions contradict each other.

The concrete facts:

- `FORCE ROW LEVEL SECURITY` applies only to the **table owner** — a role that owns the table bypasses policies unless FORCE is set. Every other role is already subject to policies.
- The application connects as `streamline_app`, which is a non-owner. It is subject to RLS policies whether or not FORCE is set.
- `neondb_owner` has `BYPASSRLS = true`. `BYPASSRLS` overrides `FORCE`, so enabling FORCE on all 907 tables would not change `neondb_owner`'s ability to read across tenants. The protection is already absent for that role.
- Setting FORCE on 907 tables today changes zero observable behaviour under the current connection topology.

Verified against the live database on 2026-08-28: `APP_DATABASE_URL` connects as `current_user = streamline_app` with `rolbypassrls = false`, and `DATABASE_URL` connects as `neondb_owner`. An earlier audit incorrectly stated that the application connects as `neondb_owner`; the request path is already policy-bound.

## Decision

Check #3 in `db-verify-rls.mjs` is demoted from a hard failure to an advisory notice. It never increments the failure counter and never affects the exit code. It still enumerates affected tables (count plus up to 20 names with an overflow note) so the information is not silently discarded. The advisory message explains why FORCE is benign under the current topology and names the condition that would make it a real failure.

`backend/CLAUDE.md` §4 ("never blanket-enable or FORCE") is unchanged. The rule remains correct: FORCE is not useful here and blanket-enabling it would create false confidence.

The compensating control that does protect against a table-owner connection is `DrizzleModule.assertRlsIsEnforced()` (`backend/src/db/drizzle.module.ts`), which throws in production when the connecting role has `BYPASSRLS`. That is the gate that actually bites.

## Consequences

**What is now NOT protected:** A connection made as the table owner (e.g. `neondb_owner` or any other owner role) is not constrained by FORCE ROW LEVEL SECURITY. Such a connection could cross-tenant read any RLS-enabled table. The compensating control is `DrizzleModule.assertRlsIsEnforced()`, which prevents the application from booting with a BYPASSRLS role in production.

The 907 advisory tables will appear in every `db:verify-rls` run until FORCE is explicitly set or they are moved to `PLATFORM_GLOBAL_TABLES`. That is intentional — they are visible, not silenced.

## What would reverse this decision

Reverting to a hard failure is correct if any of the following become true:

- A table-owner or BYPASSRLS connection enters the live request path (e.g. a migration helper promoted to a live endpoint, or a connection string pointing at the owner role in production).
- Neon adds true superuser support and `LEAKPROOF` functions become available, making FORCE a meaningful defence-in-depth layer.
- A regulatory requirement mandates FORCE regardless of connection topology.

To reverse: delete the advisory block, restore the original `check(...)` loop, and remove this ADR's Status line or replace it with "Superseded by ADR XXXX".
