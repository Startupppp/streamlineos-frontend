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

  **2026-09-28 NOT EARNED, and option (A) is mis-specified. Measured, not inherited.** This repository already has an ADR practice, and it is not where (A) proposes to write:

  | Fact | Evidence |
  |---|---|
  | ADR home is `docs/docs/adr/`, not `docs/adr/` | `ls docs/adr` → no such directory; `ls docs/docs/adr/` → three files |
  | Existing ADRs | `0004-auth-facts-resolve-once-per-request.md`, `0005-a-datascope-is-spent-not-read.md`, `0006-auth-facts-reach-guards-through-di-tokens.md`, plus one unnumbered `docs/docs/adr-legacy-invoices-vs-ar.md` |
  | Next free number | **0007** — the series starts at 0004 |

  So (A) as written would create a second ADR home and reuse `0001`/`0002`, which are below a live series. If the owner picks (A), the files are `docs/docs/adr/0007-…` and `0008-…`.

  **THE MEASURABLE HALF OF THE CRITERION HOLDS.** The criterion's "only when" direction — no ADR exists for a decision with no rejected alternative — is checkable, and all four ADRs name the rejected alternative. Three do it in the title: "…, **not** module imports" (0006), "spent through `ScopedRead`, **never** read as a value" (0005), "resolve **once** per request" (0004). The fourth does it in a section heading: `docs/docs/adr-legacy-invoices-vs-ar.md:142` — "Decision, and why not the alternatives". Neither Build contraction has an ADR, which is consistent with recommendation B.

  **THE OTHER HALF CANNOT BE EARNED BY STATIC ANALYSIS, and this lane will not manufacture it.** Whether a given trade-off is "hard-to-reverse and surprising" is a judgement; nothing in the tree marks a decision as one. One candidate is named so the owner is not choosing blind: the saved-view `layoutType` decision recorded in `99-kill-list.md` — the URL value was renamed to `timeline` while the stored PostgreSQL enum keeps `gantt`, and the alternative (migrate the enum) was rejected in favour of a mapping layer. Stored rows make that hard to reverse and the vocabulary split is surprising. It has no ADR. Whether it needs one is the owner's call, not a measurement.

  **SETTLES WHEN** the owner answers (A) or (B) in one line. Nothing further in this repository can move the box; this lane added the path/numbering correction and the corpus check so the answer costs one sentence rather than an investigation.
