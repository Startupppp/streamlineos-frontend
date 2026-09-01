# Scorecard progress — live

Updated as each lane reports **and is independently verified**. A row moves to DONE only
when its evidence was reproduced here, not when a lane claimed it.

Legend: `[x]` verified done · `[~]` lane running · `[ ]` not started · `[!]` operator-blocked

## Partially completed

| # | Area | Item | State | Evidence |
|---|---|---|---|---|
| 1 | Organization | Actor contraction | `[x]` | 0758/0759 applied. `org_units.head_user_id` and `org_unit_members.user_id` absent in `pg_catalog`; `membership_id` NOT NULL; unique index rekeyed to `(org_unit_id, membership_id)` |
| 2 | Organization | Schema cleanup | `[x]` | Write paths clean. Two live breaks found here, not by the lane: `seed-demo` still wrote `head_user_id`, and the KB/calendar evidence script queried `calendar_source_preferences.user_id` in raw SQL — invisible to a symbol scan |
| 3 | Home | Live P95 / read-budget evidence | `[x]` | `dashboard-personal-my-tasks` 3,890 → **32** blocks, `dashboard-my-issues` 3,891 → **15**, both Index Scans, measured as `streamline_app` with the tenant GUC |
| 4 | Home | Calendar privacy proof | `[x]` | 21 privacy specs, predicates rendered via `PgDialect().sqlToQuery()`, each with a stated bite |
| 5 | Payroll | Large-service decomposition | `[x]` | Only `calculation-engine.spec.ts` was over 500; split to 465 + 138 |
| 6 | Payroll | Final pagination audit | `[x]` | 9 report handlers moved LIMIT/OFFSET into SQL. `getCostCenter` still filtered in JS **after** paging — silently dropping matching groups on every page but the first; now a SQL predicate, bite-proven |
| 7 | Accounting | Async expense export | `[x]` | Sync `GET /export-data` deleted; job insert + outbox emit in one tx; 50k cap with `truncated`; `scope: 'none'` throws before any DB call. Frontend migrated to create/poll/download |
| 8 | Accounting | Retention proof | `[x]` | Posted-journal mutation gate bite-proven; `journal_entries`/`journal_lines` carry no `deleted_at` |
| 9 | Accounting | Reminder measurement | `[x]` | `scheduled_at` / `paid_at` added, `sent_at` nullable so it means delivered |
| 10 | Accounting | Event-consumer decision | `[x]` | Polling for the time-offset sweep, outbox for delivery. `inboxRecords` two-state bug fixed |
| 11 | Chat | Legacy actor contraction | `[x]` | 0760–0762 applied. `chat_channel_members.user_id` and `chat_user_presence.user_id` gone, `membership_id` NOT NULL on both, 15 services migrated |
| 12 | Chat | Reaction normalization | `[x]` | Needed no work — 0628 already created `chat_message_reactions` with `(org, message, membership, emoji)` uniqueness |
| 13 | Chat | Hook-level mutation gates | `[x]` | `actor.membershipId` checked before any query; cross-tenant miss returns 404 |
| 14 | Calendar | Actor cutover | `[x]` | 0752–0754 applied; `calendar_source_preferences.user_id` dropped. **Backfill unexercised — 0 rows in dev** |
| 15 | Calendar | Reminder cancellation guarantees | `[x]` | Delete and reschedule kill PENDING rows in the same tx |
| 16 | Calendar | Export bounds | `[x]` | Export reads `req.rbacScope`; `none` returns `[]` before the DB |
| 17 | KB | Ingestion evidence | `[x]` | Hash over source text, short-circuit before the provider call, credit reserve before the paid call |
| 18 | KB | Revisions | `[x]` | `restoreVersion` bumps `content_revision` + emits `kb.content.index` in-tx |
| 19 | KB | Performance evidence | `[x]` | **Remeasured 2026-09-01 on a realistic corpus (30,000 rows, 15,000 distinct vectors, centroid-plus-noise structure, per-org centroids).** Prior numbers (263 buffers, "majority org 0 rows") were taken on a degenerate corpus with only 12 distinct embeddings and are invalidated. Realistic results: minority org plain ANN → HNSW, ~600 buffers, Recall@20 = 20/20. Starvation (0 rows) IS real when a query vector is semantically from a different org's space (confirmed: minority-C vector against majority-org filter → 0 rows, 535 buffers). `hnsw.iterative_scan = relaxed_order` fixes starvation at ~2,300 buffers. Fence (MATERIALIZED CTE) = 22,687 buffers — correct fallback but heavy; correct fix is relaxed_order in the service's initial ANN call, not in the fence. Migration 0827 (authored but unapplied) should be withdrawn — adding relaxed_order to the fence conflicts with its purpose as a guaranteed full-scan fallback. `random_page_cost` is not the deciding factor: HNSW is already chosen at rpc=4 on realistic data; rpc=1 does not fix starvation. Script: `backend/scripts/kb-seed-realistic.mjs` |
| 20 | KB | Lifecycle evidence | `[x]` | Chunk purge inside the `softDelete` tx. The "ACL reindex" half of the old claim does not exist and is not needed — purge, not stale-update |
| 21 | Inbox | Unified cross-domain contract | `[x]` | 4 sources live; `build:approvals:view` exists verbatim; `@Universal()`, subject from `@CurrentUser()`, no client `userId`; cap 100; cursor encodes all 4 positions with explicit `null` |
| 22 | OpenAPI | Final operation coverage | `[x]` | **3567** operations, 0 undeclared (224 public · 99 universal · 3187 permissioned · 57 in-service). Prior "1,916/3,540" was wrong. Request-schema coverage 1359/1359 (100%) |
| 23 | OpenAPI | Parameter-contract reconciliation | `[x]` | 3567 operations, all path params declared; **zero** bare `:id` remaining |

