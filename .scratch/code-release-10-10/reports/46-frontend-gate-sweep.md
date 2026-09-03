# 46 — the six red frontend gates from the first full sweep

**Scope.** The six frontend gates recorded red in ORCHESTRATION.md §"First full gate sweep at head":
`check:effect-fetches`, `check:dead-code`, `check:command-catalog`, `check:routes`,
`check:file-sizes`, `check:over-300`. Ticket 41 box 3/box 7 precondition.

**Territory.** `hooks/api/**`, `app/(authenticated)/build/**`, `contracts/route-bundle-manifest.json`
and `features/marketing/**` were off limits this round. Two of the six gates fail on defects that
live entirely inside `hooks/api/**` or inside a generated contract another lane owns; those are
recorded below as accepted residuals with owners, not fixed.

---

## Result

| gate | before | after | number |
|---|---|---|---|
| `check:effect-fetches` | exit 1 | **exit 0** | 1 site → 0 (5,280 files scanned) |
| `check:routes` | exit 1 | **exit 0** | 1 handler → 0 (655 route dirs, 2 allowlisted handlers re-checked) |
| `check:dead-code` | exit 1 | **exit 0 at my last commit** | 1 unclassified → 0 |
| `check:over-300` | exit 1 | **exit 0 at my last commit** | 521 → 519, baseline 519 |
| `check:command-catalog` | exit 1 | exit 1 | 4 defects → **3**; UNCLASSIFIED 1 → 0 |
| `check:file-sizes` | exit 1 | exit 1 | 3 files over 500 → **2** |

All six `check:*:self-test` runs are exit 0 (25 / dead-code / 25 / 13 / 45 / 26 assertions).
`tsc --noEmit` exit 0, **0 errors**. `eslint` exit 0 on all nine changed source files.

**Two gates went red again after my last commit, from another lane's uncommitted work** — see §6.
Neither regression is in a file I touched, and both are proved by name below.

---

## 1. `check:effect-fetches` — the one real site

`components/layout/command-palette.tsx:177` held the canonical forbidden shape:

```
useEffect(() => { apiClient.get("/search", { q }).then(setState) }, [debouncedQuery])
```

The gate had printed `✔ No useEffect-driven API fetches found` over it until rule 3 was added on
2026-09-03. The code was wrong, not the gate, so the code moved.

`GET /search` is `x-exposure: universal` in the contract — any authenticated member, subject from the
token — so there is no permission to gate on and a `useCan` would have been wrong. The fetch is now
`features/command-palette/hooks/use-global-search.ts`: a `useQuery` keyed through a new
`queryKeys.globalSearch` factory, `staleTime: 30_000`, `placeholderData: keepPreviousData` so the
list does not blank between keystrokes, and the `queryFn`'s `signal` is **passed** to `apiClient.get`
(ORCHESTRATION records two hooks that destructured `signal` and dropped it — this one does not).

The hook sits in `features/command-palette/` rather than `hooks/api/` because that directory has a
dedicated owner this round. The palette is the only consumer of `GET /search`.

Debounce went 280ms → 300ms on the way past; `frontend/CLAUDE.md` §T7 requires ≥300ms.

## 2. `check:dead-code` — one unclassified export, deleted rather than excused

At head the gate reported `types/projects/shared.ts:PaginatedResponse`, not the two
`hooks/api/meetings-ai.ts` exports the brief expected — those had already been resolved by another
lane before I started.

`PaginatedResponse<T>` had **zero importers**: knip flags it, and a repo grep of the barrel path
`@/types/projects` finds none. The four other occurrences of the name
(`hooks/api/inventory/reports-types.ts`, `hooks/api/inventory/operations.ts`,
`hooks/api/inventory/reports.ts`, `hooks/api/inventory/purchase-orders.ts`) are independent local
declarations of the same envelope, not importers.

