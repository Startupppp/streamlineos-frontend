# 03: Enforce sensitive reads and rapid revocation

**What to build:** An access change promptly stops sensitive reads, exports and cached reuse for affected actors across every supported surface.

**Blocked by:** 01 Publish the executable baseline

**Status:** ready-for-agent

**Program:** AP-02

**Requirements:** FR-ARCH-004, FR-ARCH-005

**Source of truth:** [Architecture PRD](../16-architecture-hardening-prd.md), [execution guide](../17-claude-architecture-execution.md), and [AC ledger](../architecture-review/execution-ledger.json).

## Acceptance criteria

- [ ] **AC-ARCH-004-01:** Resolve and spend tenant plus supported data scope through ScopedRead in the five reported raw-DataScope sites; backend scope gate passes without expanding its escape allowlist to hide these sites.
- [ ] **AC-ARCH-004-02:** Remove default-unrestricted authority from sensitive owner reads. Define own/team/all/none only where the permission catalog supports them; team never becomes unrestricted through a generic boolean helper.
- [ ] **AC-ARCH-004-03:** Profile, background verification, template, form, export, search, notification and AI projections apply the same sensitive reach and redaction decision. Denial does not masquerade as an empty-success read.
- [ ] **AC-ARCH-004-04:** Preserve ADR-0004 request-local auth facts, ADR-0005 ScopedRead composition and ADR-0006 DI wiring. Test archived/deleted subjects, accountless workers and cross-tenant record IDs.
- [ ] **AC-ARCH-005-01:** Server reauthorizes every protected request/command, including after a permission change while a dialog or tab is open. Cached client permission is advisory.
- [ ] **AC-ARCH-005-02:** Meet the existing PRD 06a new-request revocation target of at most 60 seconds or stricter governing policy; measure it. Do not replace it with the frontend access query's five-minute staleTime.
- [ ] **AC-ARCH-005-03:** On observed revocation, organization/user change, logout or employment termination, protected browser rows, exports and derived views disappear or resolve to denial. Late responses cannot repopulate a prior actor's cache.
- [ ] **AC-ARCH-005-04:** Test owner without employee membership, delegated/adviser access expiry, stale approval, open file link and cross-tab invalidation. Preserve the existing org/user client remount and logout/switch clear paths.

## Completion evidence

Record the exact changed or retired source, applicable tests and their exits, fixed revisions, required evidence levels, remaining blockers, and the updated AC ledger entries. Mark this ticket completed only when every checkbox is checked and all its assigned AC rows are PASS or validly WAIVED; ticket 01 instead requires its AP-00 readiness artifact.

