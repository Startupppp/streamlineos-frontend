# TESTBITE1 — Test Bite Verification Report

Date: 2026-08-30

## Summary

Two shipped security fixes had correct production code but test doubles that never evaluated the WHERE predicate. Deleting either fix from production would not have failed a single existing test. Both are now guarded by tests that genuinely bite.

---

## Fix A — 403 Existence Oracle (`ai-confirmation.service.ts`)

**Location:** `backend/src/modules/ai/confirmation/ai-confirmation.service.ts` line 162
**Mechanism:** `and(eq(aiActionProposals.id, proposalId), eq(aiActionProposals.orgId, input.actor.orgId))`

**Why the old tests did not bite:**
All three oracle tests in the `ORACLE-1` describe block used test doubles that ignore the WHERE condition entirely. `buildEmptySelectConfirmDb()` always returns `[]` regardless of predicates; the "proof" test used a DB that returns all rows regardless. Removing `eq(aiActionProposals.orgId, input.actor.orgId)` changed nothing observable in any of those doubles.

**New test added to:**
`backend/src/modules/ai/confirmation/ai-confirmation.service.spec.ts`

**Test name:**
`AiConfirmationService — ORACLE-1 existence oracle fix › confirm WHERE predicate includes caller orgId — removing eq(orgId) changes the compiled predicate`

**Mechanism:** A capturing test double intercepts the condition object passed to `.where()`. After the call, `PgDialect.sqlToQuery()` compiles the condition to SQL text + parameter array. The test asserts `sql` matches `/org_id/` and `params` contains `"org-ATTACKER"` (the caller's orgId).

**Proof of bite:**
- Temporarily replaced `.where(and(eq(aiActionProposals.id, proposalId), eq(aiActionProposals.orgId, input.actor.orgId)))` with `.where(eq(aiActionProposals.id, proposalId))` in production.
- Result: **1 failed, 12 passed** — the new test failed; all 12 old tests still passed (confirming they do not bite).
- Restored production code.
- Result: **13 passed, 0 failed**.

**Tests ran:** 13

---

## Fix B — KB Citation ACL (`kb-ask.service.ts`, `resolveVisibleArticles`)

**Location:** `backend/src/modules/kb/retrieval/kb-ask.service.ts` line 239
**Mechanism:** `eq(kbArticles.orgId, user.orgId)` inside the WHERE `and(...)` in `resolveVisibleArticles`

**Why the old tests did not bite:**
`kb-ask.service.spec.ts`'s `mockDb.select` used a chain where `.where()` was a `jest.fn().mockResolvedValue([{ id: articleResult.id }])` — it returned article IDs unconditionally, regardless of what condition was passed. Removing `eq(kbArticles.orgId, user.orgId)` did not change what the mock returned.

**New test added to:**
`backend/src/modules/kb/retrieval/kb-source-citation.spec.ts`

**Test name:**
`KbAskService — source citation re-verification › resolveVisibleArticles WHERE predicate includes caller orgId — removing eq(orgId) changes the compiled predicate`

**Mechanism:** The test double captures condition objects from `.where()` calls. `serializePredicate()` (already in that file) compiles each via `PgDialect.sqlToQuery()` and joins the SQL+params strings. The test asserts the result contains `"org-1"` (the user's orgId) and `"published"`.

**Proof of bite:**
- Temporarily removed `eq(kbArticles.orgId, user.orgId)` from the `and(...)` in `resolveVisibleArticles`.
- Result: **1 failed, 5 passed** — the new test failed; all 5 old tests still passed.
- Restored production code.
- Result: **6 passed, 0 failed**.

**Tests ran:** 6

---

## Additional fixes applied

- `kb-source-citation.spec.ts` `beforeEach`: changed `jest.clearAllMocks()` to `jest.resetAllMocks()` and added `mockSearch.retrieveTopArticles.mockResolvedValue([])` + `mockSearch.retrieveAttachmentSnippets.mockResolvedValue("")` to prevent mock state leakage through `mockResolvedValueOnce` queues.
- `ai-confirmation.service.spec.ts`: added `PgDialect` and `SQL` imports; added `const dialect = new PgDialect()` at module scope.

## Files modified (production code restored to original)

- `backend/src/modules/ai/confirmation/ai-confirmation.service.spec.ts` — new imports + 1 bite test
- `backend/src/modules/kb/retrieval/kb-source-citation.spec.ts` — `resetAllMocks`, beforeEach additions, 1 bite test
