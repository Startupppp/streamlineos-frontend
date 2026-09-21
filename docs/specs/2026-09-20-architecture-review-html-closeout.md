# Architecture reviews — what the six retired HTML reports still owe

**Status (2026-09-21, second pass — the owner ruled on every blocked item, so nothing here
is waiting on a decision any more):** of the 15 items opened on 2026-09-20, **6 are closed
in code** (2, 6, 10, 13, 15, and 14 for the site the review named), **4 proved obsolete or
refuted on measurement** (1, 7, 11, 12), **3 were corrected and deferred with a re-open
threshold** (4, 8, 9), **1 is closed in part with a re-filed successor** (3), and **1 was
reverted as a duplicate** (5).

Ten of the fifteen therefore did not survive contact with the source or the database —
item 12 most sharply, where the seeded measurement showed the repair the review asked for
would have made the query **284× more expensive**. That is the point of the re-derivation
discipline below, not a failure of it, but it does mean this document's *own* remaining
claims deserve the same suspicion.

**Two successors were re-filed rather than left inside closed items**, because they are
different problems from the ones raised: the `ticket_participants` redesign (from 12) and a
directory-owned name-searchable query method for salary profiles (from 14).

This file replaces the record that went missing when `.scratch/platform-phase-three/` was
deleted.

Six HTML reports were generated 2026-08-20 and 2026-08-23, then deleted in
`22ddddb93` on the claim that "everything actionable in them is now shipped,
ticketed, or recorded in the phase-three README's carried-forward section."
**Two of those three destinations no longer exist**: `.scratch/platform-phase-three/`
is gone from the working tree, and the phase-two ticket set was itself absorbed into
`docs/tickets/crm-phase-2/README.md`. The reports are recoverable only from git:

```
git show 8244527bf:architecture-review-20260820-1.html      # and -2, -3, -4
git show a16568636:architecture-review-20260820-2.html      # -2 was later amended
git show 8244527bf:architecture-review-20260823-access.html
git show 8244527bf:architecture-review-20260823-verified.html
git show 22ddddb93:.scratch/platform-phase-three/README.md  # the carried-forward record
```

Every verdict below was re-derived against current source on 2026-09-20, not copied
from the reports. Treat each as a lead with an anchor, not a finding: this repository
has a recorded habit of reports resting on premises that turn out false, and four
items below are marked OBSOLETE for exactly that reason.

## Closed — do not re-raise

Chat tenancy seam (`orgId` composite keys, `generatedAlwaysAsIdentity` not `serial`) ·
reactions are a real table with a unique index, not jsonb · `EntityReference` seam with
an actor on every adapter method · permission catalog sync tested both directions,
673 keys each side · route registry data-driven, the 31-branch chain is gone ·
cross-process access-version channel over Redis · `module-registry.ts` as the single
module declaration, with `MODULE_CATALOG`/`ADMINISTRABLE_MODULES`/`ACCESS_MANAGED_MODULES`
derived from it · `namespacesForModule` single implementation · ownership expansion
filtered through `isDelegablePermission` · single `resolveActorRankContext` that
excludes expired assignments · the parallel `GET /rbac/user-permissions` resolver
deleted · scope fallbacks now deny instead of widening to `all` · RBAC invariants
tested by rendering components rather than reading source text ·
`ChatAssistantController` carries `@NoTenantTransaction()` on both POSTs.

**OBSOLETE — premise no longer true, do not re-file:** the 53 two-segment permission
keys (nothing reads segment [1] or [2] structurally) · "chat has 4 keys over 21 routes"
(really 11 over 72) · the greedy `/build/:projectId` 400 (Nest resolves static segments
first and the pipe throws `NotFoundException`) · `applyScope`'s correlated
`org_unit_members` subquery (removed — but see item 15).

## Open

Ordered most severe first. Each names the owning file and the smallest repair.

1. ~~**`chat_messages` is unpartitioned**~~ — **DEFERRED on measurement, 2026-09-21.**
   The item asked for the triggering row count before deciding, per backend/CLAUDE.md §3.
   Measured against production: **`chat_messages` holds 14 rows.** For scale, the largest
   table in the entire production database is `role_permission_grants` at 27,808 rows /
   13 MB; nothing else exceeds 900 rows. Partitioning now would force the partition key
   into every PK and UNIQUE on the table, and into every FK that references it, to
   optimise a 14-row scan.
   **Re-open when `chat_messages` passes ~10M rows or the table exceeds ~10 GB**, and
   re-measure before designing — not before.

