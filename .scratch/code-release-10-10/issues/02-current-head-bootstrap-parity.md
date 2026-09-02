# 02 — Current-head clean-bootstrap parity at the full journal

**What to build:** The retained bootstrap evidence proves a 634-entry journal. The chain has moved past it, so that evidence covers a former head and does not close the gate. Reproduce it at one release commit: two independent clean bootstraps from zero plus one interrupted-then-resumed bootstrap, all reaching the same entry count with zero failures and byte-identical catalogs.

**Blocked by:** 01 — the applied set must be final before parity means anything.

**Status:** done

- [x] Two independent clean bootstraps from an empty database reach the full journal count with zero failures.
  - Evidence: `db-bootstrap.mjs` into `scratch_boot_b` and `scratch_boot_c`, both created empty (0 tables) immediately before. Each: `RESULT: REACHED_HEAD 637/637`, exit 0, 637 OK / 0 SKIP / 0 FAIL / 0 retries. Re-run of each is idempotent at 0 OK / 637 SKIP / exit 0.
- [x] One bootstrap is interrupted mid-chain and resumed, reaching the same terminal state — this is the path that previously exposed a migration ordering defect, so it is not optional.
  - Evidence: `scratch_boot_d` SIGKILLed (real `kill -9`, process gone) at OK_count=346, in flight on entry 347 `0625_relocation_copy_progress`. Ledger held exactly 346 rows and 0 of 0625's 4 columns existed, so no half-applied migration. Resume: 346 SKIP + 291 OK = `REACHED_HEAD 637/637`, exit 0, 0 FAIL — with `OK [0628_communication_actor_normalization]` and `OK [0652_repair_chat_reaction_backfill]` both applied in the resumed half.
- [x] Catalogs match exactly across tables, columns, constraints, indexes, policies, functions, triggers, extensions, enums and RLS state.
  - Evidence: `compare-bootstraps.mjs` b-vs-c, b-vs-d, c-vs-d (and read-only b-vs-a) all `RESULT: SCHEMAS IDENTICAL  differences=0`, exit 0, across 13 categories — 1026 tables, 13525 columns, 13989 constraints, 5067 indexes, 966 policies, 457 functions, 163 triggers, 5 extensions, 2441 enum labels, 966 RLS tables, 770 sequences, 0 views, 637 ledger rows. The comparator was deepened to compare definitions (pg_get_constraintdef / indexdef / policy qual+with_check / pg_get_triggerdef / function body digest), not names; a negative control on two probe databases produced `differences=15`, exit 1, including a same-name/different-columns index the old name-only version passed.
- [x] Every target used is a scratch database. The harness must refuse a database whose name lacks `scratch`; confirm that refusal still fires.
  - Evidence: `seed-scratch-e2e.mjs --self-test` 4/4 pass; live run with a non-scratch name exits 1 with `refusing to seed database "postgres"`. `reset-scratch-db.mjs` had only a two-name denylist and was hardened to the same allowlist: `--self-test` 8/8, live refusal exits 2 and the refused database is untouched, accepted path still resets a real scratch database to 0 tables + 5 extensions.
- [x] Record the release SHA, each command, database identity and journal hash/count.
  - Evidence: recorded in `reports/02-bootstrap-parity.md`. `main` = 6795e0377cebae7955e352f41d231f991a17670c (read from `.git/refs/heads/main`; working tree carries this release's uncommitted changes). Journal: 637 entries, file sha256 23ee3f5a…02f7, chain digest c2f7f626…d6d4, head `0991_calendar_event_local_version` when=1803000010087. All three targets' ledger hash sets equal the journal's: 6651dc09…de9b.
- [x] Run `VACUUM ANALYZE` after the rewrite before any count or plan is trusted.
  - Evidence: `VACUUM ANALYZE` run on all three targets after the chain completed and before every count and comparison in this ticket; `pg_stat_user_tables` shows 1027/1027 analysed on each.
