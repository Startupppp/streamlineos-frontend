# Knowledge Base — Requirement Ledger

**Status:** execution authority. This file is the resume point after any context compaction.

**Opened:** 2026-09-23
**Branch:** `feat/knowledge-base` (off `main`)
**Governing prompt:** [`MASTER-IMPLEMENTATION-PROMPT.md`](MASTER-IMPLEMENTATION-PROMPT.md)

## How to resume

1. Read this file top to bottom.
2. `git status` and `git diff main...HEAD --stat`.
3. Run the smallest verification for the first slice marked `IN PROGRESS`.
4. Continue from the first unchecked requirement in that slice.
5. Update the slice status table and the slice's evidence block as each item closes.

Status vocabulary: `NOT STARTED` · `IN PROGRESS` · `BLOCKED` · `VERIFIED` (code + tests + evidence all landed).

## Execution environment — decided facts

These were resolved at open and constrain every slice. Re-verify before trusting.

| Fact | Value | Consequence |
|---|---|---|
| `backend/.env` DATABASE_URL | live production Aurora (`streamlineos-instance-1...ap-south-1.rds.amazonaws.com`) | Same host as `.env.production`. There is no non-production Postgres. |
| Local Postgres on 5432 | absent | Any DB-backed test or migration runs against production. |
| Migration/data-loss target | **production, authorized by the repo owner** on 2026-09-23 | Destructive KB-scoped operations are permitted. |
| Destructive ordering rule | contraction runs **last** | Additive/expansion migrations land per-slice; drops, truncates, and reseeds run only in S21 after cutover gates, with a pre-verified snapshot and resolved exact table targets. |
| RDS PITR window | 1 day, unencrypted | Snapshot before any contraction step; record the snapshot id in S21 evidence. |
| **Applying any migration** | **BLOCKED — external credential** | The cluster uses **IAM auth**: `db:apply-one` reaches it but fails `PAM authentication failed for user "streamline_admin"`. There is no AWS CLI on this machine, no IAM-token tooling in the repo, and no credentials. Everything DB-dependent is blocked behind this. |
| Two independent prod guards | `ALLOW_PRODUCTION_MIGRATION=1` (runner), `APPLY_ONE_ALLOW_REMOTE=1` (single-apply) | Both must be acknowledged deliberately. Do not remove or weaken either. |
| Never use `db:migrate` here | it applies **all** pending migrations | The production ledger is reconciled-not-replayed (47 rows vs 921 journal entries), so "pending" is not what it looks like. Apply one tag at a time with `db:apply-one --tag=`. |
| Concurrent session in this tree | confirmed | Commit `a5ac2c529` landed on `feat/knowledge-base` without this session making it, `inbox-toolbar.tsx` was modified externally, and source files are being reformatted to ~80 columns on disk. Re-read before editing; never `stash`/`restore`/`reset`. |
| `backend/` is a **separate git repo** | root `.gitignore` hides it | A root branch does not branch the backend. Both repos now carry `feat/knowledge-base`. |
| CI | GitHub Actions billing lapsed | A red workflow is not evidence of a defect. All gates run locally; record the exact command and output. |
| Browser verification | no capture stack (playwright env/token, pgtools, localstack deleted) | Layout/state verification goes through the dev-only `/design-system` gallery plus Playwright; full-stack route verification needs the app booted against the production backend and is recorded as such. |

## Canonical end state (from the prompt)

- `kb_pages` is the editable organization/project system of record.
- `kb_articles` survives only for the bounded help-centre cutover, then its runtime paths are removed.
- Project wiki routes are adapters over the same content/authorization/list/search/version/index modules.
- Explicit grants implement **Shared with me**; ownership implements **My pages**.
- Review overdue is derived (`pending && dueAt < now`), never persisted.
- Every collection is bounded and cursor-based unless the docs define a small fixed cap (recents 20, favorites 50, Quick find 20).
- Search and Ask share one permission-safe retrieval projection.

## Slice index

| # | Slice | Phase | Priority | Status |
|---:|---|---|---|---|
| S01 | `KnowledgeAuthorization` + `kb_page_grants` schema | 1 | P0 | IN PROGRESS |
| S02 | My pages — server-side ownership | 1 | P0 | IN PROGRESS — backend landed |
| S03 | Shared with me — explicit grants | 1 | P0 | IN PROGRESS — backend landed |
| S04 | `KnowledgeCollection` + canonical `GET /kb/pages` + cursor codec | 2 | P0 | IN PROGRESS |
| S05 | Full Search — `/knowledge/wiki/search` | 2 | P0 | NOT STARTED |
| S06 | Wiki Home rebuilt on list projection | 2 | P0 | NOT STARTED |
| S07 | Spaces list + detail, server counts, archive/restore, lazy tree | 2/3 | P0 | NOT STARTED |
| S08 | Page document — trust header, action model, offline/conflict | 3 | P0 | NOT STARTED |
| S09 | History — diff + append-only restore | 3 | P0 | NOT STARTED |
| S10 | Reviews — derived overdue, URL filters, bulk decide | 4 | P0/P1 | IN PROGRESS |
| S11 | Trash — cursor, bulk restore/purge, resumable purge ledger | 3 | P0 | IN PROGRESS |
| S12 | Templates — URL state, preview, saved-template lifecycle | 3 | P1 | NOT STARTED |
| S13 | Import & Export — validation, dry-run, resumable jobs | 3 | P0 | NOT STARTED |
| S14 | Analytics — permission-safe, minimum cohort, drill-down | 4 | P1 | NOT STARTED |
| S15 | Content Health — `/knowledge/wiki/manage` | 4 | P1 | NOT STARTED |
| S16 | Ask KB — scope, citations, fallback, budgets | 1/4 | P0/P1 | NOT STARTED |
| S17 | Public page — `/wiki/[shareToken]` | 3 | P0 | NOT STARTED |
| S18 | Project wiki adapters | 2 | P0 | NOT STARTED |
| S19 | Research Briefs moved under Knowledge | 4 | P1 | NOT STARTED |
| S20 | `/ask` removal, redirects, aliases | 6 | P0 | NOT STARTED |
| S21 | `kb_articles` cutover + destructive contraction | 6 | P1 | NOT STARTED |
| S22 | Async scale — queue lanes, admission, SLOs, DR drills | 5 | P0/P1 | NOT STARTED |
| S23 | Observability — dashboards, alerts, cost budgets, runbooks | 0/5 | P0 | NOT STARTED |

## Second pass — 2026-09-23

Both repos are on `main`. **A concurrent session is committing this work as it lands**, so `main` moves under you and `git show main:<file>` is not a pre-session baseline. The pre-session commit is `4d1ab519a`.

### Migration numbering repaired

`1165_kb_page_grants` collided with another session's `1165_build_automation_run_history`; `check:migration-discipline` reported `[dup-prefix]`. Renamed to **`1168_kb_page_grants`** — file, rollback and the journal `tag` together, because the runner resolves the file as `migrations/${tag}.sql`. Safe: the migration is unapplied, and `drizzle.__drizzle_migrations` has no tag column anyway.

Two further defects in that same migration, found while renaming and now fixed:

