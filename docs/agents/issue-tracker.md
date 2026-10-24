# Issue tracker: local Markdown

Issues for this repository are local Markdown files. The HRMS and Payroll architecture program lives at `docs/specs/hrms-payroll-reform/tickets/`, as requested for this program. Other local efforts may use `.scratch/<feature>/issues/` unless their owner specifies another path. Do not publish these tickets to GitHub.

## Ticket convention

- One file per ticket, named `<NN>-<slug>.md` in dependency order. The architecture program's tickets link to PRD 16, its Claude execution guide, and the single AC execution ledger.
- `**Blocked by:**` lists ticket numbers and titles. A ticket enters the frontier when all listed tickets have completed their own checkboxes and evidence.
- `**Status:** ready-for-agent` is the starting triage state. During work use `in-progress`; use `completed` only after every checklist item is checked and its governing ledger evidence passes. Record a temporary external blocker in the ticket and ledger without marking it completed.
- Comments and decisions may be appended under `## Comments` without replacing the original acceptance criteria.
- A ticket checkbox is a human-readable mirror. The exact FR-ARCH/AC-ARCH wording and evidence requirements remain in PRD 16 and `architecture-review/execution-ledger.json`; the ticket's completion must agree with them.

## When a skill says publish or fetch a ticket

Write or read one Markdown file in the specified program directory. For this architecture program, use `docs/specs/hrms-payroll-reform/tickets/`. Work the first open, unblocked ticket; continue with other frontier tickets when one is waiting on external evidence.

## Wayfinding

If used for another effort, keep the local map and its numbered child tickets together in that effort's chosen directory. A claimed child is marked `in-progress`; a resolved child is marked `completed` with the decision and evidence in its file.
