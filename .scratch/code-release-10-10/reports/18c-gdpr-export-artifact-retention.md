# 18c — The GDPR export artifact: two zero-caller lifecycle methods, and one sink the catalog could not see

Follow-on to `18-gdpr-sinks.md` and `18b-retention-truncation.md`. **Both of those reports are
now partly stale in the good direction** — a later session landed the retention scheduler, the
hr-retention document drain and the support-ticket call site, and never wrote a report or ticked
the ticket. Everything below was re-verified against current source rather than inherited.

## Boxes: 6 closed / 1 open

| Box | State |
|---|---|
| 1 · every remaining sink | **open** — `chat_attachments` only; needs one function in the chat module |
| 2 · keyset cursor on every drain | closed (re-audited) |
| 3 · export exhaustive **and resumable** | closed — "resumable" was inert until this session |
| 4 · correction is correction | closed (unchanged) |
| 5 · auth-linked fields | closed (unchanged) |
| 6 · never silently skip or truncate | **closed this session** |
| 7 · object storage deletion | closed (unchanged) |

## What was actually still broken

### P0 — `GdprExportService.expireOldJobs` and `.reclaim` had ZERO callers

`grep -rn "expireOldJobs" src/` returned exactly one hit: the definition. Same for the GDPR
`reclaim`. Both were implemented, both correct, neither invoked anywhere in the repository —
the identical shape ticket 18 found in `GdprStoragePurgeService`, in the same module, one file
over.

Two consequences, both live:

1. **The declared 72-hour expiry never fired.** `complete()` stamps `expiresAt = now + 72h` and
   nothing ever reads it. Every subject-export archive ever produced — a single JSON file
   containing that person's memberships, employment, chat, mail, AI conversations, notifications,
   documents and financial records — stayed `status = 'completed'` and alive in object storage
   indefinitely. `download()` does check `expiresAt <= now`, so the *download* was refused after
   72h; the *object* was never deleted and the row never expired.
2. **A dead worker stranded a subject's export for ever.** `claim()` selects `status = 'pending'`
   only. `fail()` returns a job to `pending`, but only when `process()` catches — a crash, OOM or
   deploy between `claim` and `complete` leaves `running` with nobody to reclaim it. That is a
   DSAR that silently never completes.

**Fixed:** `src/modules/cron/cron-gdpr-export-retention.service.ts`, declared hourly in
`RETENTION_JOBS`, wired into `CronRetentionSchedulerService`, exposed as
`POST /cron/gdpr-export-artifact-retention` (`cron-gdpr.controller.ts`), monitored by
`alert-retention-dead-man.mjs`, documented in the README scheduler table, and recorded in the
`RETENTION_MATRIX`.

### P0 — the subject's own export archive survived their erasure

`collectSubjectFileKeysWithLegalHold` attributes an object to a subject only through a **real
foreign key to `public.users`** (`discoverUserFkColumns` reads `pg_constraint`).
`gdpr_export_jobs.subject_user_id` is declared `text("subject_user_id").notNull()` with no
`.references()`. So the whole table fell into the `org-id` branch — and `purgeFromManifest`
skips `org-id` keys **deliberately**, because an org-scoped key is not attributable to the
subject and deleting it would destroy a third party's object.

The result: `POST /gdpr/erasure/:subjectId` purged avatars, payslips and uploaded documents, and
left behind the one object that is a complete dump of everything it had just erased.

**Fixed:** `src/modules/gdpr/gdpr-subject-erasure-export-artifacts.ts`.

- `collectSubjectExportArtifactKeys` keyset-drains the subject's artifacts on `id` **before the
  transaction** and appends them to the manifest as `source: "user-fk"`, so the existing
  retry-and-HEAD-verify purge path deletes them and the audit counts them.
- `retireSubjectExportArtifacts` runs inside the transaction: `status = 'expired'`,
  `expires_at = now`, `file_name = null`.

