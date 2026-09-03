# 36: Production release authority

**What to build:** The deployed release records its code, environment, evidence, approvals, residual risks, and absence of unresolved production P0/P1 findings.

**Blocked by:** 32–35 — all deployed evidence and approval tickets

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C190** — Immediate code-level gate remains green at the deployed commit.
- [ ] **PRD-C191** — Every deferred checkbox is complete with current evidence.
- [ ] **PRD-C192** — Production evidence proves isolation, recovery, SLO/headroom, unit cost, live alerts and acknowledgement.
- [ ] **PRD-C193** — Required Product, Security, Privacy/DPO, Operations, Legal and Finance approvals are recorded.
- [ ] **PRD-C194** — No unresolved production/compliance P0/P1 finding remains.
- [ ] **PRD-C195** — Release authority records commit, environment, evidence, accepted residual risks and date.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.

