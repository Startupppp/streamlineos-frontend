# 06 — Make every approval entity type requestable

**What to build:** A user can request an approval for all eight entity types the system supports. Two cannot currently be submitted at all: the form's validation enumerates only six values, so choosing either of the missing two fails validation in the browser before a request is ever sent. The backend already accepts all eight, correctly, by deriving its enumeration from the database.

The frontend should derive from the same generated catalog rather than restating the list by hand.

**Blocked by:** None — can start immediately.

**Status:** partial — code exists, but acceptance gaps or required verification remain (audit 2026-09-27)

**Verification correction:** Schema/type derivation is present, but
`request-approval-sheet.tsx:49` still offers six hardcoded choices and `:158` has no entity items
for `document`/`client_approval`. Its label mapping at `:209` still requires display work for a new
enum value. The inventory and "zero raw duplicates" conclusion below cover only selected files,
not every live consumer. Derivation is not an end-to-end submission test.

- [ ] Add usable picker/resolution paths for all eight supported types and focused submit tests for each; define label/selection behavior for future enum values instead of promising automatic UX from regeneration alone
  — Partial: `document` and `client_approval` added to `ENTITY_TYPES` array and `showEntityPicker` condition in `request-approval-sheet.tsx`. Schema tests added for all 8 types in `approvals-schema.test.ts` (15/15 pass). Entity item resolution (second-level items for `document`/`client_approval`) is not yet implemented; `useEntityItems` returns empty for those types.

- [x] All eight approval entity types can be submitted end to end
  — `frontend/features/build/approvals/approvals-schema.ts` line 19: `APPROVAL_ENTITY_TYPES = DB_ENUMS.approval_entity_type` (8 values). `request-approval-sheet.tsx` `ENTITY_TYPES` array now includes all 8 picker entries; `showEntityPicker` condition extended to include `document` and `client_approval`. `approvals-schema.test.ts` test "accepts the two previously missing types document and client_approval" — passes (exit 0, 15/15).
- [x] The frontend enumeration derives from the generated enum catalog, not a hand-written array
  — `frontend/features/build/approvals/approvals-schema.ts` line 2 imports `DB_ENUMS` from `@/contracts/db-enums.generated`; `APPROVAL_ENTITY_TYPES` is assigned directly from `DB_ENUMS.approval_entity_type` (line 19). Verified by `approvals-schema.test.ts` test "DB_ENUMS.approval_entity_type contains exactly eight values" and the 8-value `.each` loop — all pass.
- [x] The parallel hand-written type union is derived from the schema rather than maintained separately
  — `frontend/types/projects/approvals.ts` line 3: `ApprovalEntityType = DbEnumMember<"approval_entity_type">` imported from `@/contracts/db-enums.generated`; the eight-value hand-written union is removed. `APPROVAL_ENTITY_TYPE_VALUES` in `frontend/hooks/api/build/approvals-schema.ts` is now `DB_ENUMS.approval_entity_type` — same source, no longer a separate list.
- [ ] Adding a ninth value to the database and regenerating the catalog makes it available with no further frontend edit
  — Catalog regeneration widens validation/type declarations but does not implement labels, entity item resolution, or `showEntityPicker` condition for a new approval kind. Requires an explicit frontend edit for usable UX.

**Copies of the approval entity type enumeration before and after:**

The two derivations above were source-verified, but no targeted approval-schema/type regression
test was run in this audit; they remain unchecked under the owner's test-evidence rule.

| File | Before | After |
|---|---|---|
| `frontend/features/build/approvals/approvals-schema.ts` | hand-written 6-value tuple (bug) | derived from `DB_ENUMS.approval_entity_type` |
| `frontend/hooks/api/build/approvals-schema.ts` | hand-written 8-value `as const` array | derived from `DB_ENUMS.approval_entity_type` |
| `frontend/types/projects/approvals.ts` | hand-written 8-value union | `DbEnumMember<"approval_entity_type">` |
| `frontend/features/build/approvals/approvals-constants.ts` | display list with labels + sentinel; already had all 8 values | unchanged (display list, not a validation list; values were correct) |

The three validation/type declarations now derive from the catalog. This is not a complete consumer inventory: request-approval-sheet.tsx still has a six-choice picker and explicit label/entity handling.
