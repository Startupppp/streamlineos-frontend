# My Work and Drafts consolidation source evidence

Package: `BLD-MY-WORK-DRAFTS-01` under `ARCH-16-CAPABILITY-SETTINGS`. Captured 2026-10-03. Source commit: `16c370453ea0722cca124a1479747fff0690e9fe`. Claim revisions: `7038f0a7d`, `63a558217`, `7f0ce77ed`, and `a08155aff`.

Status: **Current verified** for the committed source, focused unit/component tests, frontend TypeScript check, scoped lint, and the explicitly scoped browser actions below. **Current unverified** for successful ticket detail reads, mutation persistence, tenant/role revocation, deployed backend parity, and mobile device behavior.

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
- [ ] Verify the source's explicit unavailable state for a null-project draft in the applicable browser/contract negative and prove its owned deletion remains usable; source handling is recorded in the reviewed follow-up below.
- [ ] Verify backend persistence and cache refresh for create/edit/delete draft and ticket return flows, including org/member/project/record denials and revocation.
- [ ] Verify old-route incoming query collisions, denied actors, and deployed/source parity. The basic `/build/drafts` and server Inbox redirects have the scoped browser observations recorded below.

## Coordinator browser checks

The coordinator tested the local frontend at `16c370453` using the existing authorized Org Admin browser session. Its API configuration still points to the deployed API. These observations verify the named frontend actions only; they do not prove the locally revised backend or a denied-role matrix.

| Action | Observed result | Remaining boundary |
|---|---|---|
| Sidebar My Work, then section Drafts | My Work rendered; Drafts rendered the saved comment draft. No standalone Drafts sidebar item. | New-account empty state and denied access remain unverified. |
| Open a saved draft | Canonical `/build/6/tickets/BQS-2?returnTo=%2Fbuild%2Fmy-work%3Fsection%3Ddrafts` URL opened. | Ticket page failed because the deployed `/build/6` read returned 500 `INTERNAL_ERROR`, correlation `36a535e7-670a-4384-af39-1aacc659bdc3`. Detail/return action acceptance stays open. |
| Browser Back from that failed ticket | Drafts section and saved row restored. | Forward, scroll/focus restoration, and successful detail return remain unverified. |
| Old `/build/inbox?view=drafts&q=QA&projectId=6&notificationId=17` | Redirected to `/build/my-work?section=drafts&q=QA&projectId=6`; removed notification-specific query. | The Drafts collection still ignores `q`/`projectId`. Query preservation does not prove filtering. |
| Refresh redirected My Work Drafts URL | Section and safe query remained; saved row loaded again. | Cross-device persistence and revoked-role reload remain unverified. |
| Old `/build/drafts` | Redirected to `/build/my-work?section=drafts`. | Incoming old-route query collisions and denied actors remain unverified. |
| 375 px mobile Drafts → Tickets | Section navigation worked; bottom navigation used My Work. Document scroll width equaled 375 px. | Full mobile actions, touch targets, focus, and real device testing remain unverified. |
| Mobile Tickets search `QA-070` | URL `q` updated; one matching row appeared. Its native ticket link carried the same encoded My Work search return context. Scroll width remained 375 px. | Search denial/tenant equivalence, other filters, and successful detail return remain unverified. |

Screenshots: [Drafts desktop](2026-10-03-browser/my-work-drafts-desktop.jpg), [ticket read error](2026-10-03-browser/my-work-draft-ticket-error.jpg), [Drafts at 375 px](2026-10-03-browser/my-work-drafts-mobile-375.jpg), and [mobile search](2026-10-03-browser/my-work-search-mobile-375.jpg). The temporary viewport override was reset. No draft/comment deletion, submission, ticket mutation, or business-record change was performed by these browser checks.

## Reviewed row-safety follow-up

Frontend `9c6622b44` changes the owned draft row to a native canonical Link with normal modifier/new-tab semantics and a guarded ordinary click. The delete button is a sibling, preventing keyboard activation from bubbling into ticket opening. Missing-project drafts show an explicit unavailable message while retaining deletion. The clear-all dialog no longer claims a complete total from the capped array. Two focused suites/14 tests, frontend TypeScript, scoped lint, and staged whitespace checks passed; the coordinator independently reviewed the source before commit. A separate scoped spec TypeScript check passed using the existing spec configuration and required existing ambient declarations. The full repository `type-check:specs` gate was not run.

