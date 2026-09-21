# Architecture reviews — what the six retired HTML reports still owe

**Status:** audit complete, 15 items open. This file replaces the record that went
missing when `.scratch/platform-phase-three/` was deleted.

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
   **Still open:** nothing caps ratchet growth, so an author can still add their file
   instead of fixing the read. That needs its own check.

3. **AI model tiering is two global constants.** `llm-provider.config.ts:34-35` —
   `fastModel = "gpt-4o-mini"`, `standardModel = "gpt-4o"`, platform-wide. Needs
   `ModelRouting.routeFor(feature)` returning `{provider, model, outputCap}`. **Blocked
   on a product decision** about the feature taxonomy; not actionable as written.

4. **No shared list-view module; ~222 pages improvise.** `frontend/features/build/shared/filter-*.tsx`
   already is the module and has zero importers outside Build. Move to
   `features/shared/list-view/`, rename `use-ticket-filter-params` → `useListParams`,
   drop ticket vocabulary from the public interface.

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

6. **Chat invite links still carry a plaintext `token` column.** `chat-channel-tables.ts:102`
   holds `token`, `tokenHash` and `tokenEncrypted`; the service already looks up by
   hash. Null the column, make `tokenHash` NOT NULL, drop the plaintext unique index.

7. **`sendToChannelMembers` fan-out is still inline** — premise HALF STALE, narrowed
   2026-09-21. `realtime/web-push.service.ts:168`. The review described
   `Promise.allSettled(members.map(...))` opening one call per member; **that is already
   fixed** — the method now pages recipients (`PUSH_SUBSCRIPTION_BATCH`), loads each
   page's subscriptions in ONE query, and fans out under `boundedMap` with
   `PUSH_FANOUT_CONCURRENCY`. The N+1 and the unbounded concurrency are both gone.
   **What remains** is only that the loop is still `await`ed inline, so the caller holds
   its pooled connection through the push provider's latency. Moving it to
   `OutboxWriter.emit` (backend/CLAUDE.md §4 mechanism 2) is still right — losing a push
   is recoverable, holding a pooled connection through someone else's outage is not —
   but the urgency is much lower than the review implied.

8. **`MAX_CAPABILITY_CHANNELS = 500` truncates silently.** `realtime/ably.service.ts`,
   enforced at `chat-channel-list.service.ts:141`. An org past 500 channels simply
   stops receiving realtime with no error. Surface a cursor or an explicit failure.

9. **Ownership transfer lifecycle is three services.** The race *is* fixed —
   `ownership-transfer-response.service.ts:117-129` does a conditional UPDATE on
   `status = 'PENDING'` with an affected-row check, same at :216 for cancel. Only the
   structural consolidation remains; low urgency.

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
    seeded-environment figure and re-measure before and after. Per backend/CLAUDE.md §7 an `OR` between an
    indexed predicate and a semi-join defeats both — split into a `UNION` of
    independently-indexed branches with `count(*) OVER ()`. Measure before and after;
    the `ticket_participants` redesign is the larger fix and can wait on the number.

13. **Invitation state machine has no owner.** `invitation-lifecycle.service.ts`,
    `invitation-acceptance.service.ts`, `invitations.helpers.ts` split by code path, and
    the PENDING predicate is restated in each. Extract one
    `invitationTransition(id, from, to, tx)`.

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
    Not attempted here deliberately: `person-seam.ts` is a shared seam (a reservation
    surface under root §3), the caller is money-handling code, and collapsing its join into
    a seam call risks trading one query for an N+1. This wants an owner, not an opportunistic
    edit. Baseline at time of audit: payroll 130 suites / 1018 tests green, `check:cycles` clean.

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

    The honest repair is one of two product decisions, neither of them a code tweak:
    materialise org-unit membership so `teamIds` can be supplied, or stop offering
    `team` as a grantable scope until it exists. backend/CLAUDE.md §5 already says
    `team` "ships only once materialised" — the defect is that the grant UI offers a
    scope the query layer cannot honour.

**Not re-verified:** the knip housekeeping item (14 unused web files, `@reactour/tour`).
Note that the 11 raw-SQL-managed schema files are *deliberately* unimported and are
asserted by `migration-integrity.spec.ts` — knip will always call them unused.