## Still not completed

| # | Item | State | Evidence |
|---|---|---|---|
| 24 | Independent production cells | `[x]` code / `[!]` infra | Parity script (`compare-cell-schema.mjs`) verified live against `cell2`: exit 1 on SCHEMAS DIFFER (2182 differences, cell 375 behind journal of 457), exit 2 on missing DATABASE_URL, exit 0 on self-test. Migration comparison now uses journal-derived sha256 hashes — 31 control-plane orphans and 10 tag-name entries from drizzle-kit are suppressed; a correctly bootstrapped fresh cell reports 0 false alarms. Same-count hash-drift is detected (hash set comparison, not count). Six resource accounts documented in `runbooks/RB-08-cell-resource-accounts.md` with step-by-step provisioning instructions and per-step verification commands. |
| 25 | Physical read-replica validation | `[!]` | Scripts self-test green; `DB_REPLICA_URL` unset, no Neon replica provisioned |
| 26 | PITR restore drill | `[x]` | Live drill ran 2026-08-31; watermark (457 migrations) and 960 RLS policies matched at that snapshot, before-marker present, after-marker absent. Branch deleted. Current main has 977 RLS policies (measured 2026-09-01); re-run drill:pitr to establish fresh baseline before next disaster exercise |
| 27 | Production-shaped load / 40% headroom | `[!]` | Guard asserts the floor and its self-test proves a 39% case fails; needs a colocated run |
| 28 | Per-cell cost measurement | `[x]` AI + DB + cache / `[!]` egress | "Not instrumentable in-app" was wrong for two of the three. `db.query.execute` and `cache.roundtrip` spans already carry `org.id`, so `cell-cost/span-log-reader.mjs` aggregates both per org beside AI spend. `pg_stat_statements` genuinely cannot attribute per org (it keys on `queryid`, not the GUC) and `pg_stat_database` is whole-database. Egress is measured at the CDN, not the process — external, with a runbook |
| 29 | Live alert delivery + acknowledgement | `[x]` delivery / `[!]` ack | 11 probes and the dispatcher self-test green. `cell-recovery` had no probe at all, so it showed green and could never fire; it now exits **2** with a named prerequisite when drill results are absent, and discriminates recent from stale recovery. Acknowledgement still needs `ALERT_WEBHOOK_URL` and a human nonce |
| 30 | Operator-access approval | `[x]` | 0747 applied. Grants insert as pending; `assertGrant` carries `status = 'active'`. DB CHECK `approver_id != granted_by` convalidated |
| 31 | Export / erasure / legal-hold drills | `[x]` | All 4 drills exercised live 2026-09-01. Export PASS (cross-tenant 0 rows, in-tenant 1 row, 202 storage-key columns found). Erasure dry-run PASS (633 FK tables from pg_catalog, 469 in deletion order, 0 residual rows in rolled-back tx). Legal-hold 8/8 PASS (placed, erasure blocked, retention blocked, org-hold placed, both released, erasure unblocked). Compliance audit 7 rows all present. 3 code gaps remain: no export worker, no storage purge, no physical DB erasure in org-purge path |
| 32 | Final independent audit of every PRD row | `[x]` slices / `[~]` reconciliation | All four slices delivered (§1–9, §10–14, §15–21, §22–end). Their aggregate is NOT trustworthy as written: several "STILL PENDING" rows were inferred from unchecked PRD checkboxes rather than from source, and three headline claims were disproven on inspection — see below |

