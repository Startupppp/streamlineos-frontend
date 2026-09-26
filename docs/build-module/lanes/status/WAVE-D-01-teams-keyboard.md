# WAVE-D-01 — Teams keyboard reachability

**Files changed**

- `frontend/features/build/teams/team-home-page.tsx` — exported `MemberRoleSelect` and `RemoveMemberButton`
- `frontend/features/build/teams/team-home-gallery.tsx` — replaced hand-rolled lookalike with real components
- `frontend/e2e/teams-team-a11y.spec.ts` — replaced false C6 tests with real keyboard assertions

---

## What the gallery previously proved

The `team-members-keyboard` case frame mounted a plain `<div role="listitem">` containing an Avatar, two spans, and a `Badge`. Nothing in the row was focusable. The `aria-live` region behind `focused !== null` was dead code because no code path set `focused`. The describe asserted that three listitem nodes exist and that a role badge is visible. Neither test pressed a key or asserted focus. The block read as C6 keyboard coverage and provided none.

## What the gallery now proves

The `team-members-keyboard` case frame mounts the real `MemberRoleSelect` (a Radix `SelectTrigger` rendered as `role="combobox"`) and `RemoveMemberButton` (a `role="button"` with `aria-label="Remove member"`) for each of three stub rows in the `canManage: true` variant. Both controls are natively focusable via Tab. The dead `focused`/`aria-live` branch and the `useBuildListKeyboard` hook have been removed; no unreachable code remains.

## Exact Tab order encoded in the spec

Six stops, in DOM order:

| Stop | Row | Control | Accessible name (`exact: true`) |
|------|-----|---------|-------------------------------|
| 1 | 0 — Alice Chen | `role="combobox"` (SelectTrigger) | `Lead` |
| 2 | 0 — Alice Chen | `role="button"` (RemoveMemberButton) | `Remove member` |
| 3 | 1 — Bob Smith | `role="combobox"` (SelectTrigger) | `Member` |
| 4 | 1 — Bob Smith | `role="button"` (RemoveMemberButton) | `Remove member` |
| 5 | 2 — Carol Davis | `role="combobox"` (SelectTrigger) | `Member` |
| 6 | 2 — Carol Davis | `role="button"` (RemoveMemberButton) | `Remove member` |

Within each row, `MemberRoleSelect` precedes `RemoveMemberButton` in DOM order, so Tab moves select → remove before advancing to the next row. The spec focuses Alice's select via `locator.focus()`, asserts `toBeFocused()`, then Tabs through each remaining stop asserting `toBeFocused()` scoped to the correct `nth()` row to keep each locator strict.

## Pinned invariants preserved

- `[data-case-frame="team-members-keyboard"]` and `[data-case-frame="team-detail-loading"]` keep their exact names.
- `team-detail-loading` case and its `.skeleton-shimmer.animate-pulse:visible` reduced-motion pair are untouched.
- High-density `test.use` describe at spec line ~108 is untouched.
- `PmPanel` still forwards `role="list"` and `aria-label="Team members"`.
- The 375 px overflow test still passes — each row has the same layout; the real select and button are inline and do not push past the viewport.
