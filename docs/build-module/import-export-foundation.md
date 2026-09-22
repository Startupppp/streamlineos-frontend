# Build Import / Export — Foundation

Status: built, isolated, **not wired**. Nothing routes to it yet.

Branch: `build/followup-import-export` (both repos).

## What this is

A synchronous, migration-free foundation for importing and exporting Build
tickets. It is a set of services and pure functions, not an HTTP surface. No
controller, no route, no permission key, no table, no navigation entry.

Supported entity: **`build.tickets`**, in one project at a time. Nothing else.

## Relationship to `lane-4-import-export.md`

`lane-4-import-export.md` specifies a different architecture: background jobs in
two new tables, S3 file storage, signed URLs, a queue worker, and
last-write-wins upsert. That design cannot be built under this task's
constraints — it requires a migration, two new permission keys, new routes and
an OpenAPI regeneration, all of which were out of scope here.

Three points where this foundation deliberately diverges, each of which is a
decision the coordinator still owns:

| Lane 4 | This foundation | Why |
| --- | --- | --- |
| Async job rows, polled | Synchronous, stateless | Job rows need a migration |
| Upsert, last-write-wins on `external_id` | Insert-only; duplicates are detected and skipped | `tickets` has no `external_id` column, and overwriting is destructive |
| `build:tickets:import` / `build:tickets:export` | `build:tickets:create` / `build:tickets:view` | Neither lane-4 key exists in the permission catalog |

Lane 4 is not implementable as written: the upsert key `external_id` is not a
column on `build.tickets`. Adopting it needs a schema change first.

## Shape

```
preview(file)  ->  TicketImportPreview { rows, issues, confirmationToken }
commit(file, confirmationToken)  ->  TicketImportReport { rows, summary }
export()  ->  { filename, contentType, content }
```

`preview` reads; it never writes and never opens a transaction.

### The confirmation boundary

`preview` returns a `confirmationToken`: a SHA-256 over the tenant, the project
and the exact rows that would be written. `commit` re-parses the file it is
given, recomputes the token, and refuses with 409 unless it matches.

A caller therefore cannot commit content it did not preview, and cannot commit a
file that changed between the two calls. The token is tenant-bound, so it cannot
be replayed into another organisation.

### Row addressing

Errors name a row and a field. CSV rows are numbered as a spreadsheet numbers
them — the header is row 1, the first record is row 2. JSON array elements are
numbered from 1.

### Duplicates

Titles are normalised (trim, lowercase, collapse inner whitespace) and matched
two ways: against earlier rows in the same file, and against live tickets in the
target project. Either way the row is skipped and reported. Nothing is ever
overwritten or deleted.

### Batching and rollback

Rows are written in batches of 100, capped at 1000 rows and 2 MB per file.

- `atomic` (default) — one transaction. Any failure rolls the whole import back
  and every row is reported `ROLLED_BACK`.
- `partial` — one transaction per batch. Failed batches are reported `FAILED`;
  successful batches stand.

### Idempotency

`commitImport` takes an optional `idempotencyKey`. When present it claims a fence
in the existing `command_fences` table under command `build.import.tickets`, with
the confirmation token as the request hash. A completed retry replays the stored
report; a same-key-different-file retry is 422; a concurrent duplicate is 409.

A fully rolled-back import releases its fence, so the key can be retried.

**If a controller is added carrying `@Idempotent`, do not also pass
`idempotencyKey` to the service** — the route interceptor and the service would
claim the same fence twice and the second claim would 409.

## Tenant and authorization

- Every read and write is filtered on `orgId` and `projectId`. Proven by
  rendering the generated SQL in `ticket-import-reads.spec.ts` and
  `ticket-export.service.spec.ts` — no database involved.
- `assertProjectAccess` gates both entry points; a project outside the caller's
  organisation is a 404, not a 403.
- Import additionally requires `build:tickets:create`.
- Export reads through `ScopedRead` on `build:tickets:view`, so a caller scoped
  to `own` exports only their own rows, and a caller scoped to `none` gets an
  empty file with no query issued.

## What a file may carry

Importable fields are an allowlist:

`title` (required), `description`, `type`, `status`, `priority`, `startDate`,
`dueDate`, `points`, `storyPoints`, `estimate`, `completionPercentage`,
`clientVisible`, `link`.

