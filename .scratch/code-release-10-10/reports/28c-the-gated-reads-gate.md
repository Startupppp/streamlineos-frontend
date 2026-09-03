# 28c — the openapi-permission gate, written and bite-proven; the residue converted (S15, 2026-09-03)

Territory: `frontend/scripts/check-gated-reads.mjs` (new), `frontend/hooks/api/**`, `frontend/lib/rbac/**`.

Two items, both left explicitly unfinished by S14.

## 1. The gate exists now

`frontend/scripts/check-gated-reads.mjs`, wired as `pnpm check:gated-reads` and
`pnpm check:gated-reads:self-test`. It resolves every raw read call site under `hooks/api/**`
against `contracts/openapi.json` — the per-operation `x-exposure` / `x-permission` generated from
the controllers' own decorators — and fails when a route the backend protects is read without a
permission gate.

**Scan definition (state it whenever you quote a number from it).** Call sites of
`useQuery` / `useInfiniteQuery` / `useSuspenseQuery` under `hooks/api/**` (non-test) whose enclosing
exported hook mentions none of `useCan` / `usePermissionGate` / `useAccess` / `useModuleEnabled` /
`useScope`. This is the **WIDER** of the two definitions used this release — the one that produced
S14's 155/100 — because it counts a hook whose only `enabled` is a non-permission guard. The earlier
narrow scan reported 133. **The two measure different sets and must never be added or differenced.**
The definition is written into the script header so the next reader cannot mix them up.

`sign/public.ts` is in the route list and is **not** gated. Its two reads go through a module-local
`publicGet`, and the scanner follows that rather than only `apiClient`, so they resolve to
`/public/sign/{token}/session` and `/public/sign/{token}/documents/{id}/preview`, both
`x-exposure: public`. Fixture (e) and bite proof B6 both lock this in: an ungated read on a public
route must NOT fail the gate.

### Four ratchets, all bite-proven

| Jaw | Fires when |
|---|---|
| `permissionedUngated` above baseline | a new permissioned read is left ungated |
| `permissionedUngated` **below** baseline | a conversion lands and the baseline is not lowered |
| `unresolvedUngated` above baseline | the gate cannot resolve an ungated read's route at all |
| stale `HELD_BACK` / `EXEMPT_ROUTES` | an exception names a file that is gone or now gated |

The below-baseline jaw is deliberate: it is what stops the recorded number going stale, which is
exactly how the previous scanner's numbers became unverifiable.

`unresolvedUngated` is the jaw that matters most and did not exist in any earlier scan. An
unresolvable read is not a safe read — a permissioned route hides there as easily as a public one —
so the gate refuses to pass one it cannot classify.

### Bite proof — hermetic, `git archive HEAD` into a temp dir, live tree never modified

```
git archive HEAD | tar -x -C $SB/bite     # + a node_modules symlink
```

| # | Planted in the ARCHIVED tree | Exit | Expected |
|---|---|---|---|
| B0 | clean archived tree | **0** | 0 |
| B0s | `--self-test` (19 fixtures) | **0** | 0 |
| B1 | an ungated permissioned read | **1** | 1 |
| B2 | the same read behind a nested generic | **1** | 1 |
| B3 | the same route hidden in a spread `queryOptions()` factory | **1** | 1 |
| B4 | an ungated read whose path is a variable | **1** | 1 |
| B5 | the same route via `useGatedQuery` | **0** | 0 |
| B6 | an ungated read on a **public** route | **0** | 0 |
| B7 | an ungated read on a **universal** route | **0** | 0 |
| B8 | defect removed | **0** | 0 |

Two further jaws were proved the same way on an earlier revision: converting one existing offender
produced `FAIL: 68 ... BELOW the recorded baseline of 69`, and a planted `HELD_BACK` entry naming a
nonexistent file produced `FAIL: 1 stale exception entr(y|ies)`.

### The baseline was measured three times, never assumed

S14 reported a permissioned residue of **84**. My first measurement was **81**, and I did not adopt
either number — I fixed the scanner twice and re-measured after each fix:

| Revision | Ungated | Permissioned | Counted (net of CRM/Inventory) |
|---|---|---|---|
| first working scan | 125 | 81 | 69 |
| + declaration-span hook attribution | 129 | 86 | 74 |
| + nested generics / templates / spreads / real HTTP method | 55 ungated resolved, 0 unresolvable | 17 | 5 |
| after conversion | 50 | 12 | **0** |

