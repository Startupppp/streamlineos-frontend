# My Work and Drafts consolidation source evidence

Package: `BLD-MY-WORK-DRAFTS-01` under `ARCH-16-CAPABILITY-SETTINGS`. Captured 2026-10-03. Source commit: `16c370453ea0722cca124a1479747fff0690e9fe`. Claim revisions: `7038f0a7d`, `63a558217`, `7f0ce77ed`, and `a08155aff`.

Status: **Current verified** for the committed source, focused unit/component tests, frontend TypeScript check, and scoped lint below. **Current unverified** for real browser navigation, backend record reads and writes, tenant/role revocation, deployment parity, and mobile device behavior.

## Implemented source behavior

- The Build sidebar labels `/build/my-work` “My Work” and removes the separate Drafts item. Desktop and mobile navigation derive from the same destination catalog; the mobile fixture now reflects the consolidated destination. Inbox remains the notification destination.
- `/build/my-work?section=drafts` renders the existing comment draft panel in My Work. The section switch preserves the current My Work URL state and browser history while guarding ordinary navigation against unsaved edits. The Drafts branch does not mount ticket list queries. No numeric draft total is invented.
- `GET /build/inbox?view=drafts` authorizes the Inbox route before redirecting to My Work Drafts. It retains bounded `q` and valid positive `projectId` query values and drops notification-only/unsafe fields. The existing draft panel does not apply these query values as filters. The old `/build/drafts` route points to the new section through the temporary Next redirect. The agent pulse now targets the same section.
- My Work keyboard, table, board, list, bucket, and Drafts opens use canonical `/build/:projectId/tickets/:ticketKey` URLs with an allowlisted My Work `returnTo`. Ticket detail accepts that return target while still rejecting external origins, unexpected parameters, and overlong URLs. A missing project key uses a numeric URL ticket key; the visible `#81` fallback is unchanged.
- Permission keys and backend draft ownership/record reachability were not changed. The existing draft list still requires `build:tickets:view`, and ticket detail remains separately authorized.

## Checks

| Check | Result |
|---|---|
| Focused navigation, My Work, Inbox, Drafts, ticket URL, mobile, route, and formatter Jest run | 13 suites, 250 tests passed |
| Final corrected My Work page and offline Jest run | 2 suites, 24 tests passed |
| Frontend `tsc --noEmit -p tsconfig.json` with 10 GB Node heap | Passed after final typed test change |
| ESLint on changed frontend files | 0 errors; one existing `react-hooks/set-state-in-effect` warning in unchanged lines of `my-work-rows.tsx` |
| `git diff --cached --check` before source commit | Passed |
| Independent source/spec review | Clear after named click handlers, typed keyboard mock, and JSX indentation correction |

## Open acceptance boundaries

- [ ] Verify desktop/mobile section navigation, old URLs, browser Back/Forward, refresh, modifier-click, and real draft/ticket opening in a browser with permitted and denied actors.
- [ ] Build the specified intercepted ticket pane. This commit keeps canonical full-page ticket details and an authorized return link; it does not implement the pane.
- [ ] Page and sort drafts newest first. The existing backend query orders by `updatedAt` ascending and limits to 100, so its visible array is not a complete count or full draft collection.
- [ ] Give a draft whose ticket has no valid project ID an explicit unavailable state. The current panel does not invent a ticket link in that case.
- [ ] Verify backend persistence and cache refresh for create/edit/delete draft and ticket return flows, including org/member/project/record denials and revocation.
- [ ] Verify deployed route behavior and the declarative `/build/drafts` redirect, including incoming query handling. The server Inbox redirect has focused unit coverage; browser redirect behavior remains unverified.

The broader BLD-008 and BLD-023 checkboxes remain open because they include pane, full role/mobile/browser acceptance, and navigation requirements beyond this source slice.
