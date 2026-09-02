# 15 — BOLA/IDOR sweep

Session S4. Backend = `/Users/tarunchintakunta/Personal/streamline/streamlineos-backend` (BE).

## What was built

A static sweep harness under `BE/test/security/bola/`, run with
`nice -n 10 npx jest test/security/bola --maxWorkers=2` → **10 suites, 93 tests, all green**.

| File | Role |
|---|---|
| `route-surface.ts` | Enumerates every HTTP handler from `src/**/*.controller.ts` with its path params, exposure classification and permission keys. |
| `tenant-binding.ts` | Indexes every class method and standalone function in `src/`, then follows each handler into the data layer and classifies how the tenant is bound. |
| `scope-sibling-drift.ts` | Finds the `/deals/export` shape: two reads on the SAME permission key, one resolving DataScope and one not. |
| `bulk-id-handling.ts` | Finds service methods that push a caller-supplied id array into a predicate, and whether they refuse a partial match. |
| `bola-route-surface.spec.ts` | Coverage + parser self-tests. |
| `bola-data-layer-binding.spec.ts` | The sweep gate: every object-addressable route must bind a tenant at the data layer. |
| `bola-cross-tenant-404.spec.ts` | Behavioural probe: cross-tenant miss → `NotFoundException`, never `ForbiddenException`. |
| `bola-scope-sibling-drift.spec.ts` | Ratchet on export/search DataScope drift. |
| `bola-bulk-mixed-tenant.spec.ts` | Ratchet on bulk mixed-tenant handling. |
| `bola-scope-gate-integrity.spec.ts` | Fail-open scope resolvers, widening gates that do not bite, and realtime grant-time checks. |
| `bola-public-org-selector.spec.ts` | `@Public()` routes whose tenant selector is a path `:orgId`, webhook signature verification, and public share tokens. |

The enumerator is validated against the repository's own authority: its totals match
`pnpm -s check:route-classification` **exactly** — 3,602 handlers / 236 public / 100 universal /
3,206 permissioned / 60 in-service / 0 undeclared. That equality is asserted in the spec, so a
parser that starts losing routes fails rather than silently reporting a smaller defect set.

## Coverage — stated as a fraction

- **Route surface: 3,602 handlers.**
- **Object-addressable (path names a record): 1,912 / 3,602 (53.1%).** These are the routes a
  BOLA probe can address with another organization's id.
- **Swept to the data layer: 1,912 / 1,912 (100%).** Each is followed from the handler through
  its injected services (depth 3, intra-class and intra-controller calls included) to one of:
  an org predicate · a tenant transaction · an object-level ownership assertion · a subject
  taken from the token.
- **Bound: 1,896 / 1,912 (99.16%).** Breakdown: org-predicate 1,757 · tenant-transaction 69 ·
  object-assertion 38 · self-subject 9 · delegated 23.
- **Unbound: 16 / 1,912 (0.84%).** Every one read by hand; all 16 are named with a reason in
  `bola-data-layer-binding.spec.ts`. 10 are by design (the path token/orgId IS the tenant
  selector on a `@Public` route), 5 are the blog P0 below, 1 was fixed.

**What this coverage is and is not.** This is a static sweep of the authorization path at the
data layer for 100% of the object-addressable surface — not 1,912 live HTTP probes. Live
cross-tenant probing was done behaviourally on the route I fixed (5 assertions, including that
the guard is not a blanket denial). Booting the API and firing 1,912 requests needs a seeded
two-org database and is not something I could honestly claim to have run.

## P0 / P1 findings

### P0-1 — Any customer org admin can edit and delete the vendor's public marketing blog
`BE/src/modules/blog/blog-admin.controller.ts` · `BE/src/modules/blog/blog.service.ts`

- `GET|PATCH|DELETE /blog/admin/posts/:postId`, `PATCH|DELETE /blog/admin/categories/:categoryId`
- `blog_posts` / `blog_categories` are deliberately global — the schema comment in
  `BE/src/db/schema/blog/blog.ts` says so, and there is no `org_id` column. `BlogService`
  queries `eq(blogPosts.id, id)` with no tenant binding, correctly, because there is no tenant.
