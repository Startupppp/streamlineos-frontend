# 17 — The query key carries the tenant

**What to build:** A person who belongs to two organizations cannot see one organization's rows while looking at the other, even for the moment between switching and refetching. Tenancy is in the cache key, so a cross-organization read is structurally impossible rather than prevented by remembering to clear.

**Blocked by:** None — can start immediately

**Status:** done

**Grounding (2026-08-28, evidence not instruction — re-read at source):** `frontend/lib/query-keys/base.ts` is one line — `export const queryKeyBase = ["streamlineos"] as const;` — and every one of the 15 factory files spreads from it. `frontend/CLAUDE.md` §2 already documents this exactly: *"`base` carries no tenant segment, so a two-org user shares one cache across a switch and can see Org A's rows in Org B: an org switch MUST `queryClient.clear()` … guard that regression until the org id moves into `base`."* Some factories already thread it by hand (`queryKeys.access.me(orgId, userId)`). The backend equivalent is already correct — `CACHE_KEYS.*` factories interpolate `orgId`, and a migration to `*ForOrg` wrappers was tried at ~50 sites and fully reverted as a no-op. Do not repeat that on the backend.

---

## ⚠️ Premise correction (2026-08-28) — the defect described above was already fixed by a different mechanism

The grounding and `frontend/CLAUDE.md` §2 were **stale**. The tenant segment is not missing; it is in the query **hash** rather than in the key array:

- `frontend/lib/query-scope.ts` exports `scopedQueryKeyHashFn(scope)`, which hashes every key as `JSON.stringify([scope, queryKey])` where `scope` is `authenticated:<orgId>:<userId>`.
- `createAppQueryClient` (`components/providers/query-provider.tsx:43`) and `createServerQueryClient` (`lib/prefetch/server-query-client.ts`) both install it, so client and server agree.
- `QueryProvider` mounts `<ScopedQueryProvider key={scope}>`, so a new scope **remounts the subtree with a brand-new, empty `QueryClient`**. There is no "moment between switching and refetching".

A second correction: of the six factories the session brief named as "duplicates to collapse", **three are not duplicates**. `roadmap.publicBoard(orgId)`, `kbAttachments.publicList(orgId, slug)` and `supportChatWidget.session(orgId, token)` serve the *public* routes `/roadmap/[orgId]`, `/knowledge/*` and `/live-chat/[orgId]`, where the viewer has no organization and `orgId` is the route's own tenant selector. Those keep their argument. Four factories the brief did **not** name were genuine duplicates and were collapsed.

**User decision (2026-08-28):** keep the hash as the mechanism and prove it, rather than threading `orgId` through all 17 factory files and ~1,000 call sites for a literal reading of criterion 1. `queryClient.clear()` stays at all eight call sites permanently as defence in depth.

## Acceptance criteria

- [x] The org id is a segment of the base key, so every factory inherits it without each one remembering.

  Satisfied by the **hash** segment, not an array segment — see the premise correction above; the key array is deliberately left tenant-free because `invalidateQueries` matches the array, not the hash. The load-bearing half of the criterion — *every factory inherits it without each one remembering* — is proved exhaustively for all 165 factory leaves by `lib/query-keys-registry.test.ts`, which walks the whole `queryKeys` object, invokes every factory, and asserts each produced key hashes differently under two organizations:

  ```
  PASS lib/query-keys-registry.test.ts
    query key registry — exhaustive walk
      √ walks at least 150 factory leaves across the registry
      √ all function calls succeed with placeholder arguments
      √ every produced key is a non-empty array starting with streamlineos
      √ every key hashes differently for org-a versus org-b — scope isolation holds for all factories
  ```

  The seven hand-threaded authenticated factories were collapsed onto the one pattern: `access.me()`, `access.simulate(targetUserId)`, `access.simulationCandidates(params)`, `hr.attendanceStatus()`, `hr.hub(today)`, `dashboard.*()` (16 factories), `notifications.lists/list/unreadList/unreadCount()`. A hand-typed key array in `useTodayActivities` became `dashboard.todayActivities()`.

- [x] `queryClient.clear()` on organization switch **stays** until the last factory is migrated, and is removed only in the same change that proves the last one is.

  All eight call sites kept: `hooks/common/auth-hooks.ts:105,157`, `components/providers/query-provider.tsx:62`, `features/settings/organization/org-danger-zone-section.tsx:181,202,229`, `leave-organization-control.tsx:89`, `archived-orgs-restore.tsx:40`. The isolation test below proves `clear()` is **no longer load-bearing**; the user ruled it stays permanently as defence in depth.

- [x] Server-side prefetch hydrates keys that match what the client reads — a prefetch whose key does not match hydrates an entry nobody can read, which has already happened here across five factories.

  `lib/prefetch/hydration-contract.test.ts` now exercises **all six** prefetch factories on disk (`prefetchAccess`, `prefetchRoles`, `prefetchWorkers`, `prefetchHrDocuments`, `prefetchHrAssets`, `prefetchPayrollRuns`) end to end: dehydrate on a server client, hydrate into the real `createAppQueryClient(...)`, assert `getQueryData` returns the payload. It also keeps the control case proving a plain `QueryClient` produces an entry the app can never look up.

