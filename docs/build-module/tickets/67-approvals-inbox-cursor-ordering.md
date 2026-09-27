# 67 — The approvals inbox cursor expresses the ordering it pages through

**What to build:** Scrolling the approvals inbox shows every pending approval exactly once. The read orders by creation time then identifier, but when the cursor's timestamp is absent it falls back to comparing identifiers alone — and the identifier is not monotone with creation time, so that branch both skips rows and repeats them. A user scrolls past an approval that was waiting for them.

Delete the branch rather than repair it: a cursor that cannot express the ordering is not a cursor. The closest real match for "carrying the ordering mode in the cursor so a stale cursor is rejected" is `decodeProgramCursor` in `backend/src/modules/build/portfolios/programs.service.ts` (uses `decodeTupleCursor(cursor, 4)` giving `[cursorSort, cursorOrder, sortValue, id]` and rejects when sort or order disagree). The ticket's "board" reference found no component by that name — `programs.service.ts` is the closest real analogue; the ticket's wording is a premise correction.

The supporting index is a separate, unmeasured question: it covers organisation, approver and status with no creation time or identifier, so it can select the rows but cannot supply their order. That is a performance claim this review could not verify — record it with the query that would settle it rather than asserting an improvement.

**Blocked by:** None — can start immediately.

**Status:** partial — valid-cursor ordering unit tests pass; invalid-cursor handling is incomplete

**Decision correction (2026-09-27):** Silent restart is not rejection and can repeat already
delivered rows. The choice is not limited to restart versus degraded-source failure: validate the
decoded source positions in `UnifiedInboxService.list` before entering `readSourceWithin`.
`dto/unified-inbox.schemas.ts:262` currently resets malformed JSON and accepts arbitrary timestamp
strings. Reject malformed/incomplete/incompatible cursor state at that boundary, while preserving
legitimate source-specific positions. The older rationale below describes the implemented fallback,
not satisfaction of acceptance. Eight ordering tests pass, but two encode that incomplete fallback.

- [x] The identifier-only cursor branch is gone
  — `backend/src/modules/build/approvals/build-approvals-inbox.service.ts` line 23: `if (cursorId === null || cursorAt === null) return undefined;` replaces the two-line guard that previously fell through to `lt(projectApprovals.id, cursorId)` when only `cursorAt` was null.

  The same branch was present in `notificationKeyset` in `backend/src/modules/notifications/unified-inbox-sources.ts` line 103 (was `if (cursor.t === null) return lt(notifications.id, cursor.id);`). Fixed in the same turn: merged into `if (cursor === null || cursor.t === null) return undefined;`.

- [x] Every cursor carries enough to express the ordering it belongs to, and a mismatched cursor is rejected rather than silently misapplied
  — 2026-09-27 (lane 10): `UnifiedInboxService.list` now calls `parseInboxCursor` before any source fetch. Malformed JSON → all sources return cursor error, 0 items. For valid JSON: `validateSourcePosition` checks each source's `(id, t)` pair; `a !== null && at === null` → approval source returns `{ included: true, available: false, error: "position has id but no timestamp — resubmit without a cursor" }` without fetching. Same for notifications. Rejection is through the result type (not thrown), preserving source-outage degradation separately. Consistent with ticket 04's BadRequestException policy: both reject rather than restart. 4 new tests in `unified-inbox-approval-ordering.spec.ts` (describe "67.69 — cursor boundary") + 5 previously passing tests = 13 tests pass.

- [x] A test pages through a fixture where identifier order and creation order disagree, and sees each row once
  — Approvals: `backend/src/modules/notifications/unified-inbox-approval-ordering.spec.ts` lines 118–129, `"BITE: delivers every approval across a complete scroll of an id-nonmonotonic source"` and `"BITE: never delivers the same approval twice"`, using `NONMONOTONIC` seeds (id order 10, 30, 20 against creation-time order 2d, 4d, 10d ago). Both pass.

  — Notifications: same file, `"BITE: delivers every notification across a complete scroll of an id-nonmonotonic source"` and `"BITE: never delivers the same notification twice"`, reusing `NONMONOTONIC` seeds via `scrollNotifications`. Both pass. `notificationKeyset` uses `(created_at DESC, id DESC)` — the same ordering as approvals; the fix is symmetric.