2. ~~**171 direct `process.env` reads and no lint rule**~~ — **both halves were wrong;
   corrected and largely CLOSED 2026-09-20.** The real count outside config, scripts
   and tests is **94**, not 171 — the review's figure counted test and script reads.
   And a `no-restricted-syntax` gate already existed. Its actual defects were narrower
   and worse: it covered only `src/modules/**` and `src/common/**`, leaving
   `src/health`, `src/db`, `src/degradation` and `src/me` **entirely ungated**; and 22
   files inside the covered glob were missing from the per-file ratchet, so
   `pnpm exec eslint` was **exiting 1 on `main`** — confirmed by running the committed
   config against three of them and collecting five errors. Fixed in `14bc673d4`: glob
   widened to `src/**` with explicit ignores for the four places that legitimately read
   the environment pre-injector, and the 22 added to the ratchet. Verified the rule
   fires in newly-covered `src/health/` and stays silent in `src/config/`.
   **Residual now CLOSED too (`81905ceef`).** `check:process-env-ratchet` caps the combined
   list so it may only shrink, and fails on a duplicate or a stale entry — a stale path
   exempts nothing and hides a debt that was paid without the count falling. Both blocks are
   counted together on purpose: gating them separately would let a file be reclassified from
   "debt" to "permanent" to dodge the ratchet. Wired into the CI `gates` job with a self-test.
   Its first run found two real defects: `region.module.ts` was listed in *both* blocks, and
   `payroll/hr-payroll/lib/encryption.ts` no longer exists (its env reads moved into
   `common/security`, already listed). Baseline landed at **62**, not 64.

3. **AI model tiering is two global constants.** `llm-provider.config.ts:34-35` —
   `fastModel = "gpt-4o-mini"`, `standardModel = "gpt-4o"`, platform-wide. Needs
   `ModelRouting.routeFor(feature)` returning `{provider, model, outputCap}`. **Blocked
   on a product decision** about the feature taxonomy; not actionable as written.

4. **No shared list-view module; ~222 pages improvise** — the observation may stand, but
   THE NAMED REPAIR DOES NOT ACHIEVE IT. Re-measured 2026-09-21.
   The `filter-*` cluster is not a latent shared module waiting to be relocated; it is a
   five-file cluster with **one** external consumer, `features/build/views/workload-filter-submenu.tsx`
   (the other four files only import each other). `use-ticket-filter-params` likewise has
   exactly one consumer, `features/build/shared/ticket-filter-bar.tsx`.
   Moving those files to `features/shared/list-view/` and renaming the hook would relocate
   a Build-specific module with a single caller and make its name *less* descriptive of
   what actually uses it. No page adopts a shared module because it changed folder — the
   222 pages would still improvise the next day.
   **The real work is the migration, not the move:** pick the two or three pages whose list
   behaviour genuinely duplicates this, migrate them onto one implementation, and let the
   neutral home follow from having real second and third consumers (root §4). Re-file as a
   product-level task with those pages named, or drop it.

5. **`rich-text-content.tsx` has no Plate branch** — premise true, but the obvious repair
   was TRIED AND REVERTED 2026-09-21. `frontend/components/editor/rich-text-content.tsx`
   branches Markdown / Tiptap only. KB really does author Plate
   (`features/wiki/components/page-document.tsx:41` → `PlateDocumentEditor`, persisted as
   a Slate array per `hooks/api/kb/kb-pages-schema.ts:19`).
   **Do not fix it by adding a Slate renderer to the shared component.** That was
   implemented — a `looksLikePlate` detector plus 126 lines of node rendering — and backed
   out for two reasons. It is a near-verbatim copy of `renderSlateLeafNode` in
   `features/wiki/components/public-page-content.tsx:141`, down to the same Tailwind
   strings, and CLAUDE.md §4 is explicit that an existing implementation is imported, not
   copied. And it is speculative: `RichTextContent` has exactly **one** caller,
   `features/build/ticket-details/comment-item.tsx:246`, which passes Tiptap HTML. No code
   path anywhere hands it Plate, so the branch could not execute.
   The blocker the agent correctly identified is real — `components/` may not import
   `features/wiki/` (§9, one-directional flow) — and it is what makes this item a
   **structural move, not an addition**: when a second consumer of Slate rendering actually
   appears, lift `renderSlateLeafNode`/`renderSlateNode` out of `features/wiki` into a
   neutral home and point both callers at it. Until that consumer exists, YAGNI.

