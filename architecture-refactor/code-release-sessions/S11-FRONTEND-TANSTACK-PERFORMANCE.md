# S11 — Frontend platform, TanStack and perceived performance

Status: active

Independent scope: frontend shared API client, Query provider/key factories/authorized mutations, authenticated layouts/navigation, shared UI/error boundaries and route/performance budget tooling. Domain components remain owned by their domain session.

Master coverage: sections 8, 10.18 and 12.2 plus frontend-wide parts of sections 2, 3, 6, 7.1 and 11.

## Acceptance criteria

- [ ] Enforce canonical scoped query keys, matching hydration, AbortSignal propagation, safe retries/deduplication, precise invalidation and typed flat/infinite optimistic rollback.
- [ ] Finish the controller-to-hook command catalog with zero unclassified commands; exact backend permissions guard non-universal mutations and self/universal exceptions are explicit.
- [ ] Keep route modules thin and feature-owned, reduce authenticated client routes below the current ceiling, remove all approved deferred capabilities and preserve route/action/navigation permission parity.
- [ ] Close `/inbox` shared-shell source-level bundle excess and authenticated long-task/render issues without raising budgets; fresh production-build bundle and Web-Vitals measurements remain orchestrator-only.
- [ ] Verify loading, refresh, empty, partial/full error, offline, denied and revoked states; keyboard, screen reader, focus, contrast and responsive 375/768/1280 behavior.
- [ ] Preserve public landing-page visuals and animations exactly; only public metadata/SEO correctness may be validated.
- [ ] Run focused frontend unit/component/browser tests and targeted query/route/budget self-tests against an existing environment; record results.
- [ ] Reconcile this session and the master PRD using the README protocol.

## Completion

- [ ] S11 is complete; commit/evidence: _pending_.