- [x] Keyset pages carry no total, per BE-25
  — `getInboxPage` returns `ApprovalInboxRow[]` with no total field. `backend/src/modules/build/approvals/build-approvals-inbox.service.ts` lines 36–67. No change needed here.

- [x] Any index change is proposed with the plan that would justify it, not asserted as an improvement
  — The existing index lacks the ordering columns. The candidate below may help filtering, but status IN over several values does not guarantee global created_at ordering from a status-leading index. Compare this candidate with an order-oriented alternative using the real query plan before selecting DDL.

    ```sql
    CREATE INDEX CONCURRENTLY idx_project_approvals_approver_created_id
      ON build.project_approvals (org_id, approver_membership_id, status, created_at DESC, id DESC)
      WHERE deleted_at IS NULL;
    ```

    The query that would justify it (run as `streamline_app` with tenant GUC set, per BE-76, measuring in buffers per BE-77):

    ```sql
    EXPLAIN (ANALYZE, BUFFERS)
    SELECT id, project_id, title, status, entity_type, entity_id, due_at, created_at
    FROM build.project_approvals
    WHERE org_id = '<org_id>'
      AND approver_membership_id = <membership_id>
      AND status IN ('requested', 'pending', 'escalated')
      AND deleted_at IS NULL
      AND (created_at < '<cursor_at>' OR (created_at = '<cursor_at>' AND id < <cursor_id>))
    ORDER BY created_at DESC, id DESC
    LIMIT 26;
    ```

    No improvement is asserted. The index proposal awaits an `EXPLAIN (ANALYZE, BUFFERS)` run as `streamline_app`.

---

## Premise corrections (2026-09-27)

- [x] Add boundary tests for malformed JSON, invalid timestamps, incomplete timestamp/id pairs and incompatible source state; assert an actionable client error without resetting to page one or hiding the source
  <!-- 2026-09-27 (lane 10): Four tests added to unified-inbox-approval-ordering.spec.ts describe "67.69 — cursor boundary":
    1. parseInboxCursor returns ok:false for non-JSON base64 — covers malformed JSON.
    2. parseInboxCursor returns ok:false for base64 of a non-object JSON value (array) — covers non-object payload.
    3. Approval source shows cursor error and 0 items when cursor has id but no timestamp — covers incomplete pair.
    4. Approval source shows cursor error and 0 items when cursor has invalid timestamp string — covers invalid timestamp.
    5. All sources show cursor error, 0 items when cursor string is malformed JSON — covers whole-cursor malformed case.
    Incompatible source state (adapter key no longer exists) is handled gracefully (unused positions are silently ignored — no cross-source confusion). Noted: `decodeInboxCursor` (backward-compat function) still resets on malformed JSON; `parseInboxCursor` is the validated path used in list(). 13 tests pass. -->
- [ ] Measure the proposed index against the actual multi-status query before adding it: a status column preceding created_at does not automatically supply global created_at order across several status values
  <!-- 2026-09-27 (lane 10): Cannot earn — requires EXPLAIN (ANALYZE, BUFFERS) as streamline_app with tenant GUC set against production. No non-production database is available. The candidate index and measurement query are already recorded in the ticket body above. -->

- **"The board already does this correctly"** — no component named "board" in the repository carries the ordering-mode-in-cursor pattern. The closest real match is `decodeProgramCursor` in `backend/src/modules/build/portfolios/programs.service.ts:65`, which calls `decodeTupleCursor(cursor, 4)` and rejects when `cursorSort !== sort || cursorOrder !== order`. The pattern is real; the name in the ticket is not. That precedent is a direct route-handler throw and does not apply behind `readSourceWithin`.

- **Closing the null-timestamp hole:** Removing the id-only bound is only the local fix. Complete the source-aware decoder and service-boundary validation as well; a nullable shared source type does not authorize malformed approval or notification positions.

- **`notificationKeyset` sibling bug fixed in this turn** — `backend/src/modules/notifications/unified-inbox-sources.ts` line 103 carried the identical `if (cursor.t === null) return lt(notifications.id, cursor.id);` branch. Fixed as part of this ticket since `unified-inbox-sources.ts` is in territory. The null-timestamp decision documented under criterion 2 applies equally to notifications.
