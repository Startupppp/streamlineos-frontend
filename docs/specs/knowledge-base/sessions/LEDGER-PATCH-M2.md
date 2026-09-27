# LEDGER-PATCH-M2 — Authorization scope: private-space/project rule (AV-02)

Lane M2. Three boxes. Backend repo: `D:/projects/personal/Streamlineos/backend`.

Baseline: HEAD at session start. Files owned: `backend/src/modules/kb/core/authorization/**` only.

---

## Critical context: deny-space-access-by-default revert check

The memory note records: `fe3d30809` (feat: implement knowledge authorization service) reverted the deny-space-access-by-default fix from `197a317ab` (fix(kb): deny space access by default, …).

**Verdict: PARTIALLY RESTORED, with a residual gap this session closed.**

`fe3d30809` created `buildIndexedBranch`. Subsequent commits restored the space guard on the org-visibility clause:

```
sql`(${kbPages.visibility} IN ('org', 'public') AND ${kbPages.projectId} IS NULL AND ${spaceGuard})`
```

where `spaceGuard` is `space_id IS NULL` when the actor has no accessible spaces, or `space_id IS NULL OR space_id = ANY([accessible])` when they do. The test suite at line 738–779 of `knowledge-page-scope.spec.ts` documents and verifies this restoration.

However, `fe3d30809` also added a **standalone space membership clause** (and a parallel project membership clause) WITHOUT a visibility restriction:

```typescript
// Before this session's fix:
sql`(${kbPages.spaceId} IS NOT NULL AND ${kbPages.spaceId} = ANY(${intArray(standing.accessibleSpaceIds)}))`
```

This clause allowed any page (including private ones) in an accessible space to enter the visible scope. The org-visibility clause guards only pages where `project_id IS NULL`; pages with `project_id IS NOT NULL` in an accessible space fell through to this unguarded clause. This is the gap the session addresses.

---

## Box A — AV-02 architecture review line 92: apply the private-space/project rule

**Verdict: FIXED (residual gap in standalone container branches)**

**Finding:** `buildIndexedBranch` in `knowledge-page-scope.ts` had two visibility-unguarded clauses:

1. Space membership: `(space_id IS NOT NULL AND space_id = ANY([accessible]))` — matched ALL pages including private
2. Project membership: `(project_id IS NOT NULL AND project_id = ANY([accessible]))` — same issue

The org-visibility clause was correctly guarded (`visibility IN ('org', 'public')`). The standalone clauses were not. Any actor who is a member of space X or project Y could see private pages in those containers owned by other members.

**Fix** in `backend/src/modules/kb/core/authorization/knowledge-page-scope.ts`:

```typescript
// Before:
sql`(${kbPages.spaceId} IS NOT NULL AND ${kbPages.spaceId} = ANY(${intArray(standing.accessibleSpaceIds)}))`
sql`(${kbPages.projectId} IS NOT NULL AND ${kbPages.projectId} = ANY(${intArray(standing.accessibleProjectIds)}))`

// After:
sql`(${kbPages.visibility} IN ('org', 'public') AND ${kbPages.spaceId} IS NOT NULL AND ${kbPages.spaceId} = ANY(${intArray(standing.accessibleSpaceIds)}))`
sql`(${kbPages.visibility} IN ('org', 'public') AND ${kbPages.projectId} IS NOT NULL AND ${kbPages.projectId} = ANY(${intArray(standing.accessibleProjectIds)}))`
```

This preserves the intended behaviour: space/project membership reaches org-visible and public pages in accessible containers (including those with a non-null `project_id`, which the org-visibility clause excludes due to its `project_id IS NULL` requirement). Private pages in accessible containers remain reachable only through the owner/creator/explicit-grant branches.

Existing tests that pass after the fix confirm no legitimate access path was removed:
- "reaches a page through space membership" (line 88) — passes
- "widens to project 42" (line 172) — passes
- "space membership in the standing produces a space_id term in the indexed branch only for view and comment" (property test, line 436) — passes
- Cross-surface equality invariants (line 659) — passes

---

## Box B — REQUIREMENT-LEDGER.md line 550: private page owned by another authorized admin must not appear

**Verdict: FIXED**

**Root cause:** the standalone space membership clause in `buildIndexedBranch` had no visibility restriction (see Box A). A non-admin actor who is a member of space X could see a private page in space X owned by another member purely through that clause, without being the owner/creator or holding an explicit grant.

**Red output before fix:**

```
FAIL src/modules/kb/core/authorization/knowledge-page-scope.spec.ts

  ● AV-02 private-space/project rule … the space membership clause in the indexed view branch carries a visibility restriction so a private page in an accessible space owned by a different member cannot match it

    expect(received).toBeGreaterThanOrEqual(expected)
    Expected: >= 2
    Received:    1

  ● AV-02 private-space/project rule … the project membership clause in the indexed view branch carries a visibility restriction so a private page in an accessible project owned by a different member cannot match it

    Expected: >= 2
    Received:    1

  ● BITE: adding a space to the actor's reach increases the visibility guard count by exactly one…

    Expected: 2
    Received: 1

  ● BITE: adding a project to the actor's reach increases the visibility guard count by exactly one…

    Expected: 2
    Received: 1

Tests: 4 failed, 94 passed, 98 total
```

