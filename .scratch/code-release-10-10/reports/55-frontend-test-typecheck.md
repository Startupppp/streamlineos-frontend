# 55 — The frontend's 338 test files had never been in a typecheck

**Status:** DONE — gate landed, wired into CI, and at a **hard zero**. Nothing baselined.

Frontend twin of the backend's `check:test-typecheck` (backend commit `71d9f880`).

---

## 1. The hole

`frontend/tsconfig.json` — the only program `pnpm type-check` compiles — excludes:

```
"**/__tests__/**", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.ts", "**/*.spec.tsx"
```

and `type-check` is a bare `tsc --noEmit`. So **not one** of this package's test files
has ever been in a program.

Jest cannot stand in. The backend at least runs ts-jest with `isolatedModules`; the
frontend runs `next/jest`, which transpiles through **SWC**. SWC erases types outright
and has no diagnostics switch at all. A spec can call a method that no longer exists and
the suite stays green — proved end to end in §6.

## 2. Re-measured, not inherited

The handed-down figures were 841 / 702 / 139 over 335 files. Measured myself at head
(`4087afc41`), with `tsc --noEmit` over a config that is `tsconfig.json` with those four
globs dropped from `exclude`:

| | handed down | measured | note |
|---|---|---|---|
| test files | 335 | **338** | `find` over the four globs |
| total errors | 841 | **842** | |
| jest-dom registration | 702 | **703** | TS2339 on a jest-dom matcher |
| genuine | 139 | **139** | over **45** files — the one number that matched |

Method: `node --max-old-space-size=8192 node_modules/typescript/bin/tsc --noEmit -p <cfg>`,
exit **2**, diagnostics counted with `^file(line,col): error TS`. Every one of the 842 was
in a test file; **zero** were in application code.

## 3. The 703 — a configuration fix, not a suppression

`jest.setup.js` already does `import "@testing-library/jest-dom"`, whose
`types/index.d.ts` declares the global `jest.Matchers` augmentation. But `include` lists
only `.ts` / `.tsx` / `.mts`, so that `.js` file was outside every program and the
augmentation never loaded.

`tsconfig.test.json` puts it in the program with `files: ["jest.setup.js"]`. That is the
**real wiring** — the types come from the same import the runtime uses, `files` entries
are immune to `exclude`, and `checkJs` is off so the file contributes types without being
checked itself. Measured: **842 → 139**, one line of config.

Rejected alternatives: a `compilerOptions.types` array (would have to restate all eight
installed `@types` packages and silently drop any added later), and a hand-written
`.d.ts` (would leak jest types into the production program).

The self-test carries a **control** for this: `expect(document.body).toBeInTheDocument()`
must typecheck. If the registration ever regresses, 703 errors come back and that line is
the first thing to say so.

## 4. The 139 — all fixed, none baselined

`BASELINE = 0` in `scripts/check-test-typecheck.mjs`. Re-measured after fixing:
`tsc -p tsconfig.test.json` exit **0**, **0 errors**. The script still contains the ratchet
machinery and prints `!! THESE ARE BASELINED, NOT FIXED` on every run if the number is
ever raised above zero.

## 5. Vacuous specs this surfaced — the actual prize

### 5.1 `hooks/api/access/access-regression.test.ts` — "keeps audit pagination server-side"

Drove `useAuditLogs({ page: 3, pageSize: 25 })`. `AuditLogFilters` is **cursor**-keyed
(`cursor` / `limit`) and has neither field. The hook builds its key from
`filters as Record<string, unknown>`, so both bogus keys landed in the query key verbatim
and `expect.objectContaining({ page: 3, pageSize: 25 })` matched them.

**The assertion passed on keys the hook never sends.** The test named server-side
pagination and proved nothing about it. Rewritten against `cursor` / `limit`, and
extended to drive `queryFn` and assert the request that actually reaches
`apiClient.get` — brief rule 11's shape.

### 5.2 `hooks/api/access-membership-authority.test.ts` — "does not infer authority from a custom settings permission"

