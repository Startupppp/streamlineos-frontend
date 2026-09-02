# Consolidated defect register — code release 10-10

Mined from reports `00-seeded-perf-database.md` … `19-auth-rbac-settings.md` in
`.scratch/code-release-10-10/reports/`.

| | |
|---|---|
| Register written | **2026-09-03** (mining run 2026-09-02 → 2026-09-03) |
| `streamlineos-frontend` HEAD at read time | **`8cffb5b22047553f2b3b7fe89e6935dffb835e35`** (`main`, 2026-09-02 23:51:27 +0530, *"fix(a11y): a route error screen keeps the page heading it replaced"*) |
| `streamlineos-backend` HEAD at read time | **`d02479744521321b9c9d97014a1cb29588c78975`** (`main`, 2026-09-03 02:26:40 +0530, *"fix(announcements): stop accepting cross-tenant writes on markRead"*) |
| Source reports | 30 files, ~24,700 lines |
| Numbering | Original mined items keep their numbers. Late additions carry a letter suffix (`#9a`) or continue the tail (`#165`+), so no earlier cross-reference is invalidated. |

## Read this before acting on any status below

**Every FIXED / OPEN / PARTIAL / BLOCKED verdict in this register is a claim about the moment its
source report was written, not about head.** Roughly eight agents were writing to these two
repositories concurrently during the release, in a shared working tree, and the reports say so
repeatedly. Treat a `FIXED` here as *"a report claims this was fixed"* and re-check before relying
on it.

The reports themselves demonstrate how fast this goes stale — these are their own words, not an
inference:

- **19 §8**: *"ORCHESTRATOR-FINDINGS F1's '0 errors' is stale, and so is ticket 14's '12 errors in
  storage' — those cleared, these are new."* 19 also watched its own error count move **5 → 7 while
  it worked**, on files it never touched.
- **15c §4b**: the blog-AI billing P1 routed to it was *"stale, not live"* — already fixed by 15b and
  committed in `a3bf8470`, and **the routed file path and all three line numbers were wrong**.
- **15c §"What I found before changing anything"**: of 13 defects the brief called open, **nine were
  already fixed on disk**.
- **13 §S7**: a blocker S6 filed against `lib/api-client.ts` *"is no longer true, and it was already
  untrue when S6 wrote it"* (fixed by `ea1b576a5`).
- **18c**: three findings carried forward from 18/18b verified as **already closed**, including
  *"Nothing is code-scheduled — no longer true."*
- **14**: S4's diagnosis naming `modules/calendar` as the isolation gap was **stale** by S5; a
  different service had become the gap.
- **13 §S6**: *"The Explore-agent audit that produced the surface list was stale on two of three
  routed items. Anything else from it should be re-verified against source before being trusted."*

Two entries have already been superseded by direct measurement since this register was mined — see
**#129** and **#130**, both now `NOT-REPRODUCED-AT-HEAD`. One P1 that no report could have seen has
been added as **#9a**, and three items from a live cross-tenant HTTP probe as **#165–#167**.

**Corollary for the release manager:** the items most worth re-verifying are the ones marked FIXED by
an *early* report and never re-touched by a later one, and anything whose evidence is a typecheck or
a gate exit code rather than a behavioural test — those are exactly the numbers that moved under
concurrent edits.

---

## A. Demonstrated cross-tenant read / write

**1. 16 inventory tables had RLS disabled — cross-tenant read demonstrated**
`inv_landed_cost_*`, `inv_putaway_task*`, `inv_inspection_plan*`, `inv_demand_forecasts`, `inv_grn_line_serials`, `inv_channel_*`, `inv_customer_shelf_life_rules`, `inv_audit_export_jobs`, `inv_ai_feedback`, `inv_allocation_overrides`, `inv_proposal_overrides` (report 03 §3).
FAILS: as `streamline_app` (`rolbypassrls=false`) with `app.current_org_id` GUC = `org_probe_A`, a select returned **2 rows spanning `org_probe_A` and `org_probe_B`**; with no GUC at all it still returned 2 rows. RLS was *disabled*, not merely unpoliced (dropping the policy alone returns 0 rows and reproduces nothing).
**FIXED** by migration `0994` (authored by a concurrent session, committed in `a3bf8470`, applied by 03). After: 1 row with GUC, `ERROR 42501 no tenant context` without. Coverage 966/988 → **982/988, 0 exposed**; `db:verify-rls` exit 0; rollback round-trip proven. Also fixed the gate's own dishonesty: an unpoliced excluded tenant table now counts as a failure (previously the EXPOSURE block printed under `RESULT: RLS VERIFIED`, exit 0).

**2. `support_ticket_messages` (and 9 sibling tables) accepted a cross-tenant parent id**
Report 08b §2. Ten child tables carried a live `org_id` that Drizzle did not declare, so inserts relied on the `set_org_id_from_parent` (`trg_set_org_id`) trigger to derive the tenant from the parent FK.
FAILS: `automation.service.ts`'s `support_internal_note` action takes a ticket id from an automation payload; inserting a note against **another org's ticket id** made the trigger stamp that org's `org_id` and **write the note into the victim organisation's ticket**. Proven on `scratch_t09_cold`: after the fix `INSERT INTO support_ticket_messages (org_id='org_m1', ticket_id=<ticket owned by org_m2>)` → `T1 PASS: refused, 23503, by fk_support_ticket_messages_ticket_id_org`.
**FIXED**: 10 declarations now name `orgId` + anchor + composite FKs; 12 insert sites pass `orgId` explicitly; two callers (`hr-workflow-definitions.upsertSteps`, `recruitment-automation` step replacement) also gained `WHERE org_id = ?` on their delete. `check:tenant-indexes` declaration mode 829/829 → **839/839**, exit 0. No migration needed.
**Residual OPEN**: 22 more undeclared tenant columns (CRM 7, inventory 15) — owner: those modules.

**3. Cross-tenant recruiter unassignment**
`hr/recruitment/recruitment-jobs.service.ts::removeRecruiter` + its controller (15, P0-2).
FAILS: `DELETE /hr/recruitment/jobs/:jobId/recruiters` deleted on `eq(jobPostingId, jobId) AND eq(userId, input.userId)` with **no org binding**; controller never passed `u.orgId`. Any holder of `hr:employees:manage` in **any** org could unassign recruiters from **any other org's** job postings. Its own sibling `assignRecruiter` already called `ensureJob(orgId, jobId)`.
**FIXED** in 15: signature now `removeRecruiter(orgId, jobId, input)` + `ensureJob`. Proof `bola-cross-tenant-404.spec.ts` 5 assertions (404 not 403; nothing deleted on the miss; predicate binds caller's org not victim's; same-tenant delete still succeeds); `jest --testPathPattern=recruitment` → 8 suites / 65 tests.

**4. Cross-tenant candidate enrolment + global candidate-enumeration oracle**
`hr/recruitment/recruitment-automation.service.ts:315` (15, P0-3).
FAILS: `POST /hr/recruitment/email-sequences/:sequenceId/enroll` verified the *sequence* against `orgId` but never `input.candidateIds`; they were inserted into `email_sequence_enrollments`, which had **no `org_id` column**, and the response returned the **requested** count. Because `candidate_id` FKs to `candidates.id`, a nonexistent id raises an FK violation while a real cross-tenant id succeeds — one request per id **enumerates the global candidate table**.
**FIXED** in 15b: ids deduped, verified under `eq(candidates.orgId, orgId)`, whole request 404s unless every id belongs to the caller, insert uses `.returning()` so `enrolled` is the affected count. Durable `org_id` column landed by another agent's schema edit (that made 15's pin `bola-bulk-mixed-tenant.spec.ts:238` go red; 15d left it for the landing agent to invert).

**5. `KbTagsService.setArticleTags` — fully unscoped cross-tenant write**
15c §1.
FAILS: wrote a **foreign `tagId`** into the caller's org and then hid it by re-selecting org-scoped; it also never checked that `:articleId` belonged to the caller, so a foreign article id **created a row in the caller's org pointing at another tenant's article**.
**FIXED** in 15c (both halves), with the count-check template from `build/core/projects-tickets-query.service.ts:155`.

**6. `credit_note_items` / `vendor_credit_items` — cross-tenant parent reference, hidden by a mis-scoped gate**
05 P1-4 + 03 §1.
FAILS: `credit_note_items(credit_note_id) → credit_notes ON DELETE CASCADE` carried no `org_id`, so org A's credit-note **line** could reference org B's **header**, a tenant-scoped join returned the other tenant's header, and deleting org B's header **cascaded org A's line away**. Invisible because `check-tenant-relationships.mjs:76-84` listed `credit_notes`, `vendor_credits` and `enterprise_quotes` in `CRM_TABLE_NAMES`, and `isCrmTable()` excludes in both static and catalog mode — "OK, zero actionable" forever.
**FIXED** by migration `0995` (verified in `pg_constraint`, all four composite, `validated=true`); 03's gate went exit 1/4 actionable → **exit 0/0 actionable**.

**7. `coupons.code` — cross-tenant denial of service + enumeration oracle**
`coupons_code_unique UNIQUE(code)`, `src/db/schema/common/subscriptions.ts:54` (05 P1-6).
FAILS: reproduced live — org A creates `SUMMER25`; org B gets `ERROR: duplicate key value violates unique constraint "coupons_code_unique"`. The first tenant to take a code **permanently blocks every other tenant**, and the 409 confirms some *other* tenant owns any guessed code.
**FIXED** by migration `0993` (partial uniques: `(code) WHERE org_id IS NULL` + `(org_id, code) WHERE org_id IS NOT NULL`). After: `org B creates SUMMER25 → INSERT 0 1`.
**New P0 handed on, OPEN**: `billing-coupons.ts:73-79` looks up `code = ? AND is_active AND (org_id IS NULL OR org_id = ?)` with `findFirst` and **no `orderBy`** — two rows can now match (tenant + platform) and one is picked arbitrarily. One-line fix (`ORDER BY (org_id IS NULL)`). Owner: `modules/billing` / ticket 19.

**8. Six export/search/report routes ignored the DataScope their list sibling applies**
15 P0-4. Each leaked, on the same permission key:
- `GET /deals/aging` (`crm:deals:read`) — up to **100 full deal records** (id, name, value, stage, assignee) bound only by `orgId`, and Redis-cached as `deals:aging:${orgId}` with no scope in the key.
- `GET /clients/export`, `GET /leads/export`, `GET /contacts/export` + `/contacts/search` + `GET /contacts` (contacts had **no scope helper at all** — `own` was unimplemented across the module).
- `GET /kb/search` (`kb:articles:view`) — unscoped results feed the RAG context window.
- `GET /sign/reports/dashboard` — `recentActivity` was `signAuditEvents.findMany({where: eq(orgId), limit: 10})`, i.e. **the last 10 audit events across every envelope**, and `sign:envelope:view` is seeded at scope `own` for module members (`seed-system-roles.ts:49`), so directly reachable.
**FIXED** in 15b. `check:scope-application` **140 resolutions / 140 applied**, exit 0. Pin inverted to `FIXED: every hand-verified disclosure now resolves a scope` (15c).

**9. RAG retrieval (`POST /kb/ask`) applied no object-level article-owner DataScope**
`KbSearchService.retrieveTopArticles`; callers `kb-ask.service.ts:97-104`, `kb-research-brief.graph.ts:125` (15b finding 4 → 15c finding 1 → 15d §1).
FAILS: space membership, article restrictions and page visibility were applied but the article-owner scope concept was **absent**; `contentText` went straight into the prompt, so a chunk the asker cannot read is disclosed the moment it enters the context window.
**FIXED** in 15d: new `kb-article-owner-scope.ts`, scope resolved internally by `KbSearchService` (not passed as a parameter, so a caller cannot forget it), predicate pushed into `articleKeywordCandidates`, `articleVectorCandidates`, the hydration select and `KbAskService.resolveVisibleArticles`. Zero new joins/columns/migrations. Proof `bola-rag-object-scope.spec.ts` **18 tests** with a real drizzle `PgDialect` compiling the actual WHERE: an asker at `own` never sees `VICTIM-SECRET-TEXT`, every predicate binds membership `7` and never `99`, `none` refuses in SQL. Mutation-tested twice (A: 6/18 red, B: 4/18 red), restored `diff -q` identical.
**Honest caveat**: `kb:articles:view` sits in `UNIVERSAL_MEMBER_PERMISSION_GRANTS` at scope `all` and `applyUniversalGrants` takes `broadest(existing, grant.scope)`, so **for an ordinary human-session member the predicate is a no-op** on both endpoints. It bites for `account-only`, `personal-token`/`agent-token` and module-denied principals. Changing that is a product decision on the universal grant.

**9a. `POST /org/announcements/:announcementId/read` took no orgId at all — cross-tenant write + enumerable existence oracle**
`AnnouncementsController.markRead` → `announcements.service.ts`. **Added by the coordinator after this register was mined; no report could have seen it.** Found by a live cross-tenant HTTP probe over 1,921 routes, not by static analysis.
FAILS: the handler resolved **no organisation whatsoever** and inserted a read receipt for **any announcement id in the system**. Ids are sequential integers behind `ParseIntPipe`, so the route was also an **enumerable existence oracle across every tenant**. The probe's three-way result is what makes this a real finding rather than one of the 113 contract gaps in **#165**: control **201**, cross-tenant **201**, **absent-org 500** — a route that answers *differently* for an id belonging to no organisation is resolving the path object, which is precisely what the 113 NO-404 routes do not do.
Why the database did not catch it: `announcement_reads.org_id` is **nullable** and was omitted on the insert, and **a composite foreign key is not enforced when one of its columns is NULL** — so `fk_announcement_reads_announcement_id_org` never fired. Both the application predicate and the schema's own backstop were absent at once.
**FIXED, both halves**: the announcement is resolved inside the caller's organisation (404 on a miss, **never 403** — a 403 would confirm the id exists), and `org_id` is stamped on the insert so the composite FK actually engages. Landed at backend **`d02479744521321b9c9d97014a1cb29588c78975`** (*"fix(announcements): stop accepting cross-tenant writes on markRead"*).
**Evidence**: two regression tests, **bite-proven in a hermetic `git archive` tree** rather than the shared working tree — vulnerable source **fails 2 of 6**, fixed source **passes 6 of 6**.
**Lesson worth carrying**: this route sat inside the 1,912-route static sweep that report 15 scored at 99.16% bound, and it was not one of the 16 it named. A static sweep that follows a handler into the data layer cannot see a handler that never reaches for the tenant in the first place — the live probe found it in one request.

---

## B. Auth bypass / permission gate that does not bite

**10. Any customer org owner/admin could edit and hard-delete the vendor's public marketing blog**
`blog/blog-admin.controller.ts` + `blog.service.ts` (15, P0-1).
FAILS: `blog_posts`/`blog_categories` are deliberately global (no `org_id`), correctly queried by id — the hole is the gate. `blog:posts:manage` / `blog:categories:manage` sit in the **tenant** catalog, and `access-permission.resolver.ts:117-121` short-circuits every OWNER and ORG_ADMIN to `allCatalogScopes()`. No role template grants them, so nobody noticed; the short-circuit grants them anyway, and `BlogAdminController` carries no `@RequireModule`. Any customer admin could list vendor drafts, rewrite published marketing posts, and `deletePost` is a **physical DELETE**.
**FIXED** in 15b: three keys declared `PLATFORM_ONLY_PERMISSION_KEYS` in `common/rbac/grantability.ts`; `access-policy.ts::allCatalogScopes()` skips them; `platformCapabilityScopes(userId)` merged at both short-circuits; new `common/rbac/platform-operators.ts` with `PLATFORM_ADMIN_USER_IDS`. Controller unmodified. 13 tests green, including *a plain MEMBER on the allowlist resolves all three but not `crm:leads:view`* (proving standing is the deployment's, not the org's). 15c added 5 executable assertions and renamed the pin `KNOWN_OPEN_DEFECTS` → `PLATFORM_GLOBAL_RESOURCE`.
**Residual, OPEN, needs a product confirmation**: `PLATFORM_ADMIN_USER_IDS` is **absent from the live `.env`** (verified by 15d), so `/blog/admin/*` is reachable by **nobody**. 15d confirms this is the documented intended fail-closed default; the operational action is to add the vendor blog operator in production.

**11. `GET /tasks` — widening gate present, does not bite**
`tasks.service.ts:26-42` (15, P1-4).
FAILS: `canViewAllTasks` was `(resolved.get("crm:tasks:view") ?? "none") !== "none"`. `crm:tasks:view` **is** `scopable: true` (`rbac/permissions/crm.ts:333`), so `own` and `team` both pass, the owner predicate is dropped entirely, and `?assigneeId=<anyone>` returns that person's tasks. The read key `tasks:read` is an employee-self-service default (`role-defaults.ts:62`), so **every active member** reaches the route.
**FIXED** in 15b (new `tasks-scope.ts`, widens only on `scope === "all"`). Fixing it exposed a sibling: **`GET /tasks/analytics` returned org-wide aggregates plus a `perRep` leaderboard naming every assignee** under the same key — also fixed.

**12. Four fail-open scope resolvers: every caller resolved `all`**
`goals/goals-scope.ts:10`, `hr/directory/assets-scope.ts:16` (15, P1-3) and `dashboard/dashboard-scope.ts` ×2 (found by 15b, invisible to the harness because the key comes from `permissionOf(...)` not a local literal).
FAILS: `if (!isScopable(KEY)) return "all";` — `build:goals:manage`, `hr:assets:manage`, `hr:leaves:view`, `build:tickets:view` carry **no `scopable: true` entry**, so `isScopable` is permanently false, the resolver returns `"all"` for every caller, and `applyScope("all", …)` degrades to `sql\`true\``. `GET /hr/asset-returns` gates on `hr:assets:view` while the resolver reads `:manage`, so every viewer resolved `all`. The gate reads as present in review and admits everyone at runtime.
**FIXED** in 15b (branch deleted; `resolved.get(KEY) ?? "none"` decides). Two specs that **asserted the insecure behaviour** were rewritten (`assets-scope.spec.ts` "returns all when permission is not scopable"; `dashboard-project.service.spec.ts` "returns all regardless of access service"). Live fail-open resolvers 2 → **0**.
**Left deliberately**: `hr/performance/performance-scope.ts:12` has the same catalog gap on `hr:performance:manage` but fails **closed**, so HR_ADMIN sees zero performance reviews — safe direction, dead surface; widening it is a product call.

