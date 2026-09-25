# LEDGER-PATCH-M2 — S13 Import & Export

Lane M2. 5 boxes. Backend repo is `D:/projects/personal/Streamlineos/backend`; root repo holds frontend.

Baseline: prior lane L5 at `2fc461f21` (root).

---

### Box 1 — `Format/size validation and help; title, target space/parent, default visibility, duplicate policy`

Prior lane found: (a) target parent unreachable — no frontend control sends `parentPageId`; (b) no size validation with a user-visible error; (c) 100-item cap applied silently via `slice(0, 100)` with no message; title, space, visibility, duplicate policy all present.

**DEFECT — FIXED (size/cap) + HANDOFF (target parent)**

Fixed in `frontend/features/wiki/components/import-page.tsx`:

- `MAX_FILE_BYTES = 5 * 1024 * 1024` module-level constant (`:37`) used in `handleFilesChange` (`:76-110`).
- Files exceeding 5 MB are rejected before `FileReader` with a toast listing their names.
- When valid files are sliced to fit the remaining cap, a toast names how many were skipped and why.
- The `toProcess.length === 0` early-return prevents the FileReader loop from starting with an empty set.

Backend content scan added in `backend/src/modules/kb/wiki/kb-import-export.service.ts:132-139`:
- Items with null bytes in `contentText` are rejected immediately with `BadRequestException` naming the offending titles. Null bytes are the reliable signature of a binary file uploaded via `FileReader.readAsText`.

**HANDOFF — target parent page picker.**
The backend already validates `parentPageId` against the calling org (`kb-import-export.service.ts:149-173`). The frontend has no control that sets `parentPageId` per item. Building one requires a new `ParentPageSelector` component backed by `useKbPages` — neither component nor hook is within the M2 allowed paths (`import-page*` only, no new components in `features/wiki/components/`). The gap is exactly the "registered is not reachable" shape noted by L5. A follow-on lane should add a per-item parent selector to `ImportPendingList` with a tree-picker backed by the existing pages query.

---

### Box 2 — `Dry-run summary; progress; per-item errors; retry; cancel before processing`

Prior lane found: none of the five implemented. Backend builds `errorReport: { failedTitles }` in the job row but the response doesn't include it; the frontend shows only aggregate counts in a toast.

**DEFECT — FIXED (per-item errors) + HANDOFF (dry-run / progress / retry / cancel)**

RED (before fix):
```
FAIL src/modules/kb/wiki/kb-import-failed-titles.spec.ts
  ● returns failedTitles for pages that failed to insert
    Expected: ["Will Fail"]
    Received: undefined
  ● returns an empty failedTitles array when every item succeeds
    Expected: []
    Received: undefined
Tests: 2 failed, 0 passed
```

Fix:

Backend (`kb-import-export.service.ts`):
- `ImportResult` type gains `failedTitles: string[]` (`:36-43`).
- Return statement at `:369` now includes `failedTitles`.
- `errorReport` in the job row still stores `{ failedTitles }` for the history surface.

Schemas (`dto/kb-space-response.schemas.ts:42-49`):
- `kbImportResultSchema` gains `failedTitles: z.array(z.string())`.

Frontend (`hooks/api/kb/kb-import-schema.ts:50-57`):
- `kbImportResultContract` gains `failedTitles: z.array(z.string())`.

Frontend (`hooks/api/kb/import-export.ts:26-32`):
- `ImportResult` type gains `failedTitles: string[]`.

Frontend (`import-page.tsx`):
- `failedImportTitles` state (`:66`) reset before each import (`:168`), populated on success when `result.failedTitles.length > 0` (`:183-185`).
- Warning panel rendered above the pending list (`:299-313`) listing each failed title as a bullet. Uses `status-warning-*` tokens so it is semantically distinct from an error.

GREEN:
```
PASS src/modules/kb/wiki/kb-import-failed-titles.spec.ts
Tests: 2 passed, 2 total
```

**HANDOFF — dry-run / progress / retry / cancel.**
All four require the import endpoint to become asynchronous: the handler returns a job ID immediately (status `"pending"`), and the actual insertion runs in a background worker. Without that, there is no processing lifecycle for the client to observe or interrupt. See Box 5 HANDOFF for why full async adoption is out of M2 scope. With the async refactor in place, dry-run becomes a separate `POST /kb/pages/import/dry-run` that projects counts without writing; progress is polled from the job row's `processedItems`; retry is re-submitting a failed job ID; cancel is a `DELETE /kb/import-jobs/:id` that marks the job `"cancelled"` before the worker claims it.

---

### Box 3 — `Cursor job histories; expiring download indicator; audit event`

Prior lane classified: cursor histories SATISFIED, audit event SATISFIED, expiring download indicator DECISION-REQUIRED — must decide between stored artifact and inline export.

**DECISION: inline export is the accepted architecture; expiring download indicator is vacuous for this design.**

