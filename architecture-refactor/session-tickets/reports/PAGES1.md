# PAGES1 Lane Report — Route Catalog Sync

**Date:** 2026-08-30  
**Scope:** `frontend/PAGES.md` — bring in line with today's file-system changes and enforce §8 route-ownership rules.

---

## What Moved / Was Deleted Today (Verified on Disk)

| Action | Old path | New path | Disk status |
|---|---|---|---|
| Deleted | `/crm/calendar` | — | CONFIRMED DELETED |
| Deleted | `/knowledge-base` | — | CONFIRMED DELETED |
| Deleted | `/payroll/me` | — | CONFIRMED DELETED (error.tsx + loading.tsx + page.tsx) |
| Deleted | `(portal)/projects` | `(portal)/client-portal` | CONFIRMED DELETED / REPLACED |
| Deleted | `(portal)/projects/[projectId]` | `(portal)/client-portal/[projectId]` | CONFIRMED DELETED / REPLACED |
| Moved | `(settings)/directory` | `/directory/settings` + `/directory/settings/[personId]` | CONFIRMED EXISTS ON DISK |

The `/me/pay` route already existed on disk and is correctly listed in PAGES.md. The `/payroll/me` nav entry losing `requiredPermission` is correct — `/me/*` routes are universal and carry no `@RequireModule`.

The `(portal)/client-portal` surface uses `useExternalPortalProjects` (renamed hook) and `portalApiClient` (portal token auth). The `(authenticated)/portal` internal surface uses `useCan("build:portal:view")` and session JWT. These are intentionally distinct; the hook collision was the only issue and is resolved.

---

## Changes Made to PAGES.md

1. **Total routes**: 598 → 597 (net: -5 deleted + 2 added client-portal routes + 2 directory/settings already in body but uncounted in Module Index → -1 net from Module Index perspective)

2. **Route-Ownership Violations section**: Replaced the 4 open violations table with a resolved-violations table. Added:
   - Open question note about `/directory/workers` universality ambiguity (explicitly blocked from resolution)
   - Clarification note that `(authenticated)/portal` and `(portal)/client-portal` are intentionally distinct

3. **Module Index** updated:
   - CRM: 57 → 56
   - Knowledge-base (legacy): row removed
   - Payroll: 24 → 23
   - Directory: 4 → 6 (directory/settings and directory/settings/[personId] were already in file body but not counted in Module Index)
   - Portal group: stays at 3 (2 retired + 2 added = net zero)

4. **Retired rows** (marked `[x]` with `[RETIRED date: reason]`):
   - `/crm/calendar`
   - `/knowledge-base`
   - `/payroll/me`
   - `(portal)/projects`
   - `(portal)/projects/[projectId]`

5. **Added rows**:
   - `(portal)/client-portal` — `usePortalGuard`, `useExternalPortalProjects`
   - `(portal)/client-portal/[projectId]` — `usePortalGuard`, `usePortalProjectOverview`

---

## §8 Compliance Audit — Route-Ownership

All prior route-ownership violations are now resolved on disk. No new violations were found in today's changes.

Remaining §8 DoD columns (`L C E D F P Perm States`) for most pages remain `?` — this is a pre-existing condition across the catalog that was not within this lane's scope.

---

## Open Question (Explicitly Blocked)

**`/directory/workers` universality:** Root `CLAUDE.md` §8 includes "people directory" in the universal employee self-service surface, but also places workforce governance at `/directory/workers`. The code currently gates it on `directory:workers:view`. Widening is the unsafe direction; left as-is. Needs explicit product decision before code changes.

---

## Real Route Count

**597 active routes** (5 retired, 2 added net -3 from previous 598, + 2 directory/settings promoted from body-only to Module Index count net -1).

Lint and tests: not run (per CLAUDE.md §3 — only `tsc --noEmit` is default proof, and this lane made no code changes).
