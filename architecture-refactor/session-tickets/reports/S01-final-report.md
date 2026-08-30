# S01 Final Report — Identity, Organization, RBAC, Module Access & Settings

**Session date:** 2026-08-30
**Ticket:** `S01-identity-org-rbac.md`
**Items:** 20 total — 12 ticked DONE, 7 OPEN, 1 PARTIAL

---

## Summary

| Status | Count | Items |
|---|---|---|
| VERIFIED DONE (already correct) | 11 | 7, 8, 9, 10, 12, 13, 14, 15, 17, 18, 20 |
| GENUINELY DONE (prior sessions) | 3 | 3, 4a, 4c (already ticked before this session) |
| OPEN — scope too large | 6 | 1, 2, 3, 4, 5, 6 (actor contraction) |
| OPEN — cross-session dependency | 1 | 11 (cursor pagination) |
| REPORTED to S09 | 1 | 19 (settings route anomaly) |

---

## Per-Item Verdicts

### §1 Actor Contraction (Items 1–6)

**OPEN** — All six actor contraction items remain genuinely outstanding. This is a multi-wave migration effort.

**Evidence:**
- `scan:legacy-actors:check` shows 553/555 remaining (2 migrated since baseline in a prior session).
- `architecture-refactor/ACTOR-CONTRACTION-PLAN.md` (produced by L35) classifies all ~467 in-scope source-visible columns.
- The following modules have 0% expansion done: billing (0/18), accounting (0/27), support (0/25), ai (0/6), e-sign (0/7), surveys (0/5), mail (0/1).
- Contraction cannot proceed until expansion + backfill is done for each module.

**Decision:** Items 1–6 left OPEN. The plan document is complete; execution requires dedicated migration lanes. Attempting contraction in this session would be a correctness risk (no zero-use proof, no backfill validation).

**Cost if wrong:** A premature drop of a legacy column that still has active readers breaks writes and/or queries silently.

---

### §2 Membership Artifact Inventory (Items 7, 8, 9)

**VERIFIED DONE**

