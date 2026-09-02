# 15c — fixing ticket 15's remaining open defects

Session S4c. BE = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend`.

## What I found before changing anything

The brief said 13 open defects. **Nine of them were already fixed on disk.** Session S4b's work
(`reports/15b-authorization-fixes.md`) was uncommitted when that report was written and has since
landed in `a3bf8470`; I verified each claim against the current source rather than the report.
Already closed and left alone: the blog platform-only gate, `/kb/search`, `/sign/reports/dashboard`,
the four CRM exports, `GET /tasks`, `goals-scope`/`assets-scope`/`dashboard-scope`, `enrollSequence`.

What was actually open:

| Defect | State found |
|---|---|
| 10 confirmed silent-subset bulk sites (non-CRM) | open |
| `GET /timesheets/billing/rate-preview` `userId` ungated | open |
| Realtime grant-time evidence is static, not executable | open |
| Blog gate has no executable proof | open |
| 4 harness assertions red *because* the defects were fixed | open |

## 1 — bulk endpoints now fail the whole request

Ten sites. Each fetches under the tenant predicate, compares the returned row count with the
**deduplicated** requested id count, and throws `NotFoundException` — 404, never 403 — for the
whole request. The template is the repository's own,
`build/core/projects-tickets-query.service.ts:155`.

| Site | What the caller used to be told |
|---|---|
| `NotificationsLifecycleService.bulkMarkRead\|bulkArchive\|bulkDelete` | `{success: true}` with no `.returning()` at all. The single-id paths 180 lines above already did `.returning()` then `throw new NotFoundException()` — the property was understood and lost at the bulk boundary. |
| `RecruitmentCandidateOpsService.bulkReject` | `{rejected: n}` for the owned subset, **after sending real rejection emails** to it. |
| `RecruitmentCandidateOpsService.bulkShortlist` | same shape, no emails. |
| `SurveyParticipantService.invite\|remind` | the **requested** count, not the affected count. |
| `KbTagsService.setArticleTags` | fully unscoped: wrote a foreign `tagId` into the caller's org, then hid it by re-selecting org-scoped. It also never checked that `:articleId` was the caller's — a foreign article id created a row in the caller's org pointing at another tenant's article. Both fixed. |
| `ApprovalsBulkService.bulkApprove` | a cross-tenant `NotFoundException` was swallowed by `isExpectedApprovalSkip` and counted as `skipped`, so a mixed list returned `200 {approved:1, skipped:1}` — indistinguishable from a period that simply was not submitted. |
| `ApprovalsBulkService.bulkReject` | the tenant filter shared one predicate with `status = 'SUBMITTED'`. |
| `DataQualityResolutionService.resolve` | `selectCandidates` narrowed on `organizationId` **and** `status = 'open'` together, so a foreign id looked like an already-decided one; `expectedCount` is optional, so nothing caught it. |

**The last three needed the check in a different place, and that is the interesting part.** Each has
a legitimate per-row skip (not submitted / already decided) sharing a predicate with the tenant
filter. Adding a count check to that combined query would have turned every ordinary skip into a
404. Tenant membership is asserted **first and on its own**; the business skip then keeps meaning
what it says.

**Excluded by scope, recorded not lost:** `DealsCrudService.bulkDelete` and `bulkUpdate` are CRM.
Unchanged, still detected as `no-count-check`, pinned by name in `bola-bulk-mixed-tenant.spec.ts`
with the defect written out, so the finding survives the exclusion.

## 2 — `GET /timesheets/billing/rate-preview`

The remaining widening-filter defect, and it is the constitution's trap in its exact form. The
route carries `timesheets:billing:view`, which the catalog does **not** mark `scopable` — gating on
its own key would resolve `all` for every holder and bite nothing. It is gated on
`timesheets:team:view`, the scopable key `entries-read.service.ts:36` already uses for the same
`userId` parameter. Below `all` the subject is forced to the caller.

The resolution lives in `timesheets-core-scope.ts` (`resolveRatePreviewSubject`) and is called from
the controller, matching `kb-search.controller.ts` and `sign-reports.controller.ts`. That also kept
`billing.service.ts` at 497 lines — my first version put it in the service and pushed the file to
510, over the §7 hard limit.

## 3 — realtime grant time: static evidence replaced with executable

`test/security/bola/bola-realtime-grant-time.spec.ts`, 12 assertions. A capability document is a
bearer grant — once minted it goes straight to Ably and nothing in this system sees the subscribe —
so the check has to be what the caller actually receives. Ably's `createTokenRequest` signs
locally, so the **real** capability map is readable offline.

- chat: the channel list is read with the token's `orgId`/`userId`; every capability key names the
  caller's org and no other; two orgs holding the same channel ids receive **disjoint** grants;
  `clientId` is the token subject.
- support (the path with real conditional logic, which the pre-existing regex spec never touched):
  `all` → a wildcard confined to `support:${orgId}:*`; `none` → an empty capability; a narrowed
  scope → exactly one channel per row the tenant-bound query returned. The db stub returns rows and
  **records the predicate**, and the assertion reads the predicate's own bound parameters: `org_id`
  is bound, the caller's org is a parameter, the victim's is not.
- SSE: the token resolves to the org and user it was minted for, never another org's, and is
  single-use.

**Mutation-tested.** Forcing `createTokenRequest` to always issue the wildcard turns 2 of these red
while the rest stay green.

## 4 — the blog gate, proved by running it

The five `/blog/admin/*` routes are the one part of the object-addressable surface that cannot be
closed at the data layer: `blog_posts`/`blog_categories` are the vendor's global marketing content
with no `org_id`, and adding one would make the vendor's public blog per-tenant, which is a
different product. So the gate is the fix, and the gate needed executable proof.

Five assertions in `bola-data-layer-binding.spec.ts`, each of which would have failed before:
`allCatalogScopes()` confers no `blog:*` key (so the OWNER/ORG_ADMIN short-circuit does not);
`isDelegablePermission` is false for all three (so no role grant, delegation or module ownership
can); with no allowlist configured nobody holds them; **a user on `PLATFORM_ADMIN_USER_IDS` does
hold all three** — without that last one the suite would pass just as well if the surface were
simply dead. The five routes stay in the binding spec's named list, renamed from
`KNOWN_OPEN_DEFECTS` to `PLATFORM_GLOBAL_RESOURCE`, because they are still not tenant-bound and
never can be.

## 4b — the blog AI billing P1 the coordinator routed to me: **stale, not live**

The report was that `src/modules/blog/blog-ai.service.ts` lines 52/78/104 pass
`actor: { orgId: "" }` with `charge: true`. I read the current source before changing anything.

**It is not true, and it is not true at any line.** The file is
`src/modules/ai/core/services/blog-ai.service.ts` (there is no `blog-ai.service.ts` under
`src/modules/blog/`). Lines 52, 78 and 104 are a prompt-builder's closing brace, `assertPost`'s
closing brace and a `runInTenantTransaction` options object — none is a gateway invocation. All
**six** paid invocations (lines 87, 108, 128, 154, 172, 190) pass `actor: { orgId, userId }` from a
method parameter, and `blog-ai.controller.ts` threads `u.orgId`/`u.userId` from `@CurrentUser()`
into every one, under `@RequirePermission("blog:ai:use")` — which is itself now a platform-only key,
so only a vendor operator reaches these routes at all. `grep -rn 'orgId: ""'` over `src/` returns
nothing in blog or blog-ai.

So the answer to "which of the two situations is each of the three call sites" is **neither**: there
is no empty org id and no unauthenticated path. The literal was removed by session S4b (reported in
`15b-authorization-fixes.md` §1) and has since been committed in `a3bf8470`; the finding was carried
forward from a snapshot taken before that landed.

**What the check did surface, and what I concluded about each:**

- `src/modules/ai/core/services/crm-content.service.ts` has six `actor ?? { orgId: "", userId }`
  sites — the same shape. They are **not** the defect: every one spreads `actorCharge(actor)`, which
  is `{ charge: actor?.orgId ? true : undefined }`, so an unattributable call does not spend. That is
  precisely the "must not be charging at all" resolution, already implemented. It is also CRM, out of
  scope here.
- `src/modules/payroll/runs/generate-pipeline.service.ts:223` — `orgId: ""` on a local
  `ExceptionInput` struct, not an AI actor, no `charge`. Not a billing site.

**What I changed anyway, because the door was still open.** The regression guard covered
`improveWriting` and nothing else — the two other buffered methods and **all three streaming
methods** had no assertion on the actor org, and streaming is where a reservation is easiest to get
wrong (ticket 11's own headline finding was a stream that called the model before reserving).
`blog-ai-tenant-isolation.spec.ts` now asserts, per call site, that the actor's org is the caller's,
is not `""`, and that `charge` is `true` — plus that a missing post stops every streaming path before
the reservation is taken. **Mutation-tested:** reintroducing `orgId: ""` at all six sites turns 6 of
the 8 assertions red; restored and re-verified byte-identical (`git diff --stat` empty).

Gates the coordinator asked for: `pnpm -s check:ai-charge` → **exit 0, 122 invocations, all declare
`charge` explicitly** (unchanged from ticket 11's number). `jest --runInBand --testPathPattern=blog`
through the mutex → **5 suites / 36 tests, all pass** (was 30 tests; the 6 new ones are mine).

## 5 — the harness: four red assertions, and why they were red

`test/security/bola` was **10 suites / 93 tests with 4 failures**. Three failures were defect-pins
that had gone red *because the defect was repaired* — an assertion that encodes a vulnerability
cannot go green and stay honest. Each is now **inverted into a regression guard** rather than
deleted, so it fails again if the fix is backed out:

| Was | Now |
|---|---|
| `KNOWN-OPEN crm/tasks: the widening gate collapses own and team into all` | `FIXED crm/tasks: the gate resolves the key's DataScope and demands 'all'` |
| `KNOWN-OPEN hr/recruitment: enrollSequence does not verify candidate ownership` | `FIXED: enrollSequence verifies every candidate before inserting` |
| `PINNED: each hand-verified disclosure still sits opposite a scoped sibling` | `FIXED: every hand-verified disclosure now resolves a scope` |

The fourth was `AGREES-WITH-GATE`, which transcribed `check:route-classification`'s totals as
constants (`3602/236/…`). It went red because *another module added two routes*, which proves
nothing about this parser. It now **runs** the gate script and compares — the property is that the
two enumerations agree, not that either equals a number someone wrote down. It has already absorbed
three route additions during this session without a false alarm.

### The detectors got stronger, and that has to be stated separately from the fixes

`bulk-id-handling.ts` classified a method by looking for `inArray(t.id, <param>.ids)` plus a literal
`.length !== .length` **in the same method body**. Three evasions followed from that, and the first
is the dangerous one:

1. **A local rebinding hid the site entirely.** `const requestedIds = [...new Set(input.ids)]`
   makes the id array's root a local rather than a parameter, so the method dropped out of the
   inventory — a *fixed* site vanished instead of being counted as guarded, and so would an
   unguarded one that merely deduplicated its input first. S4b hit this with `enrollSequence` and
   said so. Now resolved to a fixed point.
2. **A guard extracted into a private helper read as no guard.** Follows one hop of `this.x()`
   within the owning class.
3. **A set-difference refusal read as no guard.** `const missing = ids.filter(id => !found…); if
   (missing.length > 0) throw` is the same property, better expressed. `generateRolloutDocuments`
   and `MeetingsService.createMeeting` were both marked unguarded while failing the whole request
   correctly.

`scope-sibling-drift.ts` credited scope resolution only from the handler, its injected services, or
a method on its own controller. A **standalone helper** — how `billing.controller.ts` now resolves
its subject — was invisible. It follows those too, matching on the helper's *body*, so nothing is
credited for being named reassuringly.

`bola-scope-gate-integrity.spec.ts` matched `if (!isScopable(K)) return "all"` **in comments as
well as code**, so a doc comment describing the fallback it removed read as the fallback still
being there. Comments are stripped now.

### The bulk ratchet was punishing the fix

`BULK_SITE_BASELINE = 55` capped **total** sites, guarded ones included, so adding a correct guard
could trip it — which is exactly why S4b chose one implementation over another to stay green and
flagged it. Total sites is now a **floor** (anti-vacuity); the cap is on `no-count-check`, which is
the actual defect count.

## Numbers moved (before → after)

| Ratchet | Before | After |
|---|---|---|
| `test/security/bola` | 10 suites / 93 tests, **4 red** | **12 suites / 132 tests, 0 red** |
| bulk `no-count-check` (the defect count) | 51 | **45** |
| bulk `fail-whole` | 4 | **21** |
| bulk sites visible to the scan | 55 (46 on the fixed source) | **66** |
| `CONFIRMED_SILENT_SUBSET` | 12 | **2** (both CRM, excluded) |
| drifting unscoped routes | 335 | **329** |
| `VERIFIED_DISCLOSURES` open pins | 6 | **0** (6 `FIXED` guards) |
| live fail-open scope resolvers | 2 | **0** |
| blog holes with executable proof | 0 | **5** |
| realtime grant-time executable assertions | 0 | **12** |
| `DRIFTING_KEYS` | 43 | 45 |

`DRIFTING_KEYS` **grew**, and that is a consequence of the fixes rather than a regression: the
detector needs one scoped and one unscoped sibling, so before `GET /tasks` and
`GET /timesheets/billing/rate-preview` were fixed, *neither* side of `tasks:read` or
`timesheets:billing:view` scoped and the keys were invisible. Both remaining siblings are the benign
shape the detector's own comment names — `GET /tasks/sequences` lists org-level sequence templates,
`GET /timesheets/billing/uninvoiced` is the org's billing queue. A new assertion states this
explicitly so it is not mistaken for two new leaks.

## Gates (command → exit code → number I read)

| Command | Exit | Number |
|---|---|---|
| `pnpm typecheck` (8 GB heap, tsconfig.build.json) | **0** | 0 errors |
| `pnpm -s check:spec-typecheck` | **0** | clean (4 errors earlier were feedbucket/storage — another agent's, since resolved) |
| `jest --runInBand --testPathPattern=test/security/bola` | 0 | **12 suites / 132 tests, all pass** |
| `jest --runInBand --testPathPattern=test/security` | 1 | 26 suites / 366 tests, **361 pass**; the only red suite is `upload-controls.spec.ts` (5 tests), storage module, pre-existing |
| `jest --runInBand --testPathPattern="modules/(notifications\|surveys\|data-quality\|kb\|timesheets\|hr/recruitment\|tasks\|access\|realtime\|chat\|support)/"` | 0 | **313 suites / 2346 tests, all pass** |
| `pnpm -s check:scope-application` | **0** | 140 resolutions, 140 applied |
| `pnpm -s check:record-access` | **0** | 1183 findFirst calls, OK |
| `pnpm -s check:bulk-id-limits` | **0** | 3267 schema files, no unbounded id arrays |
| `pnpm -s check:permission-keys` | **0** | 627 unique keys resolve in both catalogs |
| `pnpm -s check:route-classification` | **0** | 0 UNDECLARED |
| `pnpm -s check:module-di` | **0** | — |
| `pnpm -s check:file-sizes` | **0** | 5 files over 500 — all pre-existing; my two (`billing.service.ts` 510→497, `data-quality-resolution.service.ts` 506→498) were pulled back under |
| `pnpm -s check:cycles` (madge) | **0** | 5457 files, no circular dependency |
| `pnpm -s check:mock-surface` | **0** | — |

**Mutation proof, executed.** I temporarily (a) removed the notifications count check, (b) forced
the support realtime grant to a wildcard, (c) restored recruitment's old `existing.length === 0`
guard → **5 of the new probes went red and every `SAME-TENANT` assertion stayed green**, so the
guards are not blanket denials. All three files were restored and re-verified.

## Red, and NOT mine

- **`test/security/upload-controls.spec.ts` (5 tests)** — storage module, pre-existing, already
  reported by ticket 15 and by 15b.
- **`pnpm -s check:unbounded-reads` exit 1** — one UNCLASSIFIED path,
  `src/modules/gdpr/gdpr-subject-erasure-derived-sinks.ts:138`. That file is **untracked** in the
  working tree — another agent's in-flight work. Needs an entry in
  `unbounded-reads-classification.json` from whoever owns it.
- **`pnpm -s check:over-300` exit 1** — 401 files over 300 against a baseline of 394. I added **zero**
  files to that set (every file I touched was either already over 300 or is still well under).
- **`pnpm -s check:tenant-isolation` exit 1** — `src/modules/cron/cron-gdpr-export-retention.service.ts`
  has no cross-tenant negative test. Also untracked, also another agent's.

## Files changed

**New:** `test/security/bola/bola-bulk-fail-whole.spec.ts` ·
`test/security/bola/bola-realtime-grant-time.spec.ts`

**Backend services/controllers:** `src/modules/notifications/notifications-lifecycle.service.ts` ·
`src/modules/hr/recruitment/recruitment-candidate-ops.service.ts` ·
`src/modules/kb/core/kb-tags.service.ts` · `src/modules/surveys/survey-participant.service.ts` ·
`src/modules/timesheets/core/approvals-bulk.service.ts` ·
`src/modules/timesheets/core/billing.{controller,service}.ts` ·
`src/modules/timesheets/core/timesheets-core-scope.ts` ·
`src/modules/data-quality/data-quality-resolution.service.ts`

**AI billing regression guard (coordinator-routed):**
`src/modules/ai/core/services/blog-ai-tenant-isolation.spec.ts` — six new assertions, one per paid
call site. `blog-ai.service.ts` itself needed no change and has none.

**Spec whose fixtures the fix changed:**
`src/modules/data-quality/data-quality-resolution.service.spec.ts` — five `kind: "ids"` fixtures now
answer the ownership read, and one new test asserts the whole decision is refused when one id is
another tenant's, writing nothing and never reaching `selectCandidates`.

**Harness:** `test/security/bola/bulk-id-handling.ts` · `test/security/bola/scope-sibling-drift.ts` ·
`test/security/bola/bola-{bulk-mixed-tenant,data-layer-binding,route-surface,scope-gate-integrity,scope-sibling-drift}.spec.ts`

I touched no migration, no schema, no `src/modules/kb/retrieval/**`, and nothing under
`modules/deals`, `modules/leads`, `modules/clients`, `modules/contacts` or `modules/inventory`.

## Findings for other territories

1. **`KbSearchService.retrieveTopArticles`** — the RAG path behind `POST /kb/ask` — applies space
   ACLs, article restrictions and page visibility but **no article-owner DataScope**. Ticket 29 owns
   `kb/retrieval/**`. Carried forward from 15b, still unfixed.
2. **`DealsCrudService.bulkDelete|bulkUpdate`** — CRM, excluded here. Same one-line count check as
   the ten I fixed.
3. **`src/modules/users/user-ops-bulk-update.spec.ts:93`** is titled *"bulkUpdateUsers — cross-org
   isolation"* and asserts `expect(result.updated).toBe(1)` for a 2-id request. It encodes silent
   subsetting **as** the isolation guarantee. Whoever fixes `modules/users` is reversing a
   deliberate decision, not repairing an oversight.
4. **`PLATFORM_ADMIN_USER_IDS` is unset**, so `/blog/admin/*` is reachable by nobody in the current
   deployment. That is the correct fail-closed default and is now asserted, but it is a product
   decision the orchestrator should confirm.
5. **`support_channels.inbound_secret`** is compared with `!==` rather than `timingSafeEqual` and is
   stored unhashed; the pre-auth rate limit on the three inbound routes is keyed on the
   caller-supplied `orgId`, which is a targeted denial of service. All three from the original sweep,
   all still open, all in `modules/support`.
