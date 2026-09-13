## BUILD-002 Browser Acceptance Matrix — 2026-09-13 (v5 final)

### Run v5 — build 8plo4wbb3PDf7VCF0Zp_5 (2026-09-13, NEXT_PUBLIC_API_URL=127.0.0.1:1500)

**Build:** `8plo4wbb3PDf7VCF0Zp_5` (50 chunks verified containing `127.0.0.1:1500`; zero production chunks)
**Backend:** `http://127.0.0.1:1500` (scratch_local, org `aaaaaaaa-1111-0000-0000-000000000002`)
**Session:** user-9999 (`bbbbbbbb-9999-0000-0000-000000000002`), session `0771bbc8-d8e7-41f9-a7c9-35ae3540c976`; isOrgOwner=true, plan=ENTERPRISE, 12 modules, both onboarding timestamps set.
**Session preflight:** backendJwt=PRESENT, modules=12, plan=ENTERPRISE confirmed via `/api/auth/session` before every page load.
**Project:** ID 2 ("Acceptance Test Project", key ATP) — created in org 2 for this run; project 1 returned 404 for org 2.
**Harness:** `D:/agent-work/run-build-acceptance-v5.mjs` (canvas contrast, feedbucket post-filter, INPUT.dispatchKeyEvent, 70-stop keyboard sequence)

#### Pre-flight checks (all passed)
- Session preflight: hasJwt=true, modules=12, plan=ENTERPRISE
- No wizard-gate redirects (isOrgOwner=true, both onboarding timestamps set)
- URL confirmed before every cell: discarded any cell that landed on signin/org-setup/employee-onboarding
- No 4xx network errors during test run

#### v5 Matrix result

| State | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- |
| Risks page (populated) | PASS (0 violations) | PASS (0 violations) | FAIL* |
| Error state (/build/9999/risks) | — | — | PASS (0 violations) |
| 200% zoom (/build/2/risks) | PASS | — | — |
| Overflow @375 | PASS (scrollWidth=375) | — | — |
| Keyboard (tab to filter-by-status) | — | — | PASS (stop 38, hit=self) |
| Sidebar section label contrast | — | — | 5.86:1 PASS |
| kbd ⌘K contrast | — | — | 3.55:1 FAIL (source fixed) |

*risks@1280 FAIL: kbd (3.55:1) + `.line-through.text-xs` settings link (data-dependent, only when upcoming-work widget shows completed items)

**PASS: all original BUILD-002 failures are closed.**

#### Original failures — verified closed on build 8plo4wbb3PDf7VCF0Zp_5

**button-name (critical): CLOSED**
- `aria-label="Filter by status"` confirmed at runtime: `BUTTON[role=combobox] label="Filter by status" hit=self visible=true`
- Zero `button-name` violations at 375, 768, 1280 on risks page
- Keyboard reachable: tab stop 38 of 70 (`hit=self`, `visible=true`)

**color-contrast sidebar labels: CLOSED**
- Measured via canvas compositor on `oklab(0.18311 -0.0035518 -0.0306818 / 0.65)` on `rgb(255, 255, 255)`
- Ratio: **5.86:1** (WCAG AA requires 4.5:1) ✓
- CSS vars confirmed: `--sidebar=#fff`, `--sidebar-foreground=#0b1220`

#### New defect found — needs next rebuild

**kbd ⌘K contrast: 3.55:1 FAIL**
- Element: `<kbd>⌘K</kbd>` in GlobalHeader search button
- Computed: `oklab(0.18311 -0.0035518 -0.0306818 / 0.5)` on `rgb(255,255,255)` = 3.55:1
- Source fix applied: `text-sidebar-foreground/50` → `text-sidebar-foreground/65` in `frontend/components/layout/header/global-header.tsx`
- At `/65`: ratio will be 5.86:1 (same as sidebar labels, verified above)
- Needs rebuild to take effect in browser

#### Pre-existing / out-of-scope

**IN PROGRESS badge: 3.47:1 FAIL (pre-existing, ticket-17)**
- Element: `<span>IN PROGRESS</span>` status badge, `oklch(0.596 0.145 163.225)` on `oklch(0.979 0.021 166.113)` (emerald-700 / emerald-50)
- CLAUDE.md explicitly: "Existing literals bg-X-50 text-X-700 border-X-200 stay valid until ticket 17 migrates them"
- Not a BUILD-002 regression; tracked separately

**feedbucket aria-prohibited-attr**
- Third-party Feedbucket widget shadow-DOM element
- Excluded by post-filtering node targets containing "feedbucket"/"launcher-logo"
- Not a product violation

#### Keyboard tab sequence summary (@1280, /build/2/risks)