- The hole is the gate. `blog:posts:manage` and `blog:categories:manage` sit in the **tenant**
  permission catalog, and `computeUserPermissions`
  (`BE/src/modules/access/access-permission.resolver.ts:117-121`) short-circuits every org
  OWNER and every ORG_ADMIN to `allCatalogScopes()` — every catalog key at scope `all`. No role
  template grants these keys, so nobody noticed; the admin short-circuit grants them anyway.
  `BlogAdminController` carries no `@RequireModule`, so nothing else stands in the way.
- Impact: any customer organization's owner/admin can list vendor drafts, rewrite published
  marketing posts (defacement of the public site) and hard-delete them — `deletePost` is a
  physical `DELETE`, not a soft delete.
- **Fix state: NOT FIXED.** The correct fix is the gate, not the predicate: these routes are
  platform administration and must resolve platform-operator standing (as
  `BE/src/modules/platform/operator-session.guard.ts` does) rather than a tenant permission key.
  I did not make that change — it removes catalog keys, which breaks the cross-repo
  `catalog-sync.test.ts` contract and is a product decision on someone else's territory.
  Pinned in `bola-data-layer-binding.spec.ts` as `KNOWN_OPEN_DEFECTS`, ratcheted so it cannot grow.

### P0-2 — Cross-tenant recruiter unassignment — **FIXED**
`BE/src/modules/hr/recruitment/recruitment-jobs.service.ts` · `recruitment-jobs.controller.ts`

- `DELETE /hr/recruitment/jobs/:jobId/recruiters`
- `removeRecruiter(jobId, input)` deleted from `job_recruiters` on
  `eq(jobPostingId, jobId) AND eq(userId, input.userId)` with **no org binding and no ownership
  assertion**, and the controller never passed `u.orgId`. Its own sibling `assignRecruiter` calls
  `this.ensureJob(orgId, jobId)` first — the guard existed and was simply missing on the delete.
- Impact: any holder of `hr:employees:manage` in any organization could unassign recruiters from
  any other organization's job postings.
- **Fix state: FIXED.** Signature is now `removeRecruiter(orgId, jobId, input)` and calls
  `this.ensureJob(orgId, jobId)`, which throws `NotFoundException` (404, not 403) on a
  cross-tenant miss. Controller threads `u.orgId`.
- Proof: `bola-cross-tenant-404.spec.ts` — 5 assertions, all passing: cross-tenant miss throws
  `NotFoundException`; it is not a `ForbiddenException`; **nothing is deleted** on the miss; the
  ownership lookup binds the caller's org and the job id and not the victim's org; and the
  same-tenant delete still succeeds, so the guard is not a blanket denial.
  `npx jest --testPathPattern=recruitment` → 8 suites / 65 tests pass.

### P0-3 — Cross-tenant candidate enrolment with no tenant column and a clean existence oracle
`BE/src/modules/hr/recruitment/recruitment-automation.service.ts:315`

- `POST /hr/recruitment/email-sequences/:sequenceId/enroll`
- The sequence is verified (`eq(emailSequences.orgId, orgId)`); `input.candidateIds` never are.
  They are inserted straight into `email_sequence_enrollments`, which has **no `org_id` column**
  (`BE/src/db/schema/hr/hiring-pipeline.ts:156`), and the response reports `rows.length` — the
  full requested count.
- `candidate_id` is a foreign key to `candidates.id`, so a non-existent id raises an FK violation
  while a real cross-tenant id succeeds. One request per id enumerates the global candidate table.
- **Fix state: NOT FIXED** — the durable fix needs an `org_id` column on the enrolment table,
  and `BE/migrations/**` and `BE/src/db/schema/**` are outside my territory. A service-only
  stopgap is a count-checked candidate lookup bound to `orgId` before the insert.
