# Deferred-items lane — closing out the two prior lanes

**Opened:** 2026-09-20 · **Owner:** backend
**Absorbs and replaces:** `2026-09-19-tenant-connection-hold-prd.md` · `2026-09-20-read-cost-lane.md`
Both were 100% ticked with their acceptance met, so they were deleted on 2026-09-20 and their durable content folded in below (§A, §B). Recover either with `git show HEAD:docs/specs/<name>.md`.

Both prior lanes are 100% ticked. What remains is their **deferred** tables. A deferral is a claim, and a claim can be wrong — so each item below is re-tested against source before it is either implemented or re-deferred with a sharper reason.

The governing constraint is unchanged: `DB_POOL_MAX` is 15, and an authenticated request holds one pooled connection for its whole life. Every second spent in a provider call inside that transaction is a second no other request in the process can reach the database.

## Rules for this lane

- Re-verify the deferral's stated reason first. If the reason is wrong, say so and record the real one.
- Exclusive file ownership per agent. The coordinator verifies every diff and owns the shared tenant primitives.
- No change to a caller's observable failure contract without enumerating every caller that depends on it.
- An item that genuinely needs a live database stays deferred with the exact steps to certify it. Production credentials are not loaded to make a check pass.

---

## Todo

- [x] **R1 — inline email send holds the pooled connection for the provider call**
  *Premise: **WRONG**, and the item was understated.* PRD §7 framed this as "~75 call sites, its own lane". All 75 already funnel through `EmailService.sendEmail` → `EmailOutboxService.enqueueAndTry` (`email.service.ts:30-32`), so the seam is **one method, not 75**. The real offender is a path the PRD never named: `AutomationEmailService.send` (`automation-email.service.ts:31`) bypassed the outbox entirely and called `EmailProviderService.dispatchEmail`, which retries **3 × 30s with 1s+2s backoff plus a 30s fallback provider** (`email.provider.ts:15-18, 323-370`) — a worst case near **123 seconds** holding one of 15 pooled connections, reached from request-path services that `await` automations inside the request transaction (`deals.service.ts:60`, `sign-integrations.service.ts:48`, `employee-onboarding.service.ts:82`).
  *Files touched:* `src/modules/email/email.provider.ts` (`sendEmailOnceDirect` gains an optional budget) · `src/modules/email/email-provider-selection.ts` (`EmailDispatcher`) · `src/modules/email/email-outbox.service.ts` (`INLINE_SEND_BUDGET_MS`, `rowReproducesSend`) · `src/modules/automation/automation-email.service.ts` · `src/modules/email/email-outbox.service.spec.ts` (+6 tests) · `src/modules/automation/automation-email.service.spec.ts` (new, 3 tests)
  *Result:*
  1. **The inline attempt is now bounded by a connection-hold budget, not a delivery timeout.** The outbox row commits *before* the provider call and the cron drain owns delivery, so the inline attempt is only a latency optimisation — its budget belongs to the pool, not the provider. `INLINE_SEND_BUDGET_MS = 5_000` against 30s. An overrun raises the existing transient error, so the row simply stays PENDING for the drain: **no caller contract changes**.
  2. **Automation mail is now durable.** It previously went straight to the provider with no outbox row, so a failed automation email was **lost**. It now enqueues first, which also subjects it to the platform suppression list (hard bounces) it had been skipping — `email-suppression.service.ts:19` claims to cover "all 75 direct-send call sites", and this one was outside that claim.
  3. Worst-case hold on an automation email path: **~123s → ~5s**.
  *Correctness defect found and fixed on the way:* the retry rule only guarded `attachments`, but the outbox row stores just `to/subject/html/text/recipientUserId`. A transient failure therefore re-sent **without** `cc`, `bcc`, `replyTo` or `headers` — meaning a retried CRM marketing email lost its RFC 8058 `List-Unsubscribe`, and a retried approval email silently dropped its cc. Generalised to one rule, `rowReproducesSend`: if the row cannot faithfully reproduce the message, it is never retried. Pinned by *"refuses to retry a send carrying headers, because the drain would redeliver it without its List-Unsubscribe"*.
  *Deliberate trade, stated:* automation mail loses `dispatchEmail`'s in-request provider fallback (zeptomail↔resend) and gains durable cron retry. The cron drain also uses `sendEmailOnceDirect`, so this makes automation mail behave like all other mail rather than introducing a new failure mode.
  *Verified:* no comment added, no cast added in production code. `jest src/modules/automation src/modules/email src/modules/crm/consent` → **310 passed / 310**, 31 suites. `new AutomationEmailService(` has **zero** construction sites outside the new spec (every other spec injects a `useValue` double), so the added constructor parameter breaks no arity. `EmailModule` is `@Global()` and already exports `EmailOutboxService`, so no module wiring changed and no import cycle is created.

