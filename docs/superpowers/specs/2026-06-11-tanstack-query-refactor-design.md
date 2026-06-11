# TanStack Query + Single Axios Client Refactor

**Status:** Approved 2026-06-11
**Scope:** Standardize all client-side data access on TanStack Query v5 hooks backed by a single shared axios client. Eliminate duplicate clients and stray `fetch()` calls.

## Audit Summary

The codebase is already substantially aligned with the target architecture:

| Component | State |
|---|---|
| `@tanstack/react-query` | v5.90.12 installed |
| `QueryClient` wiring | `components/providers/query-provider.tsx` mounted via `app/layout.tsx` |
| Default config | `staleTime: 2min`, `gcTime: 10min`, `refetchOnWindowFocus: false`, `retry: 1`, mutations `retry: 0` |
| Hook coverage | 34 domain hook files under `lib/api/hooks/` |
| Query key registry | `lib/query-keys.ts` (374 lines, hierarchical, typed) |
| Shared axios client | `lib/api-client.ts` with error-extracting response interceptor |

What needs work:

1. **Dead duplicate axios client** at `lib/api/client.ts` (no interceptor, zero importers — confirmed via grep). Pure orphan to remove.
2. **Stray client `fetch()` for data ops** — 3 sites: blog feed pagination, landing form submission, public interview booking flow.
3. **File uploads (8) and blob downloads (2)** — currently use native `fetch`. User decision: migrate to axios for consistency.
4. **`HydrationBoundary` / `prefetchQuery`** — not used anywhere. Three high-value server pages benefit.
5. **`staleTime` tuning** — every hook uses the 2-min default; long-lived data (orgs, roles, RBAC, branches) should use 30 min.

## Explicit Exceptions (not refactored)

| File | Why kept on `fetch` |
|---|---|
| `features/analytics/visit-tracker.tsx` | Uses `navigator.sendBeacon` as primary path with `fetch + keepalive` as fallback. Both patterns are essential for unmount/unload analytics and cannot be expressed via axios or TanStack Query. |
| `features/marketing/landing-pages/page-detail-content.tsx:73` | `fetch(...)` appears inside a `<script>` string snippet embedded into published landing pages. It runs in the *visitor's* browser, not in this app — axios isn't bundled there. |
| `app/api/*` route handlers and server components | Server-side data access — out of scope; this refactor targets client interactivity only. |

## Architecture

### Single Axios Client

`lib/api-client.ts` is canonical. The dead duplicate at `lib/api/client.ts` is deleted (no importers).

The client gains two narrow helpers for the migrations in Phase 3:

```ts
async function upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
  const res = await _axios.post<T>(url, formData, {
    ...config,
    headers: { ...(config?.headers ?? {}) }, // axios sets multipart boundary automatically when body is FormData
  });
  return res.data;
}

async function download(url: string, config?: AxiosRequestConfig): Promise<Blob> {
  const res = await _axios.get<Blob>(url, { ...config, responseType: "blob" });
  return res.data;
}
```

Both attach to the `apiClient` const export. No new modules.

### Hook Layer Pattern

Existing convention (e.g., `lib/api/hooks/accounting.ts`) is preserved:

```ts
export function useFoo(id: string) {
  return useQuery({
    queryKey: queryKeys.domain.detail(id),
    queryFn: () => apiClient.get<Foo>(`/domain/${id}`),
  });
}

export function useUpdateFoo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: UpdateFooVars) => apiClient.patch<Foo>(`/domain/${vars.id}`, vars.payload),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.domain.detail(vars.id) });
      qc.invalidateQueries({ queryKey: queryKeys.domain.list() });
    },
  });
}
```

New hooks added by this refactor follow the same shape.

### Server-side Prefetch

`lib/api/server-query-client.ts` (new) provides a per-request `QueryClient` factory for server components:

```ts
import { QueryClient } from "@tanstack/react-query";

export function getServerQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { staleTime: 1000 * 60 * 2 } },
  });
}
```

Server components call `prefetchQuery` against this client, then wrap children in `<HydrationBoundary state={dehydrate(qc)}>`. Because hooks call `/api/*` via axios with relative URLs, prefetch on the server uses the existing server query functions in `server/queries/*` directly (no HTTP round trip).

## Phased Execution

### Phase 1 — Consolidate axios client