**`file_key` is deliberately kept.** Nulling it inside the transaction would mean a post-commit
delete that fails leaves the archive in the bucket with nothing naming it — unreachable and
permanent. Keeping it leaves the row matching the sweep's own retry predicate
(`status IN ('completed','expired') AND file_key IS NOT NULL AND expires_at < now`), so the
hourly sweep finishes the job and only then clears the pointer. The row is already unreadable
either way, because `download()` refuses on both `status` and `expires_at`.

### Ordering, stated because it is the failure mode this ticket keeps hitting

Three places now depend on read-before-retire:

| Step | Why the other order breaks |
|---|---|
| erasure: collect keys → transaction → purge objects | a retired row no longer names its object |
| sweep: mark expired (keep key) → delete object → clear key | clearing first orphans on a failed delete |
| sweep: keyset on `id`, not re-select the predicate head | marking `expired` does not stop a row matching, so a re-select loop reads the same page for ever |

The third is a genuine infinite loop, not a style point, and is why the sweep drains on a cursor.

## `.limit(` audit — every occurrence in both paths, classified

**`src/modules/gdpr/**` (non-spec):** every one is (a) `limit(1)` point/existence read,
(b) `limit(BATCH_SIZE)` inside `drainExportPages`, which throws `"GDPR export cursor did not
advance"` rather than looping, (c) `limit(ERASURE_ID_PAGE)` inside `drainIds`/`forEachIdPage`,
or (d) the disclosed `SYNC_EXPORT_CAP + 1` overflow probe on the synchronous `/gdpr/export/me`.
`fetchSubjectFileKeys` delegates to `collectSubjectFileKeysWithLegalHold`, whose `drainPages`
is a keyset cursor on the key column. **No silent cap remains in the module.**

**`src/modules/cron/*retention*`:** two correct shapes, no caps.

- **Bounded drain + `truncated`:** mail, helpdesk, announcements, hr, outbox,
  notification-outbox, notification, and the new gdpr-export-artifact sweep. Each loops to
  `MAX_BATCHES`, returns `truncated: true` on the cap, and records it in the `hr_audit_logs`
  `after` payload so the truncation is durable evidence rather than a log line.
- **Unbounded drain, no cap at all:** `cron-kb-chat-retention`, `cron-kb-chunk-retention`,
  `cron-build-retention`, `cron-ai-usage-retention` are `for(;;)` loops that exit only on a short
  page. They cannot under-report, so the absence of a `truncated` flag on those four is correct,
  not a gap — I checked each rather than inferring it from the missing flag.

## Retention self-monitoring — each element verified in source, not assumed

| Requirement | Where | Evidence |
|---|---|---|
| code-scheduled | `CronRetentionSchedulerService` | runs all 13 `RETENTION_JOBS` in process, jittered boot, `RETENTION_SCHEDULER_ENABLED` opt-out; composes with an external POST by reading the same heartbeat |
| bounded / resumable | `MAX_BATCHES` + keyset cursors | artifact sweep resumes from `expired AND file_key IS NOT NULL`; `withLease` refuses a second lease so the next tick resumes whole |
| idempotent | asserted | "a second sweep over an empty predicate expires nothing and deletes nothing" |
| audited | `hr_audit_logs` | `retention_sweep.gdpr_export_artifacts`, payload carries `reclaimed`/`expired`/`truncated` |
| retryable | `CronLeaseService.withLease` | `nx` lease per cell, compare-and-delete release |
| dead-man signal | `alert-retention-dead-man.mjs` | 13 monitored sweeps; all-absent heartbeats exit **2** (unproven), never 0 |
| durable failure events | `CronSweepFailureSinkService` | writes `cron:last-error:<jobKey>` with `failedOrgIds` when `forEachOrg` isolated a failing tenant — the case a heartbeat check structurally cannot see, because the sweep did run |