1. `fk_kb_page_grants_org_granted_by_membership` carried a **bare** `ON DELETE SET NULL` on a composite key. On a composite FK the bare form nulls *every* column including `org_id`, which is `NOT NULL`, so the parent `DELETE` aborts on the child table. Now `ON DELETE SET NULL ("granted_by_membership_id")`.
2. The precondition `RAISE EXCEPTION` strings still said `1165`.

**Still red and not ours:** three `[no-journal]` violations — `1165_build_automation_run_history`, `1166_build_incident_postmortem_fields`, `1167_invoices_deal_id`. Each exists on disk with no `_journal.json` entry, so `db:migrate` will never apply it **while printing success** (BE-58). The first is commit `9c17a75fe` ("feat(build)"). Flagged, not fixed: journalling another session's in-flight migration means guessing its intended ordering.

### New migration

`1169_kb_page_collection_indexes` (idx 1049) — keyset indexes for the collection sorts, the spec-required `(org_id, space_id)` live-page index, and the trash keyset index. Rollback authored. **Unapplied — still blocked on the IAM credential.** No `CREATE INDEX CONCURRENTLY`: the discipline gate baselines `concurrently=0` and any new use fails it.

### S04 — `KnowledgeCollection`

`core/collection/{knowledge-collection.types,kb-page-collection-cursor,kb-page-text-query,knowledge-collection.service}.ts` and `core/kb-page-collection.controller.ts` serving `GET /kb/pages` under `kb:pages:view`. Query and response schemas were added to the **existing** `core/dto/kb.schemas.ts` and `core/dto/kb-core-response.schemas.ts` rather than to new dto files.

**The cursor reuses the repo's existing convention rather than inventing a second one** — `encodeTupleCursor`/`decodeTupleCursor`, `keysetBeforeMicros`/`keysetAfterValue`, `PAGE_SIZE_CAP`. Three decisions the docs left open:

- The spec asks for a *signed* cursor. This repo deliberately decided cursors are unsigned, because they carry position and nothing else — no tenant, no permission, no filter state — so a forged one cannot express anything the server would not otherwise serve. That decision is kept. The spec's "versioned … access/filter revision" requirement is met instead by a **scope tag**: a 12-hex hash of the normalized filters *and* the permission fingerprint, carried as the cursor's first tuple element. A cursor minted under different filters or a different access revision decodes to `null`, which means page one — this repo's documented answer for a stale cursor.
- The sort value carries a sentinel prefix. Without it, a page whose `title` is the empty string (the column default) mints a cursor with a zero-length tuple part, which `decodeTupleCursor` rejects — and the reader loops on page one forever.
- Timestamp sorts use `microsecondCursorValue` + `keysetBeforeMicros`, never `toISOString()`. A millisecond-truncated boundary names an instant up to 999µs *earlier* than the row it points at, and every row in that gap silently vanishes from the middle of the walk. Nine lists in this repo shipped with that defect.

`owner=me` and `sharedWithMe=1` are server-side scopes on this one endpoint. **"Shared with me" means an explicit live grant naming your membership or one of your role slugs, minus anything you own or created.** Organization-visible pages are not shared with you.

Evidence: `npx jest src/modules/kb/core/collection/` → **29 passed, 2 suites**. `npx jest src/modules/kb/core/ src/modules/kb/wiki/kb-pages` → **116 passed, 14 suites**.

### Shallow wrappers removed

Three `KnowledgeAuthorizationService` methods whose entire body was a call to one other function were deleted rather than kept: `permissionFingerprint` (**zero** callers), `buildVisiblePageScope` and `sharedWithMeScope` (one caller each, both added the same day). Callers now resolve standing **once** and call the pure builders in `knowledge-page-scope.ts`.

That also repairs part of the read-cost regression logged further down: the collection endpoint would otherwise have resolved actor standing three times in one request. Pinned by a test asserting `resolveStanding` is called exactly once.

`kbPageMatchesTsQuery` went the same way. `kbPagePrefixTsQuery` survives, and `kb-pages.service.ts` `search()` now calls it, so the tokenizer exists once instead of twice.

### Violation introduced by this pass, repaired

`kb-page-tree.service.ts` went **490 → 694 lines** when the trash slice landed, crossing BE-09's 500-line cap. Split into `kb-page-tree.service.ts` (350) + `kb-page-trash.service.ts` (357) + `kb-page-subtree.util.ts` (25), the last holding the `collectSubtreeIds` walk both halves needed — extracted rather than duplicated, and rather than making one service inject the other just to reach it. `cron-kb.service.ts` was a real caller of `purgeExpired` and was updated; no delegating stub was left behind.

Verified as a pure relocation: `check:route-classification` still `UNDECLARED: 0`, and `kb-page-trash.spec.ts` + `kb-list-truncation.spec.ts` → **23 passed**. `kb-page-tree.service.ts` is gone from the over-500 list.

`check:over-300` remains red at 40 over its baseline of 413 — it was already 39 over before this split, and splitting one over-500 file into two ~350-line halves necessarily adds one over-300 entry. That is the correct trade (500 is a cap, 300 is a ratchet) but the ratchet is still red and is not solely ours.

### `kb-pages.service.ts` grew without anyone adding logic

501 → 566 lines. `git diff -w` shows the growth is **line-wrapping only** — the concurrent session is reformatting source to ~80 columns, which splits signatures across lines. It was already over the 500 cap at session start, so the violation is pre-existing; the reformat merely widened it. Do not attribute it to KB work, and do not "fix" it by re-joining lines the other session deliberately wrapped.

### Session interruption — three lanes stopped mid-flight

The Claude Code process exited while three lanes were running. What actually survived, established by reading disk rather than by trusting any report:

| Lane | State on disk |
|---|---|
| Tree/trash split | **Complete.** 350 + 357 + 25 lines, routes `UNDECLARED: 0`, 23 tests pass. Verified before the interruption. |
| Reviews (S10) | **Backend complete, frontend never started.** `expired` is gone from schema, dto and service; `isOverdue` is derived at read time; `POST /kb/page-reviews/bulk-decide` exists. No frontend file was touched. |
| Full Search (S05) | **Nothing.** No backend or frontend file was created. Restarted from zero. |

A lane that stops without reporting is not a lane that failed — check the tree before re-running anything, or you will redo landed work or clobber it.

### S10 Reviews — what landed, and the two test gaps that mattered

Overdue is now derived (`status = 'pending' AND due_at < now()`), never persisted. The persisted `expired` status is gone. Bulk decide takes ≤ 100 ids and returns per-id `succeeded` / `denied` / `conflict` / `notFound`.

The lane's spec passed 13/13 but had two holes that let real breakage through:

1. **Every `bulkDecide` test asserted a failure outcome** — `notFound`, `notFound`, `conflict`. Nothing proved a decision ever succeeded, so the suite would have passed against a `bulkDecide` that decided nothing at all. Added a success case and a mixed partial-success case (`succeeded` / `conflict` / `notFound` in one call).
2. **The "hidden page's review is excluded" test was vacuous** — its db mock returned no rows regardless of the predicate, so the empty result proved nothing. Added the positive control: same harness, rows present, permissive predicate, review returned.

Also added: a hidden review and a missing review must produce **identical** bulk results, so the response cannot confirm that a hidden review exists.

