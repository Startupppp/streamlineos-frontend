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

### bola-live-cross-tenant — RAN 2026-09-05 · zero disclosures · FAILS ITS OWN COVERAGE FLOOR

File: `test/security/bola/bola-live-cross-tenant.seeded-e2e-spec.ts`
Artifact: `.artifacts/bola-live-cross-tenant.json`, `generatedAt 2026-09-05T16:25:31.137Z`
Source org `aaaaaaaa-…0001` → prober org `aaaaaaaa-…0002`, database `scratch_e2e`.

| Verdict | Count |
|---|---|
| PASS | 122 |
| UNPROBEABLE | 48 |
| NO-404 | 6 |
| **Total outcomes** | **176** |
| **Cross-tenant disclosures** | **0** |

**Security result: clean.** No probe returned another organisation's data. Every one of the six
NO-404 outcomes carries the detail "an id belonging to no organization answers 200 too, so the
route never resolves the path object — nothing was disclosed, but the required 404 is absent",
and all six are already pinned in `test/security/bola/live/known-no-404.json` (23 entries), so
the assertion at line 884 passes. They are `/crm/blueprints/:blueprintId/transitions`,
`/crm/campaigns/:campaignId/leads`, `/crm/consent/contacts/:contactId`,
`/crm/customer-360/company/:companyId/timeline`, `/deals/:dealId/activities` and
`/deals/:dealId/transitions` — all CRM-domain, which C157 excludes from this release.

**Suite exit: 1 — and the reason is coverage, not a finding.** The only failing assertion is
line 822, `expect(scored.length).toBeGreaterThanOrEqual(MIN_SCORED)`: `scored` is outcomes minus
UNPROBEABLE, so **128 against a floor of 200**. That floor is an anti-vacuity guard — it exists so
a thin sweep cannot read as a pass, and it is doing its job here.

**Cause is run ordering, and it is mine.** The sweep ran against a database seeded only by
`seed-scratch-e2e.mjs`, which creates two organisations. `harnessProofs.fixtureSeeding` reports
`tablesNeeded 315, tablesCreated 314, routesBlocked 1235` — most routes had no borrowable object,
so they scored UNPROBEABLE. `seed-perf-scratch.mjs` is the layer that fills the CRM, inventory,
finance and Build product tables those fixtures need, and it had not been run yet.

**Therefore C018 is NOT closed on that run.** Re-running the sweep after the four-tenant perf seed
is required, and the criterion stays open until `scored >= 200` with disclosures still at zero.
Recording a zero-disclosure result over 128 scored routes as a pass would be exactly the vacuity
the floor was written to prevent.

### Re-run over the four-tenant dataset — floor met, still zero disclosures

Artifact: `.artifacts/bola-live-cross-tenant-rerun.json`, `generatedAt 2026-09-05T20:02:17.007Z`.
Same source/prober orgs, same database, after `seed-perf-scratch.mjs` filled 416 tables across
four tenants.

| Metric | First sweep | Re-run (final artifact state) |
|---|---|---|
| Outcomes | 176 | **653** |
| Scored (outcomes − UNPROBEABLE) | 128 | **415** |
| `MIN_SCORED` floor | 200 — **not met** | 200 — **met** |
| PASS | 122 | 403 |
| NO-404 | 6 | 12 |
| Unpinned NO-404 | 0 | **0** |
| Cross-tenant disclosures | 0 | **0** |

All 12 NO-404 outcomes appear verbatim in `test/security/bola/live/known-no-404.json`, so the
assertion at line 884 is satisfied; the four new ones relative to the first sweep are
`/inventory/warehouses/:warehouseId/locations`, `/leads/:leadId/activities`,
`/leads/:leadId/timeline`, `/public/kb/widget/:orgId`, `/public/kb/widget/:orgId/script` and
`/public/org/:orgId` — the public ones are `@Public()` by design and the rest are CRM/Inventory,
both excluded by C157. This confirms the earlier diagnosis: the first sweep's failure was a
fixture-coverage artifact of seeding only two organisations, not a security result.

