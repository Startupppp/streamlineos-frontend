# L18 — Module Access & Settings Report

STATUS: DONE

## Prior split verified (KNOWN-DONE)
Split line counts confirmed: orchestrator 145, roster 339, flat-members 316, ownership 329, group-members 200 lines; settings 340/137/96. All within 500-line limit.

## Test fix applied
`module-access-audit.spec.ts` failed (3/5 tests) because audit calls moved to sub-services after the split. Updated the spec to test `ModuleAccessGroupCrudService` (createGroup, deleteGroup) and `ModuleAccessGroupMembersService` (addGroupMember) directly. All 5 assertions now pass and bite.

## Test summary
196 tests / 18 suites (module-access + settings): ALL PASS. 163 tests / 4 suites (platform + record-layouts): ALL PASS. Total: 359 tests, 0 failures.

## Authority matrix rows verified
`authority-matrix.spec.ts` (14 tests PASS): org-owner/org-admin/module-owner allowed; module-admin/plain-member/non-member denied for ownership transfer; management standing tested for all 6 standings; `assertOwnerOnly` blocks org-admin for all 5 owner-only operations.

## Validation results
- `check:route-classification`: PASS (3533 handlers, 0 undeclared)
- `check:module-entitlement`: PASS
- `check:module-lifecycle`: PASS (11 tables, all gates passed)
- `check:owner-authority`: PASS (9 declared, 9 enforced, 0 fabrications)
- `check:tenant-isolation`: FAIL — 392 services missing (pre-existing; 0 in my owned trees)
- `pnpm typecheck`: 9 errors, all in `finance/**` (outside my ownership); 0 errors in my owned files
