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
| 19 | KB | Performance evidence | `[x]` | Fence 263 buffers both orgs; plain ANN on the majority org returns **0 rows** — RLS post-filters all 20 neighbours away |
| 20 | KB | Lifecycle evidence | `[x]` | Chunk purge inside the `softDelete` tx. The "ACL reindex" half of the old claim does not exist and is not needed — purge, not stale-update |
| 21 | Inbox | Unified cross-domain contract | `[x]` | 4 sources live; `build:approvals:view` exists verbatim; `@Universal()`, subject from `@CurrentUser()`, no client `userId`; cap 100; cursor encodes all 4 positions with explicit `null` |
| 22 | OpenAPI | Final operation coverage | `[x]` numbers / `[~]` gate | **3562** operations, 0 undeclared (211 public · 98 universal · 3190 permissioned · 54 in-service). Prior "1,916/3,540" was wrong. Request-schema coverage 1335/1726 = 77% |
| 23 | OpenAPI | Parameter-contract reconciliation | `[x]` | 3562 operations, all path params declared; **zero** bare `:id` remaining |

## Still not completed

| # | Item | State | Evidence |
|---|---|---|---|
| 24 | Independent production cells | `[x]` code / `[!]` infra | Schema-parity compares `drizzle.__drizzle_migrations` and exits 1 on a zero-migration cell. Six resource accounts stay operator |
| 25 | Physical read-replica validation | `[!]` | Scripts self-test green; `DB_REPLICA_URL` unset, no Neon replica provisioned |
| 26 | PITR restore drill | `[x]` | Live drill ran; watermark and 960 RLS policies matched, before-marker present, after-marker absent. Branch deleted |
| 27 | Production-shaped load / 40% headroom | `[!]` | Guard asserts the floor and its self-test proves a 39% case fails; needs a colocated run |
| 28 | Per-cell cost measurement | `[x]` AI / `[!]` rest | AI spend per org verified live. DB time, Redis and egress not instrumentable in-app |
| 29 | Live alert delivery + acknowledgement | `[x]` delivery / `[!]` ack | 11 probes and the dispatcher self-test green. `cell-recovery` had no probe at all, so it showed green and could never fire; it now exits **2** with a named prerequisite when drill results are absent, and discriminates recent from stale recovery. Acknowledgement still needs `ALERT_WEBHOOK_URL` and a human nonce |
| 30 | Operator-access approval | `[x]` | 0747 applied. Grants insert as pending; `assertGrant` carries `status = 'active'`. DB CHECK `approver_id != granted_by` convalidated |
| 31 | Export / erasure / legal-hold drills | `[x]` | Erasure enumerates FK tables from `pg_constraint` at runtime and dry-runs in a rolled-back tx. The retention sweep now exists: per-org via `forEachOrg` in its own transaction, batched, legal-hold subjects excluded in the SQL predicate rather than per row, bite-proven by removing that guard. Payroll and document classes are skipped with a warning rather than half-purged |
| 32 | Final independent audit of every PRD row | `[~]` | Two of four slices in; A20 and A22 still running |

## Operator-blocked right now

**The `streamline_app` role no longer authenticates** — `28P01 password authentication
failed`. It worked earlier in this session (the read-cost guard hard-requires
`APP_DATABASE_URL` and printed real block counts), so it broke mid-session. No script in
this repo issues `ALTER ROLE`, and on Neon a password set that way does not stick anyway.

Consequence: every proof that must run as the non-BYPASSRLS role is currently
unreproducible — `db:check-build-reads` exits 1 at connect, and
`src/degradation/search-index.spec.ts` fails. Benchmarks run as the owner prove nothing,
because the owner has BYPASSRLS.

Runbook: reset the `streamline_app` password in the Neon console (not via `ALTER ROLE`),
update `APP_DATABASE_URL` in `backend/.env`, then re-run `pnpm db:check-build-reads`,
`pnpm verify:membership-revocation` and `src/degradation/search-index.spec.ts`. Until then
the dashboard read-budget numbers below stand as previously measured but cannot be
re-verified.

`verify:membership-revocation` is blocked by the same failure, so its post-fix INVENTORY
table has **not** been re-measured. The foreign-key state it would report was instead
verified directly against `pg_constraint`, which is the stronger evidence; the end-to-end
removal drill is what remains unrun.

Also recorded, not chased: `drizzle.__drizzle_migrations` holds 484 rows against 455
journal entries — 21 applied rows whose journal entry was later removed, and 8 duplicate
timestamps. Every journal entry **is** applied (0 unapplied), and each of this session's
migrations applied exactly once, so schema state is sound; the residue is historical.

## Open findings this session (each reproduced here)