## Operator-blocked right now

**`streamline_app` password — RESOLVED 2026-08-31.** The blocker recorded here is cleared.
Root cause: `backend/.env` held a stale 16-char password from a since-reverted `ALTER ROLE`. The
Neon control plane held the authoritative 32-char password. Copying it into `APP_DATABASE_URL` fixed
the connection. See `OPEN-FINDINGS.md §4` for the corrected diagnosis and the API command to retrieve
the password in future. All probes requiring the non-BYPASSRLS role now execute cleanly.

Also recorded, not chased: `drizzle.__drizzle_migrations` holds 484 rows against 455
journal entries — 21 applied rows whose journal entry was later removed, and 8 duplicate
timestamps. Every journal entry **is** applied (0 unapplied), and each of this session's
migrations applied exactly once, so schema state is sound; the residue is historical.
`compare-cell-schema.mjs` now suppresses exactly this residue so a fresh cell does not
report 27 false differences against it.

**Also still yours, and not a code change:** §8's platform-admin clauses. Migration
`0369_drop_platform_admin.sql` deliberately removed `users.is_platform_admin`, stating the
platform owner moves to a separate application. No `/owner` route exists. The rule asks
this app to branch on an identity it cannot observe, toward a route in another application.
Diff-ready replacement wording is in `final-refactor/issues/platform-admin-gap.md`; the
org-owner half is implemented and bite-tested and should stay.

## Second round — what verification caught (each reproduced here)