At this revision, the coordinator verified the saved row exposes a native canonical link carrying the retained My Work search/section return context. Middle-click opened a separate ticket tab and left the source Drafts URL intact. The ticket tab still failed its deployed project read; this verifies native new-tab navigation, not successful ticket detail loading. The coordinator closed that temporary tab. A read-only DOM check confirmed the delete button is not inside the link. Clicking Clear all drafts opened the permanent-deletion dialog with no fabricated capped-array count; Cancel restored the saved row and focus. The final deletion action was not executed.

Screenshots: [clear-all confirmation](2026-10-03-browser/drafts-clear-all-confirmation.jpg) and [native draft row at 1280 px](2026-10-03-browser/drafts-native-row-desktop-1280.jpg). The latter was initially named as a 375 px capture, but its measured DOM width was 1280 px because the viewport control applied to another selected tab. The file was renamed to match the measured viewport; it supplies no new 375 px proof. The earlier 375 px checks above remain separate evidence. Actual deletion persistence, dirty-editor navigation, successful detail return, additional modifier combinations, revoked actors, and physical mobile-device behavior remain open.

The broader BLD-008 and BLD-023 checkboxes remain open because they include pane, full role/mobile/browser acceptance, and navigation requirements beyond these source slices.

## Reviewed offline identity and ordering repair

Frontend `4c38a2875494080d88cadf59b6907b52d0f29d8a` contains the independently reviewed offline draft repair. The owner-bound v2 buffer validates trusted organization/user/session scope, positive int32 ticket IDs, bounded bodies and revision identifiers. It preserves corrupt scoped bytes and legacy ownerless storage without consuming or migrating them. Replay peeks without removal and acknowledges only the exact current revision after a fenced successful PUT. Same-process per-ticket requests enter the queue before asynchronous permission checks; superseded revisions cannot overwrite newer queued revisions. Abort, denied access and failed requests retain the pending draft.

Transport fencing rechecks the expected real user/organization/session before both the initial request and authentication retry, including abort and impersonation state. A terminal fenced request cannot sign out or redirect a different account after a context change. No authority fields or raw credentials are transmitted in the draft body or logged. The source slice passed 14 suites/122 tests, production and scoped spec TypeScript, scoped ESLint, whitespace checks, and root plus independent review. These are source and focused-test results; real browser offline recovery, cross-tab ordering, post/delete coordination, editor resume, and deployed-backend parity remain Current unverified.

## Shared default route-tab styling

Frontend `de5e6052e` removes the page-local gray section-link styling. `TabsNavigation` and `TabsNavigationLink` in the existing UI module share the original `TabsList`/`TabsTrigger` class strings and horizontal overflow affordance. Native links retain browser and modifier semantics, named click handlers, the dirty-navigation guard, URL state, and `aria-current="page"`; they do not pretend to control a Radix tab panel. The UI kit inventory names the route-navigation exports. Existing components' default styles are preserved; no code comments were added.

Independent review passed, the existing My Work and offline suites passed 24 tests, production TypeScript exited 0, scoped ESLint passed, and the staged diff check passed. Actual browser checks measured the active Tickets link and existing Assigned tab with identical backgrounds `rgb(28, 25, 23)` and text `rgb(250, 250, 249)`. Tickets and Drafts clicks retained `q=QA-070`; Browser Back restored the ticket list and search. At 375 px, both section links shared the row equally, had the same active styling, and document width equaled the viewport width. Native new-tab acceptance remains open: the attempted middle-click did not yield a confirmed new tab. The browser also recorded an `AccessUnavailableError` from the deployed permission read; this is not an error-free browser or local-backend parity claim. The temporary responsive tab was closed and viewport override reset.

Screenshots: [default tabs on desktop](2026-10-03-browser/my-work-default-tabs-desktop.jpg), measured 1072 px, and [default tabs at 375 px](2026-10-03-browser/my-work-default-tabs-mobile-375.jpg). No browser comment submission, deletion, or ticket mutation was performed. Physical-device behavior, dirty-editor navigation and full role/tenant acceptance remain open.

## Delivery checklist

- [x] Record the named evidence, its source or runtime scope, and the remaining verification limits in this report.

Unfinished implementation and release acceptance remain tracked in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). This checked item records evidence capture only.