**13. `GET /leads/export` accepted an `assigneeId` filter with no scope check**
`leads-reports.controller.ts:126` → `leads-exports.service.ts:65` (15, P1-5).
FAILS: `exportQuerySchema`'s optional `assigneeId` was pushed straight into the predicate; the same controller imports `resolveLeadsViewScope` and uses it on `/leads/analytics` and `/leads/sla-alerts` **but not here**. A `SALES_REP` narrowed to `own` could export the whole org's lead book **and target a named rival rep**.
**FIXED** in 15b via `pushLeadPartyViewScope` — the `assigneeId` filter now intersects the caller's own scope, so an `own`-scoped rep asking for a rival's book gets an empty file.

**14. `GET /timesheets/billing/rate-preview` `userId` ungated**
`timesheets/core/billing.service.ts:437-449` (15, P2).
FAILS: discloses another member's resolved billable rate; `billing.service.ts` contains zero occurrences of `scope`, while every other timesheets read gates the same param on DataScope (`entries-read.service.ts:36` is the template).
**FIXED** in 15c — and the fix is the constitution's trap in exact form: the route's own key `timesheets:billing:view` is **not** `scopable`, so gating on it would resolve `all` for every holder and bite nothing; it is gated on `timesheets:team:view` instead. Resolution lives in `timesheets-core-scope.ts::resolveRatePreviewSubject`, called from the controller (which also kept `billing.service.ts` at 497 lines, under the 500 limit).

**15. `sign:certificate:download` bypasses `sign:envelope:view`'s `own` scope — STILL OPEN**
`e-sign/sign-certificates.controller.ts:47` → `sign-finalization.service.ts:285` (15, P1-1).
FAILS: `GET /sign/envelopes/:envelopeId/final-pdf` binds only `orgId`, while `GET /sign/envelopes/:envelopeId` applies `viewAll`/`membershipId`. Reachable path is a per-person `user_permission_grants` grant of `sign:certificate:download` to a member whose `sign:envelope:view` is `own` — that member can then **download every fully-executed contract PDF in the organisation**.
**NOT FIXED, and never revisited** — no mention in 15b, 15c, 15d or 19. **Unowned.** Severity was correctly corrected down from a P0 claim (module members only get `:view`/`:read` keys), but it takes only a deliberate per-person grant, which §5 explicitly supports.

**16. Bulk endpoints silently processed the owned subset and returned 200**
15 P1-2 (15 confirmed sites; 51 `no-count-check` sites detected).
FAILS: `inArray(table.id, ids)` beside `eq(table.orgId, orgId)` narrows the work to owned rows and reports success, so the caller is told every id was acted on. `NotificationsLifecycleService.bulkDelete|bulkArchive|bulkMarkRead` had **no `.returning()` at all** and unconditional `{success: true}` — while the single-id path 180 lines above already did `.returning()` then `throw new NotFoundException()`. `RecruitmentCandidateOpsService.bulkReject` sent **real rejection emails** to the owned subset. `SurveyParticipantService.invite|remind` and `LeadsOpsService.bulkUpdate` returned the **requested** count. `ApprovalsBulkService.bulkApprove` folded a cross-tenant `NotFoundException` into `skipped`, indistinguishable from "period not submitted". `DataQualityResolutionService.resolve` combined `organizationId` with `status='open'`, so a foreign id looked like an already-decided one.
**FIXED — 10 sites** in 15c, each comparing the **deduplicated** requested count against rows returned under the tenant predicate and throwing `NotFoundException` (404, never 403). The three with a legitimate per-row skip assert **tenant membership first and on its own**, so an ordinary skip does not become a 404. Numbers: `no-count-check` 51 → **45**; `fail-whole` 4 → **21**; `CONFIRMED_SILENT_SUBSET` 12 → **2**.
**OPEN**: `DealsCrudService.bulkDelete|bulkUpdate` (CRM, excluded by scope, pinned by name). Same one-line count check.

**17. `user-ops-bulk-update.spec.ts:93` encodes silent subsetting AS the isolation guarantee — OPEN, needs a decision**
`users/user-ops.service.ts:170-183`; spec titled *"bulkUpdateUsers — cross-org isolation"* asserts `expect(result.updated).toBe(1)` for a 2-id request.
FAILS: the service narrows with `inArray(organizationMembers.userId, userIds)` under `eq(orgId)` and returns `{success: true, updated: scopedIds.length}` — the owned-subset count, 200. Flagged by 15, 15c and 15d; **nobody has changed it** because flipping it reverses a deliberate decision. 15d added two reasons it is more than a one-liner: `bulkUpdateUsers` writes `hr_employments` and role assignments **inside the transaction before the count is known**, so the check must sit immediately after the `memberRows` select; and the route may legitimately receive ids for removed members, in which case the honest fix is a per-id verdict (the shape `POST /users/bulk-suspend` already returns). **Owner: whoever owns `modules/users`.**

**18. Four authenticated frontend pages reachable by any active member**
16 §P1.
FAILS: `app/(authenticated)/ai/executive-brief/page.tsx` is `"use client"` with **no gate at all** and no `ai/layout.tsx`, though the route-access registry declares `ai:executive-brief:view`. `surveys/new`, `surveys/[surveyId]/participants`, `surveys/live/[sessionId]/host` are gated only by client-side `<DashboardGate>` + `<RequireModule module="surveys">`; `surveys/` has no `layout.tsx`, so the effective server gate is the root `requireSession()` — **a member of an org with the surveys module disabled still renders these shells**.
**NOT FIXED** — reported, belongs to ticket 25 (`app/**`). Prescribed fix: `app/(authenticated)/surveys/layout.tsx` calling `enforceRouteAccess("/surveys")`, plus an `ai/executive-brief` server gate. The rewritten `page-level-gates.test.ts` audits all 556 pages / 28 module dirs and currently reports **1 failed / 9 passed**, the failure being exactly these four; bite-proven by swapping `requirePermission("party:subjects:view")` → `requireSession()` in `subjects/page.tsx`, which added exactly one line to the failure list.

**19. Org-wide API keys were gated on a permission `MEMBER` holds**
`settings.controller.ts`, `GET|POST|DELETE /settings/api-keys*` (19, P2.2).
FAILS: these create and revoke **organisation-wide** API keys but were declared `@RequirePermission("settings:api-tokens:read|write")` — keys `ROLE_DEFAULT_PERMISSIONS` grants to **`MEMBER`**, because they were minted for the *personal* token surface. Only the in-service `isStructuralOrgAdminContext` check stood between every member and an org API key; delete that check as redundant ("the permission already gates it") and the hole opens.
**FIXED** in 19: re-gated on `settings:manage`. No consumer breaks (grep finds no frontend caller of `/settings/api-keys`). Also fixed: `revokeApiKey` issued its `UPDATE` keyed on `id` alone — now `and(eq(id), eq(orgId))`.

**20. `POST /settings/users/:userId/role` was a weaker second implementation of a member-role change**
19, P3.0.
FAILS: a duplicate of `PATCH /organization/members/:memberId` with **no `FOR UPDATE` on the member row, no last-structural-admin check, no module-ownership check, no audit entry, no role-changed notification**, reachable through a *different* key. A caller holding `settings:rbac:manage` could **demote the last org admin** through a route the organization module already refuses.
**FIXED** in 19 pass 3 (commit `27e901ec`): now delegates to `OrgMembershipService.updateMemberRole`; `SettingsService` lost `PlanLimitsService` and `AccessService`.

**21. `/settings/custom-fields` constrained neither the tenant's module nor the entity type**
19, P3.2.
FAILS: `custom_field_definitions` is shared — Support scopes to `ticket`, HR to `employee`, Build to its own constant. `updateCustomField`/`deleteCustomField` took a bare `fieldId` and keyed on `(id, org_id)` alone, so a holder of `settings:custom-fields:manage` could **rename or drop a Support ticket field or an HR employee field** — same tenant, wrong module, which no cross-tenant test sees and no RLS predicate catches.
**FIXED**: `CRM_CUSTOM_FIELD_ENTITY_TYPES` is the third clause of every predicate; a foreign row is a **404**, never 403. Bite-proof: the four `OWNED_ENTITY_TYPES` clauses stripped → **2 failed / 6** in `settings-custom-fields-tenant-isolation.spec.ts`.

