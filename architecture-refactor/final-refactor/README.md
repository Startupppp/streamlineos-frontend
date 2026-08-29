# Final refactor execution program

This program implements `../PRD-IN-SCOPE.md` through 45 Luna-sized tickets. CRM and Inventory are excluded. Existing c28 issue 34 is reused for active-organization landing instead of duplicated.

## Launch

Sessions S1-S6 may be opened in parallel. Every session must complete the opening-question checkpoint before editing. S7 is the integration/scale session: open it in parallel for grounding and questions, but it may implement only when its blockers are closed.

| Session | Territory | Tickets | Launch prompt |
|---|---|---|---|
| S1 | Organization, RBAC, Home foundation | 01, 02, 03, 05, 06, 12 | `Read architecture-refactor/final-refactor/sessions/SESSION-1.md and execute it.` |
| S2 | HRMS, Payroll, Expenses, Timesheets, Build | 07, 08, 17, 18, 21, 25 | `Read architecture-refactor/final-refactor/sessions/SESSION-2.md and execute it.` |
| S3 | Chat, Calendar, Mail, Notifications, Knowledge | 09, 13-16, 24, 30-32 | `Read architecture-refactor/final-refactor/sessions/SESSION-3.md and execute it.` |
| S4 | Billing, Payments, Accounting, Finance | 04, 10, 19, 20, 23, 33, 38 | `Read architecture-refactor/final-refactor/sessions/SESSION-4.md and execute it.` |
| S5 | Frontend platform and contracts | 26-29, 34-36 | `Read architecture-refactor/final-refactor/sessions/SESSION-5.md and execute it.` |
| S6 | Async, security, observability and cleanup | 22, 37, 39-41 | `Read architecture-refactor/final-refactor/sessions/SESSION-6.md and execute it.` |
| S7 | Contract, migrations, cells and scale | 11, 42-45 plus existing c28-34 | `Read architecture-refactor/final-refactor/sessions/SESSION-7.md and execute it.` |

## Dependency frontier

- Immediate independent work: 01-03, 12, 17-19, 22-23, 26, 35-36.
- Foundation frontier: 05 follows 03; 06 follows 05.
- Actor frontier: 07-10 and 13-16 follow 06.
- Route frontier: 27 follows 03; 28 follows 27; 29 follows 02 and 27.
- Reliability frontier: 20 follows 19; 24 follows 13; 25 follows 18.
- Contract frontier: 11 follows 07-10; 42 follows 11 and 13-16.
- Cell frontier: existing c28-34 and 43 follow the relevant foundation/migration work; 44 follows 43; 45 is the final evidence ticket.

## Status

| Session | Tickets | Status |
|---:|---|---|
| S1 | 01, 02, 03, 05, 06, 12 | **closed** — 01, 02, 03, 05, 06 done · 12 done except its read-budget criterion (all four tables and their parents are empty in the dev DB; unblock condition named in the ticket). 1031 unit tests green, typecheck 0, madge 0, tenant-index/owner-authority/rbac-integrity checks passing. Residuals belonging to other sessions are in CROSS-SESSION.md |
| S2 | 07, 08, 17, 18, 21, 25 | done (all six) |
| S3 | 09, 13-16, 24, 30-32 | ready-for-agent |
| S4 | 04, 10, 19, 20, 23, 33, 38 | ready-for-agent |
| S5 | 26-29, 34-36 | all seven done (26, 27, 28, 29, 34, 35, 36) |
| S6 | 22, 37, 39-41 | 22, 40, 41 done · 39 partial (isolation coverage 27%, operator access product-blocked) · 37 blocked on 30-33 |
| S7 | 11, 42-45 and existing c28-34 | **partial** · c28-34 **done** (6/7, contract half deliberately open). 42 enforcement half done and biting, repair half open (124 chain gaps; cold bootstrap stops at S3's `0628`). 43 code + config gaps closed, instance isolation operator-blocked. 44 drilled and **failed** (RPO 791 min vs 5; RTO unmeasurable). 45 now 13/14 objectives driven, up from 7. 11 blocked on 07/08/09 — ratchet **555**, true catalog burden **~655** (100 FKs sit on raw-SQL tables the ratchet cannot see) |

Read `sessions/PROTOCOL.md` before any session brief. Use `sessions/CROSS-SESSION.md` for requests outside a session's territory.
