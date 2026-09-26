# Lane 5 — Requests

## ORCHESTRATOR RULING (2026-09-26)

### R1 — REJECTED. The redirect target does not exist.

`/build/client-portal` is not a route. `app/(authenticated)/build/client-portal/` does not exist on
disk, and `lib/build/build-route-manifest.ts` has no entry for it — the only client-portal route in
the manifest is `/build/[projectId]/client-portal` (line 26). Adding
`{ source: '/portal', destination: '/build/client-portal' }` would 404 every external client who
signs in, because `app/(authenticated)/portal/page.tsx` is a real page rendering `PortalListPage`,
not a redirect stub, and a `next.config.ts` redirect **shadows** the page file at that path.

### R2 — REJECTED. The target is a different surface, and a shipped test exists to keep them apart.

`/build/[projectId]/client-portal` renders `ClientVisibilityPage` — the **internal management**
surface gated on `build:clientvisibility:manage`. `/portal/[projectId]` renders
`PortalDashboardPage` — the **external portal** surface gated on `build:portal:view`. These are not
two names for one page.

`frontend/features/build/client-portal/portal-separation.test.tsx:183` is
`BSN-03-052 — internal management and external portal identity separation`, and it asserts exactly
what this redirect would undo: `ClientVisibilityPage` "does not call any external portal data hook so
internal preview cannot acquire portal-client data" (:208), `PortalListPage` "does not call the
internal management hook so an external client cannot access management data" (:249), and — the
negative control — "`build:portal:view` alone does not grant management access" (:223). Sending
portal users to the management route sends them to a page they are denied on and collapses an
identity boundary that test exists to defend.

There is also no `mode=preview` handling to receive them: `client-visibility-page.tsx:115` reads only
`searchParams.get("section")`.

**Consequence for your boxes:** C1 on `10-internal-portal-projects.md` and
`10-internal-portal-project.md` cannot be ticked on these redirects. If the MOVE disposition is
genuinely intended, it needs the target pages built first and the identity separation preserved —
that is real work, not a redirect line. Until then those two C1 boxes are a measured BLOCKED, and the
measurement is the missing `app/(authenticated)/build/client-portal/` directory plus BSN-03-052.

### R3 — ALREADY SATISFIED. No edit needed.

`lib/build/nav/build-project-catalog.ts:85-90` already has `project-updates` → `${basePath}/updates`
with `requiredPermission: "build:updates:view"`. The route file exists and
`build-route-manifest.ts:80` has the entry. `build:updates:view` verified in the real catalog at
`backend/src/modules/rbac/permissions/build.ts:332`.

### R4 — ALREADY SATISFIED as a registration, but the permission is yours to decide.

`build-project-catalog.ts:187-192` has `project-chat` → `${basePath}/chat`, and
`build-route-manifest.ts:25` has the route. But its `requiredPermission` is **`build:view`**, not the
`chat:channels:read` you asked for, and I did not change it — because with no extension entry for
`/build/[projectId]/chat`, that nav permission **is** the live route gate that
`enforceRouteAccess("/build/[projectId]/chat")` resolves. Changing it changes production access.

The facts you need: `BuildProjectChatPage` reads chat channels, which the backend gates on
`chat:channels:read` (`backend/src/modules/rbac/permissions/chat.ts:5`). So today a user holding
`build:view` without any chat key passes the route gate and then takes 403s from the API — the
gate-vs-API mismatch, which surfaces as an error or empty state rather than a denial. `chat:channels:read`
appears in `ROLE_DEFAULT_PERMISSIONS` for at least one role slug but is **not** in
`UNIVERSAL_MEMBER_PERMISSIONS`, so tightening the gate to it would hide Chat from any role template
that omits it. Decide which you want, check the role templates that matter, and tell me — the catalog
edit is mine to apply. Do not tick C1 on chat until this is settled, and note it under C3's
permission clause either way.

### R5 — ALREADY APPLIED, and your workaround is already gone.

`lib/query-keys/build-work.ts:200-205` — `updates.list(projectId, filters?: QueryKeyParams)` now
mirrors `changeRequests.list` (:94). Landed in commit `1e4aa5e3f`. And
`hooks/api/build/project-updates.ts:58` already passes `filters`, so reads are filter-segmented.
Lines 96 and 115 deliberately invalidate on the **base** key — that is correct, not a leftover: a
non-exact invalidation of the base matches every filter variant. Nothing further to do here.

---

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