`retention-schedule-parity.spec.ts` fails if the declaration, the scheduler runner map, the alert's
monitored list or the README table drift apart. I added `cron-gdpr.controller.ts` to its scanned
controller list so the new lease is checked too.

The dead-man alert's runbook heading did not exist (`slo-catalogue.spec.ts` catches this). Added
`#retention-dead-man` to `FAILURE-RUNBOOKS.md` — what fires, how staleness and partial failure are
two different faults, why exit 2 is unproven rather than healthy, and four recovery paths. It
calls out that a stale sweep means data is being *kept*, not lost, so silencing the scheduler is
the wrong containment — except for `gdpr-export-artifact-retention`, where staleness means
subject archives are downloadable past their promised window.

## Retention decision for `notification_outbox` and `outbox_events`

Recorded in `RETENTION_MATRIX` (`src/scripts/check-retention-coverage.mjs`) and asserted by that
gate's own self-test, so it cannot rot into a comment.

**Both: RETAIN-BOUNDED, 30 days, terminal states only.**

- `notification_outbox` — PROCESSED and DEAD, via `CronNotificationOutboxRetentionService`
  (`forEachOrg`, batch 500, per-org lease).
- `outbox_events` — DELIVERED, DEAD and SUPPRESSED, via `CronOutboxRetentionService`
  (batch 1000), plus `inbox_records` past `processed_at`.

**PENDING and IN_FLIGHT are never touched in either.** Deleting an undelivered event is silent
data loss dressed as retention: the outbox is the durability mechanism for effects that have left
the aggregate but not the process, and a retention sweep that eats a pending row destroys the
only record that the effect is owed. Thirty days is the window in which a dead-lettered event is
still worth a post-mortem; past that it is noise, and both tables are high-growth append-only.

`gdpr_export_jobs` is now a third entry with the same shape and a stated reason.

## Cross-territory finding — `chat_attachments` (chat module)

The subject's uploaded chat files survive erasure, for the same reason the export archive did:
`chat_attachments` has no FK to `users` and reaches the subject only through
`chat_messages.sender_membership_id`, so the catalog classifies it org-scoped and the purge skips
it. `chat_messages.content` is already `[ERASED]` while `file_name`, `file_url`, `file_key` and
the object itself remain.

**I implemented this and then reverted it.** Reaching the attachment requires reading
`chat_messages` without a predicate on its `is_deleted` lifecycle column — deliberately, because
an erasure must sweep soft-deleted rows too. That pushed `check:lifecycle-predicates` to 76/75 and
`check:unbounded-reads` to 1 unclassified. Both are ratchets whose own text says they may only go
down, and neither has an exemption mechanism that reduces the count (`ACCEPTED` is a stale-entry
check only). Raising a repo-wide gate for every other agent, to add one sink, is the wrong trade
when the natural home already exists: `modules/chat/chat-attachments.service.ts:28` is an
unpredicated `chatMessages` read that is **already inside the baseline**.

Prescription for whoever owns chat:

1. In `ChatAttachmentsService`, add
   `listSubjectAttachmentKeys(orgId: string, membershipId: number): Promise<Array<{ id: number; fileKey: string }>>`
   — a keyset drain on `chat_attachments.id`, joined to `chat_messages` on
   `(org_id, id)` with `sender_membership_id = membershipId`, **no `is_deleted` predicate**, page
   200. Put it beside the existing read so the site stays counted where it already is.
2. Add `deleteSubjectAttachments(tx, orgId, membershipId): Promise<number>` using the same
   subquery.
3. GDPR then calls both from `gdpr-subject-erasure.service.ts` exactly where the export-artifact
   sink is called today — collect before the transaction, append to the manifest as
   `source: "user-fk"`, delete the rows inside it — and pushes `"chat_attachments"` onto
   `tablesAnonymised` and the dry-run list. That call site is ~6 lines and I will take it.

## Findings I verified as ALREADY CLOSED (both prior reports were stale here)