- Pinned in `bola-bulk-mixed-tenant.spec.ts` (2 assertions).

### P0-4 — Export/report/search siblings ignore the DataScope their list sibling applies
The `/deals/export` shape, on the same permission key. `GET /deals/export` itself is **already
fixed** (asserted in `bola-scope-sibling-drift.spec.ts`); these are the remaining instances.
Hand-verified by reading both sides:

| Unscoped route | Key | Scoped sibling | What leaks |
|---|---|---|---|
| `GET /deals/aging` | `crm:deals:read` | `GET /deals` | Up to **100 full deal records** (id, name, value, stage, assignee) bound only by `orgId`. Also Redis-cached as `deals:aging:${orgId}` with no scope in the key — a §6 cache-key violation on top. |
| `GET /clients/export` | `crm:clients:read` | `GET /clients`, `GET /clients/list` | Both lists call `resolveClientsReadScope`; the export calls `exportCsv(u.orgId)` with no scope and no `userId`. |
| `GET /leads/export` | `crm:leads:view` | `GET /leads` | `leadPartyScope(orgId)` only; the list adds `pushLeadPartyViewScope(..., scope, userId)`. |
| `GET /contacts/export` | `crm:contacts:view` | `GET /crm/people-slugs` | Export and `/contacts/search` both unscoped. |
| `GET /kb/search` | `kb:articles:view` | `GET /kb/articles` | The list applies `ownerMembershipId` for non-`all` scope; search never resolves the scope, and its results feed the RAG context window — a §4 violation ("AI retrieval filters by the asker's access in the SQL predicate"). |
| `GET /sign/reports/dashboard` | `sign:envelope:view` | `GET /sign/envelopes` | Five aggregates correctly bind `senderMembershipId`; `recentActivity` is `signAuditEvents.findMany({ where: eq(orgId) , limit: 10 })` — the last 10 audit events across every envelope. `sign:envelope:view` is seeded at scope **`own`** for module members (`BE/src/modules/rbac/seed-system-roles.ts:49`), so this is directly reachable. |

- **Fix state: NOT FIXED.** All six are in modules owned by other sessions.
- The detector generalises: grouping GET handlers by permission key finds **43 keys / 335
  collection reads** showing the shape. That is a triage surface, not 335 confirmed
  disclosures — a config list under an already-checked parent shows the same shape harmlessly —
  which is why the spec ratchets the inventory and pins only the six verified ones.

### P1-1 — `sign:certificate:download` bypasses `sign:envelope:view`'s `own` scope
`BE/src/modules/e-sign/sign-certificates.controller.ts:47` → `sign-finalization.service.ts:285`

- `GET /sign/envelopes/:envelopeId/final-pdf` binds only `orgId`, while
  `GET /sign/envelopes/:envelopeId` applies `viewAll`/`membershipId`.
- **Severity corrected down from a P0 claim.** `buildModuleMemberPermissionKeys` grants module
  members only keys ending `:view`/`:read`, so a SIGN_MODULE_MEMBER does **not** hold
  `sign:certificate:download`, and the `MODULE_MEMBER_KEY_SCOPE_OVERRIDE` that pins
  `sign:envelope:view` to `own` does not apply to admin-rung roles. The reachable path is a
  per-person `user_permission_grants` grant of `sign:certificate:download` to a member whose
  `sign:envelope:view` is `own` — which §5 explicitly supports. That member can then download
  every fully-executed contract PDF in the organization. Real, but it takes a deliberate grant.
- **Fix state: NOT FIXED.**

### P1-2 — Bulk endpoints silently process the owned subset
15 confirmed sites. `inArray(table.id, ids)` beside `eq(table.orgId, orgId)` narrows the work to
the rows the caller owns and returns success, so the caller is told every id was acted on.
None returns 403 — they all return 200, which is the worse failure mode.