The 81-vs-84 gap is two independent implementations of the same definition disagreeing, not a
regression: mine is regex-based, S14's used the TS compiler API. **Do not treat 84 as a fact.** The
number that is now a fact is the one the committed gate prints, and the gate fails if it drifts.

### Three scanner defects found by writing it, each of which hid a real permissioned read

1. **Hook attribution by brace matching is wrong.**
   `export function useAllHrAnnouncements(options?: { enabled?: boolean })` opens its first brace
   inside the **parameter type**, so a brace-matched block covered `{ enabled?: boolean }` and the
   hook's reads fell out of every block into module scope. Module scope makes the gate scope the
   whole **file**, where one unrelated `useCan` anywhere in it launders the read as gated. Six call
   sites landed there; five were permissioned reads scored as already-gated. Replaced with a
   declaration-to-declaration span, which no brace in a type, return annotation or arrow one-liner
   can fool. Fixture (o).

2. **`[^<>()]*` cannot cross a nested generic.**
   `apiClient.get<CursorPaginatedResult<HrWorkflowInstance>>(...)` was invisible, and so was
   `apiClient.get<{ enabled: boolean }>(...)`. Eleven ungated reads were scored `no-path`/`absent`.
   Fixtures (p), (q).

3. **`\$\{[^}]*\}` closes on the inner brace of a nested template.**
   `` `/talent-pools/${poolId}/members${qs ? `?${qs}` : ""}` `` collapsed to a mangled path that
   matched nothing, so `usePoolMembers` scored `absent`. Balanced-brace collapse plus a query-tail
   rule (a `*` not preceded by `/` is a query string, never a path segment). Fixture (r).

Also: a queryFn living in a spread `queryOptions()` factory is now followed (fixture (s)), and calls
resolve against their **real HTTP method** instead of assuming GET, so a `useQuery` over
`apiClient.post` is classified rather than scored absent.

## 2. The residue is converted — 79 reads

**74 in the first pass**, then **5 more** that only became visible once the parser defects above were
fixed:

| Route | Key | Hook |
|---|---|---|
| `/build/all-work` | `build:tickets:view` | `useInfiniteAllWork` |
| `/hr/workflows/instances/acted` | `hr:workflows:approve` | `useWorkflowActed` |
| `/hr/recruitment/interviews` | `hr:interviews:view` | `useInterviews` |
| `/hr/recruitment/talent-pools/{poolId}/members` | `hr:employees:view` | `usePoolMembers` |
| `/timesheets/exceptions` | `timesheets:exceptions:view` | `useTimesheetExceptions` |

Every key comes from `x-permission` on that route and **all 33 distinct keys exist verbatim in
`lib/rbac/permissions/`**, so `tsc` fails if either side drifts. Four were checked against the
controller decorator rather than the snapshot alone, because the snapshot is known stale in places:
`build:tickets:view` (`projects-ticket-associations.controller.ts:167`), `settings:view`
(`employment-facts.controller.ts:20`), `hr:announcements:manage` (`announcements.controller.ts:42`)
and `support:tickets:view` (`support-ai.controller.ts:76`) each match.

Two judgement calls worth recording:

- **`/support/kb/*` is genuinely permissioned.** The unauthenticated knowledge base is a separate
  `/public/kb/*` surface, so gating the `support:kb:view` reads does not break a public page.
- **`usePortalTicket` goes through the authenticated `apiClient`**, not `portalApiClient`, so
  `support:portal:tickets:view` is the right gate.

**The two `useInfiniteQuery` reads take `useCan` + a composed `enabled`, not a new wrapper.**
26 of the 30 files holding an infinite read already gate that way, and `useInfiniteAllWork` sits
directly beside its own `useQuery` twin already using `useCan("build:tickets:view")`. Inventing a
`useGatedInfiniteQuery` for two sites against that precedent was the wrong trade. The cost is real
and is recorded rather than hidden: `useCan` suppresses the request but does **not** put the reason
on the result, so those two reads cannot tell a screen denied-from-empty.

### Left unconverted and named — out of release scope

12 permissioned ungated reads, all CRM or Inventory, each a one-line change the day they re-enter
scope. They are in `HELD_BACK` in the gate with a reason, so they are counted, printed under
`--list`, and the entry fails if the file is deleted or gated:

