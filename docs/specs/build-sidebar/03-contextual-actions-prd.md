# BSN-03 — Contextual Actions and Signals PRD

## Tracker

Completion is recorded only in the Master Checklist of
[`README.md`](./README.md). Populate the Evidence Log before checking that
parent box.

## Outcome

Quick create, Inbox badges, More tools, Client portal, and Agent Pulse derive
from the active authorized scope. Every visible action opens valid context and
every signal represents a specific actionable state.

## Dependencies

- BSN-01 canonical scope routes and navigation model.
- BSN-02 capability metadata when enablement is supplied by the directory
  contract; otherwise reuse the existing client-visibility owner.
- Existing notification, approval, create-dialog, command-palette, client
  visibility, and module-entitlement owners.
- BSN-04 verifies permission drift and cache isolation against these contracts.

## Product Requirements

### Quick Create Matrix

One compact Create control appears only when at least one row below is allowed.
The user can change any preselected value before submit.

| Active scope | Issue | Project | Product |
|---|---|---|---|
| Organization | Hidden unless a project is chosen first | Workspace and product are optional explicit choices; `No workspace` is valid | Workspace is optional; never invent a default |
| PM workspace | Hidden unless a project is chosen first | Preselects that workspace; product optional | Preselects that workspace |
| Managed product | Hidden unless a linked project is chosen first | Preselects the product and its workspace when present | Hidden |
| Project | Preselects that project | Preselects the project's workspace and product when present | Hidden |

Ambiguous organization context never invents a default workspace or product.

### Inbox Badge

Build Inbox unread means records in `/build/inbox` that:

- belong to the current organization,
- are addressed to the current actor,
- remain unread or require an explicit actor action,
- and are authorized by `build:tickets:view` or the inbox endpoint's exact
  permission if that differs after the owner audit.

The badge does not reuse `/notifications/unread-count`. Zero is omitted. The
count is independently bounded, tenant-scoped, and permission-aware. Count
updates patch or narrowly invalidate its canonical cache owner.

### More Tools

- More tools contains only enabled and authorized tools for the active scope.
- Search operates over the filtered set.
- A user may pin at most three tools.
- Disabled or revoked tools disappear from pins without stale shortcuts.
- Pinned order remains actor- and organization-scoped.
- Pin reconciliation is owned here; stars and recents remain BSN-02.

### Agent Pulse Priority

Agent Pulse shows at most one signal for the active scope. Backend priority,
highest first, with earliest due-or-created time as the tie-breaker:

1. Overdue approval
2. Blocked milestone
3. Delivery risk
4. Material dependency change
5. Prepared draft awaiting review

No match means the Pulse is omitted. Generated proposals remain editable,
evidence-backed, draft-first, and approval-gated. Meaningful writes are
assignment, date, status, scope, budget, permission, or client-visible
publication changes.

### Client Portal

- Client portal appears only when the project capability is enabled and the
  actor has the exact internal management or preview permission.
- Internal preview remains separate from portal-user authentication and data.
- Disabling the capability removes navigation and stale pins immediately.

## Remaining Implementation

Completed requirements are preserved in the Evidence Log and are no longer
duplicated as TODO checkboxes.

### Quick Create

BSN-03-016 CLOSED in the fourth pass — see the Evidence Log.

### Build Inbox Signal

> ✅ **RESOLVED in the fifth pass — the note below is retained as the record of
> what was wrong and why, not as a live blocker.** The premise that made this
> look undecidable ("there is no Build-specific inbox entity") was false:
> notifications carry a `source_module` that every Build event sets to `"build"`.
> Option (a) was taken. The historical analysis follows.
>
> ⚠ **BSN-03-020 and BSN-03-021 were BLOCKED ON A PRODUCT DECISION, not on code.**
> Established fourth pass: this PRD defines Build Inbox unread as records in the
> `/build/inbox` feed that remain unread or need an explicit actor action. But
> `app/(authenticated)/build/inbox/page.tsx` renders the **platform notifications
> feed** (`useInfiniteNotifications` → `GET /notifications`). There is no
> Build-specific inbox entity. So "pending approvals" and "inbox unread" are two
> different things, and no implementation can decide which the badge should
> count. `GET /build/approvals/inbox/count` satisfies the "needs an explicit
> action" half and is strictly better than the org-wide notification count it
> replaced, but it is not the feed owner, and it gates on
> `build:approvals:view` rather than the `build:tickets:view` this PRD names.
> **Resolve by either** (a) adding a notifications-backed count filtered to the
> Build module, or (b) deciding the Build Inbox *is* the approvals queue and
> amending this PRD. Implementing on the current wording would ship a spurious
> endpoint.


