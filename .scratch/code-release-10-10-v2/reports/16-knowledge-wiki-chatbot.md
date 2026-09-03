# 16 — Knowledge Base, Wiki and Chatbot (PRD-C133 / C134 / C135)

Backend HEAD at start: `591cf663`. No boxes ticked — findings and proofs only, per instruction.

---

## 1. The KB `provider-in-transaction` violations — 4 of 6 fixed

`check:placement-bypass` reported **55** pre-existing `provider-in-transaction` violations across 24
controllers, allowlisted as UNAUDITED. **Six were mine.** Each is a handler holding a pooled database
connection across a network round trip to an AI provider, against the 60s
`idle_in_transaction_session_timeout` `withTenant` sets — so a slow provider does not merely make one
request slow, the server kills the transaction while the borrow is outstanding, which under pool
pressure is a tenant-wide failure shape rather than a latency one.

### Fixed (4 handlers, 2 controllers)

**`kb-authoring.controller.ts` — `draft`, `improve`, `summarize`.** The simplest of the six:
`KbAuthoringService.run` awaits `gateway.invokeTextWithUsage` and reads **no tenant row at all**
before it — the prompt is built entirely from the request body. Added `@NoTenantTransaction()` to
each handler and `@UseInterceptors(AiRequestAbortInterceptor)` on the class (the decorator removes
the tenant context's disconnect signal `getAmbientAiAbortSignal` reads, so the interceptor restores
cancellation — the same pairing `KbArticleAiController` uses).

The only database access on that path is the `kb_events` write *after* the call. **`kb_events` is
RLS-enabled** — verified in `pg_class` on `scratch_gates_head` (`relrowsecurity = t`) — so a bare
insert with no GUC would have died 42501. Rather than patch one caller, `KbEventsService.record` now
wraps its insert in `runInTenantTransaction(db, fn, { orgId })`. That reuses an ambient request
transaction when one exists (so all nine other KB callers are unaffected), gives the decorated routes
a short transaction of their own, and — a bonus — **refuses an `orgId` that disagrees with an ambient
context**, turning what would have been a cross-tenant write into a throw.

**`kb-ask.controller.ts` — `askQuestion`.** The largest hold of the four: `KbAskService.ask` ran a
vector retrieval *and* the provider call inside one request transaction. Split into three short
tenant transactions:

1. `gatherContext` — `orgHasIndexedContent`, `retrieveTopArticles`, `retrieveTopSources`,
   `retrieveAttachmentSnippets`, prompt assembly — **commits before** the provider call.
2. the provider call, holding nothing.
3. the `kb_events` write and `resolveCitations` in one transaction afterwards.

The controller's own three writes (conversation create, two `appendToConversation`) each open their
own. **The ACL filtering is unchanged and still in the SQL predicate on both sides** (backend
CLAUDE.md §4), so the post-call citation re-verification still runs under the asker's own visibility.
One deliberate semantic change, documented in the code: creating the conversation is no longer atomic
with the answer — it cannot be, the provider call sits between them — and an empty conversation left
by a failed answer is a better outcome than a connection pinned across the provider.

Both carry allowlist entries with reasons in `check-placement-bypass.mjs`, matching the house format.

**Measured effect:** KB `provider-in-transaction` entries **6 → 3**; repo total **55 → 49**.

### Not fixed (3 handlers) — needs a design decision, reported not built

`kb-media.controller.ts#upload`, `kb-sources.controller.ts#upload`, `kb-sources.controller.ts#createNote`
— all three reach `KbAttachmentIndexingService.embedInBatches → AiGatewayService.embedBatchWithCredit`.

`kb-sources.service.ts` already defers via `registerAfterCommit`, so the provider call is **not** in
the *request* transaction — the static gate cannot see that indirection. But the
`TenantContextInterceptor` drains every after-commit hook inside
`runInNewTenantTransaction` (`tenant-context.interceptor.ts:112-119`), so the embed still runs inside
a transaction, just a different one. For a 25 MB PDF with many chunks that transaction can outlive the
60s idle timeout.

Fixing it properly needs one of: (a) a durable ingestion job table with lease/retry — a **schema
change**, which I am to report rather than make; or (b) a change to the after-commit wrapper in
`src/common/tenant/**` — outside my territory. **Reported, not built.** See §3 for why (a) is the
right shape.

### A live defect found while looking — KB page documents were never indexed

`kb-media.service.ts:159-165` fired the indexing as a bare `void`-with-`.catch`:

