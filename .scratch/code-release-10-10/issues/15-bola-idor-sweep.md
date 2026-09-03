# 15 — BOLA/IDOR sweep across every object-addressable surface

**What to build:** Systematic broken-object-level-authorization testing across reads, writes, bulk actions, files, exports, search and vector queries, realtime channels, background jobs and public/share-token paths. A cross-tenant miss returns 404, never 403 — a 403 confirms the object exists.

**Blocked by:** None — can start immediately.

**2026-09-03 — E-SIGN SWEPT AND THE SWEEP EXTENDED TO THE REQUEST BODY. Report
`reports/15g-esign-and-body-id-sweep.md`; backend commits `54c8555f` and `6fc7a55f`.**
The e-sign module — recorded as "not touched" by the triage pass and only partly covered by 15e —
was read in full (12 controllers, 20 services, 11 public token routes). **Three defects found and
fixed** plus a fourth found by the body sweep: the AI summary route ignored `sign:envelope:view`'s
DataScope (an `own`-scoped holder could read any agreement in the org through the model); both
`POST /sign/admin/run-*-sweep` routes ran with **no tenant predicate at all** and were confined only
by the ambient RLS GUC; `publish-public-form` 500'd on a slug another tenant holds because RLS makes
its pre-check blind and the global unique index then fires (500-vs-201 was an existence oracle); and
the watermark policy's `scope_id` was written without being resolved. The **signer-token surface was
swept and CLEARED** — a token cannot read another envelope's document, cannot write another
recipient's field, expires on `tokenExpiresAt`, and is 256 bits so it cannot be enumerated.
**The BOLA sweep now probes ids in the REQUEST BODY and QUERY STRING, not only the URL path.**
Enumerated from `openapi.json`: **3,613 operations, 1,047 id-shaped fields (809 body, 238 query) on
667 operations**; **209 findings** where the id reaches a row as a reference and is never read back
under the caller's org. Cross-checked against `pg_constraint`: of the 172 columns, **92 carry a
composite tenant FK** (a cross-tenant id cannot land), **17 a bare FK** (it lands, and a nonexistent
id 23505s instead — an existence oracle), **58 no FK at all**. Ratcheted and self-tested at
`test/security/bola/bola-body-id-binding.spec.ts` (19 tests) and
`bola-esign-scope-sweeps-and-token.spec.ts` (25 tests).