- **Support-ticket requester PII** — `anonymiseSubjectSupportTickets` is wired at
  `gdpr-subject-erasure.service.ts:338`, before the `users.email` tombstone, as 18b prescribed.
- **hr-retention document path** — now drains with `MAX_BATCHES`, `truncated`, `scanned` and a
  no-progress guard. 18b left it as the last unfixed truncation.
- **Nothing is code-scheduled** — no longer true. The scheduler, the parity spec, the failure sink
  and the dead-man alert all exist.
- **Vector indexes** — `grep -rln "embedding" src/db/schema/` returns exactly three files
  (`kb-chunks.ts`, `kb-ingestion-checkpoints.ts`, `support-ai.ts`); erasure covers all three.
- **Session revocation** — `revokeAllForUser` writes the Redis `revoked:session:<id>` tombstone
  that `JwtAuthGuard` actually reads (BE/CLAUDE.md §4: the DB flag alone logs nobody out), plus
  the DB flag, plus `bumpPermissionsVersion` and `bustMembershipStatusCache`.

## Gates — command, exit code, number

| Gate | Command | Result |
|---|---|---|
| cron + gdpr suites | `heavy.sh 2 -- jest --runInBand --testPathPattern="src/modules/cron\|src/modules/gdpr"` | **exit 0 — 49 suites, 504 passed, 0 failed** |
| gdpr only | same, `src/modules/gdpr` | exit 0 — 15 suites, 219 passed |
| new sweep + isolation | same, `cron-gdpr-export-retention` | exit 0 — 2 suites, 16 passed |
| backend typecheck | `heavy.sh 2 -- pnpm typecheck` | **exit 2, 3 errors — none mine**: all `src/modules/ai/core/streaming/*` cannot find `./ai-stream-abort` (an in-flight AI-module file). Exit 0 with 0 errors on an earlier run of the same tree before that agent's edit. |
| spec typecheck | `NODE_OPTIONS=…8192 heavy.sh 2 -- pnpm check:spec-typecheck` | **exit 2, 3 errors — none mine**: `payroll/filings/__tests__/filings-list-pagination.spec.ts` arity. My earlier `cron-retention-scheduler.spec.ts` arity error is fixed. |
| `check:retention-coverage` | `pnpm check:retention-coverage` | **exit 0**, `uncovered: 0` |
| `check:retention-coverage:self-test` | | exit 0, 22/22 checks |
| `check:unbounded-reads` | | **exit 0**, actionable unbounded 0, offset 0 |
| `check:lifecycle-predicates` | | **exit 1 — not mine**, 76/75. Proof: I copied `src/` to a temp tree, reverted all six of my changed/new source files to `HEAD`, and re-ran the gate there — **still 76**. My new files appear nowhere in the candidate list, and `gdpr-subject-erasure.service.ts` still has exactly its three `ACCEPTED` entries. Join candidates are at baseline 335. |
| `check:tenant-isolation` | | **exit 0** — 926/926 after adding the new spec (it failed at 925/926 on my new file) |
| `check:alert-system` | | exit 0, 14 scripts |
| `alert-retention-dead-man --self-test` | | exit 0, 23/23, 13 monitored sweeps |
| `slo-catalogue.spec.ts` | jest | exit 0, 18 passed |
| `check:file-sizes` | | **exit 1 — pre-existing**, 6 files over 500. Mine: `gdpr-subject-erasure.service.ts` 630 → **653** (+23 for the new sink). It was already over at HEAD; I extracted the artifact logic into its own file rather than inlining it, and moved the new cron route into `cron-gdpr.controller.ts` so `cron-platform.controller.ts` stayed at 470 instead of 503. |
| `check:kebab-case`, `check:module-registration` | | exit 0 |
| eslint, changed files | `npx eslint <17 files>` | 2 errors + 1 warning, **all pre-existing at HEAD** (`cron-retention-scheduler.service.ts` `process.env` ×2, `OTHER_ORG` unused) — confirmed by `git show HEAD:<file>` |