### Agent Pulse

BSN-03-043 and BSN-03-044 CLOSED — see the Evidence Log.

### Client Portal Capability

BSN-03-052 CLOSED in the fourth pass — see the Evidence Log.

## Completed Implementation Inventory

### Closed in the fifth pass (2026-09-19)

Each item below was verified against source before closing; the evidence is the
reason it is here rather than in the checklist above.

- **BSN-03-043** Evidence, affected records, proposed change, impact and
  confidence on generated drafts. The whole chain is now wired end to end, and it
  is worth naming each link because the previous pass closed the display half and
  left the item open on the grounds that *nothing wrote the columns*:
  `AiActionsMenu` in `activity-feed.tsx` (gated on `useCan("build:ai:use")`) →
  `useDraftCommentAction` → `useGenerateCommentDraft` →
  `POST /build/comment-drafts/tickets/:ticketId/generate-draft`
  (`@RequirePermission("build:ai:use")`, matching the frontend gate exactly) →
  `CommentDraftGeneratorService.generate` → `CommentDraftsService.upsertGenerated`,
  which persists all five columns on both the insert and the `onConflictDoUpdate`
  branch (`comment-drafts.service.ts:212-250`). `AgentPulseService.findCommentDraft`
  projects them and `build-agent-pulse.tsx` renders the badge and tooltip.
  The contract mirrors the backend `generatedCommentDraftSchema` field for field
  including the required `aiUsage`, so a dropped spend meta throws rather than
  silently rendering a free-looking action. Draft-first by construction: `onApply`
  writes the text into the composer and never posts a comment.
  16 display tests + 4 contract tests + 4 surface tests.
  ⚠ Whether the model populates `evidence`/`impact` *well* is a live-AI question
  no static check can answer; the columns being written is what was proven here.
- **BSN-03-A02** Build Inbox and global Notifications can show different counts
  and each remains correct against its own data owner. The optional
  `sourceModule` made this provable: the bell calls `unreadCount()` and the Build
  badge calls `unreadCount("build")`, which emit key arrays of different length
  (`platform-core.ts:24-27`). The risk here was never the arithmetic, it was
  **cache collision** — a shared key would silently force the two numbers equal,
  the same defect the backend guards with its `unread-count:${sourceModule}`
  sub-key. So the test does not merely compare keys: it seeds one `QueryClient`
  with `{ count: 10 }` globally and `{ count: 3 }` for Build and asserts both
  survive side by side. With one key, the second `setQueryData` would overwrite
  the first and the test would fail.
- **BSN-03-040** Bind every Pulse query and cache key to organization, actor,
  active scope, filters, and authority version. Organization and actor binding
  closed in the fourth pass. **Active scope and filters closed in the fifth**:
  the endpoint now accepts a `.strict()`-validated optional
  `projectId`/`managedProductId`/`pmWorkspaceId`, and all five tier queries bind
  it as an **indexed org-led SQL predicate** — an `innerJoin` onto `projects` for
  product and workspace scope, an `and()` condition for project scope — never a
  JS post-filter. Standing in one project can no longer surface a signal about
  another.
  The frontend half is the part that is easy to get wrong: the scope goes in the
  query key **ARRAY**, not just the tenant hash. `invalidateQueries` matches the
  array, so a scope that only affected the hash could never be invalidated, and
  two scopes would share one cached signal. `agentPulse(scopeKey)` now takes the
  scope and `useAgentPulse(scope)` derives it from the pathname. A cache-isolation
  test proves two scopes issue independent fetches. 22 backend tests.
  ⚠ This factory change was reverted once by a concurrent session and restored;
  its loss surfaced only as a single `tsc` arity error, which is how close it came
  to silently shipping unscoped.
  **Authority version is NOT included, and the reason is structural:**
  `access_versions.permissionsVersion` is backend-only, Redis-cached, and exposed
  by no endpoint. Putting it in a frontend query key would require surfacing it
  through the access response first — a redesign outside this item. Recorded as a
  known limitation rather than silently dropped.
