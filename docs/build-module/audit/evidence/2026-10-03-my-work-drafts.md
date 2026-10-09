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
- [ ] Verify the source's explicit unavailable state for a null-project draft in the applicable browser/contract negative and prove its owned deletion remains usable; source handling is recorded in the reviewed follow-up below.
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

## Caller-owned composer draft resume

Backend `0919002bc` adds a bounded caller-owned ticket draft read. It first resolves the same-tenant, nondeleted ticket and canonical project/record authorization, then projects only the existing seven draft fields with exact organization, acting membership and ticket predicates. A missing draft returns null after authorization; an organization administrator cannot use this command to inspect another member's draft. The existing unique owner/ticket index supports the lookup. Strict positive int32 params and an empty strict query reject client authority fields. Eight focused service tests, production and scoped test TypeScript, lint and independent review passed. The controller integration harness refused the production RDS database, so its runtime cases were not executed or counted as passing.

Frontend `bdcca185c9ae54d52f290cf146266e7d179fcab5` restores a composer only from a fresh successful read for the trusted organization/user/session and current ticket. An owner-bound pending local draft takes precedence. Typing, clearing or applying an AI suggestion prevents late hydration from overwriting the editor. Hydration causes no PUT; context changes reset the composer synchronously, and old callbacks/timers are fenced. Existing default editor, error, reference and retry components are reused. Eight focused suites/114 tests, production and changed-spec TypeScript, exact-path lint, root and independent review passed. Generated wire contracts were refreshed from the real backend at backend `30914f7e8` and frontend `b1ac3f4b2`; this is contract generation evidence, not deployment proof.

### Real application routing disproved the first route fix

The original GET `/build/comment-drafts/tickets/357` returned 400 with `projectId` validation on the synthetic Flow02 owner session. Backend `1ed52dcc9` moves the draft module before Projects within Build; its two metadata-derived Nest/Express probe suites passed eight tests, production/scoped TypeScript and lint, with independent review. After restarting only the identified synthetic backend runner to that reviewed source, the real guarded GET still returned 400: correlation `e34cdd4b-e6a3-4889-9ead-5cd3c6e462f0`, `projectId` expected number/received NaN. AppModule imports Leads and AI, which register Projects earlier. Therefore the local-order probe did not fix or verify full AppModule routing.

The same running application returned 200 for the normal project ticket GET `/build/54/tickets/357`. An invalid-ID DELETE `/build/comment-drafts/tickets/0` returned 400 with `projectId` and `ticketId` errors, safely demonstrating the analogous DELETE collision without mutating a record. Original read negatives were swallowed too; they cannot be counted as draft-handler validation proof. The registration-independent GET/DELETE `by-ticket` repair is tracked separately in the [work claims](../../implementation/WORK-CLAIMS.md). No browser comment was submitted.

### Registration-independent guarded API proof

Backend `a7f644d76` changes the caller-owned GET and DELETE-by-ticket to `/build/comment-drafts/by-ticket/:ticketId`. PUT and AI generation retain their existing ticket-shaped paths. The old DELETE path was already shadowed; it is not presented as a working alias. Five metadata-derived route probes cover the known AppModule graph, both registration orders, numeric project GET/DELETE dispatch and the old-path capture. Production and changed-test TypeScript, exact-path lint, whitespace checks, root and independent review passed. Controller integration cases remain source/typechecked evidence because their safe harness refuses the configured production target.

The coordinator restarted only the identified synthetic runner to this reviewed source, at process 8300. A fresh exchange used the real OTP/magic-link issued Flow02 owner identity. Actual GET on ticket 357 returned 200 and exactly `id`, `orgId`, `membershipId`, `ticketId`, `body`, `createdAt`, `updatedAt`; ticket, organization and retained body matched. No authentication returned 401; extra membership query, zero and int32 overflow returned 400; missing ticket returned 404. Numeric `/build/54/tickets/357` still returned 200. These requests establish the real handler dispatch and these particular negatives, not the full actor/tenant matrix.

One isolated synthetic ticket 358 was created in project 54. Its authorized draft GET returned 200/null. PUT saved a synthetic private draft, and the canonical GET returned the exact body. Canonical DELETE returned 200; subsequent GET returned null, the ticket remained readable, and retained draft 135 on ticket 357 remained unchanged. Repeating the deletion returned 200. This is a draft-only command roundtrip, not comment posting, cross-tab fencing or an idempotency-key receipt proof.

