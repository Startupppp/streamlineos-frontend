# 16: Correct backend and frontend cache identity

**What to build:** After a fact or access change, backend and frontend reads serve the correct actor, tenant, filters and current data.

**Blocked by:** 02 Secure and align People insights; 03 Enforce sensitive reads and rapid revocation; 06 Freeze complete payroll source snapshots

**Status:** ready-for-agent

**Program:** AP-09

**Requirements:** FR-ARCH-024, FR-ARCH-025

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-024-01:** Use existing versioned namespaces; keys include tenant plus actor/scope/permission version when response shape varies by authority, and every filter/period/source variant.
- [ ] **AC-ARCH-024-02:** Publish and test a writer-to-read invalidation matrix for employment, pay, time, claims, policies, projections and insights. A passing key-shape gate does not prove filter correctness or writer completeness.
- [ ] **AC-ARCH-024-03:** Handle cache fill racing a source mutation, invalidation failure, Redis outage and unknown generation without serving another actor's or materially stale protected result.
- [ ] **AC-ARCH-024-04:** Keep database authority and request-local AuthContext distinct from shared cache. No new request-path wildcard scan or cross-tenant shared result.
- [ ] **AC-ARCH-025-01:** Use sanctioned QueryClient factories and org/user-scoped hash. Authenticated key arrays stay tenant-neutral; preserve access-version semantics before removing existing dimensions. Public-tenant exceptions require explicit evidence.
- [ ] **AC-ARCH-025-02:** Entity query options co-locate key, fetch, contract, staleTime and abort handling; every response-shaping filter and entity identity is represented and normalized.
- [ ] **AC-ARCH-025-03:** Reads gate on current permission/module state; test denied/loading distinctions, focus/reconnect, org switch, logout, revoked access and late-response cache isolation.
- [ ] **AC-ARCH-025-04:** Move broad HR/payroll barrel imports to owning entity modules without creating forwarding-only files; query-scope rule violations are resolved within the authorized affected paths, and unrelated failures remain separately recorded.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

