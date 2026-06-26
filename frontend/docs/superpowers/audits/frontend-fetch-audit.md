# Frontend Direct-Fetch Audit

Date: 2026-06-25
Scope: `app/**`, `components/**`, `features/**`
Goal: Find every direct `fetch()` / `axios` / `XMLHttpRequest` network call in the UI tree that bypasses the centralized `lib/api-client.ts` `apiClient` or a TanStack Query hook in `lib/api/hooks/**`.

## Method

- Grepped `fetch(`, `axios`, `XMLHttpRequest`, `EventSource`, `new WebSocket` across `app/`, `components/`, `features/`.
- Manually classified each hit as a genuine straggler vs an acceptable case.
- Note: the vast majority of grep hits are `refetch()` from TanStack Query results (error/empty-state retry buttons), which are NOT network calls and are excluded.

## Overall verdict

The data layer is **highly centralized**. Nearly all client data access flows through the `apiClient` wrapper (`lib/api-client.ts`) consumed by TanStack Query hooks in `lib/api/hooks/**`. `apiClient` is the single place that handles the backend bearer token, 401 retry, URL building, and error parsing.

Direct network calls in the UI tree are confined to a small, explainable set:

1. **Public (unauthenticated) pages** under `app/(public)/**` — offer acceptance, application status, careers apply. These are token-based public endpoints that intentionally must NOT carry the authenticated backend token that `apiClient` injects. Calling `apiClient` here would be wrong (it would attach a session bearer token). These are reasonable, but could still be standardized into dedicated public hooks for consistency (they currently use `useState`/`useEffect` fetching, which also violates the "no useEffect data fetching" project rule).

2. **One authenticated dashboard straggler** — `hr/recruitment/candidates/import/page.tsx` posts directly to `/api/hr/recruitment/candidates/bulk-import` instead of going through a mutation hook. This is a genuine straggler worth migrating to a TanStack mutation in `lib/api/hooks/hr`.

3. **Non-API fetches (acceptable)** — analytics beacon and blob download:
   - `features/analytics/visit-tracker.tsx` — `navigator.sendBeacon` with a `fetch` keepalive fallback to `/api/platform/visit`. Fire-and-forget telemetry; not a data-layer concern.
   - `features/hr/documents/document-table.tsx` — `fetch(doc.fileUrl)` to pull file blobs (from storage URLs) for client-side ZIP packaging. This fetches arbitrary storage URLs, not the app API, so `apiClient` does not apply.

4. **Server-side route handlers (acceptable, out of scope)** — every `fetch(` under `app/api/**/route.ts` (Google OAuth/token, Google Calendar, Razorpay orders) is server-side and correctly talks to third-party services directly. These are not UI components.

5. **`apiClient` itself + backend-token fetch (acceptable, by design)** — `lib/api-client.ts` contains the only legitimate raw `fetch` calls for the data layer: the backend-token fetch and `authedFetch`.

## Genuine stragglers (UI calling the network directly, not via apiClient/hooks)

| File | Detail |
| --- | --- |
| `app/(dashboard)/hr/recruitment/candidates/import/page.tsx` (line 160) | Authenticated dashboard page POSTing directly to `/api/hr/recruitment/candidates/bulk-import` via raw `fetch`. Should be a TanStack mutation hook in `lib/api/hooks/hr`. |
| `app/(public)/offer/[token]/page.tsx` (lines 46, 65) | Public page; `useEffect` GET `/api/public/offer/:token` and PATCH `/respond` via raw `fetch`. Public token endpoint (no auth token), but uses useEffect fetching. |
| `app/(public)/application-status/[token]/page.tsx` (line 39) | Public page; `useEffect` GET `/api/public/application-status/:token` via raw `fetch`. |
| `app/(public)/careers/[orgSlug]/jobs/[jobId]/apply/page.tsx` (line 35) | Public page; POST `/api/public/careers/:orgSlug/jobs/:jobId/apply` via raw `fetch` on submit. |

## Acceptable cases (excluded from the straggler list)

| File / Location | Why acceptable |
| --- | --- |
| `lib/api-client.ts` (lines 10, 23, 29) | The centralized client + backend-token fetch + 401-retry. By design. |
| `features/analytics/visit-tracker.tsx` (line 45) | `sendBeacon` with `fetch` keepalive fallback for fire-and-forget telemetry; not data fetching. |
| `features/hr/documents/document-table.tsx` (line 306) | `fetch(doc.fileUrl)` against external/storage URLs to build a client-side ZIP; not the app API. |
| `app/api/**/route.ts` (billing/razorpay, hr/integrations/google-calendar, calendar/create-meet, hr/recruitment/interviews/schedule, integrations/google/callback) | Server-side route handlers calling third-party services (Google OAuth/Calendar, Razorpay). Server-side, out of UI scope. |
| All `refetch()` hits across `components/**` and `app/**` | TanStack Query result method bound to retry buttons — not a network primitive. |

## Recommendations

- Migrate `candidates/import/page.tsx` bulk-import to a TanStack mutation hook in `lib/api/hooks/hr` for consistency, cache invalidation, and uniform error handling.
- Replace the three public pages' `useState`/`useEffect` fetching with dedicated public TanStack Query hooks (a thin un-authed fetcher, or extend `apiClient` with a `public` variant that skips the bearer token). This also resolves the "no useEffect data fetching" project rule.
- Leave the analytics beacon, the blob/ZIP download, the server route handlers, and `apiClient` itself as-is.
