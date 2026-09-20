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

1. **`chat_messages` is unpartitioned.** `backend/src/db/schema/chat/chat-message-tables.ts:19`.
   RANGE on `created_at`, PK becomes `(id, created_at)`, partitions pre-created. Record
   the triggering row count in the migration header per backend/CLAUDE.md §3 — and
   decide before partitioning, because the key must be in every PK/UNIQUE.

2. **171 direct `process.env` reads outside `src/config/`, and climbing** — 108 on
   2026-08-20, 158 on 2026-08-23, 171 now. The repair is not the 171 edits, it is the
   lint rule that stops the 172nd: `no-restricted-syntax` banning `process.env` outside
   `src/config/`. Without the gate the count returns.

3. **AI model tiering is two global constants.** `llm-provider.config.ts:34-35` —
   `fastModel = "gpt-4o-mini"`, `standardModel = "gpt-4o"`, platform-wide. Needs
   `ModelRouting.routeFor(feature)` returning `{provider, model, outputCap}`. **Blocked
   on a product decision** about the feature taxonomy; not actionable as written.

4. **No shared list-view module; ~222 pages improvise.** `frontend/features/build/shared/filter-*.tsx`
   already is the module and has zero importers outside Build. Move to
   `features/shared/list-view/`, rename `use-ticket-filter-params` → `useListParams`,
   drop ticket vocabulary from the public interface.

5. **`rich-text-content.tsx` has no Plate branch.** `frontend/components/editor/rich-text-content.tsx:34`
   branches Markdown / Tiptap only, so a KB document authored in Plate cannot render
   outside the KB. Add a `looksLikePlate` detector (Slate JSON) and a read-only branch.

6. **Chat invite links still carry a plaintext `token` column.** `chat-channel-tables.ts:102`
   holds `token`, `tokenHash` and `tokenEncrypted`; the service already looks up by
   hash. Null the column, make `tokenHash` NOT NULL, drop the plaintext unique index.

7. **`sendToChannelMembers` awaits N pushes in the request thread.** `realtime/web-push.service.ts:168`.
   Move to `OutboxWriter.emit` so the fan-out runs after commit — backend/CLAUDE.md §4
   mechanism (2), since losing a push is recoverable but holding a pooled connection
   through someone else's outage is not.

8. **`MAX_CAPABILITY_CHANNELS = 500` truncates silently.** `realtime/ably.service.ts`,
   enforced at `chat-channel-list.service.ts:141`. An org past 500 channels simply
   stops receiving realtime with no error. Surface a cursor or an explicit failure.

9. **Ownership transfer lifecycle is three services.** The race *is* fixed —
   `ownership-transfer-response.service.ts:117-129` does a conditional UPDATE on
   `status = 'PENDING'` with an affected-row check, same at :216 for cancel. Only the
   structural consolidation remains; low urgency.

10. **The access ladder resolves `view` and `manage` two different ways.**
    `module-access.helpers.ts:96-104` answers `manage` from `resolveModuleManagementStanding`
    but `view` from a literal key lookup with standing as fallback. Route `view` through
    `resolveModuleStanding` too, so `module-standing.spec.ts` guards the live path.

11. **No Postgres safety net on email canonicalization.** All three DTOs canonicalize
    (`users.schemas.ts:51-57`), but `auth.ts:114` is a plain case-sensitive
    `.unique()`. A seed or direct insert can still create duplicate-case identities.
    Add `uniqueIndex on lower(email)`.

12. **"My work" ticket read is three OR branches.** `build/core/projects-tickets-read.service.ts`
    measured 373ms / 116 MB per page. Per backend/CLAUDE.md §7 an `OR` between an
    indexed predicate and a semi-join defeats both — split into a `UNION` of
    independently-indexed branches with `count(*) OVER ()`. Measure before and after;
    the `ticket_participants` redesign is the larger fix and can wait on the number.

13. **Invitation state machine has no owner.** `invitation-lifecycle.service.ts`,
    `invitation-acceptance.service.ts`, `invitations.helpers.ts` split by code path, and
    the PENDING predicate is restated in each. Extract one
    `invitationTransition(id, from, to, tx)`.

14. **Payroll still imports HR/directory schema directly.** `payroll/filings/filings.service.ts`
    and `payroll/lib/payroll-run-payee.ts` should read through `modules/directory/person-seam.ts`.

15. **`team` DataScope silently degrades to `own`.** `access/apply-scope.ts:23-27` falls
    back to `eq(ownerColumn, userId)` when `teamIds` is absent — and **no caller supplies
    `teamIds`**. So every team-scoped list quietly returns the caller's own rows. The
    correlated subquery backend/CLAUDE.md §5 named as the blocker is gone; materialising
    org-unit membership is the remaining prerequisite before `team` can be advertised
    as working. Until then it is a scope that lies.

**Not re-verified:** the knip housekeeping item (14 unused web files, `@reactour/tour`).
Note that the 11 raw-SQL-managed schema files are *deliberately* unimported and are
asserted by `migration-integrity.spec.ts` — knip will always call them unused.