- Delete `lib/api/client.ts` (orphan).
- Add `upload()` and `download()` helpers to `lib/api-client.ts`.

### Phase 2 — Migrate client `fetch()` data calls

| File | Replacement |
|---|---|
| `components/blog/post-feed.tsx:34-53` | `useInfiniteBlogFeed({ category, tag, search })` in new `lib/api/hooks/blog.ts` |
| `features/landing/landing-form.tsx:111` | `useSubmitLandingForm()` mutation in new `lib/api/hooks/landing.ts` |
| `app/(public)/interview-booking/[token]/page.tsx:32, 57` | `usePublicInterviewBooking(token)` + `useConfirmInterviewBooking(token)` in new `lib/api/hooks/public-booking.ts` |

Register `queryKeys.blog`, `queryKeys.landing`, `queryKeys.publicBooking` in `lib/query-keys.ts`.

### Phase 3 — Migrate uploads and downloads to axios

| File | Change |
|---|---|
| `components/blog/cover-image-upload.tsx:34` | `apiClient.upload()` |
| `components/projects/create-ticket-dialog.tsx:102` | `apiClient.upload()` |
| `components/storage/file-upload.tsx:54` | `apiClient.upload()` |
| `components/timesheets/log-time-dialog.tsx:124` | `apiClient.upload()` |
| `features/chat/channel-info-panel.tsx:69` | `apiClient.upload()` |
| `features/chat/message-panel.tsx:192` | `apiClient.upload()` |
| `features/chat/new-group-dialog.tsx:130` | `apiClient.upload()` |
| `features/settings/settings-profile.tsx:69` | `apiClient.upload()` |
| `app/(dashboard)/ceo/qr-code/page.tsx:304` | `apiClient.download()` |
| `app/(dashboard)/settings/data-hub/page.tsx:160` | `apiClient.download()` |

### Phase 4 — HydrationBoundary (DEFERRED, not done in this pass)

After audit, all three candidate pages (`dashboard/page.tsx`, `accounting/page.tsx`, `billing/invoices/page.tsx`) are top-level `"use client"` components that depend on session-aware hooks, `useSearchParams`, and a `DashboardGate` role check. Two of three (accounting, dashboard) lack matching `server/queries/*` functions for the queries the page actually uses — adding them is independent work, not a data-fetching refactor.

Doing this properly would require, per page: (a) splitting `page.tsx` into server (prefetch) + client (consume), (b) reading session via `auth()` in the server half, (c) writing new server query functions for `useInvoiceStats`, `useAccounts`, `useJournal`, `useTrialBalance`, and `useDashboardStats` (5+ new server functions), (d) keeping `DashboardGate` and `useSearchParams` working across the boundary. That is a separate, larger refactor.

**Recommended follow-up PR:** Land the missing `server/queries/{invoice-stats,accounting,dashboard}.ts` functions, then add `HydrationBoundary` to the three pages in one pass.

### Phase 5 — Per-domain staleTime tuning

Bump `staleTime` to 30 min in hooks for naturally long-lived data:

- `lib/api/hooks/organization.ts`
- `lib/api/hooks/rbac.ts`
- `lib/api/hooks/roles.ts`
- `lib/api/hooks/branches.ts`

All other hooks retain the global 2-min default.

### Phase 6 — Verify

- Run `npx tsc --noEmit` (or `pnpm typecheck`) — must pass.
- Run lint (`pnpm lint` or repo equivalent) — must pass.
- Report any remaining direct `fetch(` in client code (expected: visit-tracker only).

## Out of Scope (YAGNI)

- No new polling / `refetchInterval` — audit found no live-update data needs.
- No optimistic updates added speculatively. Existing mutations remain as-is; future optimistic patches are per-feature decisions.
- No refactor of the 34 existing hook files' structure. Only `staleTime` is touched in Phase 5.
- No conversion of `app/api/*` server route handlers or server components beyond Phase 4 prefetch additions.

## Success Criteria

- `lib/api/client.ts` deleted, no broken imports. ✅
- `grep -E "fetch\(['\"\`]/api/" app components features` returns only the two documented exceptions. ✅
- TypeScript (`npx tsc --noEmit`) passes. ✅
- ESLint passes on touched files. ✅
- Phase 4 (HydrationBoundary) deferred per scope decision above.
