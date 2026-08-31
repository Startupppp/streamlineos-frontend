# L16 Organization Lane Report

**Scope:** `backend/src/modules/organization/**`, `backend/src/modules/ownership/**`, `backend/src/modules/delegations/**`

## Done

- **Placement-bypass gated:** 3 allowlist entries added for `org-membership-access-revocation.ts` (context-exit + with-identity) and `invitation-acceptance.service.ts` (with-identity); 2 more for new `org-membership-status.service.ts`.
- **Invitations bugs fixed (4):** email canonicalization (`trim().toLowerCase()`) in `invite()` and `bulkInvite()`; expired PENDING invitations now expire via `UPDATE status='EXPIRED'` instead of `DELETE`; `resend()` and the pending check both filter `status = 'PENDING'` to prevent reviving revoked invitations.
- **`org-membership.service.ts` decomposed:** 936 → 242 lines. Extracted: `OrgMembershipStatusService` (341 lines, suspend/reactivate lifecycle), `OrgMemberDepartureService` (361 lines, remove/leave), `OrgMemberAuthority` queries (standalone helpers), `member-lifecycle.types.ts` (neutral types to break circular import). Delegators kept on `OrgMembershipService` for backward compat with `users.service.ts` and `org-lifecycle.service.ts`.
- **Module wired:** `organization.module.ts` registers and exports the two new services; `organization.service.ts` calls them directly.
- **Zero new circular imports:** `madge --circular` over 4310 files = 0 cycles.
- **All specs updated:** 5 spec files updated to provide new services; `org-membership-tenant-join.spec.ts` migrated to test `queryPrivilegedRoleNames` directly. 432/432 tests pass.
- **All checks pass:** route-classification (0 undeclared), placement-bypass (clean), owner-authority (clean), typecheck (0 errors in scope).

## OUT-OF-OWNERSHIP (report to schema/migration lane)

- Invitations unique index: change `WHERE accepted_at IS NULL` → `WHERE status = 'PENDING'` (allows REVOKED/DECLINED to share an email slot without deleting history).
- 13 FK security findings (SF-1 through SF-13) from `a13-membership-artifacts-report.md`: RESTRICT/NO ACTION FKs blocking member removal — full migration SQL in that doc.
