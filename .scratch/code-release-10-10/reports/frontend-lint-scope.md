# Frontend lint scope — what the 2,375 number actually was

**Date:** 2026-09-02 · **Package root:** `streamlineos-frontend/frontend`
**Commits:** `2be4fee90` (ignore scope), `877e797a8` (source fixes) — both in `streamlineos-frontend`

---

## 1. Before — measured, not assumed

Baseline taken against the pristine config from `HEAD` (`git show HEAD:frontend/eslint.config.mjs`
written to a temporary `eslint.config.baseline.mjs`, run with `--config`, then deleted). `tsconfig.json`
and the committed config were never modified for the measurement.

```
pnpm -C frontend exec eslint . --config eslint.config.baseline.mjs -f json
exit 1 — 2,365 errors, 17,183 warnings, 5,628 files linted, 155 files with errors
```

The circulating figure was **2,375**. The true baseline at the time I measured was **2,365**. The
10-error difference is other agents' in-flight edits landing between their run and mine; the
`.next-buildmart` component (2,328 / 16,226) reproduces the predecessor's measurement exactly.

### Errors by top-level path — the whole corpus, not an assumption about two directories

| top-level | errors | warnings | files | files with errors |
|---|---:|---:|---:|---:|
| `.next-buildmart/` | **2,328** | **16,226** | 316 | 132 |
| `features/` | 16 | 667 | 2,758 | 10 |
| `hooks/` | 11 | 238 | 548 | 6 |
| `components/` | 7 | 25 | 349 | 5 |
| `scripts/` | 2 | 7 | 34 | 1 |
| `lib/` | 1 | 5 | 260 | 1 |
| `app/` | 0 | 11 | 1,222 | 0 |
| `types/`, `test-utils/`, `eslint-rules/`, `feedbucket-widget/`, `.scratch/`, root files | 0 | 3 | 141 | 0 |

**98.4% of the errors and 94.4% of the warnings were one gitignored build directory.**

---

## 2. The fix — two paths added, each with what generates it

`frontend/eslint.config.mjs`, `globalIgnores`:

| Path added | What generates it | Evidence |
|---|---|---|
| `.next-buildmart/**` | An alternate Next `distDir`. 718 MB, contains only `dev/` (minified chunks). | `.gitignore:24`; `du -sh` = 718M; `scripts/check-repo-paths.mjs:88` documents the same directory as the defect that polluted every other scanner |
| `coverage/**` | The istanbul report written by `jest --coverage`. | `.gitignore:16`; listed in `SOURCE_SCAN_EXCLUDE_DIRS` in `scripts/check-repo-paths.mjs` |

`.next/**`, `out/**`, `build/**`, `public/**` were already listed. eslint was the **only** frontend
scanner still walking `.next-buildmart` — `check-repo-paths.mjs`, `check-file-sizes.mjs`,
`check-over-300.mjs`, `check-no-arbitrary-colors.mjs`, `check-no-effect-fetches.mjs` and
`check-no-unlabeled-icon-buttons.mjs` all exclude it through `isExcludedScanDir`, and
`runScanDirSelfTest` asserts it by name.

### What I deliberately did NOT ignore

- **`feedbucket-widget/dist/**` — this path does not exist and nothing produces it.** The brief named
  it alongside `.next-buildmart`. `feedbucket-widget/build.mjs:47` writes
  `outfile: ../public/feedbucket-widget.js`, i.e. into `public/**`, which was already ignored. There
  is no `dist` directory anywhere in the package (`find . -maxdepth 3 -type d -name dist`, excluding
  `node_modules`/`.next*`, returns nothing). `feedbucket-widget/src` is **authored source** — 19 files
  linted, 0 errors. Adding the ignore would have been a cargo-culted rule for a directory that has
  never existed.
- **`.scratch/**`, `.swc/**`, `.github/**`, `.cursor/**`.** `check-repo-paths.mjs` skips all
  dot-directories wholesale and I could have mirrored that. I did not: `.scratch/` holds agent-written
  `.mjs` scripts, which are authored files, and ignoring them would be ignoring source. Measured
  contribution of all four: **0 errors** (`.scratch` 9 files / 1 warning; the rest have no lintable
  files). Ignoring them would change no number and would only reduce coverage.
- **No source path was ignored, and no `eslint-disable` comment was added anywhere.**

The explanatory comment in the config was trimmed from the predecessor's 18 lines to 12, keeping the
generation provenance and dropping the measurement narrative, which lives here instead.

---

