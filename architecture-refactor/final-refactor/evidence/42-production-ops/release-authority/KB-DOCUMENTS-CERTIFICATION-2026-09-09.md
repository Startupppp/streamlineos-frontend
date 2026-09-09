# KB / Wiki (Documents) — consolidated current-head real-database acceptance, PRD-C133–C135

**This is a local co-located scratch-database acceptance run, not deployed evidence.** It is
`.md`, not `.json`, so `ops:evidence:check` / `manifest-readiness.mjs` will not read it as a
captured manifest. It consolidates the three KB checkboxes — **PRD-C133** (architecture/schema
tenant-composite integrity), **PRD-C134** (queries/cache/workers) and **PRD-C135**
(frontend/TanStack/tests) — which until now pointed only at the generic
[`RELEASE-RECORD-2026-09-04.md`](./RELEASE-RECORD-2026-09-04.md). That record contains **no
KB-specific evidence** (grep for `kb`/`knowledge`/`C133` returns only unrelated route-bundle
lines), so the three boxes had no dedicated acceptance record. This closes that.

The realistic-corpus latency and vector-recall halves of C134 already have dedicated evidence and
are **referenced, not re-run**, here:
[`KB-RETRIEVAL-LATENCY-HARNESS.md`](../../45-scale/KB-RETRIEVAL-LATENCY-HARNESS.md) and
[`KB-RETRIEVAL-RECALL-FLOOR.md`](../../45-scale/KB-RETRIEVAL-RECALL-FLOOR.md).

---

## 1. Run identity

| Field | Value |
| --- | --- |
| Operator | unattested — executed by an automated agent. No named human operator. |
| Date | 2026-09-09, local (IST) |
| Host | Windows 11, PostgreSQL **18.6** (msvc) on `127.0.0.1:5432`, Redis `:6379`, Upstash shim `:8079` |
| Database | local `scratch_local` (10 orgs, 592 users seeded), journal head **708/708** (last tag `1081_next_active_org_resolver`) |
| Roles | owner `neondb_owner` (BYPASSRLS); app `streamline_app` (`rolsuper=false`, `rolbypassrls=false`) |
| Backend HEAD | **`8a6737df2`**. Working tree was **dirty** — this task edited one spec (§7) and an unrelated `chat-entity-channel.controller.e2e-spec.ts` was already modified by another session. No git command was run; the SHA is HEAD, not an attested clean tree. |
| Env file | `D:\localstack\backend-local.env` (owner + app URLs, Upstash shim). Not deployed; not Neon. |

### Environment recovery this run performed (disclosed for reproducibility)

At session start every Postgres handshake to `127.0.0.1:5432` returned `ECONNRESET` while raw TCP
connected — a **wedged/orphaned postmaster** (PID 18136) held the port, the lock and a `ready`
`postmaster.pid`, but a clean restart had already failed with "lock file postmaster.pid already
exists". PG18's new `io_worker` forkchild (PID 35348) had survived a prior parent kill and held the
shared-memory segment ("pre-existing shared memory block is still in use"). Recovery: killed the
orphaned postmaster tree and the surviving `io_worker`, moved the stale pid file aside
(`postmaster.pid.stale-18136`), and started PG18 fresh via `pg_ctl -D D:/localstack/data18` — clean
recovery, "database system is ready to accept connections". The virabha peer's separate PG on
`:55432` was left untouched. **No scratch data was altered by the restart** (crash recovery only).

## 2. Commands run, with real exit codes

| # | Command | Exit | Headline |
| --- | --- | --- | --- |
| 1 | `db:verify-rls` (`DATABASE_URL=…/scratch_local`) | **0** | `RESULT: RLS VERIFIED` — all tenant tables incl. KB; 795-table `FORCE ROW LEVEL SECURITY` advisory, benign under this topology |
| 2 | `check-tenant-relationships.mjs` (`TENANT_RELATIONSHIP_DB_URL=…/scratch_local`) | **0** | `zero actionable single-column tenant FKs`; ledger 708/708 |
| 3 | live append-only bite (owner, savepoint-wrapped) | n/a | UPDATE substance / DELETE / TRUNCATE → **42501**; author redaction → allowed |
| 4 | `jest --config jest-db.json` `modules/kb/**.db.spec.ts` (`ALLOW_DESTRUCTIVE_DB_TESTS=1`) | **0** | **7 suites / 26 tests pass** (after §7 fix) |
| 5 | `jest modules/kb/` unit (ignore `.db`/`.e2e`) | **0** | **122 suites / 895 tests pass** |
| 6 | frontend `jest` KB set (wiki, help-centre, hooks/api/kb, query-keys, cursor) | **0** | **18 suites / 135 tests pass** |
| 7 | `run-seeded-e2e.ts scratch_local test/kb/*.seeded-e2e-spec.ts` | **0** | **3 suites / 8 tests pass** |

Total dynamic coverage: **1,064 tests + 3 structural gates, all green.** The raw `test:e2e`
(`jest-e2e.json`) runner was **not** used — it loads `.env` via `dotenv/config`, which can point at
a non-scratch DB and boot the real email path; the DB-pinned seeded helper was used instead.

