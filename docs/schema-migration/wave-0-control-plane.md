# Wave 0 — Migration control plane (T0.1–T0.4)

> Part of `docs/schema-change-plan.md`. This is the **control plane** the whole redesign stands on:
> a trustworthy migration pipeline. Nothing in Waves 1–12 is safe until the drift below is resolved.
> **Status: findings + runbook produced (code/docs only). The DB reconciliation steps are gated on
> the user (DB access + TTY).** Verified 2026-07-26.

---

## T0.1 — Drift report (VERIFIED — the pipeline is broken)

The Drizzle migration state on `refactoring-hrms` is internally inconsistent. Evidence:

| Fact | Value | Source |
|------|-------|--------|
| `.sql` migration files on disk | **20** | `backend/migrations/*.sql` |
| Entries in the journal | **17** | `backend/migrations/meta/_journal.json` |
| Snapshot files in `meta/` | **2** (`0000_snapshot.json`, `0016_snapshot.json`) | `backend/migrations/meta/` |
| Files NOT in the journal | **`0007_search_trgm_indexes`, `0008_user_module_access`, `0300_kb_chunk_content_hash`** | diff of the two lists |
| Numbering order in the journal | `0000–0006` → **`0291–0299`** → **`0016_volatile_nicolaos` (LAST, idx 16)** | `_journal.json` |
| Timestamps | `0291–0299` carry hand-set `when` values (`1784651000000+`); `0016` carries a real generator timestamp **later** than all of them | `_journal.json` |

### Root cause (confirmed, not inferred)
`backend/scripts/apply-sql-file.mjs` and `apply-hrms-migrations.mjs` apply raw SQL with
`sql.unsafe(content)` **directly against the database** — they do **not** touch Drizzle's
`__drizzle_migrations` ledger, `_journal.json`, or the snapshot chain. `apply-hrms-migrations.mjs`
even targets a `/^02(0[1-9]|1[0-9]|2[0-6])_/` (0201–0226) range that **no longer exists on disk**
(those were renumbered to 0291–0300 or removed). So migrations have been hand-numbered and
side-applied, while the journal/snapshots were partially hand-edited. Combined with a live
`db:push` script, the "source of truth" for schema state has been the running database, not the
migration history.

### Consequences
- `drizzle-kit migrate` on a fresh DB applies only the **17 journal tags in journal order** — it
  **skips `0007`, `0008`, `0300`** and applies `0016` *after* `0299`. A clean DB does **not**
  reproduce production.
- `drizzle-kit generate` diffs the current 198-file schema against the **`0016` snapshot** (the last
  in the journal), so a fresh `generate` would emit one giant migration re-describing everything
  added since `0016` (0291–0300 and all push-only changes). It cannot be trusted as an incremental.
- There is no reliable way to bring "a clean DB" and "production" to an identical, verifiable head
  today. **This is the Wave 0 blocker.**

### Exit criterion (unchanged from the plan)
A clean database and every existing database reach an **identical, verifiable head via
`generate`+`migrate` only** (no `push`, no `apply-*.mjs`), with the journal and snapshots matching
the files, and no unexplained drift.

---

## T0.1 — Reconciliation runbook (USER runs; do on a Neon branch first)

**Do not attempt in-place journal surgery.** The lowest-risk path is a **squash to a verified
baseline**, executed against a throwaway Neon branch before any real environment:

1. **Snapshot safety.** Create a Neon branch of production (`prod-recon`). All steps run there first.
2. **Capture the true DB shape.** `pg_dump --schema-only` the branch. This is the *actual* deployed
   schema (what push/side-apply produced) — the reconciliation target.
3. **Confirm the code schema matches the DB.** On the branch, run `pnpm db:push --dry-run`-equivalent
   (or `drizzle-kit generate` against a temp) to see the diff between `src/db/schema/**` and the DB.
   Resolve every difference so **code == DB** exactly (fix the schema, not the DB, wherever the code
   is authoritative). Record each diff.
4. **Rebuild a single baseline.** Archive the current `migrations/` to `migrations/_legacy/`. Run
   `drizzle-kit generate` once against an *empty* database to emit a clean `0000_baseline` +
   `0000_snapshot.json` + a fresh `_journal.json` describing the entire current schema.
5. **Register the baseline as already-applied on existing DBs.** On every real database (which
   already has the schema physically), insert the baseline's hash into `__drizzle_migrations` so
   `drizzle-kit migrate` treats it as done and is a **no-op** — the schema is not re-created.
   (Fresh DBs simply run `migrate` and get the baseline.)
6. **Verify.** On a second clean Neon branch, `migrate` from empty → `pg_dump --schema-only` →
   `diff` against the production dump from step 2. **Zero diff = reconciled.**
7. **Delete `migrations/_legacy/`** only after two green releases (keep history reachable in git).

From this baseline forward, **all** schema change is `generate` + `migrate`. Waves 1–12 append
normal incremental migrations.

---

## T0.2 — Forbid `db:push` outside local dev (SHIPPED — code)

`backend/scripts/guard-db-push.mjs` wraps `drizzle-kit push` and **refuses** when `NODE_ENV=production`
or `CI` is set (override locally with `ALLOW_DB_PUSH=1`). `package.json` `db:push` now runs the guard.
Rationale: CLAUDE.md §19 (`push` is local-dev only; CI uses `generate`+`migrate`). This closes the
primary drift source going forward.

**Also flagged for the Wave 12 dead-code sweep / hardening (do NOT delete yet — the user may still
need them for the reconciliation):** `apply-sql-file.mjs`, `apply-hrms-migrations.mjs` (stale
0201–0226 range). After reconciliation, these ad-hoc appliers should be removed so nothing can
side-apply SQL past the ledger again.

---

## T0.3 — ID-type / orphan inventory (seed)

See `docs/schema-migration/id-transition-matrix.md` for the per-table matrix seed (canonical `text`
tenant key, the confirmed `integer`-`org_id` defects in `billing.ts`, the FK-less `org_modules`, and
the dual `users.department_id`/`branch_id` legacy IDs). It is filled in incrementally as each wave
touches its tables (a release gate before Wave 7 constraints), not all at once.

---

## T0.4 — Reconciliation / orphan-detection harness

See `docs/schema-migration/reconciliation-queries.sql` — run these against any environment to detect,
before Wave 1/7 constraints are added: cross-tenant orphans, `integer`↔`text` `org_id` join failures,
multi-owner / ownerless organizations (Wave 1 bootstrap input), and FK-less `org_modules` rows. All
are read-only `SELECT`s.

---

## What is DONE vs. what needs the user

- **DONE (code/docs, committed-ready):** drift report; `db:push` guard; ID-matrix seed; reconciliation
  SQL harness.
- **NEEDS USER (DB access + TTY):** run the reconciliation runbook on a Neon branch; run the
  reconciliation SQL and share counts (especially multi-owner/ownerless orgs — direct input to Wave 1).
- Only after the exit criterion is met should Wave 1 migrations be generated.
