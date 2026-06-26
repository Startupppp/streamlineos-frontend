# Frontend Strangle / Cutover Manifest

Status: cutover plan for the first three CRM domains migrated to the NestJS backend.
Domains migrated in this wave: **contacts**, **targets**, **csat**.
Generated: 2026-06-26.

This manifest is the authoritative checklist for removing the legacy Next.js
route handlers for the migrated domains and repointing the kept TanStack Query
hooks at the NestJS backend. Follow it in order; the EDIT-BEFORE-DELETE steps
are build-breakers if skipped.

---

## 0. HARD PRECONDITION (read first)

> **Do NOT delete anything in this manifest until the NestJS backend is
> deployed AND `NEXT_PUBLIC_API_URL` is set in the frontend environment.**

The kept hooks for these domains call `apiClient`, which resolves its base URL
from `NEXT_PUBLIC_API_URL` (see `lib/api-client.ts`, `EXTERNAL_API`). When that
env var is set, requests to `/contacts`, `/targets`, `/csat` go to the backend
with a `Bearer` token; when it is **unset**, `apiClient` falls back to the
same-origin `/api` route handlers we are about to delete. Deleting the route
files while `NEXT_PUBLIC_API_URL` is unset (or the backend is down) makes the
following three features return **404**:

- CRM Contacts (`app/(dashboard)/crm/contacts/page.tsx`, `app/(dashboard)/crm/page.tsx`, create-contact dialog)
- Targets / leaderboard (consumed via `useTargets` & friends)
- CSAT surveys (customer-executive surveys UI)

Cutover order: **deploy backend → set `NEXT_PUBLIC_API_URL` → verify the three
features work against the backend → THEN apply the deletions below.**

---

## 1. LEADS IS EXCLUDED FROM THIS WAVE

Only **8 of the 31** CRM route handlers have been migrated to the backend in
this wave. **LEADS is explicitly NOT migrated.** Do not delete any
`app/api/leads/**` route files, any `server/queries/crm-*` leads logic, or any
leads hooks. The shared CRM type file `types/crm/leads.ts` carries the
multi-domain `Target*` interfaces and `ClientAccount`/`ClientActivity` types and
must stay regardless of the targets cutover.

Anything not listed in `filesToDelete` below stays in the frontend.

---

## 2. FILES TO DELETE

Delete only after the precondition in section 0 is satisfied.

### Route handlers (all safe — the kept hooks now route to the backend)

**contacts**
- `app/api/contacts/route.ts`
- `app/api/contacts/search/route.ts`
- `app/api/contacts/[contactId]/route.ts`
- `app/api/contacts/[contactId]/vcard/route.ts`

**targets**
- `app/api/targets/route.ts`
- `app/api/targets/my/route.ts`
- `app/api/targets/leaderboard/route.ts`
- `app/api/targets/[targetId]/route.ts`
- `app/api/targets/[targetId]/history/route.ts`

**csat**
- `app/api/csat/route.ts`
- `app/api/csat/[surveyId]/route.ts`
- `app/api/csat/[surveyId]/responses/route.ts`

### Server query files (only those with no remaining consumers)

- `server/queries/crm-targets.ts`
  - **EDIT-BEFORE-DELETE.** First remove the barrel re-export line in
    `server/queries/crm.ts` (line 5: `export * from "./crm-targets";`).
  - Verified: `getTargets / getMyTargets / getTargetLeaderboard /
    getTargetHistory` are referenced only by the 5 targets route files (via the
    `@/server/queries/crm` barrel) and defined only in this file. A repo-wide
    grep for `crm-targets` matches only `server/queries/crm.ts` (the barrel
    line) — no direct importers of the file path exist. After the route files
    are deleted and the barrel line is removed, this file has zero consumers and
    is safe to delete.

No `lib/services/**` files are deleted — none are domain-specific to these three
domains (csat logic lives inline in routes; contacts/targets logic lives in
`server/queries/**`).

---

## 3. FILES TO KEEP (shared / mixed — DO NOT DELETE)