**22. Six module settings trees 403 for their own module administrators — PARTIAL / OPEN**
19 §3 / P2.4.
FAILS: 15 of `SettingsController`'s 23 routes are module-owned surfaces at a global path, gated on `settings:custom-fields:manage` / `settings:automations:view|manage` / `settings:manage`, which have **no seeded rung and no template** — held only by OWNER and ORG_ADMIN. A `CRM_MODULE_ADMIN` cannot open CRM's own custom-fields or automations screen; a `BUILD_MODULE_ADMIN` cannot open Build's git integrations.
**PARTIAL**: pass 3 moved 6 of the 15 (`/settings/ai-usage` → `GET /ai/usage` on `ai:usage:view`; the four git routes → `/integrations/git/connections` on `integrations:git:view|manage`, with `MODULE_ADMIN_EXTRA_KEYS.build` as the rung; the role route delegated). Old paths live one release on `SettingsDeprecatedRoutesController` with `SETTINGS_ALIAS_SUNSET = 2027-03-31`.
**OPEN, needs product + six module owners**: custom fields (4 routes, provably CRM-only in both directions → mint `crm:custom-fields:view|manage`) and automations (6 routes, genuinely spans CRM/HR/Support/Accounting → needs an ownership decision). **Sharp edge recorded**: do *not* widen the global rung — `settings:custom-fields:manage` is not module-scoped, so granting it to `CRM_MODULE_ADMIN` would let them manage HR's and Support's field definitions too (the service filters by `entityType`, never by the caller's module). Trades a 403 for a cross-module privilege.

**23. `auth.controller.ts` — three `@Public()` routes gated only by a non-constant-time `!==` on `INTERNAL_API_SECRET`, with no rate limit**
19 §1 inventory.
FAILS: `POST auth/google`, `POST auth/session-exchange`, `GET auth/session-data/:userId` are declared `@Public()` (so `check:route-classification` and the `x-exposure` OpenAPI stamp both understate the real gate — `@AuthorizedInService("INTERNAL_API_SECRET header")` is the honest declaration), and unlike every other `@Public()` route on the controller they call **no `enforceRateLimit`**, so a leaked shared secret **mints sessions without a limiter**. The compare is also not constant-time.
**NOT FIXED** — inventory verdict REFACTOR only; no handoff entry names an owner. **Unowned.**

---

## C. Secret / credential exposure

**24. JWKS published the Ed25519 PRIVATE key under a plausible misconfiguration**
`common/auth/jwt-keyring.service.ts`, `GET /auth/.well-known/jwks.json` (`@Public()`) (17, P1).
FAILS: `loadKeys` did `importJWK(entry.publicKey)` then `exportJWK(...)` then `{...rawPublicJwk, kid, alg, use}`. `importJWK` accepts a private JWK as readily as a public one and `exportJWK` round-trips `d` straight back out. If any `AUTH_SIGNING_KEYS` entry has the private half in its `publicKey` slot — adjacent fields, `.env.example` documents no shape, nothing validated it — the service **serves the signing seed to the internet** and anyone can forge a backend JWT for any user in any org. **Confirmed empirically before fixing**: the published document contained `"d":"ZacGI10XGPVDINtdlgqRHDnCSEfsYSavDpxjRMrptxA"`.
**FIXED**: explicit public-member allowlist instead of a spread, plus a loud `logger.error` naming the misconfigured `kid`. Regression pinned by `secrets-cookies-and-keys.spec.ts`; neuter proof #1 (restore the spread) turns it red.
**OPEN recommendations to the orchestrator**: consider hard-failing at boot instead of stripping, and **treat any key configured this way as compromised and rotate it**.

**25. `support_channels.inbound_secret` — plaintext at rest, `!==` comparison, victim-keyed pre-auth rate limit**
`support-channels.service.ts:106`, `support-channels.controller.ts:122,141,160` (15, P1-6/7/8).
FAILS three ways: (a) JS `!==` short-circuits at the first differing byte — a timing oracle, while `razorpay.adapter.ts:30` compares a webhook secret correctly with `timingSafeEqual` 200 lines away; (b) the stored value is compared directly, so **a database read discloses every tenant's inbound credential** (CLAUDE.md §5 requires hash-only at rest for this credential class); (c) the rate limiter runs **before** `verifyInboundSecret` and is keyed on the path `orgId`, so an anonymous caller who knows an org id — a UUID that appears in that org's own public surfaces, e.g. `GET /public/org/:orgId` and the KB widget embed — can exhaust the victim's inbound quota and **stop its real support email, SMS and WhatsApp from being delivered**, with no credential.
**ALL THREE FIXED** in 15d: new `support-inbound-secret.ts` reduces both sides to `sha256:<64 hex>` (71 chars always) before `timingSafeEqual`, so **the length of the presented secret is not observable at all**; `createChannel` stores the digest and returns plaintext once; `listChannels` selects `{inboundSecret: false}`; `verifyInboundSecret` dual-reads so legacy rows keep working with no backfill; rotation via `rotateInboundSecret: boolean` on the existing `.strict()` PATCH schema (no new route, no new permission key — 5 contract gates still exit 0); pre-auth limit re-keyed on `clientIp(req)`, per-org limit **kept** but moved after verification. Proof `bola-support-inbound-secret.spec.ts` **20 tests**, headline: *five failed anonymous requests naming `org-victim` produce 5 counts on the attacker's IP bucket and 0 on `org-victim`'s*. Mutation-tested 3× (C: 3/20, D: 1/20, E: 5/20 red). Three `KNOWN-OPEN` pins **inverted** into `FIXED` guards.
**Residual plaintext at rest — CLOSED**: 15d specified a data-only backfill and 08b §8c landed it as migration **`1008`**, verbatim, guarded `NOT LIKE 'sha256:%'` (re-run safe) with a `DO $$` that RAISEs if any plaintext survives. Digest parity checked byte for byte against `hashInboundSecret()`: both give `sha256:fa744572ad483175bb56860819028a072abb62ebdbc865350d36ab34ccdd1aee`. 3 assertions pass. **Irreversible by design** — the down migration RAISEs; operational undo is rotation through the PATCH 15d built.
**Still OPEN (P2)**: no replay protection — the shared secret is static with no nonce, timestamp or body signature, so a captured inbound request replays indefinitely. The code's own comment cites the payment-webhook path as precedent, but that path is strictly stronger (HMAC over the raw body).

**26. Real Neon endpoint host, role and database names committed in hashed evidence**
`evidence/parity-boot-b-vs-c.log`, `-v2.log`, `s02-bootstrap-parity.md` (04, P2 → 04b).
FAILS: password-redacted but otherwise complete connection URIs naming a real Neon endpoint host, role `neondb_owner`, databases `neondb`/`cell2`. 04 declined to edit (hashed evidence, chain of custody) and marked it **"Needs an owner."**
**FIXED** by 04b (option 1: scrub and re-hash, pre-scrub hashes recorded). Sweep of the whole 49-file tree: remote-endpoint matches **10 → 0**; 10 lines across 3 files redacted; `evidence/artifact-hashes.json` re-verifies **match=13 mismatch=0, exit 0** (was 11/2, exit 1) with `previousSeal` + `reseal` audit blocks and a 168-line ledger.
**OPEN**: **no CI gate reads either seal** — `backend.yml:151` runs `artifact:record-hashes` against `backend/dist`, an unrelated file, and `record-artifact-hashes.mjs` has **no verify mode at all**. Both seals are honour-system documents. Also unexplained: both `s02-*.md` were edited between the original sealing and ticket 04 with no audit record.

**27. `.github/workflows/db-gates.yml` trips `check:hardcoded-secrets` with a `[url-credential]`**
15d "Red, and not mine" #4.
FAILS: `pnpm -s check:hardcoded-secrets` exit **1**, one file. Untracked, created at 18:59 by another agent after 15d's green baseline. A real finding: per the constitution, rotate any credential that reached a commit. **OPEN — owner is the agent who added the workflow.**

---

## D. Data loss / corruption / money

**28. Voiding an already-voided tax payment posts a SECOND journal reversal into the general ledger**
`finance/tax/tax-payments.service.ts::delete` (06, read 9).
FAILS: the payment load had no `archived_at IS NULL`. The archiving `UPDATE` at the end is idempotent, but `posting.reverseJournal(...)` runs **before** it and unconditionally — so a repeated void **corrupts the ledger**. Report 06 names it the most serious defect in the ticket: a corrupted ledger is found by manual reconciliation and cannot be fixed without restating.
**FIXED**, with a RED-first test: pre-fix, *"deleting an already-archived payment does not post a second journal reversal"* **resolved instead of rejecting** (`{archived: true}`), while the control *"deleting a live payment still posts its journal reversal"* passed throughout. GREEN after: 3/3; `finance/tax` 11 suites / 37 tests.

**29. A trial balance that reports itself broken on a ledger that is fine — 14 paise of imaginary money**
`accounting-statements.service.ts:32,81,96`, `accounting-cash-flow.service.ts:155,160,166`, `accounting-aged-receivables.service.ts:48,71,83`, `payroll/insights/*` ×13 (05 P2-12 → 05c).
FAILS: Drizzle returns `numeric` as a **string**; the services did `Number()`/`parseFloat()` and summed in IEEE-754, after rounding each account to 2dp on a column stored at 4dp. Measured on 250 expense accounts carrying real 3rd/4th-decimal residue against an exact contra: **before `totalDebit 1401626.39` vs `totalCredit 1401626.25`, imbalance `0.14`, `balanced: false`; after `1401626.25 / 1401626.25`, imbalance `0.0000`, `balanced: true`.**
**FIXED** in 05c across the whole accounting/payroll read path using the repo's existing `money.util.ts` bigint decimal arithmetic (extended with `sumDecimals`, `roundDecimal`, `allocateDecimal` — a largest-remainder split whose parts sum to the total exactly — `toDecimal`, `decimalFromNumber`). New `trial-balance-exact-money.spec.ts` (5 tests) keeps **both halves**: one asserts the fix, another **reproduces the old 0.14 imbalance from the same data**. `money.util.spec.ts` 29 → 48 tests. Runs: accounting 207/25 suites, payroll 875/112, finance+invoices+expenses 683.

**30. The gates meant to catch an unbalanced journal entry were themselves rounded**
05c "the gates that were supposed to catch an unbalanced entry".
FAILS, each concretely: `accounting-journal-entry.service.ts:57` compared `Math.round(totalDebit*100) !== Math.round(totalCredit*100)` — **2 decimals against a 4-decimal ledger**, so an entry genuinely unbalanced in the 3rd/4th decimal **posted**. `dto/accounting.schemas.ts` let `Math.abs(d-c) < 0.01` through, so the DTO admitted what the service should have rejected. `journal-posting.service.ts:72` compared integer minor units at 2dp against a 4dp ledger then stored `toFixed(4)`. `recurring-journals.service.ts:258` used `diff > 0.009` then persisted — **a 0.005-unbalanced template materialised an unbalanced DRAFT entry every cycle**. `opening-balances.service.ts:91` only added the auto-balancing plug when `|diff| > 0.009`, so a sub-cent opening imbalance produced no plug and then hit the exact `assertDebitsEqualsCredits` downstream. `posting-rules.ts::splitTaxPool` rounded each half so `cgst + sgst` did not equal the pool. GSTR-1 apportioned CGST/SGST/IGST across lines by float ratio — **a filing document whose rate buckets must sum to the invoice tax**. Payroll's `journal_balanced` **blocker** check compared `Math.abs(a-b) <= 0.009` on parsed doubles.
**ALL FIXED** (exact at 4dp / `allocateDecimal`).
**Flagged blast radius, NOT measured**: tightening `assertBalanced` from 2dp to 4dp means `finance/ap/bills-workflow.service.ts:154` (`taxPool = Math.round((cgst+sgst+igst)*100)/100` from 4dp columns), `finance/ap/payment-run-executor.service.ts:141` and `invoices/invoices-payment.service.ts:161` now **400/500 where they previously posted a silently unbalanced journal**. Reasoned from source, not run; wants one seeded e2e pass on the accounting/finance golden paths before release.

**31. `journal_lines` has zero CHECK constraints — a negative debit is representable**
05, P3-13.
FAILS: `debit`/`credit` are `numeric(18,4) NOT NULL DEFAULT 0` with the invariants living **only** in the Zod DTO (`accounting.schemas.ts:64`). Any writer bypassing that DTO — a backfill migration, a bulk import, `recurring-journals.service.ts`, `journal-posting.service.ts`, an AI-generated proposal — can store a **negative debit** (arithmetically a credit, silently inverting every sign-based report) or a line carrying both a debit and a credit.
**NOT FIXED** — needs `CHECK (debit >= 0 AND credit >= 0)` and `CHECK (debit = 0 OR credit = 0)`, `NOT VALID` then `VALIDATE` (the validate also reveals whether bad rows already exist). **Owner: migration territory (08).** Schema-wide check-constraint coverage is 73 constraints over 42 of 698 tables (6%).

**32. `payroll_tds_ytd_ledger` — `writeTdsYtdLedger` replaces where it should accumulate**
`payroll/payout/locking.service.ts:206`, upserts at `:244` and `:277` (07b §11; the routing's path and line numbers were wrong).
FAILS: a same-month `BONUS`/`OFF_CYCLE`/`CORRECTION`/`FINAL_SETTLEMENT` run **overwrites the tax actually withheld** by the earlier run.
**PARTIAL / deliberately not taken.** Half one done: migration `1026` added `fk_payroll_tds_ytd_ledger_run_id_org` as the composite `(org_id, run_id) → payroll_runs(org_id, id)` `NO ACTION`, read back from `pg_constraint`. The destructive case is already **refused at the data layer** by committed migration `1030_t24_payroll_tds_ytd_immutability.sql` (`trg_guard_paid_payroll_tds_ytd_row`, BEFORE UPDATE OR DELETE, raises 23514 when the run is `PAID`/`PAYSLIPS_PUBLISHED`/`CLOSED`). **Residual window: an earlier run in `LOCKED` but not yet `PAID`.**
**OPEN, needs one owner holding both halves.** Three blockers recorded: (a) "add `run_id` to the natural key" is **insufficient as stated** — `run_id` is nullable and both keys are *partial* uniques, and NULL never equals NULL, so it de-duplicates nothing; it needs `run_id NOT NULL` + a backfill decision; (b) `grep -rn payrollTdsYtdLedger src/ test/` returns **the writer and nothing else** — there is no reader to validate a grain change against, so choosing between "one row per run summed on read" and "one running total" is a payroll product decision; (c) taking it here would put two owners on one financial table in the same release.

**33. Member removal 500s with an unhandled `23502` — 9 defective `SET NULL` foreign keys**
05 P0-1/P0-2, reproduced live by 05b.
FAILS, each reproduced against real rows: `support_tickets.fk_support_tickets_created_actor` had a column list naming a column `0916:92` later made `NOT NULL` — deleting a membership gives `null value in column "created_by_membership_id" … violates not-null constraint`. Seven composite FKs with **no** column list (`invitations`, `hr_case_notes`, `hr_benefit_enrollments`, `hr_dependents`, `hr_insurance_claims` ×2, `hr_travel_visit_logs`) make Postgres null **every** member including `org_id`. `hr_safety_incidents_reported_by_users_id_fk` is single-column on a NOT NULL column. `org-member-departure.service.ts:157` caught only `23503`/`23001`, so all nine escaped as an **unhandled 500 with no actionable message** for any org whose members authored HR case notes, benefit enrolments, dependants, insurance claims or travel logs, or revoked an invitation.
**FIXED** by migration `0992` (05b), whose sweep re-derives every column list from `pg_attribute` **at run time** so no list can go stale the way `0865`'s did; the two with no nullable member became `NO ACTION`. Residual on the generalised predicate on a cold-built database: **0** (796 SET NULL FKs, 522 composite, 472 with a column list). `departureBlockMessage` now classifies `23502` by table and column. Rollback round-trip executed: 9 residual after down, 0 after re-apply.
**Correction recorded**: 05's claim that `drizzle-kit push`/`generate` would revert the fix is **false** — drizzle-kit 0.31.10 reads `information_schema.referential_constraints.delete_rule` and `confdelsetcols` appears nowhere in drizzle-kit or drizzle-orm 0.45.2, so it produces no diff. The real half is worse: `SET NULL (cols)` is **inexpressible** in `UpdateDeleteAction`, so a `db:push` against an empty database creates the broken form and the schema file **silently misstates what 256 composite FKs do**.
**OPEN**: no permanent `check:set-null-column-lists` script exists; the gate is an executable spec whose catalog half is skipped without `SET_NULL_GATE_DATABASE_URL`. This class has been introduced **three times** after being swept once. Owner: gate owner / ticket 35.

**34. Retention sweeps drained one batch per org per tick and reported success**
`cron-mail-retention`, `cron-announcements-retention`, `cron-helpdesk-retention` (18 P1-1 → 18b defect 1).
FAILS: a single `DELETE … LIMIT BATCH_SIZE` per org per tick, no loop, no signal — a tenant producing more rows per tick than the batch size is **never cleaned** and the job logs success, carrying the backlog silently forever.
**FIXED** in 18b: each drains to a short batch, capped `MAX_BATCHES = 100`, returns `truncated: true`, logs, and writes `truncated` into the `hr_audit_logs` `after` payload so it is durable evidence. Multi-page proofs (mail 500/500/120 → 3 calls, 1120 rows; 200 full pages → 100 calls, 50 000, truncated). Bite (`MAX_BATCHES → 1`): `Expected number of calls: 3 / Received: 1`, and the audit reported `{"count": 500, "truncated": true}` instead of `{"count": 50000, …}` — a sweep that "succeeded" having drained 1% of the backlog.

**35. `org-purge.service.ts::listMemberUserIds` capped at 10 000 — members past 10 000 kept live access**
18 P1-2 → 18b defect 2.
FAILS: a bare `.limit(10000)`, so on a larger organisation **every member past the ten-thousandth kept live org-scoped access and a warm session cache** while the purge reported success.
**FIXED**: keyset drain on `organization_members.id` (page 500); `bustMembersMembership` now chunks at 50 (removing the cap had made the downstream `Promise.all` unbounded). `org-purge-member-drain.spec.ts` runs 1 250 members and asserts `revokeOrgScopedAccess` called 1 250 times including `user-1250`; neutered → `Expected: 1250 / Received: 500`.

**36. `cron-hr-retention.service.ts:223,254` — same truncation, in the document retention path the PRD criterion names**
18b P1.
FAILS: `sweepDocuments` selects ONE `limit(BATCH_SIZE)` page of `documents` and one of `onboarding_documents` per policy per tick; `sweepEmployees`/`sweepCases`/`sweepAttendance` each run one `LIMIT BATCH_SIZE`. A backlog above 200 **reports as a clean sweep**. 18b did not fix it: another agent rewrote the file mid-session (mtimes 17:07/17:08, gaining `retiredKeys`, `deleteRetiredObjects`, `storageObjectsDeleted`, `storageObjectsOrphaned`, a `StorageService` dep) and the patch would have clobbered in-flight work. Prepared fix recorded, including a **no-progress guard** — with a `policy.action` that is neither `delete` nor `anonymize` the generic `documents` page is re-selected and never processed, so a naive loop **spins**.
**Later CLOSED**: 18c verified it "now drains with `MAX_BATCHES`, `truncated`, `scanned` and a no-progress guard."

**37. Silent caps on growing work that lose data permanently — OPEN**
18b P2, all unchanged:
- `cron-hr-engines.service.ts:59,94,128` — `sweepOverdueGoals` (200), `sweepReviewsDue` (100), `sweepAssetReturnsDue` (200) emit automation events and **mark nothing**, so the same first N are re-emitted every tick and **everything past N is never emitted at all**. Needs a "last-notified" column, i.e. a migration.
- `cron-crm-tasks.service.ts:38` — `limit(200)` over a one-hour `task.overdue` window; a tenant with >200 tasks due in one hour **loses the remainder permanently** because the window moves on.
- `cron-leave.service.ts:100,282` — `POLICY_LIMIT = 100` **silently drops monthly accrual policies past the hundredth**.
- `cron-hr.service.ts:54,187` (`limit(500)` expiry reminders) and `cron-org-purge-worker.service.ts:53` self-resume but return no "more remaining".

**38. `general-ledger.service.ts:166` — GL CSV export ends in a bare `.limit(10000)`**
05c, P2.
FAILS: an org with more than 10 000 posted journal lines in the range **exports a file that looks complete and is not**. Wants keyset paging or a stream. **NOT FIXED** — routed to whoever owns the pagination sweep (07/08).

**39. `chunkText` silently truncates a document at 400 chunks**
`kb/retrieval/kb-chunk-utils.ts` (10, "pre-existing, not mine").
FAILS: a document longer than ~600 k characters is **indexed in part with no error and no signal** — the retrieval path returns answers from a partial document. Load-bearing for `kb.indexing`'s 1-credit ceiling arithmetic, so raising the cap means revisiting the ceiling. **NOT FIXED, no owner named.**

**40. `settings.service.ts::updateFeatureFlag` is a read-modify-write of the whole `organizations.settings` JSONB outside a transaction**
19 §1.
FAILS: a concurrent `OrganizationSettingsService.updateSettings` **silently loses `primaryColor` / `ipAllowlist` / `loginBgUrl`**.
**NOT FIXED** (inventory verdict REFACTOR). The *cache* half was fixed — see #43.

**41. `hierarchy/org-hierarchy-tree-source.service.ts:141,150` — `.limit(10000)` on a whole-tree load**
19 §1. Silent truncation on growing work; must fail loudly or stream at the cap. **NOT FIXED.**

**42. `settings-automations.service.ts::listAutomationRuns:119-131` — bare `.limit(50)`, no cursor**
19 §1. Run history past the 50th is **unreachable** — silent truncation on an append-only stream. **NOT FIXED.** Same file: `listApiKeys`, `listGitConnections`, `listCustomFields` (a bare `SELECT *`) have **no `.limit()` and no cursor** — unbounded per-org reads on endpoints with no pagination params.

---

## E. Stale cache / stale authorization view

**43. Toggling a feature flag served the pre-toggle value for a full TTL; two role-change paths never busted the session cache**
19 §2.
FAILS: (a) `SettingsService.updateFeatureFlag` wrote `organizations.settings` and invalidated nothing, while `getSettings` caches that row under `org:settings` for `CACHE_TTL.MEDIUM` and `getProfile` under `org:profile`. (b) `CACHE_KEYS.userSession(userId)` embeds `role`, `isOrgOwner`, `enabledModules`, `organizationAccess` at 60 s TTL; `bustMembershipStatusCache` busts `membership:account` and the `membership:status` namespace but **not** `user:session`. Every membership *status* mutation busted it; the two *role* mutations (`OrgMembershipService.updateMemberRole:211`, `SettingsService.updateUserRole:351`) did not — **a demoted admin keeps seeing admin chrome for up to 60 s**.
**Blast radius stated honestly: not an authorization bypass** — `JwtAuthGuard` resolves standing through `MembershipStateService`/`membershipAccount`, which *was* busted, so guards deny correctly.
**BOTH FIXED** in 19. Bite: invalidation stripped from `settings.service.ts` → **1 failed / 3**, file restored, sha verified.

**44. HR headcount is stale after every hierarchy mutation — two different Redis counters**
07, P27(1); `org-structure.service.ts:124`.
FAILS: the read uses `cachedVersioned(...)` → counter `cache:namespace:hr:headcount:<org>:version`; the invalidator uses `invalidateNamespaceForOrg` → `cache:namespace:<org>:hr:headcount:version`. Different keys, so the invalidation never lands. The guarding spec **only asserts the mock was called**, never the read site. **REFACTOR — P1, NOT FIXED**, owner HR.

**45. Inventory valuation / reorder / stock-summary reports are stale after every stock movement**
07, P27(2)(3)(4); `inv-reports.service.ts:102,151`.
FAILS: the invalidation matrix claims these invalidate "implicitly via `inv:reorder` parent", but `CacheService.invalidate` is `redis.del(exactKey)` — **there is no prefix mechanism, so no parent relationship exists**. **NOT FIXED**, owner Inventory.

**46. `queryKeys.hr.hrDisciplinary()` and `hooks/api/hr/cases.ts:93` emit two different key spaces for one dataset**
07, P24 (`human-resources.ts:318` vs `cases.ts:93`).
FAILS: `[…,"hr","cases","disciplinary"]` vs `[…,"hr","disciplinary"]` — invalidating either **misses the other**, so the UI shows stale disciplinary data after a mutation. 16 further prefixes are emitted from more than one file. **NOT FIXED**, owner Frontend.

**47. Three HR hook families are structurally unreachable by `queryKeys.hr.all` invalidation**
07, P23. `hr-event-stream`, `hr-emergency`, `hr-accommodations` build off `queryKeyBase` directly and emit **sibling** prefixes of `["streamlineos","hr"]`, so `invalidateQueries({queryKey: queryKeys.hr.all})` cannot reach them — stale HR data after a mutation. **NOT FIXED.**

**48. `safeAccessTableRead` turns a query error into "this user holds no permissions", silently**
15b, new finding P2; `modules/access`.
FAILS: proven accidentally by six spec mocks — a missing `.orderBy` on the chain made `safeAccessTableRead` swallow the throw and return `[]`, silently dropping every role grant. **In production a transient failure on the grants read degrades a user to no permissions, quietly.** **NOT FIXED, no owner named.**

---

## F. Silent permission loss / non-determinism

**49. `computeUserPermissions` dropped permissions past the 500th, non-deterministically**
`access/access-permission.resolver.ts:283-297` (19 §5).
FAILS: an unordered `.limit(500)` over one row per `(role, key)` across **all** the user's roles. Measured against the live catalog: 698 total keys; the 14 module-admin rungs sum to **564** (hr 135, crm 82, build 75, accounting 73, inventory 49, …). A member holding HR+CRM+Build+Accounting+Inventory+Payroll+Support+Timesheets+Surveys admin rungs reaches **507 grant rows and silently loses permissions past the 500th**; holding both `<MOD>_MODULE_OWNER` and `<MOD>_MODULE_ADMIN` doubles the rows for identical keys, halving the effective ceiling. **With no `ORDER BY`, which grants are dropped is whatever the planner returns — the same user resolves differently between two requests.**
**FIXED** by 15b §6: `drainRolePermissionGrants`, a keyset drain over the `serial` PK at `ROLE_GRANT_PAGE_SIZE = 500`, `ORDER BY id ASC`, stopping on a short page — deliberately not a larger cap ("the same defect with a later trigger"). Test fixture is **every delegable catalog key** (a fixture smaller than the limit cannot catch this, which is exactly why it survived). **Bite executed**: collapsed to a single page → red, **152 keys silently missing** (`support:*`, `workflows:*`, `chat:huddles:moderate`, …); restored → green.
**Residual OPEN — P1, needs the `modules/access` owner**: `access-permission.resolver.ts:230` still reads `user_permission_grants` for one membership under an unordered `.limit(500)`; the unique key is `(org_id, membership_id, permission_key)` so a person can hold up to 698 rows. **Identical defect, later trigger** — this is why 19 marks that box PARTIAL rather than closed.

**50. `role_permission_grants` had no index leading with `permission_key`**
19 §5. Its only composite is `uniq_role_permission_grants_role_key (org_id, role_id, permission_key)`, unusable for a `permission_key` predicate. Four live queries filter on it, one on the request path (`access-permission-members.resolver.ts:131`), plus `payroll-approver-resolver.service.ts:46`, `support-kb-gap.service.ts:270`, `permission-catalog-sync.service.ts:129`. `user_delegation_permissions` *does* have `idx_user_delegation_permissions_key`, so the omission is inconsistent rather than deliberate.
**FIXED** by migration `0997` (`idx_role_permission_grants_org_key (org_id, permission_key)`), confirmed present in `pg_indexes` on a head database; `check:tenant-indexes` 745/745.

**51. Migration `0990` grants zero rows in every organisation and always will**
19 §0a-c, corroborated by 01 F7.
FAILS: both statements share `WHERE r.is_system = true AND r.slug = 'CUSTOMER_SUPPORT'`. `CUSTOMER_SUPPORT` is a `ROLE_TEMPLATES` slug and the only two paths that create it (`role-seed.service.ts:70`, `:132`) insert it with **`isSystem: false`**; `seedSystemRolesForOrg` mints only `ORG_ADMIN`, `MEMBER` and the `<MOD>_MODULE_*` rows. **No row in the product satisfies the predicate.** 19's correction to the brief: `access_versions` is **not** bumped either — the second statement reuses the same dead predicate, so the migration is a complete no-op, and the rollback inherits it. Measured on `scratch_t19_rbac`: *grants inserted by 0990: **0**; rows matching its predicate: **0**; rows matching the shape that exists (`is_system=false`): **1***.
**RESOLVED, by supersession rather than repair**: `PermissionCatalogSyncService.onModuleInit()` → the reconciler inserted **18** grants, delivering **6/6** of the keys 0990 targeted, converging `CUSTOMER_SUPPORT` on its full 40-key template, **refusing to touch an administered role** (`SUPPORT_MODULE_MEMBER` at `version=2` came back unchanged), and idempotent (second boot: 0). `0990` is recorded in a **new, separate** `SUPERSEDED_BY_RECONCILER` list — never appended to `KNOWN_INERT_BACKFILLS`, whose "must not grow" contract stays intact at 9 — carrying a proof obligation that every key the superseded migration named is one the reconciler actually grants. Bite-proved: deleting `support:tickets:view` from the template → 1 failed / 7 passed.
**Separate finding, 01 F7 (P2)**: on a target where the API has not booted, `0990` is a silent no-op that **still bumps `access_versions`** — busting every cached permission resolution for an org while changing nothing. Order matters: boot the API once, then run 0990.

**52. A migration can NEVER backfill a grant for a permission key introduced in the same release — P0, needs an owner**
19 §0d / P2.0 / handoff.
FAILS: `role_permission_grants.permission_key` FKs to `permissions.name`; `permissions` is populated by `PermissionCatalogSyncService.onModuleInit` at **application boot, after `db:migrate`**. So the mandatory `EXISTS` guard finds no catalog row, skips the key, and **nothing re-runs**. This structurally neuters every future template-widening migration, and it is the pattern `0436` established.
**Aggravating**: `backend/CLAUDE.md` §5 still instructs *"Any change that adds a permission key to a template must ship a backfill migration too"* — **following the constitution now produces a dead migration every time.** Replacement wording is drafted in 19 P2.0 but **not applied** — "`backend/CLAUDE.md` is not my file to rewrite." **OPEN, P0, needs the CLAUDE.md owner + a migration/catalog owner.** Fix direction: seed the catalog from a migration; `src/scripts/seed-permissions.ts` already does the work and is simply not wired into the chain.

---

## G. Ticket 19's handed-off P0 — organisation creation raises 23503 at head

**53. `seedSystemRolesForOrg` raises `23503` and rolls back the entire organisation — no organisation can be created**
19 §P2.1; discovered while proving the reconciler on `scratch_t19_rbac`.
FAILS, exactly:
```
insert or update on table "roles" violates foreign key constraint "fk_roles_module"
Key (module_key)=(feedbucket) is not present in table "modules_catalog".
```
Chain, each link verified: commit **`600b9b7c`** (30 Aug, *"register feedbucket and settings, which controllers already required"*) added `feedbucket` to `MODULE_REGISTRY` as `planGated: true, ladder: "delegable"`, putting it in `MODULE_CATALOG` and `ACCESS_MANAGED_MODULES`, hence `MODULE_ADMIN_MODULES` (14 modules) → `seedSystemRolesForOrg` mints `FEEDBUCKET_MODULE_ADMIN` with `module_key='feedbucket'` → migration `0634` gave `roles.module_key` an FK to `modules_catalog`, and `NOT VALID` skips existing rows but **not new inserts** → no migration ever inserts `feedbucket` (0337, 0372, 0440, 0441, 0443, 0463 insert 19 keys between them and none deletes any; absent from `modules_catalog` in every head database checked) → `OrgProfileService.createOrganization` calls the seeder **inside** the creation transaction (`org-profile.service.ts:366`), so the failure is not partial: **the organisation is never created.**
Why nothing caught it: `administering-module-exists.spec.ts` checks the registry against itself, and every spec exercising the seeder mocks the database.
19's action: new gate `rbac/__tests__/seeded-role-modules-are-catalogued.spec.ts`, **left deliberately RED** with exactly one offender (`feedbucket`), rather than pinned — "pinning it would be the same mistake `KNOWN_INERT_BACKFILLS` exists to record." It is the single failure in 19's `jest --testPathPattern="src/modules/(rbac|settings|auth|organization)"` run (105/106 suites, 647/652 tests). Fix written out ready to paste but **not landed** — `migrations/` is ticket 03's.
**CURRENT STATUS: FIXED.** Report 08 §1005 landed it: ticket 19's `INSERT INTO modules_catalog (…) VALUES ('feedbucket', 'Feedbucket', …, false, false, 13, 'ACTIVE') ON CONFLICT DO NOTHING` used **unchanged**, re-checked against the live catalog first (seven columns match `information_schema`; `sort_order` 13 is free — timesheets holds 12, notifications jumps to 90; `is_core` false; `is_paid_only` false because that column marks the two paid-only modules, and `support`/`surveys` are both `planGated` at `is_paid_only=false`). Proven two ways: `jest --testPathPattern="seeded-role-modules-are-catalogued"` → **exit 0, 2/2** (19's deliberately-red gate now green), and a direct `INSERT INTO roles (… module_key='feedbucket' …)` → **PASS, was 23503**. The rollback refuses to run while any `roles` row still points at the module.
**Residual OPEN — two product decisions on the same module**: (a) whether `feedbucket` (`route: null`, `productKey: null`) should carry `ladder: "delegable"` at all — 19's alternative fix, lives in `src/common/rbac/module-registry.ts`; (b) report 07 P12: `feedbucket` is `planGated` and billable but **absent from `ORG_MODULE_KEYS`, so org setup still cannot enable it**.

---

## H. Ticket 09's slot leak

**54. An out-of-credit organisation leaked one AI concurrency slot per request and permanently hard-blocked itself**
`KbRagService.streamAnswer` and `ChatAssistantService.processChat` (09; box 3 was **PARTLY FALSE** as pre-ticked — the audit found a live leak the reported fix did not cover).
FAILS, precisely: both services acquired the concurrency slot **before** work that can throw outside the `try`. `KbRagService.streamAnswer` had `ledger.reserve()` sitting between `acquire()` and the `try`; `ChatAssistantService.processChat` had `ledger.reserve()`, `fetchContext()`, the user-turn history write and all tool building between them. `AiCreditsReservationService.reserve` throws `InsufficientAiCreditsException` when a wallet is short (`ai-credits-reservation.service.ts:70`), so **an out-of-credit org leaked one slot per rejected request. Twenty rejected requests exhaust `AI_CONCURRENCY_CAP = 20` and hard-block the org** — and the block is **permanent until restart**: on Redis the counter's TTL is set only on the 0→1 transition and never refreshed, and the no-Redis local fallback has no TTL at all. The chat assistant additionally leaked the credit reservation itself on those paths (self-healing via the 15-minute sweeper, but wrong).
**FIXED**: release closure taken immediately after `acquire()`; the reservation wrapped in its own try/catch that releases the slot; the whole setup region guarded (`chat_setup_error`). Also replaced `void (stream.finishReason as Promise<string>|undefined)?.catch(…)` with `void Promise.resolve(stream.finishReason).catch(…)` — same behaviour, one fewer `as`.
**Evidence**: new tests bite — reverted both services to pre-fix source → **4 failed / 37 passed**; restored (SHA-256 verified) → **41 passed**. Fail-closed proof: a TestingModule with no limiter provider `.rejects.toThrow(/AiConcurrencyLimiter/)`, goes red the moment `@Optional()` returns. Global bite proof: every limiter stub neutered to throw on `release` → **13 failed / 22 passed** against a 35-passed baseline, with the three slot-leak assertions flipping and the two cap-exceeded tests correctly staying green. Regression `nice -n 10 npx jest src/modules/ai --maxWorkers=2` → **41 suites, 328 passed / 21 skipped**. `tsc --noEmit` exit 2 with **0 errors under `src/modules/ai/`**. eslint 0 errors.
**Status at report time: UNCOMMITTED — "No git run."** Files: `chat-assistant.service.ts`, `kb-rag.service.ts`, and their two spec files (+7 tests, +1 helper). **Re-check whether this landed** — the backend has moved several commits since.
**Residual, deliberately not fixed, OPEN**: `AiGatewayService.embedQueryWithCredit` is **the only paid provider call that takes no concurrency slot** — the one path the per-org cap does not cover.

---

## I. Other AI-path defects

**55. Client disconnect had NEVER reached a provider call on any route — a closed tab kept spending**
`createStreamAbortSignal` + all 119 paid gateway call sites (11, P1; commits **`82ab7a55`**, **`9062b909`**).
FAILS, in two independent halves. (a) It detected hang-up with `req.on("close")`, which is the wrong stream. Measured on a real Express 5 server: attach early and `req:close` fires **at +0 ms on a healthy request**; attach after two `setImmediate`s (the real Nest case) and `req.complete=true, req.destroyed=true` and it **never fires**. Both live streaming routes (`POST /chat`, `POST /public/kb/stream-ask`) used it, so **a closed tab kept generating tokens until the 60 s/120 s deadline**. (b) Even repaired, the signal reached nothing: every AI controller carries `@NoTenantTransaction()`, so `TenantContextInterceptor` returns before building its AbortController, and `getTenantAbortSignal()` had **zero readers repo-wide**; across all **119 paid gateway call sites, not one passed `signal`** — a fully-plumbed option chain with no source.
**FIXED**: watch `res.on("close")` gated on `writableEnded`, keep the request arm only for `req.complete !== true`; new `AiRequestAbortInterceptor` scopes a request signal the gateway resolves for text, structured, image and embedding paths. Cancellation is now a first-class outcome (`kind: "cancelled"`, released with reason `"cancelled"`, 0 milli-credits, **does not feed the circuit breaker** — a busy afternoon of closed tabs must not trip it). Proofs assert on what the **LangChain client** received: `ai-abort-reaches-provider.spec.ts` 9 passed (`settle` 0 calls, `release(42,"cancelled","org_1")`), `ai-request-abort.integration.spec.ts` 3 passed (boots Nest, hangs a real socket), `ai-stream-abort.spec.ts` 9 passed. Bite: restore the `req.on("close")`-only arm → real-server hang-up fails, four-suite run **8 failed / 28 passed**; restored, SHA-256 `a1269342…`, empty `git diff`.
**OPEN — P1, `src/common/`**: `common/tenant/tenant-context.interceptor.ts` has the **identical broken arm**. Invisible today because `getTenantAbortSignal()` has zero readers — but the moment anyone wires it (the obvious fix for this box), **the arm fires at +0 ms on healthy requests and every AI call from a transactional controller aborts before it starts.** *(Note: this is a distinct, still-open defect in the same file that #129's typecheck error lived in — #129 being not-reproduced does not close it.)*
**OPEN — dependency decision**: `@langchain/openai` cannot carry a per-call `AbortSignal` into an embedding request (`embeddings.js:126` hardcodes `requestOptions = {}`); stopping that HTTP request needs the `openai` SDK as a direct dependency.

**56. `useAskAI`'s Stop button was a no-op — the request kept streaming and kept spending**
`hooks/api/chat-ai-assistant.ts` + `lib/api-client.ts` (13, box 3).
FAILS: it passed `signal: controller.signal` **inside `init`**, but `authedFetch(url, init, path, signal?)` ends with `fetch(url, {...init, headers, credentials:"omit", signal: combinedSignal})` — `signal` comes **after** the spread, so the caller's `init.signal` is overwritten by `makeRequestSignal(signal)` built from the **fourth** argument, which `useAskAI` never passed. The combined signal was the 30 s timeout alone; `stop()` and the unmount teardown aborted a controller attached to nothing, and the read loop kept consuming tokens while the request kept spending. **The suite that "proved" cancellation mocked `authedFetch` and read `init.signal` — it asserted the bug.**
**FIXED**: signal passed in the signal slot (and removed from `init` so the illusion is gone) plus an `aborted` check at the top of the read loop. Proof `chat-ai-assistant-abort.test.tsx` imports the **real** api-client and mocks `global.fetch`, asserting the signal `fetch` actually received. Bite: restore `signal` to `init` → **3 failed / 1 passed**; restored → 4 passed. Threaded families **4 of 90 → 35 of 90**.
**OPEN**: **55 AI `mutationFn`s still take no signal**, so Stop ends the UI and not the spend — ordered by user-visible impact: `support/ai.ts` (11, with a Stop button on `ticket-detail-header.tsx`), `timesheets-core` (5), `payroll/use-explain-payslip` (1), `mail.ts` (3), `kb/page-ai` + `kb/ask` (5), `meetings-ai.ts` (4), `accounting-ai.ts` (3), `inv-ai-explain.ts` (3), `inventory/ai.ts` (2), `feedbucket` (2), `ai-summaries.ts` (1), 10 in `ai.ts`.

**57. `makeRequestSignal` silently discarded the caller's signal on browsers without `AbortSignal.any`**
`lib/api-client.ts` (13, cross-territory finding 1 — filed BLOCKED by S6).
FAILS: it fell back to `return timeout;`, dropping the external signal. `AbortSignal.any` is Chrome 116 / Safari 17.4 / Firefox 124 — on anything older **every cancel in the whole app, AI included, is a no-op that looks correct**.
**FIXED, and the report corrects itself**: commit **`ea1b576a5`** added `linkAbortSignals` (hand-links timeout and caller's signal, forwarding `reason` so the `TimeoutError` branch still fires) and destructured `init.signal` out of the spread. S7 verified rather than asserted: `jest lib/api-client-cancellation` → **exit 0, 10 passed**; bite with `linkAbortSignals` replaced by `return timeout;` → **exit 1, 2 failed / 8**, the two being *"still cancels, instead of silently discarding the caller's signal"* and *"still cancels a signal delivered through init"*. Bite planted in a hermetic `git archive HEAD` tree, never the working tree.

**58. Every blog AI action reserved and settled against an EMPTY org id**
`ai/core/services/blog-ai.service.ts:52,78,104` (11 S4; 15b §1 pairing).
FAILS: `actor: { orgId: "", userId }` with `charge: true` at all three sites, and the `improve-writing` audit row carried `orgId: ""` — **credits charged to nothing, usage untenanted**. The file's own spec docstring already claimed "the AI credit is charged to the caller's org" while the code said `""`.
**FIXED** in 15b: all three pass the real `orgId` (the same one `runInTenantTransaction` in the method already used), audit row tenanted. Landed in **`a3bf8470`**.
**15c re-checked and found the routed report STALE**: the path is `src/modules/ai/core/services/`, not `src/modules/blog/`; lines 52/78/104 are a closing brace, a closing brace and an options object; **all six** paid invocations (87, 108, 128, 154, 172, 190) pass `{ orgId, userId }` from a parameter; `grep -rn 'orgId: ""'` returns nothing in blog. 15c hardened it anyway: `blog-ai-tenant-isolation.spec.ts` now asserts per call site that the actor org is the caller's, is not `""`, and `charge` is true — **including all three streaming methods**, which had no assertion at all. Mutation: reintroducing `orgId: ""` at all six sites → 6 of 8 red. `check:ai-charge` exit 0, 122 invocations.
**Cleared, related**: `crm-content.service.ts`'s six `actor ?? {orgId: "", userId}` sites are **not** the defect — every one spreads `actorCharge(actor)` = `{charge: actor?.orgId ? true : undefined}`, so an unattributable call does not spend.

**59. Every job-description generation billed a fake organisation**
`hr-recruitment-ai.generateJd` (11, S5 "incidental fix").
FAILS: invoked the paid gateway with `actor: { orgId: "system", userId: null }` and `charge: true` — **the caller's org was never billed and the usage row was untenanted** — despite the controller already having `@CurrentUser()`.
**FIXED**: both the buffered and the new streaming route take the real `orgId`/`userId`.

**60. `EmbeddingsService` per-chunk paid fanout and per-row DB write inside a growing loop**
`kb/retrieval/kb-indexing.service.ts` (10).
FAILS: `embedWithResumption` made one paid embedding call **per chunk** and one `runInNewTenantTransaction` **per chunk** to save a checkpoint — an unbounded paid fanout (§12.3) plus a per-row write in a growing loop (§5.1).
**FIXED**: one `embedBatchWithCredit` for all pending chunks (one reservation, one slot, provider batches of 64) + one batched multi-row upsert. Bite C (revert to per-chunk) → **2 failed / 15 passed**; Bite D (remove the reservation from `runBatch`) → **4 failed / 35 passed**, named failures including *"never calls the provider when the wallet is short"* and *"releases the reservation when the provider throws mid-batch"*. Both restored, SHA-256 verified. `EmbeddingsService` is out of `AiGatewayModule.exports` and its three un-metered wrappers deleted; a test pins the exact public surface so re-adding an un-metered entry point fails a test.
**Deliberate behaviour change flagged**: resumption is now all-or-nothing within an embedding pass — a mid-document provider failure writes nothing and refunds the whole reservation (previously a retry paid for fewer chunks).

**61. `check:ai-charge` cannot see embedding at all — 6 credited call sites outside its coverage**
10.
FAILS: its regex is `\.(invokeStructured(?:WithImage)?(?:WithUsage)?|invokeText(?:WithUsage)?)\s*\(`; run against a string containing `embedQueryWithCredit`/`embedBatchWithCredit` it returns `null`. So the gate's green (113, then 122, then 128 invocations, exit 0) **does not cover** `kb-indexing:113`, `kb-search:36`, `kb-attachment-indexing:27`, `support-ai-triage-data:119`, `support-ai-embeddings.helper:36`, `kb-rag-retrieval:132`.
**NOT FIXED** — routed to ticket 35; adding `embed(Query|Batch)WithCredit` to the alternation makes it 119.

**62. `ai:public-kb-ask` denial-of-wallet — rate limit keyed on client IP, spender is the org in the body**
10, P2, "left open as instructed". Reservation now bounds the drain at the org's balance and makes it visible in `ai_usage_logs`; **the per-org ceiling still needs a tier constant in `common/ratelimit/` and a product number. OPEN.**

**63. Eleven AI surfaces rendered every failure as one red sentence with a useless Retry**
Seven build AI cards (`risks`, `summary`, `weekly-update`, `client-update`, `plan`, `extract-tasks`, `change-impact`), `features/build/ai/ai-chat-panel.tsx`, three `features/accounting/ai/**` panels (13).
FAILS: `<p className="text-destructive">{getErrorMessage(mutation.error)}</p> + Retry` — so **an exhausted wallet, an unbought plan, a tripped breaker, a full queue, an offline browser and a revoked permission were all one red sentence with a Retry that cannot help any of them.** Additionally: `features/build/ai/project-ai-menu.tsx` hand-rolled its own run with no single-flight guard, no AbortController and no unmount teardown, so **closing the sheet did not stop the call**; `features/sign/builder/envelope-ai-menu.tsx` wrapped its error in `new Error(getErrorMessage(err))`, **destroying the `ApiError` status** so `classifyAiError` could only ever answer `error`; `GlobalAskOs` kept a stopped stream's partial answer but marked it as a **normal completed message**.
**ALL FIXED** in 13 (new `components/ai/ai-failure-body.tsx`, Retry suppressed on states re-dispatch cannot fix).
**OPEN**: `features/feedbucket/components/feedbucket-ai-panel.tsx:24` still has `AI_UNAVAILABLE_STATUSES = new Set([400, 402, 503])` — **a 400 is our own bad request hidden behind "AI unavailable"** (P2, feedbucket owner). And backend: the breaker's 503 and the concurrency cap's 503 carry **no `code`**, so `classifyAiError` separates them by **message text** — distinct codes `AI_PROVIDER_UNAVAILABLE` / `AI_CONCURRENCY_LIMIT` would retire the string match (P2, `modules/ai/core/services/`).

**64. Two live meeting-AI surfaces cannot be streamed at all — streaming was added to the route the product does not call**
11 S7 P2 / 13 §4.
FAILS: `features/calendar/meeting-prep-panel.tsx` and `meeting-follow-up-panel.tsx` POST to `/ai/meetings/prep` and `/ai/meetings/follow-up` (`MeetingsAiController`), which have **no `/stream` sibling**. S5 streamed `/ai/meeting-prep` (`CrmAiController`) — a near-duplicate route family with **0 callers**. Same for `/ai/account-summary` and `/ai/report-narrator`: streamed, never had a caller. **OPEN, needs a backend decision in `src/modules/ai/**`**: give `MeetingsAiController` `/stream` siblings, or rule the families duplicates and retire one.
Also OPEN: `/public/kb/stream-ask` and its buffered sibling reach `KbAskPanel mode="public"`, which has **zero call sites** — recommended for removal, orchestrator's decision. Whoever revives it must note the citation path differs (streaming uses an `x-kb-sources` header, buffered returns sources in the body).

---

## J. Lifecycle-predicate defects (report 06, all FIXED with RED-first proof)

**65. A retired parent's name kept rendering on every live child**
`org-hierarchy-branches.service.ts::listOrgBranches`, `org-hierarchy-departments.service.ts::listDepartments`, `org-hierarchy-teams.service.ts::listTeams`.
FAILS: the alias joins supplying `businessUnitName` / `branchName` / `departmentName` had no `deleted_at IS NULL`. RED before fix: `Received: "Retired BU"`, `"Retired branch"`, `"Retired dept"`. Statement-level scanners are structurally blind to this class — they are `ON`-clause conditions on an aliased self-join, not `WHERE` predicates. **FIXED, 6/6 green, hierarchy folder 18 suites / 66 tests.**

**66. An ARCHIVED department was assignable as a parent**
`org-hierarchy-teams.service.ts::assertDepartment`.
FAILS: the teams service's own guard checked `deleted_at IS NULL` but **not `status <> 'ARCHIVED'`**, while the facade's `assertActiveParent` required both and the frontend selector already sends `status: "ACTIVE"` — the two layers disagreed about what an assignable parent is. `moveTeam`/`createTeam`/`updateTeam` accepted archived parents. RED: `moveTeam` **resolved to `{"success": true}`** instead of rejecting. **FIXED.**

**67. Key results and links could be attached to a soft-deleted goal; a deleted project kept its name on a live link**
`goal-key-results.service.ts::createKeyResult`, `goal-links.service.ts::createLink` and `::getLinks`.
FAILS: the goal-exists guards omitted `deleted_at IS NULL` (an asymmetry the file itself proves — `goals.service.ts` filters it at all seven of its own call sites); `getLinks`'s `projects` join had no predicate while the `tickets` join immediately above did. RED: `createLink` returned `{error: "project_not_found"}` instead of `"goal_not_found"` — i.e. the deleted goal **was found and the guard passed**; `getLinks` returned `projectName: "Deleted project"`. **FIXED, 4/4.**

**68. Voided tax payments stayed on the dashboard while the paginated list hid them**
`tax-dashboard.service.ts::getRecentPayments` — no `archived_at IS NULL`; two surfaces disagreeing about the same rows. RED: `Received [1, 2], expected [1]`. **FIXED.**

**69. A person deleted from the directory kept appearing in the HR people list with their name and work email**
`hr-people.service.ts` + `hr-employee-record-lists.service.ts`, the duplicated `PERSON_JOIN_COND`.
FAILS: the `hr_people → organization_people` join carried no `deleted_at IS NULL` while `isNull(hrPeople.deletedAt)` sat right beside it in every `where`. **The two lifecycles are independent**: `DirectoryService.softDeletePerson` sets `organization_people.deleted_at` and does not cascade to `hr_people`; `HrPeopleService.remove` does not cascade back. RED: returned `[1, 2]` where 2's directory record was deleted. **FIXED.** Same class: `hr-settings-hub.service.ts::getWorkflowVersions` (its two siblings in the same file both had the predicate).

**70. New assessment attempts and live sessions could start on an ARCHIVED survey**
`survey-assessment.service.ts::createAttempt`, `survey-live-session.service.ts::create`.
FAILS: **archiving a survey did not stop new participation.** RED: both resolved instead of rejecting. **FIXED, 4/4, surveys 22 suites / 111 tests.** Deliberately not touched: `completeAttempt` (an in-flight attempt must remain completable) and the list/get/automation reads (`status` is an explicit filter and an archived survey must stay inspectable to be restored).

**71. Nothing gates this class of regression — OPEN, P2**
06. All eleven defects were introduced by hand and **none was caught by lint, typecheck or any of the ~150 gates**; there is no `check:*` asserting that a read of a soft-delete table carries its predicate. The three-way scan built here (statement ∩ file ∩ writer census, cutting 911 noisy flags to 30 candidates at a 37% true-positive rate) is the shape such a gate would take. **24 residual candidates remain open**, each with a stated reason (5 survey reads where `status` is an explicit parameter; 4 `org_units` display joins in `finance/reports`, `hr/templates`, `hr/workflows` where excluding a retired unit would **blank the unit name on a past payslip or letter** — needs a product call; 3 HR by-id loads on mutation paths; 2 template/lead-conversion sites; 1 correct-as-written `MAX(bug_number)`; 1 activity-feed attribution).
**Dormant traps recorded (12 columns)**: lifecycle columns declared but never written by any code path — a missing predicate cannot resurrect anything today, and springs the day someone implements archive for that entity.

---

## K. Schema/catalog defects with concrete runtime consequences

**72. Five billing columns are `integer` in the live database against `text` keys — three write paths have NEVER once succeeded**
`referrals.referrer_org_id`, `referrals.referred_org_id`, `referrals.referrer_user_id`, `affiliate_commissions.referred_org_id`, `app_installations.installed_by`, all in `src/db/schema/billing/billing.ts` (07b §4).
FAILS: `0000_light_vance_astro.sql` created them `integer` when org/user ids were serial integers; both id columns became `text` and every other table followed — these five did not. **An integer column cannot reference a text key**, so the declared FK has been asking for something Postgres would refuse for the life of the repo. **Reproduced at head before the fix**: `INSERT INTO referrals (...) VALUES ('org_t07b_a', 'user_t07b_1', ...)` → `ERROR: invalid input syntax for type integer: "org_t07b_a" (22P02)`. `ReferralService.createReferral:16` and `AffiliateService:67` both take `string` and insert it. All three tables hold **0 rows** on `scratch_perf_seed`, `scratch_t09_final` and `scratch_boot_c` alike — "what a write path that has never once succeeded looks like."
**FIXED** by migration `1023` (converts the five columns, adds the five FKs `ON DELETE CASCADE` + four indexes). **It deletes and rewrites nothing** — if any database holds an unresolvable row after the cast, the migration RAISEs and names the table and count.
**Parser bug worth naming**: the first classifier reported a nonsense row (`autonomy_switches.autonomy_switch_id → organizations.id`, a UUID PK) because a doc comment beginning with a capitalised word consumed the property splitter's state — the same shape as report 07 §0's "dropped 200 comment-prefixed columns". Stripping comments recovered **197 columns** (10,706 → 10,903) and corrected the population.

**73. `check:tenant-indexes` was blind to the entire `build` module — 5 real violations hid there**
`src/scripts/check-tenant-indexes.mjs::parseTables` (05, P1-7).
FAILS: the regex is `/export\s+const\s+(\w+)\s*=\s*pgTable\(/g`, but `db/schema/build/` declares its 83 tables through a `pgSchema` handle (`build.table("tickets", …)`) — it matches **0 of 83**, all of which carry `org_id`. The gate printed "Tenant tables 745 / Leading tenant index 745 / OK". Its two sibling gates already use `(?:pgTable|\w+\.table)`. Hidden violations: `work_item_relations`, `ticket_label_mappings`, `ticket_related_links`, `release_tickets`, `webhook_deliveries` — five tenant tables with no index/PK/unique leading on `org_id`. Consequence is twofold: under RLS the policy predicate is not leakproof, so an index that cannot supply `org_id` is **refused and the read degrades to a sequential scan** — the isolation cost the gate exists to prevent; and all five cascade from `organizations`, so `OrgPurgeService`'s delete sequentially scans each per purge (`webhook_deliveries` is an append-only delivery log).
**Live side FIXED** by `0996` (988/988, exit 0). **Declaration side still RED and OPEN**: `pnpm check:tenant-indexes` with no `--db` is **exit 1 at 821/828** — 7 tables carry a leading `uniq_<table>_org_id` in the catalog but not in Drizzle (`crm_sla_breach_log`, `org_custom_domains`, `release_tickets`, `ticket_label_mappings`, `ticket_related_links`, `webhook_deliveries`, `work_item_relations`). 03 explicitly refused to relax the gate: **a `db:generate` against these declarations would want to drop indexes the catalog depends on.** Owner: ticket 08 / `src/db/schema/**`.

**74. `0445`'s BEFORE DELETE guards blocked organisation purge**
`cron-org-purge-worker.service.ts:241` (08 §1004).
FAILS: the worker deletes the organisation row and relies on `org_id ON DELETE CASCADE`; `payroll_run_employees` and `payroll_line_items` are reached **as siblings of** their still-present `payroll_runs` parent, so `payroll_run_is_locked(run_id)` is still true and 0445's guard raises. Reproduced verbatim on `scratch_t08`: `DELETE FROM organizations WHERE id='<org with a PAID run>'` → `ERROR: payroll_run_employees row 2 is immutable while run 3 is locked`. 0445's header claimed safety because "a cascading delete of the run itself finds no row" — true of a cascade *from the run*, false of a cascade from the organisation.
**FIXED** by migration `1004` (organisation-presence escape hatch; UPDATE behaviour unchanged). 08's own first draft of `1001` had the same bug in two of its guards and was caught the same way — by the delete failing on a scratch database.
**Standing rule handed on**: any future `BEFORE DELETE` guard must carry the same escape hatch or it will break the purge worker.

**75. Seven indexes `0999` dropped on structure alone were real regressions on the majority tenant**
08b §8a.
FAILS: prefix containment proves **reachability, not cost**. A btree on `(org_id,a,b)` can answer everything `(org_id)` can, so `0999` called the narrow one redundant — but the survivor is physically larger, and for the tenant holding most rows the planner costs it above a sequential scan and **takes the scan**. `idx_contacts_name_email` is 1,968 kB against a 1,720 kB heap — an index bigger than the table.
**FIXED** by migration `1007`. Buffers dropped → restored, per tenant as `streamline_app` in rolled-back transactions: contacts **645 → 30**, `inv_stock_levels` 609 → 39, `hr_people` 306 → 24, `chat_channel_members` 108 → 12, `organization_people` 39 → 6, `inv_locations` 18 → 4, `inv_stock_transactions` 30 → 12. `measure-index-redundancy.mjs` over 347 candidates → **0 REGRESSION**; self-test 13/13. Measured index regressions **7 → 0**.

**76. 8 relationships carry two foreign keys, two with contradictory actions**
05 P2-10.
FAILS: `org_units` declares `set null` **vs** `restrict`, `candidates` `set null` **vs** `no action` — which wins is decided by Postgres trigger ordering rather than the author, so **a reader of the schema is told `set null` and gets a `restrict` error**. All eight fire two RI triggers per insert/update, and a future `DROP CONSTRAINT` on the composite silently leaves the un-tenant-scoped one in place.
**PARTIALLY FIXED**: 08b's migration `1006` dropped 16 redundant single-column FKs, and — the part that makes it safe — **moved the action onto the composite first** for the eight where they diverged (`support_vip_clients.client_id` → CASCADE; `chat_channels.linked_deal_id`, `enterprise_quotes.deal_id`/`client_id`, `build.projects.deal_id`, `survey_participants.contact_id`/`lead_id`/`client_id` → `SET NULL (<the nullable pointer only>)`). Dropping a `SET NULL` twin while the composite says NO ACTION converts "clear the pointer" into `23503` on every parent delete; dropping a CASCADE twin turns a cascading delete into a refusal. Every SET NULL composite names only the nullable column, because `org_id` is NOT NULL on all six tables. Migration ends with a `DO $$` that RAISEs on any survivor, missing/unvalidated composite, or a SET NULL with no list or a NOT NULL member. `check:set-null-column-lists` catalog half confirms **all 267 column lists match**.
**OPEN**: 153 single-column FKs beside a composite twin remain (CRM 53, inventory 76, 24 on undeclared inventory tables); **zero remain outside CRM/inventory**. `hr_*` and `payroll_*` are fully converged (178 tenant→tenant FKs, all composite) — do not re-open.

**77. 15 self/forward-referencing FKs are invisible to `check-tenant-relationships`; six let a row point at another org's parent**
`extractInlineReferences()` requires an *empty* arrow parameter list `\.references\s*\(\s*\(\s*\)\s*=>`, but Drizzle **requires** a return-type annotation for a self- or forward-reference: `.references((): AnyPgColumn => orgUnits.id, …)` (05, P1-5).
FAILS: eight have a composite twin, so the exposure is the six that do not — `hr_templates.parent_template_id`, `hr_policies.parent_policy_id`, `hr_automation_runs.triggered_by_run_id`, `support_tickets.merged_into_ticket_id`, `payroll_runs.source_run_id`, `payroll_policies.active_version_id`. **Org A's payroll run can name org B's run as its source, and org A's ticket can be marked "merged into" a ticket the org cannot see, leaking a foreign identifier into its UI.**
Combined with #6: an independent DDL-derived pass finds **19 tenant→tenant FKs with no tenant column, 16 genuine**, while `check:tenant-relationships --static-only` reports **0 actionable**. Regex fix is trivial (`\(\s*\)\s*(?::\s*\w+\s*)?=>`). **NOT FIXED** in 05; 03/08 closed the four accounting ones. **Remaining six OPEN.**

**78. 28 auto-generated FK names exceed Postgres's 63-byte limit and are silently truncated**
05, P2-9. Longest: `principal_group_members_org_id_organization_membership_id_organization_members_org_id_id_fk` (91 bytes).
FAILS, proven on PG 18.4: the server emits `NOTICE: identifier … will be truncated` and stores the 63-byte prefix. So a hand-authored `DROP CONSTRAINT "<declared name>"` **fails 42704**; `err.constraint` at runtime returns the truncated name — **which is the string interpolated into the user-facing message at `org-member-departure.service.ts:160`**; and any catalog-vs-declaration parity gate reports 28 phantom mismatches. No two currently collide after truncation; the next long one might. **NOT FIXED.**

**79. 105 live tables are undeclared in Drizzle — `db.select()` cannot read them at all**
05/07 S07, 08b handoff 4, 07b §2.
FAILS: `gl_*`(14), `ap_*`/`ar_*`(9), `tax_*`(4), `bank_*`(4), `crm_commission_*`(6), `crm_call_*`/`crm_outbound_*`/`crm_report_*`(10), `customer_health_*`(5), `inv_*` WMS/landed-cost/ASN/dock/slotting(~35), etc. Journalled migrations created them; no service reads any; **no RLS on 16 of them until `0994`**; no typed access. 07b's classification corrects the framing: the 31-table accounting kernel is a documented `drizzle-kit push` artefact (`0591b`'s own header), **not an in-flight rewrite** — declaring it would stand a second general ledger beside `ledger_accounts`/`journal_entries`/`journal_lines`. Verdict is *reconcile or schedule*, never blind drop. **OPEN.**

**80. `file_quarantine_records` is declared with `pgTable(...)` inside a service file**
`src/modules/storage/file-quarantine.service.ts:16` (07b §2). Live table with inserts and selects at lines 91–120, declared outside `src/db/schema/**` — which is why it reads as undeclared to every declaration-reading gate. Violates backend CLAUDE.md §1. **NOT FIXED**, outside 07b's territory. **Owner: storage.**

**81. `payroll_journal_batches`, `hr_disciplinary_actions.issued_by`, `hr_emergency_events.created_by`, `hr_simulations.created_by` — declared FKs that do not exist in the database**
05b's correction to 05 P0-2: all three declare `.references(() => users.id, {onDelete: "set null"}).notNull()` but **no foreign key exists in the catalog** — the migration chain never created one. Declaration-only, so they could never raise `23502`; they would be **created broken by the first `db:push`**. The four declarations were fixed; creating the three real FKs is **OPEN** (a decision for 06/08). 08b's wider count: **70 declared `.references()` with neither a live single nor a live composite** — 62 legacy-actor columns (deliberate; the declaration is what is stale) and **8 that look like a real gap**, four of them tenant anchors (`project_ticket_counters.org_id`, `chat_message_reactions.org_id`, plus the billing five now closed by `1023`). **"Do not 'clean' these by deleting the declaration."**
**OPEN, no gate**: nothing in the repo detects a declared foreign key with no live constraint (`check:tenant-relationships` classifies keys that *exist*).

**82. Timezone: correctness depends on two settings in two systems, neither asserted anywhere — and pinning one alone makes it worse**
05 P2-11 → 05c.
FAILS: 1,388 of 1,607 timestamp columns are naive `timestamp`, including 53 expiry/lock columns (`api_keys.expires_at`, `agent_tokens.expires_at`, `user_sessions.expires_at`, `email_otp_codes.expires_at`, `magic_link_tokens.expires_at`, `sign_recipients.otp_expires_at`, `sign_recipients.auth_locked_until`). Measured across the full 2×2 with the project's own `postgres` driver: process `TZ=UTC` + session `Asia/Kolkata` → **+5h30m drift**; `TZ=Asia/Kolkata` + session UTC → **−5h30m**. On this machine both happen to be `Asia/Kolkata` — **they agree by coincidence, configured nowhere.** **A token valid 5h30m past its stated expiry is a security failure, and it is one environment variable away.** 05c's finding that static analysis could not see: **row 4 is the configuration you get if you pin `TimeZone=UTC` on the pool and deploy onto a non-UTC host — a correct system becomes a −5h30m-wrong one. The mitigation is only safe as a pair.**
**MITIGATION SHIPPED**: `pool.config.ts` sets `connection.TimeZone = "UTC"`; `Dockerfile` sets `ENV TZ=UTC` with a comment tying them together; `describeTimezoneRisk(utcOffsetMinutes)` logs the exact shift at boot for any non-zero offset (the image's TZ covers the container and nothing else — dev, CI, a cron worker, a laptop). `timestamp-round-trip.e2e-spec.ts` owns its probe processes via `execFileSync` and asserts **identity, not tolerance**: 6 passed, including two tests that prove each pin is load-bearing by asserting the exact ±5h30m regression when removed.
**Unverified**: that Neon's pooler honours `TimeZone` specifically is **reasoned, not measured** — wants one confirming query on a staging endpoint. **The cure (1,388 column conversions) is costed and explicitly recommended AGAINST for this release**: each `ALTER TYPE` rewrites the table under `ACCESS EXCLUSIVE`, the fast path requires session `TimeZone=UTC` at DDL time (which is exactly what the pin establishes, so **order matters: pin first, ship, then convert**), several are high-volume partitioned tables, and 28 tables already **mix** the two types so a partial conversion is worse than either endpoint.

---

## L. Erasure / GDPR sinks

**83. `GdprStoragePurgeService` had ZERO callers — every avatar, payslip and uploaded document survived the record that named it**
18, P0.
FAILS: it was provided **and exported** by `GdprModule`, fully specced, and **no route or service ever invoked it**. `POST /gdpr/erasure/:subjectId` anonymised the database only.
**FIXED**: injected into `GdprSubjectErasureService`. Manifest ordering is load-bearing and asserted with `invocationCallOrder` — building it *after* the transaction would read `*_key` columns the erasure has already nulled, making those objects **unreachable and permanent**.
**Latent org-wide data destruction caught while wiring it**: `collectSubjectFileKeysWithLegalHold` falls back to `org_id IN (...)` for tables with no FK to `users`, returning **every file key in the tenant** for that table. Wiring the purge unchanged **would have deleted other people's objects on a single subject erasure.** Fixed: `source === "org-id"` keys go to `skipped[]` with a reason, never to `deleteFile`, and the count is audited. Bite asserts `deleteFile` is called once, for the user-FK key only.

**84. `GdprExportService.expireOldJobs` and `.reclaim` had ZERO callers — the identical shape, one file over**
18c, P0. `grep -rn "expireOldJobs" src/` returned exactly one hit: the definition.
FAILS, two live consequences: (a) the declared **72-hour expiry never fired** — `complete()` stamps `expiresAt` and nothing reads it, so **every subject-export archive ever produced** (one JSON file containing that person's memberships, employment, chat, mail, AI conversations, notifications, documents and financial records) **stayed alive in object storage indefinitely**; `download()` does check expiry, so the download was refused after 72 h but the object was never deleted; (b) `claim()` selects `status='pending'` only and `fail()` only returns a job to pending when `process()` catches — **a crash, OOM or deploy between `claim` and `complete` leaves `running` with nobody to reclaim it: a DSAR that silently never completes.**
**FIXED**: new `cron-gdpr-export-retention.service.ts`, declared hourly in `RETENTION_JOBS`, wired into `CronRetentionSchedulerService`, exposed as `POST /cron/gdpr-export-artifact-retention`, monitored by `alert-retention-dead-man.mjs`, in the README table and the `RETENTION_MATRIX`.

**85. The subject's own export archive survived their erasure**
18c, P0.
FAILS: `gdpr_export_jobs.subject_user_id` is `text(...).notNull()` with **no `.references()`**, and `collectSubjectFileKeysWithLegalHold` attributes an object to a subject only through a real FK to `public.users` (`discoverUserFkColumns` reads `pg_constraint`). So the whole table fell into the `org-id` branch, which `purgeFromManifest` skips **deliberately**. Net: `POST /gdpr/erasure/:subjectId` purged avatars, payslips and documents **and left behind the one object that is a complete dump of everything it had just erased.**
**FIXED**: `gdpr-subject-erasure-export-artifacts.ts` — keyset-drains the subject's artifacts **before** the transaction, appends them as `source: "user-fk"`; `retireSubjectExportArtifacts` runs inside it. **`file_key` is deliberately kept**: nulling it inside the transaction would mean a post-commit delete failure leaves the archive in the bucket with nothing naming it — unreachable and permanent. Third ordering rule recorded is a **genuine infinite loop**, not style: marking `expired` does not stop a row matching the predicate, so a re-select loop reads the same page for ever — hence the cursor.

**86. Support ticket requester PII survived erasure, and a pgvector of the subject's own submitted text with it**
18 open box 1 → 18b defect 3.
FAILS: `support_tickets.requester_email` / `requester_name` are never anonymised for tickets the subject raised, and `support_ticket_embeddings` holds a vector of the ticket's title + description **with no FK path from `users`**, so nothing in erasure reached it.
**FIXED**: `support/core/support-ticket-erasure.ts` (a plain exported function, not `@Injectable()` — injecting would force `GdprModule` to import support, and an unwired provider is exactly the zero-caller P0 above). Wired at `gdpr-subject-erasure.service.ts:338` (18c verified). **Ordering load-bearing**: it must run *before* the `users.email` tombstone, because the requester columns are free text with no FK and the live address is the only link back. Multi-page proof: 437 tickets → 3 selects, 437 anonymised, 437 embeddings deleted; neutered → `Expected: 3 / Received: 1`.
**Known residual, stated**: matching is on `requester_email` only. Matching on `created_by_membership_id` instead would **clobber a third party's email** on any ticket the subject handled as an agent for a channel inbox.

**87. `kb_ingestion_checkpoints` stored the subject's chunk text AND its embedding, with no FK to `kb_article_chunks`**
18, P1-4 — deleting the chunks left the vector behind. **FIXED inside erasure.**

**88. `chat_attachments` — the subject's uploaded chat files survived erasure**
18c cross-territory → closed in 18d.
FAILS: no FK to `users`; reachable only through `chat_messages.sender_membership_id`, so the catalog classified it org-scoped and the purge skipped it. `chat_messages.content` was already `[ERASED]` while `file_name`, `file_url`, `file_key` **and the object itself** remained.
**18c implemented and then REVERTED it** — reaching the attachment needed an unpredicated `chat_messages` read (deliberately, because erasure must sweep soft-deleted rows too), which pushed `check:lifecycle-predicates` to 76/75 and `check:unbounded-reads` to 1 unclassified, both ratchets that may only go down with no exemption mechanism. "Raising a repo-wide gate for every other agent, to add one sink, is the wrong trade."
**FIXED in 18d without the reach-through**: `anonymiseSubjectConversations` already updates exactly the rows the sink must follow, so it now returns their ids (`ConversationErasure { tables, chatMessageIds }`) and the attachment sink is driven by that `RETURNING` — **no new read site exists**. `DELETE … RETURNING file_key` inside the transaction, keys tagged `source: "user-fk"`, ids spent 200 at a time. Ratchets after: `check:lifecycle-predicates` **75/75 baseline, exit 0**; `check:unbounded-reads` **0 actionable, exit 0**. Bite: drain capped to one page → 2 failed / 11 (`Expected: 3, Received: 1`; `Expected length: 413, Received length: 200`).

**89. `gdpr.export.requested` had a payload schema nothing validated with**
18d.
FAILS: `GdprExportRequestedConsumer.handle` called `worker.wake()` on any row carrying the event type and returned success, so `OutboxPublisherService` marked it DELIVERED whatever it contained. **Two failures were invisible**: a payload the producer had drifted away from still reported delivered while **no export ever ran**, and a payload whose `orgId` disagreed with the outbox row's `organization_id` — the tenant binding the relay leases and audits on — **was waved through**.
**FIXED**: schema `.strict()` (a bare `z.object({})` strips an unexpected key rather than rejecting it, "which is what turns a dropped field into a wrong-subject write"), consumer `safeParse`s, cross-checks the tenant, and throws so the event reaches the retry ladder and the dead-letter alert. Bite: `.strict()` removed + org cross-check forced false → 3 failed / 6.

**90. The sync GDPR export told data subjects their own data was unavailable when it was not**
18, P1-3. `gdpr.service.ts` carried three **stale** `exportIncomplete` notes claiming audit logs, blob keys, chat and mail were unavailable while the async export returns all of them. **FIXED** — recorded because it misrepresented the product to data subjects.

**91. `forEachOrg` swallows per-organisation failures — one tenant's retention throw returns 200 and writes a success heartbeat**
18b.
**PARTIAL**: the visible half is fixed (all three services surface `organizationsFailed` from `ForEachOrgResult.failed` in the result body and the log line, with an `it.each` bite asserting a `{organizations:2, succeeded:1, failed:1}` sweep reports `organizationsFailed: 1` instead of a clean success). **OPEN**: turning it into a *durable* alertable event (a `cron:last-error` write when `failed > 0`) belongs in `cron-lease.service.ts` / the controllers — "a one-line follow-up I did not take unilaterally."

**92. Retention workers are NOT code-scheduled and no scheduler has ever been configured — BLOCKED**
18b.
FAILS: there is **no `@nestjs/schedule`, no `ScheduleModule`, no `@Cron(`, no `node-cron`, no BullMQ** anywhere in the backend (grep over `src/` and `package.json`: zero hits). Every retention worker is reachable only as `GET`/`POST /cron/<job>` behind `assertCronSecret`. The README's schedule table lists **five** jobs, **not one of which is a retention sweep**, and no cadence exists for `mail-metadata-retention-sweep`, `announcements-retention-sweep`, `helpdesk-retention-sweep`, `hr-policy-retention-sweep`, `ai-usage-retention-sweep`, `outbox-events-retention-sweep`, `notification-outbox-retention-sweep`, `notifications-retention-sweep`, `kb-chat-history-purge`, `kb-chunk-retention-sweep` or `build-retention-prune` in either repository — no `vercel.json`, no GitHub Actions workflow, no `infra/`, `deploy/`, `k8s/` or `helm/` at all. **"The drains I just fixed are correct and will never run until someone configures a scheduler."** Marked BLOCKED: needs an orchestrator/product decision plus a file outside 18b's territory.
**Later CLOSED** by 18c: "Nothing is code-scheduled — no longer true. The scheduler, the parity spec, the failure sink and the dead-man alert all exist."

**93. Residual sink the file-key catalog cannot see — latent**
18, P1-7. `enumerateFileKeyColumns` matches only `%_key`, `file_url`, `storage_url`, `document_url`. `organization_people.avatar_url` and `users.image` are nulled by erasure but **never enumerated**, so if either ever holds a storage key the object is orphaned. No avatar upload endpoint exists today. **OPEN, latent.**

---

## M. Gates and tests that could not fail (each hid or would hide a real defect)

**94. `compare-bootstraps.mjs` reported failure on a clean parity, and compared names rather than definitions**
02, D1 + D2.
FAILS (D1): it imported `diff` from `compare-cell-schema.mjs`, which calls `main()` at top level — so importing it **ran the entire cell-schema comparison**, which set `process.exitCode = 2` for a missing `APP_DATABASE_URL`. Measured: `RESULT: SCHEMAS IDENTICAL differences=0` … `exit=2`. **Any CI job keying on this gate's exit code was reading another script's prerequisite check.**
FAILS (D2): nine of ten categories keyed on the object's **name alone**. Two chains producing `CREATE INDEX ix ON t(a)` and `CREATE INDEX ix ON t(b)` were reported identical — as were a changed constraint body, a changed policy `USING`/`WITH CHECK`, a rewritten function, a retargeted trigger, a reordered enum, and an RLS table **enabled versus enabled-and-forced**. "Catalogs match exactly" could not be claimed from it — and report 04 carries this forward as caveat **C1: no earlier parity claim, including the whole 634-entry set, meant what it appeared to.**
**BOTH FIXED**: self-contained diff + explicit `process.exit(differences===0?0:1)`; every category now carries its definition (`pg_get_constraintdef` with deferrability/validity, `indexdef`, policy `cmd`/`permissive`/`roles`/`qual`/`with_check`, function identity args/result/language/volatility/`SECURITY DEFINER`/body digest, `pg_get_triggerdef` + enabled state, extension version+schema, enum sort order, `relrowsecurity` **and** `relforcerowsecurity`, column default/identity/generated/collation), plus sequences, views and the migration ledger. **Proven to fail, not just pass**: two probe databases with one deliberate difference per class → `differences=15`, exit 1, every category flagged, including the same-name index the old version passed.

**95. `reset-scratch-db.mjs` guarded a `DROP SCHEMA … CASCADE` with a two-name denylist**
02, D3.
FAILS: it refused exactly `neondb` and `cell2` and **let every other name through**, then dropped `public`, `app`, `build`, `build_events` and `drizzle`. **A mistyped or copy-pasted URL — a cell, a staging database, a colleague's branch — would have been emptied without a word.**
**FIXED**: same allowlist `seed-scratch-e2e.mjs` uses (name must contain `scratch`), 8-case `--self-test`, and it no longer prints the URL at all. Live refusal proven: `SCRATCH_URL=<a database named "postgres">` → exit 2, and the refused database's public schema still present afterwards.

**96. `verify-migration-chain.mjs` check (f) silently did not run and reported PASS**
02, D4. `ssl: "require"` hardcoded, so against a local server with SSL off the connection threw, and the `catch` returned `null`, which the checker treats as "no database — skip". Ticket 01 verified (f) by hand for exactly this reason. **FIXED**: TLS resolved from the URL (explicit `sslmode` always wins; loopback gets none; **everything else still defaults to `require`**, pinned by 8 self-test cases including `ep-….neon.tech → require`), and the three outcomes RAN/SKIP-unreadable/SKIP-no-URL are distinct and printed. Now demonstrably fails: a scratch database seeded with `created_at = 9999999999999` → `(f) WATERMARK AHEAD OF JOURNAL … exit=1`. Self-test 10/10 → **18/18**.

**97. `db:verify-rls` printed an EXPOSURE block naming 16 cross-tenant-readable tables and still exited 0**
03. "That is the same all-clear the block exists to prevent." **FIXED**: one line in `db-verify-rls.mjs` now counts an unpoliced excluded tenant table as a failure. Proven to bite: RLS disabled on `inv_ai_feedback` → exit 1, `exposed public.inv_ai_feedback SELECT=true WRITE=true`; restored → exit 0.

**98. `db:bootstrap` could not replay a migration using `ON COMMIT DROP`, and "applied" and "recorded" could diverge**
01, F5. Reproduced: `F5 autocommit (old path): FAIL → 42P01 relation "_probe" does not exist`. **FIXED**: statements applied inside one `sql.begin` with the ledger row inserted **inside that same transaction**. Split measured with the shipped classifier: 30 autocommit (`CREATE INDEX CONCURRENTLY` ×28 + the two files issuing their own BEGIN/COMMIT) / 607 single-transaction. Atomicity **proven, not assumed**, by a synthetic divide-by-zero migration: `table _atomicity_probe exists|false`, `ledger rows|637`. Validated under a hard kill in 02: SIGKILL at OK=346 with entry 347 in flight left `ledger rows 346`, `columns added by 0625 present 0 of 4`, `backends attached 0`; resume gave `OK=291 SKIP=346`, 346+291=637.

**99. Cold bootstrap only replayed as the role `neondb_owner`**
01, F4. **152 unqualified `current_org_id()` references across 7 migration files** (0619 alone has 124). **FIXED** by setting `search_path` on every migration connection in `db-bootstrap.mjs` — deliberately *not* by editing the 7 files (7 hash changes would make every database at head re-propose all seven, and the ledger is hash-keyed) and *not* by a `public.current_org_id()` shim (which would **shadow** `app.current_org_id`, so every policy would store a different function OID than the control plane's — breaking the exact parity 0619/0620/0655 exist to defend). Verified with `search_path` forced to `pg_catalog`: **policies referencing an unqualified or `public.` variant: 0**. Cold build as a non-`neondb_owner` superuser: `REACHED_HEAD 637/637`, second run 637 SKIP.

**100. The seed script reported false green while 40 row inserts failed**
`seed-scratch-e2e.mjs` (00, §5, defect 4).
FAILS: `warn()` logged and discarded, so 40 failed inserts still printed *"All sections completed without errors."* and exited 0. **This is why defects 1–3 survived**: `chat_saved_messages.user_id` does not exist (moved to `membership_id` by `0520`), `support_source_channel` is not a type (so `support_tickets` was **0 rows** while the script reported success), and `payroll_line_items.calc_explain` is `jsonb NOT NULL` with no default (every line item rejected). **ALL FOUR FIXED**: `warn()` records into `errors[]`, the summary groups duplicates, the process **exits 1**. "A seed that hides its failures reports a shape the database does not have, and every measurement downstream inherits the lie."

**101. The perf database's ticket-status vocabulary was stale — two contradictory measurements of one budget nearly shipped a wrong index**
00, §0.
FAILS: the database was built before backend `3d157c15` and never re-seeded, so it held **title-case** statuses (`Todo`, `In Progress`) where the application and the seeder write `TODO`/`IN_PROGRESS`/`IN_REVIEW`/`DONE`. Anything filtering the real vocabulary matched zero rows **and looked vacuous when it was not**. Also `lead_party_map`/`contact_party_map` held **0 rows** and `business_parties.owner_user_id` was NULL on all 22,240, so every Party-side read (`crm-party-reads.ts`, imported by 20 services) matched nothing.
**FIXED** by a full rebuild from zero and a database swap (`ALTER DATABASE … RENAME`). `run-read-cost-budgets.mjs` at the reference tenant went **56 PASS / 14 FAIL / 10 EXCL → 70 PASS / 0 FAIL / 0 EXCL / 0 SKIP, exit 0**. **The correction matters: the budget catalog was right and the database was wrong.**
**Left standing**: `scratch_perf_seed_stale_20260902` (1,702 MB) is cited evidence in 22c and `perf-index-and-seed-rebuild`; **`scratch_t07c` (1,703 MB) is a copy of the stale one and was NOT rebuilt** — it carries the same title-case vocabulary and is another ticket's evidence.

**102. The AI retrieval benchmark had never produced a number and could not have**
12.
FAILS four ways: (a) the seeder died at chunk 20,506 with `22003 integer out of range` **every run** — `(g*104729) % 512` is `int4` and `20506×104729 = 2,147,532,074`; the inherited database held 20,000 rows of **one** organisation and **no HNSW index**, because the crash landed between `DROP INDEX` and the rebuild. (b) The corpus was **1,536 distinct vectors however many rows were seeded**: `TOPIC_VECTOR_SQL` keyed on `t % 1536`, and `JITTER_VECTOR_SQL` was `round((random()*0.06)::numeric,4)` over `generate_series(d)` **with no reference to the outer `j`** — an uncorrelated scalar subquery Postgres evaluates once as an InitPlan. Measured: `pool_rows 4093 | distinct_jitters 1`. So ~13 exact copies per embedding, and **HNSW over duplicates answers from the first neighbourhood it enters — the post-filter cost this whole ticket exists to measure would never have appeared.** (c) Pool sizes alone could not fix it: the (topic, jitter) pair repeats with period `lcm(T,J)`, and `512 | 4096`. (d) No p99, default 25 samples, and every org walked the pools from `g=0` so the minority tenant's rows were an **exact duplicate subset** of the majority's.
**ALL FIXED**: `::bigint` on both index expressions; `TOPIC_POOL=1536`, `JITTER_POOL=4093` (prime, coprime → lcm 6,286,848); jitter correlated on `j` via `hashint8` (defeats the InitPlan hoist **and** makes the corpus reproducible); per-org seed offset; **`assertCorpusIsNotDegenerate()` runs before the 69-second HNSW build** and refuses to proceed — this is what caught defect (b), the first patched run failing on it rather than producing a flattering number; p50/p95/p99 and `--runs` floored at 100.
**What it then measured**: the tenant that suffers is **not the smallest** — the mid tenant (16.3%) pays **8.5× the p50 (15.03 vs 1.77 ms) and 5.1× the buffers** of the majority at cap 24. **Measuring only the majority tenant would have reported 1.77 ms as *the* ANN latency — 8.5× optimistic for the tenant next door.**

**103. `check:tenant-isolation` — `RoleGrantReconcilerService` had zero test coverage of any kind**
14 (box not closed) → 19 P2.5.
FAILS: introduced by commit **`b43cbba5`** after 14 measured the gate; `grep -rn RoleGrantReconcilerService src test` returned only wiring files and the service itself. 14 explicitly refused to add the class name to its own spec: "Adding the class name to this ticket's spec would satisfy the gate without proving anything — precisely the vacuity the gate's own NOTE warns about. **Route to 19.**"
**FIXED** in 19: `role-grant-reconciler-tenant-isolation.spec.ts`, a real cross-tenant negative test with a fake db evaluating the real predicates. **The trap row is the point**: `role_permission_grants.role_id` is an integer unique only per organisation, so org B legitimately holds a grant naming role id 1 while org A's own role *is* id 1. Both bite proofs run, file restored with sha verified:
```
as landed                                                        4 passed / 4
eq(rolePermissionGrants.orgId) stripped from drainHeldGrantKeys  2 failed / 4
   — A reads B's row as its own, skips the insert, loses a permission silently
eq(roles.orgId) stripped from drainCandidateRoles                3 failed / 4
   — A's sweep reconciles B's role and stamps A's orgId on the rows it writes
```
Needed two additive extensions: `src/test/sql-predicate.ts` could not evaluate `inArray` (drizzle renders it as a bare parameter array — no parentheses, no separators — and the parser only handled the `in (…)` form, so **every predicate in the reconciler threw**); and `src/test/fake-select-db.ts` gained an opt-in persisting `InsertBuilder` behind `{persistInserts: true}` (default byte-identical; all 9 existing consumers re-run green, 9 suites / 58 tests). Gate **924/926 → 926/926, exit 0**.

**104. `page-level-gates.test.ts` was unconditionally true and covered 5 of 28 module directories**
16.
FAILS: `GATE_PATTERN = /enforceRouteAccess|requirePermission|requireModulePermission|requireSession/` — **a bare `requireSession()` satisfied it**, so a page with no permission gate passed. The third case asserted `expect(counts[mod]).toBeGreaterThanOrEqual(0)` five times — unconditionally true. `TARGET_MODULES` was 5 of 28 authenticated directories, excluding `sign`, `surveys`, `ai`, `crm`, `hr`, `accounting`, `inventory`, `payroll`, `workflows`, `parties`, `subjects`, `blog`, `portal`, `knowledge`. It never followed layout inheritance.
**FIXED**: 556 pages, 28 dirs, real layout-chain walk, `enforceRouteAccess` resolved against the page's **own** route path (which is what distinguishes `enforceRouteAccess("/build")` from `enforceRouteAccess("/dashboard")`), 10 cases replacing 3, and a 20-entry `SESSION_ONLY_BY_DESIGN` allowlist cross-checked in the other direction (each exempted page must satisfy `isUniversalRoute`, carry a ≥20-char reason, and sit outside all 15 gated-module prefixes) so **the only way to green case 5 is to add a real gate.** It found #18.

**105. `application-security.spec.ts` is largely un-failable and reads a file that does not exist**
`src/common/security/application-security.spec.ts` (17, FINDING).
FAILS: 196 lines that mostly cannot go red — `try { … } catch { /* skip */ }` around whole assertions, `if (content.includes("cors"))` guards, `expect(typeof revocationNote).toBe("string")`, and a "session revocation" test that reads **`src/modules/auth/jwt.strategy.ts`, a file that does not exist**, so the whole body is swallowed. "A test-integrity liability, not coverage." **Recommend deleting it. NOT DONE** — not 17's territory and currently green. **OPEN.**

**106. Four cross-repo guard tests resolve the backend at a path that does not exist — the third time**
07 P09/P11, 16 P2.
FAILS: `catalog-sync.test.ts`, `authority-matrix.test.ts`, `owner-only-catalog-sync.test.ts`, `route-access-keys.test.ts` all resolve `<frontend-repo-root>/backend/…` in a **sibling-repo** layout. They fail or early-`return` (asserting nothing). `catalog-sync.test.ts`'s own header says *"It has been wrong twice… this is the guard against a third time"* — **this is the third time.** `check:module-manifest`, the one gate that would catch BE↔FE manifest drift, resolves the same path, prints `rule-1 … SKIPPED`, **exits 0**, and is not wired into any FE workflow — so the two 22-field manifests agree by hand, not by enforcement. Measured live in 16: `route-access-keys.test.ts` 15 failures, `catalog-sync.test.ts` 1. `zz-probe3.test.ts` has the correct `backendRoot()` resolution to copy; 16's `page-level-gates.test.ts` now has a candidate-search helper that belongs in a shared module. **NOT FIXED.**

**107. `check:navigation-permissions` cannot run on this machine's layout**
19 §7. `NAV_DIR = join(REPO_ROOT, "frontend", …)` assumes a Windows layout. It fails loudly (good) but **cannot run** — exit 2. (19 pass 3 reports it exit 0 in one table and "not run — still assumes the Windows repo layout" in another; treat as **not verified**.) **OPEN, P2.**

**108. `check:cache-invalidation` covers only 10 tables and is absent from `ci.yml`**
07, P28 — as are `pnpm validate:env` and FE `check:module-manifest`, while ~27 other `check:*` gates are wired. **NOT FIXED.**

**109. Two vacuous `for` loops asserted nothing at all**
`role-seed-tenant-isolation.spec.ts` (14, S5). `for (const … of store.get(…) ?? [])` asserted nothing if the array were empty — a harness whose insert stopped persisting, or a service that stopped writing grants, would have kept them green. **FIXED**: population asserted first (`expect(grants.length).toBeGreaterThan(0)`, `expect(versions).toHaveLength(1)`). Proven to bite by mutating the harness so grant writes were swallowed → **2 failed / 6 passed**, red at exactly the two new lines; file restored byte-identical, sha256 `5e754bd7…f6e9`.

**110. Assertions that ENCODE a vulnerability cannot go green and stay honest — 8 pins had to be inverted**
15b/15c/15d.
Three went red in 15b **because the defect was fixed** (`KNOWN-OPEN crm/tasks: the widening gate collapses own and team into all`; `KNOWN-OPEN hr/recruitment: enrollSequence does not verify candidate ownership`; the drift `PINNED` list). 15c **inverted rather than deleted** all three into `FIXED:` regression guards, so they fail again if the fix is backed out. 15d inverted three more support-secret pins. A fourth, `AGREES-WITH-GATE`, transcribed `check:route-classification`'s totals as constants (3602/236/…) and went red **because another module added two routes — which proves nothing about this parser**; it now *runs* the gate script and compares, and has already absorbed three route additions without a false alarm.
**Still OPEN**: `bola-bulk-mixed-tenant.spec.ts:238` pins that `email_sequence_enrollments` has **no** `org_id` column (15's P0-3). It is red because somebody **added** `org_id` — the durable fix, landing now. 15d left it alone to avoid racing an uncommitted change. **Owner: whoever lands that schema change, must invert it.**

**111. Three detector evasions, one of which made a fixed site vanish**
15c "the detectors got stronger".
FAILS (the dangerous one): `bulk-id-handling.ts` required the id array's **root** to be a method parameter, so `const requestedIds = [...new Set(input.ids)]` made a method **drop out of the inventory entirely** — a *fixed* site vanished instead of being counted as guarded, **and so would an unguarded one that merely deduplicated its input first.** (S4b hit this with `enrollSequence` and said so.) Also: a guard extracted into a private helper read as no guard; a set-difference refusal (`const missing = ids.filter(...); if (missing.length > 0) throw` — the same property, better expressed) read as no guard, wrongly marking `generateRolloutDocuments` and `MeetingsService.createMeeting` unguarded. `scope-sibling-drift.ts` could not see a **standalone helper**. `bola-scope-gate-integrity.spec.ts` matched `if (!isScopable(K)) return "all"` **in comments as well as code**, so a doc comment *describing the fallback it removed* read as the fallback still being there.
**The ratchet was punishing the fix**: `BULK_SITE_BASELINE = 55` capped **total** sites, guarded ones included, so **adding a correct guard could trip it** — which is why S4b chose one implementation over another to stay green and flagged it. **ALL FIXED** in 15c: total sites is now a **floor** (anti-vacuity), the cap is on `no-count-check`.

**112. The bulk-site `DRIFTING_KEYS` count GREW as a consequence of the fixes, not a regression**
15c. 43 → 45: the detector needs one scoped and one unscoped sibling, so before `GET /tasks` and `/timesheets/billing/rate-preview` were fixed, *neither* side of `tasks:read` or `timesheets:billing:view` scoped and the keys were **invisible**. Both remaining siblings are the benign shape the detector's own comment names (`GET /tasks/sequences` = org-level templates; `GET /timesheets/billing/uninvoiced` = the org's billing queue). A new assertion states this explicitly so it is not mistaken for two new leaks.

**113. The sweep classified a caller-supplied org id as tenant binding**
15 "blind spot this closed in my own harness". The data-layer sweep classified all three support inbound routes as **tenant-bound**, because `verifyInboundSecret` really does execute `eq(supportChannels.orgId, orgId)`. **Binding an org id the *caller supplied* is not tenant isolation, and no amount of following the query would reveal that.** `bola-public-org-selector.spec.ts` now asserts the credential separately for every `@Public()` route with a path org selector. *(See also #9a: a handler that reaches for no tenant at all is invisible to the same sweep for a different reason.)*

---

## N. Registry / catalog defects with live consequences

**114. 12 notification event keys are produced but absent from the catalog — dispatch throws**
07, P33 (`build.ticket.assigned`, `build.ticket.overdue`, `build.sprint.ending`, `chat.huddle.invite`, …). Dispatch throws `BadRequestException: Unknown notification event` on the `/emit` path. **"A live gap, not cosmetic." NOT FIXED**, owner Build/Chat/CRM.

**115. `WorkflowRegistry.triggeredBy()` runs in the production hot loop and always returns `[]`**
07, P35; `workflow-outbox-relay.service.ts:94`. **No registered definition sets `triggers`**, so the inner loop never executes. Either the field is dead (remove it and the loop) or **event-triggered workflows silently never fire**. "Resolve which — the two readings have opposite consequences." **NOT FIXED.**

**116. Workflow node type `approval` is declared and accepted by the graph schema with no executor**
07, P36; `workflow-node-executors.ts:130`. **A user can build and save a workflow containing it and it dies at run time with `UNIMPLEMENTED`.** The other 9 node types have executors. **NOT FIXED.**

**117. Renaming a customer webhook event name passes every check in the repo and silently breaks every subscriber**
07, P34. `lead.created`, `lead.updated`, `deal.won`, `deal.lost`, `leave.approved`, `employee.hired` are dispatched to customer endpoints; the contract registry's `webhooks` block is `{}` and the subscription schema accepts freeform strings. **"Highest-risk gap in the event inventory. Do not touch; add a catalog." NOT FIXED.**

**118. Two org feature flags are write-only, and all six read fail-open**
07, P42; `settings.helpers.ts:16-33`.
FAILS: `aiSmartNotifications` and `aiWeeklyRecap` — **an admin toggles them, the value persists, nothing on either side ever reads them: two dead knobs presented as working controls.** All six default `true` and every consumer uses `flags?.X !== false`, so **a query error reads as fail-open**. All six live behind CRM settings even though `supportAi` gates Support. The registry is duplicated verbatim in `settings.helpers.ts` and `org-features.service.ts`. **NOT FIXED.**

**119. `feature_flags` is a full LaunchDarkly-shaped table with zero readers, and its gate passes green on it**
07, P43. Exported from the barrel, 3 indexes, 2 relations, **no service, controller, repository or read anywhere in `src`**; the `GET/PATCH /settings/feature-flags` endpoints named after it read `organizations.settings` instead. Its gate `check:feature-flag-governance` only regex-checks that `owner`/`expiresAt` are `.notNull()` — **it passes green on a table with no rows and no readers, and never looks at the 6 flags that actually gate behaviour.** REMOVE verdict; **NOT EXECUTED.**

**120. Seven `UNIVERSAL_ROUTES` roots point at no page on disk**
07, P20 (`/home`, `/announcements`, `/kb`, `/docs`, `/support/my`, `/referrals`, `/jobs`).
FAILS: they rotted undetected because the coverage tests phantom-check *extensions* and *descendants* but never *universal roots* — **a universal entry pointing at nothing is a permanently-open hole waiting for a route to be created at that path.** REMOVE verdict; **NOT EXECUTED.**

**121. The frontend runtime catalog trails the union by 53 keys used in live page gates**
16, P3. `hr:*` ×17, `timesheets:*` ×8, `build:*` ×7, `kb:*` ×6, `support:*` ×5, `sign:*` ×4, plus 6 singletons. They are in the `PermissionKey` union and the backend catalog, so gating works, but they are **absent from the `PERMISSIONS` array the role editor renders — nobody can grant them.** `catalog-sync.test.ts` documents this as known debt for `timesheets:*`/`surveys:*`; the list is wider. **NOT FIXED.**

**122. Six derived module-key lists disagree with the one manifest**
07, P12. `feedbucket` is `planGated` and billable but **absent from `ORG_MODULE_KEYS`, so org setup cannot enable it**; `chat`/`kb` are enableable but not plan-gated; FE gates on `chat` (BE never enforces it); **BE gates on `feedbucket` and `workflows` (FE never checks them) — so a disabled module 403s instead of hiding**; `workflows` is `planGated: false` yet `@RequireModule`d. **NOT FIXED.**

**123. `feedbucket:access:manage` / `:view` cannot be referenced from the frontend at all**
07, P06 — the two backend keys missing from the FE `PermissionKey` union. **NOT FIXED.** Related: `ACCESS_MANAGED_MODULES` is hardcoded FE-side at 10 vs BE's 14 (derived from `ladder: "delegable"`), omitting `feedbucket`, `workflows`, `blog`, `directory` — **8 delegable access keys the frontend can never generate** (P08).

**124. 36 `@Public()` routes with no guard, no signature check and no rate limit**
07, P16 — the enumeration behind 15's findings. `PATCH /public/whiteboard-links/:token` is an **unauthenticated write** (15 later verified this one as *correct, no finding*: 192-bit token, 404 on every miss, capability- and scope-limited, IP-rate-limited). 15 corrected the count to **13** `@Public()` routes with a path `:orgId`, and corrected the "anyone can inject into any org's support inbox" claim — the three inbound routes verify a per-channel shared secret before any DB write. **The residual is #25's replay gap.**

**125. 11 frontend env vars are read but never declared, and every `NEXT_PUBLIC_*` is in the unvalidated half**
07, P41; `lib/env.ts:39-41`.
FAILS: 58% of the frontend's env surface is unvalidated, and **`NEXT_PUBLIC_*` values are inlined into the client bundle**. Worse, `lib/env.ts` only throws in production and runs as a **side-effect import in `app/layout.tsx:6`**, so it fires on first root-layout render — **not at build or boot**. No FE `validate:env`, no test. **NOT FIXED.**

**126. `AI_CHAT_PROVIDER` accepts `"google"` and that provider has no credential path at all**
07, P39 — `GOOGLE_GENERATIVE_AI_API_KEY` is declared and never read. **NOT FIXED.**

**127. `CACHE_TTL.VERY_LONG` (1800 s) is SHORTER than `CACHE_TTL.HOUR` (3600 s)**
07, P29; `cache-keys.ts:250-256`. **"A name that lies about ordering will be picked wrongly."** Jitter is applied only on the `*ForOrg` paths. **NOT FIXED.**

**128. `check:tenant-relationships` prints 627 when no DB URL is set, which reads as a hard failure in CI**
08 handoff 5. Wiring `TENANT_RELATIONSHIP_DB_URL` to a bootstrapped scratch database would make the gate say what it means. **NOT FIXED.**

---

## O. Live-red state at hand-off (attributed, not owned by the reporting ticket)

**129. `src/common/tenant/tenant-context.interceptor.ts(89,53)` references an undefined `TENANT_REQUEST_DEADLINE_MS` — NOT-REPRODUCED-AT-HEAD**
19 P2.5 / P2.9 reported this as a **real error in `src/`, not a spec**, appearing mid-session and red in `check:spec-typecheck`; filed P1, OPEN, needing the `src/common/` owner.
**SUPERSEDED — measured directly by the coordinator, twice, after the erasure lane landed: backend `pnpm typecheck` now exits `0` with `0` errors.** Re-classified from **OPEN** to **NOT-REPRODUCED-AT-HEAD**.
**What would re-open it**: the identifier being referenced again without being defined or exported — most plausibly a revert of the landing commit, or the in-flight `src/common/` edit that introduced it being re-applied from a stale branch. A single clean typecheck proves no current call site trips it; it does not prove the constant is now defined rather than the reference merely removed. If that distinction matters to you, grep for the identifier rather than re-running the gate.
**Does NOT close anything else in that file**: `tenant-context.interceptor.ts` still carries the broken `req.on("close")` arm recorded under **#55** — a separate, still-open behavioural defect that was never a typecheck error and is unaffected by this correction.

**130. Backend `tsc` red at 7 errors in the erasure lane — NOT-REPRODUCED-AT-HEAD**
19 §8 reported 7 `TS7022`/`TS7024`/`TS7006` circular-inference failures in keyset-drain loops: `core/org-purge-member-drain.spec.ts(46,11)(53,28)`, `core/org-purge.service.ts(75,13)(88,13)`, `support/core/support-ticket-erasure.ts(51,11)(65,33)(91,11)` — a matched pair from one in-flight GDPR-erasure change, with the count moving **5 → 7 while 19 worked** on files it never touched. Filed P1, OPEN, "handing to whoever owns the erasure lane."
**SUPERSEDED — measured directly by the coordinator, twice, after the erasure lane landed: backend `pnpm typecheck` now exits `0` with `0` errors.** Re-classified from **OPEN** to **NOT-REPRODUCED-AT-HEAD**.
**What would re-open it**: this is a *shape* defect, not a one-off typo — it recurs whenever a keyset drain is written so that the `page` local has no explicit type annotation and `cursor`'s type circles back through the Drizzle query-builder overload. So the next hand-written drain in that style reintroduces it, in whatever file it lands. 19's prescribed fix (an explicit annotation on `page`) is the durable form; a clean typecheck today does not tell you whether the landing agent applied it or merely restructured the loop. Worth confirming once, because the same shape is being written across the retention and purge lanes (see **#34**, **#35**, **#36**, **#84**, **#85**).
**Volatility caveat**: 19 explicitly recorded that this error set was moving under it, and that ORCHESTRATOR-FINDINGS F1's "0 errors" and ticket 14's "12 errors in storage" were *both* stale by the time it read them. A `pnpm typecheck` exit code is the single most time-sensitive number in this register.

**131. `test/security/upload-controls.spec.ts` — 5 tests red across four consecutive sessions**
Reported unchanged by 15, 15b, 15c and 15d. It asserts `isSensitiveKey(` and `Access denied` in a storage controller that does not currently contain them. Storage module. **OPEN, unowned across the whole sweep.**

**132. `backfill-slugs-exist.spec.ts` red on `0990_support_template_grant_backfill.sql` targeting slug `CUSTOMER_SUPPORT`, which the seeder never produces**
15b "Red, and NOT mine". **Resolved** by 19 P2.0's `SUPERSEDED_BY_RECONCILER` list — 8/8 (was 1 failed / 5) — **without suppressing it**, and with `KNOWN_INERT_BACKFILLS`'s "must not grow" contract intact at 9 entries.

**133. `env-coverage.spec.ts` — `REDIS_COMMAND_TIMEOUT_MS` and `RETENTION_SCHEDULER_*` are read but not in the env schema**
Reported by 15b and 05c. `REDIS_COMMAND_TIMEOUT_MS` is read in `common/cache/cache.module.ts`. Part of 07's P40 (7 backend env vars read but not declared; the coverage spec **cannot see 5 of them** because `SOURCE_ROOTS` is only `["modules","common"]` and its regex is `process\.env\.NAME` literal-only). **OPEN.**

**134. `cron-group-a-tenant-isolation.spec.ts` and `kb-acl-isolation.spec.ts` red from double-vs-service drift**
14 finding 2. `CronHrEnginesService` gained a `REDIS` constructor dependency the spec's `Test.createTestingModule` never provided; `kb-members.service.ts:157` gained a `this.indexing.bumpSpaceAclRevision` call the spec's double does not stub. Not isolation defects. **Owners: cron/HR and KB.**

**135. `check:unbounded-reads` red on untracked files from in-flight work**
`gdpr-subject-erasure-derived-sinks.ts:138` (15c) and `cron-hr-retention-documents.ts:130` (15d) — each needs an entry in `unbounded-reads-classification.json` from whoever owns it. **OPEN.**

**136. `pnpm openapi:check` cannot be run — booting the app now writes grants into the shared Neon database**
19 P2.2/P2.7, P3.6. Boot runs `PermissionCatalogSyncService.onModuleInit`, so the freshness gate would write to production-shared infrastructure. Consequences: **`openapi.json` is stale for five paths**, and blocked behind it is a one-line nav fix — `sidebar-nav-groups-work-management.ts` gates `/build/settings/integrations` on `settings:manage` and should read `integrations:git:view` so a `BUILD_MODULE_ADMIN` sees the item, but `check:route-access-contract` reads the vendored `openapi.json` and fails on a nav key no *generated* operation carries (measured both ways: flipped → exit 1, reverted → exit 0). **Release-time step for the orchestrator.**

**137. `hooks/api/crm/custom-fields.ts` — an org with more than 50 CRM custom fields sees 50**
19 P3.6 item 4. `{fields}` became `{fields, pagination}` (default 50, cap 100) and the hook does not follow the cursor. (The projection change to `name`/`sortOrder` is a drift *repair* — the hook's own type already declared them.) **OPEN, `hooks/api/**` belongs to another agent.**

**138. `module-access.schemas.ts:38` `items[]` is non-strict — a typo'd key inside a role-permission write is stripped and returns 200**
19 P2.2 / P2.9. The last non-strict object on the role/grant/module-access write surface (19 took `settings.schemas.ts` from 12/32 to **32 of 32** strict — the nine `actions[].config` objects, nine discriminated-union members, `automationConditionSchema` and two `options[]` element objects were **all stripping silently**, so a typo'd key inside `actions[].config` returned 201). Also `module-access.controller.ts::createGroup` is a true replayable create with **no `@Idempotent` fence**. **P2, OPEN, owner `module-access`.**

**139. `createHrAnnouncementSchema` is not `.strict()` while its sibling `updateHrAnnouncementSchema` is**
19 §1. **The one-line fix was attempted and REVERTED**: `__tests__/announcements-create.spec.ts:66` deliberately pins "strips unknown fields", so flipping strip→400 is an API contract change and a product call. **"The two schemas disagreeing is the defect; which way to unify is the decision." OPEN.**

**140. A seeded support agent can read the inbox and cannot answer it**
19 §0e / P2.6.
FAILS: `SUPPORT_MODULE_MEMBER` — what `seedSystemRolesForOrg` hands a member of the support module in a new organisation — is built by `buildModuleMemberPermissionKeys`, which filters the namespace to keys ending `:view`/`:read`. It holds `support:tickets:view` and **not `create`, `reply` or `internal_note`**. (`CUSTOMER_SUPPORT` now carries all four — 19 corrected pass 1's stale claim — but still omits `internal_note`, so a templated agent can answer a customer and cannot leave a note for a colleague.)
**NOT FIXED, P2, needs a product decision.** Now a **one-file change** (add the three keys to `MODULE_MEMBER_EXTRA_KEYS.support`), because the reconciler backfills every organisation whose rung is still pristine at the next boot and an organisation that deliberately narrowed it keeps its narrowing.
**Paired recommendation**: `manage ⇒ view` is **confirmed absent from resolution** — `impliedViewKey` (`module-role-permissions.ts:63`) is applied only by `normalizeModulePermissionItems` on the module-access *write* path, and `computeUserPermissions` applies only `deriveAccessViewImplication`, whose map covers `<module>:access:manage → :view` and nothing else. **"Can manage but 403s on the list" is not a state anyone intends, and it recurs.** Caveat: an implication must add **only** the `:view` sibling, because `<module>:access:manage` is deliberately view-only. Note it does **not** rescue the support agent, who holds no support `manage` key at all.

**141. 26 permission keys are granted by a role template and enforced by nothing**
07, P02 (`reports:export`, `hr:payrolls:manage`, `hr:shifts:manage`, …). **A role visibly grants an authority nothing checks — the UI implies a capability the API does not gate.** Either wire the gate or retire the key. **NOT FIXED.**
Related, P03: 17 keys are neither enforced nor template-granted (`accounting:journal:post`, `accounting:receivables:approve`, `crm:deals:approve`, `hr:bank-details:view`, `hr:cases:confidential`, `hr:employees:delete`, `hr:payroll:publish`, …). **Blocker before deletion**: `classifyRetiredPermissions` only retires a key with **no persisted grant in any tenant's DB** — run that classification against a real database first; a key granted in a customer's role must not vanish. **BLOCKED.**

**142. 118-vs-0 idempotency across auth / rbac / settings**
19 §4 / P2.2. Across `auth` + `rbac` + `settings` there were **zero** `@Idempotent` decorators against 118 controllers elsewhere in the repo; `organization` had exactly one. Every role create, grant write, group-role assignment, template materialisation, seed-defaults call and the workspace-onboarding bulk generate was **replayable**. **LARGELY FIXED** (pass 2/3 added `settings.userRole.update` and `organization.workspaceOnboarding.generate` — the bulk org-structure generator, "the most replay-dangerous mutation in the module" — and pass 1's "zero in rbac" is stale). Safe from the browser: `frontend/lib/api-client.ts:151` sets an `Idempotency-Key` on every non-public mutating request and reuses it across the 401 retry. **4 named gaps remain in `module-access`** (see #138).

---

## P. Explicitly unowned / needing an owner

143. **#15** `sign:certificate:download` scope bypass — never revisited after 15. **Unowned.**
144. **#23** `auth.controller.ts`'s three `@Public()` routes: non-constant-time secret compare, no rate limit, dishonest exposure declaration. **Unowned.**
145. **#48** `safeAccessTableRead` silently degrades a user to no permissions on a transient query failure. **Unowned.**
146. **#49 residual** `access-permission.resolver.ts:230` unordered `.limit(500)` on `user_permission_grants` — **P1, needs the `modules/access` owner** (19's own reason for marking that box PARTIAL).
147. **#52** `backend/CLAUDE.md` §5 instructs a practice that produces a dead migration every time — **P0, needs the CLAUDE.md owner**; and seeding `permissions` from a migration needs a migration/catalog owner.
148. **#55 residual** `common/tenant/tenant-context.interceptor.ts`'s identical broken `req.on("close")` arm — **P1, `src/common/` owner**; wiring it as-is aborts every AI call from a transactional controller before it starts. **Still open** — unaffected by #129's correction.
149. **#129** `TENANT_REQUEST_DEADLINE_MS` undefined — **NOT-REPRODUCED-AT-HEAD**, no longer an open item. Re-opening condition recorded at #129.
150. **#130** 7 TS7022 errors in `org-purge.service.ts` / `support-ticket-erasure.ts` — **NOT-REPRODUCED-AT-HEAD**, no longer an open item. Re-opening condition (the drain shape, not the file) recorded at #130.
151. **#131** `upload-controls.spec.ts` 5 red tests — storage, reported four times, **never claimed.**
152. **#17** `user-ops-bulk-update.spec.ts:93` — needs `modules/users` to make a deliberate choice and rename the test.
153. **#26 residual** No CI gate verifies either evidence seal; `record-artifact-hashes.mjs` has no verify mode. **Needs an owner.**
154. **#71** No `check:*` asserts a soft-delete read carries its predicate — the class that produced 11 hand-introduced defects none of ~150 gates caught. **Needs an owner.**
155. **#81 residual** No gate detects a declared foreign key with no live constraint. **Needs an owner** (a new mode on `check:tenant-relationships`, in `src/scripts/`).
156. **#33 residual** No permanent `check:set-null-column-lists` script; introduced three times after one sweep. **Ticket 35.**
157. **#61** `check:ai-charge` cannot see `embed*WithCredit` — 6 credited call sites uncovered. **Ticket 35.**
158. **#62** `ai:public-kb-ask` per-org spend ceiling needs a tier constant and a product number. **OPEN.**
159. **#64** `MeetingsAiController` needs `/stream` siblings or the duplicate route family retired — **needs a backend decision**; the two live meeting AI surfaces cannot be streamed at all from the frontend.
160. **#22 residual** Custom fields (4 routes) and automations (6 routes) still at the global path, 403ing their own module admins — **needs product + six module owners**, and the recorded warning that widening the global rung leaks across modules.
161. **#53 residual** Whether `feedbucket` should carry `ladder: "delegable"`, and its absence from `ORG_MODULE_KEYS` — **two product decisions on one module.**
162. **#91 / #92 residual** A durable `cron:last-error` on `failed > 0` in `cron-lease.service.ts` — a one-line follow-up 18b declined to take unilaterally.
163. **#106** Four cross-repo guard tests and `check:module-manifest` pointing at a nonexistent path — "this is the third time." **OPEN.**
164. **04b's unresolved provenance gap**: between the original sealing and ticket 04, both `s02-*.md` files were edited by someone with **no audit record** and the seal was not updated. The re-seal makes the gap *visible*; it does not close it.
164a. **#165–#167** — three items from the live cross-tenant probe, all **OPEN**. See section Q.

---

## Q. Live cross-tenant HTTP probe — residual OPEN items

Added by the coordinator. Results at `scratchpad/bola-live-offline.json`. **1,921 routes probed live**:
**PASS 666 · UNPROBEABLE 1138 · NO-404 113 · SERVER-ERROR 2 · LEAK 1 · INCONCLUSIVE 1.**

The single **LEAK** is **#9a** (announcements `markRead`), found and fixed. The three classes below
are what remains. Note the methodological point that makes them separable: the probe distinguishes
a route that *resolves* the path object from one that never looks at it, by comparing the
cross-tenant response against a response for an id belonging to **no organisation at all**. Identical
answers mean nothing was resolved and nothing is disclosed; divergent answers — as in #9a's
`control 201 / cross-tenant 201 / absent-org 500` — mean the object was reached.

**165. 113 routes return no 404 for a cross-tenant id — P2, contract**
**Not leaks.** An id belonging to no organisation answers identically, so the path object is never
resolved and nothing about another tenant's data is disclosed. But **the required 404 is absent**, so
the API's own contract ("a cross-tenant miss is a 404, never a 403, never a success") is not
observably true on these routes, and any future change that *does* resolve the object inherits a
surface with no negative case to fail.
**32 of the 113 are write verbs**, which is the part worth acting on — named examples, all returning
**204 whether the object exists or not**:
- `DELETE /contacts/:contactId`
- `DELETE /deals/:dealId`
- `DELETE /leads/:leadId`
- `DELETE /hr/rich-documents/:documentId`
A 204-on-nothing is indistinguishable from a 204-on-success to any client, so a caller cannot tell a
successful delete from a no-op, and a retry/idempotency layer cannot either.
**OPEN.** Owner: per-module, contract-level. The fix shape is the repo's own template —
`build/core/projects-tickets-query.service.ts:155`.

**166. 2 routes return 500 on a cross-tenant id — P2**
`GET /surveys/:surveyId/builder` and `GET /surveys/:surveyId/logic` return **500** where the control
(same-tenant) returns **200**.
FAILS: a 500 is **both a bad contract and an unhandled path** — the handler is reaching for something
that is not there and throwing rather than refusing. It is also weakly oracular: a 500 distinguishes
"an id that exists somewhere" from whatever the absent-org case returns, which is the shape #9a was
caught by.
**OPEN.** Owner: surveys.

**167. 1 route is INCONCLUSIVE and needs a source read to classify — P2**
`POST /organization/custom-domains/:domainId/verify` answered **400** on a cross-tenant id where the
control returned **201**.
FAILS (provisionally): a 400 is not obviously either a refusal or a leak — it could be the tenant
predicate correctly finding nothing and the handler mis-shaping the error, or it could be the domain
being resolved and then failing a downstream validation, which would make it an existence oracle.
**The probe cannot tell these apart from the outside; it needs someone to read the handler.**
**OPEN, unclassified.** Owner: organization.

---

## Commit SHAs named verbatim across the reports

`6795e0377cebae7955e352f41d231f991a17670c` (main at ticket 02) · `a3bf8470` (15b's authorization
fixes + migrations 0994/0995/0996, landed 17:44) · `b43cbba5` (introduced
`RoleGrantReconcilerService`) · `600b9b7c` (registered `feedbucket`, root cause of the 23503 P0) ·
`deff6b6f` (closed `org-setup-completed-consumer` tenant isolation) · `f4c7bdf5` (introduced that
gap) · `27e901ec` (19 pass 3, backend, 31 files) · `4768441bc` (19 pass 3, frontend, 4 files) ·
`82ab7a55`, `9062b909` (ticket 11 abort propagation) · `ea1b576a5` (`linkAbortSignals` in
`lib/api-client.ts`) · `9c3f607cd` (surveys streaming adoption) · `3d157c15` (backend commit before
which the perf seed's ticket-status vocabulary was stale).

Added by the coordinator: **`d02479744521321b9c9d97014a1cb29588c78975`** (*"fix(announcements): stop
accepting cross-tenant writes on markRead"* — the fix for **#9a**, and the backend HEAD this register
was stamped against).

## Migrations named

`0000`, `0016`, `0337`, `0372`, `0431`, `0436`, `0440`, `0441`, `0443`, `0445`, `0463`, `0489`,
`0520`, `0591b`, `0619`, `0620`, `0625`, `0628`, `0634`, `0652`, `0655`, `0660`–`0662`, `0713`,
`0770`, `0839`, `0865`, `0916`, `0920`, `0923`, `0927`, `0967`/`0968`/`0973`, `0974`, `0982`,
`0985`/`0986`, `0989`–`0991`, `0992`–`0997`, `0999`, `1001`–`1009`, `1023`–`1026`, `1030`, `1041`.
