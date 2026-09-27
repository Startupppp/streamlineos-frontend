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

- [ ] All eight approval entity types can be submitted end to end
  — `frontend/features/build/approvals/approvals-schema.ts` line 19: `APPROVAL_ENTITY_TYPES = DB_ENUMS.approval_entity_type` (8 values via the catalog; `requestApprovalSchema.entityType` at line 22 validates all eight)
- [ ] The frontend enumeration derives from the generated enum catalog, not a hand-written array
  — `frontend/features/build/approvals/approvals-schema.ts` line 2 imports `DB_ENUMS` from `@/contracts/db-enums.generated`; `APPROVAL_ENTITY_TYPES` is assigned directly from `DB_ENUMS.approval_entity_type` (line 19)
- [ ] The parallel hand-written type union is derived from the schema rather than maintained separately
  — `frontend/types/projects/approvals.ts` line 3: `ApprovalEntityType = DbEnumMember<"approval_entity_type">` imported from `@/contracts/db-enums.generated`; the eight-value hand-written union is removed. Also resolved: `APPROVAL_ENTITY_TYPE_VALUES` in `frontend/hooks/api/build/approvals-schema.ts` line 11 (a third copy that listed all eight) is now `DB_ENUMS.approval_entity_type` — same source, no longer a separate list.
- [ ] Adding a ninth value to the database and regenerating the catalog makes it available with no further frontend edit
  — All three derivation points (`APPROVAL_ENTITY_TYPES`, `APPROVAL_ENTITY_TYPE_VALUES`, `ApprovalEntityType`) are assigned or typed from `DB_ENUMS.approval_entity_type` / `DbEnumMember<"approval_entity_type">`. When `pnpm -C frontend generate:db-enums` regenerates `frontend/contracts/db-enums.generated.ts`, the `as const` object gains the ninth member; every consumer at build time receives the widened type and widened tuple without any further edit. Proved by construction: there is no other array or union in the three owned files that names the entity type members.

**Copies of the approval entity type enumeration before and after:**

The two derivations above were source-verified, but no targeted approval-schema/type regression
test was run in this audit; they remain unchecked under the owner's test-evidence rule.

| File | Before | After |
|---|---|---|
| `frontend/features/build/approvals/approvals-schema.ts` | hand-written 6-value tuple (bug) | derived from `DB_ENUMS.approval_entity_type` |
| `frontend/hooks/api/build/approvals-schema.ts` | hand-written 8-value `as const` array | derived from `DB_ENUMS.approval_entity_type` |
| `frontend/types/projects/approvals.ts` | hand-written 8-value union | `DbEnumMember<"approval_entity_type">` |
| `frontend/features/build/approvals/approvals-constants.ts` | display list with labels + sentinel; already had all 8 values | unchanged (display list, not a validation list; values were correct) |

Total copies before: 4 (3 raw, 1 display). After: 1 canonical source (`DB_ENUMS`), 0 raw duplicates.