- **BSN-03-020** Implement the Build Inbox badge semantics defined above.
  CLOSED in the fifth pass. The contradiction recorded above was real and had
  **three** disagreeing definitions, not two: `/build/inbox` rendered the
  platform-wide notifications feed, the badge counted pending approvals from a
  different table, and the PRD defined Build notifications. A fourth defect was
  found in the process and is also closed — the Inbox nav destination was gated
  on `build:tickets:view` while its badge hook was gated on
  `build:approvals:view`, so a user holding only the nav key saw the item and
  **never** a badge.
  Resolved by making badge and page count the same rows: `InboxList` now passes
  `sourceModule: "build"`, and the badge reads the same filtered count under
  `build:tickets:view`, matching the destination key. The premise that made this
  look undecidable was false — every event in
  `notification-events-build.catalog.ts` declares `sourceModule: "build"` and
  `notification-dispatch-persistence.service.ts:125` persists it, so the filter
  selects real rows rather than yielding a permanently-zero badge.
- **BSN-03-021** Replace the global notification unread count with the
  canonical Build Inbox count. CLOSED in the fifth pass.
  `GET /notifications/unread-count` now accepts an **optional** `sourceModule`,
  validated by a `.strict()` schema. Optional is load-bearing: the header bell
  calls it with no argument and its behaviour is unchanged, pinned by a named
  test. The Redis sub-key is `unread-count:${sourceModule}` rather than
  `unread-count`, so a global and a per-module count can never collide — the same
  class of defect the list cache already carries a comment about, where two
  `sourceModule` values hashed to one key and served each other's rows.
  `useBuildInboxCount` and its approvals-count call site were removed after
  confirming nothing else read them.
  **Read cost:** `idx_notifications_unread_count` on
  `(orgId, membershipId, id) WHERE deleted_at IS NULL AND archived_at IS NULL AND is_read = false`
  still drives the query; the planner seeks on `(orgId, membershipId)` and
  heap-filters `source_module` over a retention-bounded per-person set. No new
  index was added. This is a planner argument, not a measurement — it is
  unverified until run against a real database with `EXPLAIN (ANALYZE, BUFFERS)`
  as `streamline_app` with the tenant GUC set.
- **BSN-03-024** Verify acknowledgement, new-event, permission-revocation,
  reconnect, and cross-tab update behavior. CLOSED in the fifth pass. The fourth
  pass closed acknowledgement, new-event (pending and escalated),
  permission-revocation and cross-tenant isolation. Reconnect and cross-tab are
  now covered by 7 tests: the badge is not disabled on reconnect, does not
  refetch on window focus, and pauses offline then resumes once online; and a
  `signalBuildInboxInvalidation()` storage event invalidates the Build-filtered
  unread count in a sibling tab while an unrelated key does not, with the
  listener removed on unmount.
- **BSN-03-045** Preserve failed drafts and provide a bounded retry path.
  CLOSED in the fifth pass. Preservation: `retry_count` and `last_error` are
  additive nullable columns in `1124`, and a failure records the error against
  the draft rather than deleting it. Bound: `COMMENT_DRAFT_MAX_RETRIES = 3` is a
  single exported constant in `comment-drafts.constants.ts`, enforced on the
  **write** side by `CommentDraftsService.recordDraftFailure`
  (`Math.min(count + 1, MAX)`) and independently on the **read** side by
  `findCommentDraft`, whose `WHERE` carries
  `retryCount IS NULL OR retryCount < 3`, so a draft at the cap stops surfacing
  in the Pulse even if a writer misbehaves. The retry path is reachable:
  `POST /build/comment-drafts/:draftId/failures`, `@RequirePermission`-gated
  under the class-level `PermissionGuard`, `@Validate`d, returning
  `{ retryCount, retriesRemaining }` so the client can stop before the cap.
  Cross-tenant and no-membership cases are pinned: another org's draft **404s**
  without mutating (never 403 — the id is not an existence oracle) and a caller
  with no membership is refused before any draft is read. 25 backend tests.