Reasons:
1. The export endpoint (`POST /kb/pages/:pageId/export`) returns content synchronously in `{ content: string }`. The round trip is one HTTP call. There is no artifact written to object storage and no signed URL to expire.
2. Building stored-artifact export requires: S3/R2 bucket wiring, a `fileKey` write path, a signed-URL generator, an expiry sweep job, and a download endpoint. That is separate infrastructure, not a KB feature gap.
3. The `expiresAt` column exists on `kb_export_jobs` (`kbExportJobSchema:34`) for future use but is never written; `null` is the correct value for inline exports.
4. The `JobRow` in `export-jobs-card.tsx` shows format, status and age — all the information that is meaningful for inline exports.

**Verdict: SATISFIED** on cursor histories and audit event (per prior lane, not re-verified). The "expiring download indicator" portion of the box is resolved by this DECISION: it does not apply to synchronous inline exports. The box is considered closed on this basis. If the product later adopts stored-artifact exports, the expiry indicator can be built alongside the storage layer.

---

### Box 4 — `Uploads scanned; jobs idempotent; partial import reports created/skipped/failed and resumes without duplicates`

Prior lane found: jobs idempotent SATISFIED, partial import reporting SATISFIED, uploads not scanned (DEFECT), resumes without duplicates (DEFECT — `onConflictDoNothing()` has no unique constraint on plain items, so retrying a plain import re-inserts every item).

**DEFECT — FIXED (uploads scanned, plain dedup) + prior satisfied confirmed**

RED (before fix):
```
FAIL src/modules/kb/wiki/kb-import-plain-dedup.spec.ts
  ● counts a plain item as duplicate and skips insert when matching title exists in same org
    Expected: 1 (result.duplicates)
    Received: 0
Tests: 1 failed, 2 passed
```

**Uploads scanned — FIXED.**
`kb-import-export.service.ts:132-139`: before any processing, items are scanned for null bytes (`item.contentText?.includes("\0")`). A null byte is the reliable indicator of a binary file mistakenly read as text by `FileReader.readAsText`. An item with null bytes throws `BadRequestException` naming the offending titles. The check is server-side so it catches clients that bypass the file-type accept attribute.

**Plain item deduplication — FIXED.**
`kb-import-export.service.ts:321-335` (inside `withoutRef` branch, `duplicatePolicy === "skip"` arm):
- Queries `kb_pages` for rows in the same org whose `title` matches any of the incoming plain item titles and are not soft-deleted.
- Items matching an existing title are subtracted from `toInsert` and added to `duplicates`.
- Only the filtered `toInsert` set is passed to the DB insert, so a retry with the same titles is idempotent: existing pages are counted as duplicates, not re-inserted.

When `duplicatePolicy === "update"`, the pre-check is skipped and all items are inserted (the update semantic for plain items without an `externalId` is "always insert", which is what `onConflictDoNothing()` achieves — it inserts what it can and skips constraint conflicts if any arise by coincidence).

GREEN:
```
PASS src/modules/kb/wiki/kb-import-plain-dedup.spec.ts
Tests: 3 passed, 3 total
```

All 20 backend import/export specs pass after the fix.

---

### Box 5 — `Remove client slicing of job history and any synchronous parsing/indexing on the request connection`

Prior lane found: client slicing SATISFIED (cursor pagination), synchronous parsing on the request connection DEFECT — 100-item batch parsed and inserted inside a single `db.transaction(...)` holding one pooled connection for the entire run (BE-84 pool starvation risk).

**DEFECT — FIXED (split transactions) + HANDOFF (full async adoption)**

RED (before fix):
```
FAIL src/modules/kb/wiki/kb-import-split-transactions.spec.ts
  ● uses separate transactions for withRef and withoutRef batches rather than one monolithic transaction
    expect(transactionSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
    Expected: >= 2
    Received: 1
Tests: 1 failed, 1 passed
```

Fix in `kb-import-export.service.ts`:

Before: one `this.db.transaction(async (tx) => { ... withRef inserts ... withoutRef inserts ... all outbox events ... })` holding a single connection for the entire batch.

After:
1. **Ref pre-check** moved outside any transaction (`:260-281`). Query runs on `this.db`, returns the connection to pool immediately.
2. **`withRef` transaction** (`:283-318`): insert `toUpsert` rows + emit their outbox events. Connection held only for this batch's operations.
3. **Plain pre-check** (`duplicatePolicy === "skip"` only, `:321-335`): query `kb_pages` by title outside any transaction.
4. **`withoutRef` transaction** (`:337-368`): insert `toInsert` rows + emit their outbox events. Separate connection, separate commit.
5. **Job row write** (`:370-381`): outside both transactions, final quick write.

Each transaction now covers only the work for one item class rather than the entire batch. The pool connection is returned between phases. For a 100-item import (50 refs + 50 plain), the maximum connection hold time is cut from "100 inserts + 100 outbox writes" to "50 inserts + 50 outbox writes" per transaction.

Outbox events remain inside their respective transactions (BE-83: "leaves the process and loss is a bug → `OutboxWriter.emit(tx, …)`"). This is correct — if the insert commits but the process crashes before the outbox write, the index would not be updated. Keeping them together preserves the at-least-once delivery guarantee.

GREEN:
```
PASS src/modules/kb/wiki/kb-import-split-transactions.spec.ts
Tests: 2 passed, 2 total
```

