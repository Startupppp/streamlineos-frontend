# 13 / 28 — the last 4 scalar AI mutations, the access.ts cycle, and the BASE-const reads (S14, 2026-09-03)

Territory: `frontend/hooks/api/**`, `frontend/lib/query-keys*`, `frontend/lib/api-*`
(plus `frontend/lib/rbac/permission-gate.ts`, which is where the import cycle had to be broken).

## 1. Ticket 13 — the 4 bare-scalar AI mutations are threaded

Report 11b recorded that a union `TVariables` would thread them with zero call-site edits and reverted
the draft unbuilt. Built:

```ts
export type AiAbortableScalar<T extends string | number> = T | ({ value: T } & AiAbortInput);
export function readAiAbortableScalar<T extends string | number>(input: AiAbortableScalar<T>):
  { value: T; signal?: AbortSignal }
```

`T extends string | number` is load-bearing: it makes `typeof input === "object"` a sound discriminator,
so the normaliser needs no `as` (CLAUDE.md §6 bans forced types).

Threaded: `useAIScoreLead`, `useAIAttritionRisk`, `useNLSearch` (`hooks/api/ai.ts`), `useKbPageAsk`
(`hooks/api/kb/page-ai.ts`). The four live call sites were **not** touched and still pass a bare scalar.

The anti-vacuous control is now **kept** rather than run once: `useAcceptCandidateScore` deliberately
forwards no signal (accepting a score stops no spend), and the control asserts its outgoing request is
NOT cancelled when the caller aborts.

Also fixed a harness defect: the matrix awaited the mutation promise after abort, which never settles on
an unthreaded hook — one defect produced 9 failures across the file. It now `waitFor`s the outgoing
signal and fails inside its own case.

### Bite proofs — hermetic `git archive HEAD` tree, live tree never modified. Baseline 18 passed.

| Mutation | Result |
|---|---|
| `useAIScoreLead` drops the signal | **1 failed / 17 passed** |
| `useKbPageAsk` drops the signal | **1 failed / 17 passed** |
| the carrier leaks into the request body | **2 failed / 16 passed** |
| `useAcceptCandidateScore` IS threaded (control inverted) | **1 failed / 17 passed** |

Restored: 18 passed.

## 2. Ticket 28 box 2 (a) — the import cycle, and a double count

`gated-query.ts` imports `usePermissionGate` from `access.ts`, so `access.ts` could not import
`useGatedQuery`. Broken by moving the **pure** `gated()` / `Gated<T>` wrapper down into the existing
leaf `lib/rbac/permission-gate.ts`; `gated-query.ts` re-exports both, so all 88 importers are unchanged.

`usePermissionGate` deliberately did **not** move: **71 test files** `jest.mock("@/hooks/api/access")`,
and moving it would silently un-mock `useGatedQuery` in every one of them.

The "access.ts x3" is a double count. Two reads are gateable and now gated —
`/rbac/permissions` and `/rbac/discovery/members`, both `settings:rbac:manage`, verified at
`src/modules/rbac/rbac.controller.ts:36-38` and `:97-99`. The third,
`/rbac/discovery/grantable`, is `@AuthorizedInService` (`rbac.controller.ts:82`) and was already
counted in the ticket's own "(d) correctly needs no gate" list.

## 3. Ticket 28 box 2 (c) — the BASE-const routes: 16, not 10, and all permissioned

Every key verified against its controller decorator, not only `contracts/openapi.json`:

| Hook file | Reads | Key | Controller |
|---|---|---|---|
| `hr/enterprise-ops-accommodations.ts` | 3 | `hr:accommodations:view` | `accommodations.controller.ts:59,70,130` |
| `hr/enterprise-ops-emergency.ts` | 3 | `hr:emergency:manage` | `emergency.controller.ts:46,57,127` |
| `hr/enterprise-ops-event-stream.ts` | 3 | `hr:eventstream:view` | `event-stream.controller.ts:31,41,47` |
| `hr/enterprise-ops-identity.ts` | 3 | `hr:identity:view` | `identity.controller.ts:48,91,130` |
| `hr/enterprise-ops-simulator.ts` | 2 | `hr:policies:manage` | `simulator.controller.ts:94,104` |
| `hr/recruitment/interviews.ts` | 1 | `hr:employees:view` | `hr-interview-questions.controller.ts:43` |

`sign/public.ts:46,54` were in the same unresolved list and must NOT be gated — both are
`x-exposure: public`.

Two of those `queryFn`s destructured `signal` and never passed it
(`enterprise-ops-emergency.ts` event status, `enterprise-ops-event-stream.ts` metric-definitions): a
30-second poll that could not be cancelled. Fixed.

## 4. Ticket 28 box 2 (b) — CRM/Inventory, named and NOT converted