- [x] **R2 — upload antivirus scan holds the connection for up to 10s**
  *Premise: CONFIRMED in shape, WRONG on magnitude and on the work required.* The bound is not 10s but **35s** — ClamAV is `CONNECT_TIMEOUT_MS = 5_000` + `SCAN_TIMEOUT_MS = 30_000` (`clamd-av-scanner.ts:5-6`); only the VirusTotal path is 10s (`virustotal-av-scanner.ts:16`). And the stated work ("needs every `this.db` touch on the path wrapped") was **already done** — both upload handlers were written with every database touch inside an explicit `runInTenantTransaction(..., { orgId })` and every non-database step in `runOutsideTenantContext`. The opt-out decorator was the one missing piece of a design already in place.
  *Files touched:* `src/modules/storage/storage.controller.ts` (`@NoTenantTransaction()` on `upload`) · `src/modules/storage/storage-onboarding.controller.ts` (same) · `src/modules/storage/storage-av-gate.spec.ts` (+2 tests)
  *Result:* the scan, the magic-byte check and the object-store round trip now run with **no pooled connection held**. Worst case per upload: **35s → 0s** of connection hold across the scan.
  *Coordinator verification (the agent only checked the controller files, which is not sufficient):* I traced every call reachable from both handlers outside a wrap. `storage.controller.ts` is clean — the scan at `:161` sits between two wrapped blocks, and the author's own note at `:258-265` shows the design was already built for exactly this. `storage-onboarding.controller.ts:100` calls `this.storage.planUpload` **outside** the wrap, which looked like a live no-GUC defect; it resolves to `StoragePlacement.forOrg` → `RegionRegistry.storageForOrg` (in-process cached, control-plane read). That read is already performed with no ambient tenant transaction on **every** request — `with-tenant.ts:117` calls `resolvePlacement` before opening the transaction — so it is safe by construction, not by luck. Everything else before the wrap is validation.
  *The ratchet from the previous lane caught my own change, and it was right to.* Opting `upload` out made `storage.controller.ts` a controller that carries `@NoTenantTransaction()`, so `check:ai-route-tenant-optout`'s file-local rule correctly flagged its two siblings `download` and `image` and **went red (exit 1)**. Those two were the same defect: `assertKeyReadable` (pure database) and `openStream`/`getFileUrl` (pure object store) both ran under one held connection. Fixed rather than frozen — both now carry `@NoTenantTransaction()` with `assertKeyReadable` wrapped in `runInTenantTransaction`. Gate back to green at **65 frozen**, unchanged.
  *Second coordinator fix:* that change broke **35 tests across 5 specs** — all cross-tenant isolation tests on the download/image paths, which must keep asserting. Repaired with the callback-invoking module mock so every 404 and every "never opens the byte stream" assertion still runs.
  *Also corrected:* my first gate run reported `EXIT=0` because `$?` was reading the exit status of `tail` through the pipe, not of node. The gate was red the whole time. Re-checked without the pipe.
  *Verified:* `jest src/modules/storage` → **273 passed / 273**, 26 suites.
  *Not certified:* that each inner `runInTenantTransaction` sets its GUC correctly once the interceptor is opted out. Needs one real upload and one real download against a live RLS-enabled database.