## 3. PRD-C133 — architecture / schema tenant-composite integrity

**Verdict: VERIFIED at head.** All eight entity classes exist with a non-null `text org_id` and a
composite `(org_id, id)` anchor; child references are composite FKs to `(org_id, id)`.

- **spaces / memberships** — `kb_spaces`, `kb_space_members` (`db/schema/kb/spaces.ts`); composite FKs from `0635`.
- **documents / pages** — `kb_pages` (`db/schema/kb/pages.ts`), help-centre `kb_articles`/`kb_categories`; composite FKs from `0635`/`0653`; `kb_pages` carries the public-token RLS arm (`0384`).
- **immutable revisions** — `kb_page_versions`, `kb_article_versions`; DB-level append-only triggers from `1078` (bite proven, command 3).
- **attachments** — `kb_page_attachments` (explicit RLS added by `1044` — the one gap `db:verify-rls` had found), `kb_article_attachments`.
- **ingestion jobs** — `kb_import_jobs`, `kb_export_jobs`, `kb_sources` (`0636`).
- **chunks / embeddings** — `kb_article_chunks` (`vector(1536)`, 4 composite FKs from `0653`, `acl_revision NOT NULL` from `0665`, HNSW index), `kb_ingestion_checkpoints` (explicit RLS from `0701`).
- **deletion / reindex state** — `deleted_at` soft-delete on pages/spaces/sources/attachments; reindex modelled as `acl_revision`/`content_revision` columns + `kb_ingestion_checkpoints`.

Proofs: **RLS VERIFIED** (cmd 1) · **zero single-column tenant FKs** (cmd 2) · **append-only 42501
bite** (cmd 3) · `kb-version-append-only-migration.spec.ts`, `tenant-relationship-integrity.spec.ts`,
`kb-*-tenant-isolation.spec.ts` (in cmd 5).

**C133 carried gaps (design, not defects — do not "fix" without regression evidence):**
1. **No first-class reindex-state table** — reindex is `acl_revision`/`content_revision` + checkpoints, driven at runtime. By design.
2. **`kb_ingestion_checkpoints`** has no `(org_id,id)` anchor and no composite FK — it is a polymorphic `content_type`+`content_id` checkpoint/dedupe table; tenant integrity rests on `org_id` + RLS only.
3. **`tenant-relationship-integrity.spec.ts:79-100`** enumerates only `kb_article_comments` among KB pairs; the kb_pages/kb_spaces/kb_article_chunks/kb_*_versions composite FKs are proven by migrations + cmd 2 (structural gate) + service isolation specs, not by that unit spec's required-pairs list.
4. **RLS is never declared in Drizzle schema files** — it lives only in migrations, most KB tables via the dynamic `0378` sweep. Head-state RLS is asserted only by `db:verify-rls` (cmd 1), which requires a live DB.

## 4. PRD-C134 — queries / cache / workers

**Verdict: VERIFIED at head.**

- **Revision / search plans** — `kb-search.service.ts`, `kb-candidate.service.ts`, `retrieval/kb-retrieval-strategy.ts` (exact-vs-ANN crossover, `ef_search` scaling, recall floor); indexes in `db/schema/support/kb-chunks.ts` incl. HNSW. ACL-revision join gate (`kb-acl-revision-gate.spec.ts`).
- **Ingestion leases / retries / DLQ** — Redis lease (`kb-ingestion-lease.service.ts`, fail-closed when Redis absent), consumer heartbeat/release (`kb-ingestion-consumer.ts`), retry/backoff/DLQ on the shared outbox relay (`common/outbox/**`, DEAD at `OUTBOX_MAX_RETRIES=8`), stuck-source reaper.
- **Chunk dedupe** — content-hash skip (`kb-indexing.service.ts`) + delete-then-insert replace + outbox idempotency key. (Note: no DB unique constraint on chunk *identity*; dedupe is application-level + the `(org_id,id)` anchor. By design.)
- **Permission-aware cache keys** — `kb-acl-cache-key.ts` (`o<org>:p<permsVersion>:m<membership>:u<user>`, throws on ACL-blind key), consumed in `kb-access.service.ts`, invalidated by namespace.
- **Purge / reindex** — `kb-article-reindex.service.ts`, `kb-ingestion-delete-consumer.ts`, five-store purge (`kb-five-store-purge.spec.ts`), resumable trash drain (`kb-purge-drain-resumable.spec.ts`).
- **Realistic-corpus latency + recall** — referenced harness evidence (§ header). The recall floor `KB_RETRIEVAL_MIN_RECALL=0.95` is met by construction for tenants ≤ `KB_EXACT_SCAN_MAX_CHUNKS` (10,000) and is a **documented, accepted gap above that threshold** (40k-chunk tenant tops out at 0.8818 at cap 120); closing it needs an index change, not a query change, and is tracked in `KB-RETRIEVAL-RECALL-FLOOR.md`.