## 3. After

```
pnpm -C frontend lint
exit 1 — 971 problems (14 errors, 957 warnings)
```

Intermediate reading, immediately after the ignore-scope commit and before any source fix:
**37 errors, 957 warnings** — matching the baseline's source-only arithmetic exactly
(2,365 − 2,328 = 37). The brief predicted ~45; the real number is **37**. The gap is not a
discrepancy in the fix: 45 was an estimate, and 37 is what `2,365 − 2,328` leaves. Warnings fell
17,183 → 957 on the same 2,328/16,226 split.

Files linted fell 5,628 → 5,311 (317 generated files dropped).

---

## 4. Real errors fixed — 23, none silenced

All 23 were in files that were **clean in `git status`**, i.e. not mid-edit by another agent
(checked per file before touching it).

### `streamline/no-raw-visual-values` — 8

The rule reports **one match per class string and then returns**. Fixing only the reported token
would have surfaced the next literal in the same string on the next run, so each whole string was
migrated. Every replacement is value-for-value against `globals.css`, so light and dark appearance
are preserved and the hand-written `dark:` twins are deleted rather than maintained:
`--status-warning-rule` = amber-200 / amber-500 30%, `--status-warning-surface` = amber-50 /
amber-500 10%, `--status-warning-ink-strong` = amber-700 / amber-300.

| File | Change |
|---|---|
| `components/layout/shell-offline-banner.tsx` | `bg-amber-500/10 … text-[13px] … text-amber-700 dark:text-amber-400` → `bg-status-warning-surface … text-label … text-status-warning-ink` |
| `features/calendar/calendar-source-panel.tsx` (×3) | banner border/surface, icon ink and `text-[11px]` body → warning tokens + `text-dense` |
| `components/expenses/expense-export/expense-export-dialog.tsx` | truncation banner → warning tokens; three `dark:` twins removed |
| `features/help-centre/components/public-article-feedback.tsx` | `text-emerald-600` → `text-status-success-ink` |
| `components/auth/invitation-card.tsx` (×3) | two hand-written shadows → `shadow-card` and `shadow-accent-strong`; `sm:text-[28px]` → `sm:text-3xl` |

`--elevation-accent` is literally `rgba(37, 99, 235, …)` — the same blue as the hand-written glow it
replaces — and unlike the literal it is redefined under `.dark`, which is the exact defect the rule's
own message names.

**One deliberate pixel change, recorded rather than hidden:** `sm:text-[28px]` → `sm:text-3xl` moves
that heading from 28px to 30px at ≥640px. The type token scale (`micro` 10px, `dense` 11px,
`label` 13px) has no display step, and the rule's message sanctions Tailwind's own scale. I considered
instead adding `components/auth/invitation-card.tsx` to the relaxed display-surface block — its only
consumer, `app/(auth)/invitation/[token]/page.tsx`, is already in it — and rejected it: that block
skips `shadow` too, which would have switched off the two shadow findings that had correct token
fixes.

### `react-hooks/use-memo` — 4

`features/calendar/calendar-events-panel.tsx`, `features/notifications/notification-virtual-list.tsx`:
`useCallback(getPanelRowKey, [])` / `useCallback(getRowKey, [])` etc. wrapped **module-scope**
functions (defined at lines 48/55 and 35/40 of their own files). A module-scope function is already
referentially stable, so the hook was a no-op paying a hook slot. Removed and the function passed
directly; the now-unused `useCallback` import was dropped from both files. This is what
`frontend/CLAUDE.md` §3 asks for ("memoize only what you measured").

### `react-hooks/globals` — 1

`lib/query-scope-isolation.test.tsx` assigned a module variable during render
(`capturedClient = useQueryClient()`). Moved into `useEffect`. RTL wraps `render`/`rerender` in
`act()`, so effects flush before the assertions — the suite still passes, verified below. This file
is cited by `frontend/CLAUDE.md` §2 as the proof that cross-org cache reads are structurally
impossible, so it was run explicitly rather than assumed.

### `@next/next/no-assign-module-variable` — 3

`components/layout/sidebar/sidebar-products.ts` (`const module` → `const manifestModule`) and
`scripts/home-manifest-parse.mjs` (two `let module` → `let moduleKey`, with the returned object key
`module:` preserved so no caller changes). Verified with `check:home-manifest` (16 routes parsed,
exit 0) and `check:home-manifest:self-test` (14 passed, exit 0).

### `react/no-unescaped-entities` — 4