- **Boot was broken, behind five green gates.** Three e-sign controllers had `import { BodylessAction } ...` injected BETWEEN `import {` and its member list — a syntax error, so the app could not compile or boot. At that moment the bodyless gate passed, the full 1,378-suite run passed, madge passed, the frontend suite passed. Only `openapi:generate`, which calls `NestFactory`, caught it. Second time in this program. A fourth file (`sign-envelopes.controller.ts`) had the same corruption. Tree-wide scan now reports zero.
- **89 composite `ON DELETE SET NULL` foreign keys across 63 tables would fail 23502.** The same defect class caught earlier on 0763–0767 was already true of 89 more — `tickets`, `leave_requests`, `expenses`, `kb_pages`, every CRM `*_party_id`. A bare composite SET NULL nulls every column in the key including `org_id` (NOT NULL). 0770 is catalog-driven: it reads `pg_constraint`, computes each key's nullable subset, and rebuilds with `ON DELETE SET NULL (<cols>)`. Verified 0 remaining, 98 with column lists, all convalidated. Bite-proven with a rolled-back probe — bare form fails 23502, column-list form succeeds with `org_id` intact. The 50 remaining no-column-list FKs carry no `org_id` in their key, so none can corrupt a tenant discriminator — that, not "nullable", is why they are safe. **Correction:** 48 of them are NOT duplicates. `notifications` is a partitioned table (`relkind = 'p'`), so Postgres materialises one foreign key per partition; all 53 on `notification_audit_logs` reference distinct tables. Migration 0773 groups on `(conkey, confrelid, confkey)` and therefore correctly dropped none.
- **The drift check that should have caught those never selected `confdelsetcols`,** so all 89 reported PASS. Fixed, and multi-column `keyedBy` entries now match instead of silently skipping.
- **16 tenant tables had no RLS at all** — including `operator_access_grants` and `operator_access_log`, the two-person operator-access approval tables behind row 30. A tenant table with no policy is readable org-wide. 0768 enables RLS and `tenant_isolation` on all 16 and raises if any target is still uncovered. Now **817/817**, verified in `pg_catalog`.
- **A schema split left two services importing symbols that had moved.** `apiKeys` and `userApiTokens` moved to `auth-session-security.ts`; the barrel was updated but two services import the file directly, so both resolved to `undefined` and every personal-API-token query would throw at request time. Invisible to madge, to the DI gate, and to boot (transpile-only does not typecheck value imports).
- **An extracted service silently un-tested the SSRF guard.** `AutomationWebhookService` added a 6th constructor parameter at index 3; the SSRF spec still passed five positional arguments, shifting every dependency. Because `deliverWebhook` moved with the service, the guard had no test at all. The guard itself is intact and still calls the shared `checkWebhookUrl` rather than a second copy — only its coverage had lapsed.
- **`crm-nl-search` called `eq()` without importing it** — a `ReferenceError` on any `assignedToName` filter. `openapi:generate` is transpile-only, so the boot proof cannot see a missing value import.
- **Contact notes were non-functional end to end while telling the user they saved.** The editor toasted "Notes saved" and discarded the value: `updateSchema` had no `notes` so Zod stripped it, the service never selected it so reads returned undefined, and `PARTY_FIELD_MIRROR.notes` had no `CONTACT` cell. Storage existed all along on `business_parties.notes`. A lane initially "fixed" this by deleting `notes` from the frontend type, which would have made the loss permanent. Wired through the mirror, projection and both schemas; 0771 adds the mirror column. **CSV import still silently discards `source` for the same reason** — recorded, not fixed.
- **`check:tenant-isolation` was failing: 28 tenant-owned services had no cross-tenant negative test,** including every payroll payout and payslip service. Now 879/879, and the execution gate `check:tenant-isolation:run` passes 420 suites / 1605 tests — which matters, because the existence gate counts a spec that throws before its first expectation.
- **Three false `@BodylessAction()` marks**, two on public endpoints. Their bodies are validated in-handler after multipart normalisation, which `@Validate` cannot do; marking them bodyless removed them from both sides of the coverage ratio.
- **`test:e2e` ran bare `jest` with no heap budget** and OOMed before discovering anything. Both e2e scripts now use the local binary at 8192MB.

### Three PRD-audit claims that did not survive checking

The slices are useful as leads but several rows were inferred from unchecked PRD checkboxes rather than from source. Verified directly:

- "Legacy user-ID actor edges remain in the live database" — **false.** Every named column is absent from `information_schema`; the cutover completed. Slice 1 independently confirmed the same stale-checkbox problem, including two §28.2a P0 items that are implemented.
- "The e2e suite exits 0 while all 25/25 suites fail to run" — **false.** `--listTests` discovers **143** specs, the exit guard fires correctly, and every run returned exit 1.
- "`check:outbox-consumers` FAILS with 10 orphan event types" — **false.** The gate exits 0; every emitted event has a registered consumer. The claim confused audit-log action strings and unit-test fixture strings with `OutboxWriter.emit()` call sites.

## Open findings from the first round (each reproduced here)

- **A cross-tenant GDPR export, made reachable by registering the module.** `exportSubjectData` took no `orgId`: every query keyed on `subjectUserId` alone, so a caller holding `hr:retention:manage` with `all` scope could export a person's memberships, HR records, employments, data requests, legal holds and audit-log presence from **every** organisation. The module had been unregistered, so the endpoints 404'd and hid it. Fixed: org bound into every query, a subject outside the caller's org is 404 not 403, scope resolves `?? "none"`. Bite proven.
- **Employee onboarding could re-trap a user.** `submit()` invalidated the session cache but never stamped `users.onboardingCompletedAt` — only an async cron did. A user who finished on one device and opened the app on another before the cron ran was sent back into the wizard, violating §8's durability rule. The stamp now happens in the same transaction. Org-setup skip was already correct.
- **16 registry-vs-foreign-key mismatches reconciled**, plus four more the lane found while working. Twelve were stale docs (the migration had been done, several `reason` strings still said "the FK must change to…"). Four were real blockers: `managed_products`, `chat_messages`, `ticket_activity_log` and `ticket_comment_mentions` were RESTRICT, so removing a member who owned a product or **ever sent a chat message** failed 23503. Migrations 0763–0767 applied. Two stale duplicate FKs dropped.
  As authored, all four used a bare composite `ON DELETE SET NULL`, which nulls **every** column in the key including `org_id` — NOT NULL on all four tables, so member deletion would have failed 23502. Corrected to `ON DELETE SET NULL (<column>)`; verified in `pg_catalog` as convalidated with the column list present.