Evidence: `npx jest src/modules/kb/wiki/kb-page-reviews-derived-overdue.spec.ts` → **17 passed**.

**Regression the lane left behind, found by running the whole wiki suite rather than only the lane's own spec.** Converging the two list endpoints removed `KbPageReviewsQueryService.listDue`, but `kb-ar06-acceptance.spec.ts` still called it — `TypeError: svc.listDue is not a function`. The convergence itself is right: `GET /kb/page-reviews/due` survives as a route and now delegates to `list(u, { ...query, status: "overdue" })`, so there is one list method and one cursor convention instead of two.

The spec was repointed, not deleted — it pins acceptance criterion AR-06. Its old assertions (`Array.isArray(result)`, `limit` called with 50) described the retired plain-array shape; it now asserts the cursor-page shape and the `limit + 1` sentinel, and a second case proves 51 rows in yields 50 out with `hasMore: true` and a minted `nextCursor`. Two stale names referring to `listDue` were renamed so the file does not describe a method that no longer exists.

`npx jest src/modules/kb/wiki/` → **50 suites, 403 tests, all passing.**

**The lesson for every remaining lane:** a lane that runs only its own new spec will not see what it broke. Run the enclosing suite before believing a lane's report.

### New migration 1170

`1170_kb_page_reviews_derive_overdue` (idx 1050) — collapses any `status = 'expired'` row into `'pending'` and adds `chk_kb_page_reviews_status` (`NOT VALID` then `VALIDATE`, so it does not hold a long lock). `kb_page_reviews.status` had **no** CHECK constraint at all; it was a bare `text` column, so nothing at the database level stopped `expired` coming back. Marked `-- @data-loss`: the rollback drops the constraint but cannot resurrect the collapsed rows, which is intentional.

### Gate status at this checkpoint

| Gate | Result |
|---|---|
| `pnpm typecheck` | 1 error, `notifications/approval-cursor.spec-fixtures.ts`; **zero in `modules/kb`** |
| `pnpm typecheck:test` | 2 errors, both `notifications/`; **zero in `modules/kb`** |
| `check:route-classification` | ALL ROUTES CLASSIFIED, `UNDECLARED: 0` |
| `check:migration-rollback` | PASS |
| `check:migration-discipline` | 3 `[no-journal]`, all another session's Build/invoices migrations |
| `check:query-projections` | PASS, 0 violations |
| `check:list-projections` | PASS, 22 endpoints, 0 violations |
| `check:cycles` | PASS, no circular dependency |
| `check:unbounded-reads` | 2 regressions, in `hr/` and `timesheets/`, neither ours |
| `check:file-sizes` / `check:over-300` | **RED** — see above |
| `check:composite-fk-set-null` | cannot run: reads `pg_constraint`, needs the IAM credential |
| `openapi:generate` | broken mid-flight by a bad relative import in `kb-page-reviews.schemas.ts`; regenerate once reviews lands |

The `notifications/` type errors are another session's: those files are byte-identical to what that session committed, and the cause is a required `eventKeys` field added to a query type without its own spec fixtures being updated.

## Cross-cutting invariants

Every slice that touches a disclosure or mutation path must satisfy all of these before it is marked `VERIFIED`.

- [ ] Canonical `KnowledgeAuthorization` is the only access decision; no caller rebuilds the predicate.
- [ ] Route denial is 403/NoPermission; hidden or missing records are an indistinguishable 404.
- [ ] Authorization fails closed; cache unavailability cannot retain revoked access.
- [ ] Tenant scope is explicit on every record, unique key, FK, query, cache key, event, job, blob, and search document.
- [ ] Collections are cursor-based, `hasMore` is signalled, limit defaults ≤ 50 and caps at 100, and no query silently truncates.
- [ ] Projections replace `SELECT *`; page bodies never appear in list/search metadata queries.
- [ ] Content writes carry `expectedContentRevision`; retriable creates and bulk commands carry `Idempotency-Key`.
- [ ] Audit and outbox records commit with the source mutation; no provider/object-store/embedding call holds a DB transaction open.
- [ ] URL carries `q`, filters, sort, view, cursor; selection, drafts, menus, and dialogs stay local.
- [ ] Every state implemented: loading, ready, first empty, filtered empty, error with retry + request id, denied — plus saving/saved/offline/conflict/stale-access/restore on editing surfaces.
- [ ] Every desktop capability has a mobile (375 px) and keyboard-accessible path; no action is context-menu-only.
- [ ] No code comments, TODO/FIXME/HACK, commented-out code, or placeholder prose in source files.

## Slices

### S01 — `KnowledgeAuthorization` + `kb_page_grants`

**Customer job:** none directly; every other slice depends on this seam.

| Dimension | Requirement |
|---|---|
| Frontend | none (module seam only) |
| Backend interface | `resolvePageAccess`, `buildVisiblePageScope`, `resolveSpaceAccess`, `permissionFingerprint` |
| Schema/migration | add `kb_page_grants`; unique live grant per page/grantee; index `(org_id, membership_id, revoked_at, page_id)` + group equivalent; tenant-composite FKs; add `acl_revision` to `kb_pages` if absent |
| Authorization | 8-step evaluation order from `05-data-api-search-security.md`; deny by default |
| Cache/index/events | `permissionFingerprint` versioning; ACL-revision bump on visibility/grant/space-membership/project-membership/token/parent-policy change |
| Tests | cross-tenant, same-tenant-hidden equivalence, fail-closed on cache loss, property/fuzz test of the predicate |
| Browser states | n/a |
| Evidence | migration applied + ledger row; `EXPLAIN` on the grant lookup |

- [x] Census existing access logic in `backend/src/modules/kb`
- [x] Define the interface and domain types — `core/authorization/knowledge-authorization.types.ts`
- [x] Canonical scope builder — `core/authorization/knowledge-page-scope.ts`
- [x] Scope/fingerprint spec, including a characterization test pinning the legacy gap
- [x] Expansion migration `1165_kb_page_grants` + rollback + journal entry (idx 1048)
- [x] `KnowledgeAuthorizationService` — `resolvePageAccess`, `resolveSpaceAccess`, `permissionFingerprint`, actor standing
- [x] Collapsed duplicate space/role computation out of `KbAccessService` into the authorization module
- [x] Registered in `KbCoreModule` (BE-01)
- [x] `pnpm typecheck` clean; `pnpm typecheck:test` has 21 errors, **0 in `modules/kb`**
- [ ] **BLOCKED** Apply migration 1165 — IAM credential required (see environment table)
- [ ] **BLOCKED** `EXPLAIN (ANALYZE, BUFFERS)` evidence — same credential
- [x] Migrated `KbPageStatusService` (7 call sites) to per-action canonical checks
- [ ] Replace the remaining legacy call sites — queue below

**Call-site migration: source complete.** All 18 services now take their authorization from `KnowledgeAuthorizationService`. `pnpm typecheck` on source is clean. Executed as five parallel lanes with non-overlapping file ownership, then four follow-up lanes to repair spec fallout.

**Parity specs re-pinned by the coordinator (these are the ACL safety net):**