These look domain-specific but are still imported elsewhere. Deleting any of
them breaks the build.

### `server/queries/crm.ts` (the CRM barrel) — EDIT ONLY

Do not delete. Make exactly one edit: **remove line 5
`export * from "./crm-targets";`**. Keep the remaining re-exports
(`crm-deals`, `crm-contacts`, `crm-clients`, `crm-people`, `crm-dashboards`).

Still imported by other-domain routes after the edit:
- `app/api/clients/[clientId]/route.ts`
- `app/api/clients/[clientId]/activities/route.ts`
- `app/api/deals/[dealId]/route.ts`
- `app/api/deals/stats/route.ts`
- `app/api/deals/route.ts`
- `app/api/crm/support-dashboard/route.ts`
- `app/api/crm/sales-dashboard/route.ts`
- `app/api/crm/people-slugs/route.ts`
- `app/api/crm/people/[entityId]/route.ts`
- `app/api/crm/customer-executive/route.ts`

### `server/queries/crm-contacts.ts` — KEEP

`getContacts` / `getContact` become dead *functions* once the contacts +
vcard routes are deleted, but the file is still re-exported by the shared
barrel via `export * from "./crm-contacts";`, and that barrel is imported by 14
non-contacts routes (targets — until its barrel line is removed —, clients,
deals, crm dashboards/people). Removing this file would require also editing the
barrel line for `crm-contacts`, which other domains have not migrated yet. Leave
the file in place (low cost). Note it also imports `ContactFilters` from
`@/types/crm`.

### `types/crm/contacts.ts`, `types/crm/leads.ts`, `types/crm/index.ts`, `types/crm.ts` — KEEP (shared multi-domain types)

- `types/crm/contacts.ts` mixes contacts types (`Contact`, `ContactFilters`,
  `ContactSearchResult`, `PaginatedContacts`, `CreateContactInput`,
  `UpdateContactInput`) with many non-contacts CRM types (`CrmOrganization`,
  `OrgHierarchyNode`, `OrgRollup`, `CustomerExecutiveDashboard`,
  `SupportDashboard`, campaign/channel/content types). Reached via barrels
  `types/crm/index.ts` → `types/crm.ts` and imported by ~20 non-contacts files
  (deals/clients/analytics/activities/organizations hooks, server queries,
  several feature components and customer-executive pages). The kept contacts
  hook still imports `Contact`/`ContactFilters`/etc. from `@/types/crm`.
- `types/crm/leads.ts` holds the `Target*` interfaces (`Target`,
  `TargetHistory`, `TargetFilters`, `TargetLeaderboardEntry`,
  `CreateTargetInput`, `UpdateTargetInput`, `LogTargetProgressInput`) plus
  `ClientAccount`/`ClientActivity`/`RelatedLead`. The `Target*` types stay —
  still consumed by the kept hook `lib/api/hooks/crm/activities.ts` (which now
  routes to the backend). Leads is not migrated this wave anyway.
- `types/crm/index.ts` re-exports `./leads`, `./deals`, `./contacts`.
- `types/crm.ts` re-exports `./crm/index`. Imported app-wide as `@/types/crm`.

### Kept hook files (STAY — route to backend via `apiClient`)

- `lib/api/hooks/crm/contacts.ts` — contacts-only; all 6 hooks call `/contacts…`
  paths. Exported via `lib/api/hooks/crm/index.ts`; consumed by the CRM contacts
  page, CRM index page, and the create-contact dialog.
- `lib/api/hooks/crm/activities.ts` — **MIXED**. Contains the targets hooks
  (`useTargets`, `useMyTargets`, `useTargetLeaderboard`, `useTargetHistory`,
  `useCreateTarget`, `useUpdateTarget`, `useLogTargetProgress`) AND non-targets
  hooks for territories (`/crm/territories`), custom fields
  (`/settings/custom-fields`), and web lead forms (`/crm/web-forms`). Keep
  whole.
