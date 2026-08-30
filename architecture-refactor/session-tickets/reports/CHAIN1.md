# CHAIN1 — Migration chain duplicate-prefix resolution

**Date:** 2026-08-31
**Gate:** `pnpm check:migration-chain` (`src/scripts/verify-migration-chain.mjs`)

---

## Real failure list (before fix)

Running `pnpm check:migration-chain` produced exactly two failures:

```
(b) DUPLICATE PREFIX  0700: 0700_timesheets_attr_expand, 0700_timesheets_idx_org_status_date
(b) DUPLICATE PREFIX  0701: 0701_kb_ingestion_checkpoints, 0701_timesheets_attr_validate
```

No other prefixes were colliding. All four files exist on disk and in the journal:

| tag | idx | when |
|---|---|---|
| 0700_timesheets_idx_org_status_date | 511 | 1798000011000 |
| 0701_kb_ingestion_checkpoints | 513 | 1798000012000 |
| 0700_timesheets_attr_expand | 519 | 1798000018000 |
| 0701_timesheets_attr_validate | 520 | 1798000019000 |

All four have unique `when` values and are already applied to the live database.

---

## Verdict: Option B (Baseline)

All four colliding files are already in the Drizzle journal with unique `when` timestamps and are in applied history. Renaming them would require picking free prefixes (0705+), updating their journal tags, and verifying no other references — for zero DB benefit, because Drizzle keys on `created_at` (`when`), not on the filename or tag. The repo already has this pattern: 12 prefix collisions are baselined in `HISTORICAL_DUPLICATE_PREFIXES` for the same reason.

The companion gate (`check-migration-discipline.mjs`) already had both prefixes in its own `BASELINE_JOURNAL_INTEGRITY`:
- `dup-prefix:0700_timesheets_idx_org_status_date.sql`
- `dup-prefix:0701_timesheets_attr_validate.sql`

Only the chain gate was missing them.

---

## Fix

Added `"0700"` and `"0701"` to `HISTORICAL_DUPLICATE_PREFIXES` in
`backend/src/scripts/verify-migration-chain.mjs` (the set that closes at 14 entries).
The comment above the set documents that it is closed: a NEW collision still fails.

---

## Bite proof

A temporary file `0704_bite_test_collision.sql` was created (0704 already has
`0704_mail_sync_checkpoints.sql`). The gate exited 1 with:

```
(a) UNJOURNALLED  0704_bite_test_collision
(b) DUPLICATE PREFIX  0704: 0704_bite_test_collision, 0704_mail_sync_checkpoints
```

The temp file was removed. The gate exited 0:
```
PASS  migration chain verified — no issues found
```

The gate bites for new collisions.

---

## Gate exit codes

| Gate | Exit code |
|---|---|
| `pnpm check:migration-chain` | **0** (PASS) |
| `node src/scripts/check-migration-discipline.mjs` | **0** (PASS) |

---

## File changed

`backend/src/scripts/verify-migration-chain.mjs` — `HISTORICAL_DUPLICATE_PREFIXES` extended with `"0700"` and `"0701"`.