| Spec | What it asserts now |
|---|---|
| `kb-surface-predicate.spec.ts` | every surface takes its predicate from the canonical seam, **and never calls the retired `pageVisibleTo`** — this is the enforcement of "no caller rebuilds authorization rules" |
| `kb-search-page-visibility.spec.ts` | search uses the *seam's returned* predicate, pinned via a sentinel — stronger than the string comparison it replaced |
| `kb-revocation-after-indexing.spec.ts` | added **Revocation dimension 4**: the canonical scope loses its space arm on revocation, never admits a revoked grant, and still binds the tenant. The file's existing revocation tests exercised the legacy predicate, which pages no longer use, so the canonical path had no revocation coverage here at all |
| `kb-acl-isolation`, `kb-acl-revision-gate`, `kb-vector-minority-tenant` | unchanged assertions, auth mock supplied |

**Coverage shift to restore (not a defect).** Lane C rewrote `kb-page-versions-tenant-isolation` and `kb-page-record-links-tenant-isolation` to assert delegation to the seam instead of inspecting rendered SQL for the tenant id. That is architecturally correct — the service no longer builds the predicate — and the negative/positive pair survives. But those specs no longer prove the services' **own** queries carry `org_id`. Verified by hand in source that every `kb_page_versions` query still binds `eq(kbPageVersions.orgId, orgId)`. Re-add a tenant-binding assertion (the `boundOrgIds` helper in `kb-vector-tenant-binding.spec.ts` is the model).

**Call-site queue (the real size of this slice).** `pageVisibleTo` has ~20 production call sites across 14 services; `assertPageAccessible` has ~15. Eight specs pin the legacy predicate's rendered SQL as an ACL-parity assertion and must be re-pinned to the canonical predicate as each service moves.

| Service | Sites | Action mapping | Status |
|---|---:|---|---|
| `kb-page-status.service.ts` | 7 | lock→`manage`, publish/archive/unarchive/verify/markStale/setStatus→`edit` | **done** |
| `kb-pages.service.ts` | 2 | detail→`view`, update→`edit` | queued |
| `kb-page-tree.service.ts` | 4 | list→`view`, move→`edit` | queued |
| `kb-page-versions.service.ts` | 3 | list/diff→`view`, restore→`edit` | queued |
| `kb-page-comments.service.ts` | 5 | read→`view`, write→`comment` | queued |
| `kb-page-visits.service.ts` | 6 | `view` | queued |
| `kb-search.service.ts` | 3 | `view` — highest leakage risk | queued |
| `kb-citation-visibility.service.ts` | 1 | `view` — highest leakage risk | queued |
| `kb-document-query.service.ts` | 1 | `view` | queued |
| `kb-analytics.service.ts` | 1 | `view` | queued |
| `kb-page-reviews-query.service.ts` | 1 | `view` | queued |
| `kb-page-record-links.service.ts` | 3 | `view` | queued |
| `kb-page-ai.service.ts` | 1 | `view` | queued |
| `kb-import-export.service.ts` | 1 | export→`view` | queued |
| `kb-page-duplicate.service.ts` | 1 | `view` | queued |
| `kb-sources.service.ts` | 1 | attach/detach→`edit` | queued |
| `kb-notification-visibility.ts` | 1 | `view` | **done** |
| `kb-object-access.ts` | 2 | `view` | **deferred → S08/S17** |

**Parallel execution.** The queue was split into five lanes with strict, non-overlapping file ownership (A: search + citations; B: pages + tree; C: versions + comments + record links; D: visits + AI + query + analytics + reviews-query; E: import/export + duplicate + sources). Every lane brief bans git state commands by name, bans database access, bans running the full suite, and names the coordinator-owned files. No lane edits a `*.module.ts` — every affected module already imports `KbCoreModule`.

**Coordinator-owned files (not delegated):** `kb-page-visibility.ts`, `kb-page-access.util.ts`, everything under `core/authorization/`, `kb-object-access.ts`, `kb-notification-visibility.ts`, and the eight shared parity specs below.

**Shared parity specs — must be re-pinned after the lanes land.** These assert a service's predicate *equals* `serialize(pageVisibleTo(...))`. Once a service moves to the canonical predicate the assertion is comparing the wrong two things, so each must be re-pinned to the canonical scope rather than deleted — they are the ACL-parity safety net: `kb-read-search-parity.spec.ts`, `kb-search-page-visibility.spec.ts`, `kb-vector-tenant-binding.spec.ts`, `kb-surface-predicate.spec.ts`, `kb-revocation-after-indexing.spec.ts`, `kb-chunk-visibility.spec.ts`, `kb-departed-actor.spec.ts`, `object-access-matrix.spec.ts`.

**Deferred: `kb-object-access.ts` (attachment reads).** It is a free function, so it cannot inject. The real chain is `storage.controller` → `assertKeyReadable` → `assertKbObjectReadable` → `assertPageAccessible`, which means threading the canonical service from the storage controller down two levels and changing a signature that ~10 storage specs construct. No module cycle blocks it (`StorageModule` imports only `AvScannerModule`; no KB module imports `StorageModule`), so the fix is to have `StorageModule` import `KbCoreModule` and thread the service through. Sequenced into **S08/S17** with the rest of the attachment-authorization work rather than started mid-flight.

**Risk flagged on `kb-notification-visibility.ts`:** this path builds a synthetic actor and runs with **no request context or tenant transaction**. The legacy predicate read only `kb_pages`; the canonical one additionally reads roles, space members, projects and the new RLS-enabled `kb_page_grants`. If the GUC is absent these raise `42501`. The failure mode is safe — the catch only swallows `NotFoundException`, so a `42501` rethrows and the registry logs it rather than delivering a notification it should not. **This needs live verification against a booted app, which the IAM blocker currently prevents.**

**Privilege finding (fixed for status, open elsewhere).** `assertPageAccessible` only ever checked **view**, yet callers used it to authorize mutations. Route guards gate a tenant-wide capability (`kb:pages:update`, `kb:pages:manage`), so any member holding that capability could publish, archive, unarchive, verify, mark-stale, or lock **any page they could merely see** — including pages owned by someone else. This is the audit's "granular action gates" gap, now confirmed at the code level. `KbPageStatusService` is fixed and pinned by tests; every other queued service still authorizes mutations at view level.

**Census result — six competing access implementations to collapse:**

| File | Role today |
|---|---|
| `core/kb-access.service.ts` | space reachability, article view/edit assertions, ACL cache dimension |
| `retrieval/kb-page-visibility.ts` | `pageVisibleTo` SQL predicate for pages and chunks |
| `retrieval/kb-page-access.util.ts` | per-record page checks |
| `retrieval/kb-project-access.util.ts` | accessible project ids |
| `retrieval/kb-article-restriction-predicate.ts` | article restriction predicate |
| `retrieval/kb-chunk-visibility.ts` | chunk-side visibility |

**Evidence:**

