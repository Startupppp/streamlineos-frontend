# 04 — Post-commit work carries tenant context

**What to build:** Work registered to run after a commit can write to the database. Today those hooks drain after the tenant wrapper returns, so the injected handle reaches the pool with no tenant context and fails with a permission error — this has already broken notification delivery for every organisation while the endpoint returned success.

**Blocked by:** None — can start immediately

**Status:** in-progress — the core fix (hooks now open a real tenant transaction) is verified and shipped; the streaming-commit-timing criterion is a separate, unfixed defect in a different module

## Acceptance criteria

- [x] A post-commit hook performing a write succeeds rather than failing with a tenant permission error. — `backend/src/common/tenant/tenant-context.interceptor.ts:79-84`: each `afterCommit` hook now runs inside `runInNewTenantTransaction(this.db, resolved.orgId, () => hook())`, which opens a fresh `withTenant` transaction with the GUC set (`run-in-tenant-transaction.ts:38-47`) — previously the hook received the dead post-transaction `this.db` handle directly.
- [ ] A streaming response does not commit its transaction while work is still outstanding. — **not fixed.** This lane's territory was `common/tenant/**`, `common/security/**`, `modules/storage/**`; the streaming/AI-tool-call commit-timing issue (`pipeTextStreamToResponse` or equivalent) lives in `modules/ai/` or `modules/chat/`, outside it. This remains open and needs a dedicated follow-up in that module.
- [x] A hook that fails is reported, not discarded. — `tenant-context.interceptor.ts:86-92`: `.catch()` on each hook logs via `this.logger.error` and calls `reportError(error, { orgId, phase: "after-commit" })`.
- [x] The regression is covered by a test that would have caught the original incident. — `backend/src/common/tenant/__tests__/tenant-context.interceptor.spec.ts`, new "after-commit hooks" describe block: asserts a hook runs inside `runInNewTenantTransaction` with the correct `orgId`, that a throwing hook doesn't fail the request, and that multiple hooks each get their own transaction. A true end-to-end assertion (a hook write actually succeeding against a live RLS-protected table) needs a real database and is out of reach for a unit test — noted as an e2e gap, not silently skipped.

**Note on double-nesting:** hooks that already call `runInNewTenantTransaction` themselves (e.g. `approvals.service.ts`) now open two independent transactions — an idle outer one from the interceptor and the hook's own inner one doing the real work. Wasteful, not broken (`runOutsideTenantContext` cleanly escapes the outer context before the inner one opens). Not fixed in this batch; a cleanup candidate.

**Verification note (orchestrator, 2026-08-26):** the core mechanism verified directly against source and matches the ticket's production-incident description exactly. The streaming-commit gap is real and correctly disclosed as out of this lane's territory rather than silently dropped.

## Todo

- [ ] Route hooks through the mechanism that opens its own tenant context
- [ ] Check the streaming handler's commit point against its stream lifetime
- [ ] Verify by running the app and watching a real delivery
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c15 — Outbound I/O leaves the request transaction`](../prd.md) · Candidate index: [`../README.md`](../README.md)