```ts
this.attachmentIndexing.indexPageDocument(u.orgId, pageId, buffer, mimetype, originalname)
  .catch((err) => { this.logger.error(...) });
```

This is root CLAUDE.md §4's named trap and it was doing real damage. The promise inherits the
request's AsyncLocalStorage context, and `createTenantAwareDb` (`common/tenant/tenant-db.ts:19-22`)
resolves `this.db` to `context.tx`. By the time the extract and the embedding round trip finished,
the handler had returned and that transaction had **committed** — so `indexPageDocument`'s own
`db.transaction(...)` ran on a dead handle. The `.catch` swallowed it into a log line. **Page-document
uploads reported success and were never searchable.**

Fixed by moving to `registerAfterCommit` (backend CLAUDE.md §4 case 3 — the attachment row is already
committed and carries the file key, so a crash before indexing is re-drivable from stored state),
with an inline fallback when there is no ambient context, and deliberately **not** swallowing: the
drain reports a rejection, and a silent indexing failure is exactly what hid this.

This one is not visible to `check:placement-bypass` at all — its static walk models the call chain,
not the `void`. Worth noting as a gate-reach gap in a gate I otherwise relied on.

---

## 2. C134's headline item: permission-aware cache keys — VERIFIED, not a defect

This was flagged as the thing to probe hardest. **It is already correct, and I verified rather than
re-derived it.**

KB has exactly **one** cached read: `KbAccessService.getAccessibleSpaceIds`
(`kb-access.service.ts:65`), namespace `kb:acc-spaces:${orgId}`, key from `kbAclCacheKey`
(`kb-acl-cache-key.ts:6-13`) = `p<permissionsVersion>:m<membershipId>:u<userId>`. It **throws** rather
than build an ACL-blind key. `kb-acl-cache-key.spec.ts` pins all four dimensions including a bite test
that a revoked `kb:spaces:manage` stops serving the admin-wide list.

I checked the two ways it could still be wrong, and neither is:

- **Space-membership changes** don't move `permissionsVersion`, but `kb-members.service.ts:116,152`
  and `kb-spaces.service.ts:136,192,244` all call `invalidateAccessibleSpaceIds`.
- **Org-membership revocation** deletes `kbSpaceGrants`
  (`org-membership-access-revocation.ts:194`) and does **not** call
  `invalidateAccessibleSpaceIds` — but all three callers
  (`org-membership.service.ts`, `org-member-departure.service.ts:163,290`,
  `org-membership-status.service.ts:254`) call `bumpPermissionsVersion` in the same flow, which
  rotates the key and makes the stale entry unreachable. Covered, via the version dimension rather
  than the namespace.

**Is any KB namespace the `chat:unread` shape (invalidation bumps pinning a deleted read)?** I scanned
**684 files / 46 cache call sites** across `kb/`, `hr/`, `directory/`, `search/`. **No KB namespace has
that shape** — `kb:acc-spaces` is the only one and it has both halves. Two HR namespaces do; they are
in report 07 §3.

**An adjacent finding of the inverse shape:** `kb_space_grants` has **no writer anywhere in the
application**. It is read by `computeAccessibleSpaceIds:126-137`, deleted by org-membership
revocation, and written only by `src/scripts/verify-membership-revocation.ts`. The explicit per-user
space-grant ACL branch is permanently empty in production — a live read pinned by a deletion path
with no creation path. Reported, not deleted (root §10 needs a module-graph proof, and `knip` is
misconfigured here so I make no dead-code claim from it).

---

## 3. C133 / C134 architecture findings

**Ingestion has no lease, no retry, no DLQ.** There is no ingestion-job table. `kb_sources.status`
(`processing` / `ready` / `failed`) *is* the ingestion state machine, and it is advanced by an
in-process after-commit hook. Consequences: a process restart between commit and drain leaves a
source stuck in `processing` forever with nothing to reclaim it; there is no attempt counter and no
dead-letter path; and `processText`'s failure branch writes the `failed` status through
`.catch(() => undefined)` (`kb-sources.service.ts:221`), so a failure to record a failure is silent.

This is the same root cause as the three unfixed `provider-in-transaction` sites. **The single change
that fixes both is a durable ingestion job table with a lease column, an attempt counter and a
terminal DLQ state, drained by a worker that embeds outside any transaction and writes inside a short
one.** That is a schema change, so I am reporting it rather than making it. `kb_import_jobs` and
`kb_export_jobs` already exist and are the shape to copy.