- **BSN-03-046** Verify that low-confidence and empty states stay quiet.
  CLOSED in the fifth pass. Empty was already quiet; confidence is now
  represented and filtered — `findCommentDraft` excludes
  `confidence < COMMENT_DRAFT_MIN_CONFIDENCE` (50) in the SQL predicate, while
  `confidence IS NULL` passes through so drafts predating the column are not
  silently dropped. Pinned by a named test in `agent-pulse.service.spec.ts`.
  Note this verifies the *quietness rule* against constructed rows; the generator
  now writes real `confidence` values (BSN-03-043), so an end-to-end check of a
  genuinely low-confidence draft is available but needs a database and live AI.
- **BSN-03-A01** Every Quick Create Matrix cell opens with the stated
  editable defaults or remains correctly hidden. CLOSED in the fifth pass.
  `build-quick-create.test.tsx` covers the dialog layer directly: at PM workspace
  scope the project dialog opens with `{ pmWorkspaceId: "ws-1" }`, and at product
  scope with `{ pmWorkspaceId: "ws-1", managedProductId: 7 }`. The hidden cells
  are covered at the nav-model layer in `build-nav-model.test.ts`, so the matrix
  is proven on both the "opens preselected" and "stays hidden" axes.
- **BSN-03-A04** Revoked or disabled tools disappear from More tools and
  pins immediately after reconciliation. CLOSED in the fifth pass, with the two
  causes kept **distinct** because they fail differently: a *revoked* tool has
  lost its permission key, while a *disabled* tool's module is off and the key is
  still held. `build-nav-model.test.ts` proves both remove the tool from
  `moreTools` **and** from `pinned` even when the id is still in stored
  `pinnedIds` — the pin half at the model layer had no coverage before this pass,
  and a stale pin is the more dangerous of the two because it survives in storage.
  The component layer was already covered by `build-more-tools-menu.test.tsx`.
- **BSN-03-A06** Agent proposals cannot perform meaningful writes without
  explicit approval. CLOSED in the fifth pass. The generator's only write is a
  **draft**; it never posts a comment or touches a ticket's assignment, dates,
  status, scope, budget, permissions or client-visible publication — the list this
  PRD calls meaningful. Proven by an assertion that **bites** rather than one that
  merely confirms the happy path: the `Db` double carries tracked `update`,
  `delete` and `insert` mocks, so any mutation added to the service later fails
  the test. A second test pins the delegate call exactly once with the caller's
  own org, membership and ticket; a third asserts `CommentDraftsService` exposes
  no `publishDraft`/`applyDraft`/`publishProposal`/`applyProposal` on its
  prototype, so an approval-bypassing method cannot be added unnoticed.
- **BSN-03-A07** Client portal appears only when both enabled and
  authorized. CLOSED in the fifth pass at the **component** layer, not just the
  model layer. `build-nav-link-badge-a11y.test.tsx` renders the real nav group
  through `resolveBuildNavModel` + `BuildNavLink` and asserts no link whose href
  matches `/client-portal` is in the DOM when the project capability is disabled
  **even though the permission is held** — separating the two conditions, which
  a permission-only test would not. A paired test asserts the link IS present
  when the capability is enabled, so the negative assertion cannot pass
  vacuously.


Closed in the fourth pass (2026-09-19):

- **BSN-03-016** — all 12 Quick Create Matrix cells (4 scopes x 3 actions) are
  covered with an explicit assertion on the PRESELECTED scope, not merely that a
  dialog opened; a cell that opens the right creator with the wrong preselection
  is the defect this guards. The previously-unproved invalid-target path is now
  pinned: if upstream filtering were bypassed and an Issue action reached
  organization or workspace scope, the component passes `null` rather than
  inventing a project.
- **BSN-03-022** — the count is a `count()` aggregate, so it scans no rows;
  projects only `{ total }`; always binds `orgId` AND the actor's
  `approverMembershipId`; returns 0 without issuing a query when the membership
  is null; and is permission-gated at the HTTP boundary.
