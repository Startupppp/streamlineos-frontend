# Temporary architecture reviews: triage and PRD backlog

**Reviewed:** 2026-10-10. **Scope:** `architecture-review*.html` in the local OS Temp directory. These are historical, source-informed review candidates, not proof that a defect still exists in the current checkout. Reproduce against current code and runtime before changing implementation or closing a task. Existing uncommitted frontend work was not touched.

## Decisions and source disposition

| Temp HTML | Disposition | Reason / durable owner |
| --- | --- | --- |
| `architecture-review-20260926-153104.html` | Keep | Distinct Knowledge Base defect and architecture review; reconcile with `docs/specs/knowledge-base/OPEN-TASKS.md`. |
| `architecture-review-20260926-201335.html` | Keep | Distinct cross-platform security and access candidates. |
| `architecture-review-20260926-213335.html` | Keep | Distinct Build collection and concurrency candidates. |
| `architecture-review-20260926-224038.html` | Keep | Distinct Documents ownership and schema analysis. |
| `architecture-review-20260926-230544.html` | Keep | Distinct Build RLS, write and query findings. |
| `architecture-review-20260930-213115.html` | Keep | Cross-module deep-module candidates. |
| `architecture-review-20260930-230621.html` | Keep | Distinct RBAC architecture review. |
| `architecture-review-20260930-231834.html` | Keep | Distinct Chat architecture review. |
| `architecture-review-20261002-184500.html` | Keep | Dated canonical Build review for the October 2 series. |
| `architecture-review-20261008-225504.html` | Keep | Distinct Companion implementation candidates. |
| `architecture-review-20261008-decision.html` | Keep | Historical selected decision; durable source is `docs/pet/0007-companion-uses-ask-os-toolset.md` and `docs/pet/architecture-review.md`. |
| `architecture-review-20261008-universal-companion.html` | Keep pending comparison | Earlier Companion variant contains a different immediate-write audit recommendation; do not erase until that difference is reconciled. |
| `architecture-review-dom.html`, `architecture-review-dom-fixed.html`, `architecture-review-expanded-dom.html`, `architecture-review-complete-dom.html` | Remove after content comparison | Intermediate rendering variants of the October 2 Build review. Preserve the dated canonical report. |

## Questions that need product or architecture decisions

These are the only questions in this pass that should block a contract choice. The rest are implementation investigations with existing owners and acceptance criteria.

1. **Help Centre authority:** Is Help Centre content a Knowledge Base projection or an independently governed product surface? Decide ownership, publishing and access before deleting either path. Source: September 26 Knowledge Base review, candidate 9.
2. **Documents identity:** Which distinct entities should replace or qualify the overloaded document table, and what migration compatibility period is acceptable? Source: September 26 Documents review, candidates 1–4. Preserve existing user-visible IDs and ACLs during migration.
3. **Client portal reachability:** Which client identity and grant model is canonical across signup, magic links and Build client portal? Confirm against the existing Build portal-grant decisions before changing routes or token writers. Sources: September 26 platform review C2–C3; Build product decisions.
4. **Companion action exposure:** Which existing immediate-write Tools are permitted in the companion after owner-specific preview, confirmation, fresh authorization and receipt? ADR 0007 settles the general rule; only the reviewed capability inventory and rollout order remain. Sources: October 8 Companion variants and `docs/pet/capability-inventory.md`.

## PRD work packages and to-do items

Status is **candidate / unchecked** until a current-code audit confirms it. Existing canonical queues take priority; link a matching existing item instead of adding a duplicate checkbox there.

### AR-01 — Knowledge Base and Documents security, retrieval, ownership

- [ ] Reconcile the September 26 Knowledge Base and Documents findings against `docs/specs/knowledge-base/OPEN-TASKS.md`; attach existing KB-OPEN IDs and create only missing entries. Explicitly check public Ask spend limits, post-create indexing, HR metadata PII gating, trash replica purge, ticket-to-article error handling, ACL cache semantics and security tests that bypass production predicates.
- [ ] Specify and test one page-visibility decision and one retrieval/citation seam used by all readers; include tenant, actor, source status, revision and link-open recheck. Negative acceptance: a denied source cannot enter passages, citations or cache hits.
- [ ] Specify page-change events, indexing recovery, embedding reuse, connection-boundary behavior and indexed ACL predicates. Acceptance: create/update/delete/revoke paths converge, retry safely and expose measurable lag without holding a DB connection over provider waits.
- [ ] Record the Documents entity vocabulary and ownership boundary, then plan compatibility migration for overloaded tables and cross-module direct access. Gate schema deletion on callers, data backfill and migration proof.

### AR-02 — Platform identity, authorization and money invariants

- [ ] Reproduce the September 26 platform C1–C9 findings in the current checkout: session invalidation, portal admission, magic-link token writers, MFA enforcement, notification count, membership ID, enum vocabulary and dual money gates. Record each as confirmed, resolved or superseded with file and runtime evidence.
- [ ] Define one authorization decision interface, starting with Build object and module access; centralize access mutations and generate capability vocabulary. Acceptance: deny cases cover revoked membership, cross-tenant object, stale role and client grant, with a role/scope matrix.
- [ ] For each confirmed money or MFA defect, create a focused security fix PRD with affected API contracts, migration needs, failure behavior and negative tests before implementation.

### AR-03 — Build write integrity and collection contracts

- [ ] Verify RLS policies for the three reported Build tables and every application role. Acceptance: cross-tenant reads/writes fail in database-backed tests, including direct query paths.
- [ ] Audit all ticket writers, creation paths and `tickets.version` changes. Specify one Ticket Command owner with required concurrency token, consistent event version, atomic effects and idempotent receipts. Acceptance: stale writes conflict; no route reports success for a rolled-back transaction.
- [ ] Recheck roadmap cursor ordering, filtered board count keys, custom-status hide-completed wire field, server-side search, assignee source, index use and project-access waterfall. Define bounded query/page contracts and measure representative datasets before marking performance tasks done.
- [ ] Reconcile October 2 Build candidates with `docs/build-module/implementation/18-architecture-work-package-registry.md` and `docs/build-module/architecture/08-deep-module-reconciliation.md`: Module Access, Timesheets owner, Project Provision, Intake/Forms/Triage/Feedbucket, Files, wire contracts, schema identity, collaboration, metrics, activation and settings. Preserve any already settled owner decision; add only missing work and verification gates.

### AR-04 — Chat, Companion and shared infrastructure

- [ ] Audit Chat alert ownership, channel-membership predicates, mutation invalidation, realtime boundary and pass-through modules. Write one contract per confirmed owner gap and test membership revoke, reconnect and duplicate delivery.
- [ ] Use `docs/pet/0007-companion-uses-ask-os-toolset.md` as the Companion decision. Reconcile the October 8 reports with `docs/pet/01-intelligence-actions-prd.md`, `03-implementation-architecture-prd.md` and the capability inventory; track Documents citable context, exact Build BUG counts, reminder identity, lazy panel and immediate-write audit without duplicating their PRD requirements.
- [ ] Reconcile the September 30 cross-module proposals (membership admission, onboarding, browser request coordination, provider calls, credit ledger and PDF rendering) with existing owners. Promote only confirmed gaps into owner-specific PRDs, each with caller inventory, migration path and negative acceptance cases.

## Verification and closure rule

For each checkbox, capture current commit, exact affected paths, existing PRD/task links, failure reproduction, corrected contract, focused tests and relevant browser/database/role evidence. A source review or passing unit test alone does not prove a deployed journey or authorization boundary. Do not remove implementation or mark a candidate complete based solely on these HTML reports.