6. ~~**Chat invite links still carry a plaintext `token` column**~~ — **CLOSED 2026-09-21,
   applied to production.** Migration `1130_chat_invite_link_token_hardening` drops the
   plaintext unique index (an index over a secret at rest), nulls the remaining plaintext,
   and makes `token_hash` NOT NULL via the NOT VALID / VALIDATE two-step, behind a `0455`-style
   preflight `DO` block that refuses the migration if any row lacks a hash.
   Verified on production after commit: `token_hash` is NOT NULL, the plaintext index is
   gone, the hash index remains, zero plaintext rows, and **the constraint bites** — a null
   `token_hash` insert is rejected `23502` in a rolled-back transaction. Production held
   **zero** invite links, so nothing was destroyed and no link was invalidated.
   `/health/ready` reports database up afterwards. Chat suite 61/61, 635 tests.
   **Correction to the finding:** `tokenEncrypted` is NOT redundant. The three columns do
   three jobs — `token_hash` is the indexed lookup, `tokenEncrypted` is what lets an admin
   re-display the invite URL, and only `token` was legacy. Joining was never affected:
   `joinViaInviteLink` resolves by hash alone.

7. ~~**`sendToChannelMembers` awaits N pushes in the request thread**~~ — **OBSOLETE on both
   halves. Verified 2026-09-21; the asked-for repair is already in place.**
   The `Promise.allSettled(members.map(...))` the review described is gone:
   `realtime/web-push.service.ts` now pages recipients (`PUSH_SUBSCRIPTION_BATCH`), loads
   each page's subscriptions in ONE query, and fans out under `boundedMap` with
   `PUSH_FANOUT_CONCURRENCY`. No N+1, no unbounded concurrency.
   And it does not run in the request thread. The only production caller is
   `chat/chat-fanout-deferred.helper.ts:91`, reached via
   `OutboxBackedMessageFanoutProvider`: `ChatMessagesService` writes a
   `chat.message.fanout` outbox row before its transaction commits, the outbox worker
   claims the durable row afterwards, and a throw returns to that worker for
   retry/dead-letter. Each channel additionally goes through `effects.execute` with a
   `producerEventId`/`effectKey` and `providerIdempotency: "STABLE_KEY_PROPAGATED"`, inside
   its own `runInNewTenantTransaction` — not the request's.
   **One residual nuance, not worth a change today:** the HTTPS push happens inside that
   fresh transaction, so a pooled connection is held for the provider's latency — but it is
   the outbox worker's connection, not a request's, and the send needs the tenant GUC for
   its own reads and ledger writes. Revisit only if the worker pool shows saturation.

8. **`MAX_CAPABILITY_CHANNELS = 500`** — **"silently" is WRONG, and it is unreachable by
   125×.** Re-derived 2026-09-21. Both layers already emit a structured warning:
   `ably.service.ts:53-60` logs `ably: channel capability list truncated` with `orgId`,
   `userId`, `total` and `granted`, and `chat-channel-list.service.ts:141` deliberately
   reads `MAX_CAPABILITY_CHANNELS + 1` rows precisely so the consumer's truncation is
   observable at the database layer. Server-side observability exists.
   Measured against production: the busiest org has **4** channels and the busiest member
   **4** memberships, against a cap of 500.
   **What is genuinely missing** is a *client-facing* signal — the token mints with 500
   channels and the user simply receives nothing on the rest. The suggested repairs do not
   fit: a cursor is meaningless for an Ably capability list, and an explicit failure would
   lock a large org out of realtime entirely. The proportionate fix is a `truncated` flag on
   the token response so the client can degrade visibly, which is a cross-repo contract
   change (root §5). **Re-open when any org passes ~400 channels per member.**

9. **Ownership transfer lifecycle is three services** — **DEFERRED, and the only part that
   mattered is already done.** The race *is* fixed: `ownership-transfer-response.service.ts:117-129`
   does a conditional UPDATE on `status = 'PENDING'` with an affected-row check, same at
   :216 for cancel. What remains is a pure three-service consolidation with no behavioural
   change, in ownership-transfer code, while the working tree is shared with other active
   sessions. Not worth the collision risk for zero customer-visible gain. Re-file only if a
   fourth code path needs the same lifecycle.