- **BSN-03-044** — proven by absence, which is the stronger result: the draft
  path writes only to `comment_drafts`, and `CommentDraftsService` exposes no
  `publishDraft`/`applyDraft`/`publishProposal`/`applyProposal` method at all, so
  there is no path by which an unapproved proposal could take meaningful action.
  Two specs assert both the single-table write and the absence of those methods.
- **BSN-03-052** — internal preview and external portal identities are separate
  at the real entry points, with two NEGATIVE tests carrying the proof:
  `build:portal:view` alone does NOT grant internal management access, and the
  management permission alone yields no portal projects. The internal page never
  invokes a portal data hook, and the portal page never invokes a management
  hook.

- **BSN-03-001/002/003/004** — canonical Inbox, create-context,
  client-visibility, and Pulse signal owners were audited before extension.
- **BSN-03-010/011/012/013/014/015** — Quick Create derives permitted actions
  and editable scope defaults without inventing organization context.
- **BSN-03-023** — zero badges are omitted and nonzero badges have equivalent
  expanded/collapsed accessible names.
- **BSN-03-030/031/032/033/034** — capability-aware tools, reconciliation,
  three-pin enforcement, keyboard interaction, and component coverage exist.
- **BSN-03-041/042** — backend priority/tie-breaking and record-specific links
  are implemented.
- **BSN-03-050/051/053** — Client portal navigation and stale pins are filtered
  by capability and permission with allow/deny tests.

## Acceptance Checklist

- [ ] **BSN-03-A03** Zero-count and no-action states add no visual noise.
- [ ] **BSN-03-A05** Agent Pulse never links to an unrelated scope and follows
  the priority order under concurrent signals. **The priority half is CLOSED**
  (fifth pass) and proven by a stronger technique than a return-value check:
  each test seeds a **concurrent** lower-tier signal and then asserts the query
  count, so the higher tier winning is demonstrated by the lower tier never being
  queried at all. All four adjacent pairs are covered (tier 1>2>3>4>5), plus an
  all-five-concurrent case that must issue exactly one select.
  **Still open, and honestly so:**
  1. the **tie-break** on earliest due-or-created. `ORDER BY` lives in the Drizzle
     builder (`agent-pulse.service.ts:67,111,148,192,241`); a mock bypasses SQL
     and returns the seeded row whatever the sort says, so this needs two rows
     with equal `dueAt` in a real database.
  2. the **unrelated-scope** guarantee. A unit mock returns whatever it is seeded
     with and cannot intercept a row the `WHERE` clause should have excluded. What
     is proven is that the service passes `projectId` through unchanged rather
     than fabricating it; cross-org exclusion needs live seed rows.
- [ ] **BSN-03-A08** Collapsed and expanded controls have equivalent accessible
  names and behavior.
- [ ] **BSN-03-A09** Focused contract, component, permission, cache, and browser
  tests pass.

## Evidence Required to Close

- Badge semantics and canonical data-owner anchors.
- Quick Create Matrix browser evidence for every cell.
- More tools permission/capability and pin-reconciliation results.
- Agent Pulse priority, scope, and approval negative tests.
- Client portal enabled/disabled and allow/deny results.
- Exact commands, pass counts, and residual limitations.

## Evidence Log

`2026-09-19 — BSN-03 (partial, NOT closed) — frontend fb03f49f8 / backend 84394b5fa`

### Closed

- **BSN-03-001..004** — canonical owners located. Build Inbox is **not** a Build
  collection: `build/inbox/page.tsx` renders the platform notifications feed
  (`useInfiniteNotifications` → `GET /notifications`, `@Universal()`), and the sidebar
  badge reads `GET /notifications/unread-count` via `build-sidebar.tsx:62-65`. Agent
  Pulse today surfaces pending approvals only (`build-agent-pulse.tsx:25`). No
  aggregated pulse endpoint exists.
- **BSN-03-032** — the three-pin ceiling now counts **authorized** pins. Previously
  `scopePinCount` counted against the unfiltered scope catalog, so a pin the actor could
  not see still consumed one of three slots while being hidden from the rendered list.
  `countBuildScopePins` + `resolveAuthorizedToolIds` (`lib/build/build-nav-model.ts`)
  fix this; 4 new tests.
