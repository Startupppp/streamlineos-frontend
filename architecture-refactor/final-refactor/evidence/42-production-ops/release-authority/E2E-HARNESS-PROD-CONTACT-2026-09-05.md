# Seeded-E2E harness connected to the production database — 2026-09-04

Recorded because a test harness reached a production database. Disclosed rather than discarded, and
the run it produced is void as evidence.

## What happened

A full seeded-E2E run was started against the disposable database `scratch_boot_c` by setting
`DATABASE_URL` to that database. The application reads **four** database URLs, not one, and the other
three were left at their `.env` values, all of which point at the production host
`ep-orange-mode-azxn5hbr`:

| Variable | Purpose | Where it pointed during the run |
|---|---|---|
| `DATABASE_URL` | owner role | disposable (`scratch_boot_c`) — overridden |
| `APP_DATABASE_URL` | RLS-enforced application role | **production** |
| `REGION_CELL_2_DATABASE_URL` | secondary cell owner | **production** |
| `REGION_CELL_2_APP_DATABASE_URL` | secondary cell app role | **production** |

The result was a split brain: the seed helper wrote fixtures into `scratch_boot_c` while the
application resolved its own reads through the app role against production.

## Window and observed effect

Duration ~21 minutes (jest wall clock 1,292 s). Two observations bound the impact:

- **Every spec HTTP request returned 401.** 72 of the recorded assertion failures are `Received: 401`.
  The users the helper seeded exist only in `scratch_boot_c`, so authentication against production
  failed and no spec handler executed against production data. The failures were incidentally
  protective.
- **Background workers did reach production.** The log records `payroll-export-worker` organization
  sweeps against `ep-orange-mode-azxn5hbr-pooler`, each terminating
  `write CONNECTION_ENDED`.

**No successful write was observed.** That is the honest limit of this statement: it is an absence of
evidence of a write, not a positive audit of the production database, which the owner elected not to
run.

## Why the run is void as evidence

The 24 failed suites and 102 failed tests are artifacts of the misconfiguration, not defects. The two
suites that passed (`ai-credits-reserve-race`, `postgres-error-shape`) are the two that issue no
authenticated HTTP request. The seed helper's own `role_permission_grants` insert also failed, for the
same reason. PRD-C018 is therefore **unproven, not failed** — the run measures nothing about the code.

## Second defect found in the same log: the wrapper reported a false pass

The invocation ended `... > log 2>&1; echo "EXIT=$?" >> log`, so the shell's exit status was that of
the trailing `echo` — always 0. The background runner reported "completed (exit code 0)" while
`SEEDED_E2E_EXIT=1`. Reading the log, rather than trusting the reported status, is what caught both
this and the production contact.

## Fix

`.scratch/run-seeded-e2e.mjs` now pins `DATABASE_URL` and `APP_DATABASE_URL` to the disposable owner
and app roles, deletes `REGION_KEYS` and every `REGION_CELL_2_*` variable so the secondary cell is not
registered at all, and then **refuses to start** unless every environment variable matching
`/(DATABASE_URL|DB_URL)$/` resolves to host `ep-polished-art-azutwo4c.c-3.ap-southeast-1.aws.neon.tech`
and to a database not named `neondb` or `cell2`. It also rejects `APP_DATABASE_URL === DATABASE_URL`,
which would be the owner role twice and would silently disable RLS. A failed guard exits **2
(INCONCLUSIVE)**, never 0.

The guard is proved load-bearing, not assumed: injecting `BOGUS_DATABASE_URL=postgres://…@evil.example.com/somedb`
makes it exit 2 and name that variable.

It additionally refreshes app-role grants before the suite and exits 2 if that fails, because stale
grants after new migrations produce the same whole-suite red for a non-code reason.

## Rule this establishes

Overriding `DATABASE_URL` does not point this application at a database. Four variables resolve to a
database and the region layer adds more per cell. Any harness that targets a disposable database must
enumerate every `*DATABASE_URL` in the child environment and fail closed on the ones it does not
recognise, rather than overriding the one that happens to be known.