`features/hr/leaves/leave-types-manager.tsx`, `features/settings/api-tokens/permission-scope-selector.tsx`:
`"` → `&quot;` in JSX text, which preserves the rendered character exactly.

### `@typescript-eslint/no-require-imports` — 2

`components/ui/app-loading-screen.test.tsx`, `features/hr/performance/reviews-tab-pagination.test.tsx`:
`require("react") as typeof import("react")` inside a `jest.mock` factory →
`jest.requireActual<typeof import("react")>("react")`. A `jest.mock` factory is hoisted above the
imports and babel-jest rejects closing over a non-`mock`-prefixed outer binding, so a top-level import
is not available here; `jest.requireActual` is the jest API for exactly this case, not a way around
the rule.

---

## 5. Errors left — 14, all outside this ticket's territory

| File | n | Rule | Why left |
|---|---:|---|---|
| `hooks/api/accounting/__tests__/cursor-pagination.test.ts` | 4 | `rules-of-hooks` | `hooks/api/**` is another agent's territory (response contracts). This file is also **dirty** in `git status` — a live in-flight edit. |
| `hooks/api/build/cursor-pagination.test.ts` | 2 | `rules-of-hooks` | `hooks/api/**` — not mine |
| `hooks/api/hr/__tests__/cursor-pagination.test.ts` | 2 | `rules-of-hooks` | `hooks/api/**` — not mine |
| `hooks/api/accounting/__tests__/general-ledger-cursor.test.ts` | 1 | `rules-of-hooks` | `hooks/api/**` — not mine |
| `hooks/api/build/board-server-filter.test.ts` | 1 | `rules-of-hooks` | `hooks/api/**` — not mine |
| `hooks/api/crm/__tests__/quotes-cursor-pagination.test.ts` | 1 | `rules-of-hooks` | `hooks/api/**` — not mine |
| `features/crm/leads/leads-funnel-view.tsx` | 1 | `rules-of-hooks` (`useReducedMotion` called conditionally) | `features/crm/**` excluded from scope. **This one is a genuine React correctness bug, not a style finding** — it should be routed. |
| `features/crm/leads/leads-toolbar.tsx` | 1 | `no-raw-visual-values` (`text-blue-700`) | `features/crm/**` excluded from scope |
| `features/landing/components/included-apps-grid.tsx` | 1 | `no-raw-visual-values` (`hover:border-slate-300`) | Public landing visuals must remain unchanged this release |

The 11 `hooks/api/**` findings share one shape: a test helper named `captureXOptions` calls a
`useX` hook outside a component, which the React Compiler lint rule rejects. It is a single
mechanical rename-and-wrap for whoever owns that territory, not 11 separate problems.

---

## 6. `noUncheckedIndexedAccess` — measured, and left OFF

Shared `CLAUDE.md` §6 states the codebase runs `strict: true` **+ `noUncheckedIndexedAccess`**.

**It is set in neither tsconfig.** `frontend/tsconfig.json` has `strict: true` and no mention of it;
`streamlineos-backend/tsconfig.json` has `strict`, `strictNullChecks`, `noImplicitAny` and no mention
of it. The constitution has been describing a flag that has never been on.