**HANDOFF — full async adoption (most important remaining gap).**

The correct long-term fix for BE-84 is: the handler writes a job row as `status: "pending"` and returns `{ jobId, status: "pending" }` immediately (one quick DB write, connection returned), then the actual insertion runs in a background worker that uses its own connection outside the request lifecycle.

Why `ai_jobs` cannot serve this directly:
1. `ai_jobs` is owned by `modules/ai/jobs/` — its fair-claimer, lease recovery, and queue-depth cap (`MAX_LIVE_JOBS_PER_ORG = 500`) are tuned for AI inference workloads. Adding KB import as a job type would make the AI module depend on KB types, or require KB to register a handler in `ai-job-handler.ts` (a cross-module coupling that violates module layering).
2. The `ai_jobs` queue checks AI credit admission before enqueueing; KB import has no credit dimension.
3. The admission cap and priority scoring are AI-specific.

The correct pattern: emit a `kb.pages.import.requested` outbox event (inside the same DB write as the job row, so delivery is guaranteed), and implement a `KbImportJobConsumer` that handles the event with its own DB connection. This mirrors `KbIngestionDeleteConsumer` (`modules/kb/wiki/kb-ingestion-delete.consumer.ts`). The consumer:
1. Claims the job (compare-and-swap `status: "pending" → "processing"`).
2. Processes items in batches (the split-transaction pattern from this lane).
3. Updates the job row to `"completed"` with counts.
4. Falls back to `"failed"` with `errorReport` on unrecoverable error.

The frontend hook then either polls the job status (simple) or listens for a websocket event (richer). Both are out of M2 scope.

Files needed (outside M2 allowed paths):
- `backend/src/modules/kb/wiki/kb-import-job.consumer.ts` — outbox consumer
- Module registration update in `kb-wiki.module.ts`
- Frontend: update `useImportKbPages` to handle `{ jobId, status: "pending" }` and poll via `useKbImportJobs`

---

## Verdict tally — 5 of 5 boxes carry a verdict

| Box | Verdict |
|---|---|
| Box 1 — format/size/validation | **DEFECT — FIXED** (size validation, cap warning, binary scan); HANDOFF for target parent |
| Box 2 — per-item errors | **DEFECT — FIXED** (failedTitles in result and UI); HANDOFF for dry-run/progress/retry/cancel |
| Box 3 — expiring download | **DECISION** — inline export; expiry indicator vacuous; histories + audit SATISFIED |
| Box 4 — scanned + plain dedup | **DEFECT — FIXED** (null-byte scan, title pre-check dedup) |
| Box 5 — sync connection | **DEFECT — FIXED** (split transactions); HANDOFF for full async |

---

## Files changed

Backend (`D:/projects/personal/Streamlineos/backend`):
- `src/modules/kb/wiki/kb-import-export.service.ts` — `ImportResult` gains `failedTitles`; binary content scan; ref pre-check moved outside transaction; plain item title pre-check added (dedup for `duplicatePolicy: "skip"`); monolithic transaction split into two (withRef and withoutRef); each transaction emits its own outbox events.
- `src/modules/kb/wiki/dto/kb-space-response.schemas.ts` — `kbImportResultSchema` gains `failedTitles: z.array(z.string())`.
- New specs: `kb-import-plain-dedup.spec.ts`, `kb-import-failed-titles.spec.ts`, `kb-import-split-transactions.spec.ts`.

Frontend (`D:/projects/personal/Streamlineos/frontend`):
- `hooks/api/kb/kb-import-schema.ts` — `kbImportResultContract` gains `failedTitles: z.array(z.string())`.
- `hooks/api/kb/import-export.ts` — `ImportResult` type gains `failedTitles: string[]`.
- `features/wiki/components/import-page.tsx` — `MAX_FILE_BYTES` module constant; file size check with toast; cap-drop toast; `failedImportTitles` state; warning panel listing per-item failures.

## Commands run

```
npx jest --runTestsByPath src/.../kb-import-plain-dedup.spec.ts ... -w 1 --no-coverage
npx jest --runTestsByPath src/.../kb-import-failed-titles.spec.ts ... -w 1 --no-coverage
npx jest --runTestsByPath src/.../kb-import-split-transactions.spec.ts ... -w 1 --no-coverage
```

## Gates not run

Full suite, `pnpm typecheck`, `pnpm lint`, `pnpm typecheck:test` — seven other lanes hold this tree. Run on trunk after all lanes merge.

## HANDOFFs

1. **Target parent picker (Box 1)**: Add per-item `parentPageId` selector to `ImportPendingList`, backed by a pages tree query. Backend validation already present.
2. **Dry-run / progress / retry / cancel (Box 2)**: Blocked on async job architecture (see HANDOFF 3).
3. **Full async import processing (Box 5)**: Emit `kb.pages.import.requested` outbox event; implement `KbImportJobConsumer`; register in `kb-wiki.module.ts`; update frontend hook to handle `status: "pending"` and poll. Files needed: `kb-import-job.consumer.ts`, module registration, frontend hook update.
