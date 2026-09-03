# 31: One-commit code-release verification

**What to build:** All immediate code criteria pass together at one recorded frontend/backend commit pair with reproducible evidence and no unresolved P0/P1.

**Blocked by:** 02–30 — all immediate implementation tickets

**Status:** ready-for-agent

**Source:** `architecture-refactor/PRD-10-10-CODE-RELEASE-TODO.md`

## Acceptance criteria

- [ ] **PRD-C014** — **Current P0/P1 audit:** resolve or formally disposition Payroll financial-integrity gaps in v2 ticket 08, notification/email permission and delivery gaps in v2 ticket 15, security findings in v2 ticket 22, and every surviving P0/P1 before v2 ticket 31.
- [ ] **PRD-C016** — **Final integration:** complete v2 ticket 31 at one clean frontend/backend commit pair, then v2 ticket 36's deployed release-authority record; interrupted, skipped and prerequisite-blocked gates never count as passing.
- [ ] **PRD-C018** — Run disposable-database E2E for Organization/RBAC, Home, Settings, HRMS, Payroll, Build, Billing, Payments, Accounting, Chat, Calendar, Notifications, Knowledge, Workflows and Inbox/mail.
- [ ] **PRD-C019** — Record each command, release SHA, database identity, dataset shape, pass/fail/skip counts and failure artifacts.
- [ ] **PRD-C020** — At the same commit run backend build/typecheck, spec typecheck, frontend typecheck, OpenAPI freshness, cycle, file-size, dead-code, tenant-isolation, RLS, permission, cache, outbox, idempotency, migration, vulnerability, license and SBOM gates.
- [ ] **PRD-C021** — Resolve every code-level P0/P1 finding and assign owner/deadline to accepted lower-severity residual risks.
- [ ] **PRD-C156** — Every unchecked item under **Immediate code-level release candidate** is complete with fresh evidence.
- [ ] **PRD-C157** — CRM/Inventory remain excluded and public landing visuals/animations remain unchanged.
- [ ] **PRD-C158** — Backend/frontend builds, typechecks, focused tests, disposable E2E and architecture gates pass at one commit.
- [ ] **PRD-C159** — Two empty bootstraps and an interrupted-then-resumed bootstrap produce the same expected database catalog from the new authorized baseline; no legacy watermark upgrade claim is required.
- [ ] **PRD-C160** — No unresolved code-level P0/P1 finding remains.
- [ ] **PRD-C161** — Release authority records commit, evidence, accepted code-level residual risks and date.

## Completion evidence

- Record applicable frontend/root and backend commit SHAs, commands, pass/fail/skip counts, and artifact locations.
- Update the source PRD checkbox states and the traceability manifest in the same completion commit.
