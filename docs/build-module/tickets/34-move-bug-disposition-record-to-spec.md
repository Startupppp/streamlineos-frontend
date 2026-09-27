# 34 — Move the bug-column disposition record out of the production module

**What to build:** A 26-entry mapping that documents where each column of a dropped table went now lives with the spec that verifies it, rather than being exported from a production module with zero production callers. It sits today beside genuinely live mapping functions, so the file reads as a mixture of active adapter code and a design record, and the export invites a future caller who will find the data stale as the schema moves on.

Keep the record — it has documentary value. Move it so the module's surface reflects only what runs.

**Blocked by:** None — can start immediately.

**Status:** done

**Verified 2026-09-27:** The disposition record is spec-owned; the focused
`backend/src/modules/build/phase-2/qa-bug-consolidation.spec.ts` passed, and the read-only source
diff preserves the live mapping functions. See the audit log for the exact command. Directory
naming alone is not an import-enforcement mechanism; the passing guard is the relevant evidence.

**Premise correction (2026-09-27):** the record has **27** entries, not 26. Count verified from `BUG_COLUMN_DISPOSITIONS` in the original source: `id`, `org_id`, `project_id`, `bug_number`, `title`, `description`, `severity`, `priority`, `status`, `steps_to_reproduce`, `expected_result`, `actual_result`, `environment`, `browser_device`, `affected_release_id`, `fixed_release_id`, `assignee_membership_id`, `reporter_id`, `qa_owner_id`, `qa_owner_membership_id`, `reopen_count`, `linked_ticket_id`, `linked_test_case_id`, `created_by`, `created_at`, `updated_at`, `deleted_at` = 27.

**Destination choice:** `backend/src/modules/build/phase-2/bug-column-dispositions.ts`. The spec that asserts against the record lives at `backend/src/modules/build/phase-2/qa-bug-consolidation.spec.ts`; co-locating the design record in the same `phase-2/` directory makes the spec the owner. The `phase-2/` directory is outside the production `qa/` module, so no production service can import from it without an obvious module-boundary violation.

**Assertion ceiling ledger:** `backend/src/scripts/assertion-ceiling-ledger.json` pins `bug-consolidation-mapping.ts` at `{"as": 3, "nonNull": 1}`. All four assertions are inside the live functions that were not moved (`resolveStateGroup` line 54, `resolveTicketPriority` line 61, `resolveSuggestedPriorityFromSeverity` line 71, `resolveProjectStatusName` line 107). `BUG_COLUMN_DISPOSITIONS` contains zero `as` or `!` assertions. The ledger counts are unchanged; no edit to the ledger is required.

- [x] The disposition record is no longer exported from a production module — `BugColumnTarget`, `BugColumnDisposition`, and `BUG_COLUMN_DISPOSITIONS` removed from `backend/src/modules/build/qa/phase-2/bug-consolidation-mapping.ts` lines 117-268 (2026-09-27); the record now lives in `backend/src/modules/build/phase-2/bug-column-dispositions.ts`.
- [x] The spec that asserts against it still does so, unchanged in coverage — `backend/src/modules/build/phase-2/qa-bug-consolidation.spec.ts` import updated to pull `BUG_COLUMN_DISPOSITIONS` from `"./bug-column-dispositions"` (same directory); all other imports remain from `"../qa/phase-2/bug-consolidation-mapping"`. The four `describe` blocks covering the disposition record (`"column coverage of the consolidation design"`) are untouched in coverage.
- [x] The live mapping functions in that file are untouched — `resolveStateGroup`, `resolveTicketPriority`, `resolveSuggestedPriorityFromSeverity`, `resolveProjectStatusName`, `resolveWorkItemStatus`, and all their supporting constants and types remain in `bug-consolidation-mapping.ts`; `bugs.service.ts:11` and `test-runs.service.ts:18` both import only `resolveWorkItemStatus` and `resolveTicketPriority` and are not affected.
- [x] The design record is not lost — moved intact to `backend/src/modules/build/phase-2/bug-column-dispositions.ts` with all 27 entries preserved.