Built an `AccessResponse` with `permissions: ["settings:organization:manage"]`. The access
contract's permission surface has been `scopes: Record<key, DataScope>` for some time;
`permissions` is read by nothing. The test would have passed identically with the key
deleted, so it asserted nothing about permission-derived inference. Now sets the scope.

### 5.3 `features/__tests__/org-rbac-a11y.test.tsx` + `settings-a11y.test.tsx` — the RolesListPanel axe scans

Both built `pagination: { page, totalPages, total, limit }` — the pre-keyset shape — and
**omitted `page`, `onPrevious` and `onNext` entirely**, which the panel feeds straight to
`CursorPageControls`. Every axe scan in both files therefore ran over a paginated footer
rendered with an undefined page and two buttons with no handlers. Ten `expectNoAxeViolations`
calls were scanning a component state that cannot occur. Their `RoleListRow` rows were also
missing `rank`, `moduleKey`, `createdBy` and `description`, and dated with `Date` where the
contract says `string`.

Both files additionally still `jest.mock` `@/components/shared/data-table-pagination`,
which the panel no longer renders — an inert mock. Left in place (not a type error, and
removing it is a behaviour change in another ticket's file), but it is dead.

### 5.4 `hooks/api/notifications-inbox.test.ts` — the fixture behind `as Notification`

`makeNotif` carried **eight** fields `Notification` has not had (`isArchived`, `readAt`,
`actionUrl`, `referenceType`, `referenceId`, `actorId`, `actorName`, `actorAvatar`) and
was missing **five** it requires (`priority`, `category`, `sourceModule`, `link`,
`channel`). The `as Notification` made the compiler agree. Anything in that suite reading
`link`, `priority` or `category` was reading `undefined`. Cast removed, fixture rebuilt.

### 5.5 `hooks/api/mail-send-idempotency.test.tsx` — the payload was never a valid send

`DRAFT` and the reply fixture spelled the body field `body`; `SendMailBody` /
`ReplyMailBody` declare `bodyHtml`. The idempotency-key assertions still hold (the key is
derived from whatever body it is given), but the spec never exercised a real send payload.
This is exactly the `apiClient.post` cast the brief's rule 11 warns about.

### 5.6 `components/ui/__tests__/data-table-states.a11y.test.tsx` — a permission key that does not exist

The permission-denied empty state named **`accounting:invoices:view`**. There is no such
key in the catalog — the invoices surface is `accounting:receivables:*`. Root CLAUDE.md §5:
a key that is not in the catalog verbatim fails `useCan` forever. Here it was only a display
string, so the test passed; it is the class that matters. Its `access` prop also carried
only `{ denied: true }`, while `PermissionGate` is deliberately **three** answers
(`allowed` / `denied` / `pending`) precisely so a pending gate is not read as a refusal.

### 5.7 `features/__tests__/build-board-cards-a11y.test.tsx` — a prop that no longer exists

Rendered `KanbanTicketCard` with `dragStartRef={{ current: null }}`, replaced some time ago
by `isDragging`, and omitted `isDragging` (required). The card was being scanned in a state
the board never produces.

### 5.8 `features/build/views/list-view-group-rows.test.tsx`

Rendered `GroupRows` with two of its six required props — `projectKey`, `projectId`,
`projectStatuses` and `displayOptions` all absent.

### 5.9 Pre-keyset drift, three more places

`lib/prefetch/cache-across-navigation.test.tsx` (`{ page, totalPages, total }` +
`usePaginatedRoles({ page: 1 })`), `lib/query-request-policies.test.ts`
(`simulationCandidates({ page: 1 })`), `hooks/api/cursor-pagination-contract.test.tsx`
(an `unreadOnly` notification filter that is not in `NotificationListParams` — the real
unread selector is `section: "UNREAD"`, and the spec's own fetch mock keyed on the
nonexistent param).

### 5.10 Not vacuous, but worth naming

46 of the 139 were `TS2554`: seven cursor-pagination specs declared
`queryFn: () => unknown` for a `queryFn` the hooks call as `({ signal }) => …`. The
assertions themselves are real. `lib/storage-key-render-contract.test.ts` imported
`fs.globSync`, which the Node 22 it runs on has and the repo's `@types/node@20` does not
declare — it compiled only because nothing typechecked it. Replaced with
`readdirSync(..., { recursive: true })`, which both have.

## 6. Cross-territory finding — NOT fixed, needs an owner

**`useCancelEngagement` sends no optimistic-concurrency token.**
`hooks/api/directory/workers.test.tsx` passed `expectedVersion: 1` to it, which reads as
"cancel is version-guarded". It is not: the hook's `mutationFn` is
`apiClient.post(\`/directory/engagements/${id}/cancel\`)` — **no body at all** — and the
spec's own `toHaveBeenCalledWith(url)` (one argument) confirms it. Its siblings
`useUpdateEngagement` and `useTerminateEngagement` both require `expectedVersion`. Either
cancel should carry one or the asymmetry should be deliberate and written down. Directory
hooks territory; the misleading property is removed from the spec so it no longer implies a
guard that is not there.

## 7. Bite-proved hermetically, both directions

In a throwaway tree built with `git archive HEAD | tar -x` + a symlinked `node_modules`
(**never** the shared working tree — ~14 agents are in it):

| # | Proof | Result |
|---|---|---|
| 1 | clean HEAD | gate exit **0** |
| 2 | plant a **method that does not exist** (`queryKeys.hr.attendanceStatusList()`) and a **wrong argument shape** (`expectedVersion` back onto `useCancelEngagement`) | gate exit **1**, names both: `TS2551 Property 'attendanceStatusList' does not exist` and `TS2353 'expectedVersion' does not exist in type '{ workerEngagementId; workerId }'` |
| 3 | **jest over the same planted spec** | `Tests: 3 passed, 3 total`, exit **0** — the false green, demonstrated |
| 4 | **crashed tsc**: starve the spawn to `--max-old-space-size=24` | raw tsc exits **134**, `grep -c 'error TS'` = **0** (the false-pass shape); gate exits **1** with `tsc exited null (signal SIGABRT) with no parseable diagnostics. That is a CRASH, not a clean tree` |
| 5 | jest-dom control | `toBeInTheDocument()` typechecks; a regression fails the self-test |
| 6 | owned/foreign split | an error planted in a non-test file is printed under `NOT THIS GATE'S SCOPE` and does **not** decide the exit code |

Proof 4 was itself worth running: the first attempt patched the doc comment rather than
the spawn and the gate "passed". That miss is why the crash branch is proved against the
real call site.

## 8. Gates run

| Command | Exit | Number |
|---|---|---|
| `pnpm -C frontend type-check` | **0** | 0 errors (see note) |
| `pnpm -C frontend run check:test-typecheck` | **0** | 0 errors over 338 test files, hard gate at zero |
| `node scripts/check-test-typecheck.mjs --self-test` | **0** | all 5 properties proved |
| `pnpm exec eslint <28 changed files>` | **0** | 0 errors, 5 pre-existing warnings |
| `pnpm exec jest --runInBand <27 edited specs>` | **0** | **27 suites, 241 tests, all passing** |

Note on `type-check`: one run mid-session returned exit 2 with **3** errors, all in
`features/chat/message-panel.tsx` and `thread-panel.tsx` — production files another agent
had uncommitted modifications in at the time (brief rule 4). A later run of both programs
back to back in one mutex slot returned **0 / 0**. The tree was churning; nothing of mine
was involved (my chat edits are three `.test.tsx` files, which `type-check` excludes).

## 9. Files

Gate: `frontend/scripts/check-test-typecheck.mjs`, `frontend/tsconfig.test.json`,
`frontend/package.json` (`check:test-typecheck` + `:self-test`),
`.github/workflows/frontend.yml` (`gates` job, after "Import graph is acyclic",
carrying `if: ${{ !cancelled() }}` like its 28 neighbours).

Specs: 45 test files. Full list in the two commits.

## 10. What this does not cover

- Only **type** errors. A spec that typechecks and asserts nothing meaningful is still
  invisible; §5's findings needed reading, not compiling.
- `apiClient.get<T>()` remains a **cast**. A backend shape change still passes both
  programs (brief rule 11) — this gate raises the floor, it does not close that.
- The gate adds ~2 minutes of `tsc` to the `gates` job.
