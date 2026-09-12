# StreamlineOS architecture documentation

This directory contains the current architecture contract, the single active release
checklist, durable policies, ADRs, runbooks and verification evidence.

## Start here

Give Claude only [prd/completion-plan.md](prd/completion-plan.md). It contains the unfinished work, standing answers, dependencies and acceptance checks. CRM and Inventory are excluded. Do not read this folder as a queue of tasks.

The other folders are reference: adr/ preserves architecture decisions; decisions/ preserves actual policy/approval records; runbooks/ holds operational procedures; final-refactor/evidence/ contains dated test/drill artifacts, some hash-sealed. Their presence does not mean their old TODO/status text is an extra assignment. Retain unique evidence and seals; remove a redundant document only after its needed requirements and references are preserved.

## Authority order

1. [`PRD-IN-SCOPE.md`](PRD-IN-SCOPE.md) defines the target architecture.
2. [`prd/completion-plan.md`](prd/completion-plan.md) is the sole active delivery backlog and
   contains every remaining task and its owner.
3. [`PRD-10-10-CODE-RELEASE-TODO.md`](PRD-10-10-CODE-RELEASE-TODO.md) is the
   compact `PRD-C001`–`PRD-C195` identifier registry. It contains no task status.
4. ADRs, policies and runbooks define durable operating rules.
5. Source code, migrations, executable gates and fresh environment evidence
   override dated prose.

## Durable references

- [Data catalogue](DATA-CATALOGUE.md)
- [Retention policy](RETENTION-POLICY.md)
- [SLO catalogue](SLO-CATALOGUE.md)
- [Release engineering](RELEASE-ENGINEERING.md)
- [Provider reliability](PROVIDER-RELIABILITY.md)
- [Incident response](INCIDENT-RESPONSE.md)
- [Architecture decisions](adr/)
- [Operator decisions](decisions/README.md)
- [Operator runbooks](runbooks/)
- [Verification evidence](final-refactor/evidence/42-production-ops/README.md)

Historical evidence supports auditability but never assigns current work.
Architecture decision records use `adr/NNNN-kebab-title.md` and the sections
Status, Date, Context, Decision, Consequences, and What would reverse this decision.
They preserve decisions affecting tenancy, authorization, placement, event semantics,
encryption and cell topology. This convention replaces the redundant ADR index.
Agents should open it only when an active task links to a specific record.
CRM and Inventory implementation work remains outside the cross-program
completion scope.
