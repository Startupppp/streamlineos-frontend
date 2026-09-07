# Disposable-database E2E run — 2026-09-04

Covers PRD-C018. **The suite runs green for every in-scope spec. It does not satisfy the criterion.**
Those are two separate findings and this document keeps them apart, because a green suite that does not
touch two thirds of the required surface reads as coverage it does not have.

## Environment

`pnpm test:e2e:seeded` (`jest-e2e-seeded.json`, `maxWorkers: 1`, `--runInBand --forceExit`) against
`scratch_boot_d` on disposable Neon branch `br-patient-dew-az4o362h` — a cleanly bootstrapped database at
migration head 685/685 with application-role grants applied, seeded by `pnpm seed:scratch-e2e`
("All sections completed without errors", 864.6 s).

## A guard that worked, and cost one full run

The first attempt failed **16 of 16 suites, 149 tests** — uniformly. That uniformity is the tell: it was
one setup cause, not 149 defects. The cause:

```
[seeded-e2e] refusing to run seeded e2e against database "neondb" — it writes and deletes
fixture rows, so DATABASE_URL must name a disposable database
```

The harness reads `DATABASE_URL`, not `SCRATCH_DATABASE_URL`, and `.env` points at the shared remote
branch. The guard was right and the run was wrong. Re-run with `DATABASE_URL` bound to the disposable
database. Nothing about the guard was weakened to make the suite run.

## Result

```
Test Suites: 14 passed, 2 failed, 3 skipped, 16 of 19 total
Tests:       146 passed,  3 failed, 19 skipped, 168 total
```

Both failing suites are **CRM, which is explicitly excluded from release scope**:

| Failing test | Suite |
|---|---|
| `CRM import round trip › previews, commits what it promised, and takes it all back` | `crm-import-roundtrip` |
| `CRM import round trip › restores an overwritten record exactly, which is the half people care about` | `crm-import-roundtrip` |
| `CRM tenant isolation, as the application role › matches the tables RLS is actually enabled on` | `crm-tenant-isolation` |

They are recorded rather than hidden: the third is an RLS-coverage assertion and would be worth
resolving whenever CRM re-enters scope. **Every in-scope seeded spec passed.**

## Why PRD-C018 is still OPEN — the coverage gap

The criterion names fifteen domains. Mapping all 17 seeded specs onto them:

| Domain | Seeded E2E coverage |
|---|---|
| Organization/RBAC | PARTIAL — `security/bola/bola-live-cross-tenant`, `security/bola/t15-own-tenant-500` |
| HRMS | YES — `hr/hr-policy-cross-tenant` |
| Billing | YES — `billing/ai-credits-reserve-race` |
| Calendar | YES — 5 specs (conflict, occurrence exception, DST recurrence, reminder sweep, sync divergence) |
| Knowledge | YES — `kb/kb-acl-purge-reindex`, `kb/kb-page-visibility` |
| **Home** | **NONE** |
| **Settings** | **NONE** |
| **Payroll** | **NONE** |
| **Build** | **NONE** |
| **Payments** | **NONE** |
| **Accounting** | **NONE** |
| **Chat** | **NONE** |
| **Notifications** | **NONE** |
| **Workflows** | **NONE** |
| **Inbox/mail** | **NONE** |

**Ten of fifteen required domains have zero disposable-database E2E coverage.** The remaining specs in
the corpus (`db/postgres-error-shape`, `perf/route-budget-http`, `security/gdpr-export-cross-module-privacy`,
`support/support-ticket-follow`, and the three CRM specs) are real and useful but do not answer any of
the ten.

Note that Chat and Notifications, though uncovered *here*, were separately proved end-to-end today by a
live API probe — see `CHAT-MENTION-DELIVERY-2026-09-04.md`, two runs at exit 0. That is genuine evidence
of delivery; it is simply not a seeded E2E spec, and C018 asks for the latter.

## Verdict

**PRD-C018 — OPEN.** Not because anything failed, but because the corpus does not reach 10 of the 15
named domains. Closing it requires writing those specs, not re-running these. The suite result and the
coverage verdict must not be collapsed into one number.
