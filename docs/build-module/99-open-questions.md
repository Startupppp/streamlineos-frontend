# Build Open Questions

Only unresolved questions belong here. Defaults are not implementation authorization.

Reconciled 2026-09-22. Answered questions are removed, not annotated — their answers live in the
canonical document for the decision.

## Product and model

1. Which production project is the long-term audit fixture? Project `6` identifies itself as “Build QA Sandbox,” while project `1` contains representative work.
2. Should organization members automatically gain Build membership, or must Build access always be explicitly granted?
3. Can one Managed Product span multiple PM Workspaces? Current route hierarchy suggests no; cross-workspace product strategy may require a different model.
4. Are Portfolios and Programs intentionally distinct? If both only group projects, one should be removed; retain both only if Program owns delivery governance while Portfolio owns investment governance.
5. Is project Wiki a projection of organization Knowledge pages or a project-owned page type synchronized into Knowledge? Evidence points to Knowledge ownership, but migration semantics need confirmation.
6. Which external client actions are allowed beyond read, comment, and change request?
7. Are freelancer organizations billed/permissioned differently, or are they normal organizations with a simpler default setup?
8. Which currencies and rate sources are required for project budget actuals?
9. Which Git providers are production-supported today? A provider must not appear until signature, receipt, replay, and negative tests exist.

## Governance and data

10. Which data classifications prohibit AI processing, export, offline storage, or external portal publication?
11. What retention and legal-hold requirements apply to comments, files, incidents, approvals, and client evidence?

## Raised by the 2026-09-22 reconciliation

12. **Where does `/build/[projectId]/intake` go?** The route manifest records CONSOLIDATE into `/build/[projectId]/forms`. [`99-kill-list.md`](./99-kill-list.md) describes the replacement as a Forms-definitions / Triage-submissions **split**, which is a different target and implies submissions land on `/triage`. One of the two must be corrected before the consolidation is executed, because the two produce different deep links.
13. **Is `build:sprints:view` a permanent key, or a rename pending?** This is now the *last* place the word "sprint" survives in the product vocabulary, and the contraction made it sharper rather than settling it: the table, the column, the routes and the API contract are all gone, yet the Cycles nav entry is still gated on `build:sprints:view` (`frontend/lib/build/nav/build-project-catalog.ts:80`) and the **cycle** entity card resolves through the same key (`backend/src/modules/build/entity/build-entity-reads.service.ts:38`). No `build:cycles:*` key exists. Renaming it is a breaking change for every grant already issued; keeping it is a permanent vocabulary mismatch in the one surface a user can actually see in a role editor.

14. **Is a non-production PostgreSQL going to exist?** `.env` and `.env.production` resolve to the same production RDS host. Until that changes, no `*.db.spec.ts` or `*.e2e-spec.ts` can run, and `check:tenant-relationships` cannot report at all. The choice is to provision one, or to accept permanently unmeasurable database gates and say so explicitly.
15. **What is the affected-work relationship on a Change Request?** A change request may affect specific tickets, a milestone, a release, or a free-text scope statement. The column does not exist yet, so the cardinality and the tenancy key are both unchosen — and the choice determines the composite foreign key.

16. **Was `build.bugs` meant to be empty?** It holds 0 rows in production, as does `bug_work_item_map` and `work_item_qa_details`, while 44 tickets already carry `type = 'BUG'`. That makes the QA Bug contraction a no-op and its 14 verification checks vacuous. If the intent was that historical bugs would be migrated into work items, nothing was there to migrate and the expand/backfill phases moved nothing — The table is now **dropped**, so this can no longer be investigated in place — only `build.sprints_archive` and the migration record survive. Worth settling before the consolidation is described anywhere as having migrated data.

## Acceptance criteria

- [ ] Each answered question is removed and captured in the appropriate canonical document.
- [ ] Hard-to-reverse, surprising trade-offs become ADRs only when a real alternative was rejected.
- [ ] No implementation proceeds by silently choosing an answer that changes permissions, tenancy, billing, retention, or external visibility.
- [x] The authorization question is answered by events: the owner authorized each phase explicitly, each ran behind a manual cluster snapshot, and the contraction is complete.
- [x] The phase-05 rename question is answered and removed: `1baada9ca` split the two `RENAME` statements into `a-sprint-cycle-06-rename-scope-events.sql`, which then ran in lockstep with the code rename.