- Highest blast radius: `NotificationsLifecycleService.bulkDelete|bulkArchive|bulkMarkRead`
  (no `.returning()`, unconditional `{ success: true }`), `DealsCrudService.bulkDelete|bulkUpdate`,
  `RecruitmentCandidateOpsService.bulkReject` (sends real rejection **emails** to the owned subset),
  `KbTagsService.setArticleTags` (**unscoped** — writes a foreign `tagId`, then hides it by
  re-selecting org-scoped), `SurveyParticipantService.invite|remind` and `LeadsOpsService.bulkUpdate`
  (both return the **requested** count, not the affected count).
- Two are explicit oracles rather than silent ones: `POST /users/bulk-suspend|archive|restore`
  returns a per-id success/failure verdict (200 ids classified per request), and
  `POST /timesheets/approvals/bulk-approve` folds a cross-tenant `NotFoundException` into
  `skipped` via `isExpectedApprovalSkip`.
- `NotificationsLifecycleService` contains **both** behaviours in one class: the single-id path
  at line 65 does `.returning()` then `throw new NotFoundException()`; the three bulk paths 180
  lines later drop it. The property was understood and lost at the bulk boundary.
- Worth flagging: `BE/src/modules/users/user-ops-bulk-update.spec.ts:93` is titled
  *"bulkUpdateUsers — cross-org isolation"* and asserts `expect(result.updated).toBe(1)` for a
  2-id request. Someone concluded that silently processing the subset **is** the isolation
  guarantee. Fixing the service will fail that test; whoever does it is reversing a deliberate
  decision, not repairing an oversight. That shared assumption is the real finding, not the 15 sites.
- **Fix state: NOT FIXED.** The correct template already exists in-repo:
  `BE/src/modules/build/core/projects-tickets-query.service.ts:155` —
  `if (found.length !== body.ticketIds.length) throw new NotFoundException(...)`.
  My detector finds **55 caller-supplied bulk sites: 4 fail-whole, 51 with no count check**,
  ratcheted so a new one cannot be added silently.

### P1-3 — Two fail-open scope resolvers: every caller resolves `all`
`BE/src/modules/goals/goals-scope.ts:10` · `BE/src/modules/hr/directory/assets-scope.ts:16`

Both do `if (!isScopable(KEY)) return "all";`. I checked the catalog: **`build:goals:manage` and
`hr:assets:manage` carry no `scopable: true` entry**, so `isScopable` is permanently false, the
resolver returns `"all"` for every caller, and `applyScope("all", …)` degrades to `sql\`true\``.
The gate reads as present in review and admits everyone at runtime.

- 20 scope resolvers use this fallback; 18 name a key that IS scopable and are fine. A third,
  `BE/src/modules/hr/performance/performance-scope.ts:12`, has the same catalog gap on
  `hr:performance:manage` but fails **closed** (`return "none"`), so `applyScope` yields
  `sql\`false\`` and HR_ADMIN sees zero performance reviews — safe direction, dead surface.
