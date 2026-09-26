# C6 — Teams Team Detail (10-teams-team)

## Task 1 — Keyboard test failure root cause and fix

**Failed test:** `teams-team-a11y.spec.ts:74` "Tab order follows visual row order — role select then remove button for each of the three rows"

**Symptom:** `locator.focus` timed out at 90 s waiting for
`[data-case-frame="team-members-keyboard"] [role="listitem"]:first-child [role="combobox"][name="Lead"]`.
A 90 s `locator.focus` timeout means the locator never resolved — the element was not in the DOM.

**Wrong layer ruled out:** The gallery's `TeamMembersKeyboardCase` correctly imports and mounts the real
`MemberRoleSelect` and `RemoveMemberButton` directly (no `canManage` gate in the gallery). Both controls
render unconditionally for each stub row. The gallery stub was NOT the wrong layer.

**Root cause — wrong layer: the component's own accessible name.**

`SelectTrigger` in `select.tsx` carries a JSDoc comment (lines 41–65) that measures and records this
exactly: `combobox` is NOT a name-from-content role. Chrome computes an empty accessible name for a
`<button role="combobox"><span>Lead</span></button>` without an associated label. `getByRole('combobox',
{ name: 'Lead', exact: true })` therefore matches zero elements. No `aria-label`, no `aria-labelledby`,
no form `<label>` association, and no `placeholder` on `SelectValue` was set in `MemberRoleSelect`.

**Fix applied to `frontend/features/build/teams/team-home-page.tsx` `MemberRoleSelect`:**

Added `const roleLabel = role === "lead" ? "Lead" : "Member"` and `aria-label={roleLabel}` to the
`SelectTrigger`. Alice's combobox now has accessible name `"Lead"`; Bob's and Carol's have `"Member"`.
The two pre-existing ledgered `as "member" | "lead"` casts on lines 131 and 134 were left untouched.

---

## Task 2 — Box 3 enumeration

Box 3 of `10-teams-team.md`: "Every core field, action, overlay, query parameter, bulk action, shortcut,
state, and permission above is implemented and tested."

**Box 3 is NOT ticked.** Several items in the spec are not yet implemented (see unimplemented rows).

Six new tests were added to `features/build/teams/team-home-page.test.tsx` covering implemented-but-untested
items. All 36 tests pass.

```
Tests:  36 passed, 36 total
Time:   2.565 s
```

### Enumeration

| Item | Category | Implemented | Tested | Notes |
|------|----------|-------------|--------|-------|
| name | Core field | yes | yes | page title |
| key | Core field | yes | yes | header badge |
| isPrivate (Public/Private badge) | Core field | yes | yes | both variants |
| lead (role display in member list) | Core field | yes | yes | badge/select per permission |
| members list | Core field | yes | yes | email per member |
| projects section | Core field | yes | yes | TeamProjectsSection |
| capacity | Core field | **no** | no | not in `ProjectTeamDetail` type; not rendered |
| Edit Team action | Action | yes | yes | BLD-X-FE-TEAMS-DETAIL-010 |
| Delete Team action | Action | yes | yes | BLD-X-FE-TEAMS-DETAIL-010 |
| Add Member action | Action | yes | yes | MemberPicker show/hide |
| Remove Member action | Action | yes | yes | BLD-X-FE-TEAMS-DETAIL-011 |
| Update Member Role action | Action | yes | yes | role select show/hide |
| Team edit sheet overlay | Overlay | yes | yes | BLD-X-FE-TEAMS-DETAIL-010 |
| Delete confirm dialog | Overlay | yes | yes | BLD-X-FE-TEAMS-DETAIL-010 |
| cursor query param | URL param | yes | yes | useCursorPager; pagination Next/Previous |
| q query param | URL param | **no** | no | P1 gap in spec |
| leadId query param | URL param | **no** | no | P1 gap in spec |
| memberId query param | URL param | **no** | no | P1 gap in spec |
| Bulk actions | Bulk | **no** | no | P1 gap in spec |
| / search shortcut | Keyboard | yes | yes | useBuildListKeyboard wiring |
| j/k navigation | Keyboard | yes | yes | useBuildListKeyboard itemCount |
| Enter open | Keyboard | yes | yes | useBuildListKeyboard wiring |
| Esc close/clear | Keyboard | yes | yes | useBuildListKeyboard wiring |
| c create | Keyboard | yes | yes | useBuildListKeyboard wiring |
| e edit | Keyboard | yes | yes | useBuildListKeyboard wiring |
| ? shortcut help | Keyboard | yes | yes | useBuildListKeyboard wiring |
| Loading state | State | yes | yes | skeleton rows, no spinner |
| Empty (no data / not found) | State | yes | yes | "Team not found" empty state |
| Error state | State | yes | yes | error-state testid |
| Denied state | State | yes | yes | no-permission testid; content absent |
| Conflict state | State | CCG-1 | CCG-1 | scoped out per 99-cross-cutting-gaps.md |
| Offline state | State | **no** | no | not implemented |
| build:teams:view permission | Permission | yes | yes | usePageState permission arg |
| build:teams:manage permission | Permission | yes | yes | both positive and negative per action |

**Unimplemented items that block Box 3:**
- `capacity` field — absent from `ProjectTeamDetail` type and not rendered
- `q`, `leadId`, `memberId` URL filter params — P1 gap per spec Gaps section
- Bulk actions — P1 gap per spec Gaps section
- Offline state — not implemented

---

## Task 3 — C6 matrix

`10-teams-team.md` Box 6 is NOT ticked (owned by the orchestrator). This table records what the current
spec genuinely exercises.

| C6 Check | Genuinely exercised? | Evidence in spec |
|----------|---------------------|-----------------|
| Keyboard | **Yes** | `test.beforeEach` at 1280×800; `aliceSelect.focus()` on the real `SelectTrigger`; six `page.keyboard.press("Tab")` stops; each stop asserted `toBeFocused()` scoped to the correct `nth()` row with `exact: true` so no substring ambiguity |
| Screen-reader (ARIA roles + names) | **Yes** | `getByRole("combobox", { name: "Lead", exact: true })` and `getByRole("button", { name: "Remove member", exact: true })` on real Radix `SelectTrigger` and Button; `getByRole("list", { name: "Team members" })` in the list-visible tests; all three verify real ARIA contracts on real components |
| Reduced-motion | **Yes** | `test.use({ contextOptions: { reducedMotion: "reduce" } })` asserts `animationName === "none"` on `.skeleton-shimmer.animate-pulse:visible` inside `[data-case-frame="team-detail-loading"]`; PAIRED with `reducedMotion: "no-preference"` asserting `!== "none"` so the reduce assertion is not vacuous; targets `frontend/globals.css` lines 700–708 (not `frontend/app/globals.css`), which is where framer-motion 12 / Web Animations API reduction is governed |
| 375 px mobile | **Yes** | `test.beforeEach` sets `{ width: 375, height: 812 }`; per-row `boundingBox()` loop asserts `box.width <= 375` against the real gallery case frame |
| High-density desktop (1920×1080 @2x) | **Yes** | `test.use({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })` at describe level (not `page.setViewportSize`, which cannot change `deviceScaleFactor`); asserts both `team-members-keyboard` and `team-detail-loading` case frames have `scrollWidth − clientWidth <= 1` |

All five checks target the gallery at `/design-system/teams-team`. The gallery mounts real components
(`MemberRoleSelect`, `RemoveMemberButton`, `Skeleton`) with static stub data — not lookalikes.