Proofs: cmd 4 (7 db-spec suites / 26 tests) · cmd 5 (895 unit tests incl. all lease/DLQ/dedupe/cache-key/strategy specs).

## 5. PRD-C135 — frontend / TanStack / tests

**Verdict: VERIFIED at head, with named coverage gaps.**

- **Editor / revision conflict** — `use-page-autosave.ts` (409 latch, patch merge, flush-on-unmount), `useUpdateKbPage` (carries `expectedContentRevision`; an unguarded write is not expressible). Fully covered.
- **Search cursors** — `useKbPageVersions`/`useKbSources` infinite cursor queries + `useCursorPageStack`. (KB *text* search is intentionally a single non-cursor query.) Fully covered.
- **Permission changes** — ACL-versioned query keys (`deriveAclVersion`) + per-hook `useCan` gating; discrimination and gating tested.
- **Citations / source integrity** — `kb-chat-parts.tsx` (dedup, page-only clickability), `handleCitationClick`→`pageHref`, Zod-validated citation/`x-kb-sources` contracts.
- **Ingestion states** — `SourceStatusBadge` (processing/failed/ready) + adaptive backoff polling (`kbSourcePollInterval`).
- **ACL / purge / reindex E2E** — cmd 7: `kb-acl-purge-reindex`, `kb-page-visibility`, `kb-stuck-source-reaper-isolation` seeded-e2e specs, 8 tests, real app boot against scratch_local.

Proofs: cmd 6 (18 suites / 135 tests) · cmd 7 (3 suites / 8 tests).

**Offline & accessibility acceptance (frontend item 2, run this session):**
- **Offline** — the shared offline contract KB rides (`lib/query-error-policy.test.ts`, `hooks/api/read-state-contract.test.tsx`): **2 suites / 24 tests pass**. KB's ask-sheet offline handling (`components/kb/kb-doc-ask-sheet.tsx`) and shared `use-online-status`/`use-run-when-online` back it.
- **Accessibility** — new suite `features/wiki/components/__tests__/kb-documents-a11y.test.tsx`: **7 tests pass**. `jest-axe` clean on the KB chat/citation surface (`ChatBubble` with page/source/article citations, user + error answers) and on the ingestion-state sources sheet (`KbSourcesSheet` processing/failed/ready + empty), plus semantic assertions (page-only navigable citation, dedup, source titles readable). This **closes former gaps 1 and 2** below.

**C135 carried coverage gaps (frontend unit, not release blockers — E2E covers the paths end-to-end):**
1. ~~No render test for `Citations`/`ChatBubble`~~ — **CLOSED** by the a11y suite above (page-only clickability + dedup asserted). `x-kb-sources` header parsing still untested at unit level.
2. ~~No render test for `SourceStatusBadge` state variants~~ — **CLOSED** by the a11y suite above (processing/failed/ready rendered and axe-clean).
3. No unit test for the purge/reindex hooks (`useHardDeleteKbPage`, `useEmptyKbTrash`, `useReindexSupportKbArticle`, `useSupportKbIndexStatus`) — exercised only via the seeded E2E (cmd 7).
4. No test proving active-query invalidation on a *mid-session* permission change (relies on the org/user-scoped cache remount).
5. **Full-surface KB accessibility is not complete here.** The axe suite covers the chat/citation and ingestion surfaces; the Plate editor, search results and keyboard-nav / screen-reader *flow* (which axe cannot assess) remain browser-acceptance work, rolled into the system-wide **PRD-C138** accessibility checkbox, which is itself still open.

## 6. Fix landed by this task

`src/modules/kb/wiki/kb-source-ingestion-durability.db.spec.ts` was **red at head**: its
`Test.createTestingModule` did not provide `KbAccessService`, a dependency `KbSourcesService` had
since gained (`assertArticleViewable`), so all 4 durability tests errored at module compile — a
stale-test-wiring regression, not a production defect. Added `KbAccessService` as a `useValue` seam
(the spec's own stated pattern for a collaborator not under test; the durability paths do not call
`assertArticleViewable`). All 4 tests now pass (cmd 4).

## 7. What this run does NOT claim

- **Not deployed evidence.** Local Windows PostgreSQL 18.6, not Neon, not a cell. No production numbers.
- **Not a clean-tree attestation.** HEAD `8a6737df2` with a dirty working tree; no git command was run.
- Latency/recall are referenced from prior harness runs; they are host-variance-sensitive and are read in buffers, not milliseconds (see the referenced docs).
- **Lint and typecheck were not run** — reported as not run, never as passing.
- **The deployment-gated Documents items remain open and are NOT closed here** — deployed private-storage/search/vector/cache deletion, retention, legal-hold and erasure **drills** (register **D06**) and **Privacy/Legal named approvals** (register **D03/D08**) cannot be manufactured from a local scratch database and are deferred per [`CODE-RELEASE-HUMAN-INPUTS.md`](../../../../decisions/CODE-RELEASE-HUMAN-INPUTS.md). Code-level acceptance being green does not close them.
