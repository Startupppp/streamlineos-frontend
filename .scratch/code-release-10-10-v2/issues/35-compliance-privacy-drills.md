# 35: Compliance decisions and privacy drills

**What to build:** Operator access, data governance, residency, providers, retention, legal hold, export, correction, and erasure decisions are approved and exercised.

**Blocked by:** 32 — Provider and deployed-security drills; 33 — Cell isolation, replicas and recovery; 34 — Production operations, alerts and cost

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C180** — Approve operator/break-glass roles, reason, two-person/no-self approval, duration, expiry, tenant scope, notification, immutable audit and revocation.
- [ ] **PRD-C181** — Verify deployed sensitive routes reject expired, revoked, cross-tenant, wrong-scope, concurrent-approval and audit-failure cases.
- [ ] **PRD-C182** — Obtain named Product, Security, Privacy/DPO, Operations, Legal and Finance decisions using [RB-10](runbooks/RB-10-privacy-compliance-decisions.md) and [the decision template](decisions/README.md).
- [ ] **PRD-C183** — Complete [DATA-CATALOGUE.md](DATA-CATALOGUE.md) with purpose, lawful basis, subjects, processors, location, retention, owner and deletion behavior.
- [ ] **PRD-C184** — Decide PII policy for audit metadata, residency/transfers, subprocessors, breach handling, payroll/tax jurisdiction and controller/processor duties.
- [ ] **PRD-C185** — Approve AI/integration providers, regions, PII minimization, retention, deletion and disclosure.
- [ ] **PRD-C186** — Run deployed export, correction, portability, erasure, legal-hold, transfer, cross-tenant and repeat-request drills.
- [ ] **PRD-C187** — Prove deployed object/search/vector/cache/downstream deletion plus backup aging and restore-time deletion.
- [ ] **PRD-C188** — Run retention/legal-hold drills and store a redacted, hashed evidence bundle.
- [ ] **PRD-C189** — Close or formally disposition every production/security/privacy/compliance P0/P1 finding.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
