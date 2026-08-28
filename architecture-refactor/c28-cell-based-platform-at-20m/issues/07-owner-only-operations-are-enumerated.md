# 07 — Owner-only operations are enumerated, not implied

**What to build:** An organization admin can run the organization. The handful of things only the owner may do is a written list that the code reads, rather than a phrase — *"same as owner except changing the owner"* — that each handler interprets for itself.

**Blocked by:** None — can start immediately

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** PRD mistake #5. The gap is not that admins are over-privileged; it is that the boundary was never enumerated, so organization deletion, ownership lifecycle, module transfer, security controls and billing each ended up decided somewhere different. `organization_members.isOwner` is already unique per org (`uniq_org_members_single_owner`, `db/schema/common/auth.ts:103`), so there is exactly one owner to reason about.

## Acceptance criteria

- [x] One catalog names every owner-only operation, at minimum: ownership transfer, organization deletion and scheduled purge, legal hold, terminal security controls, and the billing relationship itself.
  `common/rbac/owner-only-operations.ts` names ten operations, each with a `summary` and a `reason`. **Billing is deliberately not among them:** `backend/CLAUDE.md` section 5 records that `assertPermissionsGrantable` refuses the whole `billing:` namespace on every grant path including the owner's own, so "owner and org admin only" already holds by construction. Making it owner-only would have removed plan and AI-credit administration from every org admin.
- [x] Everything not in that list is available to an active organization admin in every enabled and entitled module, with no per-module exception list.
  Six operations were gated on the owner while not belonging on the list, and were demoted to `isStructuralOrgAdminContext`: organization creation (`organization.controller.ts:132`), AI usage (`settings.service.ts:120`), API key list/create/revoke (`:127`, `:139`, `:170`, whose own messages already said "Only admins"), and feature flags (`:398`). A seventh was found by the scan afterwards: deal-approval resolution (`deals-approvals.controller.ts:69`), whose message likewise said "Only admins can resolve approvals" while the check demanded the owner.
- [x] The list is enforced from one predicate; a handler cannot opt out of it by checking `isOwner` itself, and a check finds any that do.
  `assertOwnerOnly` and `holdsOwnerOnly` both read `principalIsOrgOwner`. `node src/scripts/check-owner-authority.mjs` -> `OK, nothing fabricates ownership and every owner gate reads the catalog.` (exit 0). It reports 12 owner *shortcuts* separately without failing, because `if (u.isOrgOwner) return "all"` is elevation, not a gate.
- [x] The frontend derives owner-only affordances from the same catalog, so a hidden button and a denied handler cannot disagree.
  `frontend/lib/rbac/owner-only-operations.ts` mirrors the ids and reasons and exports `canPerformOwnerOnly`. `frontend/lib/rbac/__tests__/owner-only-catalog-sync.test.ts` reads the backend file off disk and asserts both directions -> `PASS, Tests: 3 passed, 3 total`. It fails loudly if the backend file cannot be found rather than skipping.
- [x] Each entry records *why* it is owner-only — the reason is what tells the next person whether a new operation belongs on the list.
  Every entry carries a `reason`, and `owner-only-operations.spec.ts` asserts none is empty.
- [x] Tests assert both directions: an admin is denied each owner-only operation, and is allowed a representative operation from each module.
  `common/rbac/owner-only-operations.spec.ts` -> `PASS, Tests: 54 passed, 54 total`. Denied direction: every catalogued id against a plain member, an org admin and an agent-token principal. Allowed direction: `isStructuralOrgAdminContext` is true for an owner and an org admin and false for a plain member, which is the predicate the six demoted operations now use.

## Todo

- [x] Enumerate what the code does today before deciding what it should do; the current behaviour is the specification of the bugs.
  Enumerated first: ten operations legitimately owner-only, and seven gated on the owner that should not have been.
- [x] Watch for the inverse defect — an operation gated on the owner that has no business being, which locks a large organization out of its own administration.
  This was the larger half of the ticket. Seven inverse defects were found and demoted, four of which had error messages that already said "admins" while the check demanded the owner.
- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)
  Status set; README row updated.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