Deleted. A `KEEP` verdict was available and would have been laundering — the reason string would
have had nothing behind it. `WIRE` was not available: wiring it would mean editing four
`hooks/api/inventory/*` files, which is both another lane's territory and out of PRD scope.

**Honest note on the §10 proof standard.** knip proves it and `tsc --noEmit` is exit 0. A production
`next build` was **not run** — the deletion is of a type-only `export interface`, which cannot carry
a side-effect import, and a build here would overwrite the `.next/` directory the Web-Vitals /
route-bundle-budget lane depends on. That trade is stated rather than hidden.

## 3. `check:command-catalog` — 1 of the 4 was a gate blind spot; 3 are a stale contract

**Fixed (1).** `hooks/api/ai.ts:187 useGenerateJobDescription` — UNCLASSIFIED, "no apiClient call
found in the hook body". True and not a defect: the request goes through `streamAiText` (SSE), which
never touches `apiClient`. Recorded in the gate's existing `OFF_CLIENT_HOOKS` map — the documented,
hand-verified escape for exactly this — with the key checked against **the decorator at head**, not
the snapshot, because the snapshot holds no `/stream` operations at all:

```
src/modules/ai/core/controllers/hr-ai.controller.ts:112
  @Post("generate-jd/stream")
  @RequirePermission("hr:interviews:manage")     ← the key the hook declares
```

`OFF_CLIENT_HOOKS` carries stale-entry detection, so the moment that hook gains an `apiClient` call
or disappears, the entry fails the gate.

**NOT fixed (3) — and the frontend is not what is wrong.** `hooks/api/git-integration.ts:60/70/80`
are reported as `[WRONG-KEY] declares "integrations:git:manage" but the contract requires
"settings:manage"`. **`contracts/openapi.json` is stale for these routes.** At head:

```
src/modules/settings/settings-deprecated-routes.controller.ts
  @Post("integrations/git")             @RequirePermission("integrations:git:manage")
  @Patch("integrations/git/:id")        @RequirePermission("integrations:git:manage")
  @Delete("integrations/git/:id")       @RequirePermission("integrations:git:manage")
```

Three independent proofs that the snapshot predates backend commit `27e901ec`
("move the module-owned surfaces off the global settings path, and give their keys an owner"):

1. the snapshot's `operationId` is `SettingsController_createGitConnection`, but at head the handler
   lives on `SettingsDeprecatedRoutesController`;
2. all four routes carry `@Deprecated(...)` at head, and the snapshot flags none of them
   `deprecated`;
3. the canonical path `/integrations/git/connections` exists at head
   (`@Controller("integrations/git")`) and is **absent** from the snapshot.