- [ ] No implementation proceeds by silently choosing an answer that changes permissions, tenancy, billing, retention, or external visibility. **2026-09-27 OWNER-DECISION:** This box cannot be earned by static analysis; it is a process gate. Q: Should this constraint be enforced by a process rule (PR template checkbox) or by a gate? Options: (A) PR template — add a checkbox "No open question in `99-open-questions.md` was silently resolved by this PR" to `.github/PULL_REQUEST_TEMPLATE.md`. (B) Current state — rely on reviewer awareness and this document's presence in the repo. Recommended: A — a PR template checkbox makes the obligation visible at the moment of review; it costs one checkbox and catches the failure mode this box exists to prevent. Settling evidence: questions 1, 2, 5, 9, 10, 12, 13 all touch permissions, tenancy, or retention; any PR implementing behavior for these without removing the question from this file is a silent violation.

  **2026-09-28 NOT EARNED, and not merely unearnable — currently FALSE. One instance found and measured.**

  First, the honest half: as a constraint on *future* work this box cannot be earned by static analysis at all. Nothing in a source tree records what a change declined to ask. Option (A) is also confirmed unbuilt: there is no PR template. `.github/` contains only `hooks/`, `skills/` and `workflows/`, and a search of the tree for `PULL_REQUEST_TEMPLATE*` returns nothing.

  Second, the half that *is* measurable — whether the constraint holds right now — and it does not.

  **QUESTION 10 HAS BEEN ANSWERED IN SHIPPED CODE WHILE IT REMAINS OPEN ON THIS PAGE.** Question 10 asks what retention and legal-hold requirements apply to comments, files, incidents, approvals and client evidence. A retention contract has shipped that chooses answers to it:

  | Choice made in code | Where |
  |---|---|
  | Retention periods are a closed set: 30, 60, 90, 180, 365 days, or null | `backend/src/modules/build/core/dto/project-retention-settings.schemas.ts:3` |
  | Exactly three retention axes exist: closed tickets, attachments, audit log | same file, `:22-24`, and `backend/src/db/schema/build/core.ts:262-264` |
  | Legal hold is a per-project boolean with a free-text reason and a set-at stamp | `core.ts:265-267`; `setLegalHoldSchema` in the DTO |
  | Policy can inherit from the organization | `inheritOrgPolicy` in the same schema |

  Of the five subjects question 10 names, only **files** has an axis (`attachmentRetentionDays`). Comments, incidents, approvals and client evidence have none — and that is a decision about retention scope, taken without the question being answered or removed.

  **AND THE ANSWER IS INERT, which is how it escaped notice.** `grep -rn "closedTicketRetentionDays\|attachmentRetentionDays\|auditLogRetentionDays" backend/src` returns hits only in the schema, the DTO and `projects-retention-settings.service.ts` — the settings reader/writer itself. The only Build retention job, `backend/src/modules/cron/cron-build-retention.service.ts` (50 lines), prunes `webhookDeliveries` on a hard-coded 90 days (`:9`) and reads none of the three fields. `legalHold` has no reader outside that same settings service. So the contract, the UI and the database column all exist, and no row is ever deleted or held. The user-facing half of this is recorded as a product-copy defect in `99-kill-list.md`; the governance half belongs here.

  **WHY THIS IS THE FAILURE MODE THE BOX EXISTS TO CATCH.** A reviewer looking at the retention PR would have seen a settings page with tests, not a ruling on question 10. The question stayed on this page, so nobody was asked. That is exactly "proceeding by silently choosing an answer that changes … retention".

  **SETTLES WHEN BOTH HALVES LAND:** (1) the owner answers question 10 — or the shipped contract is narrowed to what the answer supports — and the question is removed from the numbered list per the first acceptance criterion; and (2) option (A)'s checkbox exists, so the next instance is caught at review rather than by an audit. The retention finding is a source-code matter and is routed to the orchestrator, not fixed here.
- [x] The authorization question is answered by events: the owner authorized each phase explicitly, each ran behind a manual cluster snapshot, and the contraction is complete.
- [x] The question "can one Managed Product span multiple PM Workspaces?" is removed as **void, not answered**: PM Workspace is removed from Build entirely, so the question no longer has a subject.
- [x] The phase-05 rename question is answered and removed: `1baada9ca` split the two `RENAME` statements into `a-sprint-cycle-06-rename-scope-events.sql`, which then ran in lockstep with the code rename.
- [x] OQ11 answered and removed (2026-09-27): all four claims in OQ11 were false at the time the question was written. `frontend/lib/build/nav/build-project-catalog.ts:75` reads `"build:cycles:view"` (not `build:sprints:view`; the cited line 80 was wrong). `backend/src/modules/build/entity/build-entity-reads.service.ts:38` reads `cycle: "build:cycles:view"`. `CyclesController` in `iterations.controller.ts` declares `@RequirePermission("build:cycles:view")` (lines 156, 215) and `"build:cycles:manage"` (lines 169, 182, 195). Migration `1197_build_cycle_permissions.sql` renamed `build:sprints:view/manage` → `build:cycles:view/manage` and rewrote all existing grants across four tables before the question was recorded. The migration conflicts with BE-111 and cannot replay on an empty database; see `MIGRATION-RUNBOOK.md`. **Residual frontend sprint vocabulary (2026-09-27):** both `cycle` and `sprint` names coexist in the frontend client layer. `frontend/hooks/api/build/reports.ts:58` declares `export interface VelocitySprint` and `:70` types its response as `data: VelocitySprint[]`; `docs/build-module/performance-followup/cache-policy.md` records `useBurnupReport` still uses `sprintId?` as a parameter name (recommended rename to `cycleId?`). The backend is fully cut over; the frontend vocabulary migration is deferred and documented in `performance-followup/cache-policy.md`.
