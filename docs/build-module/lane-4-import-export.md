# Build Module — Import / Export Architecture

## Scope

Bulk data movement for the Build module: importing tickets from external sources (CSV, JSON, Jira, Linear) and exporting project data to portable formats. This document covers the server-side job model, frontend progress UX, and the contract between them.

## Guiding constraints

- Imports and exports are long-running: they run as background jobs, not inside the request transaction.
- All jobs are tenant-scoped. A job row carries `orgId`; every query it issues must include it.
- The server uses last-write-wins for upsert (same `onConflictDoUpdate` pattern as comment drafts).
- The frontend polls for progress rather than holding a long-lived connection.

---

## Server-side job model

### Schema additions required

```
build_import_jobs
  id            serial PK
  org_id        text NOT NULL   -- tenant scope
  project_id    integer NOT NULL REFERENCES projects(id)
  created_by    text NOT NULL   -- userId
  source        text NOT NULL   -- 'csv' | 'json' | 'jira' | 'linear'
  status        text NOT NULL   -- 'pending' | 'running' | 'done' | 'failed'
  total         integer         -- rows to process (filled after parse)
  processed     integer DEFAULT 0
  failed_rows   integer DEFAULT 0
  error         text            -- first fatal error, if any
  result_url    text            -- signed URL to error report file, if any
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()

build_export_jobs
  id            serial PK
  org_id        text NOT NULL
  project_id    integer NOT NULL REFERENCES projects(id)
  created_by    text NOT NULL
  format        text NOT NULL   -- 'csv' | 'json'
  status        text NOT NULL   -- 'pending' | 'running' | 'done' | 'failed'
  download_url  text            -- pre-signed URL, filled on completion
  expires_at    timestamptz     -- when the signed URL expires
  created_at    timestamptz NOT NULL DEFAULT now()
  updated_at    timestamptz NOT NULL DEFAULT now()
```

Both tables need `(org_id, project_id, created_at DESC)` composite indexes and RLS policies that restrict reads to the owning tenant.

### Job lifecycle

```
POST /build/projects/:projectId/import        → creates a pending import job, returns { jobId }
POST /build/projects/:projectId/export        → creates a pending export job, returns { jobId }
GET  /build/projects/:projectId/import/:jobId → poll: returns job row
GET  /build/projects/:projectId/export/:jobId → poll: returns job row + downloadUrl when done
```

The actual processing runs in a background worker (Bull/pg-boss queue). The controller only enqueues; the worker processes. This keeps controller response times under 200 ms regardless of data size.

### Parse-then-validate pipeline (imports)

1. **Upload** — client POSTs the file as `multipart/form-data`. Server stores it in S3 under `imports/{orgId}/{jobId}/raw`.
2. **Parse** — worker reads the raw file, maps columns to ticket fields.
3. **Validate** — each row is validated against the ticket creation schema; invalid rows are collected, not aborted.
4. **Upsert** — valid rows are upserted in batches of 100 using `INSERT … ON CONFLICT DO UPDATE` keyed on `(org_id, project_id, external_id)` where `external_id` is the source system's identifier.
5. **Report** — if any rows failed validation, a CSV error report is written to S3 and its signed URL is returned in `result_url`.

### Conflict resolution

The deterministic policy is **last-write-wins on `external_id`**. If the same source record is imported twice:
- Status, priority, type, and title are overwritten.
- Assignments are merged: the imported assignee wins only if the ticket has no current assignee.
- Comments are always appended; they are never deduped or deleted.

---

## Frontend contract

### Query keys

```typescript
buildWorkQueryKeys.projects.importJobs.list(projectId)
buildWorkQueryKeys.projects.importJobs.detail(projectId, jobId)
buildWorkQueryKeys.projects.exportJobs.list(projectId)
buildWorkQueryKeys.projects.exportJobs.detail(projectId, jobId)
```

### Response DTOs (Zod)

```typescript
const importJobSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  source: z.enum(["csv", "json", "jira", "linear"]),
  status: z.enum(["pending", "running", "done", "failed"]),
  total: z.number().nullable(),
  processed: z.number(),
  failedRows: z.number(),
  error: z.string().nullable(),
  resultUrl: z.string().url().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const exportJobSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  format: z.enum(["csv", "json"]),
  status: z.enum(["pending", "running", "done", "failed"]),
  downloadUrl: z.string().url().nullable(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
```

### Polling strategy

- Poll interval: 2 s while `status === 'running' || status === 'pending'`.
- Stop polling when `status === 'done' || status === 'failed'`.
- Use `useQuery` with `refetchInterval` set to the polling interval, cleared on terminal state.
- Do not poll if the tab is not visible (`refetchIntervalInBackground: false`).

```typescript
export function useImportJobStatus(projectId: number, jobId: number | null) {
  return useQuery({
    queryKey: buildWorkQueryKeys.projects.importJobs.detail(projectId, jobId),
    queryFn: ({ signal }) => apiClient.get(
      `/build/projects/${projectId}/import/${jobId}`,
      undefined,
      signal,
      importJobContract,
    ),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "done" || status === "failed") return false;
      return 2_000;
    },
    refetchIntervalInBackground: false,
  });
}
```

---

## Frontend UX

### Import flow

1. User opens "Import" dialog from the project toolbar.
2. Dialog shows a file picker with format selection (CSV / JSON / Jira export / Linear export).
3. On submit: `POST /build/projects/:projectId/import` → `{ jobId }`.
4. Dialog transitions to a progress view showing a progress bar (`processed / total`).
5. On completion: show summary row counts. If `failedRows > 0`, show a "Download error report" link pointing to `resultUrl`.
6. On failure: show `error` text with a retry button.

### Export flow

1. User clicks "Export" from the project overflow menu.
2. A dropdown asks for format (CSV / JSON).
3. `POST /build/projects/:projectId/export` → `{ jobId }`.
4. A toast or banner shows "Preparing export…" while polling.
5. On completion: toast updates to "Export ready" with a download link to `downloadUrl`.
6. Links expire after 24 hours (`expiresAt`). Stale links show "Export expired — generate a new one".

---

## Permissions

- `build:tickets:import` — required to start an import job.
- `build:tickets:export` — required to start an export job.
- Both are project-scoped; org owners and project managers are granted both by default.
- The job detail endpoint checks `orgId` equality; no other user can read another user's job.

---

## Open questions

- **Rate limiting**: currently no limit on concurrent import jobs per org. Recommend capping at 1 running import per project.
- **Jira / Linear auth**: OAuth token handshake for source system access is out of scope here; this document assumes a file-based export (ZIP from Jira, JSON from Linear) rather than direct API pull.
- **Large files**: files over 50 MB should be pre-signed upload URLs (PUT to S3 directly) rather than multipart through the API server.