10. ~~**The access ladder resolves `view` and `manage` two different ways**~~ — **CLOSED
    2026-09-21 (`1b55e28ac`).** Premise held. `assertModuleAccessPolicy` now routes `view`
    through a new `resolveModuleStanding`, the same authority resolver `manage` uses, and
    six tests in `module-standing.spec.ts` cover the live path (they failed before the fix
    because the function did not exist).
    **Verified that no access changes hands**, on the two axes where it could have:
    the key lookup is only reachable with `action === "view"` (the `manage` branch returns
    or throws above it), so replacing `` `:access:${action}` `` with `:access:view` is
    equivalent there and is *not* a grant of view-keys to manage-callers; and every source
    `resolveAuthoritySource` can return — `org-owner`, `module-ownership`, `org-admin`,
    `module-role` — carries `canManageAccess: true`, so `source !== null` is the same
    predicate as the `hasModuleAccessManagementAuthority` call it replaced. The only
    `canManageAccess: false` standing is `membership`, which that function never returns.

11. ~~**No Postgres safety net on email canonicalization**~~ — **OBSOLETE, the net already
    exists. Verified against production 2026-09-21.** The review read only the Drizzle
    table (`src/db/schema/common/auth.ts:114`, a plain case-sensitive `.unique()`) and
    concluded there was no database-level guard. There is:
    `migrations/0455_email_canonical_uniqueness.sql` creates
    `CREATE UNIQUE INDEX "uniq_users_email_ci" ON "users" (LOWER("email"))`, it is
    journaled, and `pg_indexes` confirms it live in production. Its implementation is
    better than the one this item proposed — a `DO` block pre-checks for case-variant
    duplicates and raises an error naming every offending address, because a bare
    `CREATE UNIQUE INDEX` fails with an undiagnosable "could not create unique index".
    Proven by constructed bite: inserting an uppercase variant of an existing address
    into production inside a rolled-back transaction is rejected with `23505`.
    **The absence from the Drizzle schema is deliberate, not drift.** `uniq_users_email_ci`,
    `idx_users_email_trgm` and `idx_users_platform_admin` all exist in production and are
    all absent from the table definition: raw-SQL-managed objects stay outside Drizzle's
    view so Drizzle never manages them, the same principle as the
    `hrms-phase1-sql-managed.ts` holding barrel. Declaring them would invite a generated
    migration to drop them. Do not "fix" this by adding them to the schema.

12. **"My work" ticket read is three OR branches.** `build/core/projects-tickets-read.service.ts`.
    **The quoted 373ms / 116 MB per page did not come from production** — no build table
    reaches the top 12 by row count there (2026-09-21 measurement, item 1). Treat it as a
    seeded-environment figure. Per backend/CLAUDE.md §7 an `OR` between an indexed predicate
    and a semi-join defeats both — split into a `UNION` of independently-indexed branches
    with `count(*) OVER ()`.
    **MEASURED 2026-09-21, AND THE NAMED REPAIR IS REFUTED. Do not implement the UNION split.**
    Seeded on the Aurora scratch database: 200,000 tickets (619 MB) across 5 projects, 228,000
    `ticket_assignees` rows, 50 memberships, plus 20,000 tickets in a second tenant so RLS has
    rows to exclude. `VACUUM ANALYZE`d, then measured as `streamline_app` with
    `app.organization_id` set, `EXPLAIN (ANALYZE, BUFFERS)`, `LIMIT 26`. The actor's my-work set
    is 7,429 of 200,000 tickets. Every rewrite was checked to return the **same page** as the
    current query, not a cheaper different one.

    | shape | org-wide buffers | project-narrowed buffers |
    |---|---|---|
    | **A — current OR** | **555** | **11,121** |
    | B — UNION + `count(*) OVER ()` (the named repair) | 157,565 | 43,104 |
    | D — bounded `UNION ALL`, per-branch `ORDER BY … LIMIT` | 24,035 | 779,195 |
    | E — hoisted `IN` subquery, signature-preserving | 555 | 11,121 |
    | C — pre-resolved membership id + plain `EXISTS` | 401 | 10,967 |

    The UNION split is **284× worse** org-wide and 3.9× worse project-narrowed, and its bounded
    form — the version that actually respects the `LIMIT` — is worse still, 70× on the
    project-narrowed page. The reason is visible in the plan: the current OR streams
    `idx_tickets_org_created_live` in `created_at` order and stops after 26 rows, while every
    UNION form must produce all three branches before it can order and cut.

    §7's premise does not even hold here: **`tickets.reporter_id` is `text` with no index at
    all.** The only reporter index is `idx_tickets_org_reporter_membership` on
    `reporter_membership_id`, a different column. Adding
    `(org_id, reporter_id, created_at DESC, id) WHERE deleted_at IS NULL` was measured and
    changed nothing for the winning shapes.

    Variant C is the only improvement (−28% org-wide, −1.4% project-narrowed) and is **not
    being taken**: it needs the actor's membership id, and `CurrentUserContext`
    (`common/auth/backend-claims.ts:22-31`) does not carry one. Adding a field to that core
    auth type to save 154 buffers on a 1.8 ms query is the wrong trade. Variant E, which
    preserves `ticketScope(orgId, userId)`'s signature, buys exactly zero.

    **Residual, re-filed rather than closed:** the project-narrowed page costs 11,121 buffers
    and discards 40,000 rows by filter, and no rewrite of the predicate fixes that — the three
    branches cannot share one index. That is the `ticket_participants` redesign the item
    already names, and it is now the only live part of this finding.