- `npx jest src/modules/kb/core/authorization/` → **37 passed, 2 suites**, 2.7 s.
- `npx jest src/modules/kb/core/` → **55 passed, 9 suites**, 4.7 s — the `KbAccessService` collapse is behavior-preserving.
- `pnpm typecheck` → clean (no output).
- `pnpm typecheck:test` → 21 errors, all in `careers/`, `hr/`, `recruitment/`; **zero** in `modules/kb`. None of the 21 files appear in this branch's `git status`, so they are pre-existing and unrelated.
- Journal diff is additive only: `migrations/meta/_journal.json | 7 +++++++`.
- `db:apply-one --tag=1165_kb_page_grants --dry-run` → reached the cluster, then `PAM authentication failed`. The SQL itself is unproven against a live database.

**Regression caught during this slice:** extracting `computeAccessibleSpaceIds` reordered its DB calls, and `kb-access.service.spec` / `kb-acl-cache-key.spec` mock the db **by call sequence** — 3 tests failed. The extracted function now takes a `resolveRoles` thunk so the original call order (spaces → roles → members) is preserved. Any future extraction in this module must preserve DB call order or those mocks will lie.

**Impersonation divergence (unresolved, carried forward):** the legacy `resolveAclDimension` keys the ACL cache on `accountableMembershipId` while `getPrincipalIds` exposes `actingMembershipId`. Under impersonation these differ, so the legacy path computes the *impersonator's* reachable spaces. `KnowledgeAuthorizationService` uses `actingMembershipId` for both the computation and the cache key, which is self-consistent. The legacy path is left untouched to keep the collapse behavior-preserving; closing the divergence needs its own slice and an impersonation test.

**Findings raised by this slice (beyond the audit):**

1. **`pageVisibleTo` has no space branch.** A page inside a space the actor belongs to is invisible unless the actor created it or the page is org/public visible. The audit recorded the Shared-with-me defect but not this one. The new `indexedBranch` adds space reachability; it is a behavior change that widens results and needs its own regression test at S04.
2. **`pageVisibleTo` has no grant branch at all**, which is why "Shared with me" was forced into a `createdById != me` client inference.
3. **`kb_pages.public_token` is stored in plaintext** under `uniq_kb_pages_public_token`. `05-data-api-search-security.md` requires hashed, revocable, versioned tokens. Carried to **S17**; the rehash is a destructive column migration and must be sequenced with the S21 contraction rules.
4. `kb_pages` already carries `acl_revision`, `content_revision`, `owner_membership_id`, and tenant-composite FKs, so S01's schema work reduced to the grants table alone.
5. Grantee arc resolved to `membership_id | role` rather than the spec's `membership_id | group_id | public_token_id`: this repo has no group entity, `kb_article_restrictions` already uses `(membership_id, role)`, and the public token lives on the page row, not a table. Recorded as a deliberate deviation.

---

### S02 — My pages

**Customer job:** find pages the current membership owns.

| Dimension | Requirement |
|---|---|
| Frontend | `/knowledge/wiki/private`, relabelled **My pages**; search, status/space filters, list/card, cursor, page actions, owner-transfer where allowed |
| Backend | `GET /kb/pages?owner=me` through `KnowledgeCollection` |
| Schema | `owner_membership_id` on `kb_pages` (keep single-owner; no owner table) + tenant-leading sort index |
| Authorization | canonical visible scope; ownership does not widen access |
| Removal | delete browser `visibility=private` filtering and the copy teaching users to change access |
| Tests | ownership transfer changes the list without altering visibility; another admin's private page is not "mine" |
| Browser states | loading, ready, first empty, filtered empty, error+retry, denied |

- [ ] Failing test: private page owned by another authorized admin must not appear
- [ ] Server ownership filter
- [ ] Rebuild page on the shared collection module
- [ ] Remove client-side visibility filter and its query-key
- [ ] Owner-transfer action + audit event
- [ ] Browser evidence for all six states

**Evidence:** _pending_

---

### S03 — Shared with me

**Customer job:** find pages explicitly shared with this membership or one of its groups.

| Dimension | Requirement |
|---|---|
| Frontend | `/knowledge/wiki/shared`; shared-by, shared-at, access level, source group columns/cards; search; status/access filters; cursor; access-lost state |
| Backend | `GET /kb/pages?sharedWithMe=1`; `GET/POST/DELETE /kb/pages/:id/grants` |
| Schema | `kb_page_grants` from S01 |
| Authorization | grant validity checked live; revoked grants disappear everywhere |
| Removal | delete `createdById !== myId` inference |
| Cache/index | grant change bumps ACL revision → list, detail, search, Ask, citation invalidation inside the revocation budget (p95 < 15 s, hard bound 60 s) |
| Tests | create/change/revoke propagates to list, detail, search, Ask, citations, cache |

- [ ] Failing test: org-visible page created by another user must not appear as shared
- [ ] Grant CRUD endpoints with audit
- [ ] `sharedWithMe` scope in the collection module
- [ ] Rebuild the page; access-lost recovery state
- [ ] Revocation propagation test against the documented bound
- [ ] Backfill grants **only** from trustworthy existing facts; do not invent a grant per foreign-authored page

**Evidence:** _pending_

---

### S04 — `KnowledgeCollection` + canonical `GET /kb/pages`

**Customer job:** every list in the product is bounded, filterable, and shareable by URL.

| Dimension | Requirement |
|---|---|
| Backend interface | one normalized cursor request + one stable list projection serving pages, spaces, reviews, templates, jobs, trash, health |
| Contract | request/response shapes in `05-data-api-search-security.md`; opaque signed cursor ≤ 512 bytes encoding stable order + filter/access revision |
| Schema | `(org_id, space_id)` live-page index; tenant-leading keyset sort indexes; partial live/deleted indexes |
| Removal | `useKbPagesTree` as a list source; all silent client caps |
| Tests | cursor stability under concurrent insert/update/delete; fuzz test of the cursor codec; query budget |
| Evidence | `EXPLAIN` at 10k and 100k rows; p95 budget |

- [ ] Cursor codec + property tests
- [ ] Normalized filter schema shared by client and server fixtures
- [ ] `GET /kb/pages` with projection, filters, facets
- [ ] Lazy tree-children endpoint
- [ ] Indexes + migration + `EXPLAIN` evidence
- [ ] Migrate every consumer off the tree
- [ ] Contract tests pinned to shared fixtures

**Evidence:** _pending_

---

### S05 — Full Search (new route, P0)

**Customer job:** inspect all authorized matches and refine.

| Dimension | Requirement |
|---|---|
| Frontend | `/knowledge/wiki/search`: query input, result count, exact/spell suggestion, facets (space/status/type/owner/updated/verified), snippet rows, highlight, trust + access metadata, cursor, card/table, page actions, keyboard navigation |
| Backend | `GET /kb/search` via `KnowledgeIndex`; lexical + semantic candidates, fusion, exact-identifier handling, ACL/content revision recheck, snippet from authorized current content |
| Authorization | no title, snippet, count, or facet derived from unauthorized content |
| Fallback | lexical results without embeddings; no semantic call for empty query, exact-id navigation, or unavailable/over-budget provider |
| Tests | leakage matrix, minority-tenant recall, exact-code queries, stale/deleted/revoked exclusion, zero-result recovery |
| SLO | p95 server < 500 ms at the planning envelope |

- [ ] Shared search/citation result projection (consumed by S16 too)
- [ ] `GET /kb/search`
- [ ] Route + facets + cursor + URL codec
- [ ] Quick find "View all" handoff preserving the query
- [ ] Leakage and recall suites
- [ ] All six states + keyboard navigation evidence