**Status:** 5 of 6 boxes closed; the sixth is still PARTIAL, but **A-1 and A-3 are now DONE** (2026-09-03,
report `reports/15e-esign-404-and-bola-body-synthesis.md`). A-3's three e-sign no-404 routes return 404,
plus a P1 within-tenant leak found beside them (`GET /sign/documents/:documentId/preview` served any
envelope's source PDF in the org). A-1's harness gap is closed: the sweep now derives a minimal valid
body AND the required query parameters per route from `openapi.json` (1,362/1,362 JSON-bodied operations,
911/911 of the operations that reject `{}`), and the 468 were re-probed live. The sixth box stays open on
what the re-probe does not reach. The live sweep ran: **1,921 routes probed, 666 return the required 404, 116 measurably do not, 1,138 were
unprobeable and are covered statically only, and 1 real cross-tenant leak was found and fixed.** What remains is
per-module contract work in held or excluded territory (register #165–#167).

**A-2 CLOSED 2026-09-03 — `reports/15f-own-tenant-500-triage.md`.** The 88 own-tenant 500s were triaged to
**four** causes and **62 are fixed** (88 -> 26 measured on the sweep's own database). No write-on-GET among them;
the one 25P02 was a shadow that had been replacing the real error since it was written. 26 remain: **18** in
build/crm/inventory (other territory or excluded), **7** reachable only through rows the harness inserted directly,
and **1 real defect blocked on `migrations/`** — `POST /support/:supportTicketId/follow` 500s for every caller at
head because `support_ticket_watchers.user_id` is `NOT NULL` in the database and absent from the Drizzle schema.

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
      **A-2 — DONE 2026-09-03 for everything in reach; 88 -> 26. Report `reports/15f-own-tenant-500-triage.md`.**
      Each of the 88 was replayed against the sweep's OWN database (a `TEMPLATE scratch_t15` copy) with
      `process.stderr.write` intercepted, so every 500 is attributed to a message, SQLSTATE, table and stack frame
      rather than to a status code. Harness + the 88-route list are committed:
      `test/security/bola/t15-own-tenant-500.seeded-e2e-spec.ts` and `live/own-tenant-500-routes.json`.
      **Four causes, not eighty-eight.** RC-1 **56 routes** — an empty PATCH body reaches an all-conditional change
      set and Drizzle's `mapUpdateSet` throws `No values to set` (`drizzle-orm/utils.js:92`); the DTO is all-optional
      so `{}` validates and then cannot be written. RC-2 **19** — a path parameter declared `z.string().min(1)`
      addressing a `uuid` column, so the id reaches Postgres and raises **22P02**. RC-3 **1** — declared-vs-live
      schema drift. RC-4 **7** — rows the harness inserted directly with placeholder values.
      **No route in the 88 writes inside a GET.** All 13 GETs are reads: 11 failed on the SELECT (RC-2), 2 on a
      fixture row's shape. **25P02 appeared exactly once and was a shadow, as predicted** —
      `PayrollInputsService.buildPeriod` compensated a failed build from inside its `catch`, that write hit the
      connection the build had already aborted, threw 25P02 **before `throw err`**, and so REPLACED the original
      error. Every failed build reported "current transaction is aborted" and lost its cause. Guarded; the real
      fault behind it is `Invalid time value`.
      **62 fixed** across hr / finance / accounting / payroll / support / sales / surveys / expenses / gdpr
      (`425f930a`, `5cda9874`, `40b4367b`, `4722a208`). A central "empty PATCH is a 400" rule in the validation
      interceptor was considered and **rejected**: measured from the artifact, `{}` already answers **200 on 174 of
      431 PATCH routes**, and a central rule would break every action-shaped PATCH (`…/tickets/:ticketId/rank`,
      `/crm/automations/:ruleId/enable`, `/chat/huddles/:huddleId/heartbeat`). The fix is what the 174 already do —
      stamp `updated_at`, or where the table has none, read the object back under the same tenant predicate.
      **Two defects found beside the 88.** `EngagementService.updateSurvey` returned `{ success: true }` for ANY
      survey id including another organisation's — a silent no-404 on a write verb, now a `NotFoundException` on the
      tenant-bound row. `HrBenefitPlansService.deletePlan` let a **23503** out as a 500; it is a 409.
      **CLOSED 2026-09-03 by migration `1046` — was the 1 real defect blocked on `migrations/`.**
      `POST /support/:supportTicketId/follow` 500'd for every caller at head: `support_ticket_watchers.user_id` was
      `NOT NULL` with no default in the database and absent from `src/db/schema/support/support-workspace.ts`, so
      every insert omitted it (**23502**). `0865` expanded onto `user_membership_id` and `0866` validated the FK, but
      **no migration ever contracted the pair** — the four `*_actor_drop` migrations do not name this table.
      `1046_t15f_support_ticket_watchers_actor_contract` finishes it: backfill, delete the rows whose watcher is no
      longer a member (0 on both measured databases, announced with `RAISE NOTICE`), `SET NOT NULL` through the
      `CHECK … NOT VALID` two-step, drop `user_id` with its legacy unique index and single-column FK. Proved on a
      scratch copy: the same request that raised 23502 before now answers **200 `{"success":true}`**, and a
      cross-tenant ticket id answers **404**. The diagnosis handed on in `reports/15f…` §2c was correct in every
      particular; the DDL it proposed was followed with two changes — the unmappable rows are counted and announced
      rather than deleted silently, and the legacy index/FK are named explicitly.
      `reports/07b-declaration-drift.md` missed the table because neither of its two populations is column-level in
      the live→declaration direction; the detector for that population now exists as
      `pnpm check:declaration-column-drift`. See `reports/15g-support-follow-and-column-drift.md`.
      **NOT FIXED — 18, other territory / out of scope.** build 7 (all RC-1, one line each at
      `approvals.service.ts:283`, `projects-releases.service.ts:67`, `sprints.service.ts:111`,
      `meetings.service.ts:294`, `projects-ticket-links.service.ts:168`, plus labels and pm-workspaces) — **owner:
      build module owner**; crm 5 and inventory 6 — **excluded from the release**.
      **NOT FIXED — 7, harness-fixture rows, not production-reachable.** Each creating endpoint validates the shape
      the fixture violates: `hr_polls.options='{}'` (`GET /hr/engagement/polls/:pollId/results`, hr/performance),
      `hr_form_submissions.form_schema_snapshot='{}'` (`GET /hr/forms/:formId/submissions`, hr/forms),
      `period_key='bola-fixture'` (`POST /hr/payroll-inputs/periods/:periodId/build`, hr/payroll-inputs),
      `start_month='bola-fixture'` -> 22007 (`POST /payroll/policies/:policyId/activate`, payroll/setup),
      `payload='{}'` (`POST /accounting/recurring-invoices/:templateId/run-now`, finance/ar), a zero-amount note
      (`POST /accounting/credit-notes/:creditNoteId/post`, finance/ar) and an empty merge snapshot behind an
      `as unknown as MergeSnapshot` cast (`POST /party/merges/:partyMergeId/revert`, party).
      **What this returns to this box:** of the 88, `500` 88 -> **26**, `200` 3 -> **22**, `400` 1 -> **21**. The 21
      are RC-2 rejecting the literal `1` the sweep sent for a uuid parameter — with a correctly-shaped borrowed id
      their controls now succeed, so the fix removes the reason the sweep could not ask, not just the status code.
      Gates: backend `typecheck` exit 0; `check:spec-typecheck` exit 0; `jest --testPathPattern=test/security/bola`
      exit 0 (**18 suites / 263 tests**); the 30-module focused jest exit 0 (**114 suites / 808 tests**).
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
      **2026-09-03 — the body/query half of this box was never asked, and now has been.** Every
      earlier pass probed the object id in the URL PATH; `tenant-binding.ts` asks a per-ROUTE
      question that the path parameter's own predicate always answers `yes`. Asked per FIELD across
      the whole contract: **282 org-predicate + 9 object-assertion + 95 filter-in-org-query
      resolved**, **209 written-unresolved**, 174 unresolved, 269 never-read, 6 handlers unresolvable
      (named individually so the blind spot cannot grow). Of the 209, the database already refuses
      92 columns' worth through a composite tenant FK; the live remainder is 17 bare-FK sites (7 to a
      tenant-owned table, 17 to global `users`) and 58 no-FK columns.
      PARTIAL — 1 of the 209 fixed. `sign_watermark_policies.scope_id` is the only one inside the
      territory this session held; everything else is another module's or excluded.
      NOT FIXED, owners named: `POST /calendar/events` `linkedDealId`/`linkedLeadId` (calendar),
      `POST /timesheets/rates` `clientId` (timesheets), 17 sites storing another organisation's user
      as assignee/owner/manager (hr 9, inventory 3, crm 3, surveys 1, tasks 1), 29 `no-fk` body ids
      in build. **CRM and inventory are EXCLUDED from this release** — 9 + 9 no-FK and 3 + 6 bare-FK
      sites recorded with the exclusion named, including `POST /inventory/stock/transfers`
      `toWarehouseId`, a stock transfer whose destination warehouse is never resolved.
      BLOCKED on nothing but ownership: the analysis is static plus a `pg_constraint` cross-check,
      **not** an HTTP probe. A live body probe now has a target list of 209 instead of 3,613.
      The 5 `/blog/admin/*` holes are closed at the gate, which is the only place they can be closed: `blog_posts`/`blog_categories` are the vendor's global marketing content with no `org_id`, so there is no tenant to bind. The three `blog:*` keys are platform-only — excluded from `allCatalogScopes()`, so the OWNER/ORG_ADMIN short-circuit no longer confers them, and non-delegable, so no role grant, delegation or module ownership can. Proved by running it: 5 executable assertions in `bola-data-layer-binding.spec.ts`, including that a user on `PLATFORM_ADMIN_USER_IDS` does hold them, so the surface is gated rather than merely dead. `KbTagsService.setArticleTags` also gained the article-ownership assertion it never had.
      The `@Public()` support inbound surface is closed in 15d, where the org id in the path IS the authorization decision and the shared secret is the only credential: the secret is compared with `timingSafeEqual` over fixed-width digests (no timing and no length oracle), is hash-only at rest with a migration-free dual read for pre-existing rows plus a rotation path on the existing PATCH, and the pre-authentication rate limit is keyed on the client address rather than the caller-supplied `orgId` (the per-org quota is kept, after the credential is proved). 20 assertions in `bola-support-inbound-secret.spec.ts`, mutation-tested three times (3 / 1 / 5 red); the three KNOWN-OPEN pins in `bola-public-org-selector.spec.ts` are inverted into FIXED guards.
      PARTIAL: rows written before 15d still hold a plaintext secret. They verify correctly and nothing is broken, but hash-only-at-rest is not complete until a one-statement data backfill runs; `migrations/` is ticket 08's, and the exact statement is in `reports/15d-rag-scope-and-support-secret.md` §2b.
