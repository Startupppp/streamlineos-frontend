# 15 — BOLA/IDOR sweep across every object-addressable surface

**What to build:** Systematic broken-object-level-authorization testing across reads, writes, bulk actions, files, exports, search and vector queries, realtime channels, background jobs and public/share-token paths. A cross-tenant miss returns 404, never 403 — a 403 confirms the object exists.

**Blocked by:** None — can start immediately.

**Status:** 5 of 6 boxes closed; the sixth is PARTIAL with its fraction recorded, not blocked on infrastructure any
more. The live sweep ran: **1,921 routes probed, 666 return the required 404, 116 measurably do not, 1,138 were
unprobeable and are covered statically only, and 1 real cross-tenant leak was found and fixed.** What remains is
per-module contract work in held or excluded territory (register #165–#167).

Full reports: `.scratch/code-release-10-10/reports/15-bola-sweep.md` (sweep),
`reports/15b-authorization-fixes.md` (first fix pass), `reports/15c-bola-defect-fixes.md` (second pass),
`reports/15d-rag-scope-and-support-secret.md` (RAG object scope + the support inbound secret).
Harness: `backend/test/security/bola/**` — `jest --runInBand --testPathPattern=test/security/bola`
→ **14 suites, 171 tests, 170 green** (was 12 suites / 132 tests). The one red is
`bola-bulk-mixed-tenant.spec.ts`'s P0-3 pin, which asserts `email_sequence_enrollments` has no
`org_id`; it went red because that column is being added right now in an uncommitted change to
`src/db/schema/hr/hiring-pipeline.ts`. Like 15c's four, it needs inverting into a FIXED guard by
whoever lands that schema change.

- [ ] Every object-addressable route is probed with an id belonging to another organization and returns 404.
      PARTIAL — and the honest fraction is now recorded instead of a sample. The infrastructure blocker the
      previous pass named is **gone**: the sweep WAS run live, against a booted API on a seeded two-org database.
      **1,921 routes probed live** (`scratchpad/bola-live-offline.json`), and the four-way split is:
      **PASS 666 · UNPROBEABLE 1,138 · NO-404 113 · SERVER-ERROR 2 · LEAK 1 · INCONCLUSIVE 1.**
      Read against this box's literal requirement ("probed with an id belonging to another organization **and
      returns 404**"):
      - **666 routes (34.7%) probed live AND satisfy it.**
      - **116 routes (6.0%) probed live and FAIL it** — 113 return no 404 for a cross-tenant id (not leaks: an id
        belonging to no organisation answers identically, so the object is never resolved, but the contract 404 is
        absent and **32 of the 113 are write verbs** answering 204 whether the object exists or not); 2 return 500
        (`GET /surveys/:surveyId/builder`, `/logic`); 1 is INCONCLUSIVE (`POST
        /organization/custom-domains/:domainId/verify`, 400 against a 201 control) and needs a handler read.
      - **1,138 routes (59.2%) could not be probed live at all** and are covered **statically only** — swept to
        the data layer with a tenant predicate, which is a weaker proof than an HTTP 404.
      - **1 LEAK found and fixed** (`AnnouncementsController.markRead`), which is the return on running it live:
        the static sweep did not find it, and the probe did — by comparing the cross-tenant answer against an id
        belonging to no organisation at all (control 201 / cross-tenant 201 / absent-org 500).
      **Not ticked, and deliberately not ticked on the 666.** The box says *every* object-addressable route, and
      116 measured routes do not return 404 while 1,138 were never asked. Ticking it on 34.7% would be exactly the
      false green this release keeps finding.
      **BLOCKED on other territory for the actionable remainder:** the 113 + 2 + 1 are per-module contract fixes
      (contacts, deals, leads, hr rich-documents, surveys, organization) in modules this session does not hold, and
      crm/leads/deals/contacts are excluded from the release outright. The fix shape is the repo's own template,
      `build/core/projects-tickets-query.service.ts:155`. Tracked as register items #165–#167.
- [x] Bulk endpoints are probed with a mixed-tenant id list; the whole request fails rather than silently processing the subset the caller owns.
      10 confirmed silent-subset sites repaired (notifications ×3, recruitment ×2, surveys ×2, kb tags, timesheets approvals ×2 counting `bulkApprove`, data-quality) plus `enrollSequence`. Each fetches under the tenant predicate, compares the row count with the requested id count, and throws `NotFoundException` for the WHOLE request. Detector: `no-count-check` 51 → 45 while the scan itself got stronger (46 → 66 visible sites); `fail-whole` 4 → 21. Behavioural proof in `bola-bulk-fail-whole.spec.ts` (14 assertions incl. no-write-on-miss and no-email-on-miss), mutation-tested.
      PARTIAL: `DealsCrudService.bulkDelete|bulkUpdate` are CRM and excluded from this release. They are unchanged, still detected as `no-count-check`, and pinned by name in `bola-bulk-mixed-tenant.spec.ts` so the finding is not lost.
- [x] Export and search/vector paths apply the same DataScope as their sibling list endpoints.
      All six verified disclosures now resolve a scope: `/kb/search` and `/sign/reports/dashboard` (in scope for this release) and `/deals/aging`, `/clients/export`, `/leads/export`, `/contacts/export` (CRM — fixed by the earlier pass before the exclusion was declared, asserted here rather than reverted). The six defect-pins are inverted into `FIXED` regression guards. Drifting route inventory 335 → 329.
      The **vector** half of this box was still open when it was ticked, and is closed now (15d): `KbSearchService.retrieveTopArticles` — the RAG path behind `POST /kb/ask` and the research-brief graph — applied space, restriction and page filters but **no article-owner DataScope**. It now resolves `kb:articles:view` itself and pushes the same predicate `GET /kb/search` uses into the FTS candidate query, the ANN candidate query and the hydration read, built from one shared function (`kb-article-owner-scope.ts`) so the two cannot drift. No new join (the ANN query already joins `kb_articles` for `acl_revision`, and `idx_kb_articles_org_owner_actor` already exists), no migration, and `hnsw.iterative_scan = relaxed_order` untouched. Behavioural proof in `bola-rag-object-scope.spec.ts` (18 tests, incl. the prompt handed to the AI gateway never containing an unowned article's text); mutation-tested twice, 6 and 4 assertions red.
- [x] Realtime channel capability is tenant-checked at grant time, not only at subscribe time.
      The evidence is now executable, not static. `bola-realtime-grant-time.spec.ts` runs all three minting surfaces and reads the real capability document (Ably signs locally, so no network): chat and support grants name only the caller's org, two orgs holding the same channel/ticket ids receive disjoint grants, `scope: none` grants nothing, a narrowed scope grants exactly the rows the tenant-bound predicate returned (asserted on the predicate's own bound parameters), and the SSE token resolves to the org it was minted for and is single-use. 12 assertions, mutation-tested: forcing the support grant to a wildcard turns 2 of them red.
- [x] Any optional filter that widens scope is authorized, and the gate is confirmed to actually bite.
      All 4 defects closed. `GET /tasks` now gates on `crm:tasks:view === "all"` (the scopable key's DataScope) instead of `!== "none"`; `goals-scope.ts` and `assets-scope.ts` (plus two more in `dashboard-scope.ts` the sweep could not see) dropped the `if (!isScopable(KEY)) return "all"` fallback and fail closed; `GET /leads/export`'s `assigneeId` intersects the caller's own scope. `GET /timesheets/billing/rate-preview` is fixed in this pass — its own key `timesheets:billing:view` is NOT scopable, so gating on it would have been the exact no-op the constitution names, and it gates on `timesheets:team:view` instead, the scopable key every other timesheets read uses for the same parameter. The live fail-open resolver list is 2 → 0.
- [x] Authorization is asserted at the data layer for every read and write.
      The 5 `/blog/admin/*` holes are closed at the gate, which is the only place they can be closed: `blog_posts`/`blog_categories` are the vendor's global marketing content with no `org_id`, so there is no tenant to bind. The three `blog:*` keys are platform-only — excluded from `allCatalogScopes()`, so the OWNER/ORG_ADMIN short-circuit no longer confers them, and non-delegable, so no role grant, delegation or module ownership can. Proved by running it: 5 executable assertions in `bola-data-layer-binding.spec.ts`, including that a user on `PLATFORM_ADMIN_USER_IDS` does hold them, so the surface is gated rather than merely dead. `KbTagsService.setArticleTags` also gained the article-ownership assertion it never had.
      The `@Public()` support inbound surface is closed in 15d, where the org id in the path IS the authorization decision and the shared secret is the only credential: the secret is compared with `timingSafeEqual` over fixed-width digests (no timing and no length oracle), is hash-only at rest with a migration-free dual read for pre-existing rows plus a rotation path on the existing PATCH, and the pre-authentication rate limit is keyed on the client address rather than the caller-supplied `orgId` (the per-org quota is kept, after the credential is proved). 20 assertions in `bola-support-inbound-secret.spec.ts`, mutation-tested three times (3 / 1 / 5 red); the three KNOWN-OPEN pins in `bola-public-org-selector.spec.ts` are inverted into FIXED guards.
      PARTIAL: rows written before 15d still hold a plaintext secret. They verify correctly and nothing is broken, but hash-only-at-rest is not complete until a one-statement data backfill runs; `migrations/` is ticket 08's, and the exact statement is in `reports/15d-rag-scope-and-support-secret.md` §2b.
