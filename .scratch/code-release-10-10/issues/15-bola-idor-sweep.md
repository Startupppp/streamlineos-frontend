# 15 — BOLA/IDOR sweep across every object-addressable surface

**What to build:** Systematic broken-object-level-authorization testing across reads, writes, bulk actions, files, exports, search and vector queries, realtime channels, background jobs and public/share-token paths. A cross-tenant miss returns 404, never 403 — a 403 confirms the object exists.

**Blocked by:** None — can start immediately.

**Status:** 5 of 6 boxes closed; the sixth is still PARTIAL, but **A-1 and A-3 are now DONE** (2026-09-03,
report `reports/15e-esign-404-and-bola-body-synthesis.md`). A-3's three e-sign no-404 routes return 404,
plus a P1 within-tenant leak found beside them (`GET /sign/documents/:documentId/preview` served any
envelope's source PDF in the org). A-1's harness gap is closed: the sweep now derives a minimal valid
body AND the required query parameters per route from `openapi.json` (1,362/1,362 JSON-bodied operations,
911/911 of the operations that reject `{}`), and the 468 were re-probed live. The sixth box stays open on
what the re-probe does not reach. The live sweep ran: **1,921 routes probed, 666 return the required 404, 116 measurably do not, 1,138 were
unprobeable and are covered statically only, and 1 real cross-tenant leak was found and fixed.** What remains is
per-module contract work in held or excluded territory (register #165–#167).

**2026-09-03 residual-risk register: THIS TICKET'S RECORDED BLOCKER IS STALE.** The 113 + 2 + 1 are fully closed (84 fixed / 17 excluded / 4 territory / 8 n-a / **0 open**). The box stays open on the **1,138 never-asked** routes — and those are not one blocker: **468 are a harness gap (no request body sent; the OpenAPI bodies already exist at 1,371/1,371)**, 168 a seed gap, **88 are routes returning 500 to a VALID same-tenant request**, ~149 permanently unprobeable. **A-1 / A-2 / A-3 ASSIGNABLE**, **R-4 / R-4b** residual. See `reports/residual-risk-register.md` §1.1, §1.2, §3.3.

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
      **DISPOSITION 2026-09-03 — the BLOCKED line above is STALE and would have sent the next reader looking for
      work that no longer exists. Register: `reports/residual-risk-register.md` §3.3 and §1.1-1.2.**
      **The recorded blocker ("BLOCKED on other territory for the actionable remainder: the 113 + 2 + 1") is false
      at head.** `reports/cross-tenant-404-contract.md` accounts for all 113 — **84 fixed · 17 excluded scope · 4
      another territory · 8 not applicable · 0 still open** — and the 2 SERVER-ERRORs, the 1 INCONCLUSIVE and the 1
      LEAK are all fixed. What actually keeps this box open is the clause buried below it: **1,138 routes were never
      asked**, so 666/1,921 = 34.7% is what "every object-addressable route" currently means.
      **Re-verified from the raw artifact, not from this ticket.** `bola-live-offline.json` was located and
      re-parsed: 1,921 outcomes, `PASS 666 · UNPROBEABLE 1138 · NO-404 113 · SERVER-ERROR 2 · LEAK 1 ·
      INCONCLUSIVE 1`, at backend commit `ca4ec171`, generated 2026-09-02T20:19:47Z. Every count reproduces.
      **The 1,138 had never been opened, and they are not one blocker.** Bucketed by the probe's own `detail` field
      (`reports/residual-risk-register/bola-unprobeable-buckets.json`): **468** own-tenant control 400
      VALIDATION_FAILED (the probe sent no valid body — a HARNESS gap) · **168** the seed holds no object of that
      type · **149** the path segment is not an object (`:moduleKey`, `:token`, `:providerKey`) and is permanently
      unprobeable · **135** control 404 · **88** own-tenant control **500 INTERNAL_ERROR** · 48/32/24/14/8/4 control
      403/402/409/503/401/timeout.
      **A-1 — DONE 2026-09-03.** `test/security/bola/live/body-synthesis.ts` derives a minimal valid body and the
      required query parameters per route from the committed contract, and the sweep sends them; every outcome
      records `bodySource`, so a route probed with a derived body cannot be confused with one probed with `{}`.
      Offline: `jest --testPathPattern=bola-body-synthesis` exit 0, 20/20 — **1,362/1,362** JSON-bodied operations
      get a body (the other 9 are multipart, named individually), **0** derived bodies violate their own schema
      under an independently written reader, and `{}` is rejected by **911** operations of which the derived body
      is accepted by **911**. Live: a new harness proof sends both requests to the same route and the control moves
      400 -> 200. **Two corrections to this item's own text.** The contract is at `openapi.json`, NOT
      `contracts/openapi.json` (that path does not exist). And only **418** of the 468 are body-shaped: 34 GET and
      16 DELETE control-400 on a missing required QUERY parameter, so query is synthesised too. Six mutating
      object-addressable routes are absent from `openapi.json` altogether and are pinned by name — a
      cross-territory contract gap, not a harness one.
      **ASSIGNABLE A-2 — triage the 88 own-tenant 500s. Owner: release owner to route per module. Deadline:
      2026-09-08.** These return `INTERNAL_ERROR` to a **valid same-tenant** request on the seeded database — hr 37,
      build 10, finance 9, inventory 6, crm 5, accounting 4, party 3, payroll 3, support 3, +8 more. Two routes of
      exactly this shape (`GET /surveys/:surveyId/builder`, `/logic`) turned out to be a **write on a GET** violating
      a composite FK. Nothing says the other 88 are benign; nothing has looked. Full list in the companion JSON.
      **A-3 — DONE 2026-09-03.** The audit route was indeed already fixed; the other three now resolve the envelope
      through `mustGetVisibleEnvelope` before their `findMany`, so a cross-tenant id and an absent id answer the
      SAME 404 — asserted by comparing the two exception bodies, not just their status. The scope is a REQUIRED
      parameter (an optional one with a permissive default is the fail-open shape), and the seven internal callers
      name `SYSTEM_ENVELOPE_SCOPE`. Proof: `jest --testPathPattern=bola-esign-envelope-children-404` exit 0, 34/34;
      with the guard removed from all three services, exit 1, **18 failed / 12 passed**.
      **P1 FOUND BESIDE THEM AND FIXED — `GET /sign/documents/:documentId/preview`.** Not in this register.
      `sign:documents:view` is not scopable, so every holder resolved "all" and could mint a signed URL for the
      SOURCE PDF of any envelope in the organisation by walking `documentId` — the register #15 shape, missed
      because it reads `sign_documents` rather than `sign_certificates`. Now bound to `sign:envelope:view` and
      reusing the missing-document message.
      **RESIDUAL R-4 — 17 excluded-scope no-404 routes (crm/leads/deals/contacts/inventory), 7 of them write verbs
      answering 204 on nothing. Blocker: SCOPE. Owner: CRM/inventory release owner. Deadline: 2026-12-01 review.**
      **RESIDUAL R-4b — whatever of the 1,138 survives A-1 and A-2 (at minimum the ~149 not-an-object routes, which
      are correctly unprobeable, plus the 135/48/32/24 control preconditions). Blocker: harness reach. Owner:
      security/BOLA harness owner. Deadline: 2026-09-17.**
      **ARTIFACT WARNING — `bola-live-offline.json` is NOT in either repository.** It exists only in the session's
      temporary scratchpad (1.4 MB, alongside `bola-live-partA.json` and `bola-live-full.json`); a `find` across
      both repos for `bola-live*` returns nothing. Ticket 41 box 2 requires the failure artifact to be recorded.
      The derived bucket summary is committed at `reports/residual-risk-register/bola-unprobeable-buckets.json`,
      but the raw per-route probe should be copied into the repo before this session ends.
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