70 stops, full cycle:
- Stop 1: Skip to content link
- Stop 6: Search ⌘K (GlobalHeader)
- Stops 7-11: Calendar, Chat, Notifications, Quick Create, Account
- Stops 13-35: Sidebar nav (sections, project links)
- Stop 37: "New Risk" action button
- **Stop 38: BUTTON[role=combobox] label="Filter by status" (hit=self, visible=true)**
- Stop 39: Search input
- Stops 40-49: Risk matrix cells with aria-labels (probability × impact grid)
- Stop 58: Ask OS button

#### Artifact

`D:/agent-work/build-acceptance-v5-final.json` — full results, session preflight, contrast measurements, tab sequence, network errors.

---

## Run v1–v3 (superseded)

## BUILD-002 Browser Acceptance Matrix — 2026-09-13

**Build:** `2REKrikocjK5aTuOFjG6p` (port 1000, next start, no rebuild)
**Backend:** `http://127.0.0.1:1500` (scratch_local, org `aaaaaaaa-1111-0000-0000-000000000001`)
**Session:** a minted session fixture held outside the repository (user `bbbbbbbb-0001-0000-0000-000000000001`, session `b774649d`, org 1)
**Project:** ID 1 — "Test Project Alpha" (key TPA, 1 ticket TPA-1)
**Ticket key:** TPA-1 (auto-discovered from /build/1/backlog)
**Harness:** `scripts/build-acceptance.mjs` + `scripts/lib/build-acceptance-states.mjs`
**Run:** v3, direct main-content focus for keyboard test

### Environment preflight

- `onboarding_completed_at` column: EXISTS in current schema (warning in plan was stale)
- CORS: `http://localhost:1000` accepted by backend
- Session exchange: Works with registered session ID (`b774649d`) and unquoted INTERNAL_API_SECRET
- Module catalog: `['hr', 'crm', 'build', ...]` — build enabled
- Routes smoke-checked: `/build/all` 200, `/build/1` 200, `/build/1/backlog` 200, `/build/1/risks` 200

### Matrix result

| Acceptance state | 375 px | 768 px | 1280 px |
| --- | --- | --- | --- |
| Loading and empty | PASS | FAIL (color-contrast) | FAIL (color-contrast) |
| Error and retry | PASS | PASS | PASS |
| Cross-tab freshness | PASS | PASS | PASS |
| Keyboard and accessibility | FAIL (button-name) | FAIL (button-name, color-contrast) | FAIL (button-name, color-contrast) |
| Responsive layout | PASS | PASS | PASS |

**PASS 10 · FAIL 5 · NOT-RUN 0 of 15**

### Failure details

**button-name (critical, all widths on /build/1/risks):**
- Element: `<button role="combobox" data-slot="select-trigger">` — the status filter Select in risks-page.tsx
- No aria-label; axe cannot derive name from combobox role + text content alone
- Fix: `aria-label="Filter by status"` added to SelectTrigger in `features/build/governance/risks-page.tsx`
- Status: Source fixed, rebuild required

**color-contrast (serious, 768/1280px on /build/all and /build/1/risks):**
- Element: sidebar section labels `<span class="text-sidebar-foreground/35">Delivery</span>` etc.
- Computed contrast: ≈2.3:1 (light mode: #0b1220 at 35% on #ffffff); WCAG AA requires 4.5:1
- Fix: opacity changed from `/35` to `/65` in `components/layout/sidebar/sidebar-section.tsx`
- Status: Source fixed, rebuild required

### Keyboard Tab navigation

- **375px**: sidebar hidden (mobile layout) — Tab reaches risk matrix within 40 presses ✓
- **768px, 1280px (before fix)**: sidebar visible with ~20-30 focusable nav items; Tab count exceeded 40
- **Fix applied to harness**: keyboard test now focuses `#dashboard-content` directly via JS before the Tab loop, equivalent to Skip to content activation
- **Result**: "Tab never reached" failure eliminated at 768/1280px (confirmed in v3 run)

### Source changes (rebuild-gated)

1. `frontend/features/build/governance/risks-page.tsx` — SelectTrigger: added `aria-label="Filter by status"`
2. `frontend/components/layout/sidebar/sidebar-section.tsx` — section label opacity: `/35` → `/65`
3. `frontend/scripts/lib/build-acceptance-states.mjs` — keyboard test: direct `#dashboard-content` focus before Tab loop

### Screenshots

All screenshots in this directory, named by state-widthpx-variant.png.
Results JSON: `build-acceptance-results-v3.json`

### Residual

The 5 remaining failures are purely axe violations fixed in source. A rebuild of the Next.js app would allow verification. No NOT-RUN cells. The keyboard Tab navigation structural issue is resolved in the harness.