- **Fix state: NOT FIXED** (other sessions' modules). Fix is either a `scopable: true` catalog
  entry or a fail-closed fallback — not interchangeable, so it needs the owning module's call.
- Gated by `bola-scope-gate-integrity.spec.ts`: a new fail-open resolver on a non-scopable key
  fails the suite.

### P1-4 — `GET /tasks` widening gate does not bite
`BE/src/modules/tasks/tasks.service.ts:26-42`

```ts
return (resolved.get("crm:tasks:view") ?? "none") !== "none";   // canViewAllTasks
...
if (!canViewAll) conditions.push(eq(tasks.assigneeId, userId));
else if (resolvedAssigneeId) conditions.push(eq(tasks.assigneeId, resolvedAssigneeId));
```

- I confirmed `crm:tasks:view` **is** `scopable: true` (`BE/src/modules/rbac/permissions/crm.ts:333`).
  The gate tests `!== "none"`, so `own` and `team` both pass, the owner predicate is **dropped
  entirely**, and `?assigneeId=<anyone>` returns that person's tasks. This is exactly the shape
  the ticket names: a gate that is present and does not bite.
- The read key `tasks:read` is an employee-self-service default
  (`BE/src/modules/rbac/permissions/role-defaults.ts:62`), so every active member reaches the route.
- **Fix state: NOT FIXED.** Fix is `=== "all"`, or force `assigneeId` to the caller unless the
  resolved scope is `all`/`team`. Pinned in `bola-scope-gate-integrity.spec.ts`.

### P1-5 — `GET /leads/export` accepts an `assigneeId` filter with no scope check
`BE/src/modules/leads/leads-reports.controller.ts:126` → `leads-exports.service.ts:65`

The same route as P0-4's leads row, with an extra edge: `exportQuerySchema` carries an optional
`assigneeId` that is pushed straight into the predicate. The controller **imports
`resolveLeadsViewScope` and uses it on `/leads/analytics` and `/leads/sla-alerts`, but not here**.
A `SALES_REP` narrowed to `own` can export the whole org's lead book and target a named rival rep.
**Fix state: NOT FIXED.**

### P2 — `GET /timesheets/billing/rate-preview` `userId` ungated
`BE/src/modules/timesheets/core/billing.service.ts:437-449`. Every other timesheets read gates the
same param on DataScope (`entries-read.service.ts:36` is the template); this one does not, and
`billing.service.ts` contains zero occurrences of `scope`. Discloses another member's resolved
billable rate, not rows. `timesheets:billing:view` is held by no role template, so exposure is
org-admin plus per-person grantees. **Fix state: NOT FIXED.**

## Follow-up from ticket 07 — public routes with a caller-supplied org id

Investigated on the orchestrator's instruction. **The premise needs correcting in two places, and
the corrections matter: the worst-case claim does not hold, but there are three real defects the
original framing would have missed.**

### Correction 1 — the count is 13, not 36
`@Public()` routes with a path `:orgId`: **13 / 3,602**. (69 public routes take any path param;
38 public routes with a path param are writes.) Enumerated in `bola-public-org-selector.spec.ts`.

### Correction 2 — the support inbound routes ARE authenticated
`POST /support/inbound/{email,whatsapp,sms}/:orgId` each call
`verifyInboundSecret(orgId, <type>, secret)` against an `x-webhook-secret` header **before any DB
write** (`support-channels.controller.ts:127,146,165`). So "anyone can inject a message into any
organization's support inbox" does **not** hold — it requires that organization's per-channel
shared secret. Failure is a uniform `UnauthorizedException` whether the org is unknown, the
channel is missing, the channel is inactive or the secret is wrong, so it is not an existence
oracle either.

### Verified clean — the specific things asked about

- **Provider signature over a preserved raw body: CORRECT.** `main.ts:65` sets `rawBody: true`;
  `razorpay-webhook.controller.ts` takes `RawBodyRequest<Request>` and reads `req.rawBody`;
  `razorpay.adapter.ts:172` computes `createHmac("sha256", webhookSecret).update(params.rawBody)`
  and compares with **`timingSafeEqual`** (line 30). The re-serialisation trap was avoided.
- **`PATCH /public/whiteboard-links/:token`: CORRECT, no finding.** Token is
  `randomBytes(24).toString("base64url")` — 192 bits. A miss, a non-public board and an expired
  link are all `NotFoundException` (404, not 403). The write is capability-limited
  (`publicAccess !== "editor"` → 403, correct because the caller proved token possession and the
  object exists) and scope-limited to the single board the token names, via `withPublicToken`.
  Rate-limited per client IP, not per org.
- **`POST /support/chat/:orgId/start`** is a genuinely uncredentialed write, but bounded: it
  refuses unless the org has an **ACTIVE `chat` channel with a valid configured owner**, so it
  only reaches organizations that deliberately published a visitor widget. Subsequent calls
  require the 192-bit `sessionToken` minted at start.

### P1-6 — Inbound webhook secret compared with `!==`, not in constant time
`BE/src/modules/support/core/support-channels.service.ts:106`

```ts
if (!channel?.inboundSecret || !providedSecret || channel.inboundSecret !== providedSecret)
```

JS string `!==` short-circuits at the first differing byte. The same repository compares a webhook
secret correctly 200 lines away in `razorpay.adapter.ts` with `timingSafeEqual`, so the right
primitive is already imported somewhere in the codebase. Affects all three inbound channels.
**Fix state: NOT FIXED.** Pinned in `bola-public-org-selector.spec.ts`.

### P1-7 — Inbound secret is stored in plaintext
Same line: the stored value is compared directly to the presented one, so
`support_channels.inbound_secret` is at rest unhashed. CLAUDE.md §5 requires invitation tokens to
be hash-only at rest; a webhook secret is the same class of credential. A database read discloses
every tenant's inbound credential. **Fix state: NOT FIXED** (needs a schema/migration change,
outside my territory).