- [x] **R3 — kb-media sharp transform runs inside the request transaction**
  *Premise: **WRONG** — it named the wrong file and the wrong problem.* PRD §7 blamed `MediaTransformRunner` being fire-and-forget. **`MediaTransformRunner` does not appear in `kb-media.service.ts` at all**; that class belongs to `storage.controller.ts`. The `sharp` call here is a plain inline `await`. The real cost is that three expensive steps run while the pooled connection is held: the AV scan (`:113`), the CPU-bound encode (`:126`) and the object-store upload (`:142`). No "synchronous transform seam" was needed — `storage.controller.ts:101-102` had already solved the identical problem with `@NoTenantTransaction()` plus short `runInTenantTransaction` windows.
  *Files touched:* `src/modules/kb/wiki/kb-media.controller.ts` (`@NoTenantTransaction()`) · `src/modules/kb/wiki/kb-media.service.ts` (`upload` restructured into two short transactions) · `src/modules/kb/wiki/kb-media.service.spec.ts` (+3 tests) · `src/modules/kb/wiki/kb-media-connection-release.spec.ts` (new, 4 tests) · `src/modules/kb/wiki/kb-media-ledger-compensation.spec.ts` (coordinator fix)
  *Result:* `upload` is now three windows — a short transaction for the page-ownership read, **no connection held** for scan + encode + upload, then a short transaction for the attachment row and the indexing hook.
  *Coordinator corrections — three, none of which the agent's green run would have shown:*
  1. **It deleted a 20-line existing comment** while relocating the `registerAfterCommit` block. That comment records why page-document uploads once reported success and were never searchable. CLAUDE.md §6 says existing comments stay; restored verbatim.
  2. **It broke 6 tests in `kb-media-ledger-compensation.spec.ts`**, a file outside its ownership, and correctly reported rather than edited. Fixed with the same module mock — which still invokes its callback, so no assertion is voided (the trap in CLAUDE.md §8).
  3. **I checked what the agent did not: `@Idempotent("kb.media.upload")` on this route.** Opting out removes the ambient context the idempotency store might have relied on. It does not — `idempotency.interceptor.ts:195,230` branches explicitly on `getTenantContext()`, `command-fence-store.ts:123` opens its own transaction, and there is a spec named `command-fence-store-no-ambient-tx.spec.ts`. The route moves onto the branch its author documents as the **durable** one.
  *Coverage the agent's approach would have lost, restored:* mocking `runInTenantTransaction` erases the very boundary this task creates. I added three ordering tests that pin it — scan/encode/upload observed at transaction depth **0**, both database touches at depth **1**, and exactly **two** transactions rather than one spanning the upload. Tests 2 and 3 fail against the pre-change code (depth 0, zero transactions), so they are not vacuous.
  *Verified:* `jest src/modules/kb/wiki` → **333 passed / 333**, 47 suites.
  *Not certified:* that each short window receives the correct `app.organization_id` GUC, and that the deferred indexing hook drains on a live handle. Needs one real upload against an RLS-enabled database.

- [x] **R4 — `accessMode: "read only"` for read-intent transactions — investigated, NOT implemented**
  *Premise: partly right, badly understated.* `recordTargetRequest` **is** guarded by `isRelocationTarget` (`with-tenant.ts:193`), so it fires only for an org mid-relocation — but that makes it a *worse* blocker than the PRD described, not a lesser one: it writes on the request's own `tx` for **every** request including GETs, so read-only mode would make **every GET 500 on the target cell for the duration of a relocation**. Invisible in testing, catastrophic during a migration.
  *Files touched:* **none.** This was a read-only audit; implementing would have shipped a regression.
  *The real blocker:* **15 GET routes write inside the interceptor's transaction**, out of 1,646 total. The plumbing is otherwise ready — `READ_ONLY_METHODS = {GET, HEAD, OPTIONS}` (`tenant-context.interceptor.ts:39`), intent already reaches `withTenant` (`:116`), and `run-in-tenant-transaction.ts:110` already proves drizzle accepts `{ accessMode: "read only" }`. Only `with-tenant.ts:188` would need the option. That is one line, and it is the wrong line to write.
  *Dominant cause, verified by me directly:* `AuditService.logCritical` (`audit.service.ts:87-89`) awaits `write()`, which with an ambient context inserts straight into the **request's** transaction — 5 of the 15. Its sibling `log` (`:77-84`) defers through `registerAfterCommit` + `runOutsideTenantContext` and is safe. The class's own docblock states the coupling is deliberate ("an audit of a mutation belongs in that mutation's transaction"), so this is a real design constraint, not an oversight to patch away.
  *Verdict:* **UNSAFE to ship, and UNPROVABLE safe without live traffic.** Six of the 15 write only on a conditional branch; one (`InventorySettingsService.get`) writes only on a **Redis cache miss**, so it passes every warm-cache test and 500s after a deploy. A static pass cannot distinguish "no GET writes" from "no GET writes on the paths it could resolve".
  *Separate finding worth its own lane:* those 15 routes violate the repo's own rule — backend/CLAUDE.md §2 says "no writes in a GET". A written rule is not a control; it has been broken 15 times. Notably `inv-products.controller.ts:170` carries the comment *"A read — it computes and returns, and writes nothing"*, which is true of the handler and false of its call graph.
  *What would close it:* fix the 15; exempt relocation-target orgs or move `recordTargetRequest` off the request transaction; then roll out per-module rather than as a global `intent` flip, so a missed path costs one surface instead of every GET.