- **BSN-03-050/051/053** — Client portal is now gated on capability **and** exact
  permission. `BuildNavDestination.requiredCapability` plus
  `BuildNavAccess.isCapabilityEnabled` resolve the project's stored
  `settings.features.clientPortal`; the desktop sidebar and the shared nav-group model
  (mobile drawer, bottom nav) both consume it, so the surfaces cannot disagree. 4 tests
  cover capability on, off, unset, and permission-denied.

### Residual risk on the capability gate (deliberate, recorded)

`features.clientPortal` is written by the project-create wizard but **no backend code
reads it** — zero matches for `clientPortal` under `backend/src`. It is therefore a
*visibility* signal, not an enforcement boundary; `build:clientvisibility:manage` remains
the only real gate. The gate treats an **absent** flag as enabled, because most projects
never recorded one and failing closed would have hidden Client portal from existing
users. Only an explicit `false` hides it. A real capability needs a backend column and a
service check.

### Defect repaired while verifying

`features/build/client-portal/client-visibility-page.tsx` rendered **denial as
emptiness**: with `build:clientvisibility:manage` absent the query is disabled, so `data`
stayed undefined and the page showed zero tickets and zero milestones rather than a
denied state. It now renders `NoPermissionState`. The file was listed in
`frontend/lib/rbac/denial-is-not-emptiness.known.json`; that entry is retired, as is a
second stale entry (`knowledge-analytics-page.tsx`, converted in an earlier commit but
never removed from the ledger). `denial-is-not-emptiness.test.ts` passes.

### Open

Quick Create matrix (BSN-03-010..016) is **blocked** — project creation cannot accept a
workspace or product. `createProjectSchema` is `.strict()` with no `pmWorkspaceId` or
`managedProductId`, `WizardDraft` has no such field, and `ManagedProductFormSheet`'s
create schema is `{name, key, description, ownerId}`. Preselection is impossible without
backend create-schema changes. The Build Inbox badge (BSN-03-020..024) is blocked on a
Build-scoped count endpoint. Agent Pulse (BSN-03-040..046) is blocked on an aggregated
signals endpoint and on "overdue" / "blocked" semantics that no service exposes. All
acceptance checks BSN-03-A01..A09 remain open.


---

### 2026-09-19 (second pass) — Quick Create matrix and the Inbox badge

- **BSN-03-010/012/013/014** — `createActionsFor` now implements the Quick Create
  Matrix exactly: Issue appears **only** at project scope (no other scope names an
  unambiguous project), Project appears everywhere, and Product appears only where
  a workspace can own it — never under a product or a project. 4 tests walk every
  cell. Preselection is threaded end to end: `BuildQuickCreate` -> `NewProjectDialog`
  -> `ProjectCreateWizard` -> `useProjectProvisioning` -> `createProject`, and the
  managed-product create merges the active workspace at the submit boundary. This
  was impossible before this session — the backend create schema was `.strict()`
  with no such field.
- **BSN-03-022** — the badge query is bounded, projected (`count()` aggregate, never
  a row length), tenant- and actor-scoped, and disabled when the caller lacks
  `build:approvals:view`.

### Deviation you must read before closing BSN-03-020/021

The badge no longer reads the org-wide `GET /notifications/unread-count`. It now
reads **`GET /build/approvals/inbox/count`** — approvals pending *this actor* in
*this org*.

That is a Build-scoped, actor-scoped, actionable signal, and strictly better than
the org-wide notification count it replaces. It is **not** what this PRD defines as
Build Inbox unread, which is "records in `/build/inbox`". `/build/inbox` renders the
platform notifications feed, and no endpoint counts that feed filtered to Build.
So **BSN-03-020 and BSN-03-021 stay open**, and the badge's current meaning is
recorded here rather than being quietly accepted as satisfying them.

The count and the list cannot drift: both call the single exported
`pendingApprovalsForActorCondition(orgId, membershipId)` — the list's hand-rolled
duplicate predicate was deleted in favour of it.

### Still open

Agent Pulse (BSN-03-040..046) remains bound to pending approvals only; no
aggregated priority endpoint exists and no service exposes "overdue", "blocked" or
"dependency changed" semantics. BSN-03-011/015/016, 031, 033, 034, 052 and every
acceptance check remain open.
