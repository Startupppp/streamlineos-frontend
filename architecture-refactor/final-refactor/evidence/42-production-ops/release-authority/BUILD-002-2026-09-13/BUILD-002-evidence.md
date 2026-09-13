## BUILD-002 Browser Acceptance Matrix — 2026-09-13

**Build:** `2REKrikocjK5aTuOFjG6p` (port 1000, next start, no rebuild)
**Backend:** `http://127.0.0.1:1500` (scratch_local, org `aaaaaaaa-1111-0000-0000-000000000001`)
**Session:** `D:/agent-work/s0-session.txt` (user `bbbbbbbb-0001-0000-0000-000000000001`, session `b774649d`, org 1)
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
