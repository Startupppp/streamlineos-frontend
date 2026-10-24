# Domain docs

This repository uses a single root `CONTEXT.md` glossary. Read it before naming or changing domain concepts. The People and Payroll PRD suite at `docs/specs/hrms-payroll-reform/` provides the detailed domain contracts for this program.

Read accepted ADRs relevant to the change. Existing decisions may be in `docs/docs/adr/` or domain-owned documentation; inspect the repository rather than assuming an empty `docs/adr/` means there are no decisions. Keep the domain glossary and one mutable-fact owner consistent across frontend and backend work.

If an ADR and a proposed ticket conflict, record the conflict and obtain the domain decision before changing the contract. A missing glossary term is a signal to check current usage before adding a new term.
