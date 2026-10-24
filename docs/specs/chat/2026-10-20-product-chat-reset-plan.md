---
name: Product Chat Reset
overview: Close out the Chat product reset — quality gates and GA observation. CHAT-001–023 implementation is done.
todos:
  - id: verify-chat-reset
    content: Run focused tests, nested-backend migration and contract gates, typechecks, lint, performance/accessibility checks, and responsive browser journeys.
    status: pending
  - id: rollout-compatibility
    content: Complete observation windows with telemetry evidence, hold release gates, then mark GA (or record volume waiver / rollback).
    status: pending
isProject: true
---

# StreamlineOS Product Chat Reset — pending closeout

CHAT-001–023 are complete (contract, Meet/Teams huddles, navigation, UI simplify, huddle security, cross-module boundary, tests). This plan keeps only what is still open. Full gate and rollout detail: [00-chat-product-contract.md](00-chat-product-contract.md).

---

## Pending checklist

### CHAT-024 — Quality gates

**What it should do**

1. Backend: focused Jest, typecheck, lint, OpenAPI, migration, contract, tenant, idempotency, Ably gates pass.
2. Frontend: focused Jest, type-check, lint, response-contract, permission, PageState, dead-code, file-size, route-bundle gates pass.
3. Browser journeys at 375 / 768 / 1280 (including offline/reconnect) already passed — keep them green if re-run.

**Done when:** both backend and frontend gate lists above pass and are recorded.

- [ ] **CHAT-024** — Run all nested-backend and frontend quality gates.

---

### CHAT-025 — Rollout and GA

Shipped to every org on 2026-10-21; stages are whole-population observation windows (no cohort flag). Baseline volume was too low for percentage gates until ≥1,000 sends and ≥50 Huddle starts per window.

**What it should do**

1. Hold release gates across internal (3d) → agency/service pilots (7d) → staged (14d) windows.
2. Roll back frontend then backend on leak, message loss/duplication, broken legacy links, provider cleanup backlog > 24h, or material task-completion regression.
3. Mark GA only when every release gate holds for the full staged window.

**Done when:** observation evidence exists and GA is marked (or a recorded waiver/rollback decision).

- [ ] **CHAT-025** — Execute observation windows, verify metrics, then mark GA.