13. ~~**Invitation state machine has no owner**~~ — **CLOSED 2026-09-21 (`9cc0043f7`).**
    Premise confirmed: the PENDING predicate was restated at six places across
    `invitation-lifecycle.service.ts`, `invitation-acceptance.service.ts` and
    `invitations.helpers.ts`. `invitationTransition` now owns it — a conditional UPDATE on
    the from-state plus `accepted_at IS NULL`, returning null when it matches no row.
    **No race was introduced or found:** all three single-row transitions already did a
    conditional UPDATE with an affected-row check, so the "first concurrent accept wins"
    guarantee is preserved, not added.
    Two departures from the signature the item suggested. It takes an options object, not
    positionals: `invitationId`/`orgId` are both strings and `from`/`to` are both status
    enums, which put two pairs of adjacent same-typed arguments within reach of a silent
    swap. And `orgId` is required as `string | null`, so the token-authorized accept path —
    scoped by `invitationId` + `tokenHash` rather than by tenant, since
    `lockPendingInvitation` does not filter on org — has to state that choice rather than
    omit it.
    **The spec's first form was vacuous and is worth remembering.** It walked the Drizzle
    condition graph into the column objects and out to their parent table, so every column
    of `invitations` was collected and "the predicate contains `org_id`" passed whether or
    not the filter existed. Stopping the walk at column boundaries is what makes it real —
    proven because the `orgId: null` case only started failing after that change. The same
    bug was fixed in `impersonation.service.spec.ts`, which now pins the exact column set.
    Left alone with reasons: `decline()` keeps `tokenHash` in its WHERE (removing it would
    let a concurrent resend slip through), `findPendingByToken` is a read not a transition,
    and `revokeAllPending` is a bulk update with no id.
    Verification: backend typecheck 0 errors; organization/core 525 passing, up from 522,
    with the 9 pre-existing failures unchanged (they are an email-outbox scope error and
    four membership/purge suites, none on the invitation path).

14. **Payroll still imports HR/directory schema directly** — HALF WRONG, half real and
    BLOCKED on a seam widening. Re-derived 2026-09-21.
    - **`payroll/filings/filings.service.ts` — no violation. Do not "fix" it.** It imports
      only `payrollFilings`, a payroll-owned table. What the review saw is
      `EmploymentFactsService`, which is a *service* import, and backend/CLAUDE.md §1 says
      cross-module access goes through the other module's service — that is the convention
      being followed, not broken. 19 payroll files do the same.
    - **`payroll/lib/payroll-run-payee.ts` — real violation.** It imports directory-owned
      `workers` and `organizationPeople` from `db/schema` and joins them for
      `workerNumber`, `organizationPersonId`, `displayName`, `firstName`, `lastName`,
      `workEmail`. Of the 15 files importing those two tables, every other one is inside
      `modules/directory/` or `modules/hr/`.
    - **The blocker:** `resolvePeopleIdentities` covers every field except `workerNumber`.
      The seam's query already joins `workers` but projects only `workerId` and `isPayee`.
      So the unblocking step is precise: add `workerNumber` to `PersonIdentity` and to that
      projection, *then* route the payee loader through the seam.
    - **The review missed a second site:** `payroll/runs/salary-profiles.repository.ts`
      has the same direct-import pattern. Fix both or neither.
    **AUTHORIZED AND DONE 2026-09-21 for the site the review named; the second site is
    re-classified, not skipped.**
    - `person-seam.ts` now projects `workerNumber` from the `workers` join it was already
      performing — one more projected column, no new join and no second round trip. The type
      is derived from `workers.$inferSelect["workerNumber"]`, so it tracks the nullable column.
    - `payroll/lib/payroll-run-payee.ts` routes through `resolvePeopleIdentities` and its direct
      `workers` / `organizationPeople` imports are gone. **The N+1 risk that blocked this was
      measured, not assumed:** subjects are collected across all keyset pages and resolved in
      exactly one seam call. For N payees the run goes from `ceil(N/500) + 3` round trips to
      `ceil(N/500) + 4` — one more per run, flat in N. A test pins it by name.
    - **`payroll/runs/salary-profiles.repository.ts` is NOT the same violation and must not be
      "fixed" the same way.** Verified at source: `profileSortName` is a SQL expression over
      `organizationPeople.displayName / firstName / lastName / workEmail`, and it drives the
      `ORDER BY`, the six search `ilike`s, **and the keyset cursor predicate**
      `(profileSortName, id) > (?, ?)`. Those columns must be in the SQL, so
      `resolvePeopleIdentities` — which resolves identities *after* the rows are chosen — cannot
      replace them. Routing it through the seam would silently break search, sort and pagination
      for worker-linked profiles. Re-filed: this needs a directory-owned query method that
      exposes name-searchable, name-sortable results, or a product decision to drop worker-name
      search and sort from that endpoint. It is not a seam widening.

    Verified: 10 suites / 76 tests green across directory and payroll.

