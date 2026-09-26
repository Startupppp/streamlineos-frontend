# WAVE-G-06 — Ticket bulk verbs

Session closed the three remaining F-04 blockers on `POST /build/:projectId/tickets/bulk` and the export route.

## What was done

### 1. Bulk label + archive (backend)

- `backend/src/modules/build/core/dto/ticket.schemas.ts` — `bulkUpdateSchema` extended with `labelIds` (`z.array(z.number().int().positive()).max(10).optional()`) and `archive` (`z.boolean().optional()`); `.strict()` maintained; refine updated to accept the new fields.
- `backend/src/modules/build/core/dto/build-tickets-response.schemas.ts` — `bulkUpdateResultSchema` gains optional `blocked` array (`ticketId`, `reason`, `dependencyCount`).
- `backend/src/modules/build/core/build-ticket-bulk-mutation.ts` — archive check: selects active children not in the selection; if any exist, returns `{ updated: 0, ticketIds: [], blocked: [...] }` without any write. Label validation: checks all supplied IDs exist in the org, throws `NotFoundException` on unknown IDs. Label insert: `INSERT INTO ticketLabelMappings … ON CONFLICT DO NOTHING` after the ticket UPDATE.

### 2. Bulk export (backend)

- `backend/src/modules/build/import-export/dto/import-export-request.schemas.ts` — `exportTicketsQuerySchema` gains optional `ticketIds` (CSV string → `number[]`, max 100).
- `backend/src/modules/build/import-export/ticket-export.service.ts` — `TicketExportInput` gains `ticketIds?: number[]`; `inArray(tickets.id, input.ticketIds)` added to the `and:` array when supplied.
- `backend/src/modules/build/core/dto/ticket.schemas.ts` — also added `exportTicketsQuerySchema` (and `ExportTicketsQuery`) for `GET /build/:projectId/tickets/export` with the same `ticketIds` CSV param, used by `projects-tickets.controller.ts`.

### 3. Dead `group` URL param removed (frontend)

- `frontend/features/build/views/use-board-url-state.ts` — removed `const groupParam = searchParams.get("group") ?? ""` and its entry from the return object.

### 4. Frontend wiring

- `frontend/features/build/shared/bulk-action-bar.tsx` — added `onBulkLabel?`, `onBulkArchive?`, `onBulkExport?` props; renders a Label `<Select>`, an Archive `<Button>`, and an Export `<Button>` when the respective props are supplied.
- `frontend/features/build/views/project-board-content.tsx` — forwarded `onBulkLabel`, `onBulkArchive`, `onBulkExport`, `labels` through to both BulkActionBar instances (list view and table view).
- `frontend/features/build/project-detail/project-board-page.tsx`:
  - Added `useOrgLabels()`, `useExportTickets()`, `[archiveConfirmOpen, setArchiveConfirmOpen]`.
  - `handleBulkUpdate` Pick extended with `labelIds` and `archive`; `onSuccess` checks `d.blocked` and shows a descriptive error toast if blockers exist.
  - Added `handleBulkLabel`, `handleBulkArchiveRequest`, `handleBulkArchiveConfirm`, `handleArchiveDialogChange`, `handleBulkExport`.
  - Rendered `ConfirmDialog destructive` for archive confirmation.
  - Passed `onBulkLabel`, `onBulkArchive`, `onBulkExport`, `labels` to `ProjectBoardContent`.
- `frontend/features/build/import-export/import-export-client.ts` — `ExportTicketsInput` gains `ticketIds?: number[]`; when set, joined as CSV in the query params.
- `frontend/hooks/api/build/ticket-import-export.ts` — `ExportTicketsVariables` gains `ticketIds?: number[]`; forwarded to `exportTickets()`.
- `frontend/hooks/api/build/build-tickets-subresource-schema.ts` — `bulkUpdateResultContract` already had `blocked` from the previous session.

## Tests

**Backend** (`build-bulk-mutation-invariants.spec.ts`) — 7 tests pass:
- 5 pre-existing
- NEW: rejects unknown label ids and makes no DB write
- NEW: returns blocked list with zero updates when selected ticket has active children outside the selection

**Frontend** (`project-board-page.test.tsx`) — 24 tests pass:
- Pre-existing access/error/keyboard/workload tests: all green
- NEW: bulk label fires `bulkMutate` with `labelIds`
- NEW: orgLabels passed to `ProjectBoardContent`
- NEW: bulk export fires `exportMutation.mutate` with `ticketIds`
- NEW: archive request opens `ConfirmDialog`
- NEW: archive confirm fires `bulkMutate` with `archive: true`

## Deploy ordering

No migrations. All changes are pure code. The backend changes are backwards-compatible (optional query params / optional body fields). No deploy ordering risk.