### P1-8 — Pre-auth rate limit keyed on the caller-supplied org id → targeted denial of service
`BE/src/modules/support/core/support-channels.controller.ts:122, 141, 160`

On all three inbound routes the rate limiter runs **before** `verifyInboundSecret` and is keyed on
the path `orgId`:

```ts
const rate = await this.rateLimit.check("support:inbound-email", orgId);   // line 122
...
const channel = await this.channels.verifyInboundSecret(orgId, "email", secret);  // line 127
```

An anonymous caller who knows an organization's id — a UUID that appears in the org's own public
surfaces, e.g. `GET /public/org/:orgId` and the KB widget embed — can exhaust that organization's
inbound quota with garbage requests and **stop its real support email, SMS and WhatsApp from being
delivered**. No credential required. Same shape on `POST /support/chat/:orgId/start`
(`"support:chat-widget", orgId`). Rate-limiting before authentication is right for DoS protection;
keying that limit on the victim's identifier rather than the caller's is what inverts it.
**Fix state: NOT FIXED.** Fix is to key the pre-auth limit on client IP (as the whiteboard public
routes already do) and keep the per-org limit after authentication.

### P2 — No replay protection on inbound webhooks
The shared secret is static with no nonce or timestamp and no signature over the body, so a
captured inbound request can be replayed indefinitely. Deliberate in the code's own comment
("trusted the same way payment-webhooks-public.controller.ts trusts its path-embedded orgId"),
but the payment path it cites is strictly stronger — that one has an HMAC over the raw body.

### Blind spot this closed in my own harness
The data-layer sweep classified all three inbound routes as **tenant-bound**, because
`verifyInboundSecret` really does execute `eq(supportChannels.orgId, orgId)`. Binding an org id
the *caller supplied* is not tenant isolation, and no amount of following the query would reveal
that. `bola-public-org-selector.spec.ts` now asserts the credential separately for every
`@Public()` route with a path org selector, so the two checks together cover the shape.

## Checkbox status

Nothing ticked. Box 4 is the only one whose property holds; I left it unticked because the
evidence is static analysis of the three minting paths, not a live two-org subscribe attempt, and
the ticket asks for a probe. Every other box has a confirmed open defect.

1. *Every object-addressable route probed with another org's id → 404.* **Partial.**
   1,912/1,912 (100%) swept statically to the data layer; 1,896 (99.16%) bind a tenant, 16 named.
   Live HTTP probing was done on 1 route (the one I fixed). Not a full live probe.
2. *Bulk endpoints fail the whole request.* **No — 15 confirmed defects, unfixed.** Detector
   and ratchet shipped.
3. *Export/search apply the sibling list's DataScope.* **No — 6 verified disclosures, unfixed.**
   `/deals/export` itself is fixed and pinned.
