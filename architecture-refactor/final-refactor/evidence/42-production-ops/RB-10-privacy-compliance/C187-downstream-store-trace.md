# PRD-C187 — downstream deletion trace for a single subject

> "Prove **deployed** object/search/vector/cache/downstream deletion plus backup aging and
> restore-time deletion."

Backend `45f8a2e9`. All line references are to `streamlineos-backend/`.

## The deletion path being traced

A subject erasure enters at `GdprSubjectErasureService.eraseSubject`
(`src/modules/gdpr/gdpr-subject-erasure.service.ts:92`) and does, in order:

1. `findActiveLegalHold` (`:241`) — refuses while a hold is active.
2. `storagePurge.buildManifest(subjectUserId, [orgId])` (`:126`) — **before** the transaction,
   because an anonymised `*_key` column no longer names the object it pointed at.
3. One DB transaction (`:155-213`): identity redaction, authored content, chat attachments,
   support tickets + their embeddings, export artifacts, KB content, the `hr_data_requests`
   completion row, the `subject.data.erased` audit row, `bumpPermissionsVersion`.
4. `bustMembershipStatusCache(this.cache, subjectUserId)` (`:215`).
5. `sessionsService.revokeAllForUser(subjectUserId)` (`:216`).
6. `storagePurge.purgeFromManifest(...)` (`:218`) — **after** the commit.

The whole-org path is separate: `PURGE_ADAPTER_REGISTRY`
(`src/modules/organization/core/lifecycle/organization-purge-adapters.ts:60`).

---

## 1. SEARCH INDEX — **DELETION PROVEN**

There is **no external search engine in this deployment**. `grep -riE
"meilisearch|typesense|elasticsearch|opensearch|algolia"` over `package.json` and all of `src`
returns nothing. Search is Postgres full-text: exactly two `tsvector` columns exist —
`kb_pages.fts` and `kb_articles.fts` — and both are `GENERATED ALWAYS … STORED`, indexed by
`idx_kb_pages_fts` / `idx_kb_articles_fts` (GIN), on the same physical rows.

Proven, not argued — `runs/17-search-vector-deletion-probe.txt`, with `enable_seqscan = off`
so a "0 rows" answer cannot come from a table scan:

```
--- plan must be an index scan on idx_kb_pages_fts:
 Bitmap Heap Scan on kb_pages
   ->  Bitmap Index Scan on idx_kb_pages_fts
--- rows found BEFORE delete (expect 1):   rows_before = 1
DELETE 1
--- rows found AFTER delete (expect 0):    rows_after  = 0
```

The purge registry's own claim (`organization-purge-adapters.ts:300-307`,
`state: NOT_APPLICABLE`) is **accurate** and is now backed by a measurement.

## 2. VECTOR STORE — **DELETION PROVEN**

No external vector database (`pinecone|weaviate|qdrant|chroma|milvus` absent from
`package.json`). Four `vector` columns exist, all pgvector inside the same Postgres:
`kb_article_chunks.embedding` (HNSW, `idx_kb_chunks_embedding_hnsw`),
`kb_ingestion_checkpoints.embedding`, `support_ticket_embeddings.embedding`.

Measured through the HNSW index — same probe, `runs/17`:

```
 Index Scan using idx_kb_chunks_embedding_hnsw on kb_article_chunks
--- nearest-neighbour hit BEFORE delete:   id=1  "zqxwvutsrp vector probe chunk"
DELETE 1
--- nearest-neighbour hits AFTER delete:   chunks_after = 0
```

All three vector tables are reached by the subject path:
`kb_article_chunks` and `kb_ingestion_checkpoints` via `eraseSubjectKbContent`
(`src/modules/gdpr/gdpr-subject-erasure-authored-content.ts:111`, chunk deletes at `:140`,
`:175`, `:207`, checkpoint clearing via `clearCheckpoints` at `:92`);
`support_ticket_embeddings` via `anonymiseSubjectSupportTickets`
(`gdpr-subject-erasure.service.ts:180-182`). The org path deletes and re-counts
`kb_article_chunks` and only then reports `CONFIRMED`
(`organization-purge-adapters.ts:308-338`).

## 3. OBJECT STORE — **DELETION IMPLEMENTED BUT UNPROVEN**

