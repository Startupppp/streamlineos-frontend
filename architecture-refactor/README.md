# StreamlineOS architecture documentation

This directory contains the current architecture contract, the active release
backlogs, durable policies, ADRs, runbooks and verification evidence.

## Authority order

1. [`PRD-IN-SCOPE.md`](PRD-IN-SCOPE.md) defines the target architecture.
2. [`PRD-10-10-TODO.md`](PRD-10-10-TODO.md) is the cross-program completion
   backlog; [`PRD-10-10-CODE-RELEASE-TODO.md`](PRD-10-10-CODE-RELEASE-TODO.md)
   contains the detailed code/release criteria used by its traceability gate.
3. ADRs, policies and runbooks define durable operating rules.
4. Source code, migrations, executable gates and fresh environment evidence
   override dated prose.

## Durable references

- [Data catalogue](DATA-CATALOGUE.md)
- [Retention policy](RETENTION-POLICY.md)
- [SLO catalogue](SLO-CATALOGUE.md)
- [Release engineering](RELEASE-ENGINEERING.md)
- [Provider reliability](PROVIDER-RELIABILITY.md)
- [Incident response](INCIDENT-RESPONSE.md)
- [Architecture decisions](adr/README.md)
- [Operator decisions](decisions/README.md)
- [Operator runbooks](runbooks/)
- [Verification evidence](final-refactor/evidence/42-production-ops/README.md)

Historical reports and superseded evidence remain only where a seal, manifest
or integrity ledger depends on them. They are not current completion claims.
CRM and Inventory implementation work remains outside the cross-program
completion scope.