4. *Realtime channel capability tenant-checked at grant time.* **PASSES, but I am not ticking a
   box the ticket scopes wider than my evidence.* There is no `@WebSocketGateway` or socket.io in
   the repo; realtime is Ably token minting plus one SSE stream, and there are exactly three
   minting surfaces: `GET /chat/ably-token`, `GET /support/ably-token`,
   `POST /notifications/events/token`. **None of the three accepts a channel name or resource id
   in any form** — no `@Param`, `@Query` or `@Body` — so a client cannot ask for a foreign
   channel. Chat derives the channel list from `listMemberChannelIds(u.orgId, u.userId)`, which
   joins under `eq(chatChannels.orgId, orgId)` on an ACTIVE membership. Support resolves the
   caller's DataScope and, below `all`, issues one channel per ticket from a query bound by
   `eq(supportTickets.orgId, u.orgId)` plus an ACTIVE-membership assignee subquery. SSE stores
   `{userId, orgId}` server-side behind a single-use TTL token. Every capability name interpolates
   `${orgId}`. Grant-time, data-layer, tenant-checked on all three.
   Gap closed: the pre-existing `test/security/bola-realtime-channel-scope.spec.ts` covers only
   chat, by source-text regex, and never touches the support path — the one with real conditional
   logic. `bola-scope-gate-integrity.spec.ts` now covers all three (4 assertions).
5. *Scope-widening filters authorized and the gate bites.* **No — 4 defects (P1-3, P1-4, P1-5,
   P2), unfixed.** 25 widening filters were verified correct and are listed as the template. The
   `hr:employees:manage`-beside-`:view` trap the ticket names was checked directly against the
   role templates: HR_ADMIN, BRANCH_HR and RECRUITER all hold both keys, so that gate would be a
   no-op — but **no current filter is gated that way**; the HR surfaces that could have been all
   resolve a DataScope instead. The live no-op is `GET /tasks` (P1-4), gating on
   `crm:tasks:view !== "none"` where the key is scopable.
6. *Authorization at the data layer for every read and write.* **Partial** — 99.16% of the
   object-addressable surface, gated so it cannot regress.

## Files changed

**New (my territory):**
- `BE/test/security/bola/bola-scope-gate-integrity.spec.ts`
- `BE/test/security/bola/bola-public-org-selector.spec.ts`
- `BE/test/security/bola/route-surface.ts`
- `BE/test/security/bola/tenant-binding.ts`
- `BE/test/security/bola/scope-sibling-drift.ts`
- `BE/test/security/bola/bulk-id-handling.ts`
- `BE/test/security/bola/bola-route-surface.spec.ts`
- `BE/test/security/bola/bola-data-layer-binding.spec.ts`
- `BE/test/security/bola/bola-cross-tenant-404.spec.ts`
- `BE/test/security/bola/bola-scope-sibling-drift.spec.ts`
- `BE/test/security/bola/bola-bulk-mixed-tenant.spec.ts`

**Modified (authorization fix — flagged loudly, other agents are in this tree):**
- `BE/src/modules/hr/recruitment/recruitment-jobs.service.ts` — `removeRecruiter` now takes
  `orgId` and calls `ensureJob(orgId, jobId)`.
- `BE/src/modules/hr/recruitment/recruitment-jobs.controller.ts` — threads `u.orgId` into it.

## Other agents' territory

- **Backend typecheck is green.** `tsc --noEmit -p tsconfig.json` → **exit 0, 0 errors**, so my
  two `src/` edits are clean. Mid-session it briefly reported two syntax errors in
  `BE/src/common/tenant/for-each-org.ts` (a concurrent session's in-flight edit); that resolved
  on its own before I finished.
- **`test/security/upload-controls.spec.ts` fails (2 tests)** — it asserts `isSensitiveKey(` and
  `Access denied` in a storage controller that does not currently contain them. Not mine and not
  caused by my changes; `npx jest test/security` is otherwise 23/24 suites green, with all 7 of
  my BOLA suites passing.
- The six DataScope-drift routes (P0-4) and the 15 bulk sites (P1-2) live in crm/deals/leads/
  clients/kb/e-sign/notifications/users/timesheets — other sessions' modules.
- P0-3's durable fix needs a schema change under `BE/migrations/**`, which I am barred from.