- `lib/api/hooks/crm/clients.ts` — **MIXED**. Contains the csat hooks
  (`useCsatSurveys`, `useCsatSurveyResponses`, `useCreateCsatSurvey`,
  `useUpdateCsatSurvey`, `useDeleteCsatSurvey`) plus many non-csat client hooks
  (`/clients/**`, `/customer-executive/sla`). The `CsatSurvey` / `CsatResponse`
  interfaces are declared inline here and consumed by the customer-executive
  surveys UI. Keep whole. Csat query keys live in `lib/query-keys.ts`
  (`queryKeys.csat`).

### Shared infrastructure & DB schema imported by the deleted routes — DO NOT TOUCH

`@/lib/api/helpers`, `@/lib/cache`, `@/lib/db`, `@/lib/db/branch-filter`,
`@/lib/audit-log`, `@/lib/constants/roles`,
`@/server/actions/create-notification`, and especially the DB schema:
- `@/lib/db/schema` (targets / targetHistory / users tables — global schema).
- `@/lib/db/schema/crm` (barrel imported by ~34 frontend files across many
  domains). The csat tables `csatSurveys` / `csatResponses` (defined in
  `lib/db/schema/crm/contacts.ts`) are still read by `lib/services/cs-health.ts`
  (org CSAT health score) and re-exported via the crm barrel — the schema must
  stay even after the csat API is deleted.

---

## 4. EXTRA CONSUMER TO REPOINT — vcard direct hrefs (REQUIRED)

The vcard endpoint has **no hook**. It is downloaded via plain anchors that
bypass `apiClient`, so they will NOT pick up `NEXT_PUBLIC_API_URL`
automatically. In `app/(dashboard)/crm/contacts/page.tsx`:

- line 304: `<a href={`/api/contacts/${contact.id}/vcard`} download>`
- line 374: `<a href={`/api/contacts/${contact.id}/vcard`} download>`

After `app/api/contacts/[contactId]/vcard/route.ts` is deleted these hardcoded
same-origin hrefs 404. **Before/with the deletion**, repoint both to the NestJS
backend vcard endpoint. Because vcard is a file download authenticated with the
backend Bearer token (not the same-origin cookie), the correct fix is to fetch
the blob through `apiClient.download("/contacts/<id>/vcard")` (which already
attaches the Bearer token via `authedFetch`) and trigger a client-side download,
rather than relying on a bare `<a href>` that the browser navigates to without
the Authorization header. A named handler (e.g. `handleDownloadVcard`) that
calls `apiClient.download` and creates an object URL is the repo-consistent
approach. Do not leave a bare backend `<a href>` — it would download
unauthenticated and 401 against the backend.

---

## 5. API-CLIENT ROUTING PLAN (`lib/api-client.ts`)

### Current behaviour (verified)

`lib/api-client.ts` today is **all-or-nothing**:

```
const SAME_ORIGIN = "/api";
const EXTERNAL_API = process.env.NEXT_PUBLIC_API_URL;
// buildUrl: const base = EXTERNAL_API ?? SAME_ORIGIN;
// authedFetch: if (EXTERNAL_API) attach Bearer from getBackendToken(); 401 → refresh once
```

If `NEXT_PUBLIC_API_URL` is set, **every** `apiClient` call goes to the backend
with a Bearer token. If unset, every call stays same-origin with cookies. During
a strangle (only 8/31 routes migrated) we need **per-prefix** routing: the
migrated prefixes go to the backend with Bearer; everything else stays
same-origin with cookies — even while `NEXT_PUBLIC_API_URL` is set.

### Required change — prefix-based routing

Introduce a migrated-prefix allowlist and make `buildUrl` + `authedFetch` decide
per request, reusing the existing `getBackendToken` / `authedFetch` logic
unchanged for the matched prefixes.

1. Add the allowlist constant (extend as more domains migrate):