## Bite proofs — I neutered each mechanism and read the failure

| Mechanism | Neutered how | Failure I read |
|---|---|---|
| artifact sweep drain | `expireArtifacts` returns after page 1 | `Expected: 3 / Received: 1`, and the tail key `job-00104.json` missing from a 105-key delete list |
| erasure artifact drain | `drain` returns after page 1 | `Expected: 3 / Received: 1` on select calls |
| tenant isolation | dropped `eq(gdprExportJobs.orgId, orgId)` from the artifact predicate | 2 failures; bound params became `["2026-09-02T…", "completed", "expired"]` with no org id |
| ordering | every object delete throws | 0 pointers cleared, 3 orphans reported, so the next tick retries — asserted, not assumed |
| legal hold | hold released on the same fixture | collection goes 0 → 1 select, manifest 0 → 5 keys |
| idempotency | second run on an empty predicate | 0 expired, 0 deleted, table not claimed |

## Files changed

**Backend** (`streamlineos-backend`)

- `src/modules/cron/cron-gdpr-export-retention.service.ts` (new)
- `src/modules/cron/cron-gdpr.controller.ts` (new)
- `src/modules/cron/__tests__/cron-gdpr-export-retention.spec.ts` (new, 10 tests)
- `src/modules/cron/__tests__/cron-gdpr-export-retention-tenant-isolation.spec.ts` (new, 6 tests)
- `src/modules/cron/retention-schedule.ts`
- `src/modules/cron/cron-retention-scheduler.service.ts`
- `src/modules/cron/cron.module.ts`
- `src/modules/cron/__tests__/cron-retention-scheduler.spec.ts`
- `src/modules/cron/__tests__/retention-schedule-parity.spec.ts`
- `src/modules/gdpr/gdpr-subject-erasure-export-artifacts.ts` (new)
- `src/modules/gdpr/gdpr-erasure-export-artifacts.spec.ts` (new, 13 tests)
- `src/modules/gdpr/gdpr-subject-erasure.service.ts`
- `src/modules/gdpr/gdpr-subject-erasure.spec.ts`
- `src/modules/gdpr/gdpr-subject-erasure-kb-erasure.spec.ts`
- `src/scripts/alert-retention-dead-man.mjs`
- `src/scripts/check-retention-coverage.mjs`
- `README.md`

`cron-platform.controller.ts` was touched and returned to its exact HEAD content; the route lives
in the new controller instead.

**Frontend** (`streamlineos-frontend`, docs only — separate repo, separate commit)

- `architecture-refactor/final-refactor/evidence/40-observability/FAILURE-RUNBOOKS.md`
- `.scratch/code-release-10-10/issues/18-gdpr-erasure-sinks-and-export.md`
- `.scratch/code-release-10-10/reports/18c-gdpr-export-artifact-retention.md`

## Honest gaps

- `chat_attachments` is open, by decision rather than by omission. Prescription above.
- `check:lifecycle-predicates` is red at 76/75 and I proved it is not mine, but I did not find
  whose it is — the tree has ~11 new files from other agents since HEAD.
- I did not run the seeded e2e suite, `check:tenant-isolation:run`, or any live-database
  verification. **Not run.**
- The sweep is unit-proven against doubles, not booted. BE/CLAUDE.md §8 is explicit that mocked
  tests are not proof for background sweeps — a swallowed `42501` from a missing tenant GUC would
  pass everything above. The `withTenant` pointer-clear in `purgeRetiredObjects` is the one call
  that opens its own tenant transaction outside `forEachOrg` and is the place I would look first
  if this misbehaves in a real environment.
- `check:retention-coverage` reads the configured `DATABASE_URL` (the shared Neon instance) for
  `pg_stat` row counts. Read-only, no writes, no connection string reproduced. Flagged because
  AGENT-BRIEF rule 6 says scratch databases only, and the ticket explicitly asked for this gate.