Frontend commit `4768441bc` ("repository connections are an integrations key, not organization
administration") deliberately followed that backend move. Changing the hooks to `settings:manage`
would break correct code to satisfy a stale input, and `STRICTER_KEYS` would be a false statement
(the two keys are different, not nested).

> **ACCEPTED RESIDUAL — `check:command-catalog`, 3 WRONG-KEY.**
> **Cause:** `frontend/contracts/openapi.json` is behind backend head for the four
> `/settings/integrations/git` routes.
> **Owner:** the orchestrator, at the `openapi:check` regenerate-and-diff step already scheduled for
> quiesce (ORCHESTRATION names this as orchestrator-only and a ticket-41 STEP, not a defect).
> **Deadline:** before ticket 41 box 7 closes.
> **Expected result:** exit 0 with no frontend change. `openapi:generate` boots the Nest app; I did
> not run it, per that instruction.

**Two findings this gate cannot see**, handed to the `hooks/api` owner:

- `hooks/api/git-integration.ts:50 useGitConnections` gates a **read** on `settings:manage`, but
  `GET /settings/integrations/git` declares `@RequirePermission("integrations:git:view")` at head.
  Same drift, opposite direction, and the gate misses it because it classifies mutation hooks
  against the snapshot and the snapshot agrees with the wrong value.
- All four hooks call the **deprecated** alias `/settings/integrations/git`. The canonical path is
  `/integrations/git/connections`, and root CLAUDE.md §8 says a moved surface updates every link.

## 4. `check:routes` — the gate was wrong in both directions, and is now tighter

`app/api/media/image/route.ts` is the only non-NextAuth handler. It is an **auth bridge**: an `<img>`
cannot send an `Authorization` header, so a storage key renders through the app's own origin and the
handler attaches the session's `backendJwt`, forwards to `GET /storage/image` and hardens the content
type. It holds no business rule and touches no database, it has its own route test and a CSP contract
test, and ~110 render sites reach it via `lib/utils.ts:storageObjectUrl`. Root CLAUDE.md §5 permits
"NextAuth / **auth-bridge**"; the gate encoded only the first half. Report 40 already recorded the
remedy as "an allowlist entry with the proxy justification, or it moves".

The old `PERMITTED = /[/\\]api[/\\]auth[/\\]/` was **also too wide**: it passed any file under
`app/api/auth/**` unread, so `app/api/auth/contacts/route.ts` would have been waved through. That
hole is now closed — this change is a net tightening, not a relaxation.

The replacement is an exact-path allowlist, never a pattern, and an entry is not a pass on its own.
Each allowlisted handler is re-read every run and must still hold the properties that make it a
bridge: it reads the session, and it exports no write. A stale entry fails.

**Bite proof against a copy of the real app tree** (not only the fixture):

| mutation | result |
|---|---|
| unchanged real-tree copy | `[]` |
| add `api/contacts/route.ts` | flagged |
| add `api/auth/contacts/route.ts` | flagged — the old regex passed this |
| real bridge grows `export async function POST` | flagged "a write through the frontend is business logic" |
| real bridge deleted | flagged "stale allowlist entry" |

`scan()` is exported for that, so the CLI body now sits behind an entry-point guard instead of
running on import. Self-test 7 → 13 assertions.

## 5. `check:file-sizes` and `check:over-300` — two splits, both on real seams

**`features/hr/cases/cases-page-content.tsx` 501 → 246.** The file held two independent screens. The
Disciplinary Actions tab has its own read (`useDisciplinaryActions`), its own cursor stack, and its
own employee-name resolution (`useOrgMembersByIds` → `memberById`) that the Cases tab never touches.
That is a module boundary, not a line count.

```
cases-page-content.tsx        501 -> 246
cases-filter-bar.tsx                148   options + the three type guards that narrow a Radix string
disciplinary-actions-tab.tsx        144   its own query, pagination and columns
case-columns.tsx                     56
```

**`features/hr/exit/exit-management-page.tsx` 307 → 182.** One file, two responsibilities: a paginated
list, and the approval workflow — three mutations (HR review, final review, withdrawal), five pieces
of confirmation state and the four sheets that drive them. The list reads none of that state.

```
exit-management-page.tsx      307 -> 182
use-resignation-review.ts           141
resignation-review-sheets.tsx        57
```

The card now receives `review.request*` callbacks instead of raw `setState`.

`check:over-300` went 521 → **519 = the baseline, exit 0**. The baseline was not touched. For the
record, the +2 was not two identifiable regressions: comparing the over-300 set at the
baseline-setting commit `aabb74705` against head shows **76 files entering and 74 leaving**, almost
entirely the "thin every authenticated route module" refactor relocating page bodies from
`app/(authenticated)/**/page.tsx` into `features/**/*-page.tsx`. There is no single culprit to fix,
so the ratchet was restored by shortening two files that genuinely exceeded the §7 target.

> **ACCEPTED RESIDUAL — `check:file-sizes`, 2 files.**
> `hooks/api/notifications-inbox.ts` (534) and `hooks/api/notifications-inbox.test.ts` (663).
> **Cause:** both sit in `hooks/api/**`, a dedicated owner's territory this round; report 37 already
> records them as "violations to split, not exceptions to grant".
> **Owner:** the `hooks/api` lane.
> **Deadline:** before ticket 41 box 7 closes.
> **Explicitly NOT done:** no row was added to `scripts/file-size-exceptions.md`. That registry has
> never granted a frontend exception and granting one here would be the laundering this release
> forbids. The gate is red because it is working.

## 6. Two gates re-reddened after my last commit — by another lane, named

Re-running the sweep after commit `a632f33f4` shows `check:dead-code` and `check:over-300` red again.
Neither is in a file I touched, and both come from the calendar/meetings lane's **uncommitted** work:

- `check:over-300` 519 → 520: the untracked
  `frontend/features/calendar/meeting-follow-up-panel-streaming.test.tsx` at **371 lines**. Set diff
  against my green run shows exactly one file entering and exactly my two leaving.
- `check:dead-code` exit 1: `hooks/api/meetings-ai.ts:useMeetingFollowUp` is now UNCLASSIFIED. That
  file is modified-not-committed by that lane, which is migrating the follow-up panel to streaming
  (`meeting-follow-up-draft.tsx`, `meeting-follow-up-stream-parse.ts` and two new specs are all
  untracked beside it).

Both belong to that lane's own change and will resolve with it. Recorded here so the next sweep does
not attribute them to this one.

## 7. Cross-territory findings I was not allowed to fix

1. **`hooks/api/git-integration.ts:50`** gates a read on `settings:manage`; head declares
   `integrations:git:view`. §3 above.
2. **All four git-connection hooks call a deprecated alias.** §3 above.
3. **`features/hr/exit/exit-management-page.tsx:handleViewLetter` calls `apiClient.get` directly
   inside a component.** Not a `useEffect`, so `check:effect-fetches` does not see it, but
   frontend CLAUDE.md §2 says all client fetching goes through a Query hook. It is a user-initiated
   action, so the fix is a `useMutation` in `hooks/api/hr/` — that lane's file. I left the call
   verbatim when splitting the file.
4. **Eighth attribution incident, this time inbound.** My uncommitted deletion in
   `frontend/types/projects/shared.ts` was swallowed by another agent's commit `4ade571fa`
   ("fix(build): only redirect PM workspace paths that actually have a mirror"), whose own message
   claims "drop an unused offset-pagination type". Nothing was lost — the content is correct and
   committed — but the authorship is wrong. My own commit for that change therefore shows only the
   `scripts/` half. Recorded because the register tracks these.

## 8. What I did not do

- Did **not** raise or move any baseline, ratchet or exception registry. `check:over-300`'s
  `BASELINE = 519` is untouched; `scripts/file-size-exceptions.md` is untouched and still empty.
- Did **not** run `openapi:generate` or edit `contracts/openapi.json`.
- Did **not** run a production `next build` — reason in §2.
- Did **not** run the jest suite. No spec covers the four files I created; the existing
  `components/layout/*` specs do not reach the command palette's search path.
- Did **not** touch `hooks/api/**`, `app/(authenticated)/build/**`,
  `contracts/route-bundle-manifest.json` or `features/marketing/**`.
- Did **not** change any public landing visual.

## Commands, verbatim

```
pnpm -C frontend check:effect-fetches      # 1 -> 0   exit 1 -> 0
pnpm -C frontend check:dead-code           # 1 -> 0   exit 1 -> 0   (re-reddened by another lane, §6)
pnpm -C frontend check:command-catalog     # 4 -> 3   exit 1 -> 1
pnpm -C frontend check:routes              # 1 -> 0   exit 1 -> 0
pnpm -C frontend check:file-sizes          # 3 -> 2   exit 1 -> 1
pnpm -C frontend check:over-300            # 521 -> 519 (baseline 519)  exit 1 -> 0   (§6)
pnpm -C frontend check:<each>:self-test    # all exit 0
heavy.sh 2 -- pnpm -C frontend type-check  # exit 0, 0 errors  (run twice)
npx eslint <the nine changed source files> # exit 0
```