- [x] **R5 — re-check the two reserved Build files**
  *Premise: no longer matches source, and the reservation still stands.* The read-cost lane recorded "`projects-work-query.service.ts` unbounded count". At current source the count reads are **already** `Promise.all`-parallel with the page read **and** conditional — `:462` and `:522` both compute `total` only when a count was requested (`countRows ? Number(...) : undefined`), so an ordinary page pays for no count at all. That is not an unbounded count.
  *Files touched:* **none.** Both files were modified by the concurrent session 17 minutes before this check (`06:42` / `06:15` against a `06:59` clock), so they remain reserved under the shared-edit rule.
  *Remaining marginal win, recorded not taken:* folding the conditional count into `count(*) OVER ()` would save one round trip on count-requesting pages only. It spans a `UNION` in `work-scope-union.ts:89`, so it is a real change to a file another session holds — not worth taking from them for one conditional round trip.

- [x] **R6 — re-state what stays deferred, with certification steps**
  *Files touched:* this document (table below).

| Item | Blocked on | Exactly what closes it |
|---|---|---|
| Read-replica routing for 1,646 GET routes | Infrastructure. `DB_REPLICA_URL` is unset and `runInReplicaTenantRead` has 3 call sites. | Provision the RDS/Aurora **reader endpoint**, set `DB_REPLICA_URL`, then measure cold/warm buffers per route as `streamline_app` with the tenant GUC. Largest remaining capacity win — it is the only item that raises the concurrency ceiling rather than shortening the hold. Note it shares R4's hazard: a GET that writes cannot be served by a reader either, so **fix the 15 first**. |
| The 15 writing GET routes | Product decision on audit semantics. | `logCritical` commits with the request on purpose. Moving those 5 to `logCriticalOutsideTransaction` changes what a rolled-back request records. Needs a decision, not a refactor. |
| `projects-members.service.ts` `limit(500)`, `projects-labels.service.ts` `limit(300)` | Frontend contract. | Capping needs a cursor and matching frontend paging work — a two-repo lane, not a backend fix. |
| `org-membership-read.service.ts` keyset on `coalesce(name, email)`; `chat-search.service.ts:153-167` leading-wildcard `ILIKE`; `kb-document-query.service.ts:73,115` leading-wildcard `ILIKE` on `kb_articles.title` / `kb_pages.title` (added 2026-09-20 for Ask OS `searchMyDocuments`) | A migration **and** a live measurement. | Both want `pg_trgm`. Per backend/CLAUDE.md §3 a text index is **unusable under RLS** unless reached through a `SECURITY DEFINER` function owned by the BYPASSRLS owner — the `app.search_ticket_ids` pattern. So this is not "add an index"; it is that whole five-condition pattern, measured in buffers on a real database. The KB one is the least urgent of the three: it is bounded by `spaceId IN (accessible spaces)` and `LIMIT 20`, so it scans the caller's spaces rather than the org. Recorded here rather than shipped silently. |
| `calendar-event-source.loader.ts` indexed `OR` + semi-join | Nothing — already done. | Measured and annotated by its author; buffer counts are recorded in the file. |

---

## Verification log

