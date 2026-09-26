# Lane 5 — Requests

## R1 — next.config.ts: redirect /portal to /build/client-portal

**File:** `frontend/next.config.ts`

**Change:** Add a redirect from the old `/portal` internal portal listing to the new canonical `/build/client-portal`:

```js
{ source: '/portal', destination: '/build/client-portal', permanent: false }
```

**Reason:** `10-internal-portal-projects.md` disposition is MOVE. The old `(authenticated)/portal/page.tsx` stays as a redirect target during migration but must redirect authenticated users to the new canonical. This unblocks criterion 1 of `10-internal-portal-projects.md`.

---

## R2 — next.config.ts: redirect /portal/[projectId] to /build/[projectId]/client-portal

**File:** `frontend/next.config.ts`

**Change:** Add a redirect from the old per-project portal view to the canonical project client-portal page with preview mode:

```js
{ source: '/portal/:projectId', destination: '/build/:projectId/client-portal?mode=preview', permanent: false }
```

**Reason:** `10-internal-portal-project.md` disposition is MOVE. The `(authenticated)/portal/[projectId]/page.tsx` must redirect to `/build/[projectId]/client-portal?mode=preview`. This unblocks criterion 1 of `10-internal-portal-project.md`.

---

## R3 — build-project-catalog.ts: add updates route to project nav

**File:** `frontend/lib/build/nav/build-project-catalog.ts`

**Change:** Confirm or add the `project-updates` nav destination pointing to `/build/[projectId]/updates` with `requiredPermission: "build:updates:view"`.

**Reason:** Needed to satisfy the route census for `10-project-updates.md` C1.

---

## R4 — build-project-catalog.ts: confirm chat route nav registration

**File:** `frontend/lib/build/nav/build-project-catalog.ts`

**Change:** Confirm or add `project-chat` nav destination pointing to `/build/[projectId]/chat` with `requiredPermission: "chat:channels:read"`.

**Reason:** Needed to satisfy the route census for `10-project-chat.md` C1.

---

## R5 — build-work.ts: extend updates.list key factory to accept a params object

**File:** `frontend/lib/query-keys/build-work.ts`

**Change:** Update `updates.list` signature to match `changeRequests.list`:

```ts
updates: {
  list: (projectId: number, params?: QueryKeyParams) =>
    params === undefined
      ? ([...base, "projects", projectId, "updates"] as const)
      : ([...base, "projects", projectId, "updates", params] as const),
},
```

**Reason:** `useProjectUpdates` now accepts `{ authorId?, from?, to? }` filter params. Without filter
dimensions in the key, different filter combinations share the same cache entry. After this change,
`hooks/api/build/project-updates.ts` can use the same pattern as `change-requests.ts` (pass
`activeFilters` as the second arg). Until then, the current workaround uses the base key (no filter
dimension) so the URL state is wired but cache is not yet filter-segmented.