The row schema is `.strict()`, so any other populated column is a row error
naming that column. `orgId`, `projectId`, `ticketNumber` and `reporterId` are
derived from the request, never from the file. There is no way to set an
assignee, a parent, an epic, a cycle or a customer — all of which are
cross-reference fields.

`status` is validated against the target project's configured
`project_statuses`; an unconfigured value is a row error rather than a foreign
key violation surfacing as a 500.

Columns an export writes but an import may not assign — `ticketNumber`, `id`,
`orgId`, `projectId`, `createdAt`, `updatedAt` — are dropped silently on read, so
an export round-trips back through an import without unknown-field errors.

## Files

Backend — `backend/src/modules/build/import-export/`

| File | Role |
| --- | --- |
| `csv-source.ts` | RFC 4180 parse and serialise |
| `import-source.ts` | CSV/JSON to numbered rows |
| `dto/ticket-import.schemas.ts` | Field allowlist, coercion, row schema |
| `ticket-import-preview.ts` | Validation, duplicates, confirmation token |
| `ticket-import-reads.ts` | Tenant-scoped reads |
| `ticket-import-batches.ts` | Bounded batch insert |
| `ticket-import-report.ts` | Report model |
| `ticket-import.service.ts` | Preview, confirm, fence, run |
| `ticket-export.service.ts` | Scoped export |
| `build-import-export.module.ts` | Provider module, **not registered** |

Frontend — `frontend/features/build/import-export/`

| File | Role |
| --- | --- |
| `import-export-contract.ts` | Zod response contracts |
| `import-export-client.ts` | Three `apiClient` calls, each contracted |
| `import-preview-model.ts` | Pure view model for a preview and a report |

## Integration prerequisites

Each of these is deliberately not done here.

1. Register `BuildImportExportModule` in `BUILD_MODULES` (`build.module.ts`).
   It must not go last — `ProjectsByIdModule` has to stay last or its bare
   `build/:projectId` route shadows every literal sibling.
2. Add a controller. Routes the frontend client already expects:
   - `POST /build/:projectId/import-export/tickets/preview`
   - `POST /build/:projectId/import-export/tickets`
   - `GET  /build/:projectId/import-export/tickets/export`
3. Decide the permission keys. Using `build:tickets:create` and
   `build:tickets:view` needs no catalog change. Adding
   `build:tickets:import` / `build:tickets:export` as lane 4 specifies means a
   permission catalog entry, a frontend `PermissionKey` union entry, and a
   re-run of `check:permission-keys`.
4. Regenerate the OpenAPI contract once the controller exists.
5. Add React Query hooks in `hooks/api/build/` and query keys. None exist yet.
6. Add the navigation entry and the UI.
7. Decide how the file reaches the server. The service takes the file as a
   string in the request body, bounded at 2 MB. Anything larger needs the
   multipart or pre-signed upload path lane 4 describes.

## Known risks

- **Duplicate CSV parser.** `src/modules/inventory/import-export/csv.util.ts`
  already exists. It was not reused: it returns `Record<string,string>` rows and
  so cannot express a row number or a column-count mismatch, both of which this
  design reports on. There are now two general CSV parsers in the backend.
  Promoting one to `src/common/` is the clean fix and was out of scope here.
- **Duplicate detection is a sequential scan.** The existing-title lookup
  normalises with `regexp_replace(lower(btrim(title)))`, which no index serves.
  It is bounded by the file's row count, but a 1000-row import against a large
  project will scan. An expression index would fix it — that needs a migration.
- **Title is a weak identity.** Without an `external_id` column, re-importing an
  edited export creates nothing and reports every row as a duplicate. Real
  round-trip editing needs lane 4's `external_id`.
- **No job history.** A stateless design has nothing to show a user after the
  response is gone. Lane 4's job rows are what provide that.
- **`rank` is left at its column default**, so every imported ticket shares rank
  1000 and the board orders them by id. Deliberate; no invented ordering.
- **The module is unregistered**, so nothing exercises this code at runtime.
  Every test is a unit test against fakes. It has never run against Postgres.

## Verification

Backend: 82 tests in 6 suites. Frontend: 37 tests in 3 suites. Both typecheck
clean. `eslint` clean on both directories. No migration was created or modified.
