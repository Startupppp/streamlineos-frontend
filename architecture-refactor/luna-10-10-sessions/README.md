# Luna 10/10 Completion Sessions

These seven PRDs are independent execution contracts for Luna. Start every session from the current `main` branch and re-run its baseline commands before changing anything; numeric counts may fall while another session works.

## Shared non-negotiable rules

- Read root `CLAUDE.md` and the relevant `backend/CLAUDE.md` and/or `frontend/CLAUDE.md` before editing.
- Do not touch CRM or Inventory. Do not touch any public landing route, landing component, landing provider, or animation. The landing page must remain byte-for-byte behaviorally unchanged.
- Do not change a classification, baseline, allowlist, or test simply to make a gate pass. Every reduction must come from a real code/schema/API correction.
- Do not use `git reset`, `checkout`, `stash`, `rebase`, `push`, or destructive data operations. Commit only a coherent verified batch when the execution environment permits it.
- Preserve tenant isolation, RBAC, API compatibility, cache invalidation, audit logs, and accessibility. Never silently truncate a list or whole-set workflow.
- Ask questions only when the answer requires a product, security, deployment, or billing decision that the repository cannot answer. Otherwise inspect and continue.
- Continue until every in-repository checkbox and required gate in the assigned PRD passes. Do not report success from source inspection alone.

## Global final gates

The seven sessions are complete only when all applicable commands pass from a clean checkout:

```powershell
pnpm -C backend typecheck
pnpm -C backend check:spec-typecheck
pnpm -C backend scan:legacy-actors
pnpm -C backend check:unbounded-reads
pnpm -C backend check:migration-discipline
pnpm -C backend check:migration-chain
pnpm -C backend check:migration-ledger
pnpm -C backend check:openapi-coverage
pnpm -C frontend type-check
```

Production infrastructure and human approvals are not code-completable. Session 07 must obtain evidence or explicitly leave an external approval blocker; it must never invent production proof.

## Session ownership

| PRD | Exclusive primary scope |
|---|---|
| 01 | HR authority actor migration |
| 02 | Build, Support, Common authority actor migration |
| 03 | Payroll, AI, Accounting, Billing authority actor migration |
| 04 | Offset pagination and authenticated UI contracts |
| 05 | Unbounded reads, projections, and query-cost proof |
| 06 | Cross-cutting security, API, reliability, tests, and decomposition |
| 07 | Production operations, privacy, compliance, and release evidence |

If a session discovers a file owned by another session, record it in that PRD's handoff table and do not edit it.