**Tests added** to `knowledge-page-scope.spec.ts` under describe block `"AV-02 private-space/project rule — container branches must not reach private pages (REQUIREMENT-LEDGER S02 line 550)"`:

1. `"the space membership clause in the indexed view branch carries a visibility restriction…"` — asserts `'org', 'public'` guard count >= 2 (once in org-visibility clause, once in space clause)
2. `"the project membership clause in the indexed view branch carries a visibility restriction…"` — same pattern for project clause
3. `"POSITIVE CONTROL: org-visible pages in accessible spaces are still reachable…"` — asserts `space_id` and param 5 present
4. `"POSITIVE CONTROL: org-visible pages in accessible projects are still reachable…"` — asserts `project_id` and param 9 present
5. `"BITE: adding a space to the actor's reach increases the visibility guard count by exactly one…"` — compares actor-with-no-spaces vs actor-with-space; expects count differs by exactly 1
6. `"BITE: adding a project to the actor's reach increases the visibility guard count by exactly one…"` — same for project

**Jest command:** `cd D:/projects/personal/Streamlineos/backend && npx jest "knowledge-page-scope" --no-coverage --forceExit`

**After fix:**

```
PASS src/modules/kb/core/authorization/knowledge-page-scope.spec.ts
Tests: 98 passed, 98 total
```

**Admin fast-path note:** An actor with `isOrgOwner=true` or `isKbAdmin=true` bypasses `buildIndexedBranch` entirely (the admin fast-path returns `predicate: tenant`). These actors can see all pages including private ones owned by others, by design. The collection service enforces the `owner=me` filter on top of the admin scope (verified by existing tests in `knowledge-collection-owner-scope.spec.ts`, which I do not own). No change to the admin fast-path was needed.

---

## Box C — REQUIREMENT-LEDGER.md line 581: org-visible page created by another user must not appear as shared

**Verdict: CONFIRMED-ALREADY-CORRECT**

`buildSharedWithMeScope` requires an explicit row in `kb_page_grants` (the `grantBranch` EXISTS clause) for a page to satisfy the sharedWithMe predicate. The predicate does NOT reference `kb_pages.visibility`. An org-visible page with no explicit grant for the actor would fail the EXISTS check and would not appear in the sharedWithMe scope.

The specific test written: `"the sharedWithMe predicate does not reference the visibility column so an org-visible page authored by another user cannot satisfy it without an explicit grant"` was **GREEN on first run** (no code change needed).

```
Tests added under "AV-02 private-visibility rule — sharedWithMe scope excludes org-visible pages that have no explicit grant (REQUIREMENT-LEDGER S03 line 581)":
1. main assertion — visibility column absent, grant arm present (GREEN from start)
2. POSITIVE CONTROL — EXISTS + kb_page_grants in predicate
3. BITE — role-only actor (no membershipId) vs membership actor: different membershipId params, proving grant check is real

Tests: 3 added, all GREEN from start.
```

The REQUIREMENT-LEDGER.md item was BLOCKED because the auditor could not run the spec suite — not because the behavior was buggy. The behavior was already correctly enforced through the grant EXISTS requirement in `buildSharedWithMeScope`.

The existing test at `knowledge-page-scope.spec.ts` line 224 ("an org-visible page the actor can merely view with no grant naming them does not satisfy the scope") already covered this requirement. The new tests add explicit coverage from the "created by another user" angle.

---

## Files changed

- `backend/src/modules/kb/core/authorization/knowledge-page-scope.ts` — add `visibility IN ('org', 'public')` guard to both standalone container branches in `buildIndexedBranch` (lines ~116–126)
- `backend/src/modules/kb/core/authorization/knowledge-page-scope.spec.ts` — add 9 new tests in two new describe blocks covering B (4 failing + 2 positive/bite) and C (1 assertion + 2 positive/bite)

No other files modified.

---

## Jest commands run

```
npx jest "knowledge-page-scope" --no-coverage --forceExit
npx jest "src/modules/kb/core/authorization" --no-coverage --forceExit
npx jest "src/modules/kb/core/" --no-coverage --forceExit
```

**Final pass/fail counts:**
- `knowledge-page-scope.spec.ts`: 98 passed, 0 failed
- `src/modules/kb/core/authorization/`: 128 passed, 0 failed (2 suites)
- `src/modules/kb/core/`: 511 passed, 0 failed (29 suites)

---

## Referred-out items

None. All three boxes were closeable within the owned files.

---

## Verdict tally

| Box | Verdict |
|---|---|
| A — AV-02 architecture review line 92 (deny-space-access revert check + container rule) | **FIXED** — residual gap in standalone space/project clauses closed |
| B — REQUIREMENT-LEDGER line 550: private page by another admin must not appear | **FIXED** — space/project container branches now visibility-guarded |
| C — REQUIREMENT-LEDGER line 581: org-visible page must not appear as shared | **CONFIRMED-ALREADY-CORRECT** — sharedWithMe always requires explicit grant; test added |