**Evidence:** _pending_

---

### S06 — Wiki Home

- [ ] Compact search field linked to full results
- [ ] URL-backed `status`, `spaceId`, owner, view controls
- [ ] Card/list toggle, result count, cursor for All pages
- [ ] Page-card menu via the single action descriptor model
- [ ] Trust badges (draft/published/archived, verified/stale, owner missing)
- [ ] First-run path: blank, template, or import
- [ ] Remove tree rendering for All pages; children load only on expand
- [ ] Acceptance: responsive at 100,000 tenant pages without downloading the tree

**Evidence:** _pending_

---

### S07 — Spaces + Space detail

- [ ] Server-projected page/member counts
- [ ] Search, audience/status filters, cursor, list view
- [ ] Members sheet; owner; last updated; manager health summary
- [ ] Archive/restore replacing customer-facing hard delete; restore idempotent
- [ ] Archive impact preview: pages, public links, Ask index impact, record links
- [ ] Space detail: breadcrumb, audience/access badge, in-space search, status/owner filters, create-in-space, lazy hierarchy, review-policy summary, inaccessible vs not-found recovery
- [ ] Every child request carries `spaceId`, tenant, parent/cursor, current access
- [ ] Move checks both source and target space

**Evidence:** _pending_

---

### S08 — Page document

- [ ] Read/edit modes by permission
- [ ] Trust header: owner, status, visibility, verification, next review, updated-by/time
- [ ] One action model: favorite, comments, metadata, backlinks, linked records, history, duplicate, move, save template, export, archive/delete
- [ ] Slash/insert menu, link preview, heading outline, anchored comments, citation blocks
- [ ] Mobile metadata/comments sheets
- [ ] In-memory or tenant-scoped server draft; connectivity + save timestamps; field-level conflict comparison; retry
- [ ] AI actions show sources and produce a preview/diff before applying
- [ ] Remove any page body in Web Storage (static scan + logout/org-switch/revocation tests)
- [ ] Content writes require expected revision; metadata writes never overwrite content
- [ ] Unauthorized and missing are indistinguishable 404

**Evidence:** _pending_

---

### S09 — History

- [ ] Cursor list with actor, time, change summary; current marker
- [ ] Select one or two versions; semantic block diff; metadata/content distinction
- [ ] Restore preview + confirmation; deep link to a version; audit entry
- [ ] Restore appends a new version, never rewrites history, increments revision, reindexes asynchronously
- [ ] Remove unbounded revision load and raw JSON diff

**Evidence:** _pending_

---

### S10 — Reviews

- [ ] Drop persisted `expired` status; derive overdue as `pending && dueAt < now` (migration + index + contract tests)
- [ ] Search; URL filters for status/type/reviewer/due/space; sortable due date; cursor
- [ ] Page trust context; optional approval note; required rejection reason
- [ ] Bulk decide: max 100, per-row results, partial success, retry-safe, idempotent
- [ ] Mobile cards; assignment notifications
- [ ] List and decision both use page visibility; review metadata cannot reveal a hidden page

**Evidence:** _pending_

---

### S11 — Trash

- [ ] Table + mobile cards; search; deleted-by/date/space filters; cursor
- [ ] Remove the silent 100-row cap and card-only layout
- [ ] Selected restore/purge; dependency impact; empty trash; retention permission split; legal/hold explanation
- [ ] Restore repairs tree/search/index links idempotently
- [ ] Resumable multi-store purge ledger: rows, versions, comments, grants, blobs, chunks/vectors, caches, public/CDN, analytics ids, notifications, connector projections
- [ ] Purge interruption/resumption test

**Evidence:** _pending_

---

### S12 — Templates

- [ ] URL `tab`, `q`, category/use-case filters; preview; expected output
- [ ] Saved templates: use count, last used, owner, cursor, create/edit/delete for managers
- [ ] Starter use does not require template-manage permission
- [ ] Using a template goes through the same page-create command and returns an editable page
- [ ] No marketplace, ratings, or near-duplicate generation

**Evidence:** _pending_

---

### S13 — Import & Export

- [ ] Separately gated import/export tabs
- [ ] Format/size validation and help; title, target space/parent, default visibility, duplicate policy
- [ ] Dry-run summary; progress; per-item errors; retry; cancel before processing
- [ ] Cursor job histories; expiring download indicator; audit event
- [ ] Uploads scanned; jobs idempotent; partial import reports created/skipped/failed and resumes without duplicates
- [ ] Remove client slicing of job history and any synchronous parsing/indexing on the request connection

**Evidence:** _pending_

---

### S14 — Analytics

- [ ] Date range + space filters
- [ ] Successful resolution, zero-result queries, unsupported Ask queries, citation reuse, stale high-use pages, review SLA, public deflection
- [ ] Paginated drill-down; assign/dismiss/create-fix actions for gaps
- [ ] Minimum-cohort privacy thresholds; aggregates cannot reveal a hidden page via count or label
- [ ] Remove vanity totals, raw org-wide titles, duplicate trust scores, charts without table alternatives
- [ ] Skeleton/error/no-data states

**Evidence:** _pending_

---

### S15 — Content Health (`/knowledge/wiki/manage`)

- [ ] `kb_health_items` schema: tenant, page, kind, versioned evidence JSON, impact, state, assignee, due, detected/resolved/dismissed, rule version; unique active `(org_id, page_id, kind, rule_version)`
- [ ] Impact-ranked inbox with presets: unowned, stale, unverified, empty, broken link, overexposed, duplicate candidate, contradictory claim, overdue review
- [ ] Filters; owner/due; reason/explanation; bulk repair; dismiss/snooze with reason; before/after health trend
- [ ] Every item links to evidence and an allowed repair; no automated fix publishes without a human
- [ ] Dismissals expire or record a durable exception

**Evidence:** _pending_

---

### S16 — Ask KB

- [ ] `kb_ai_interactions` schema: tenant, actor, conversation/message, provider/model, prompt policy version, source ids + revisions, token counts, latency, result state, feedback, cost
- [ ] Conversation rail: new, search, rename, delete, cursor
- [ ] Source scope sheet (pages/files/notes, space, owner, status, verified-only) visible and editable before send
- [ ] Answer parts: citations, source passage, freshness, verification, disagreement, insufficient evidence
- [ ] Streaming stop/retry, network recovery, copy, helpful/unhelpful, report wrong/stale, create knowledge gap
- [ ] Access-change handling after an answer was generated
- [ ] Deterministic search fallback when AI is disabled, rate limited, over budget, or unavailable
- [ ] `kb:ai:generate` + read access required; billing permission not inferred from view
- [ ] Provider context contains only authorized passages; document content is data, never instruction
- [ ] Citations accepted only when they map to a retrieved, still-authorized passage
- [ ] Tenant quotas: requests, tokens, concurrent streams, indexed bytes, research jobs
- [ ] Remove confidence percentages, uncited prose, hidden auto-selected sources, drafts in browser storage