| Check | Result |
|---|---|
| `tsc --noEmit -p tsconfig.json` | **0 errors in any lane file.** 62 pre-existing errors remain in files owned by concurrent sessions (66 at the start of the day; those sessions fixed 4 of their own). No heap fault — the run completed. |
| `jest` across `kb/wiki`, `storage`, `email`, `automation`, `crm/consent` | **916 passed / 916**, 104 suites, zero failures |
| `check:outbound-timeouts` | green — 17 outbound calls across 5,033 files, all bounded |
| `check:ai-route-tenant-optout` | green — 216 routes across 36 controllers, **65 frozen** (unchanged; it went red mid-lane and was fixed, not re-baselined) |
| Comments added to production files | **zero**. One 20-line block was *restored* after an agent deleted it. |
| Casts / `any` / `@ts-ignore` in production files | **zero** |

**One rule I followed the repo's convention on rather than the letter of CLAUDE.md §6, stated plainly:** the new and edited *specs* build `Db` doubles with `as unknown as Db` / `as never`. `Db` is a very large structural type and every database-double spec in this repo already does this — `kb-media-ledger-compensation.spec.ts` and `email-outbox.service.spec.ts` each had several before I touched them. Removing the pattern is a repo-wide refactor, not this lane. No production file gained a cast.

## What actually changed about the system

Three request paths no longer hold one of the 15 pooled connections while waiting on something that is not the database:

| Path | Worst-case hold before | After |
|---|---|---|
| Automation email (reached from deals, e-sign, HR onboarding) | ~123s — 3 × 30s provider attempts + 3s backoff + a 30s fallback | ~5s, and now durable |
| Any outbox email's inline attempt | 30s | 5s |
| Storage upload (`/storage/upload`, onboarding documents) | 35s AV scan | 0s |
| Storage download / image | object-store round trip | 0s |
| KB media upload | AV scan + CPU encode + object-store upload | 0s |

**Three premises in the prior PRD's deferred table were wrong**, and each was wrong in the direction of making the work look larger or different than it was: the email item was one method rather than 75 call sites; the kb-media item named a class that does not appear in the file; the storage item asked for work that was already done. The one premise that was *right* in substance — `recordTargetRequest` — understated its own blast radius.

**Two correctness defects surfaced that were not connection-hold issues at all:** the outbox retry silently re-sent without `cc`/`bcc`/`replyTo`/`List-Unsubscribe`, and automation email was never durable in the first place.

## Not certified

Nothing in this lane was exercised against a live database. No disposable environment was available and production credentials were not loaded to make a check pass. Every change is verified by typecheck, unit test, gate and source review only. Before trusting the `@NoTenantTransaction()` changes in production, exercise one real upload, one real download and one automation-triggered email against an RLS-enabled database and confirm no `42501`.

---

## ⚠ Cross-lane hazard found 2026-09-20 — six committed migrations will never run

`pnpm check:migration-discipline` exits **1**. Six `.sql` files are committed but absent from `migrations/meta/_journal.json`, so **`db:migrate` skips them while printing success** — the exact defect found and fixed for `1123_ai_action_proposals_rls` the same day, where the consequence was a table holding leave reasons, candidate emails and bonus amounts running with no RLS.

| File | Committed in | Problem |
|---|---|---|
| `1120_add_landed_cost_tag.sql` | `b37dbf487` | no journal entry · number 1120 also claimed by `1120_feedbucket_widget_defaults.sql` |
| `1121_requisition_headcount_link.sql` | `71ae380be` | no journal entry · number 1121 also claimed by `1121_chat_presence_custom_status.sql` |
| `1124_build_comment_draft_evidence.sql` | `7960c2e6e` | no journal entry |
| `1125_build_managed_product_memberships.sql` | `7960c2e6e` | no journal entry |
| `1126_build_project_updates.sql` | `7960c2e6e` | no journal entry |
| `1127_build_project_attachments.sql` | `7960c2e6e` | no journal entry |

**Not fixed here, deliberately.** Journalling a migration asserts it *should* run; if any was already applied out-of-band, adding it replays it. The two duplicate prefixes need a rename, which rewrites files the accounting, recruitment and build lanes own. This needs each owning lane to confirm its file's applied state first.

**What closes it:** per file, check whether its end state is already live (query the catalog for the objects it creates, as was done for 1123), then either append a journal entry with a strictly-increasing `when`, or add it to the gate baseline with the evidence that it is already applied. Renumber the two duplicates in their owning lane.

---