- [x] Org-scoped `localStorage` caches carry the same segment; a cache outside Query is still a cache.

  `lib/org-scoped-storage.tsx` provides one choke point built from the **same** `authenticatedScope` string as the query cache, mounted by `QueryProvider`. Every `localStorage` call site under `frontend/` was audited and classified before anything moved. Org-owned caches now scoped: calendar hidden connection ids, project nav visibility, build view display options, chat drafts, KB article drafts. Deliberately **not** scoped: theme, density, panel-collapsed booleans, sidebar groups, column show/hide flags, FAB position — scoping a pure UI preference would reset a person's chrome on every switch for no safety gain. Already scoped and left alone: onboarding checklist, payroll setup draft, org-setup draft, HR document folders.

  Critically, the two module-level singleton stores (`let cache` / `let cacheRaw` / module-level `listeners`) were converted to per-key `Map` stores — changing only the storage key would have handed Org A's already-parsed value straight to Org B across the remount.

  ```
  PASS lib/org-scoped-storage.test.tsx
    useCalendarAccountFilters — cross-org isolation
      √ value written under Org A is invisible under Org B
      √ module-level cache does not leak: Org B starts with default after Org A writes
    useProjectNavVisibility — cross-org isolation
      √ value written under Org A is invisible under Org B
      √ module-level cache does not leak: Org B returns default after Org A writes
  ```

- [x] A test switches organizations without clearing and asserts no Org A entry is readable under Org B.

  `lib/query-scope-isolation.test.tsx` renders the **real** `QueryProvider`, writes under Org A through real factory keys, flips the mocked session to Org B, re-renders, and asserts every key reads `undefined` — with **no `clear()` call anywhere in the test**. It also asserts the Org B client is a different instance (the remount is half the guard), and carries a control case proving a plain `QueryClient` *does* expose the same data across scopes, so the test cannot pass vacuously.

- [x] The existing `query-keys-registry.test.ts` is extended rather than replaced, so a factory added later without the segment fails.

  All eight original shape assertions kept verbatim; the exhaustive walk was added beneath them.

**Combined run (this session):**

```
PASS lib/query-keys-registry.test.ts
PASS lib/org-scoped-storage.test.tsx
PASS lib/prefetch/hydration-contract.test.ts
PASS lib/query-request-policies.test.ts
PASS lib/query-scope-isolation.test.tsx

Test Suites: 5 passed, 5 total
Tests:       37 passed, 37 total
Time:        7.981 s
```

`pnpm -C frontend exec tsc --noEmit` — clean, exit 0.

`pnpm exec madge --circular` in `frontend/` — `✔ No circular dependency found!`

## Todo

- [x] Change `base` first and let the type system find the factories that hand-thread the org id; those are duplicates to collapse, not a second pattern to keep.

  Done in the equivalent form the premise correction requires: `base` was left alone and the seven authenticated hand-threading factory groups were collapsed instead, with `tsc` finding every call site because the parameters were removed rather than made optional. Three brief-named factories were **not** collapsed because they select a public tenant the viewer does not belong to.

- [x] Check the server-render path in the same change. A scope-prefixed key that only the client knows about is the failure mode that made every authenticated route render a spinner.

  Covered by extending `hydration-contract.test.ts` to all six factories, and by `scripts/check-query-scope.mjs` rule 3, which fails the build on any `lib/prefetch/` file that dehydrates from a client it did not get from `createServerQueryClient`.

- [x] Do not touch the backend `CACHE_KEYS` factories — they are already tenant-safe and the migration was reverted once.

  Not touched.

- [x] Set **Status** to `done` and update this ticket's row in [`../README.md`](../README.md)

## Guard added

`frontend/scripts/check-query-scope.mjs`, wired as `pnpm check:query-scope` and a step in `.github/workflows/frontend.yml`. It fails on (1) `new QueryClient(` outside the two sanctioned factories, (2) a stray `queryKeyHashFn` assignment, (3) a `lib/prefetch/` file dehydrating from an unsanctioned client.

```
$ node scripts/check-query-scope.mjs
✔  No query-scope violations found.

$ node scripts/check-query-scope.mjs --self-test
✔ self-test detected rule 1 — new QueryClient() outside sanctioned factories
✔ self-test detected rule 2 — queryKeyHashFn outside sanctioned files
✔ self-test detected rule 3 — dehydrate() in lib/prefetch/ without createServerQueryClient

✔ All 3 rules self-tested successfully — check-query-scope is live.
```

`frontend/CLAUDE.md` §2 was rewritten: it documented the stale mechanism and told future sessions to move the org id into `base`.

---

PRD: [`c28 — Organization-routed cells for 20M+ users`](../prd.md) · Candidate index: [`../README.md`](../README.md)