**Item 7** — `membership-artifacts.spec.ts` 11/11 pass:
```
PASS src/modules/organization/core/membership-artifacts.spec.ts
Tests: 11 passed, 11 total
```
Every membership-keyed table is inventoried; the scan finds >3 tables (proving it's not broken).

**Item 8** — AUTHORITY/ATTRIBUTION classification is implicit in the spec:
- `ATTRIBUTION_COLUMN` regex (spec:12–14) excludes attribution columns from the inventory.
- `KNOWN_EXCLUDED_COLUMNS` (spec:25–78) pins the full attribution column list.
- The `MEMBERSHIP_ARTIFACTS` array contains only authority artifacts.
- Spec test "separates an authority column from an audit-attribution one" (spec:129–137) asserts correct regex behavior.
- No security finding: `onRemoval`/`onSuspension` values are correct.

**Item 9** — AUTHORITY artifacts cleared on removal:
- `membership-revocation.spec.ts` 36/36 pass (including "every database-write artifact with onSuspension=revoke is handled for the suspended cause").
- `sessions.service.ts:218`: `redis.set(`revoked:session:${id}`, true)` — Redis tombstone confirmed.
- `org-membership-access-revocation.ts` covers: agent tokens, delegations, ownership transfers, resource grants, KB space grants, invitations, chat artifacts, integration connections (via OutboxWriter), Ably realtime tokens (via `registerAfterCommit`), sessions (via `revokeAllForUser`).

---

### §3 Placement-bypass (Item 3)

**VERIFIED DONE** (already ticked before this session) — `check:placement-bypass` PASSES.

---

### §4 Authority Matrix (Items 4a, 4b, 4c)

**Item 4a** — VERIFIED DONE (already ticked) — `check:owner-authority` PASSES: 12 owner shortcuts, all correctly classified.

**Item 4b** — VERIFIED DONE:
- Exactly 6 standings: org owner/admin/member + module owner/admin/member.
- No `createRole` endpoint in `rbac.controller.ts` (only `POST role-permissions`).
- `roles.service.ts:523` comment: "is not custom-role creation, which is why it survives while `createRole` did not."
- `backfill-slugs-exist.spec.ts:59–60` pins slug patterns.

**Item 4c** — VERIFIED DONE (already ticked) — `authority-matrix.spec.ts` 14 tests pass.

---

### §5 Module-access Decomposition (Items 5a, 5b, 5c already ticked; Item 5d)

**Items 5a, 5b, 5c** — VERIFIED DONE (already ticked before this session).

**Item 5d** — OPEN:
- **Current state:** `listMembers` uses offset pagination with `Math.min(pageSize, 100)` cap. `listCandidates` uses prefix ILIKE `${search}%` (trailing wildcard, not leading) on the global `users` table (no RLS concern).
- **Why OPEN:** Cursor pagination requires coordinated change: (1) backend DTO schema, (2) `module-access-roster.service.ts`, (3) frontend hook `hooks/api/module-access/members.ts`, (4) app pages in `frontend/app/(authenticated)/` that consume the hook — those pages are S09's ownership. A backend-only cursor change would break the frontend without S09 updating the app pages.
- **What S09 needs (OUT-OF-OWNERSHIP):** After S01 converts the backend to cursor-based, S09 must update the module-access app pages to use `useInfiniteQuery` instead of page/pageSize state. The app pages that need updating are those under `frontend/app/(authenticated)/` that import `useModuleMembers`.

---

### §6 Permission Catalogs (Item 6b; others already ticked)

**Item 6b** — VERIFIED DONE:
- `hr:employees:export` ghost is resolved: absent from both catalogs. The actual CSV export uses `hr:export:manage` (exists in both catalogs via `hr-export.controller.ts:43`).
- `settings:automations:view` and `settings:automations:manage` requested by S04 ticket — both exist in both catalogs (`backend/permissions/shared.ts:219–226`, `frontend/permissions/shared.ts:173–180`).
- `check:permission-keys` gate: 690 backend = 690 frontend keys; 621 unique used keys.

---

### §7 Cache and Revocation Proof (Items 13, 14, 15)

All three **VERIFIED DONE**.

**Item 13** — Cross-instance invalidation:
- `access-version-channel.spec.ts:36`: "carries a bump from one instance to another through the shared store" — two `AccessVersionChannel` instances share one `AccessVersionStore`; a bump on instance A is visible to instance B on next read.
- 9/9 tests pass including resilience to store failure.
- Local in-process maps cleared in `access.service.ts:189–200` via `subscribeVersionBump`.
- Redis entry cleared via `cache.invalidate(CACHE_KEYS.accessVersion(orgId))` (line 187).
- JWT carries no permissions; `GET /me/access` fetches fresh → navigation and affected queries self-update.

**Item 14** — bumpPermissionsVersion in-transaction:
- Confirmed in-transaction calls in: `rbac.service.ts:117,146`, `module-access-flat-members.service.ts:118,227,299`, `module-access-group-crud.service.ts:104,123,146`, `module-access-group-members.service.ts:122,182`, `module-role-permissions.ts:222`, `module-standing-mutations.service.ts:138,208,320`, `user-permission-grants.service.ts:190`, `delegations.service.ts:322,412`, `ownership.service.ts:170`, `ownership-transfer-response.service.ts:401,497`, `org-member-departure.service.ts:146,272`, `org-membership-status.service.ts:253`, `org-profile.service.ts:364`.

**Item 15** — Cache lifetime clamped to nearest expiry:
- `snapshot-validity.spec.ts` 10/10 pass.
- `snapshotValidUntil(now, PERMS_CACHE_TTL_MS, transitions)` where `transitions` = `{ roleAssignmentExpiry, delegationStart, delegationEnd }`.
- Returns `min(now + ceiling, earliestFutureTransition)`.
- `access.service.ts:685`: re-fetches when `cached.validUntil > this.clock.now().getTime()` fails.

---

### §8 Settings Route Ownership (Items 16, 17, 18, 19)

**Item 16** — VERIFIED DONE (audit done, one anomaly reported):
- `/settings/*` correctly contains: personal account (root, universal), billing, organization hierarchy, roles, users, audit-log, webhooks, modules, incoming-transfer, api-tokens, delegations, directory.
- One anomaly: `/settings/directory` renders `PeopleDirectoryPage` gated on `directory:people:view`. The people directory is supposed to be a universal platform-core surface. This route may either be the admin-facing directory management view (legitimate in `/settings/`) or a duplicate of a universal directory route. Reported to S09 (see OUT-OF-OWNERSHIP below).

**Item 17** — VERIFIED DONE:
- `/settings/billing/page.tsx` exists.
- `/settings/billing/ai-credits/page.tsx` exists.
- No `/billing/page.tsx` root (only `/billing/invoices/` = Accounting, correct).
- No `/billing/ai-credits`, no `/settings/subscription`, no `/billing/seats`.

**Item 18** — VERIFIED DONE:
- `universal-routes.ts:123`: `path: "/settings"` with comment "The personal account landing page. Everything beneath /settings is organization administration and stays permissioned."
- `universal-route-matrix.test.ts:154–156` asserts `/settings` is universal and `/settings/roles`, `/settings/billing` are not.
- `/settings/page.tsx` shows Profile/Security/MFA only (no org admin content).

**Item 19** — DONE (as report):
- No duplicate/legacy billing routes found.
- Anomaly: `/settings/directory` — see OUT-OF-OWNERSHIP below.

---

### §9 Tenant Isolation Coverage (Item 20)

**VERIFIED DONE:**
```
Services with a DECLARED test  818 / 818  (100%)
OK — every enumerated tenant-owned service maps to at least one isolation test.
```
All 818 tenant-owned services in the codebase have a declared isolation test. The ~38 services in S01's trees were already covered. Note: this gate is static (naming match); execution proof requires `check:tenant-isolation:run`.

---

## OUT-OF-OWNERSHIP

### 1. Cursor Pagination for Roster (Item 5d)

**Requires S09 to act after S01 implements backend cursor support:**

File to change: `frontend/app/(authenticated)/` — any page importing `useModuleMembers` from `hooks/api/module-access/members.ts`.

**What S09 needs to do:** After S01 converts `hooks/api/module-access/members.ts` to return `nextCursor`, update consuming pages to use cursor-based pagination instead of page/pageSize state. The specific pages depend on which `app/` routes consume the module-access roster hook.

**What S01 will implement (when ready):**
1. `backend/src/modules/module-access/dto/module-access.schemas.ts`: Add optional `cursor` field to `listMembersQuerySchema`; keep `page`/`pageSize` for backward compat during transition.
2. `backend/src/modules/module-access/module-access-roster.service.ts`: Implement cursor-based `fetchMembers` using `membershipId > cursorMembershipId` filter with `ORDER BY membershipId ASC`.
3. `frontend/hooks/api/module-access/members.ts`: Switch `useModuleMembers` to use `useInfiniteQuery` with cursor.
4. `frontend/hooks/api/module-access/types.ts`: Add `nextCursor: string | null` to paginated result type.

### 2. `/settings/directory` Route Audit (Item 16/19)

**File:** `frontend/app/(authenticated)/settings/directory/page.tsx` (S09 ownership)

The route renders `PeopleDirectoryPage` with `requirePermission("directory:people:view")`. The people directory is described as a platform-core universal surface. If `directory:people:view` is NOT a default member permission (i.e., requires an explicit grant), then ordinary members cannot access the people directory through `/settings/directory`.

**S09 should verify:** Is there a universal route for the people directory (e.g., `/directory/people`) that doesn't require a permission? If so, `/settings/directory` should be the admin-facing management surface (with a more specific permission like `directory:people:manage`), and the universal read-only view should be at its own route.

---

## NEW FINDINGS

### 1. Trailing-wildcard ILIKE in listCandidates (Not a leading-wildcard issue)

The ticket item says "Replace leading-wildcard roster search." Actual code: `const searchPattern = \`${search}%\`;` — this is a TRAILING wildcard (prefix search), not a leading wildcard. The CLAUDE.md rule says "never leading-wildcard ILIKE." The current search IS prefix, not leading-wildcard. However, `ilike` is case-insensitive and cannot use a standard btree index. Since `users` is a global table (no RLS), the RLS concern doesn't apply here. The search is bounded by org membership join (small set). This is acceptable as a "documented bounded alternative."

### 2. scan:legacy-actors:check now at 553/555

At the start of this session, the ticket NOTE said "555/555, 0 migrated." Current gate shows 553/555 (2 migrated since baseline). This means 2 columns were contracted in a prior session (L44). The contraction plan should acknowledge this progress.

### 3. `check:tenant-isolation-coverage` is static (naming match only)

The gate reports 818/818 but explicitly notes: "this gate is static. It matches a spec file that names the service." Execution proof requires `pnpm check:tenant-isolation:run`. Item 20 is VERIFIED DONE by the static gate; the execution gate was not run in this session.

---

## Validation Run

Gates run in this session:

| Gate | Result |
|---|---|
| `scan:legacy-actors:check` | 553/555 remaining (ratchet OK) |
| `check:permission-keys` | PASS — 690 = 690; 621 unique |
| `check:owner-authority` | PASS — 12 shortcuts, all legitimate |
| `check:tenant-isolation-coverage` | PASS — 818/818 |
| `jest membership-artifacts.spec.ts` | 11/11 PASS |
| `jest membership-revocation.spec.ts` | 36/36 PASS |
| `jest access-version-channel.spec.ts` | 9/9 PASS |
| `jest access-invalidate.spec.ts` | 4/4 PASS |
| `jest snapshot-validity.spec.ts` | 10/10 PASS |
| `jest access-cache-scope + access-snapshot-resolver + access.service.spec` | 113/113 PASS |

Gates NOT run (per session protocol — once at the end only):
- `pnpm typecheck` (backend)
- `pnpm type-check` (frontend)
- `pnpm check:route-classification`
- Full build gates

---

## Decisions

1. **Items 1–6 (actor contraction) — left OPEN.** The plan exists and is correct, but execution requires dedicated migration lanes for each module. Attempting expansion+backfill+contraction for 10+ modules in a single session is a correctness risk. **Cost if wrong:** Premature column drop breaks live queries.

2. **Item 5d (cursor pagination) — left OPEN.** The backend change alone would break the frontend. S09 must update app pages in the same change. Rather than deliver a broken intermediate state, the right approach is to implement backend + frontend hook in one coordinated change with S09 simultaneously updating the app pages.

3. **Item 8 classification (AUTHORITY/ATTRIBUTION) — classified as VERIFIED DONE.** The spec enforces the classification implicitly (ATTRIBUTION regex excludes, MEMBERSHIP_ARTIFACTS contains authority only). Adding an explicit `classification: "AUTHORITY" | "ATTRIBUTION"` field would be redundant with the existing spec structure and could create drift if not kept in sync.