## §A — Absorbed from `2026-09-19-tenant-connection-hold-prd.md`

That lane's five todos (T1–T5) were all ticked and its acceptance met: `check:outbound-timeouts` 17 calls all bounded, `check:ai-route-tenant-optout` 66 frozen, both bite-checked; jest 3,391/3,392. Two sections are kept because they are decisions, not status.

### A1 — Rejected approach: per-query borrow inside the tenant proxy

**Recorded so a future review does not re-propose it.**

The obvious deepening is to relocate the connection borrow into `createTenantAwareDb`: acquire a connection per unit of work, set the GUC, run, release. The proxy already intercepts every query in the codebase, so 557 service files would not change.

**This is not implementable with Drizzle.** `db.select()` returns a query builder bound to its target at call time, and that builder executes lazily on `await`. To route a query into a fresh transaction the proxy would have to hand back a builder already bound to a `tx` — which means acquiring a connection *synchronously* inside the proxy's `get`/apply trap. Connection acquisition is async. The builder cannot be rebound afterwards, and replaying a recorded method chain onto a real `tx` at `then` time would mean reimplementing Drizzle's builder surface.

Revisit only if Drizzle gains a deferred-execution binding.

### A2 — Why the AI-route opt-out stopped at two routes

The audit named five files with the same shape. Three were left alone on evidence, not fatigue, and they remain in the ratchet's frozen list so the debt is recorded and cannot grow:

- `inv-ai-explain.controller.ts` carries a docblock stating that four handlers **keep** the request transaction and that the class-level interceptor is "strictly an improvement and never a behaviour change" for them. `getDigest` / `getSupplierDelayBriefing` interleave their reads with the model call rather than loading evidence up front, so the wrap is not the mechanical one-liner it is for the other two.
- `kb-ask.controller.ts` has both asking routes already opted out; what remains is `getHistory` / `clearHistory`, which make no model call and correctly stay inside the transaction.
- `chat-assistant.controller.ts` and `inv-report-builder.controller.ts` likewise leave only non-model routes behind.

### A3 — Residual risk on the two routes that were sunk

`POST /payroll/me/payslips/:publicationId/ai/explain` and `POST /inventory/ai/insights/:insightId/explain` are verified by typecheck, unit test and structural equivalence to a deployed streaming sibling — **not** by a live request. The opt-out **requires** `@UseInterceptors(AiRequestAbortInterceptor)`: `@NoTenantTransaction()` removes the tenant context `getAmbientAiAbortSignal` reads, so without it the released connection is bought with an uncancellable, still-billed provider call. Certify with one real request per route.

---

## §B — Absorbed from `2026-09-20-read-cost-lane.md`

All six of that lane's todos were ticked; its four "Not in this lane" items are already carried in the R6 table above. Kept here: the aggregate result, and two defects that matter more than the lane itself.

### B1 — Round-trip reduction achieved

e-sign summary 9 → 2 · e-sign list 2 → 1 per page · timesheets `verifyChain` 2 → 1 · chat DM lookup 2 queries over O(channels × members) rows → 1 query returning at most 1 row · chat thread open one round trip saved · chat channel search unbounded → capped at 501 · marketplace 5 single-row reads no longer materialise a full result set.

Two reads were **correctly left whole**: `marketplaceAppSchema` and `appInstallationSchema` require all 17 / all 8 columns, so nothing was droppable, and `sign-envelope-lookup.ts` was left untouched because every caller passes the whole envelope onward — guessing a projection there throws a contract error rather than speeding a page.

### B2 — Two defects the coordinator caught in agent output, neither visible from the agents' own green test runs

These are the reason a peer's green run is not integration proof.

1. **A silent behaviour narrowing.** Reusing `listMemberChannelIds` also inherited its `isArchived = false` filter, which `searchChannels` never had. An archived private channel the caller belongs to stopped being findable — and search is exactly how a person finds one. Fixed with an `includeArchived` option defaulting to `false`, so the Ably token route keeps its old behaviour.
2. **A constructor arity break.** Adding `ChatChannelListService` as a third constructor parameter broke four `new ChatSearchService(...)` call sites in two **unmodified** specs. Every chat jest run stayed green because ts-jest does not fail on type errors — **only the typecheck sees arity.**