```ts
const MIGRATED_PREFIXES = ["/contacts", "/targets", "/csat"] as const;

function isMigrated(path: string): boolean {
  if (!EXTERNAL_API) return false;
  return MIGRATED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`),
  );
}
```

   Match on a path boundary (`===`, `"/prefix/"`, `"/prefix?"`) so `/contacts`
   and `/contacts/123` and `/contacts/search` match, but unrelated prefixes such
   as a hypothetical `/contacts-archive` do NOT.

2. `buildUrl` chooses base per request:

```ts
function buildUrl(path: string, params?: Record<string, unknown>): string {
  const base = isMigrated(path) ? (EXTERNAL_API as string) : SAME_ORIGIN;
  const url = `${base}${path}`;
  // ...unchanged query-string handling...
}
```

3. `authedFetch` attaches the Bearer token (and does the 401 refresh-once
   retry) **only for migrated paths**; same-origin paths keep using the cookie
   only. Thread the migrated flag through (e.g. derive it from the URL, or pass
   `isMigrated(path)` into `authedFetch`):

```ts
async function authedFetch(url: string, init: RequestInit, useBackend: boolean): Promise<Response> {
  const headers = new Headers(init.headers);
  if (useBackend) {
    const token = await getBackendToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }
  let res = await fetch(url, { ...init, headers, credentials: "include" });
  if (useBackend && res.status === 401) {
    cachedToken = null;
    const token = await getBackendToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
      res = await fetch(url, { ...init, headers, credentials: "include" });
    }
  }
  return res;
}
```

   Each verb wrapper (`get`/`post`/`put`/`patch`/`del`/`upload`/`download`)
   computes `isMigrated(url)` once and passes the resulting URL (from
   `buildUrl`) plus the flag into `authedFetch`. `credentials: "include"` stays
   on every request so same-origin cookie auth is unaffected.

### Net effect

| Request path                        | Base                      | Auth                         |
| ----------------------------------- | ------------------------- | ---------------------------- |
| `/contacts`, `/contacts/**`         | `NEXT_PUBLIC_API_URL`     | Bearer (backend token)       |
| `/targets`, `/targets/**`           | `NEXT_PUBLIC_API_URL`     | Bearer (backend token)       |
| `/csat`, `/csat/**`                 | `NEXT_PUBLIC_API_URL`     | Bearer (backend token)       |
| everything else (e.g. `/deals/**`)  | `/api` (same-origin)      | cookie (`credentials:include`)|

This keeps the 23 not-yet-migrated routes working against the existing Next.js
handlers while the 3 migrated domains route to NestJS — the core requirement of
a safe strangle. As each future domain migrates, add its prefix to
`MIGRATED_PREFIXES` and delete its route files.

> Note: the vcard download anchors (section 4) bypass `apiClient` entirely, so
> this routing change does not cover them — they must be converted to
> `apiClient.download("/contacts/<id>/vcard")` so `isMigrated` + Bearer apply.

---

## 6. EXECUTION ORDER (checklist)

1. Deploy NestJS backend; confirm `/contacts`, `/targets`, `/csat` endpoints
   (incl. public `POST /csat/:surveyId/responses`) respond.
2. Set `NEXT_PUBLIC_API_URL` in the frontend env.
3. Apply the `lib/api-client.ts` prefix-routing change (section 5).
4. Repoint the two vcard hrefs to `apiClient.download` (section 4).
5. Verify the three features end-to-end against the backend (list/create/edit/
   delete + vcard download + csat survey + leaderboard).
6. Edit `server/queries/crm.ts`: remove line 5 `export * from "./crm-targets";`.
7. Delete the 12 route files + `server/queries/crm-targets.ts` (section 2).
8. Run build + lint; fix any fallout (there should be none if the grep
   verification holds).

CSAT note: `POST /csat/:surveyId/responses` is currently **unauthenticated** in
the legacy route (no `withAuth`) — public response submission. The backend must
preserve that public-submit semantics. Because this hook still goes through
`apiClient` and `/csat` is in the migrated allowlist, the Bearer token will be
attached when present; the backend endpoint itself must allow anonymous
submission.