An independent IAM `streamline_app` read-only transaction first verified the exact synthetic organization name/slug and ACTIVE owner actor/email, then returned only scalar predicates/counts. Final proof passed: one matching owner, retained draft hash/length match, two live project tickets, the exact new synthetic ticket still live, and zero owned drafts for ticket 358. The first body comparison failed because the supplied expected literal included sentence punctuation; the authorized retry used the actual permitted read's MD5 and length, passed, and performed no mutation. Connections closed. This corroborates stored markers after the roundtrip; it does not prove every GET has no side effects or certify browser/deployment behavior.

Frontend reader `cf10573d4` uses the nonoverlapping GET. Backend OpenAPI `97831eb68` and frontend `7ce14426e` regenerate the actual routes: 4,105 operations, 4,090 Zod responses, zero undeclared exposure, all schemas converted; 310 hook-called operations and 388 frontend generated schemas. Frontend `306f4d405` makes freshness verification insensitive to source layout through installed TypeScript syntax comparison while preserving types, literals, operators, declaration mutability and numeric property-key differences. Forty-seven self-tests, real freshness/vendor checks, exact script lint and independent review passed. No generated file was hand-edited, and no source formatter was run across active claims.

## Immediate local persistence and clearing source slice

Frontend `94bc876eae00bd63475547cbe7e02c20f086b766` stages every edit synchronously as a trusted owner-bound v3 upsert/delete intent. The debounce dispatches that exact revision; whitespace stages deletion. Save, replay and deletion enter one owner/ticket queue before asynchronous permission checks. Confirmed acknowledgment removes only the matching current revision, preserving newer work. Legacy/corrupt bytes remain intact; a persistent empty v3 marker prevents older v2 drafts from reappearing. Hydration of a pending delete stays empty and causes no save.

Default status/error/reference/retry controls distinguish device durability from server confirmation. Failed local staging, including an intentional clear, remains dirty. Commit-boundary owner refs reject suspended/disposed callbacks; a matching retry receipt clears the prior error. Failed deletion restores only its ticket cache entry, preserving unrelated concurrent updates. Session transitions first hide the editor; a fresh authorized read then restores same-owner pending text/deletion ahead of stale server data. Delayed replay tests prove no hydration-generated write.

Final checks at this source snapshot passed ten suites/135 tests, production and eight changed-spec TypeScript checks, exact 14-path lint with zero warnings, whitespace checks, root review and independent review. Three private source seams and the composer stay below 300 lines. No actual comment POST, browser action or database write was performed by the frontend agent. Browser quick-leave/clear/offline/session recovery, cross-tab/server revision fencing, uncertain commit completion, row/Clear All coordination and context-safe post-success cleanup remain Current unverified or Planned in their owning requirements. The existing post-success callback was explicitly excluded; this slice does not claim it is safe.

### Verification boundaries

The existing frontend still calls the deployed API. Automatic approval review rejected the process-only local frontend API configuration; the pending explicit approval has not been supplied. A normal synthetic magic-link sign-in was prepared through local mail capture, but the temporary browser's mailbox navigation returned `net::ERR_BLOCKED_BY_CLIENT`. That attempt was stopped and its temporary tab closed; it did not authenticate a synthetic browser, transfer a session or prove local frontend/backend behavior. Existing deployed-browser observations remain separate from new local source and API evidence.

Browser verification of immediate staging before debounce, clearing/deletion intent, offline recovery and dirty navigation remains open after the completed source slice. Post-success context, row/Clear All coordination, uncertain server writes and cross-tab ordering still require their separately owned implementation and proof. Passing hydration tests does not close those guarantees. The owner reserves live ticket comments, so mocked tests must not be described as actual comment-submission proof. Full BLD-008 and role/mobile/browser acceptance remain open.

## Delivery checklist


Unfinished implementation and release acceptance remain tracked in the [requirement ledger](../../implementation/REQUIREMENT-LEDGER.md) and [work claims](../../implementation/WORK-CLAIMS.md). This checked item records evidence capture only.