**Coverage gap found during the S01 lane work.** `kb-ask-tenant-isolation.spec.ts` and `kb-ask-citation-restriction.spec.ts` exercise only the **article** isolation paths (`kb_articles`, `kb_article_restrictions`). They never reach `auth.visiblePagePredicate`, because that is consulted only when **page** citations are present — and no test in either spec produces one. So the Ask cross-tenant guards currently prove nothing about page citations, which are the `kb_pages`-backed half of the product and a P0 leakage surface. Add page-citation cases to both specs as part of this slice; do not assume the article cases cover them.

**Evidence:** _pending_

---

### S17 — Public page

- [ ] Accessible reading typography; brand-light header; last updated; optional helpful feedback
- [ ] Invalid/revoked → 404; no private chrome, sibling tree, comments, Ask scope, or non-public metadata
- [ ] Tokens hashed, revocable, versioned, rate limited, absent from logs
- [ ] Cache headers keyed by token revision; rotation/revocation purges CDN/cache
- [ ] Page and attachment access bound to the same public grant
- [ ] `@Public` route RLS: SECURITY DEFINER lookup (42501 hazard)

**Evidence:** _pending_

---

### S18 — Project wiki adapters

- [ ] `/build/[projectId]/wiki` and `/build/[projectId]/wiki/[pageId]` scope every list/search/create/read/history path by project
- [ ] Project membership enforced on every path
- [ ] History adapter added
- [ ] Project back path in the breadcrumb (Project → Wiki → ancestors)
- [ ] No duplicate data, editor, or authorization implementation

**Evidence:** _pending_

---

### S19 — Research Briefs

- [ ] List/detail under Knowledge: question, scope, status, owner, provider/model metadata, citations, source snapshot, cost, retry/cancel, rate limit, approval, convert-to-page
- [ ] Cited records rechecked on open; losing access redacts the citation
- [ ] Completion durable if the browser closes
- [ ] Remove the Support-owned duplicate route after callers migrate

**Evidence:** _pending_

---

### S20 — `/ask` removal, redirects, aliases

- [ ] `/knowledge` redirect behavior verified with telemetry and entitlement
- [ ] `/ask` → `/knowledge/chat` redirect; callers moved; duplicate surface deleted
- [ ] Required aliases and redirects in place
- [ ] Caller census (`rg` + dependency graph incl. dynamic imports and Nest module registration) shows zero callers before deletion
- [ ] Redirects are not shadowed by `next.config.ts` (config fires before route-level redirect pages)

**Evidence:** _pending_

---

### S21 — `kb_articles` cutover + destructive contraction

**Runs last. Nothing in this slice starts until S01–S20 are `VERIFIED`.**

- [ ] Pre-flight: resolve exact table/route/cache/index/blob targets and write them into this ledger before any destructive statement
- [ ] Pre-flight: RDS snapshot taken and id recorded here
- [ ] Per-record reconciliation of status, slug, redirects, comments, attachments, versions, translations, public URL, citations
- [ ] Watermark, checksum/counts, exceptions, retries, rollback window recorded
- [ ] Freeze legacy writes → final delta → switch readers → invalidate both cache namespaces
- [ ] Remove the article↔page bridge runtime only after 100% migration + signed reconciliation
- [ ] Remove duplicate search/access logic, tree-as-list consumers, client caps, persisted expired review state, unclaimed endpoints, shallow wrappers
- [ ] Contraction migration tested for interruption and resumption
- [ ] Rollback metadata provided even though the data migration is intentionally irreversible
- [ ] Retain historical migrations needed to build from supported baselines, audit records, and promised compatibility redirects

**Evidence:** _pending_

---

### S22 — Async scale, cost, disaster recovery

- [ ] Dedicated queue lanes with the target ages in `04-backend-scale-architecture.md`
- [ ] Per-tenant concurrency, admission control, retry/DLQ/lease recovery, bounded attempts, correlation ids
- [ ] Interactive index and access-revocation freshness SLOs
- [ ] Batched, content-hash-deduplicated embedding with budgets and lexical fallback
- [ ] Public-page CDN invalidation by token/page revision
- [ ] Replica consistency classification and lag failover to primary
- [ ] Connection budget: background lanes cannot exhaust interactive connections
- [ ] Drills: backup restore, tenant export/delete, reindex, cell-move
- [ ] Load/soak at current, 10×, and the planning envelope
- [ ] Conditional stages (partitioning, cells, service extraction, external search) stay **unactivated** unless a measured trigger fires; record the measurement either way

**Evidence:** _pending_

---

### S23 — Observability

- [ ] Dimensions: tenant bucket/placement, route/module, result code, actor standing, cache outcome, primary/replica, queue lane, job kind, provider/model, source kind
- [ ] No page title/body, query text, token, or attachment name in metric labels or logs
- [ ] Dashboards/alerts for read/write/search/Ask latency and errors; DB connections, locks, slow queries, replica lag, cache hit and dropped invalidations; queue age, retries, dead letters, lease recovery, index freshness; ACL denial/not-found anomalies and revocation lag; retrieval candidate counts, rerank latency, no-answer rate, citation coverage; storage/index/embedding/AI cost by tenant tier; purge backlog and oldest incomplete ledger
- [ ] SLOs, rate limits, queue-age alerts, cost budgets, and runbooks exist and are drill-verified

**Evidence:** _pending_

## Verification commands

Record the exact command and its real output in each slice's evidence block. Do not claim a pass without pasted output.

| Gate | Command | Notes |
|---|---|---|
| Backend typecheck | `pnpm typecheck` (`tsc --noEmit -p tsconfig.build.json`, `--max-old-space-size=10240`) | Currently **clean**. The only gate that sees an arity change (BE-138). 10240 MB, not 8192 — at 8192 it dies exit 134 printing no type errors (BE-139). |
| Backend test typecheck | `pnpm typecheck:test` | **21 pre-existing errors**, zero in `modules/kb`. Run after any signature change. |
| Backend tests | `npx jest <path>` | `*e2e-spec.ts` runs only under `pnpm test:e2e` (BE-137). Never run the full suite while parallel agents are editing. |
| Migration proof | `pnpm db:apply-one --tag=<tag>` | **BLOCKED on IAM.** Needs `APPLY_ONE_ALLOW_REMOTE=1`. Never `pnpm db:migrate` — it applies every pending migration. |
| Frontend typecheck | _to be confirmed from `frontend/package.json`_ | frontend tsconfig excludes tests |
| Frontend tests | _to be confirmed_ | jest `roots` exclude `test/`; specs live under `src/**` |
| Lint | _to be confirmed_ | two frontend gates are already red on `main` — confirm pre-existing before attributing |
| OpenAPI | `openapi:generate` | needs no database; a stale `openapi.json` disarms `check:permission-binding` |
| Migrations | _to be confirmed_ | gate aliases default to **production**; read the source before running |

## Authorization flaw found and closed during the lane work

Lane B mapped page `softDelete` to `manage`, which exposed a hole in the S01 predicate: `buildIndexedBranch` applied the **space** and **project** reach branches to *every* action. Bare membership of a space therefore satisfied `edit` and `manage` on every page in it — so tightening a call site from `view` to `manage` bought almost nothing, because the predicate handed `manage` back to any space member.