- **A cross-tenant GDPR export, made reachable by registering the module.** `exportSubjectData` took no `orgId`: every query keyed on `subjectUserId` alone, so a caller holding `hr:retention:manage` with `all` scope could export a person's memberships, HR records, employments, data requests, legal holds and audit-log presence from **every** organisation. The module had been unregistered, so the endpoints 404'd and hid it. Fixed: org bound into every query, a subject outside the caller's org is 404 not 403, scope resolves `?? "none"`. Bite proven.
- **Employee onboarding could re-trap a user.** `submit()` invalidated the session cache but never stamped `users.onboardingCompletedAt` — only an async cron did. A user who finished on one device and opened the app on another before the cron ran was sent back into the wizard, violating §8's durability rule. The stamp now happens in the same transaction. Org-setup skip was already correct.
- **16 registry-vs-foreign-key mismatches reconciled**, plus four more the lane found while working. Twelve were stale docs (the migration had been done, several `reason` strings still said "the FK must change to…"). Four were real blockers: `managed_products`, `chat_messages`, `ticket_activity_log` and `ticket_comment_mentions` were RESTRICT, so removing a member who owned a product or **ever sent a chat message** failed 23503. Migrations 0763–0767 applied. Two stale duplicate FKs dropped.
  As authored, all four used a bare composite `ON DELETE SET NULL`, which nulls **every** column in the key including `org_id` — NOT NULL on all four tables, so member deletion would have failed 23502. Corrected to `ON DELETE SET NULL (<column>)`; verified in `pg_catalog` as convalidated with the column list present.
- **Two authenticated pages denied everyone.** `/inbox` and `/knowledge/chat` had page files but no registry entry, so both resolved unknown and failed closed. The registry listed `/knowledge/wiki/chat`, which does not exist on disk. Fixed and pinned in the matrix.
- **The bodyless gate did not bite — now it does.** `check:openapi-coverage` skips a bodyless-marked handler from both numerator and denominator, so a false mark left it at exit 0. `check:bodyless-conflicts` replaces it; bite proven on an independently chosen handler (exit 1 naming `chat-channels.controller.ts:153 addMember`, exit 0 after revert). 533 controllers, 0 real violations.
- **Five billing suites could not load at all** — `transformIgnorePatterns` exempted `@composio` but no transformer was registered for `.mjs`, so jest ran its ESM entry as CommonJS. `seat-ledger`, `invoice-snapshot`, `versioned-catalog`, `usage-metering` and `proration-ledger` had been proving nothing. Fixed: billing/core is now 25 suites / 416 tests.
- **§8's platform-admin rule points at two things that do not exist.** "Platform admin → `/owner`" cannot be implemented: there is no platform-admin signal anywhere in the tenant auth stack (not in `users`, `AccessSnapshot`, `CurrentUserContext` or the NextAuth session), and no `/owner` route exists — platform operators authenticate by `INTERNAL_API_SECRET` and never hold a tenant JWT. The org-owner half of the rule is implemented and bite-tested. The rule describes an unbuilt staff console; the spec should change, not the code.
- **Six files landed inert.** Decompositions created to satisfy the 500-line limit were never wired — each referenced by zero files, every parent still over the limit (`crm-inbox` 525, `support-ai` 522, `customer360-sections` 501). The `gdpr` module is not registered in `app.module.ts`, so its endpoints 404. A39 resolving.
- **The read-cost guard exits 1 on 29 of 70 budgets**, none of them Home. They fail `forbid-seq-scan` on dev tables too small for the planner to prefer an index. A guard fixture-size problem, recorded rather than reported as green.

## Landed earlier this session

- **Boot was broken twice, and every gate was green both times.** First an injected parameter typed `unknown` (no DI token); then an ES-module circular evaluation leaving `PaymentsModule.imports[1]` undefined. The second was already cured by extracting `AiCreditsModule`; the workaround it prompted — writing into the notifications table straight from billing — was reverted as an unnecessary cross-module violation.
- **`check:module-di` rebuilt.** Its first resolver guessed a filename from the class name and silently skipped 76 classes. Now indexes every `export class`: **1,626 checked, 0 skipped, 0 violations**.
- **Twelve migrations applied and verified in `pg_catalog`** (0747, 0752–0762). Watermark 1798000074000, 469 applied. Defects caught before applying: an unscoped composite `ON DELETE SET NULL` that would have failed 23502 on every member deletion; a `CONCURRENTLY` index inside `db:migrate`'s transaction; a dropped unique index whose membership-keyed replacement did not exist, which would have allowed duplicate channel members; and files with no journal entry at all.
- **Migration numbering collided four ways** across parallel lanes. Renumbered centrally; the journal has no duplicate `idx` or `when`, and every entry has a file and every file an entry.
- **Two source files were binary to git and invisible to ripgrep** — a raw NUL byte used as a map-key separator. Any grep-based audit before this skipped them.
