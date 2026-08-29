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

The current S7 evidence is authoritative: migration reconciliation is 373/373 with zero chain gaps, and ticket 44 is partial pending physical replica and operational RPO evidence. Older historical counts in individual session narratives are superseded by the latest ticket evidence.

| Session | Tickets | Status |
|---:|---|---|
| S1 | 01, 02, 03, 05, 06, 12 | **closed** — 01, 02, 03, 05, 06 done · 12 done except its read-budget criterion (all four tables and their parents are empty in the dev DB; unblock condition named in the ticket). 1031 unit tests green, typecheck 0, madge 0, tenant-index/owner-authority/rbac-integrity checks passing. Residuals belonging to other sessions are in CROSS-SESSION.md |
| S2 | 07, 08, 17, 18, 21, 25 | done (all six) |
| S3 | 09, 13-16, 24, 30-32 | ready-for-agent |
| S4 | 04, 10, 19, 20, 23, 33, 38 | ready-for-agent |
| S5 | 26-29, 34-36 | all seven done (26, 27, 28, 29, 34, 35, 36) |
| S6 | 22, 37, 39-41 | 22, 37, 40, 41 done · 39 has 3 of 4 (operator access is product-blocked, not unfinished) |
| S7 | 11, 42-45 and existing c28-34 | **partial** · c28-34 **done** (6/7; the column drop is the contract half and now has 12/12 read agreement as evidence). 44 **done** (4/4 — recovery drilled end to end, RTO 19.6 min, lag tested on a real DB; operational RPO misses 5 min by 72x and needs PITR). 42 enforcement done and biting (6 checks, self-test 10/10); cold bootstrap reaches head for the first time, chain gaps 132 -> 1, schema differences 144 -> 44 with 5 of 9 classes identical; found that a future-dated watermark row has been silently disabling db:migrate for every session. 45 all 14 objectives driven, up from 7; headroom and unit cost need environment. 43 code and config gaps closed, instance isolation is a purchase. 11 blocked on 09 alone; catalog burden ~655 |

Read `sessions/PROTOCOL.md` before any session brief. Use `sessions/CROSS-SESSION.md` for requests outside a session's territory.

Session 7 ticket 42 migration-chain evidence: 372 SQL files and 372 journal entries reconcile with zero
unjournalled, orphaned or timestamp-regressed entries; the upgrade path reaches `372/372` with `chain_gaps=0`;
the migration-chain guard passes and its self-test passes 10/10. Schema comparison remains open for control-plane
lag and an S3-owned RLS policy gap.
