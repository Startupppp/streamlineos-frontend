# 17: Unify employee SSR and infinite-query hydration

**What to build:** Default and filtered employee pages load once with matching server and client query identity, including cursor and navigation recovery.

**Blocked by:** 16 Correct backend and frontend cache identity

**Status:** ready-for-agent

**Program:** AP-09

**Requirements:** FR-ARCH-026

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-026-01:** Server prefetch and rendered infinite read share the same key, normalized filters, page envelope and initialPageParam through one query-options interface.
- [ ] **AC-ARCH-026-02:** Keep server permission and internal prefetch gates before protected reads. A denied initial page never preloads protected collection data.
- [ ] **AC-ARCH-026-03:** Authorized default and filtered initial loads have one necessary employee-list request, proven with browser/network or an equivalent instrumented runtime test; source key equality alone does not prove request count. Pass normalized URL searchParams into server prefetch, and reserve the employee route, shared query options and instrumented request-count test together.
- [ ] **AC-ARCH-026-04:** Cover empty, next cursor, cancelled navigation, org switch and filter changes without stale first-page reuse or duplicate records.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

