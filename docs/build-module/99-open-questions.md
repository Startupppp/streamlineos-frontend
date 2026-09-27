# Build Open Questions

Only unresolved questions belong here. Defaults are not implementation authorization.

Reconciled 2026-09-22. Answered questions are removed, not annotated — their answers live in the
canonical document for the decision.

## Product and model

1. Which production project is the long-term audit fixture? Project `6` identifies itself as “Build QA Sandbox,” while project `1` contains representative work.
2. Should organization members automatically gain Build membership, or must Build access always be explicitly granted?
3. Are Portfolios and Programs intentionally distinct? If both only group projects, one should be removed; retain both only if Program owns delivery governance while Portfolio owns investment governance.
4. Is project Wiki a projection of organization Knowledge pages or a project-owned page type synchronized into Knowledge? Evidence points to Knowledge ownership, but migration semantics need confirmation.
5. Which external client actions are allowed beyond read, comment, and change request?
6. Are freelancer organizations billed/permissioned differently, or are they normal organizations with a simpler default setup?
7. Which currencies and rate sources are required for project budget actuals?
8. Which Git providers are production-supported today? A provider must not appear until signature, receipt, replay, and negative tests exist.

## Governance and data

9. Which data classifications prohibit AI processing, export, offline storage, or external portal publication?
10. What retention and legal-hold requirements apply to comments, files, incidents, approvals, and client evidence?

## Raised by the 2026-09-22 reconciliation

12. **Is a non-production PostgreSQL going to exist?** `.env` and `.env.production` resolve to the same production RDS host. Until that changes, no `*.db.spec.ts` or `*.e2e-spec.ts` can run, and `check:tenant-relationships` cannot report at all. The choice is to provision one, or to accept permanently unmeasurable database gates and say so explicitly.

13. **Was `build.bugs` meant to be empty?** It held 0 rows in production, as did `bug_work_item_map` and `work_item_qa_details`, while tickets already carried `type = 'BUG'`. That made the QA Bug contraction a no-op and its verification checks vacuous. The table is now dropped, so this can only be investigated from backups and migration evidence.

## Acceptance criteria

- [x] Each answered question is removed and captured in the appropriate canonical document. Verified 2026-09-27: questions 11 (OQ11 — Sprint/Cycle rename), the PM-Workspace multi-workspace question, the authorization question, and the phase-05 rename question are absent from the numbered list; their answers are recorded in the ticked boxes below and in the canonical documents referenced. Questions 1–10, 12–13 remain open and unanswered.
- [ ] Hard-to-reverse, surprising trade-offs become ADRs only when a real alternative was rejected. **2026-09-27 OWNER-DECISION:** Q: Do the Sprint/Cycle and QA-Bug contractions need ADR format, or is the migration runbook sufficient? Options: (A) ADR required — create `docs/adr/0001-sprint-to-cycle-rename.md` and `docs/adr/0002-qa-bug-contraction.md` with context/decision/consequences. (B) Runbook suffices — `MIGRATION-RUNBOOK.md` already documents the steps, rationale, and rollback; no alternative was seriously considered, so ADR adds overhead with no insight. Recommended: B — ADRs have value when alternatives were rejected; both contractions were unambiguous schema renames with no competing approach. The runbook records the migration sequence and the canonical docs record the outcome. Settling evidence: if a future engineer questions "why was this renamed?", the canonicals and runbook provide the answer without an ADR.
- [ ] No implementation proceeds by silently choosing an answer that changes permissions, tenancy, billing, retention, or external visibility. **2026-09-27 OWNER-DECISION:** This box cannot be earned by static analysis; it is a process gate. Q: Should this constraint be enforced by a process rule (PR template checkbox) or by a gate? Options: (A) PR template — add a checkbox "No open question in `99-open-questions.md` was silently resolved by this PR" to `.github/PULL_REQUEST_TEMPLATE.md`. (B) Current state — rely on reviewer awareness and this document's presence in the repo. Recommended: A — a PR template checkbox makes the obligation visible at the moment of review; it costs one checkbox and catches the failure mode this box exists to prevent. Settling evidence: questions 1, 2, 5, 9, 10, 12, 13 all touch permissions, tenancy, or retention; any PR implementing behavior for these without removing the question from this file is a silent violation.
- [x] The authorization question is answered by events: the owner authorized each phase explicitly, each ran behind a manual cluster snapshot, and the contraction is complete.
- [x] The question "can one Managed Product span multiple PM Workspaces?" is removed as **void, not answered**: PM Workspace is removed from Build entirely, so the question no longer has a subject.
- [x] The phase-05 rename question is answered and removed: `1baada9ca` split the two `RENAME` statements into `a-sprint-cycle-06-rename-scope-events.sql`, which then ran in lockstep with the code rename.
- [x] OQ11 answered and removed (2026-09-27): all four claims in OQ11 were false at the time the question was written. `frontend/lib/build/nav/build-project-catalog.ts:75` reads `"build:cycles:view"` (not `build:sprints:view`; the cited line 80 was wrong). `backend/src/modules/build/entity/build-entity-reads.service.ts:38` reads `cycle: "build:cycles:view"`. `CyclesController` in `iterations.controller.ts` declares `@RequirePermission("build:cycles:view")` (lines 156, 215) and `"build:cycles:manage"` (lines 169, 182, 195). Migration `1197_build_cycle_permissions.sql` renamed `build:sprints:view/manage` → `build:cycles:view/manage` and rewrote all existing grants across four tables before the question was recorded. The migration conflicts with BE-111 and cannot replay on an empty database; see `MIGRATION-RUNBOOK.md`.
