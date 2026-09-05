# Disposable-database E2E — 2026-09-05

**DRAFT — pending the BOLA live cross-tenant sweep result. See §5 for the clearly marked placeholder.**

Covers PRD-C018. Verified results only. Anything not measured is recorded as not measured,
never as passing. Items taken on trust from established facts rather than freshly measured
in this session are labelled (TRUST).

---

## C018 verbatim and file:line

`architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md:89`

> - [ ] **[PRD-C018]** Run disposable-database E2E for Organization/RBAC, Home, Settings,
> HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge,
> Workflows and Inbox/mail.

Secondary reference (non-authoritative backlog): `architecture-refactor/PRD-10-10-TODO.md:50`

> - [ ] Run representative disposable-database E2E for Organization/RBAC, Home, Settings,
> HRMS, Payroll, Build, Billing, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows
> and Inbox/mail.

The authoritative checklist is `PRD-10-10-CODE-RELEASE-TODO.md` (states "This is the single
authoritative checklist" at line 2). Payments appears in that text; the TODO omits it — use
the authoritative text.

---

## Acceptance checklist

Derived from the criterion text and PRD-C019's companion record requirement. Requirements
not stated explicitly in the one-line criterion are inferred from the surrounding evidence
narrative (lines 90–93 of the same file), which is also authoritative.

| # | Requirement | Status | Evidence |
|---|---|---|---|
| A | Database is disposable — name must contain "scratch"; URL must not equal DATABASE_URL or APP_DATABASE_URL | MET | Guard in `backend/src/scripts/seed-scratch-e2e.mjs:45`: `if (!/scratch/i.test(database))` rejects any non-scratch target. Database: `scratch_e2e` on Neon branch `br-sparkling-block-az4pth1h`. |
| B | Database bootstrapped from empty to migration head via `apply-chain-cold.mjs` | MET (TRUST) | Result: `REACHED_HEAD 691/691, already_present=0, chain_gaps=0`. Script self-test: 3/3. |
| C | Database seeded without errors | MET (TRUST) | Seeder printed "All sections completed without errors." LARGE_ORG `aaaaaaaa-1111-0000-0000-000000000001`, SMALL_ORG `aaaaaaaa-1111-0000-0000-000000000002`. |
| D | Journal and applied-migration set agree at the seeded database | MET (TRUST) | `route-budget-http` spec printed `[route-budget-http] database=scratch_e2e applied=691 journal=691` — zero pending, zero orphaned. |
| E | All 15 named domains covered by at least one passing spec | MET | 33 seeded-e2e specs confirmed by glob; mapping of each to a domain in §4. 30 non-CRM specs include at least one per each of the 15 named domains. |
| F | In-scope suites: zero failures | MET (TRUST) | 27 suites PASSED, 0 FAILED, runner exit 0. CRM/Inventory excluded per criterion; 3 CRM specs (`crm-inbound-ingress`, `crm-import-roundtrip`, `crm-tenant-isolation`) filtered from lane. |
| G | Cross-tenant BOLA live sweep passes | PENDING | `bola-live-cross-tenant.seeded-e2e-spec.ts` skipped unexpectedly — BOLA_SOURCE_ORG_ID/BOLA_PROBER_ORG_ID not passed to runner. Re-run in progress. See §5 placeholder. |
| H | Commands, release SHA, database identity, dataset shape, pass/fail/skip counts recorded | MET | Covered in §3 (environment and commands), §4 (domain/suite table) and this document. |

---

## The defects the disposable database found — the centrepiece of this document

A disposable database starts empty. An existing database accumulates residue from prior
runs that silently satisfies constraints a fresh insert violates. Five defects were found
and fixed only because the database was empty:

1. **Organization ordering** — `seedOrganizationsAndOwners` ran before `seedUsers`, so every
   `INSERT INTO organizations` failed the FK to `users`. Result: 0 orgs created, 127 cascading
   FK warnings. Fix: reorder `main()` — `seedUsers` now runs first.

2. **Invalid enum value** — `notification_suppression_rules.reason` received a value not in the
   Postgres enum type. Fix: corrected in seed script.

3. **Payslip CHECK constraint** — `chk_payslip_publications_subject` requires `user_id OR
   worker_id`. The seeder inserted subjectless rows. Fix: `seedPayslipPublications` now carries
   the subject forward from the run employee row.

4. **Unadvanced `build.project_ticket_counters`** — bulk ticket insert via `generate_series`
   bypasses `allocateTicketNumbers`. Counter left at 1 against seeded ticket numbers up to
   194,000, so the first `POST /build/{projectId}/tickets` after seeding collided on the
   `(org_id, project_id, ticket_number)` unique index and answered 500.
   Fix: commit `3d22ff159` — sync counter to `MAX(ticket_number)+1` per project after bulk insert.

5. **Three vacuous benchmark fixtures** — `leave-requests-mine` and `attendance-mine` budgets
   filter on `user_membership_id`, which `seedLeave` and `seedAttendance` never populate. Both
   budgets measured an empty set and passed while guarding nothing.
   Fix: commit `e8b0abf92` — `seedLeaveMine` and `seedAttendanceMine` populate the column
   for the benchmark membership.

---

## Environment and commands

```
# Step 1 — cold bootstrap (migration runner)
node backend/src/scripts/apply-chain-cold.mjs
# Result: REACHED_HEAD 691/691, already_present=0, chain_gaps=0
# Self-test: 3/3 (TRUST)

# Step 2 — seed
SCRATCH_DATABASE_URL=<redacted — scratch_e2e on br-sparkling-block-az4pth1h> \
  node backend/src/scripts/seed-scratch-e2e.mjs
# Result: "All sections completed without errors." (TRUST)

# Step 3 — seeded E2E run
DATABASE_URL=<redacted — scratch_e2e on br-sparkling-block-az4pth1h> \
  pnpm test:e2e:seeded
# Config: jest-e2e-seeded.json, maxWorkers: 1, --runInBand --forceExit
# Runner exit: 0 (TRUST)
```

Target database: `scratch_e2e` on Neon branch `br-sparkling-block-az4pth1h`.
Host and port omitted — matches the `managed-host-name` redaction pattern.
Connection string does not appear in this document.

| Attribute | Value |
|---|---|
| Backend HEAD | `e7f5854d08f2dc57643e9be4099337b65cad4a1e` |
| Root HEAD | `289c93fecd3d77d39bd9dbc495f05122d2a06eb1` |
| Neon branch | `br-sparkling-block-az4pth1h` |
| Database | `scratch_e2e` |
| Migration head | 691 / 691 |

---

## Suite result

| Attribute | Value |
|---|---|
| Suites passed | 27 |
| Suites failed | 0 |
| Suites skipped | 2 |
| Tests passed | 157 |
| Tests skipped | 11 |
| Runner exit | 0 |

All values are TRUST — taken from the established facts, not freshly measured in this session.

---

## Domain coverage

Spec list confirmed by `glob test/**/*.seeded-e2e-spec.ts` — 33 files. CRM excluded from
lane: 3 specs (`crm-inbound-ingress`, `crm-import-roundtrip`, `crm-tenant-isolation`).
Remaining: 30 non-CRM specs.

| Domain | Seeded spec(s) | Result |
|---|---|---|
| Organization/RBAC | `settings/settings-rbac-authorization` · `settings/settings-per-person-grant-lifecycle` · the per-module cross-tenant isolation specs | PASSED (TRUST) |
| Organization/RBAC — cross-tenant sweep | `security/bola/bola-live-cross-tenant` · `security/bola/t15-own-tenant-500` | SKIPPED — see §5 |
| Home | `home/home-self-service-universal` · `home/home-module-universal-access` | PASSED (TRUST) |
| Settings | `settings/settings-rbac-authorization` · `settings/settings-per-person-grant-lifecycle` | PASSED (TRUST) |
| HRMS | `hr/hr-policy-cross-tenant` | PASSED (TRUST) |
| Payroll | `payroll/payroll-run-authorization` | PASSED (TRUST) |
| Build | `build/build-ticket-scope-and-isolation` | PASSED (TRUST) |
| Billing | `billing/billing-entitlement-and-seat-isolation` · `billing/ai-credits-reserve-race` | PASSED (TRUST) |
| Payments | `payments/payment-record-isolation` · `payments/manual-payment-methods` | PASSED (TRUST) |
| Accounting | `accounting/accounting-ledger-isolation` | PASSED (TRUST) |
| Chat | `chat/chat-channel-membership-isolation` | PASSED (TRUST) |
| Calendar | 5 specs: conflict · occurrence-exception · recurrence-dst · reminder-sweep · sync-status-divergence | PASSED (TRUST) |
| Notifications | `notifications/notification-recipient-isolation` · `notifications/notifications-list-contract` | PASSED (TRUST) |
| Knowledge | `kb/kb-acl-purge-reindex` · `kb/kb-page-visibility` | PASSED (TRUST) |
| Workflows | `workflows/workflow-definition-isolation` | PASSED (TRUST) |
| Inbox/mail | `mail/mail-account-isolation` | PASSED (TRUST) |

Additional in-scope specs (not in 15-domain list but included in run):
`security/gdpr-export-cross-module-privacy` · `db/postgres-error-shape` ·
`support/support-ticket-follow` · `perf/route-budget-http`.

---

## Skipped suite analysis

### t15-own-tenant-500 — EXPECTED SKIP

File: `test/security/bola/t15-own-tenant-500.seeded-e2e-spec.ts`

Header comment (lines 22–24, verbatim):

> Opt-in only. The replay sends 88 real requests, DELETEs among them, so it must never join an
> ordinary seeded run by inheriting that run's DATABASE_URL.

Skip condition (line 25): `const describeIf = enabled ? describe : describe.skip;`
where `enabled` requires `process.env.T15_REPLAY === "1"`. Not set in the ordinary seeded runner.
This is the correct and designed behavior.

### bola-live-cross-tenant — UNEXPECTED SKIP — PENDING

**[PLACEHOLDER — BOLA live cross-tenant sweep result not yet known. Insert the following
fields when the re-run completes: tests passed, tests failed, findings count,
exit code, and any DISCLOSURE-level findings.]**

File: `test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts`

What it proves: that every object-addressable route answers 404 (never 403) when handed
another organization's id — the distinction between a tenant-bound response and an existence
oracle. The spec generates fixture ids from the small org, probes routes authenticated as
the large org, and asserts no 200 or 403 response discloses the record's existence.

Skip cause: BOLA_SOURCE_ORG_ID and BOLA_PROBER_ORG_ID were not passed to the test runner
in the recorded run. The spec's guard silently skips all assertions when its inputs are absent.

Re-run command (to be executed with the disposable database still live):
```
BOLA_SOURCE_ORG_ID=aaaaaaaa-1111-0000-0000-000000000001 \
BOLA_PROBER_ORG_ID=aaaaaaaa-1111-0000-0000-000000000002 \
DATABASE_URL=<redacted — scratch_e2e on br-sparkling-block-az4pth1h> \
  pnpm test:e2e:seeded --testPathPattern=bola-live-cross-tenant
```

---

## Commits carrying C018 work

Backend HEAD `e7f5854d08f2dc57643e9be4099337b65cad4a1e`. Source: `git -C backend log --oneline -12`.

Attributed by `git log --oneline -25 -- src/scripts/seed-scratch-e2e.mjs`, then confirmed
against each commit's diff of that file. Every SHA below is verified, none on trust.

| SHA (first 9) | Subject | C018 relevance |
|---|---|---|
| `938ad7ef6` | fix(seed): create the organization before the rows that reference it | Seed defect 1 — organization ordering |
| `6dc4050ad` | fix(seed): notification suppression reason must be a valid enum label | Seed defect 2 — invalid enum value |
| `f074b1304` | refactor(retention): streamline data insertion in runDrill function | Seed defect 3 — payslip CHECK (see note) |
| `3d22ff159` | fix(seed): advance the project ticket counter past the bulk-inserted tickets | Seed defect 4 — ticket counter |
| `e8b0abf92` | fix(seed): the three vacuous read-cost slots measured an empty set | Seed defect 5 — user_membership_id vacuity |
| `011d817ce` | feat(gate): add check:date-in-sql and fix 2 Date interpolations | Date-in-sql gate; not a seed fix |

Note on `f074b1304`: its subject names only the retention refactor, but its diff carries the
payslip fix — `user_id` and `worker_id` added to the `payslip_publications` insert so
`chk_payslip_publications_subject` is satisfied. A reader searching commit subjects for
"payslip" finds nothing; only `git log -S` against the seed file locates it.

Root HEAD `289c93fecd3d77d39bd9dbc495f05122d2a06eb1`. No C018-specific commits in the -6 window.

---

## Fixture size — static read of intent

These are the constants declared in `backend/src/scripts/seed-scratch-e2e.mjs`. They state
what the seeder INTENDS to reach; actual row counts require a live database query that was
not performed. Labelled as static intent.

| Table / set | Constant | Target |
|---|---|---|
| organizations | 2 fixed orgs | 2 |
| users | `MEMBER_COUNT` + 1 minority | 501 |
| org_members (large org, active) | `MEMBER_COUNT` | 500 |
| hr_employments | `HR_EMP_COUNT` | 5,100 |
| hr_reporting_lines | `REPORTING_LINES` | 1,100 |
| build.tickets (total, all projects) | `TARGET_TOTAL` | 18,500 |
| build.ticket_assignees (first 60 tickets) | 60 × 1 | 60 |
| chat_channels | 56 (1 general + 55 channel-N) | 56 |
| chat_messages | `CHAT_MSG_COUNT` | 300 |
| notifications | `NOTIFICATION_COUNT` | 150 |
| leave_requests | `LEAVE_REQUEST_COUNT` | 60 |
| leave_requests (spans today, APPROVED) | `LEAVE_TODAY_COUNT` | 50 |
| leave_requests (with user_membership_id) | `LEAVE_MINE_COUNT` | 200 |
| attendance | `ATTENDANCE_COUNT` | 90 |
| attendance (with user_membership_id) | `ATTENDANCE_MINE_COUNT` | 100 |
| timesheets | `TIMESHEET_COUNT` | 200 |
| kb_pages per space | `KB_PAGES_PER_SPACE` | 60 |
| announcements | `ANNOUNCEMENT_COUNT` | 400 |
| support_tickets | `SUPPORT_TICKET_COUNT` | 60 |
| invoices | `INVOICE_COUNT` | 25 |
| purchase_bills | `BILL_COUNT` | 25 |
| gl_journals | `JOURNAL_COUNT` | 35 |
| mail_message_metadata | `MAIL_MSG_COUNT` | 4,000 |
| clients | `CLIENT_COUNT` | 25 |

---

## Artifact hashes

Computed at backend HEAD `e7f5854d08f2dc57643e9be4099337b65cad4a1e`
using `node -e "crypto.createHash('sha256')..."`.

| Artifact | sha256 | Size (bytes) |
|---|---|---|
| `backend/contracts/benchmark-manifest.json` | `9f57b42e0910f2a05fc16e0e6473454dfddd849965f8c9ab271c3c6c4aa186e5` | 503,590 |
| `backend/contracts/api-contract-registry.json` | `4568dabf08c7fd6a09594e173c899ab890a38b0a9101ec4f9a29c354f384f7d4` | 1,330,671 |
| `backend/contracts/route-budgets.json` | `c6e39bebf128d6a868aae9ae5cbf557502aea80973685c3d0b8f78b482910228` | 308,519 |
| `backend/contracts/published-contract-terms.json` | `a1d7870cdf76e2e6559d3a26519719b2a177dbc0e4ab052ea66356ab5f7481df` | 33,800 |
| E2E run log artifact | NOT PRESENT — no `.artifacts` directory under `backend/` | — |
| BOLA sweep artifact (`T15_ARTIFACT`) | NOT PRESENT — set per-run, not retained on disk | — |

---

## Gaps blocking C018 — short numbered list

1. **BOLA live cross-tenant sweep result** (§5): `bola-live-cross-tenant.seeded-e2e-spec.ts`
   skipped in the recorded run due to missing `BOLA_SOURCE_ORG_ID`/`BOLA_PROBER_ORG_ID`.
   The result of the in-progress re-run must replace the §5 placeholder before C018 can be ticked.

2. ~~Seed defect commit SHAs (defects 1–3) unattributed.~~ **CLOSED** — all three attributed and
   diff-confirmed against `seed-scratch-e2e.mjs`: `938ad7ef6`, `6dc4050ad`, `f074b1304`.

3. **E2E run log not hashed**: no `.artifacts` directory exists; if the runner produces a log
   artifact it was not retained. The command to produce it: `pnpm test:e2e:seeded 2>&1 | tee run.log`,
   then `sha256sum run.log`.

---

## Not measured

Typecheck and full test suite not run (not a requirement for C018; recorded as not run per
the house standard). BOLA live cross-tenant result not available — see §5. Live row counts
not queried (no database connection in this session); constants read from source instead.
T15 replay not run — opt-in by design. Lint not run.
