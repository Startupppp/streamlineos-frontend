# Access route removal — browser QA handoff

**Browser status: READY_FOR_CODEX_BROWSER_QA**

Claude ran static and unit verification only. Nothing below has been observed in a real browser. jsdom cannot see layout overflow, real focus order, or paint (FE-123), and it cannot exercise a `next.config` redirect at all — that runs in the Next.js server routing layer, which no unit test in this change boots.

Branch: `build/access-route-removal`. Worktree: `D:/projects/personal/slos-access-removal`.

## What changed

- Deleted `frontend/app/(authenticated)/build/access/page.tsx`.
- Removed `/build/access` from `frontend/lib/build/build-route-manifest.ts` (88 → 87 entries).
- Canonical route is `/build/settings/access`; it is unchanged by this work.
- `/build/access` still resolves, via the pre-existing `next.config.ts` redirect to `/build/settings/access`.

The single highest-value check is the **legacy route** section — it is the one behaviour no test here could execute.

## Setup

Run the app and sign in as a user who holds `build:access:view` (and separately, one who does not). Confirm the Build module is enabled for the organisation.

## Desktop (1280px)

- [ ] Open `/build/settings/access`. The page renders — Members list plus the Build Access tabs (Roles / Members / Ownership).
- [ ] The heading reads "Build Access"; no raw UUID appears anywhere on screen.
- [ ] Loading: hard-reload and confirm a skeleton matching the table geometry, not a spinner, and that it fills height rather than collapsing.
- [ ] Empty: filter or search to a no-result state and confirm a distinct empty state, not a blank panel.
- [ ] Error: block the access/members request in devtools and confirm a real error message with a retry — not "Something went wrong" and not an empty list.
- [ ] Denied: sign in as a user without `build:access:view` / `build:members:view`. Confirm `NoPermissionState` (or the access-denied screen), **not** an empty table.
- [ ] Controls: "New group" (Roles tab) and "Add member" (Members tab) open their dialogs and close cleanly on Esc and on cancel.
- [ ] Ownership tab appears only for a user authorized to see it.
- [ ] Navigation: expand the Build sidebar / "More tools". The access entry is labelled "Members & access" and points at `/build/settings/access`. No sidebar, drawer, bottom nav, product switcher, or command-palette entry anywhere points at `/build/access`.

## Mobile (375px)

- [ ] `/build/settings/access` has no horizontal overflow; the tabs row does not push the page sideways.
- [ ] Tab through the page: focus order is visible and follows reading order; no focus trap outside a dialog.
- [ ] Open "Add member" and "New group": each is usable at 375px, is dismissible, and returns focus to its trigger on close.
- [ ] The members table remains usable — it scrolls within its own container rather than widening the page.

## Legacy route — the critical section

- [ ] Open `/build/access` directly in the address bar. It must **not** render the old page (that file is deleted).
- [ ] It lands on `/build/settings/access`. Expected mechanism: a 307 from the `next.config.ts` redirect, visible in the devtools Network tab as a single hop.
- [ ] Confirm **exactly one** redirect hop — no redirect loop, no `ERR_TOO_MANY_REDIRECTS`.
- [ ] Repeat as a user **without** Build access. Expected: the redirect still fires, then the canonical route's own gate produces access-denied. Confirm it does not bounce between the redirect and the access-denied screen.
- [ ] Open `/build/access` while signed out. Confirm it reaches sign-in and, after signing in, does not strand the user on a dead path.
- [ ] Open a nonsense sibling such as `/build/access-nope` and confirm the intended not-found / access-denied behaviour rather than a blank screen.

## Report back

For each unchecked box, record the URL, viewport, signed-in role, and a screenshot. If the legacy route produces anything other than a single hop to `/build/settings/access`, stop and report — that is the one outcome this change could plausibly get wrong, because no automated test in this branch exercises the Next.js redirect layer.