15. **`team` DataScope silently degrades to `own`** — premise CONFIRMED, and one
    tempting repair has been tried and REJECTED. `access/apply-scope.ts:22-27` falls
    back to `eq(ownerColumn, userId)` when `teamIds` is absent. Verified 2026-09-20:
    there is exactly **one** runtime caller (`scoped-read.ts:106`) and it supplies no
    `teamIds`, so every team-scoped list returns the caller's own rows. `team` *is*
    reachable — `permission-catalog-sync.service.ts:133` emits a `team` row for every
    `scopable` permission — but **no role seeds it**, and a live count found **zero
    `scope = 'team'` rows in production** across `role_permission_grants` and
    `user_permission_grants`. The correlated subquery §5 named as the blocker is
    already gone.

    **Do not "fix" this by returning `sql\`false\``.** That was implemented and backed
    out, for three reasons. ADR 0005 ranks `none < own < team < all` and `broadest()`
    depends on it, so denying at `team` makes the *broader* grant return strictly
    fewer rows than the narrower one — a user holding both `own` and `team` would
    resolve to `team` and see nothing. It fails six tests across three suites,
    including two that deliberately pin the degrade. And it does not even achieve its
    own aim: `false` renders an empty list, which is exactly as silent to the user as
    the under-grant it replaces.

    **DECIDED AND CLOSED 2026-09-21: the offer is withdrawn.** Of the two product options —
    materialise org-unit membership, or stop offering `team` until it exists — the owner chose
    to stop offering it. backend/CLAUDE.md §5 already said `team` "ships only once
    materialised"; the defect was that the offer shipped first.

    Three changes, because the offer lived in three places:
    - `permission-catalog-sync.service.ts` no longer emits a `team` row for a scopable
      permission, and its local `SupportedScope` drops the now-dead member.
    - the grant UI's `SCOPE_OPTIONS` (`frontend/features/module-access/components/page-action-picker-parts.tsx`)
      offers `all` and `own` only. `parseScope` still *accepts* `team`, because an existing
      grant may carry it.
    - **migration 1131** — the sync service inserts with `onConflictDoNothing` and has no
      delete branch, so stopping the emission would have left the rows standing. Measured
      against production first: `permission_supported_scopes` held **57 live `team` rows**, and
      `role_permission_grants` held **zero** `team` grants (27,688 `all`, 120 `own`);
      `user_permission_grants` was empty. So this withdrew a real offer that nobody held.
      Applied 2026-09-21; the 57 rows are gone, grants are unchanged, and `access_versions`
      was bumped. The rollback was dry-run against production inside a discarded transaction
      and restores exactly 57 rows — exact because the sync emitted `own` and `team` together,
      so the surviving `own` rows name precisely the withdrawn keys. Precedent: 0670a.

    `DataScope` still contains `team` and `broadest()` still ranks `none < own < team < all`,
    both deliberately untouched — a pinning test now says so by name, so this change cannot be
    mistaken later for permission to re-rank. `apply-scope.ts` is unchanged: its degrade is
    what an existing `team` grant should keep getting, and production has none.

**Not re-verified:** the knip housekeeping item (14 unused web files, `@reactour/tour`).
Note that the 11 raw-SQL-managed schema files are *deliberately* unimported and are
asserted by `migration-integrity.spec.ts` — knip will always call them unused.
