# 04 — Post-commit work carries tenant context

**What to build:** Work registered to run after a commit can write to the database. Today those hooks drain after the tenant wrapper returns, so the injected handle reaches the pool with no tenant context and fails with a permission error — this has already broken notification delivery for every organisation while the endpoint returned success.

**Blocked by:** None — can start immediately

**Status:** done

## Acceptance criteria

- [x] A post-commit hook performing a write succeeds rather than failing with a tenant permission error. — `backend/src/common/tenant/tenant-context.interceptor.ts:79-84`: each `afterCommit` hook now runs inside `runInNewTenantTransaction(this.db, resolved.orgId, () => hook())`, which opens a fresh `withTenant` transaction with the GUC set (`run-in-tenant-transaction.ts:38-47`) — previously the hook received the dead post-transaction `this.db` handle directly.
- [x] A streaming response does not commit its transaction while work is still outstanding. — **found already correct**, not a new fix: `backend/src/modules/ai/core/controllers/chat-assistant.controller.ts:203` (`@NoTenantTransaction()`, pre-existing) opts the streaming chat route out of `withTenant` wrapping entirely, so there is no outer request transaction to prematurely commit in the first place. Each tool call opens its own transaction via `withTenantScopedTools` → `runInNewTenantTransaction` (`tenant-scoped-tools.ts:33`), and the `onFinish` callback (credit settle + chat history append) does the same (`chat-assistant.service.ts:155`). `pipeTextStreamToResponse(res)` is correctly not awaited — with no outer transaction, there's nothing left for an `await` to protect. A new regression test (`chat-assistant.service.spec.ts:177-210`) proves the shape: `processChat` resolves before `onFinish` fires, and `onFinish` opens `runInNewTenantTransaction` with the correct `orgId`.
- [x] A hook that fails is reported, not discarded. — `tenant-context.interceptor.ts:86-92`: `.catch()` on each hook logs via `this.logger.error` and calls `reportError(error, { orgId, phase: "after-commit" })`.
- [x] The regression is covered by a test that would have caught the original incident. — `backend/src/common/tenant/__tests__/tenant-context.interceptor.spec.ts`, "after-commit hooks" describe block, plus the new streaming-isolation test above. A true end-to-end assertion (a hook write actually succeeding against a live RLS-protected table) needs a real database and is out of reach for a unit test — noted as an e2e gap, not silently skipped.

**Note on double-nesting:** hooks that already call `runInNewTenantTransaction` themselves (e.g. `approvals.service.ts`) now open two independent transactions — an idle outer one from the interceptor and the hook's own inner one doing the real work. Wasteful, not broken (`runOutsideTenantContext` cleanly escapes the outer context before the inner one opens). Not fixed in this batch; a cleanup candidate.

**Verification note (orchestrator, 2026-08-26):** the core mechanism verified directly against source and matches the ticket's production-incident description exactly. The streaming criterion was re-verified as a false alarm carried over from the original ticket text — `git status` on `chat-assistant.controller.ts` confirmed the `@NoTenantTransaction()` decorator and its explanatory comment predate this batch entirely (only the spec file changed), so this wasn't a fix, it was closing a gap in what had already been investigated.

## Todo

- [x] Route hooks through the mechanism that opens its own tenant context
- [x] Check the streaming handler's commit point against its stream lifetime
- [ ] Verify by running the app and watching a real delivery — not done; no live environment available in this session
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