- `hooks/api/leads.ts:32,43,52,60,69,79,90,257,266,288,303` — 11 reads, all `crm:leads:view`
- `hooks/api/inv-ai-explain.ts:97` — `/inventory/ai/supplier-delay`, `inventory:reports:read`

## 3. Would this gate certify a read whose gate no screen reads? YES — and it says so

Asked directly: **my gate would pass a `useGatedQuery` read whose `access` gate no screen consumes.**
It certifies exactly one property — **request suppression**: a denied user sends no request. It does
not and cannot certify that a screen renders the refusal, because that decision lives in `app/**`
and `features/**`, outside both this gate's scan and my territory.

Rather than let the word "gated" quietly imply the stronger property, the gate **measures the second
one and prints it on every run, and never fails on it**:

```
NOTE (measured, never fails): 275 useGatedQuery reads each carry a PermissionGate; 1 non-test file(s) read it.
  reads the gate: features/crm/timeline/my-tasks-panel.tsx
  This gate certifies request suppression, NOT that a screen renders the refusal.
  The unread gates are an app/** and features/** change — ticket 30, not this scanner.
```

S14 measured 180 produced / 1 consumed. It is now **275 produced / 1 consumed** — my 77
`useGatedQuery` conversions each added a gate that nothing downstream reads, so this pass made the
ratio worse, from 179 unread to 274. That is not an argument against converting: an ungated read
leaks a request and 403s; a gated read whose gate is unread merely renders "none yet" instead of
"no access", which is strictly better and is the state 40 screens already work around with a
separate `useCan`. But it does mean **ticket 30's job just got bigger, and it is now the binding
constraint on this box, not the data layer.**

The counter never fails the run deliberately: failing on another territory's number would block work
this script has no standing to block. If ticket 30 wants a ratchet on the consumption side, the
measurement is already here and needs only a baseline.

## Gates run, output read

| Command | Result |
|---|---|
| `pnpm -C frontend type-check` (heavy.sh 2) x2 | **exit 0, 0 errors** both times |
| `pnpm -s check:gated-reads` | **exit 0** — 720 sites, 50 ungated, 12 permissioned (all HELD_BACK), 0 unresolvable |
| `pnpm -s check:gated-reads:self-test` | **exit 0** — 19 fixtures |
| hermetic bite proof, 8 directions (B0–B8) | **as tabled above** |
| `npx jest --maxWorkers=2 --testPathPattern="(hooks/api\|lib/query-keys\|lib/api-\|lib/rbac)"` | **exit 0 — 78 suites / 913 tests** |
| `npx jest --maxWorkers=2` (whole frontend suite) | **exit 0 — 330 suites / 3208 tests** |
| `npx eslint` on all 44 changed files | **exit 0**, 0 errors, 24 warnings |

The 24 warnings are **pre-existing and I introduced none** — the identical 44 files at `HEAD~2`
produce the identical `24 problems (0 errors, 24 warnings)`, verified in a hermetic `git archive
HEAD~2` tree. All 24 are unused imports of the `no-unused-vars` class that `CLAUDE.md` §6 records as
deliberately unenforced. I left them alone rather than widen the diff.

**NOT run:** `next build`, `check:command-catalog`, `check:file-sizes`, `check:routes`,
`check:import-direction`, `check:dead-code`, `check:cycles`, `check:query-signal`.

## Cross-territory findings

- **274 of 275 `useGatedQuery` reads have their `access` gate ignored by every screen.** Only
  `features/crm/timeline/my-tasks-panel.tsx:59` reads it. 40 files render `NoPermissionState` from a
  separate `useCan` beside the read instead of taking the answer from the read itself. Owner:
  **ticket 30**. The measurement now runs on every `check:gated-reads`.
- **`hooks/api/meetings-ai.ts` had uncommitted work from another agent** in my territory while I was
  editing. I excluded it from both commits by explicit file pathspec; it is still uncommitted.
- **`check-command-catalog.mjs` duplicates ~200 lines** of contract indexing, route resolution and
  argument parsing that `check-gated-reads.mjs` now also needs. I did not touch it — it is another
  territory and it executes its full scan on import, so it cannot be imported as a library. Worth a
  shared `scripts/openapi-contract.mjs` when someone owns both.