Implemented, and implemented carefully:

- `GdprStoragePurgeService.purgeFromManifest`
  (`src/modules/gdpr/gdpr-storage-purge.service.ts:101`) retries each delete
  `STORAGE_DELETE_ATTEMPTS = 3` times (`:31`, `:143-152`) and then **verifies absence with a
  provider-side HEAD** (`:157-160`) before counting the key as deleted.
- `StorageService.deleteFile` (`src/modules/storage/storage.service.ts:243`) issues a real
  `DeleteObjectCommand`; `fileExists` (`:329`) a real `HeadObjectCommand`.
- Three sinks the FK catalogue cannot reach on its own are handled explicitly, each with the
  reason recorded in the code: `gdpr_export_jobs` — the subject's own complete data dump —
  (`gdpr-subject-erasure.service.ts:131-139`), `chat_attachments`
  (`:160-170`), and org-scoped keys, which are deliberately *skipped* rather than deleted because
  they are not subject-attributable (`gdpr-storage-purge.service.ts:36`, `:135-138`).
- The org path enumerates, deletes, retries and re-lists to confirm zero remaining
  (`organization-purge-adapters.ts:91-290`).

**Why UNPROVEN:** no bucket exists on this machine. `drill:export` says so itself
(`runs/02`, "Blob download: requires R2 credentials"), and `drill-storage-purge.mjs` has a
`--self-test` that proves its four assertions *bite* (`runs/10`, all 4 PASS) but its `liveTest()`
requires `R2_BUCKET_NAME`/`R2_ENDPOINT`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY`. **A deployed
bucket is the only thing that can close this.** The single command to run there is
`node src/scripts/drill-storage-purge.mjs` (no flags).

Two residual weaknesses are visible in the code without a bucket, recorded as **F-5** and **F-6**
in `FINDINGS.md`: the purge runs *after* the transaction commits with no outbox or retry, and a
non-zero `failed` count is returned to the caller but never re-queued.

## 4. CACHE — **PARTIAL: implemented for identity, NOT DELETED for directory-shaped PII**

Redis, via `CacheService`. The repository keeps a formal registry of every cache namespace and
what invalidates it: `src/common/cache/cache-invalidation-matrix.ts` (+ `-rbac-auth`, `-crm`,
`-finance`, `-inventory`).

**Busted on erasure** — `GdprSubjectErasureService.erase` appears in that registry at exactly one
place, `src/common/cache/cache-invalidation-rbac-auth.ts:79`:
`membership:account:<userId>` and namespace `membership:status:<userId>`
(`src/common/auth/membership-state.service.ts:42-53`). `bumpPermissionsVersion`
(`gdpr-subject-erasure.service.ts:212`) additionally rolls the org permissions version, which is
mixed into the `search:<orgId>:<userId>` key hash (`src/modules/search/search.service.ts:122`),
so cached search results are invalidated as a side effect. Sessions are revoked at `:216`.

**Not busted** — these namespaces hold the erased person's name and other directory PII and are
declared in the registry as invalidated by *other* events only, none of which erasure raises:

| Namespace | Contents | Declared trigger | TTL | Residual |
|---|---|---|---|---|
| `hr:directory:<orgId>` | employee directory entry | `OrgHierarchyCacheService.invalidateAfterMutation` (matrix `:31`) | `MEDIUM` = 300 s (`org-structure.service.ts:40`) | ≤ 5 min |
| `hr:celebrations:<orgId>` | **name + birthday / work anniversary** | `EmployeeOnboardingService` / `TerminationLifecycleService` (matrix `:40`) | `MEDIUM` = 300 s (`celebrations.service.ts:138`) | ≤ 5 min |
| `hr:employees:list:<orgId>` | paginated employee list | HR employee mutations (`employees.service.ts:71`) | `SHORT` = 30 s | ≤ 30 s |
| `org:members:list:<orgId>` | org member list | invitation / departure / role change (matrix `:155`) | versioned | until next member write |
| `org:profile:<orgId>:<userId>` | per-user org profile | settings / role / departure (matrix `:143`) | versioned | until next such write |

The residual is **bounded and self-expiring** for the TTL rows, which is why this is graded P2 and
not P1 — but `org:members:list` and `org:profile` are *generation-versioned*, not TTL'd, so their
stale entry survives until some unrelated membership write happens to bump the generation.

The whole-org purge adapter asserts `cache: NOT_APPLICABLE` because "org-scoped cache keys carry a
TTL" (`organization-purge-adapters.ts:292-299`). For the **org** path that is defensible. For the
**subject** path it is not the same claim, and no adapter covers the subject path.

**Not provable here beyond the static trace:** a local Redis answers `PING`, but the application's
configured cache is a remote Upstash instance and the app is not running, so no live key
enumeration was performed. **The deployed run is `KEYS hr:celebrations:<orgId>:*` immediately after
an erasure.**

## 5. DOWNSTREAM — **NOT DELETED** (P1, see F-7)

Erasure touches **none** of the delivery-side stores. `grep -riE
"emailOutbox|notificationDeliver|outboxEvents|webhookDeliver|userIntegrationConnections|composio"`
over `src/modules/gdpr/` matches only the **export** fetchers
(`gdpr-export-fetchers-notifications.ts:123`) — i.e. these tables are read *into* a subject's
export and never written on erasure.

What they retain, from the live catalogue of `scratch_head_1010`:

| Table.column | Holds | Cleared by | Bound |
|---|---|---|---|
| `email_outbox.to_email` | the subject's **live e-mail address** | `CronNotificationRetentionService` record delete | `RETENTION_RECORD_MONTHS = 13` (`cron-notification-retention.service.ts:20`) |
| `email_outbox.html` / `.text` / `.subject` | rendered message bodies | same worker, body purge | `RETENTION_BODY_DAYS = 90` (`:19`) |
| `notification_deliveries.recipient_address` | the subject's address | same worker | 13 months |
| `notification_deliveries.rendered_body` / `.rendered_subject` | rendered bodies | same worker (`:95-106`) | 90 days |
| `outbox_events.payload` | event payloads, may embed PII | `CronOutboxRetentionService`, terminal states only | 30 days |

So after a completed erasure the subject's e-mail address is still readable in `email_outbox` for
up to **13 months** and their message bodies for up to **90 days**. Ageing out on a retention
schedule is not erasure.

Three further downstream classes are hard-coded as unresolved in the org purge registry and have
no subject-path equivalent at all:

- `analytics_copies` — `failedAdapter("Analytics warehouse client not wired; manual cleanup
  required")` (`organization-purge-adapters.ts:340`).
- `provider_mirrors` — `failedAdapter("No Composio client available at purge time to reconcile or
  disconnect provider accounts in user_integration_connections")` (`:344`).
- `audit_evidence` — `NOT_APPLICABLE`, "retained per legal obligation" (`:352`). This one is a
  deliberate, correct exemption, not a gap.

## 6. BACKUP AGING and RESTORE-TIME DELETION — **not assessable on this machine**

`backups: failedAdapter("Backup system not configured; manual verification required before marking
CONFIRMED")` (`organization-purge-adapters.ts:348`). There is no backup system, no PITR window and
no restore target here, so there is nothing to age and nothing to restore. `drill:pitr` exists
(`src/scripts/drill-pitr-restore.mjs`) with a `--self-test` sibling; the live half needs a
provider. **This half of PRD-C187 is (B) blocked on a deployed environment in full** — it was not
attempted and no result is claimed for it.

---

## Summary

| Store | Verdict |
|---|---|
| Search index | **DELETION PROVEN** — measured through the GIN index, `runs/17` |
| Vector store | **DELETION PROVEN** — measured through the HNSW index, `runs/17` |
| Object store | **DELETION IMPLEMENTED BUT UNPROVEN** — real delete + HEAD verify + 3 retries; no bucket exists here |
| Cache | **PARTIAL** — identity/session/search invalidated; `hr:directory`, `hr:celebrations`, `org:members:list`, `org:profile` **not** invalidated (F-8, P2) |
| Downstream (email/notification/outbox) | **NOT DELETED** — address survives ≤ 13 months, bodies ≤ 90 days (F-7, P1) |
| Downstream (analytics, provider mirrors) | **NOT DELETED** — adapters hard-coded FAILED, no subject-path equivalent (F-9, P2) |
| Backups / restore-time deletion | **Not assessable** — no backup system exists on this machine |