Measured with a throwaway `tsconfig.nuia-probe.json` extending the real config (so `tsconfig.json` was
never edited and no concurrent agent's `type-check` was disturbed), then deleted:

```
pnpm -C frontend exec tsc --noEmit -p tsconfig.nuia-probe.json
exit 2 — 184 errors across 84 files
```

| | |
|---|---|
| TS18048 `possibly 'undefined'` | 86 |
| TS2532 `Object is possibly 'undefined'` | 35 |
| TS2345 argument type | 27 |
| TS2322 assignment type | 20 |
| other (TS2538/2769/7006/2488/2786/2722) | 16 |

Spread: `features/hr` 66 · `features/build` 22 · `features/surveys` 17 · `features/crm` 15 ·
`features/chat` 8 · `features/wiki` 6 · `features/support` 6 · `features/accounting` 6 · then a long
tail across 11 more modules, plus `lib/` 8, `components/` 5, `hooks/` 4, `app/` 2.

### Recommendation: leave it off. Reverted cleanly; `tsconfig.json` is untouched.

1. **184 errors over 84 files in 19 modules is a migration, not a cleanup.** Most of it is in
   territories this ticket does not own — `features/crm` (15), `features/inventory` (3),
   `hooks/api` (1) — and at least one affected file (`components/layout/sidebar/sidebar-section.tsx`)
   is dirty with another agent's in-flight work right now.
2. **The fixes cannot be mechanical.** Shared `CLAUDE.md` §6 bans `!` and `as`, so every one of the
   121 `possibly 'undefined'` findings needs real narrowing at the use site. Turning the flag on and
   fixing a subset is the half-migrated state that is worse than an honest absence.
3. **184 is a floor, not the cost.** `frontend/tsconfig.json` excludes `**/__tests__/**`,
   `**/*.test.ts(x)`, `**/*.spec.ts(x)` and `scripts`. Turning the flag on would leave every test and
   script file unchecked, so the flag would read as "on" while a large share of the code it is meant
   to protect was never compiled under it.

**The divergence should be closed in writing, not silently:** either shared `CLAUDE.md` §6 stops
claiming `noUncheckedIndexedAccess`, or a ticket owns the 184. `CLAUDE.md` is not my territory, so I
have not edited it.

---

## 7. Was any gate inflated by build output? — No. Named, with the reason.

**Answer: no gate was inflated. The 2,365 figure is a local-workspace artifact only.**

Every workflow that shells out to eslint:

| Workflow | Step | Live? |
|---|---|---|
| `.github/workflows/frontend.yml:48` | `Lint` → `pnpm run lint` | **Yes — the only live one** |
| `frontend/.github/workflows/ci.yml:37` | `Run linter` → `pnpm lint` | No |
| `frontend/.github/workflows/merge-protection.yml:31` | `Run linter` → `pnpm lint` | No |
| `frontend/.github/workflows/pr-check.yml:31` | `Run linter` → `pnpm lint` | No |

Two independent reasons none of them was inflated:

1. **Step order.** In all four, `Lint` runs *before* `Build` (`frontend.yml` line 48 vs line 54).
   On a fresh CI checkout `.next-buildmart/` and `coverage/` do not exist at lint time, and both are
   gitignored so they are never checked out.
2. **Only one of the four is even read.** GitHub Actions reads workflows from `.github/workflows/` at
   the **repository root** only. `frontend/.github/workflows/` is a nested directory, so `ci.yml`,
   `main.yml`, `merge-protection.yml` and `pr-check.yml` are inert files.

### The real CI consequence, which is a different defect

`.github/workflows/frontend.yml` job `frontend` is ordered Install → **Lint** (48) → **Type Check**
(51) → **Build** (54), all in one job. `Lint` is red — it was red at 2,365 and it is still red at 14 —
so **`Type Check` and `Build` have never executed in CI**. That workflow's own header comment
(lines 3–7) records exactly this masking defect being fixed for the `gates` job in ticket 35b, by
moving the gates into a job with no `needs:`. The same fix was never applied to `Type Check` and
`Build`, which still sit behind `Lint` in the `frontend` job.

Fixing the ignore scope does not by itself make that lint step green — 14 errors remain, all in
territories this ticket does not own (§5). Ticket 41 verifying this release against `pnpm lint`
should expect **exit 1 / 14 errors**, and should know that a green Lint step is a precondition for
Type Check and Build ever running at all. Workflow files are not my territory; this is routed, not
edited.

---

## 8. Commands run

| Command | Exit | Result |
|---|---:|---|
| `eslint . --config eslint.config.baseline.mjs -f json` (pristine baseline) | 1 | 2,365 errors / 17,183 warnings / 5,628 files |
| `pnpm -C frontend lint` (after ignore scope, before source fixes) | 1 | 37 errors / 957 warnings |
| `pnpm -C frontend exec eslint . -f json` (after source fixes) | 1 | 14 errors / 957 warnings / 5,311 files |
| `pnpm -C frontend lint` (final) | 1 | 971 problems — **14 errors, 957 warnings** |
| `pnpm -C frontend type-check` | **0** | 0 errors |
| `jest --runInBand` × 11 affected suites | **0** | 11 suites, 63 tests, all passed |
| `pnpm check:home-manifest` | **0** | 16 dashboard routes + 1 external parsed |
| `pnpm check:home-manifest:self-test` | **0** | 14 passed, 0 failed |
| `pnpm check:colors` | **0** | 5,249 files, no arbitrary hex |
| `tsc --noEmit -p tsconfig.nuia-probe.json` | 2 | **184 errors / 84 files** (probe deleted) |

All heavy commands went through `.scratch/code-release-10-10/heavy.sh 2 --`.

**Not run:** the full frontend jest suite (only the 11 suites touching changed files);
`next build`; e2e; anything in the backend repo.
