# Architecture PRD: platform access and shared modules

**Inputs:** September 26 platform (`201335`), September 30 cross-module (`213115`) and RBAC (`230621`) HTML reviews. **Status:** candidate work. ADR 0004, 0005 and 0006 already settle request-local auth facts, scoped reads and DI direction; this PRD does not reopen those choices.

## Required interfaces

Access resolves current actor, membership, module standing, object scope and capability once per request, then rechecks writes and revocation-sensitive reads. Admission owns invitation acceptance and membership lifecycle. Domain modules own facts and writes; shared delivery modules own effects. Financial and identity changes fail closed and leave an auditable receipt.

## To-do register

| ID | Source | Disposition and to-do |
| --- | --- | --- |
| PA-01 | Platform C1 | Inventory all session-death paths; use one revocation/epoch decision. Test password reset, membership suspension, organization suspension and open sessions. |
| PA-02 | Platform C2 | Reproduce client portal reachability on current routes and grants. Align with the Build `ARCH-17-CLIENT-PORTAL-ACCESS` package; retain external client identity rather than internal membership. |
| PA-03 | Platform C3 | Inventory magic-link token writers and redemption contexts. Consolidate mint/redeem rules only after current caller and token-purpose census; test single use, expiry, tenant and replay. |
| PA-04 | Platform C4 | Verify that MFA is enforced at protected entry and step-up paths, not inferred from enrollment. Test unenrolled, enrolled-unverified, verified, revoked and recovery states. |
| PA-05 | Platform C5 | Define one notification-count projection for each audience and read state; compare header, inbox, push and realtime after read/delete/revoke. |
| PA-06 | Platform C6 | Bind current membership identity at session, request, background and Ask OS seams; reject ambiguous or stale membership rather than selecting the first row. Current Ask OS source now binds the authenticated membership; other callers remain to inventory. |
| PA-07 | Platform C7 | Compare enum definitions with generated catalog and wire consumers; make generated parity a gate before deleting hand-maintained aliases. |
| PA-08 | Platform C8 | Trace both money gates to one authoritative ledger and authorization decision. Reproduce the reported leak before changing balances; verify negative permission, idempotency and reconciliation. |
| PA-09 | Platform C9 | For every claimed security declaration, prove the handler or query actually executes it; an unused guard/test predicate is a failed gate. |
| PA-10 | Platform C10 | Conditional: remove redundant code only through a caller census and replacement proof; line-count savings alone are not a PRD outcome. |
| PA-11 | Cross-module 1 | Existing Build `ARCH-03B-TICKET-COMMAND`; attach any newly found Ticket creation bypass to that package. No second command module. |
| PA-12 | Cross-module 2 | Complete admission and batch invitation under one idempotent membership interface; test mixed valid/invalid invites, duplicate email, partial retry and revoked predecessor. |
| PA-13 | Cross-module 3 | Specify client onboarding after invitation as a resumable state machine with grant, published project, acceptance and first usable entry. Reuse `ARCH-17`. |
| PA-14 | Cross-module 4 | Inventory browser request dedupe, cancellation and stale cache behavior; deepen only a shared interface with at least two actual consumers. |
| PA-15 | Cross-module 5 | Inventory outbound provider callers; define timeout, retry, circuit, idempotency and sanitized error semantics in a shared remote-call seam where callers genuinely share them. |
| PA-16 | Cross-module 6 | Compare both credit ledgers, reservations, settlements and refunds before selecting one authority; require backfill and financial parity before retiring either table or writer. |
| PA-17 | Cross-module 7 | Inventory PDF renderers and their layout/permission differences. Extract a rendering kernel only if two real adapters benefit; do not centralize domain-specific document policy. |
| PA-18 | RBAC 1–4 | Reconcile authorization decisions, access mutation, capability vocabulary and actor/resource/action matrix with ADRs and Build `ARCH-01-MODULE-ACCESS`. Test owner/admin/member/custom/client plus tenant, record and revocation negatives through actual routes and background paths. |

## Release evidence

### Execution checklist

- [ ] PA-01 session revocation
- [ ] PA-02 portal reachability
- [ ] PA-03 magic-link lifecycle
- [ ] PA-04 MFA enforcement
- [ ] PA-05 notification counts
- [ ] PA-06 membership identity audit
- [ ] PA-07 enum parity
- [ ] PA-08 money gates
- [ ] PA-09 actual security enforcement
- [ ] PA-11 attach Ticket bypasses to Build package
- [ ] PA-12 membership admission
- [ ] PA-13 client onboarding
- [ ] PA-14 browser request coordination
- [ ] PA-15 outbound provider interface
- [ ] PA-16 credit ledger parity
- [ ] PA-17 PDF renderer census
- [ ] PA-18 RBAC matrix

Every security item needs current source path, failing case, policy owner, tested interface, regression tests and role/tenant/database evidence. Financial items also need reconciliation and rollback. Architecture and tests alone do not establish deployed enforcement.