**Status: the security question is answered — no route disclosed another organisation's data
across 415 scored probes — but the suite never printed a verdict.** Three runs were attempted;
none completed:

| Attempt | Artifact | Outcome |
|---|---|---|
| 1 (two-tenant seed) | `bola-live-cross-tenant.json` | exit 1 — scored 128 < floor 200 |
| 2 (four-tenant seed) | `bola-live-cross-tenant-rerun.json` | stopped 01:36, floor met, no verdict |
| 3 (clean, for an exit code) | none written | stopped 01:41, ~2 min after boot |

Attempts 2 and 3 were stopped externally, not by the harness and not by a failure. Both
assertions are satisfied by attempt 2's artifact contents, and that is the honest limit of this
evidence: **a killed run is not a passing run.**

**C018 remains NOT ticked.** It needs exactly one uninterrupted completion of this spec against
the four-tenant dataset. Everything else the criterion asks for is in place: the database is
disposable and at head (695/695 after the AR-02 journal repair), the fixtures are
production-shaped across four tenants, all 15 named domains are covered, and the module suite
passed 27/27 with 0 failures. The one remaining artifact is an exit code.

### The sweep found one real in-scope defect, and it is fixed

Attempt 4 (`.artifacts/bola-live-cross-tenant-clean.json`, 853 outcomes / 538 scored) surfaced
the **only unpinned finding across every run**, and it was in-scope — HRMS is one of the fifteen
named domains:

    NO-404   PATCH /hr/performance/pip/:pipId   [PerformanceController.updatePip]
    controlStatus 200 · probeStatus 200 · absentStatus 200

`PerformancePipsService.updatePip` ran a correctly tenant-scoped `UPDATE` — `org_id` was already
bound, so no cross-tenant write was ever possible — but it never checked whether the statement
matched a row and returned `{ success: true }` unconditionally. An id belonging to another
organisation, or to no organisation at all, updated zero rows and answered 200. Nothing leaked;
the caller was simply told a write had applied when it had not, and the 404 the cross-tenant
contract requires was absent.

Fixed in `b401442ed` using the same `.returning({ id })` then `NotFoundException` pattern as
`hr-webhooks.service.ts`. `tsc --noEmit` exit 0.

### Attempt 5 — after the fix

Artifact `.artifacts/bola-live-cross-tenant-final.json`, run against the four-tenant dataset with
the fix in place:

Final artifact state, `generatedAt 2026-09-06T01:39:14.339Z`:

| Metric | Value |
|---|---|
| Outcomes | **903** |
| Scored (outcomes − UNPROBEABLE) | **569** against the `MIN_SCORED` floor of 200 — **met** |
| PASS | 556 |
| NO-404 | 12 — **all 12 pinned** |
| INCONCLUSIVE | 1 — pinned (`PATCH /leads/:leadId/status -> 409`) |
| **Unpinned findings** | **0** |
| Cross-tenant disclosures | **0** |
| **`PATCH /hr/performance/pip/:pipId`** | **PASS** |

That last row is the point. The route that was the only unpinned finding across every prior
sweep is now scored PASS by the same probe that failed it, so the fix is confirmed by
measurement rather than by inspection. This run is also the widest of the five — 569 scored
against a floor of 200.

Both assertions that failed the first sweep — line 822's `scored >= MIN_SCORED` and line 884's
empty unpinned-NO-404 set — are satisfied.

### Why this is still not ticked

Five runs, roughly 2,700 probes, and no exit code. Runs 2, 3 and 5 were each stopped externally
while still sweeping — not by a failure, not by the harness, and not by me. The security
question is answered as thoroughly as this spec can answer it, and the one real defect it
existed to find was found and fixed. What remains is purely procedural: one uninterrupted
execution that reaches Jest's assertions.

C018 should be ticked on the first such run, and not before. A killed run is not a passing run,
however good its artifact looks.

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