12 permissioned ungated reads, deliberately untouched (out of release scope):
`hooks/api/leads.ts:32,43,52,60,69,79,90,257,266,288,303` (all `crm:leads:view`) and
`hooks/api/inv-ai-explain.ts:97` (`inventory:reports:read`). The ticket's "leads.ts x7" undercounted by 4.

## 5. The scan, and why its number disagrees with S13

Fresh TS-compiler-API scan of `hooks/api/**` (non-test): `useQuery`/`useInfiniteQuery`/`useSuspenseQuery`
whose enclosing hook mentions none of `useCan`/`usePermissionGate`/`useAccess`/`useModuleEnabled`/`useScope`.
**155 ungated read call sites**; resolved against `openapi.json`: **100 permissioned**, 22 universal,
9 public, 2 in-service, 22 absent from the snapshot. That is a wider definition than S13's 133 (S13 did
not count a hook whose only `enabled` is a non-permission guard), so S13's "105 converted / 28 left"
does not carry forward and the two numbers must not be added.

After this pass the permissioned residue is **84**. Largest clusters: `support/**` 18,
`hr/recruitment/**` 17, `accounting.ts` 12, `leads.ts` 11 (excluded), `timesheets-core/**` 7,
`hr/hr-workflows.ts` 4. Every one has a resolved key; this is mechanical volume, not a blocker.

**The openapi-permission gate was NOT written.** The scanner exists and runs (it produced every number
above) but it lives in the session scratchpad, not in `frontend/scripts/`, and there is no
`check:gated-reads` npm script and no bite proof. The battery ran to 3% first. Whoever writes it should
gate on `exposure === "permissioned"` and start from a recorded baseline of 84, not 0.

## 6. Boxes 6 and 7

**Box 6 (1) — the S13 "this is stale" note is itself wrong.** `grep -rn fetchStatus` over
`app features components hooks lib` finds **zero** non-test occurrences: `loading-state.tsx:121`,
`data-table.tsx:74` and `data-table-skeleton.tsx:33` read **`useOnlineStatus()`** (browser
`navigator.onLine`), not the query's `fetchStatus`. The user-visible improvement did land; the literal
claim did not. The two signals differ — `useOnlineStatus` is global and cannot say *this* read is paused.

**Box 6 (2) — measured, and worse than recorded.** **180 `useGatedQuery` call sites across 83 files**
all carry the `access` gate. **Exactly one surface reads it**: `features/crm/timeline/my-tasks-panel.tsx:59`.
40 files render `NoPermissionState` but derive it from a separate `useCan`. 179 unread gates.

Both are `app/**` / `features/**` work — **owner: ticket 30**. Box 6 stays `[~]`.

**Box 7 — no work done.** The S13 note filed under it was a copy of box 6's note and says nothing about
runtime parsing. Contract coverage is unchanged at 55 of 2502 seam call sites / 49 routes; adding a
contract requires verifying the backend shape per route, and no route was verified this session. Box 7
stays `[~]`, unmoved, and is not claimed as progress.

## Gates run, output read

| Command | Result |
|---|---|
| `pnpm -C frontend type-check` (heavy.sh 2) x2 | **exit 0, 0 errors** both times |
| `npx eslint` on all 13 changed files | **exit 0**, 0 errors (2 pre-existing warnings found and fixed) |
| `npx jest --runInBand --testPathPattern="ai-mutation-signal"` | **exit 0 — 2 suites / 25 tests** |
| `npx jest --maxWorkers=2 --testPathPattern="(hooks/api\|lib/query-keys\|lib/api-)"` | **exit 0 — 66 suites / 747 tests** |
| `pnpm -s check:cycles` | **exit 0 — no circular dependency** (5279 files) |
| `pnpm -s check:query-signal` | **exit 0 — 1055 queryFn blocks / 423 files, 0 violations** |

NOT run: `next build`, `check:command-catalog`, `check:file-sizes`, `check:routes`,
`check:import-direction`, `check:dead-code`, the full frontend jest suite.

## Cross-territory findings

- **`features/inventory/components/tools/barcode-client.tsx:26`** still holds a private duplicate of
  `hooks/common/use-online-status.ts`. Out of release scope; unchanged.
- **179 of 180 gated reads have their `access` gate ignored by every screen.** The data layer cannot
  fix this; it is a per-page change owned by ticket 30.
- **`grant-delegation-sheet.tsx` and `components/rbac/permission-matrix.tsx`** call
  `usePermissionCatalog` with no permission gate of their own. They now inherit `settings:rbac:manage`
  from the hook, which composes with (never replaces) their existing `enabled`. No call site needed an
  edit, but a screen that wanted to render the catalog to a non-admin would now get an empty result plus
  `access.denied`, which is the correct answer — the backend already 403s.