Fixed: container branches (space, project) now apply only to `view` and `comment`. `edit` and `manage` must come from ownership, authorship, an explicit grant, or admin standing. Pinned by four tests, including one asserting ownership still reaches `manage` so the narrowing did not over-tighten.

This **fails closed** — the safe direction for an authorization change that cannot currently be verified against a live database.

**Carried to S07 (Spaces):** `05-data-api-search-security.md` step 5 specifies "space scope and **inherited role**", meaning a space should confer a graded access level, not the binary reach that `computeAccessibleSpaceIds` returns today. Implementing that needs a per-space member role → access-level mapping. `kb_space_members.role` is currently overloaded — it holds both a membership-scoped role and a role *slug* matched against the actor's roles — so the mapping cannot be defined until that column's two meanings are separated. Until then a space member is capped at `comment`, which may be stricter than the product intends and needs a product decision.

## Open regression introduced by the canonical seam — read cost

Surfaced while auditing Lane A, not reported by it. `kb-citation-visibility-bounds.spec.ts` is a **read-cost guard** asserting statements-per-method. `visiblePages` legitimately dropped 2 → 1 because the auth service is mocked in that spec. In production the cost moved rather than vanished, and it grew:

- **Before:** `getAccessibleProjectIds` = 1 statement per predicate build.
- **After:** `resolveStanding` = `access.holds` + `getPermissionsVersion` + `resolveRoleSlugs` + `getAccessibleProjectIds` (issued together via `Promise.all`, so ~1 round trip but ~4 statements) plus a cached accessible-spaces lookup, and the emitted SQL now carries an extra `EXISTS` subquery against `kb_page_grants`.
- **Worse:** `resolveStanding` is re-resolved on **every** `visiblePagePredicate` / `resolvePageAccess` call. A service with three predicate sites in one request pays it three times.

Consequences to close in **S04** (query budgets) and **S22**:

- [ ] Memoize standing for the life of one request. A naive instance-level Map on a singleton Nest service would leak across tenants and must not be used.
- [ ] Decide whether standing may be cached in `CacheService`. Caution: `permissionsVersion` in the key covers role and permission mutations (BE-114), but a **page-grant or space-membership change does not bump it**, so a cached standing could outlive a revocation. The existing 60 s accessible-spaces cache already carries this exposure. Do not add caching to the authorization path until revocation can actually be tested — currently blocked by the IAM credential.
- [ ] Re-run the repo's own read-cost gates (`pnpm db:check-read-budgets`, `check:db-call-count`, `check:route-budgets`). These are where this will surface and **they need a database**, so the regression is currently unmeasurable here.

The mocked statement-count guards no longer measure the real cost, because the work moved behind a seam the specs stub out. That is a genuine loss of coverage, not a win.

## S01 final verification — 2026-09-23

| Gate | Result |
|---|---|
| `pnpm typecheck` (source) | **0 errors** |
| `pnpm typecheck:test` | **0 errors** (was 21 pre-existing at open; the careers/hr ones were fixed by another session, not by this work) |
| `npx jest src/modules/kb/ src/modules/access/` | **1670 passed, 7 failed, 3 suites red** — identical to the pre-existing baseline |
| `npx jest test/security/bola/bola-rag-object-scope.spec.ts` | **18 passed** |

The 7 remaining failures are the same 3 suites documented as pre-existing below. No new failure was introduced by the migration.

**Regression caught and fixed during final verification.** The comment-permission spec briefly went 5 → 6 failures: `denies the author once the page is no longer visible to them` had been **passing**, and a blanket always-resolve auth mock turned a genuine denial into a pass-through. The harness now derives the auth mock from its own `visible` flag, so the denial is exercised again. This is the hazard of repairing an arity break with a uniform mock — it silently disarms exactly the tests that assert denial. Any future seam change must re-check deny-path specs individually.

## Defects found in the security sweep that belong to OTHER work

`npx jest test/security/` has 21 red suites. None are caused by this migration — both root causes are in files byte-identical to `main`:

1. **`careers.controller.ts → uploadResume` is an UNDECLARED route.** `route-classification-report.mjs` reports `UNDECLARED: 1`, which makes `bola-route-surface.spec.ts` fail because its subprocess exits non-zero. Per **BE-30** an exposure-less route *denies at boot*, so this is a live defect, not just a failing test. Needs `@Public` / `@Universal` / `@RequirePermission` / `@AuthorizedInService`.
2. **`notifications/notification-retention.service.ts` uses `sql.raw` without being in the reviewed allowlist**, failing the closed-set assertion in `injection-surfaces.spec.ts`. Either justify and add it to the allowlist or remove the dynamic identifier.

Both belong to another session's in-flight work. Flagged, not fixed, to avoid colliding with it.

## Shared-tree event

Midway through this work another session **committed these changes and moved the backend repo back to `main`** (`fe3d30809`, `a95777249`, `859b088b5`, merge `9bbe2a2a9`). Nothing was lost — every artifact is present in `HEAD` and 1165 is journalled — but the `feat/knowledge-base` isolation no longer holds for the backend repo. Confirm which branch you are on before further work.

## Pre-existing failures on this branch — established, not assumed

`npx jest src/modules/kb/` → **1004 passed, 7 failed, 132 suites** (3 suites red).

| Suite | Failure | Why it is not this work |
|---|---|---|
| `kb-version-append-only-migration.spec.ts` | an entry before migration **1078** has `when=1803000010169` > 1078's `1803000010156` | Pre-existing journal disorder early in the file. The appended 1165 entry is last at `1803000010591`, above every entry, and appending shifts no earlier index. |
| `kb-comment-permission-model.spec.ts` (5 tests) | `db.select(...).from(...).leftJoin is not a function` | The spec's own db mock lacks `leftJoin`; `kb-page-comments.service.ts` calls it. |
| `kb-acl-revision-reindex.spec.ts` (1 test) | `this.db.select is not a function` in `KbMembersService.loadWithUser` | The spec's own db mock lacks `select`. |

Evidence: every one of those five files is **byte-identical to `main`** (`git diff --quiet main -- <file>` returns clean), and each failure is a missing method on a mock object constructed inside the failing file, which no schema export or authorization change can influence. Both mock-shape suites also fail when run in isolation, so they are not the known concurrent-jest artifact.

`pnpm typecheck:test` → 21 errors, all in `careers/`, `hr/`, `recruitment/`; zero in `modules/kb`; none of those files appear in this branch's `git status`.

## Deliberate exclusions

Recorded as they are decided, with the doc line that authorizes each.

- Arbitrary page databases, board/calendar/timeline page views, autonomous publishing, duplicate wiki implementations, feature-specific infrastructure — **rejected** by `README.md` release order.
- Marketplace, template ratings, AI-generated decorative templates — **rejected** by `02-page-component-spec.md` §7.
- Page expiry/password on public links — **deferred pending demand** by `00-current-state-audit.md` route census.
- Owner groups / multiple accountable owners (`kb_page_owners`) — **not built in advance** per `05-data-api-search-security.md`.
- Grant `expires_at` — **added only when the product ships expiry**, same source.
- CRDT/OT collaborative editing — **requires measurement** per `04-backend-scale-architecture.md`.
- Tenant cells, table partitioning, service extraction, external search engine — **conditional stages**; not activated without a demonstrated trigger.
