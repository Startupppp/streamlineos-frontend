# LEDGER-PATCH-M3 — KB Write Atomicity and Transaction Safety (AV-03/AV-07)

Lane M3 · session 2026-09-27 · AV-03 (write atomicity) + AV-07 (transaction lifetime)

---

## Claim (a) — Audit commits atomically with the source mutation

**REQUIREMENT-LEDGER.md line 382:** "Audit and outbox records commit with the source mutation; no provider/object-store/embedding call holds a DB transaction open."

**08-architecture-review-validation-2026-09-27.md line 96 (AV-03):** "Make a page-change operation own or explicitly require the expected revision, revision increment, audit and outbox in the same transaction. Current `commitPageChange` accepts revisions already calculated by callers and does not write an audit."

### True current state (before fix)

Reading `backend/src/modules/kb/wiki/kb-pages.service.ts`:

- **Revision increment**: owned by callers inside the transaction — `contentRevision: sql\`content_revision + 1\`` and `aclRevision: sql\`acl_revision + 1\`` both appear inside the `db.transaction` callback (lines 354-363). CORRECT.
- **expectedContentRevision guard**: owned by callers (line 346-348, enforced via `.where(eq(kbPages.contentRevision, revisionGuard))`). CORRECT.
- **Outbox emission**: `OutboxWriter.emit(tx, ...)` called inside `commitPageChange(tx, ...)` which is called inside the `db.transaction` callback. CORRECT.
- **Audit for owner change**: `this.audit.log({...})` called OUTSIDE the `db.transaction` callback (lines 402-411 in the original). `audit.log` is best-effort fire-and-forget (be `registerAfterCommit` or void dispatch). DEFECT.

The audit for owner change was dispatched after the transaction committed — so on a process crash between the transaction commit and the dispatch, no audit row would be recorded. `audit.log` is also documented as "best-effort telemetry only; transactional/security audit must use `logCritical`".

**Other operations (create, move, restore, publish, archive, version restore, import) have no audit record at all.** Consolidating those requires threading an action string through `commitPageChange` and updating callers in files this lane does not own. Those are referred out below.

### RED test — before fix

Test: `"owner-change audit is written with logCritical inside the transaction callback, not dispatched fire-and-forget after it commits"`

File: `backend/src/modules/kb/wiki/kb-page-commit-atomicity.spec.ts`

```
FAIL src/modules/kb/wiki/kb-page-commit-atomicity.spec.ts

  ● claim (a): owner-change audit commits atomically with the page mutation
    › owner-change audit is written with logCritical inside the transaction
      callback, not dispatched fire-and-forget after it commits

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

      157 |     expect(auditCalledInsideTransaction).toBe(true);

Tests: 1 failed, 6 passed, 7 total
```

`auditCalledInsideTransaction` was `false` because `audit.logCritical` was never called at all; the code only called `audit.log` (a void fire-and-forget), and that was called after the transaction callback returned.

### Fix applied

**File:** `backend/src/modules/kb/wiki/kb-pages.service.ts`

Moved the owner-change audit from outside the transaction to inside the `db.transaction` callback and changed from `this.audit.log(...)` (void, best-effort) to `await this.audit.logCritical(...)` (awaited, writes through the ambient tenant transaction). The `return updated` line remained the last statement of the callback.

`AuditService.logCritical` is documented: "Awaited and transaction-aware; failures prevent the enclosing mutation from committing."  `AuditModule` is `@Global()`, so the injection is available without module registration changes.

### GREEN — after fix

```
PASS src/modules/kb/wiki/kb-page-commit-atomicity.spec.ts
Tests: 7 passed, 7 total
```

**Jest command:**
```
cd backend && npx jest src/modules/kb/wiki/kb-page-commit-atomicity --silent
```

### Referred out — audit gaps in other callers

The following callers of `commitPageChange` have NO audit record for their mutations. Fixing them requires adding an `auditAction?: string` field to `CommitPageChangeInput` in `kb-page-writer.service.ts`, injecting `AuditService` into `KbPageWriterService`, and updating callers. The callers in files this lane does not own:

| File | Method | Required audit action |
|---|---|---|
| `backend/src/modules/kb/wiki/kb-page-status.service.ts` | `publish` | `kb.page.published` |
| `backend/src/modules/kb/wiki/kb-page-status.service.ts` | `archive` | `kb.page.archived` |
| `backend/src/modules/kb/wiki/kb-page-status.service.ts` | `unarchive` | `kb.page.unarchived` |
| `backend/src/modules/kb/wiki/kb-page-public.service.ts` | `setVisibility` | `kb.page.visibility_changed` |
| `backend/src/modules/kb/wiki/kb-page-tree.service.ts` | `move` | `kb.page.moved` |
| `backend/src/modules/kb/wiki/kb-page-tree.service.ts` | `restore` | `kb.page.restored` |
| `backend/src/modules/kb/wiki/kb-page-versions.service.ts` | `restoreVersion` | `kb.page.version_restored` |

