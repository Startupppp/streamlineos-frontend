# Ticket 20 — Frontend UX and accessibility — current-head audit

**Audited:** 2026-09-03
**Frontend head:** `26df21488854b5ca72b938802295965783f8b948` — `fix(a11y,chat): make the Share button's name stable, and deep-import the heartbeat` (branch `release/code-10-10-v2`)
**Backend head:** `66f09164f7056b377331bcc1fff5f128ada06b95` — `fix(spec): probe paging style with safeParse` (branch `release/code-10-10-v2`)
**Prior report:** none. This is a from-scratch reconstruction.
**Scope note:** CRM and Inventory are out of release scope. Every count below is split in-scope vs CRM/Inventory where the distinction changes the verdict.

---

## 1. What I actually read, with numbers

### Source corpus enumerated

| Thing | Count | How measured |
|---|---|---|
| `app/` TypeScript modules | 1,224 | `find app -name "*.tsx" -o -name "*.ts"` |
| `page.tsx` total | 600 | 556 under `app/(authenticated)`, 44 public/auth |
| `layout.tsx` | 40 | |
| `loading.tsx` | 363 | 353 skeleton-shaped, 1 containing `animate-spin`, 9 neither (all Inventory) |
| `error.tsx` | 196 | 177 delegate to `RouteErrorBoundary`, 19 hand-rolled |
| `not-found.tsx` / `global-error.tsx` | 5 / 1 | |
| `components/` .tsx | 299 | |
| `features/` .ts+.tsx | 2,793 | |
| `hooks/` .ts+.tsx | 577 | |
| Total `.tsx` in repo (excl. node_modules/.next) | 3,849 | |
| JSX opening tags | **80,333** | 27,975 lowercase intrinsic + **52,358 PascalCase (65.2%)** |
| Jest suites / tests (full run) | **362 / 3,537** | 5 failed, all in `hooks/api/cursor-pagination-contract.test.tsx` (ticket 19's surface, not this one) |
| a11y / UX-state suites / tests | **32 / 446** | all 446 pass — enumerated in §1.2 |
| Files importing the axe helper | 22 | `test-utils/axe.ts` consumers |
| Gate scripts in `frontend/scripts/` | 48 | I ran 13 |

### 1.1 Analyzers read in full (1,562 lines of `test-utils/`)

`aria-semantics-analysis.ts` (264), `surface-state-analysis.ts` (262), `design-system-control-names.ts` (183), `keyboard-reachability-analysis.ts` (175), `aria-vocabulary.ts` (107), `viewport.ts` (77), `axe.ts` (14), plus `response-contract-fixtures.ts`, `money-contract-fixtures.ts`, `permission-catalog.ts`.
I **ported four of them to JavaScript in the scratchpad and re-ran them independently**, so every number below is one I produced rather than one a passing test asserted.

### 1.2 The a11y / UX-state test corpus (32 suites, 446 tests, all green at head)

`aria-semantics.contract`, `keyboard-reachability.contract`, `design-system-control-names.contract`, `authenticated-surface-states.contract`, `paused-reads-and-truncated-lists`, `row-action-shield.a11y`, `contrast-tokens`, `page-states-responsive.a11y`, `overlay-focus.a11y`, `controlled-overlay-focus.a11y`, `confirm-dialog.a11y`, `empty-state.a11y`, `data-table-states.a11y`, `select-trigger-name.a11y`, `stat-card-grid-scroll.a11y`, `progress-semantics.a11y`, `shell-a11y`, `shell-keyboard`, `nav-pending-indicator`, `nav-intent-prefetch`, `motion-variants.a11y`, `menu-driven-sheet-focus.a11y`, and 10 feature a11y suites (`settings`, `payroll`, `mail`, `calendar`, `modules`, `modules-content`, `notification-card`, `org-rbac`, `support-inbox`, `build-board-cards`).

### 1.3 Gates executed at head (real exit codes, not `tail`'s)

| Gate | Exit | Corpus it reported |
|---|---|---|
| `check:icon-labels` | 0 | 3,858 files |
| `check:empty-states` | 0 | 3,858 files |
| `check:query-scope` | 0 | 5,369 files |
| `check:permission-binding` | 0 | 2,384 bindings |
| `check:route-access-contract` | 0 | — |
| `check:gated-reads` | 0 | — |
| `check:client-pages` | 0 | 163 below the 304 ceiling |
| `check:route-thinness` | 0 | — |
| `check:seo-metadata` | 0 | 1,224 route files |
| `check:gate-wiring` | 0 | 35 gates, 32 able to fail, 48 run steps, 1 workflow |
| `check:web-vitals-budget` | **1** | 13 routes, 1 breach (mobile `/crm/inbox` CLS 0.109) |
| `check:route-bundle-budget` | **1** | 18 breaches |
| `browser:journeys` | **refused to run** — `--cookie-file is required` | 0 |

### 1.4 Measurement artifacts on disk

- `frontend/.browser-driver-results.json` — 156 KB, `generatedAt 2026-09-03T07:15:47.093Z`, `buildId iTIKVvc-wqpbkjxEiy548`, `serverMode: production`, 13 authenticated routes, 208 samples. **91 commits behind head.**
- `frontend/.browser-journeys-results.json` — **does not exist and has never been committed** (`git log --all -- frontend/.browser-journeys-results.json` is empty).

---

## 2. Per-criterion assessment

---

### PRD-C009 — "complete v2 ticket 20's in-scope responsive, keyboard, screen-reader, loading, empty, error, offline, permission and retry states."

**Status: PARTIALLY MET.** Nine dimensions, walked in the order the criterion names them.

I re-derived the surface population independently (JS port of `surface-state-analysis.ts`): **556 authenticated `page.tsx`; 539 classified as reading server state; mean import closure 16.7 modules; 2 surfaces hit the 120-module closure cap.**

| # | Dimension | Verdict | Evidence |
|---|---|---|---|
| 1 | **Responsive** | **NOT MET** | The only harness that can observe layout (`browser-journeys.mjs`, 375/768/1280) has never produced an artifact and is in no CI job. The jsdom test that claims 375/768/1280 renders an identical tree three times — see F7, F9. |
| 2 | **Keyboard** | **MET in scope** | Independent census: 3,668 .tsx scanned, **633 lowercase click sites, 9 unreachable — and all 9 are CRM/Inventory** (`inventory/purchase-orders/page.tsx:198,253`; `crm/contacts/contact-list-page.tsx:186`; `crm/deals/*`; `crm/leads/kanban-card.tsx:177,369,386`; `crm/settings/shared/chip-control.tsx:91`). **In-scope unreachable click targets: 0.** Skip-to-content link → `#dashboard-content`, `aria-expanded` on sidebar/mobile toggles, `aria-current="page"`, and row-action `propagationShield` all asserted. I checked the 20 lowercase key-handling elements with no `tabIndex` and **every one is a propagation shield, not a target** — no defect. |
| 3 | **Screen reader** | **NOT MET** | **287 in-scope controls whose ARIA role requires a name carry none** — see F1. |
| 4 | **Loading** | **MET at component level, GAP at route level** | 539/539 data surfaces carry a loading signal; 353 of 363 `loading.tsx` are skeleton-shaped; skeleton blocks are `aria-hidden` inside one `role="status"` region with `aria-busy`. But **101 in-scope routes have no `loading.tsx` at any ancestor**, 40 of which are `await`-ing server modules — see F10. And the ratchet's loading signal is partly tautological — see F13. |
| 5 | **Empty** | **MET at 532/539** | 7 surfaces lack one and are pinned by route as not-applicable (5 in scope, 2 CRM/Inventory). `EmptyState` distinguishes filtered-empty from data-empty via `filtersActive`, and refuses to claim emptiness when `access.denied`. Weakness: **31 in-scope hand-rolled empty states the gate cannot see** — see F12. |
| 6 | **Error** | **MET** | **556/556** authenticated pages have an ancestor `error.tsx`; 177/196 delegate to `RouteErrorBoundary` (`role="alert"`, `<h1>`, "Try Again", `<main>` only when fullscreen). 649 of 665 `<ErrorState>` call sites pass `onRetry`. Two real error-as-empty defects remain — see F5, F6. |
| 7 | **Offline** | **MET** | Handled once in `components/layout/dashboard-shell.tsx:218` via `ShellOfflineBanner` (`role="status"`, `aria-live="polite"`), driven by `useSyncExternalStore` over both `online` and `offline` events. Four in-scope consumers deepen it: `DataTable` announces `PAUSED_LABEL` through a `role="status"` sr-only span and drops `aria-busy` while offline (`components/ui/data-table.tsx:283-295`), plus inbox, mail and notifications. Only gap: `app/employee-onboarding/` sits outside `(authenticated)` and gets no banner. |
| 8 | **Permission** | **MET at 530/539** | 530 surfaces render a real denial component or sit behind a server gate (`requirePermission` / `enforceRouteAccess` / `requireModulePermission`). The 9 that only compute a boolean are `/dashboard`, `/calendar`, `/chat` and the six `/me/*` self-service routes — routes every authenticated member is entitled to, where a route-level denial would be wrong. `check:permission-binding` verified 2,384 bindings, exit 0. The gate is **not inert**. |
| 9 | **Retry** | **MET** | 649/665 `<ErrorState>` with `onRetry`; `RouteErrorBoundary` always has one; **9 in-scope `<ErrorState>` without a retry** (F15). |

---

### PRD-C138 — "verify loading/empty/error/offline/permission states, keyboard/screen reader, focus, contrast and responsive 375/768/1280 behavior."

**Status: PARTIALLY MET.** The five states, keyboard and focus hold; screen-reader naming, contrast and responsive do not.

**Focus — MET.** Read and re-ran: focus moves into `Dialog`/`Sheet` on open; Escape restores it to the trigger; the rest of the page is `aria-hidden` while open; a controlled `AlertDialog` opened from a row action restores focus to the *opener* with no proxy trigger in the tab order; a sheet opened from a menu item leaves focus on the real control. `--ring` clears WCAG 2.2 SC 1.4.11's 3:1 on `--background`, `--card`, `--muted` and `--sidebar` **in the default theme** (and fails in 11 of the other 17 — see F2).

**Contrast — PARTIALLY MET. This is the weakest dimension of the ticket.**

Three separate holes, each measured:

1. **Only 2 of 19 palettes are asserted.** `components/ui/__tests__/contrast-tokens.test.ts:40` reads `globals.css` and nothing else. `themes.css` (422 lines) defines **17 selectable accent themes × light/dark**, each overriding `--primary`, `--primary-foreground`, `--ring`, `--sidebar-*`, and — through `:root:not(.dark)[class*="theme-"]` — `--background`, `--card`, `--muted`, `--secondary`, `--accent`, `--border`, `--input`, `--sidebar`. Any authenticated user can switch themes from the avatar menu (`components/layout/header/user-avatar-menu.tsx:47` → `components/theme/theme-switcher.tsx`). I computed every pair (sRGB `color-mix`, WCAG 2.x relative luminance): **6 of 17 themes put primary button text below AA 4.5:1 and 11 of 17 put the focus ring below the 3:1 non-text floor.** See F2 for the table.
2. **No jest test in this repo has ever evaluated a painted colour.** `next/jest` maps every `.css` import to `__mocks__/styleMock.js` (`node_modules/next/dist/build/jest/jest.js:182`), so `globals.css`/`themes.css` are never applied; and `canvas` is not installed, so axe-core's `color-contrast` rule cannot run in jsdom at all. The 22 jest-axe suites are silent on contrast by construction. The `browser-journeys.mjs` harness *does* sample the colour actually behind the text — and has never been run (F7).
3. **Alpha-composited text is invisible to the token test.** 534 in-scope `text-<token>/<alpha>` occurrences; **290 across 176 files paint below AA 4.5:1** on both `--card` and `--background`. The unambiguous core is the `text-muted-foreground/<alpha>` family: **254 sites, of which 244 fall below even the 3:1 large-text floor.** See F4. One of them is inside a state this ticket owns: `NoPermissionState`'s permission slug at **2.20:1** (F3).

The parts that *are* real: the token arithmetic in `contrast-tokens.test.ts` is honest work — it derives ratios from the actual hex values, self-tests to 21:1 and 1:1, carries four bite proofs naming the exact values that previously failed, and **records** rather than hides that `muted-foreground` on `--muted` (light) is 4.34:1 and that four of five `-ink` tones fail AA on some light surface.

**Responsive 375/768/1280 — NOT MEASURED at head.**
`components/ui/__tests__/page-states-responsive.a11y.test.tsx` asserts 21 things at three widths. But `atViewport()` only sets `window.innerWidth` and stubs `matchMedia`, and **none of `PageWrapper`, `StatCard`, `StatCardGrid`, `SearchInput`, `LoadingState`, `EmptyState`, `ErrorState` or `NoPermissionState` reads either** (grepped: zero hits for `innerWidth|matchMedia|useIsMobile|useMediaQuery` in all eight). jsdom has no layout engine and no CSS is loaded, so the tree rendered at 375 px is byte-identical to the tree at 1280 px. The width loop is three copies of one assertion. It is not wrong — it just cannot answer the question the criterion asks. See F9.

---

### PRD-C150 — "Show navigation, skeleton, optimistic or queued feedback within 100 ms of user intent; never leave an action apparently unresponsive while work runs."

**Status: PARTIALLY MET.**

**Mutations — MET, and this is a genuine strength.** Measured across every in-scope file that calls `useMutation` / `mutate` / `mutateAsync`:
- **573 `<LoadingButton>` call sites; 570 bind `isPending`.** The 3 that don't are false positives I read individually: a "New policy" dialog opener (`features/accounting/expenses/policies-client.tsx:148`), a bare-`isPending` shorthand (`features/hr/templates/template-preview-dialog.tsx:59`), and a Cancel button (`features/hr/templates/template-upsert-sheet.tsx:367`).
- **0 of 845 plain `<Button>` action controls in mutating files carry `type="submit"` without a pending binding.**
- `LoadingButton` disables itself, sets `aria-busy`, shows a spinner and swaps in `loadingText` — so the pending state reaches assistive technology, not just the eye.

**Navigation — PARTIALLY MET, and the evidence behind it is compromised.**

What is measured: `.browser-driver-results.json` → `perceivedResponsiveness` = "in-page click on an in-app nav link, timed to the first DOM mutation on the same clock", target 100 ms. **desktop p50 1 ms / p75 1 ms / max 3 ms over 13 navigations; mobile p50 5 ms / p75 5 ms / max 76 ms over 12.** All inside budget. The mechanism is real: `NavPendingIndicator` uses Next's `useLinkStatus`, is present in the DOM in both states so appearing costs no CLS, and is `aria-hidden` (the route change is the announcement).

Five reasons that is not the whole criterion:

1. **The capture's own driver declared it unusable.** `contentAssertion.verdict` in that file reads `"capture is NOT usable evidence"` — 16 of 208 samples rendered an error boundary on `/crm/leads`. `check-web-vitals-budget.mjs` never reads `contentAssertion`, `routeFailures`, `authorization`, `hydration` or `settle`; it reads only the numbers. See F8.
2. **It is 91 commits stale.** Captured 2026-09-03T07:15Z; head is 2026-09-03T16:50Z, and the intervening commits include `perf(shell): defer the command palette and workspace dialog`, `perf(dashboard): defer six below-the-fold cards`, `perf(chat,calendar): defer 25 interaction-gated subtrees` and `perf(inbox family): defer heavy sheets`. The gate has **no staleness guard** — it never compares `buildId` or `generatedAt` to the current build.
3. **13 of 556 routes (2.3%).** And only *one* link click per route.
4. **Only p75 is judged**, aggregated across all routes per profile. `max_ms` is printed and never asserted, so one route at 500 ms cannot fail the gate while twelve sit at 5 ms.
5. **Only in-view sidebar/bottom-nav link clicks are covered.** `NavPendingIndicator` appears at exactly **4 call sites** (`sidebar-section.tsx:187,274`, `mobile-module-bottom-nav.tsx:49,125`) against **481 `<Link>` sites and 187 `router.push(` sites in 141 files**, of which only 30 files use `useTransition`. There is no global route-progress bar anywhere in the tree. See F11.

**Skeleton on navigation — GAP.** 101 in-scope routes have no `loading.tsx` boundary; 40 of those are server modules that `await` before returning anything, so the App Router holds the previous page on screen until the server render resolves. See F10.

---

## 3. Findings

| # | Sev | File:line | Summary |
|---|---|---|---|
| F1 | **P1** | `frontend/features/settings/organization/org-localization-section.tsx:238` (+286 more) | 287 in-scope design-system controls whose ARIA role requires a name carry none |
| F2 | **P1** | `frontend/components/ui/__tests__/contrast-tokens.test.ts:40` / `frontend/themes.css:3` | 17 selectable themes never contrast-checked; 6 fail AA on primary text, 11 fail the 3:1 ring floor |
| F3 | **P1** | `frontend/components/shared/no-permission-state.tsx:47` | The permission-denied state's own slug paints at 2.20:1 |
| F4 | **P1** | `frontend/components/ui/empty-state.tsx` + 175 other files | 254 in-scope `text-muted-foreground/<alpha>` text sites below AA; 244 below even 3:1 |
| F5 | **P1** | `frontend/features/hr/onboarding/onboarding-detail-sheet.tsx:108` | A failed read tells a new employee "No documents required" |
| F6 | **P1** | `frontend/features/hr/document-review/review-sheet.tsx:236` | A failed read tells an HR reviewer the employee submitted nothing |
| F7 | **P1** | `frontend/scripts/browser-journeys.mjs:1070` | The only harness that can measure 375/768/1280, painted contrast and runtime axe has never been run and is in no CI job |
| F8 | **P1** | `frontend/scripts/check-web-vitals-budget.mjs:629` | The vitals gate accepts a capture its own driver marked "NOT usable evidence", and has no staleness guard |
| F9 | P2 | `frontend/components/ui/__tests__/page-states-responsive.a11y.test.tsx:66` | The 375/768/1280 loop renders an identical tree three times |
| F10 | P2 | `frontend/app/(authenticated)/build/page.tsx:5` (+39 more) | 40 in-scope `await`-ing server routes with no `loading.tsx` above them |
| F11 | P2 | `frontend/features/hr/employees/employees-list-page.tsx:401` (+186 more) | 187 `router.push` navigation intents with no pending affordance |
| F12 | P2 | `frontend/scripts/check-no-handrolled-empty-states.mjs:31` | The detector is Tailwind-class-order-sensitive; 31 in-scope hand-rolled empty states slip past it |
| F13 | P2 | `frontend/test-utils/surface-state-analysis.ts:138,147` | `loading` and `error` share their detector token with `readsServerState`, so 91 and 36 surfaces are counted covered by tautology |
| F14 | P2 | `frontend/components/__tests__/authenticated-surface-states.contract.test.ts:18` | `pageLevelSpinner` (AP-7) is computed for every surface and asserted on none; 97 surfaces carry `animate-spin` |
| F15 | P2 | `frontend/features/accounting/banking/components/banking-hub-client.tsx:138` (+8) | 9 in-scope `<ErrorState>` render a dead end with no retry |
| F16 | P2 | `.github/workflows/frontend.yml:603` | The measured Web Vitals gate is `continue-on-error: true` |

---

### F1 — P1 — 287 in-scope controls with no accessible name

**File:** `frontend/features/settings/organization/org-localization-section.tsx:238,247,256,265,274,283,292,301` — representative of 186 in-scope files.

Independent re-run of `analyzeControlNames`: **3,668 files scanned, 1,141 name-required control call sites, 823 named, 318 unnamed.**

| Control | Renders | Total | Unnamed | Unnamed in-scope |
|---|---|---|---|---|
| `SelectTrigger` | `<button role="combobox">` | 872 | 236 | **218** |
| `Switch` | `<button role="switch">` | 172 | 57 | **45** |
| `Checkbox` | `<button role="checkbox">` | 87 | 24 | **23** |
| `RadioGroupItem` | `<button role="radio">` | 10 | 1 | **1** |
| | | **1,141** | **318** | **287** across 186 files |

These roles do not take a name from their content, so visible text inside the trigger names nothing, and an adjacent `<Label>` with no `htmlFor` names nothing either. `SelectTrigger` deliberately refuses a generic default (`components/ui/select.tsx:58-64`), which is the right call — but the consequence is 218 anonymous comboboxes.

**Failure scenario.** A screen-reader user opens Settings → Organization → Localization. Eight `<Label className="text-xs font-medium">` elements sit above eight `<SelectTrigger><SelectValue /></SelectTrigger>` pairs, none with `htmlFor` and none with an `id` (verified by reading lines 236-301). NVDA announces eight consecutive controls as "combobox, collapsed" with no other information. The user cannot tell Timezone from Currency from Fiscal-year-start, and any value they commit is a guess. The same shape recurs in `features/timesheets/settings/general-settings-form-fields.tsx` (9), `features/build/views/display-options-panel.tsx` (6), `features/hr/recruitment/jobs/create-job-form/hiring-pipeline-sections.tsx` (6), `features/notifications/preferences-page.tsx` (4) and 181 more.

**Fix.** For each site, the cheapest correct mechanism in order of preference: (a) give the neighbouring `<Label>` a `htmlFor` and the trigger the matching `id`; (b) wrap the pair in `<FormField>/<FormItem>/<FormLabel>/<FormControl>`, which already stamps `id={formItemId}` and the matching `htmlFor`; (c) add a `placeholder` to the enclosed `<SelectValue>`, which `SelectTrigger` already promotes to the accessible name. The census in `design-system-control-names.contract.test.ts` enumerates every one by file and line, so this is mechanical — lower `BASELINE.unnamed` in the same commit.

---

### F2 — P1 — 17 selectable themes have never been contrast-checked; 6 fail AA, 11 fail the focus-ring floor

**Files:** `frontend/components/ui/__tests__/contrast-tokens.test.ts:40` (reads `globals.css` only); `frontend/themes.css:3-421`.

`APP_THEMES` (`lib/theme/app-themes.ts:28-47`) offers 18 themes. The default "Ink" one lives in `globals.css` and is the only one the contrast test can see. The other 17 live in `themes.css`, are applied as `:root.theme-<id>` by `components/theme/app-theme-provider.tsx:77` and by the pre-hydration script at `components/theme/app-theme-script.tsx:12`, and are chosen from the avatar menu.

Computed with the same WCAG relative-luminance formula the existing test uses, mixing the tinted neutrals exactly as `:root:not(.dark)[class*="theme-"]` and `:root.dark[class*="theme-"]` declare (`color-mix(in srgb, …)` = gamma-encoded sRGB interpolation):

```
theme       pfg/primary   ring/bg(L)  ring/card(L)  ring/muted(L)  ring/bg(D)
red             4.83         3.43        3.66          3.16          4.87
orange          3.56 FAIL    2.58 FAIL   2.74 FAIL     2.40 FAIL     6.35
amber           8.97         1.99 FAIL   2.12 FAIL     1.87 FAIL     8.07
yellow          9.52         1.78 FAIL   1.89 FAIL     1.68 FAIL     8.95
lime            9.69         1.84 FAIL   1.95 FAIL     1.73 FAIL     8.75
green           3.30 FAIL    2.11 FAIL   2.24 FAIL     1.97 FAIL     7.68
emerald         3.77 FAIL    2.33 FAIL   2.49 FAIL     2.18 FAIL     6.94
teal            3.74 FAIL    2.29 FAIL   2.45 FAIL     2.15 FAIL     7.11
cyan            3.68 FAIL    2.23 FAIL   2.39 FAIL     2.09 FAIL     7.27
sky             4.10 FAIL    2.56 FAIL   2.71 FAIL     2.36 FAIL     6.41
blue            5.17         3.36        3.61          3.11          4.93
indigo          6.29         4.07        4.36          3.75          4.11
violet          5.70         3.87        4.14          3.56          4.32
purple          5.38         3.60        3.87          3.34          4.60
fuchsia         4.71         3.16        3.37          2.91 FAIL     5.26
pink            4.60         3.22        3.44          2.97 FAIL     5.16
rose            4.70         3.35        3.58          3.06          5.01
```

- **6 of 17** put `--primary-foreground` on `--primary` below AA 4.5:1 — every primary button, badge and filled control label in those themes.
- **11 of 17** put `--ring` below WCAG 2.2 SC 1.4.11's 3:1 on at least one light surface — worst is `yellow` at **1.68:1 on `--muted`**.
- **17 of 17** put `muted-foreground` on the tinted `--muted` below 4.5:1 (3.97–4.16).

**Failure scenario.** A user picks Green from the avatar menu. Every "Save", "Create" and "Confirm" button now renders white-ish text on `#16a34a` at **3.30:1**, and every keyboard focus ring renders at **1.97:1 on `--muted`** — a low-vision keyboard user cannot see where focus is. No test in either repo fails. The default-theme assertions all still pass, because the file the test reads never changed.

**Fix.** Extend `contrast-tokens.test.ts` to iterate `getSelectableThemeIds()` and read `themes.css` in addition to `globals.css`, resolving `color-mix(in srgb, var(--brand-core) N%, #hex)` for the tinted neutrals; assert `primary-foreground/primary ≥ 4.5` and `ring/{background,card,muted,sidebar} ≥ 3.0` in both modes. Then repair the 6 + 11: darken `--primary` (or flip `--primary-foreground` to a dark ink) for orange/green/emerald/teal/cyan/sky, and give the light-mode `--ring` its own darker value per theme rather than reusing the 500-weight brand colour.

---

### F3 — P1 — the permission-denied state's own slug is unreadable

**File:** `frontend/components/shared/no-permission-state.tsx:47`

```tsx
<p className="text-xs text-muted-foreground/60 font-mono bg-muted px-2 py-1 rounded">
  {permission}
</p>
```

Composited: `#64748b` at 60 % over `--muted #f1f5f9` = `#a3adb9`, against `#f1f5f9` → **2.20:1 (light)**, **3.26:1 (dark)**. It is `text-xs`, so AA demands 4.5:1.

**Failure scenario.** A user hits a section they lack permission for. The one piece of actionable information on the screen — the permission slug they must quote to their administrator — is the least readable text on the page. `NoPermissionState` is reachable from 530 of 539 authenticated surfaces, so this is the single most-rendered contrast defect in the product. The `page-states-responsive.a11y.test.tsx` suite renders this exact component and passes, because axe cannot judge colour in jsdom.

**Fix.** Drop the `/60`: `text-xs text-muted-foreground font-mono bg-muted` is 4.34:1, still short. Use `text-foreground/70` on `bg-muted` (6.74:1) or `text-foreground` (17.06:1). Cheapest correct change: `text-muted-foreground/60` → `text-foreground/80`.

---

### F4 — P1 — 254 in-scope text sites painted below AA by an opacity modifier

**Files:** 176 in-scope files. Representative: `frontend/components/shared/no-permission-state.tsx:47`, `frontend/components/ui/search-input.tsx:85`, `frontend/components/ui/avatar-stack.tsx:82`.

Composited ratios against the default light palette (`--muted-foreground #64748b`):

```
                        background   card    muted
text-muted-foreground/30   1.45      1.47    1.45
text-muted-foreground/40   1.68      1.70    1.66     (66 sites)
text-muted-foreground/50   1.94      1.96    1.89     (55 sites)
text-muted-foreground/60   2.25      2.30    2.20     (53 sites)
text-muted-foreground/70   2.66      2.71    2.58     (43 sites)
text-muted-foreground/80   3.14      3.24    3.04     ( 9 sites)
```

**534** in-scope `text-<token>/<alpha>` occurrences exist; **290 across 176 files** fall below 4.5:1 on both `--card` and `--background`. The unambiguous subset is the `muted-foreground` family: **254 sites, of which 244 (alpha ≤ 70) fall below even the 3:1 large-text floor.** Separately, **60 single-element class strings pair `text-muted-foreground` with `bg-muted`** — the exact pairing `contrast-tokens.test.ts` already records at 4.34:1 without failing on it.

**Failure scenario.** A user with mild low vision or a laptop in daylight reads a timestamp, a helper caption or a counter at 1.68:1 — effectively invisible. Nothing in the repo can detect it: the token test only reads bare tokens, and axe-core's `color-contrast` rule cannot execute in jsdom (`canvas` is not installed and all CSS is stubbed to `styleMock.js`).

**Fix.** Two moves. (a) Add an assertion to `contrast-tokens.test.ts` that enumerates every `text-<token>/<alpha>` class in the corpus, composites it over `--background`/`--card`/`--muted` and requires 4.5:1 (3:1 for classes co-occurring with `text-lg`/`text-xl`), ratcheted at the current 290 so it can only fall. (b) Retire the alpha modifier on text: the design system already has `--muted-foreground` for secondary text and `text-foreground/70` (6.74:1) for tertiary; a mechanical replacement of `text-muted-foreground/{20..70}` → `text-muted-foreground` closes 244 of 254 in one pass.

---

### F5 — P1 — a failed read tells a new employee no documents are required

**File:** `frontend/features/hr/onboarding/onboarding-detail-sheet.tsx:97-98, 108, 222, 236`

```tsx
const { data: myDocs,  isLoading: docsLoading  } = useMyOnboardingDocs();
const { data: docTypes, isLoading: typesLoading } = useHrDocumentTypes();
const isLoading = docsLoading || typesLoading;          // :108 — no isError anywhere in the file
...
const types = (docTypes ?? []).filter(...)               // :112
if (isLoading) return <skeletons/>;                      // :222
if (checklist.length === 0) return (
  <EmptyState title="No documents required"
              description="Your HR team hasn't configured any required documents yet." />
);                                                        // :236
```

The file never references `isError`, `error` or `ErrorState` — confirmed by full-file grep.

**Failure scenario.** `GET /hr/document-types` 500s (or the session token has just expired, or the tenant's row-level policy refuses). TanStack settles to `isLoading: false`, `data: undefined`. `docTypes ?? []` yields `[]`, `checklist.length === 0`, and the wizard renders a definitive, reassuring claim: **"No documents required — Your HR team hasn't configured any required documents yet."** The new hire clicks Continue and finishes onboarding with zero documents uploaded. HR discovers it later. There is no retry control on the screen because there is no error branch.

**Fix.** Destructure `isError`/`error` from both queries; render `<ErrorState onRetry={() => { docs.refetch(); types.refetch(); }} />` before the emptiness branch. The emptiness claim must be reachable only from a settled, successful read.

---

### F6 — P1 — a failed read tells an HR reviewer the employee submitted nothing

**File:** `frontend/features/hr/document-review/review-sheet.tsx:92-98, 236-243`

```tsx
const { data: docsData, isLoading: docsLoading, isFetching: docsFetching }
  = useEmployeeOnboardingDocs(userId, docsCursor);   // no isError destructured
const employeeDocs = docsData?.data;                  // :98
...
) : !employeeDocs || employeeDocs.length === 0 ? (
  <EmptyState title="No documents submitted"
              description="This employee has not submitted any documents yet." />  // :236
```

**Failure scenario.** The reviewer opens an employee's document-review sheet during a backend incident. The read fails, `docsData` is `undefined`, and the sheet asserts the employee submitted nothing. The reviewer chases a compliant employee, or worse, marks the onboarding record as non-compliant. The paging controls beneath still render, so nothing on screen suggests a failure.

**Fix.** Same shape as F5 — destructure `isError`, branch to `<ErrorState onRetry={refetch} />` above the emptiness branch.

---

### F7 — P1 — the responsive / contrast / runtime-axe harness has never run and is in no CI job

**File:** `frontend/scripts/browser-journeys.mjs:1070` (`--out` defaults to `.browser-journeys-results.json`)

`browser-journeys.mjs` is 1,494 lines and is the only thing in either repo that can answer three of C138's dimensions: horizontal overflow at **375 / 768 / 1280** with the offending element named; WCAG AA against **the colour actually behind the text**; and axe-core over **the tree the product paints**, with `<Dialog>` expanded and every `id` resolved or not. It also asserts one `<h1>` and a named `<main>` per step, that every step settles into a terminal state rather than an eternal skeleton, and that a real UI-driven write survives a reload.

- `frontend/.browser-journeys-results.json` **does not exist on disk** and `git log --all --` on that path returns nothing. No run has ever been recorded.
- `grep -rn "browser:journeys\|browser-journeys" .github/workflows/` returns **zero hits**. `check:gate-wiring` reports 35 wired gates; this is not one of them.
- Commit `8560e1748 chore(a11y): refresh the browser-journey results artifact` — whose message claims "63 of 63 planned steps, 45,346 nodes, violations 55 → 46" — **modified `.browser-driver-results.json`, the Web Vitals artifact**, whose contents contain no `axe`, `violation`, `journey`, `contrast`, `overflow` or `wcag` key at all (verified by substring scan). The commit message and the committed file disagree.

**Failure scenario.** A layout regression that overflows the viewport at 375 px, or an accent theme that drops a button label to 3.3:1, or a dialog with a dangling `aria-labelledby`, ships with every gate green. This is the same class the repo has been burned by nine times and documents in `gate-corpus.mjs`: a check that cannot run is indistinguishable from a check that passes. Worse here — the check exists, is well built, and is simply never invoked, while a commit message asserts its output.

**Fix.** Wire `browser:journeys:self-test` as a blocking CI step immediately (it is hermetic). Then produce one real run against a production build with a minted session cookie, commit `.browser-journeys-results.json`, and add a `check:browser-journeys` gate that reads it, refuses a run with fewer steps than planned, refuses one whose axe never executed, and ratchets the violation count. Until then, C138's responsive and painted-contrast dimensions must be recorded as **not measured**, not as passing.

---

### F8 — P1 — the vitals gate accepts a capture its own driver called unusable, and cannot detect staleness

**File:** `frontend/scripts/check-web-vitals-budget.mjs:629-680`

`main()` correctly refuses a missing file, a non-JSON file, `serverMode !== "production"` and an empty `authenticatedRoutes`. It then reads only the metric numbers. `grep -n "contentAssertion|unusable|verdict|routeFailures|authorization|hydration|settle"` over the whole script returns **nothing**.

The committed capture contains:

```json
"contentAssertion": { "minWordsPerSample": 10, "samplesMeasured": 208,
  "unusableSamples": [ ...16 entries, all /crm/leads, "errorBoundary": true... ],
  "verdict": "capture is NOT usable evidence" }
```

and `"generatedAt": "2026-09-03T07:15:47.093Z"` with `"buildId": "iTIKVvc-wqpbkjxEiy548"` — 91 commits behind head, including four `perf(...)` commits that deferred subtrees on exactly the measured routes.

**Failure scenario.** CI runs `check:web-vitals-budget`, which prints "Perceived responsiveness … p75 1 ms" and reports one CLS breach. A reviewer reads that as C150 satisfied at head. In fact the driver marked the capture unusable, and the numbers describe a build nobody can reproduce. Nothing would change if the artifact were a year old.

**Fix.** Two guards in `main()`. (1) After parsing, if `results.contentAssertion?.verdict` is not the success verdict, or `routeFailures.count > 0`, or `authorization.unauthorizedSamples.length > 0`, exit 1 with that verdict quoted — the driver already decided; the gate must honour it. (2) Add a freshness guard: record the frontend `git rev-parse HEAD` into the capture at measure time and fail when it does not match the tree being gated (or, weaker, fail when `generatedAtMs` is older than the newest commit touching `frontend/app`, `frontend/features`, `frontend/components`).

---

### F9 — P2 — the 375/768/1280 loop renders the same tree three times

**File:** `frontend/components/ui/__tests__/page-states-responsive.a11y.test.tsx:66-129`

12 axe assertions and 9 anatomy assertions are parameterised over `VIEWPORTS = { mobile: 375, tablet: 768, desktop: 1280 }`. `atViewport()` (`test-utils/viewport.ts:11-45`) sets `window.innerWidth` and stubs `matchMedia`. **None of the eight components under test reads either value** (verified by grep for `innerWidth|matchMedia|useIsMobile|useMediaQuery` across `page-wrapper.tsx`, `stat-card.tsx`, `search-input.tsx`, `loading-state.tsx`, `empty-state.tsx`, `error-state.tsx`, `no-permission-state.tsx`), and `next/jest` maps all CSS to `styleMock.js`, so Tailwind's `md:`/`lg:` variants never apply.

**Failure scenario.** Someone adds `flex-wrap` to the filter row at the `md` breakpoint, breaking the "one non-wrapping line" contract at 768 px only. The test at 768 px asserts `filterRow?.className` does not contain `flex-wrap` — but it inspects the *unconditional* class string, which is identical at all three widths, so the responsive-only regression passes. Equally, an element that overflows the viewport at 375 px cannot be detected: jsdom reports 0 for every box.

**Fix.** Keep the suite (the state-primitive semantics assertions in it are valuable and genuinely width-independent) but stop labelling it responsive evidence — rename the describe to "page states at every reference width render the same accessible tree" and move the real width claim into `browser-journeys.mjs`, per F7.

---

### F10 — P2 — 40 in-scope awaiting server routes with no loading boundary above them

**Files:** `frontend/app/(authenticated)/build/page.tsx:5` is the clearest case:

```tsx
export default async function BuildRoute() {
  await enforceRouteAccess("/build");   // backend round trip
  return <ProjectsPage />;              // no Suspense
}
```

**101 in-scope authenticated routes have no `loading.tsx` at any ancestor** (455/556 covered = 81.8 %). By top segment: `accounting` 74, `build` 15, `me` 7, `blog` 2, `portal` 2, `subjects` 1. Zero of the 101 are CRM/Inventory. Of the 101, **40 are server modules that `await` before returning any JSX** — including all seven `/me/*` self-service routes, `/build` and its workspace tree, `/portal`, and thirteen `/accounting` detail routes.

**Failure scenario.** A user clicks "Build" from anywhere other than the sidebar (the header, a dashboard card, a breadcrumb, a row). `enforceRouteAccess("/build")` makes a backend authorization round trip. With no `loading.tsx` boundary the App Router keeps the *previous* page painted until that resolves, and there is no pending affordance on the control that was clicked (F11). The `nav-pending-indicator.test.tsx` header records the measured ceiling for exactly this: "tapping a nav link on the mobile profile produced NO DOM change for up to 1,739 ms". That was fixed for sidebar links only.

**Fix.** Add a `loading.tsx` at each of the 6 in-scope top segments that currently lack one (`accounting`, `build`, `me`, `blog`, `portal`, `subjects`) rendering `<LoadingState variant="page" />` — six files covering all 101 routes. Then add a test asserting `ancestorHas(page, "loading.tsx")` for every authenticated page, ratcheted at 0.

---

### F11 — P2 — 187 navigation intents with no pending affordance

**File:** `frontend/features/hr/employees/employees-list-page.tsx:401`

```tsx
onRowClick={(emp) => router.push(`/hr/employees/${emp.id}`)}
```

No `useTransition`, no `isPending`, no indicator; grep for `useTransition|isPending|startTransition` in that file returns nothing.

Corpus: **187 `router.push(` sites across 141 files**; only **30 files** anywhere in the frontend use `useTransition`. **481 `<Link>` sites**; `NavPendingIndicator` appears at **4**. **77 `onRowClick` sites.** There is no global route-progress bar (`grep -rln "nprogress|TopProgress|RouteProgress|ProgressBar"` over `app/` and `components/` returns nothing).

**Failure scenario.** On the mobile profile, an HR admin taps an employee row. `/hr/employees/[id]` is a dynamic authenticated route; the row does not change state, no bar appears, and the list stays fully interactive while the navigation runs. The user taps a second row, then a third. C150's second clause — "never leave an action apparently unresponsive while work runs" — is violated on the single most common navigation gesture in the product, and the measurement in `.browser-driver-results.json` cannot see it because it only clicks in-view nav links.

**Fix.** `DataTable` already owns the row element (`components/ui/data-table.tsx:327-342`). Give it an optional `pendingRowKey`, or wrap `onRowClick` in `startTransition` and render the row with `aria-busy` + a subtle indeterminate bar while `isPending`. That one change covers all 77 `onRowClick` sites. For the remaining `router.push` sites, a shell-level route-progress element driven by `useLinkStatus`-equivalent state is cheaper than 141 local fixes.

---

### F12 — P2 — the hand-rolled-empty-state gate is Tailwind-class-order-sensitive

**File:** `frontend/scripts/check-no-handrolled-empty-states.mjs:31-33`

```js
const HANDROLLED_STRUCTURE =
  /flex[^"]*flex-col[^"]*items-center[^"]*justify-center|text-center[^"]*text-muted-foreground[^"]*text-sm/;
```

The second alternative requires `text-center` **before** `text-muted-foreground` **before** `text-sm`. Tailwind class order is arbitrary. Rewriting the same rule order-insensitively finds **33 matches the gate misses, 31 of them in scope**, each within 15 lines of an empty-state phrase. Three I read and confirmed:

- `frontend/features/dashboard/payroll-widget.tsx:35` — `empty={<p className="text-xs text-muted-foreground text-center py-6">No data.</p>}`
- `frontend/features/build/project-list/project-table.tsx:78` — `emptyState={<div className="py-4 text-center text-sm text-muted-foreground">No projects found</div>}`
- `frontend/features/hr/recruitment/reports/components/result-table.tsx:56` — `emptyState={<p className="text-sm text-muted-foreground text-center py-8">No data matches the selected filters</p>}`

**Failure scenario.** The gate prints "✔ No hand-rolled empty states found (3,858 files scanned)" — a clean report over a corpus that contains 31. Each is a bare `<p>`/`<div>`: no heading, no illustration, no action, no `filtersActive` distinction, and no named region, so a screen-reader user in an empty list hears an unlabelled paragraph instead of the heading `EmptyState` supplies. `payroll-widget.tsx:35` and `:90` say only "No data." on the Home dashboard.

**Fix.** Replace the ordered alternation with an all-of test over the class string — `/className="[^"]*"/` captured once, then `.includes("text-center") && .includes("text-muted-foreground") && /text-(sm|xs|dense|label)/`. Then convert the 31 (they are all already inside an `emptyState`/`empty` prop, so `<EmptyState compact title=… />` drops straight in) and keep the gate at 0.

---

### F13 — P2 — the state ratchet counts 91 loading and 36 error states by tautology

**File:** `frontend/test-utils/surface-state-analysis.ts:132-147`

```js
const SERVER_STATE_SIGNALS = [/\bisLoading\b/, /\bisError\b/, /\buse(?:Query|…)\s*[<(]/];
const LOADING_SIGNALS      = [/\bSkeleton\b/, /\bLoadingState\b/, …, /\bisLoading\b/];   // :138
const ERROR_SIGNALS        = [/\bErrorState\b/, /\bisError\b/, /\bisApiError\b/];        // :147
```

`isLoading` proves both `readsServerState` and `loading`; `isError` proves both `readsServerState` and `error`. The signals are matched over the **text union of the whole import closure** (mean 16.7 modules), so a state rendered anywhere in a surface's dependency graph counts for the page.

Independent measurement over the 539 data surfaces:

| | real signal | **only the tautological token** | neither |
|---|---|---|---|
| loading | 448 (83.1 %) | **91 (16.9 %)** | 0 |
| error | 503 (93.3 %) | **36 (6.7 %)** | 0 |
| permission (real denial render / server gate) | 530 (98.3 %) | 9 boolean-only | 0 |

The 91 include the whole `/accounting` list family (`/accounting/invoices`, `/coa`, `/journal`, `/trial-balance`, `/customers`, `/vendors`, …); the 36 include `/hr`, `/hr/expenses`, `/hr/analytics` and most of `/knowledge/wiki/*`.

**Failure scenario.** `BASELINE.missingLoading: 0` and `missingError: 0` read as "every surface has a real loading and error state". For 91 and 36 surfaces respectively, all the ratchet established is that the surface *called a hook* — which is the same fact it used to decide the surface was in the denominator at all. A surface could delete its skeleton and keep `isLoading` in a `disabled:` expression and the ratchet would not move.

**Fix.** Split the signal sets: keep `isLoading`/`isError` in `SERVER_STATE_SIGNALS` only, and require `LOADING_SIGNALS`/`ERROR_SIGNALS` to name a rendered artefact (`Skeleton`, `LoadingState`, `DataTableSkeleton`, `ErrorState`, `isApiError`). Re-baseline at the measured 91 and 36 and ratchet down. This is a truthful re-baselining, not a regression — the states may well exist; today's numbers simply do not show it.

---

### F14 — P2 — AP-7 is computed for every surface and asserted on none

**File:** `frontend/components/__tests__/authenticated-surface-states.contract.test.ts:14-24`

`surface-state-analysis.ts:191` computes `pageLevelSpinner: PAGE_SPINNER_SIGNAL.test(text)` for every one of the 556 surfaces. The contract test references `pageLevelSpinner` at lines 198, 209 and 216 — **all three inside the analyzer self-test**, over synthetic strings. `BASELINE` has no entry for it and no `it()` judges the real corpus.

Measured: **97 of 539 data surfaces (18.0 %) carry `animate-spin` somewhere in their closure.**

**Failure scenario.** The rule the analyzer names AP-7 — a lone spinner standing in for a page loading state instead of a layout-shaped skeleton — is detected and discarded. A new surface can ship `if (isLoading) return <div className="animate-spin" />` and the ratchet stays green, because `animate-spin` is not in `LOADING_SIGNALS` but the surrounding `isLoading` is (F13), so the surface even scores `loading: true`.

**Fix.** Add `pageLevelSpinner` to `BASELINE` at the measured 97 with an `it()` that ratchets it, and enumerate the current 97 by route so they cannot rotate. `LoadingState variant="page"` already renders zero `.animate-spin` and >10 `.animate-pulse` blocks, so the conversion target exists.

---

### F15 — P2 — 9 in-scope error states with no way out

**Files:** `frontend/features/accounting/banking/components/banking-hub-client.tsx:138`, `frontend/features/accounting/core/dimensions-table.tsx:183`, `frontend/features/accounting/planning/forecast-page.tsx:311`, `frontend/features/accounting/purchases/new-purchase-bill-page.tsx:207` and `:210`, `frontend/features/accounting/purchases/purchase-bill-detail-page.tsx:192`, `frontend/features/accounting/sales/credit-notes-page.tsx:283`, `frontend/features/accounting/sales/recurring-invoices-page.tsx:162`, `frontend/features/surveys/builder/survey-detail-content.tsx:31`.

**649 of 665 `<ErrorState>` call sites pass `onRetry`;** 16 do not, 9 of them in scope.

**Failure scenario.** A transient 503 on `/accounting/purchase-bills/new` renders `<ErrorState>` with no "Try again" button. The only recovery is a full page reload, which on a half-filled bill form loses the user's entry. C009 names retry as a required state.

**Fix.** Pass `onRetry={query.refetch}` at each of the 9. Then make it structural: give `ErrorState` a required `onRetry` (or a deliberate `onRetry={null}` opt-out with a comment) so the 650th site cannot omit it silently.

---

### F16 — P2 — the measured Web Vitals gate cannot fail CI

**File:** `.github/workflows/frontend.yml:601-604`

```yaml
- name: Web Vitals budgets (measured)
  if: ${{ !cancelled() }}
  continue-on-error: true
  run: pnpm run check:web-vitals-budget
```

It exits 1 today (mobile `/crm/inbox` CLS 0.109 > 0.100) and the job stays green. The current breach is CRM-owned and legitimately excepted; the problem is that the flag also masks any *future* in-scope breach, including the C150 perceived-responsiveness assertion that lives in the same gate.

**Fix.** Move the CRM route into a per-route exception list the gate reads (the manifest at `contracts/route-bundle-manifest.json` already has the owner/reason shape for this) and delete `continue-on-error`, matching the note the workflow itself already states as its own rule: "This file's own rule is to delete continue-on-error when the number is no longer above the line."

---

## 4. What head already gets right

These are measured, not assumed, and several are unusually strong.

1. **Route error coverage is complete.** 556/556 authenticated pages have an ancestor `error.tsx`; 177/196 delegate to a single `RouteErrorBoundary` that renders `role="alert"`, a real `<h1>` (with the comment explaining why it must be `h1` and not `h2`), a named "Try Again" control, and `<main>` only in the fullscreen layout so it never claims a second landmark.
2. **Mutation feedback is effectively universal.** 570/573 `LoadingButton` sites bind `isPending`; 0/845 plain action buttons in mutating files submit without a pending binding. `LoadingButton` sets `disabled`, `aria-busy` and a `loadingText` swap, so the state is exposed to assistive technology and not only to sighted users.
3. **Keyboard reachability is clean in scope.** 633 lowercase click sites, 9 unreachable, all 9 in CRM/Inventory. The 20 key-handling elements without `tabIndex` are all propagation shields — I read every one.
4. **Focus management is genuinely tested, including the hard cases.** Focus trap and restore for `Dialog` and `Sheet`; restore-to-opener for a *controlled* `AlertDialog` opened from a row action, with an explicit assertion that no proxy trigger exists to fake it; restore for a sheet opened from a menu item; a shared `propagationShield` that stops Enter *and* Space *and* click reaching a clickable row without swallowing the control's own activation.
5. **Offline is solved once, in the shell.** `ShellOfflineBanner` at `dashboard-shell.tsx:218` with `role="status"` + `aria-live="polite"`, driven by `useSyncExternalStore` over both events, plus `DataTable`'s paused-read affordance that swaps the sr-only status text and drops `aria-busy` while offline.
6. **State primitives carry correct semantics.** `LoadingState` is a `role="status"` with `aria-busy` and an accessible name; every skeleton block is `aria-hidden` so the region reads as one status; `ErrorState` is a `role="alert"` with a named retry; `NoPermissionState` is a `role="status"` naming the permission; `EmptyState` leads with a heading; `LoadingState variant="page"` renders zero `.animate-spin`.
7. **`EmptyState` refuses to over-claim.** It renders `NoPermissionState` when `access.denied`, and distinguishes filter-empty from data-empty via `filtersActive` / `onClearFilters` — the primitive is correct even where call sites do not use it.
8. **Icon labelling holds.** `check:icon-labels` exit 0 over 3,858 files: no icon-only button without an accessible name.
9. **The static ARIA census is honest and green on what it can see.** 0 invalid roles, 0 invalid ARIA attributes, 0 dangling references, 0 `aria-hidden` focusables, 0 redundant roles, 0 positive `tabIndex`, and exactly 1 unnamed lowercase control — pinned by route to the CRM file. Its header enumerates its own blind spots, including the PascalCase one, and a sibling census was built specifically to measure that blind spot.
10. **Permission gating is not inert.** `check:permission-binding` verified 2,384 bindings, exit 0; `check:route-access-contract` exit 0; 530/539 surfaces render a real denial or sit behind a server gate. The 9 that don't are personal self-service routes where a denial would be wrong.
11. **Default-palette contrast is real arithmetic.** Token pairs derived from actual hex values, self-tested to 21:1 and 1:1, with four bite proofs naming the exact previously-failing values (`#94a3b8` ring, `#d97706` warning ink), and honest negative records where a pair does not clear AA.
12. **Gate wiring is enforced.** `check:gate-wiring` (exit 0) proves 35 gates exist, 32 can fail the job, and every one is invoked by a `run:` step in a reachable job. That is what makes F7 findable — `browser:journeys` is simply not registered as a gate at all.

---

## 5. Blocked on infrastructure

| Dimension | Status | Exactly what would measure it |
|---|---|---|
| Responsive 375/768/1280 (horizontal overflow, layout at each width) | **NOT MEASURED** | `node scripts/browser-journeys.mjs --base-url=http://localhost:1000 --cookie-file=<authjs.session-token> --widths=375,768,1280` against `next build && next start`. Needs a production build (~8–12 GB, orchestrator-only) and a minted NextAuth cookie. |
| WCAG AA against **painted** colours, incl. alpha composites and overlays | **NOT MEASURED** | Same command — its contrast pass samples the colour actually behind each text node. jsdom cannot do this: `canvas` is not installed and all CSS is stubbed. |
| Runtime axe over the painted tree (expanded `<Dialog>`, resolved ids) | **NOT MEASURED** | Same command. The 22 jest-axe suites judge only what a fixture mounts. |
| Contrast in the 17 non-default themes | **MEASURED BY ME**, not by any gate | I computed it (F2). Needs a permanent assertion; no infrastructure required. |
| C150 across non-sidebar navigation intents (row click, header, breadcrumb, card) | **NOT MEASURED** | `measure-web-vitals.mjs` clicks one in-view nav link per route. Extending it to a scripted row click, or instrumenting `router.push` behind a dev-mode mark, would cover the 187 sites in F11. |
| C150 across the other 543 authenticated routes | **NOT MEASURED** | The capture covers 13. Widening `authenticatedRoutes` is a config change, but the run cost scales with `repeat: 8` × 2 profiles × routes. |
| Dark-mode Web Vitals / contrast in the browser | **NOT MEASURED** | The capture records `themeMode: "light"` and writes `"light"` into `localStorage` before every document. A dark-mode pass would need a second run. |
| Screen-reader behaviour (is a name the *right* name; does a live region actually announce) | **NOT MEASURABLE** by any harness here | Both censuses declare this in their headers. Needs a human NVDA/VoiceOver session. |
| Whole-repo type checking | **NOT RUN** | `type-check` needs 8 GB; orchestrator-only per the laptop budget. Note that ts-jest `isolatedModules` means no spec in the a11y corpus enforces a signature. |

**Also recorded, outside this ticket's ownership:** the full frontend jest run at head is 362 suites / 3,537 tests with **5 failures, all in `hooks/api/cursor-pagination-contract.test.tsx`** (`useInfiniteNotifications` never reaches `isSuccess`). That is ticket 19's surface. `check:route-bundle-budget` exits 1 with 18 breaches — ticket 29's.

---

## 6. Verdict

**PARTIALLY MET on all three criteria.**

The states themselves are in good shape — loading, empty, error, offline, permission and retry are all present at 98–100 % of the 539 data surfaces, keyboard reachability is clean in scope, focus management is properly tested, and mutation feedback is effectively universal. That is real work and it holds up under an independent re-derivation.

What does not hold is the **evidence for the three dimensions that need a browser**: responsive behaviour at 375/768/1280, contrast against painted colours, and perceived speed beyond in-view sidebar links. The harness that answers all three exists, is well built, and has never been run or wired. Two of the three claims currently rest on a jsdom suite that is structurally width-blind and colour-blind, and the third rests on a capture 91 commits old whose own driver wrote `"verdict": "capture is NOT usable evidence"`.

And two screen-reader defects are open and counted, not hypothetical: **287 in-scope controls with no accessible name**, and **contrast failures in 6 of 17 user-selectable themes plus 254 alpha-composited text sites** — including the permission-denied state's own slug at 2.20:1.