**Verified rather than re-derived, per the brief:** de-indexing on delete is correct in all three
places — `softDelete` purges the subtree's chunks in the same transaction, `indexPage` de-indexes
defensively, and restore re-indexes — and `kb-indexing.service.ts` now carries the
`isNull(kbPages.deletedAt)` predicate so a reindex request for a trashed page no longer answers
`200 {"reindexed":true}`. I did not touch any of it. I also did not undo the AI controllers'
tenant-read-before-provider restructure or their `AiRequestAbortInterceptor`; the two fixes above
follow that same pattern deliberately.

**Citations/source integrity (C135)** is already sound and I left it alone: `resolveCitations`
re-verifies every candidate against `resolveVisibleArticles` / `resolveVisiblePages` /
`resolveVisibleSources` **after** the model answers, so a chunk that entered the prompt cannot appear
as a citation the asker may not open. My phase split preserves this — it runs in phase three, under
the same predicates.

**KB reading is genuinely universal.** `kb` is `planGated: false`, `ladder: "universal"`
(`module-registry.ts:117-129`), and `isCoreModuleKey` returns true for any non-plan-gated module
(`module-registry.ts:458`), so `ModuleGuard` cannot block it. The `<RequireModule module="kb">`
wrappers on eleven `/knowledge/**` pages are therefore **no-ops** — redundant rather than wrong, but
they read as a gate that does not exist. Not removed; flagged.

---

## 4. Commands run — literal, with exit codes

| command | exit | number produced |
|---|---|---|
| `pnpm typecheck` (backend, via `heavy.sh 2`) | **0** | 0 `error TS` lines |
| `pnpm check:spec-typecheck` | **0** | passed |
| `pnpm exec jest --runInBand --testPathPattern="modules/(kb\|hr)/"` | **0** | 308/308 suites, 1983/1983 tests |
| `pnpm check:placement-bypass` | **1** | KB provider-in-tx **6 → 3**; repo 55 → 49; red only for `e-sign` + `timesheets` |
| `pnpm check:cache-invalidation` | **0** | — |
| `pnpm check:type-assertions` | **1** | red for `common/cache/*` + `scripts/*`, not mine |
| `pnpm check:route-classification` | **0** | — |

**Three KB specs failed on my first run and I fixed them properly rather than around them.**
`kb-ask.service.spec.ts`, `kb-ask-tenant-isolation.spec.ts` and `kb-source-citation.spec.ts` all
mocked `db` with no `.transaction`, so once `runInTenantTransaction` really opened one they threw
`regional.transaction is not a function`. The doubles now provide a `transaction` that **invokes its
callback** (backend CLAUDE.md §8 — a bare `jest.fn()` silently voids every assertion inside). One
assertion also had to change from `mockResolvedValueOnce` to `mockResolvedValue`: `withTenant` issues
its own `SELECT set_config(...)` first, which would have consumed the `Once` and quietly inverted the
test. That is a real behavioural consequence of the fix, so the spec now states it.

**Gate reach, measured both ways** (the brief's requirement):

- My independent source walk: **559 controller files, 574 `@Controller` decorators, 3,661 handlers**
  — cross-checking `openapi.json`'s **3,642 operations** to within 13 spec probes.
- Cache scan: **684 files, 46 cache call sites**, enumerated by namespace with reads and
  invalidations paired.
- `check:type-assertions` scans 3,648 application files and **excludes `*.spec.ts` by design**
  (`SKIP_FILE`, line 108) — so spec-side assertions are enforced nowhere. Relevant because my spec
  fixes sit in that blind spot.
- `check:placement-bypass` enumerates 147 bypass sites. Its blind spot is now demonstrated, not
  assumed: it did **not** see the `kb-media.service.ts` fire-and-forget in §1, because it models the
  static call chain and not the `void`.

I did **not** run `knip` and make no dead-code claim resting on it.

---

## 5. Honest gaps

- **C134 realistic-corpus latency: not run.** No benchmark of revision/search plans against the
  `perf_kb_*` tenants this pass. No buffer measurements taken for KB.
- **C135 ACL/purge/reindex E2E: not run.** Editor/revision conflict and search-cursor behaviour were
  not exercised.
- **Chunk dedupe (C134): not audited.** `indexSource` deletes and re-inserts the whole chunk set per
  source; whether unchanged content is re-embedded (CLAUDE.md §7: hash the source text, not the
  rejoined chunks) was **not verified**.
- The three remaining `provider-in-transaction` sites are reported with a design, not fixed.
- Frontend `features/wiki/**` and `features/help-centre/**` were **not audited**.