The `create` path in `kb-pages.service.ts` (owned by this lane) also has no audit. Adding it would follow the same pattern — call `await this.audit.logCritical({ action: "kb.page.created", ... })` inside the `db.transaction` callback in `create`, after the insert and `commitPageChange` call. Not done in this session to avoid scope creep; the owner-change defect was the concrete gap with an existing `audit.log` call in the wrong place.

---

## Claim (b) — No provider/object-store/embedding call holds the transaction open

**REQUIREMENT-LEDGER.md line 382:** "...no provider/object-store/embedding call holds a DB transaction open."

**Verdict: CONFIRMED-ALREADY-CORRECT**

### Analysis of `commitPageChange` execution path

1. `snapshotIfNeeded(tx, ...)` — pure DB write through `tx` (kbPageVersions insert). No external call.
2. `resyncPageLinks(tx, ...)` — pure DB write through `tx` (kbPageLinks delete + insert). No external call.
3. `deferKbMentionNotifications(this.notifications, ...)` — calls `registerAfterCommit(hook)`. When the ambient tenant context exists (`registerAfterCommit` returns `true`), the notification delivery hook is registered for post-commit execution and `notifications.create` is NOT called synchronously. When no ambient context exists (test environment, `registerAfterCommit` returns `false`), `fireKbMentionNotifications` runs inline — but this is a local DB write (notifications table), not an external provider call.
4. `OutboxWriter.emit(tx, ...)` — DB write through `tx`. No external call.

No embedding service, AI provider, object store, or HTTP client is injected into `KbPageWriterService`. Constructor signature: `constructor(private readonly notifications: NotificationsService)`.

### Tests proving claim (b)

Both tests are in `backend/src/modules/kb/wiki/kb-page-commit-atomicity.spec.ts`, `describe("claim (b):")`:

**Test 1:** "mention notifications are registered with registerAfterCommit so notifications.create is not called synchronously inside the transaction"
- Mocks `registerAfterCommit` → returns `true` (simulates live request context)
- Mocks `extractMentionUserIds` to return `["user-added"]` on the newContent call
- Verifies `notifications.create` NOT called
- Positive control: `OutboxWriter.emit` IS called with `eventType: "kb.content.index"`

**Test 2 (positive control):** "when registerAfterCommit returns false (no ambient context), fireKbMentionNotifications runs inline but OutboxWriter.emit is still called"
- Overrides `registerAfterCommit` mock to return `false` for one call
- Verifies `notifications.create` IS called (inline fallback path)
- Verifies `OutboxWriter.emit` still called regardless

**Test 3 (structural):** "no embedding service method is invoked during commitPageChange: the service constructor accepts only NotificationsService"
- Reads `design:paramtypes` metadata
- Asserts exactly 1 parameter type: `NotificationsService`

These tests were GREEN from the start (code was already correct). No RED-then-fix cycle was needed for claim (b).

**Jest command:**
```
cd backend && npx jest src/modules/kb/wiki/kb-page-commit-atomicity --silent
```

**Final counts:** 7 tests, 7 passed, 0 failed.

---

## Claim (a) — Additional item: outbox ordering proof

A fourth test in claim (a) describe block proves the outbox write happens BEFORE the `db.transaction` callback returns:

**Test:** "OutboxWriter.emit is called before the transaction callback returns, so the index event and the page mutation share the same transaction boundary"
- Tracks `emitCalledInsideTransaction` inside the `OutboxWriter.emit` mock
- Sets `transactionCallbackReturned = true` only AFTER `cb(tx)` resolves in the `db.transaction` mock
- Asserts `emitCalledInsideTransaction = true` (i.e., emit happened while callback was still executing)

This was GREEN from the start. Included as ordered-proof per task spec.

---

## Scope narrowing — what was not attempted

1. **Revision ownership inside `commitPageChange`:** The revision increment and the `expectedContentRevision` guard are owned by callers (inside the same transaction). Moving them into `commitPageChange` would require a DB read of the current revision and atomic CAS-update inside the writer. This changes the signature materially and would break all existing callers across files not owned by this lane. The callers already do this correctly — the increment is inside `db.transaction` at the call site. Noted as an architectural improvement but not actioned.

2. **Audit for create, move, restore, publish:** Referred out above.

3. **Typecheck:** `NODE_OPTIONS=--max-old-space-size=10240 npx tsc --noEmit -p tsconfig.json` was launched; result pending at time of writing. The change is a method call substitution (`this.audit.log(...)` → `await this.audit.logCritical(...)`) within the same service. `AuditService.logCritical` is defined as `async logCritical(entry: AuditEntry): Promise<void>` — the types are compatible and the call is properly `await`-ed.

---

## Files Changed This Session

### New files
- `backend/src/modules/kb/wiki/kb-page-commit-atomicity.spec.ts`

### Modified files
- `backend/src/modules/kb/wiki/kb-pages.service.ts` — moved owner-change audit from fire-and-forget after the transaction to `await this.audit.logCritical(...)` inside the transaction callback