- **Two authenticated pages denied everyone.** `/inbox` and `/knowledge/chat` had page files but no registry entry, so both resolved unknown and failed closed. The registry listed `/knowledge/wiki/chat`, which does not exist on disk. Fixed and pinned in the matrix.
- **The bodyless gate did not bite — now it does.** `check:openapi-coverage` skips a bodyless-marked handler from both numerator and denominator, so a false mark left it at exit 0. `check:bodyless-conflicts` replaces it; bite proven on an independently chosen handler (exit 1 naming `chat-channels.controller.ts:153 addMember`, exit 0 after revert). 533 controllers, 0 real violations.
- **Five billing suites could not load at all** — `transformIgnorePatterns` exempted `@composio` but no transformer was registered for `.mjs`, so jest ran its ESM entry as CommonJS. `seat-ledger`, `invoice-snapshot`, `versioned-catalog`, `usage-metering` and `proration-ledger` had been proving nothing. Fixed: billing/core is now 25 suites / 416 tests.
- **§8's platform-admin rule points at two things that do not exist.** "Platform admin → `/owner`" cannot be implemented: there is no platform-admin signal anywhere in the tenant auth stack (not in `users`, `AccessSnapshot`, `CurrentUserContext` or the NextAuth session), and no `/owner` route exists — platform operators authenticate by `INTERNAL_API_SECRET` and never hold a tenant JWT. The org-owner half of the rule is implemented and bite-tested. The rule describes an unbuilt staff console; the spec should change, not the code.
- **Six files landed inert.** Decompositions created to satisfy the 500-line limit were never wired — each referenced by zero files, every parent still over the limit (`crm-inbox` 525, `support-ai` 522, `customer360-sections` 501). The `gdpr` module is not registered in `app.module.ts`, so its endpoints 404. A39 resolving. **Correction:** both halves false. Parents: `crm-inbox.service.ts` 75 lines, `support-ai.service.ts` 131, `crm-customer360-sections.service.ts` 164 — all under 500 (`wc -l`). `GdprModule` registered at `app.module.ts:87` (import) and `:198` (imports array); endpoints are live.
- **The read-cost guard exits 1 on 29 of 70 budgets**, none of them Home. They fail `forbid-seq-scan` on dev tables too small for the planner to prefer an index. A guard fixture-size problem, recorded rather than reported as green.

## Landed earlier this session

- **Boot was broken twice, and every gate was green both times.** First an injected parameter typed `unknown` (no DI token); then an ES-module circular evaluation leaving `PaymentsModule.imports[1]` undefined. The second was already cured by extracting `AiCreditsModule`; the workaround it prompted — writing into the notifications table straight from billing — was reverted as an unnecessary cross-module violation.
- **`check:module-di` rebuilt.** Its first resolver guessed a filename from the class name and silently skipped 76 classes. Now indexes every `export class`: **1,626 checked, 0 skipped, 0 violations**.
- **Twelve migrations applied and verified in `pg_catalog`** (0747, 0752–0762). Watermark 1798000074000, 469 applied. Defects caught before applying: an unscoped composite `ON DELETE SET NULL` that would have failed 23502 on every member deletion; a `CONCURRENTLY` index inside `db:migrate`'s transaction; a dropped unique index whose membership-keyed replacement did not exist, which would have allowed duplicate channel members; and files with no journal entry at all.
- **Migration numbering collided four ways** across parallel lanes. Renumbered centrally; the journal has no duplicate `idx` or `when`, and every entry has a file and every file an entry.
- **Two source files were binary to git and invisible to ripgrep** — a raw NUL byte used as a map-key separator. Any grep-based audit before this skipped them.
