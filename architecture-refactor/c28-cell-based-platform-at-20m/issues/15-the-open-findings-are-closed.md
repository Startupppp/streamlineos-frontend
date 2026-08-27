# 15 — Every open item in `OPEN-FINDINGS.md` is closed or carries a dated reason

**What to build:** The findings with no ticket of their own stop being carried. Each is either fixed, or its file says why it is not and what would close it — so the Phase 0 gate is a fact rather than a judgement call.

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

**The list**, from [`../../OPEN-FINDINGS.md`](../../OPEN-FINDINGS.md) as re-verified 2026-08-27:

| § | Finding | Note |
|---|---|---|
| 3 | `vault_access_logs` cannot record a deletion and has no tenant column | `vaultDocumentId` is `ON DELETE CASCADE`, so the audit row dies with the document; the surviving delete handler writes no row; the table has no `org_id`, so it is outside the RLS sweep. **Do not add the insert alone** — with the cascade in place it is inert. |
| 4 | `streamline_app`'s password is repaired in `.env`, not in Neon | Neon's control plane restores the previous password when the branch suspends. `ALTER ROLE` does not stick; it has to be set in the console. Operator action. |
| 5 | `db:verify-rls` and `backend/CLAUDE.md` §4 contradict each other | Missing policies are at 0; the verifier still reports 907 `RLS is enabled but not forced`. §4 says never blanket-force. One of the two has to change. |
| 6a | `DashboardLeaveService.getPendingApprovals` counts resignations org-wide | The leave count is scoped; the resignation count beside it filters only on `orgId` and `status`. Not a predicate swap — `resignations` has no pre-assignment approver column, so it needs a real answer for who a pending resignation's approver *would be*. |
| 6 | `verify-permission-catalog.mjs` duplicates `check-permission-keys.mjs` | Two implementations of one security predicate. Delete it and repoint `verify:permissions`. |
| 6 | `unregistered-injectables.mjs` reports 0 and can become a spec | Promote it beside `app-route-uniqueness.spec.ts`. |
| 6 | `recurring-journals.controller.ts` holds its list schema inline | `CLAUDE.md` §6 puts it in `dto/`. |
| 6 | 29 hand-rolled page fields remain | Nine deliberately exceed the 100/page cap and need a **product ruling**, not a mechanical swap. |
| 6 | `INVITE_EXPIRED` is never written to the seat ledger | Expiry is evaluated by predicate, so the seat maths is right and no event is recorded. A future expiry sweep should emit one. |

## Acceptance criteria

- [ ] Each row above is either fixed with its evidence recorded, or annotated in `OPEN-FINDINGS.md` with a date, the reason, and what would close it.
- [ ] §3 is closed as one change — `org_id` with a policy, `candidate_id`, denormalised `filename`/`document_type`, `vault_document_id` nullable with `ON DELETE SET NULL`, the reader rewritten onto the log's own columns, and only then the insert.
- [ ] §5 is resolved by a decision recorded as an ADR, not by silencing either side; the verifier and the constitution agree afterwards.
- [ ] §6a either scopes the resignation count or states the approver semantics that would let it be scoped — a guessed predicate is worse than the honest finding.
- [ ] The nine over-cap page fields carry a product ruling; the other twenty migrate.
- [ ] `OPEN-FINDINGS.md` afterwards contains no item whose status is unknown.

## Todo

- [ ] Verify each finding still reproduces before fixing it — the file itself records that most of what its predecessors listed had already been fixed.
- [ ] Check every cross-reference you write. A dangling pointer claiming a finding was written up somewhere it wasn't is how §6a came to exist.
- [ ] §4 is operator-only. Mark it, do not attempt it.
- [ ] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
