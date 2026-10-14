# Calendar release evidence

## Production event creation retry, 2026-10-14

Railway deployment `14d81377-1851-4b9d-880e-cfc61951d43c` of backend commit `8645b13917ce663dce6db9dd0340237904b7268e` reached `SUCCESS`. The previously failing past-start local-only Calendar form submission returned HTTP 201 on `POST /calendar/events` at 12:50:56 UTC and the browser showed `Event created`. A second form submission targeting the connected Outlook account, with Teams creation disabled and no external attendees, returned HTTP 201 at 12:51:41 UTC. The browser showed `Event created — syncing to your calendar`; provider reconciliation and cleanup are still being checked. These two HTTP requests were served by the fixed deployment. Screenshots are stored at `C:\Users\Aditya_Lappy\.codex\visualizations\2026\10\12\01a130e0-df32-76c2-ad7e-7b9fe3af9043\calendar-production-past-event-created.png` and `C:\Users\Aditya_Lappy\.codex\visualizations\2026\10\12\01a130e0-df32-76c2-ad7e-7b9fe3af9043\calendar-production-outlook-created.png`.

The Outlook event remained in `Syncing to your calendar…` state while Railway HTTP logs showed no `/cron/calendar-provider-sync-sweep` invocation. The provider queue had a sweep route but no scheduled runner. Backend commit `0d29c1a3f` registers an in-process worker that runs the existing sweep under the shared cron lease every 30 seconds, with a startup kick and an opt-out configuration. Its focused two-test suite, targeted lint, and the backend production TypeScript check passed.

Railway deployment `03f46f85-d3b8-4fb8-90e3-20bcb893b82b` of `0d29c1a3f` reached `SUCCESS`. A read-only production database check found the synthetic Outlook event's queue row `PROCESSED` at 13:10:44 UTC with zero retries and no failure kind; the event record retained its integration connection, external event ID, and provider version. The event detail no longer displayed `Syncing to your calendar…`. A read-only Composio proxy GET of that exact Microsoft Graph event returned HTTP 200 with matching provider ID and subject. The user requested that both synthetic test events remain for review, so neither was deleted.

Production HTTP logs showed no Calendar cron-route invocations in the prior day. Backend commit `d290ae62d` adds an in-process runner for reminder and invitation-delivery sweeps with separate shared leases. Its focused two-test suite and targeted lint passed. The full backend type check was interrupted after prolonged execution without diagnostics, but Railway deployment `62c1f030-e126-4d71-98a0-9298bcc34627` built and reached `SUCCESS`. Production Redis heartbeats for both sweeps advanced to 13:26:57 UTC, with no recorded sweep errors. The production invitation-delivery queue had zero rows before deployment, so this proves the sweeps ran, not a real message delivery.

Frontend commit `945d27d27` captures edited start and end time values before updating React form state. In the production New Event form, a temporary edit from the default time to `09:00` remained `09:00` after focus moved to Notes. The form was not submitted and the temporary browser tab was closed. Screenshot: `C:\Users\Aditya_Lappy\.codex\visualizations\2026\10\12\01a130e0-df32-76c2-ad7e-7b9fe3af9043\calendar-production-time-field.png`.

On 2026-10-14, ticket 13 availability's approved-leave lookup was found to reject the entire request on source failure. A failing regression proved the prior behavior. Backend commit `311c521af` now marks `hr-leaves` coverage failed and the slot unknown while keeping guest diagnostics private. The existing source entry is reused when present. Availability engine, service, and booking availability suites passed 21 tests; targeted ESLint and whitespace checks passed. The commit was pushed, and Railway deployment `e40bfe98-f881-49f1-944a-87e7618d55c3` reached SUCCESS. Live provider/leave failure behavior remains to be checked.

Ticket 12 backend source-registration and wire-shape suites passed 14 tests, and frontend range and detail-contract suites passed 13 tests. Ticket 14 booking rule lifecycle, security, public-policy, and public-controller suites passed 18 tests. Their deployed cross-role and public booking journeys remain open.

Ticket 15 and 16 hold and commit coordinator suites passed five tests together. Ticket 17 lifecycle and invitation-policy suites passed 55 tests across six suites. Ticket 18 invitation delivery/controller and reminder sweep/paging suites passed 18 tests across four suites. The guarded booking-hold, booking-commit, and lifecycle database suites passed on isolated PostgreSQL earlier; these new runs did not repeat those database suites. Authenticated capacity races, downstream replay, and real invitation delivery remain open.

Production browser on 2026-10-14 loaded Calendar Week, List, and History with the same connected-account Daily Team Standup occurrences. History rendered at 375, 768, and 1280 px. At 375 px, tapping an external History row opened its read-only detail with Join meeting and Open in calendar actions; closing it returned to History. Reloading the History URL retained `mode=history`, `historyBefore`, `historyPages=1`, and loaded the same visible dates. This covers one signed-in actor and visible external/task records, not a second organization, all source families, dense paging, or back/forward return position.

The production Calendar accounts panel displayed Google Calendar as the default account and Outlook as a second account, both with Show events enabled. This confirms account visibility in the UI, not a live Outlook event in the rendered window. Both observed Daily Team Standup rows opened Google Calendar details.

Ticket 20 resource, ticket 21 poll service/token, and ticket 22 routing service/policy suites passed 30 tests across five suites. Their guarded database suites passed earlier on isolated PostgreSQL. Live resource allocation, guest poll lifecycle, and CRM routing ownership remain open.

Ticket 23 embed-state and public-policy suites passed seven tests. Ticket 24 payment coordinator, provider, and webhook suites passed 14 tests. Ticket 25 workflow policy/planner, ticket 26 developer API policy/service, ticket 27 analytics policy, and ticket 28 source-action policy/store/service suites passed 35 tests together across eight suites. Prior isolated PostgreSQL runs cover their guarded database suites, but live embed, payment sandbox, workflow channel, credential, analytics, and source-owner receipt journeys remain open.

Ticket 29 meeting-workspace, ticket 31 protected-work, ticket 32 commitment graph, ticket 33 scenario, ticket 34 capacity, and ticket 35 coach suites passed 63 backend tests across eight suites. Frontend meeting-workspace permission, My Day, search, saved-view, offline policy, and offline cache suites passed 29 tests across seven suites. These runs do not cover the required live tenant, cross-module, or offline transitions.

Production My Day displayed the current day's connected-account events with source-current labels. The Capacity panel's personal slice returned current source coverage, three available 15-minute slots, and one over-capacity slot. My time insights showed the private opt-in state, complete 28-day source coverage, scheduled meeting/protected-work totals, and a suggestion. These checks do not exercise resource ownership, inventory freshness, consent changes, or another actor's access. A transient server-unavailable page during a concurrent backend rollout recovered, and the subsequently loaded panels were observed after Railway marked backend commit `fb1eefb20` successful; that commit contains the Calendar availability fix.

Browser back from My Day restored the prior History URL with `historyBefore` and `historyPages=1` and rendered its rows; forward restored My Day and its events. This confirms mode history navigation for the signed-in actor, not older-page scroll position or a selected-event return after a long history traversal.

In a later production run, scrolling History automatically loaded `historyPages=2`. An August 28 external event opened from that older page; closing the detail restored the older viewport, and the URL retained page two. Reloading that URL fetched both pages again, and August rows remained reachable by scrolling. The signed-in account's organization switcher listed only its current organization, so a second-organization browser isolation journey cannot use this account.

At 375 px, History page two showed August 21 events. Opening a Daily Team Standup displayed the Google read-only detail; closing it retained `historyPages=2` and restored the August 21 area. A malformed `event=not-a-valid-id&eventSource=external` History URL rendered without a detail and removed the invalid event parameters after load. A real unauthorized ID, terminal cursor, and saved-filter recovery remain unverified.

After the user connected Outlook, the production Calendar accounts panel showed Google Calendar as default and Outlook as enabled. The Week grid loaded its October 12–18 events without the prior `/calendar/events` error. This confirms the post-connection read path for this actor; the displayed standups were Google events, so an Outlook-sourced row and cross-account failure behavior remain open.

The production New Event form offered `outlook` as a sync target. A no-attendee October 14 event with Teams creation disabled returned the generic server-error toast on Save. Repeating with `Don't sync` and a different title returned the same error. Read-only production database lookups found neither title in `calendar_events`, so the UI requests did not persist those events. The form was discarded without another retry. A rollback-only invocation of the current `CalendarService.createEvent` against the same database succeeded as `neondb_owner`, and the deployed `/health/version` reported the same backend commit `fb1eefb20`; this did not reproduce the failure. The database shows active `streamline_app` connections and the actor has an active organization membership. An initial Railway UUID was tried with account-level commands and rejected. A subsequent project-scoped credential worked with `railway status` from the backend checkout, making the precise invitation-delivery constraint failure available in production logs. This is a production write blocker separate from the successful direct Composio provider transport checks.

A private saved Calendar view with a temporary test name saved successfully and opened through its `filter` URL. Removing it returned the Calendar to All events. Revisiting the deleted filter URL rendered “Saved view unavailable” with no saved definition or event rows. The test view was cleaned up. This successful write narrows the create failure to the event path rather than a blanket Calendar write or organization fence failure.

A second temporary private view retained its `filter` ID and title after a full reload. Browser back restored All events, and forward restored the saved view and its rows. Renaming updated the title while retaining the filter ID. The view was then removed; the Calendar was returned to the normal URL. This completes create/read/rename/delete and valid URL navigation for the signed-in owner, not cross-role access or dense search continuation.

On 2026-10-14, ticket 02 mutation validation, moved occurrence identity, and exception reminder cancellation suites passed 28 tests across three suites. The rejected paths make no exception insert; the wrong-date, expired-series, and cancelled cases do not bump the series. A second edit of a moved occurrence writes the original nominal key. Authenticated rejection behavior remains to be checked.

Ticket 03 projection, source registry, and wire-shape suites passed 37 tests across three suites. Live multi-source completeness and version behavior remain to be checked.

Ticket 04 source-owner, visibility, event-detail, export-isolation, and external-tenant suites passed 43 tests across five suites. Live denied-object, permission-revocation, and two-account identity checks remain to be completed.

Ticket 05 native recurrence, dense-series, and export-truncation suites passed 42 tests across three suites. Ticket 06 Build and Tasks source suites passed 28 tests across two suites. Their dense live continuation and source-owner mutation flows remain open.

Ticket 07 HR Calendar source suites passed 32 tests across three suites; the Calendar hook-gate and HR window frontend suites passed 22 tests across two suites. Real multi-session, partial-month, and permission-restoration flows remain open.

Ticket 08 pagination, external sync, and normalizer suites passed 55 tests across three suites. The live connected accounts had too few events to prove dense multi-page behavior.

Ticket 09 owner-mutation, projection-refresh, source-key, and source-panel frontend suites passed 27 tests across four suites. Deployed owner mutations, reconnect, and cross-tab refresh remain to be observed.

Ticket 10 unified-view and event-panel frontend suites passed 28 tests across four suites. Ticket 11 frontend History/URL suites passed 14 tests across four suites, and backend History service passed 12 tests. Live responsive parity, URL back/reload, and dense cursor behavior remain open.

## Production events repair and Outlook live journey, 2026-10-14

Ticket 01's shared occurrence helper was found to compare all-day events by UTC date slices. A timed conflict window inside an Asia/Kolkata all-day event incorrectly returned no overlap. A failing regression reproduced this before the helper switched to half-open instant overlap. Another failing regression showed a weekly New York all-day recurrence ending one hour late across spring DST; recurrence ends now use the original local wall-clock duration, with a fall DST case verifying the extra hour. The conflict service has a direct timed-slot regression. Five dependent occurrence, native-source, conflict, export, and moved-identity suites passed 99 tests; the conflict suite with the added case passed 15 tests. Targeted ESLint and whitespace checks passed. Backend commit `0d95c0de2` was pushed, and Railway deployment `9810cacd-7b51-4208-8a04-ec954e66c1f9` reached SUCCESS. Live behavioral acceptance remains pending.

Railway logs for correlation ID `6072e5a9-cd89-4f66-9b92-55fee4877ea1` show `/calendar/events` failing when postgres.js received a JavaScript `Date` as a raw string parameter. The HR interview overlap SQL now binds ISO timestamp strings, and Build and HR leave search cursor predicates use encoded timestamp strings. The HR source suite passed 23 tests. The first repair reached production in backend commit `030d62dd5`; the user refreshed the production Calendar and confirmed it loaded. Railway subsequently marked the leave cursor follow-up commit `e2fa7e6ee` successful. The user's live refresh preceded that follow-up, so its search cursor needs a separate live check.

The production app-role read found one active Google Calendar connection and one active Outlook connection for the affected actor. Through the application's Composio gateway, Outlook returned a complete empty October window with no unreadable rows or continuation. A temporary no-attendee Outlook event was created, a replay with the same idempotency key returned the same provider event ID, an update succeeded and was visible exactly once in the provider window, and deletion succeeded with zero matching provider IDs on read-back. This journey ran twice and both temporary events were removed. It establishes the live core Outlook transport and idempotent create behavior; dense pagination, OAuth reconnect, accepted-timeout repair, and duplicate or out-of-order webhook handling remain unverified in production.

## Google and Outlook connection architecture, 2026-10-14

Both Calendar providers use Composio connected accounts. The Calendar UI sends `googlecalendar` or `outlook` through the shared integration initiate/finalize endpoints. The backend selects the matching Composio auth config, stores the connected account ID, and uses `ComposioGateway.executeTool` or `executeProxy` for provider reads and writes. The Google Calendar and Microsoft Graph URLs in the write service are endpoints supplied to Composio's authenticated proxy. The Calendar module does not instantiate Google or Microsoft provider SDK clients for these journeys. Google write and read flows were exercised with a connected account. Outlook's core write journey was exercised after the account was connected; dense paging and reconnect remain open.

## Current verification, 2026-10-14

Calendar frontend Jest passed 76 suites and 471 tests. Focused tests after the half-open range changes passed five suites and 39 tests. The broad backend Calendar Jest run passed 148 of 151 suites; the three failed fixtures were corrected and the affected suites passed on rerun. The final provider write suite passed 26 tests, including authored Outlook all-day create and update boundaries.

All 11 Calendar scratch PostgreSQL suites passed 40 tests. The final resolver suite used the existing `APP_DATABASE_URL` non-owner credentials from `backend/.env.production` against `scratch_calendar_20261014_56460c`; it confirmed `current_user = streamline_app` and `rolbypassrls = false`. No database role grants were changed.

The connected Google account passed live create, stable operation replay, update, recurring timezone, Meet conference creation, moved occurrence read-back, occurrence cancellation, authored India all-day dates, and cleanup. A live window returned 44 events in one complete page. Both temporary events were removed. These checks did not send attendee invitations. The later Outlook core journey is recorded above; its remaining cases are still open.

Outlook continuation URLs are now validated before the Composio proxy request. Only HTTPS Microsoft Graph `me/calendarView` or `me/events` continuations are accepted. An unsafe continuation leaves the account window partial and exposes a retryable error; it is never sent to the proxy. The focused pagination suite passed 15 tests, including three invalid destinations, and targeted ESLint passed.

The current backend production TypeScript check exits with TS2353 in `src/modules/hr/time/attendance-regularization.service.ts` at line 243 (`name` is not a `PersonNameFields` property). It reported no Calendar diagnostic, but the full check is not green. That HR file is outside the Calendar scope and was not edited here.

The what-if scenario apply path now derives its source-action proposal key from the signed preview token and the canonical selected step indexes. Reordering the same selected steps keeps the same key; applying a different subset receives a different key. The focused scenario suite passed 17 tests, including distinct subsets from one preview, and targeted ESLint passed.

The current frontend TypeScript check exits with TS2345 diagnostics in `features/hr/employees/detail/employee-form-schema.ts` and `features/hr/policies/policy-form-types.ts`, all outside Calendar. It reported no Calendar diagnostic, but the full frontend check is not green. Those HR files were not edited here.

The user reported `/calendar/events` HTTP 500 with correlation ID `a41242e7-fca0-41e4-889f-e5c9d6601b05`. They later said they think it is fixed. Automatic approval review rejected direct localhost browser verification due the existing browser-security denial. The local frontend points to `https://api.streamlineos.in`; its backend log for that correlation ID was not available in this workspace. The reported 500 remains unverified.

## Linked-record access fallback, 2026-10-14

History now uses the same virtual event list on desktop and mobile, and requests the next cursor when its last rendered row enters view. Empty history pages advance automatically once per loaded page. The manual older-events buttons were removed from Calendar History and the agenda preview, and mobile History no longer drops events after the first 50. Focused component cases were updated; final validation remains pending.

Saved-view search now observes its footer and requests the next cursor when that footer enters view, replacing its manual result reveal button. A per-result-update guard prevents duplicate requests while the observer remains visible. This path needs the final browser and query-hook validation gate.

The virtual event list now groups date-only items by the projection's explicit `startDate`, and its header formats that date without a UTC parse shift. The compact agenda also formats an all-day event from its explicit date. A regression case checks the list header near a UTC boundary; final validation remains pending.

The shared Grid/List range predicate now compares explicit date strings for date-only events instead of their synthetic UTC instants. Attendance overlay deduplication also keys date-only records by `startDate`, so the same workday does not appear twice when two projections use different representative instants. A regression case covers inclusion and deduplication near a UTC boundary; final validation remains pending.

Native event candidate loading now reserves a bounded branch for one-off events and another for recurring series before expanding occurrences. A large set of old series can no longer consume the entire candidate share and hide a current one-off event. Each branch reports incomplete coverage if it exceeds its cap, while the occurrence result remains bounded. A mixed-branch regression case is added; final validation remains pending.

History's scroll loader now waits until the URL-requested page count has been restored before fetching a newer cursor. Changing the History boundary remounts the virtual list and resets its per-page request guard. A component case covers the disabled loader state; browser reload/back behavior still needs validation.

My Day now guards its next-page request by the last received page identity, so repeated virtual-list tail callbacks cannot issue duplicate continuation calls before loading state updates. Empty pages still advance automatically. The hidden manual continuation button was removed, and the virtual list is keyboard focusable; updated component cases await final validation.

History's error retry now reissues a failed next-page request through the URL-updating load handler. Initial-page errors still refetch the initial query. This prevents a retry from only refetching already loaded pages while leaving the missing cursor untouched; final hook and browser validation remain pending.

Aggregate search now rejects provider rows if its post-provider membership lookup finds no active organization membership, rather than projecting them with an unknown owner. An owned-account regression case adds the revoked lookup. History and direct external-account reads still require the same post-provider revocation guard before this access edge can be considered closed; final validation remains pending.

External account discovery and event reads now select connections only when the requesting user has an active membership in the same organization. The tenant-isolation fixture checks the membership predicate in the generated SQL. After all provider requests settle, the external service rechecks active membership before returning events or account metadata; direct external and History reads therefore reject provider results when membership was revoked in flight. A provider-race regression case is added. This change has not reached the final validation gate.

Native-replica lookup for connected accounts now queries only provider event IDs actually returned for the requested window, in 500-ID batches, and keeps connection IDs in the mapped identity. It no longer reads every historical mapping for the account. The cross-account collision fixture now inspects the bounded mapping predicate; database plan and provider-window validation remain pending.

Calendar event create and update now ask the source-owner access service to authorize any linked entity, deal, or lead before writing. Updates merge partial link fields with the current event's links before checking, so clearing or changing one field cannot bypass an existing protected reference. Missing access wiring or a denied object returns a non-revealing not-found result. Create and update rejection cases assert no write begins; final validation remains pending.

Incomplete Google or Outlook account windows now bypass the 60-second result cache, so an immediate retry can request the provider again after a rate limit, repeated continuation, or request-budget stop. Complete windows keep the existing cache. A focused regression case models partial, successful retry, and subsequent cached success. Final validation is pending.

The native event loader now returns no rows when the caller lacks an active membership. Previously it substituted membership ID zero and could still select organization-visible events when invoked through a path without a separate membership gate. A recurrence-source regression case asserts no event query runs for a revoked membership. This change is awaiting the coding-complete validation gate.

Calendar native event loading, detail, and export now omit linked records when the source-owner access guard is unavailable. Invitation recipient replacement rejects a linked event before processing either internal members or external guests when that guard is unavailable. Unknown or incomplete entity references are also treated as protected, including when another linked record on the same event is authorized. The focused detail, access, and export suites passed 21 tests, targeted lint had no errors, and backend production TypeScript passed. These checks establish local fail-closed behavior for the tested paths; deployed cross-role and guest delivery remain pending.

The registered HR interview source and its legacy Calendar path now query half-open interval overlap using scheduled start plus duration. An interview beginning exactly at the range end belongs to the next window, while one beginning before the range and ending inside it remains visible. This latest change has not yet been run through the final validation gate.

Search continuation now rechecks the original range's source/content snapshot for each cursor, then loads the next page from that cursor's time boundary. This lets time-ordered capped sources expose later records rather than repeatedly loading only the first source window. An incomplete source with exactly 100 loaded hits receives one continuation attempt; a repeated or irreducibly dense same-time cap remains partial. A 450-row regression scenario is added but has not yet been run through the final validation gate.

Build and Tasks Calendar adapters now accept an optional search after-position, compare equal-time projection IDs in storage, and order their rows by the same projected IDs used by the aggregate cursor. CRM Task deadlines retain their timestamp and render as short timed markers instead of all-day events. A same-time 450-row search scenario and source SQL-shape cases are added but have not yet been run through the final validation gate. Native, HR, and connected-source same-time continuation remains open.

Registered HR leave and interview reads now apply the same equal-time after-position filter and projection-ID ordering. Leave positions use the date-only noon projection instant; interviews use their scheduled instant. Source SQL-shape cases are added but not yet run. Attendance, holidays, supplemental HR, native recurrence, and connected accounts still need dense same-time continuation.

Holiday and supplemental HR projections now filter against the after-position. Supplemental milestones are ordered by their projected start and ID before applying the source cap, so a provider's unsorted row order cannot select a later 400 while omitting earlier milestones. These changes have not yet been run through the final validation gate. Attendance, native recurrence, and connected accounts still need dense same-time continuation.

Native one-off event candidate reads now filter equal-time records after the search position and sort by the projected event ID in storage. The native projection step also drops occurrences before or at the search position. Recurring candidate series remain unfiltered because a later occurrence can come from an old series; the 400-series candidate cap still needs a source-specific continuation design. A native equal-time regression case is added, but this change has not yet been run through the final validation gate.

Native occurrence retention now breaks equal-start ties by occurrence ID, matching the aggregate search cursor order rather than preferring a shorter end time. An equal-start, different-duration regression case is added. The final validation gate remains pending.

The registry, aggregate cursor, native occurrence filter, and HR JavaScript adapters now share one code-point ID comparator. SQL after-position predicates for native, Build, Tasks, and HR leave/interview projections explicitly use PostgreSQL `C` collation. This aligns equal-time storage order and cursor comparison. A comparator regression case is added; the final validation gate remains pending.

My Day now uses a virtual grouped list and loads the next search page when its last rendered row enters view. An empty result page with a continuation is advanced once per new page, and a keyboard-accessible continuation control remains available. A component regression file is added, but the final validation gate remains pending. The broader configurable display-timezone feature remains open because the current grid localizer is bound to the browser timezone.

My Day timed rows now use the shared timezone-aware event formatter instead of a browser-only start clock, and an empty page with an available continuation shows a searching state rather than claiming there are no matches. These code paths have not yet reached the final validation gate.

The registered HR Attendance Calendar source now computes one PostgreSQL aggregate per day for the current membership. Status flags, open-session state, and net worked hours are computed before the 500-day result cap, so more than 10,000 raw sessions cannot silently leave a day's projection half summed. Approved WFH rows remain one per user/date by the existing unique index. The focused fixture now models a 501-hour day aggregate; this change has not reached the final validation gate or a real PostgreSQL regression run.

Historical Attendance reads now select policy rules for the organization's local last day in the half-open query window. A Los Angeles window ending after UTC midnight has a regression case for the prior local date. This change has not reached the final validation gate.

Approved work-from-home requests now project as their own date event when no Attendance session exists. A day with both sources remains one Attendance event with its work-from-home marker, and the combined events are sorted and capped with partial coverage if the cap is exceeded. A regression case covers the request-only day; final validation is pending.

## Isolated PostgreSQL Calendar race run, 2026-10-14

An isolated database named `scratch_calendar_20261014_56460c` was created on the configured Neon project. Its name and direct connection were checked before every destructive test; the production `neondb` was not used as the test target. The scratch journal bootstrap reached 1,169 of 1,169 entries. Eight initially deferred migrations from other modules applied on retry, with zero left failing. The repository's app-role bootstrap then granted the existing `streamline_app` role its scratch schema privileges and verified 1,116 of 1,116 tables and 460 of 460 callable functions, no object creation privilege, and revoked audit-log update/delete privileges. One synthetic organization and user were seeded in scratch for the webhook probe. A fresh single run of all 11 Calendar `.db.spec.ts` suites passed 40 real-PostgreSQL tests in 83.379 seconds, including linked CRM tenant binding and the non-owner webhook resolver. This is scratch database evidence, not deployed provider or browser evidence.

The source registry now orders oversized source batches by event start and stable ID before retaining its 400-event share. It suppresses any supplied cursor if overflow rows were dropped and treats a supplied cursor as incomplete coverage even when a source sets `truncated: false`. The focused registry suite passed 19 tests; targeted ESLint passed. This preserves honest coverage at the registry boundary but does not provide the missing upstream source pagination for search.

When the offline-policy request fails while the browser is online, the Calendar range hook now removes local and session identity markers, clears the saved offline snapshot, and skips re-saving with stale enabled policy data. A true network outage retains the existing snapshot subject to its identity, policy-version, and expiry checks. The focused hook suite passed both cases, and targeted ESLint passed. Authenticated cross-tab behavior remains unverified.

Saved-view search now distinguishes a traversable next page from terminal incomplete source coverage. The terminal message directs the user to shorten the date range or retry after source recovery. Targeted frontend ESLint and full frontend TypeScript passed. This does not make capped sources fully traversable.

The native Calendar source now carries the authorized linked ticket's project ID into its event projection, so project-filtered search can match that event. Ticket type casing is normalized and malformed ticket IDs cannot bind to a different project. Its source-owner access service is a required dependency, so missing authorization wiring fails during Nest provider resolution instead of silently exposing linked content. Five focused Calendar suites passed 65 tests, targeted ESLint passed, and backend production TypeScript passed. Source-level continuation and cross-role browser evidence remain open.

Calendar event and search requests now carry a validated IANA display timezone. The source context converts the half-open instant window to inclusive local dates using `end - 1 ms`; Build due dates, HR leave, attendance, holidays, and milestones use those local bounds. Availability source reads use the booking policy or organization timezone. The client includes the timezone in request and cache keys, and offline snapshots carry it so a different browser timezone cannot display an old busy-window set. India, Los Angeles, DST, and partial-day cases passed in the date-window and adapter suites. The affected backend selection passed 74 tests across six suites, the availability suite passed three tests, the affected frontend selection passed 23 tests across four suites, targeted lint had no errors, and both backend production and frontend TypeScript passed. Dense source pagination, configurable display-timezone selection, and live cross-role behavior remain open.

The search cursor snapshot now includes visible event fields, freshness state, source coverage, and named failures. A later page rejects changed titles or coverage even when IDs, start times, and source versions remain unchanged; the volatile freshness timestamp is excluded. The aggregate suite passed 28 tests, targeted ESLint passed, and backend production TypeScript passed. This still only snapshots the source rows loaded into the current result, so capped source continuation remains open.

## Production schema and search permission recheck, 2026-10-14

The production Neon migration ledger was read through the direct connection. Calendar migrations `2000_calendar_booking_rules` through `2020_calendar_offline_policy` are all recorded with hashes matching the current SQL files. The full journal has zero pending entries. `calendar_saved_views`, `calendar_admin_policies`, and the two offline-policy columns exist. No migration SQL was applied because no entry is pending. This does not establish that the deployed API revision serves `/calendar/offline-policy` successfully.

The Calendar search React Query key now includes organization, user, membership ID, access snapshot version, Calendar read scope, and current read-permission state. Revoking `calendar:read`, narrowing its scope, changing the access version, or changing membership switches the hook away from cached authorized pages. Two focused frontend suites passed six tests; targeted ESLint and frontend TypeScript passed. The repository package runner returned `unable to open database file`, so Jest, ESLint, and TypeScript were invoked directly from installed packages. Source-level search continuation remains open because current source adapters do not expose traversable next-page cursors.

## Production migration recheck, 2026-10-14

The authorized production migration runner was rerun against the configured Neon target with explicit tags `2016_calendar_saved_views` through `2020_calendar_offline_policy`. Each tag returned `already recorded` with its journal timestamp and exited successfully. The runner applied no SQL in this pass.

An authenticated production browser pass opened Calendar, List, History, and My Day modes. List displayed source-labelled Google events and a Task item. History displayed past events and `Load older events` advanced the URL from `historyPages=1` to `historyPages=2`; the visible rows remained at the top of the virtualized list, so this proves navigation and page-state progression, not that the older page's rows were distinct. My Day showed two connected-event preparation cards. The read-only My capacity panel returned four 15-minute available slices with current source coverage for the selected one-hour window. The time-quality coach remained opt-in and was not enabled. No event, booking, provider, or preference write was made in this pass.

Ticket 11 History returned account coverage and failure keys as `external:<connectionId>` while provider events and the aggregate search use `external:<toolkit>:<connectionId>`. History now uses the canonical provider-specific key for both account coverage and mapped failures. A connected-calendar read failure now preserves authorized native History rows while exposing failed external coverage. The History suite passed six tests including distinct Google and Outlook account identities and provider outage isolation; targeted ESLint and backend production TypeScript passed. The authenticated browser pass above ran before this local fix, so it does not verify these corrections in production.

An additional History coverage case found that a failed native source set caused the whole response to say `failed` even when a connected account supplied authorized events. The response now says `partial` in that case. The History suite passed seven tests, backend production TypeScript passed, and targeted backend ESLint passed. The History partial-result banner now offers an explicit retry and warns that moving to an older period can skip omitted events; targeted frontend ESLint passed. The current 60-day History cursor still advances by window even if a source remains truncated, so dense-window completeness and safe continuation are not yet proven.

The History cursor now retries a capped native or connected-account window at half its previous span before advancing to older time. It continues at the same upper boundary until a complete slice can be returned, preserves version-1 cursor compatibility, and stops with `nextCursor: null` and partial coverage if even a 15-minute slice remains capped. Backend and frontend response contracts now accept a null terminal cursor. The focused History suite passed nine tests, targeted backend and frontend ESLint passed, and both full frontend TypeScript and backend production TypeScript passed. This prevents silent advancement on capped windows; source-level continuation and complete retrieval for an irreducibly dense 15-minute slice remain unimplemented and unverified. Provider failures can still produce partial periods, with an explicit History retry control.

A compatibility regression for a version-1 History cursor increased the focused backend History pass to ten tests. The frontend History hook passed three tests, including a terminal null cursor that does not fetch another page. The partial-result banner distinguishes an older-period continuation from a terminal incomplete period; targeted frontend ESLint and full frontend TypeScript passed after that wording change.

A connected-account continuation case also passed: a provider account with unread pages keeps the same History upper boundary while the next request narrows the window. The focused backend History suite passed eleven tests after this case, and targeted ESLint passed.

Ticket 30 search continuation now binds its cursor to the durable organization access version, the enabled source key set, and a digest of ordered matched event identities, times, and source versions. The server rejects the cursor if permissions change during a read or if access, sources, or visible event ordering change between pages. The focused aggregate suite passed 27 tests, targeted ESLint passed, and backend production TypeScript passed. The frontend search cache key now includes organization and user; projection changes invalidate cached search pages. The search identity hook and cache invalidation suites passed three tests, targeted ESLint passed, and full frontend TypeScript passed. This does not supply source-level continuation for a partially loaded adapter or a durable database snapshot across all owner modules.

After the History response and cursor changes, the complete backend Calendar selection passed 134 suites and 1,011 tests with four workers. Jest reported that one worker did not exit gracefully and force exited it after the passing tests; this does not turn the test result into database, provider, or deployment evidence. The cache directory for this run was local to the task and was removed afterward.

The frontend Calendar feature, Calendar hook, and offline-cache selection passed 65 suites and 415 tests after the History changes. This selection excludes some route and booking suites from the earlier 73-suite frontend run; its result is scoped to the named paths. Full frontend TypeScript passed after the final History UI change.

After the user explicitly authorized production Calendar migrations, a fresh read-only check of the configured production Neon migration journal found `2016_calendar_saved_views` through `2020_calendar_offline_policy` already applied, each with a hash matching its local SQL file. The four tables from 2016 through 2019 and the two offline policy columns from 2020 exist in that database. The actor and time of the intervening migration apply were not established in this check. No migration was rerun by this task because the target state was already present.

Refreshing the authenticated production Calendar page then displayed its week grid, event, source controls, and saved-view selector. The earlier page-level error from `/calendar/offline-policy` did not recur during this load. This is a focused page-load smoke check; it does not establish provider sync, saved-view mutations, or all 36 tickets' production acceptance criteria. The older failure and absent-schema observations below are retained as the historical sequence, not the current database state.

A second authenticated load completed its source loading and showed connected Google events. The saved-view selector opened and listed `All events` without a page error; no saved-view mutation was performed. Two same-time `Daily Team Standup` entries on one day opened as different Google event IDs with different meeting links, so the repeated labels alone do not establish a rendering duplicate. A console error for `GET /billing` appeared during loading, while the Calendar itself subsequently rendered; that unrelated request has not been diagnosed here.

Ticket 30 search cursors now include a digest of organization, user, date window, and search filters. Reusing a cursor under a different actor or changed query returns a bad-request error instead of silently skipping a different result set. The focused aggregate suite passed 24 tests, including the new cross-scope cases; targeted ESLint and diff whitespace checks passed. This does not supply upstream pagination for a source that reports partial coverage, or prove a database-backed search snapshot under concurrent changes.

Ticket 31 protected-work moves now re-read the owned event's timezone inside the tenant transaction and reject a proposed interval that crosses its local day before availability evaluation. Registration also rejects an invalid timezone instead of accepting a `null` local-day comparison. The focused service suite passed 8 tests and targeted ESLint passed. A disposable real database for a transaction and race test was not established; the local backend `.env` points to a remote database, so no write test was run against it.

Ticket 32 chain reads now retain each commitment edge's stored evidence timestamp. Matching endpoint versions no longer make old evidence appear fresh. A malformed adapter batch now restricts only its own nodes and leaves healthy source resolutions available. The graph, registry, and new service regression suites passed 9 tests; targeted ESLint passed. Live cross-module authorization and freshness behavior remain unverified.

Ticket 33 scenario application now orders selected step indexes before creating the source proposal. Replaying the same selected set in a different order produces the same steps and proposal identity. The focused scenario suite passed 16 tests and targeted ESLint passed. Real database replay and source-owner outcomes remain unverified.

Ticket 34 personal-capacity responses now align availability results to every requested 15-minute interval. A missing interval becomes an explicit unknown slice and partial coverage; an empty upstream response no longer passes an `every([])` completeness check. The capacity engine and new service suites passed 12 tests, and targeted ESLint passed. Real resource allocation races and Inventory freshness remain unverified.

Ticket 35 applies the documented 28-day lower date bound to Build ticket projections before reconciling IDs against current status rows. An older projected ticket no longer creates a false missing-status partial result. The focused coach suite passed 9 tests and targeted ESLint passed. Live consent, private-source access, and lifecycle correction behavior remain unverified.

An authenticated production Calendar pass on October 14 turned My time insights off and observed that the panel hid every metric. Turning it on persisted consent version 3, but the button and metrics stayed on the disabled state briefly until the panel was reopened. The Calendar consent mutation now immediately writes either saved consent state into the query cache, clears stale metrics, and refetches current insights. Targeted frontend ESLint passed. This source change still needs a deployed browser check; another actor's private-source access and lifecycle corrections remain unverified.

Another production History pass advanced the URL from `historyPages=1` through `historyPages=3`. Page one showed October events, page two reached July rows, and page three showed June 20–25 events, including distinct titles. The older rows loaded through the scroll continuation without a console error, and Calendar view was restored afterward. This proves at least three real pages of chronological continuation; the terminal cursor and unauthorized real-ID URL state remain unverified.

Ticket 36's reconnect review disabled continuation when an availability result became 60 seconds old but offered no retry unless the request had errored. Both the new-time and event-edit dialogs now expose an explicit recheck only while the same authenticated identity, Calendar permission, current policy, and valid draft remain in force. The edit recheck reloads the occurrence, detail, and availability together. The two focused UI suites passed eight tests, including stale-result recovery; targeted ESLint passed. Production offline navigation and cross-tab revocation remain unverified.

The supplied new Railway credential authenticated successfully as a project-scoped token when `railway status` ran from the backend checkout. Production HTTP logs showed two `POST /calendar/events` 500s at 11:56 and 11:58 UTC. Backend error logs for both identified SQLSTATE `23514`: `calendar_invitation_deliveries.expires_at` was earlier than `scheduled_at` under `chk_calendar_invitation_deliveries_expiry`. The failed insert came from `CalendarInvitationService.enqueueImmediate`. A red regression reproduced the expired immediate delivery. After skipping immediate notifications whose expiry has passed, the same regression exposed overdue reminder plans being moved to `now` after the start-time check. The planner now checks the clamped schedule against event start. Three focused invitation suites passed six tests and targeted backend ESLint passed. This source fix requires deployment and a controlled local-only and Outlook-synced production create retry before the P0 can be closed.

Ticket 36 offline policy revocation now removes active storage markers only when they belong to the revoked identity. The Calendar hook clears the device snapshot only when that identity is active, and offline-panel storage notifications are scoped to its identity. The focused cache suite passed 12 tests, targeted ESLint passed, and all subscriber call sites were checked. This is local policy and component-code evidence; authenticated production offline navigation and cross-tab revocation remain unverified.

After the ticket 30–36 repairs, the complete backend Calendar Jest selection passed 134 suites and 1,004 tests in 198.073 seconds. The complete frontend Calendar Jest selection passed 73 suites and 457 tests in 31.967 seconds. A subsequent subscription-signature correction passed the focused offline-cache suite again (12 tests) and targeted ESLint. The full frontend `tsc --noEmit --project tsconfig.json` check exited with four errors in unrelated HR onboarding and Build overview files; it reported no Calendar-file diagnostic, but the repository-wide type gate is not green. Those unrelated files were not changed for Calendar.

A fresh backend `tsc --noEmit --project tsconfig.json` attempt exhausted Node's default 4 GB heap without TypeScript diagnostics. Repeating the same command with an 8 GB heap also exhausted that heap after about three minutes. Both are unverified typecheck attempts, not source errors or passes. No additional heap increase was attempted while other workspace work was active.

The backend production TypeScript configuration then passed with `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit --project tsconfig.build.json` in about 43 seconds. That config excludes tests and evals, so it proves production source typing, not the broader test/eval type gate.

## Current local verification checkpoint

On 2026-10-14, a fresh backend Calendar run exposed a stale provider-sync scenario fixture after external-event reads moved into tenant transactions. The fixture now restores the transaction passthrough after `jest.resetAllMocks()`. Its focused rerun passed all 18 tests, and the complete backend Calendar rerun passed 132 suites and 996 tests in 82.967 seconds with four workers. This is local test evidence; it does not prove deployed behavior or database migrations.

The frontend Calendar selection initially found two failures in an accessibility fixture that omitted the Attendance module-enabled prop. After setting the fixture's module flags, the complete 73-suite selection passed 456 tests in 27.015 seconds with four workers. The Playwright intercepted suite remains separate and unexecuted.

The migration rollback audit found missing Calendar rollback files for migrations 2016 through 2020. Rollbacks for their created tables and the offline policy columns were added. `node src/scripts/check-migration-rollback.mjs` then reported only two missing rollback files outside Calendar, for migrations 2021 and 2023. No rollback was executed against a database because no disposable `DATABASE_URL` or destructive-test opt in is configured.

The migration discipline gate still flags `2012_calendar_developer_api_webhook_envelope.sql`: its `webhook_logs.delivery_id` and `api_version` `SET NOT NULL` statements lack the required staged `CHECK NOT VALID` and `VALIDATE CONSTRAINT` sequence. This committed migration was not edited because its production apply and hash state are unknown. The gate also flags four migrations outside Calendar. The migration-chain checker could not read an applied watermark without `DATABASE_URL` and reported six timestamp regressions outside Calendar.

The repository OpenAPI path-parameter check passed 4,366 operations. A tenant-isolation coverage check produced no output for more than 90 seconds and was stopped; no result is claimed from that attempt.

An authenticated production browser check on 2026-10-14 reached `https://www.streamlineos.in/calendar`, but the page rendered “Calendar error.” Browser logs identify HTTP 500 `INTERNAL_ERROR` from `/calendar/offline-policy`, with server correlation ID `e40dfdca-32bd-4f8d-9612-06546506e364`. The deployed endpoint is therefore present but failing; the earlier missing-route result is no longer current. Local source shows that this read selects the full `calendar_admin_policies` row, including columns introduced by migration 2020. The actual server exception for that correlation ID remains unverified. The page cannot proceed to authenticated Calendar interactions until this response succeeds.

Read-only access to the configured production Neon database confirmed the browser organization exists there. Migration journal entries 2000 through 2015 match local Calendar hashes; entries 2016 through 2020 have neither matching timestamps nor hashes. The four tables created by 2016 through 2019 are absent, as are both offline policy columns introduced by 2020. The single-migration runner printed a six-statement dry run for 2016. A request to apply that production migration was rejected by automatic approval review because “run them” did not clearly authorize a shared production DDL and journal write; no migration was applied.

The repository's linked Railway project belongs to an unrelated workspace, so no Railway service or logs were changed or read. A production database count for the authenticated Calendar organization found one active Google Calendar connection and no Outlook connection; this does not prove provider sandbox behavior or authorize writing test events to that account.

The post-fix Calendar run on 2026-10-13 passed all 128 backend Calendar suites and 988 tests. The frontend Jest Calendar selection passed all 73 suites and 450 tests after updating a stale event-ID template-count expectation. A broader first Jest scan mistakenly included one Playwright E2E spec, which cannot run under Jest; the corrected selection excluded that separate runner. These passes cover local unit and component behavior, not production authentication, database migrations, provider sandboxes, or deployment.

The intercepted Calendar Playwright suite was separately attempted with installed system Chrome and its fixture-only backend configuration. The Next.js test server did not reach runner readiness and the process was stopped after remaining silent beyond the configured startup limit. A direct localhost:3201 probe returned a sandbox socket-permission error. The E2E TypeScript project passed, but no intercepted browser cases executed; this attempt is unverified browser evidence.

On 2026-10-13, the complete backend Calendar Jest selection passed 127 suites and 978 tests. The frontend Calendar feature, hook, offline, and booking selection passed 66 suites and 402 tests; four Calendar route and accessibility suites passed another 22 tests. Frontend TypeScript passed. After the offline policy revocation fix, three focused frontend suites passed 14 tests, frontend TypeScript passed again, and targeted ESLint passed. The backend Nest build completed successfully and its compiled output contains `CalendarOfflinePolicyController` and `dist/main.js`.

These checks do not prove production API routing, applied migration 2016, saved-view CRUD, provider sandbox behavior, or live offline and cross-tab behavior. The production Calendar browser tool failed before opening a tab with an OS kernel-asset path error, and a separate web request could not access the authenticated page. The earlier production `/calendar/saved-views` HTTP 500 remains unresolved without backend logs or database access. Migration-chain verification without `DATABASE_URL` reported six historical journal timestamp regressions outside the Calendar migration range; no historical migration was restamped.

The subsequent multiple-account offline policy refinement passed three focused frontend suites and 16 tests plus targeted ESLint. Its full frontend TypeScript run was interrupted after several minutes without output and is unverified. The new tests cover independent account policy versions, stale enable and disable responses, and matching cross-tab storage events; the production browser path remains untested.

An additional render-identity guard passed the focused offline cache suite (10 tests), a targeted TypeScript compile of the changed Calendar hook, offline panel, cache and NextAuth augmentation, and targeted ESLint. This targeted compile does not replace the stalled complete frontend typecheck. Live account switching, offline navigation, and cross-tab revocation remain unverified.

The standalone offline shell then passed a headless system Chrome check through `frontend/scripts/check-calendar-offline-shell.cjs`: authorized busy-window display, title redaction, immediate removal on a simulated cross-tab policy change, blocked reload after revocation, a second account's independent snapshot, policy-version mismatch, and expiry. The script loads the HTML file directly with controlled IndexedDB and browser storage. It does not prove service-worker fallback delivery, authenticated production access, or backend revocation propagation.

The same repeatable script subsequently registered the real `public/sw.js` under a routed secure browser origin, removed its route, and navigated offline to `/calendar`. Chrome displayed the cached shell and authorized busy windows; a simulated policy revocation cleared the windows, and offline reload denied access. This proves local service-worker navigation fallback with controlled storage, not production deployment, real membership revocation propagation, or provider behavior.

For ticket 29, the focused meeting-workspace UI suite passed 3 tests showing safe unavailable, consent-withdrawn, and expired context states. The backend context suite passed 7 tests, including isolation of one failed source from another authorized source. Targeted lint passed. These fixtures do not establish a real database retention sweep or authenticated API and browser lifecycle.

On 2026-10-14, ticket 29 workspace member and bundle reads were moved into tenant transactions; a bundle now reads its event, contexts, notes, and drafts through the same transaction. A focused store suite passed two tests and targeted lint passed. Real RLS, retention cascade, and authenticated meeting lifecycle remain unverified.

For ticket 30, the aggregate search suite passed 23 tests after correcting false next-page cursors when a source is partial but exactly 100 authorized matches are loaded. Targeted backend TypeScript and ESLint passed. Source coverage remains visibly partial because upstream source cursors are not traversable through the search endpoint. The production saved-view HTTP 500, migration 2016 state, and database CRUD remain unverified.

On 2026-10-14, the saved-view service was rechecked: its membership, list, create, update, and delete queries use tenant transactions, and migration `2016_calendar_saved_views.sql` is present and registered in the migration journal. This source inspection cannot establish whether production applied migration 2016 or explain the observed 500 without deployed database state and server logs. A package-wide backend TypeScript attempt was stopped after five minutes without diagnostics or exit; it is unverified, while the focused changed-service Jest suites passed.

The saved-view source-key lookup also reaches the external Calendar connection service. Its active-connection, event-connection, and mapped-replica reads now use tenant transactions instead of the raw database handle. The three focused external Calendar suites passed 15 tests after their database mocks were updated for the tenant boundary, and targeted lint passed. This removes one plausible source-side failure path but does not establish the production 500 root cause or migration state.

For ticket 31, the lifecycle replan consumer now uses its own tenant transaction only for candidate scans. The protected-work service already opens tenant transactions for suggestions and moves, so removing outer wrappers avoids holding an extra connection across availability evaluation. A focused consumer regression passed (1 test), as did targeted backend TypeScript and ESLint. Connection-pool pressure and lifecycle replan behavior against a real database remain unverified.

Ticket 31 planner and service edge suites then passed 16 tests covering repeated meeting churn inside cooldown, a changed deadline, and lost active membership during registration, alongside existing capacity, stale-availability, and undo-collision cases. Targeted lint passed. Real transactional move and undo evidence is still open.

For ticket 32, a failed commitment source adapter now leaves its own nodes restricted while allowing other source batches to resolve. The focused registry suite passed 3 tests. This is local partial-outage evidence, not live cross-module behavior.

For ticket 33, applying a signed scenario now derives the source-proposal idempotency identity from the token, so a changed client key cannot create a second proposal. The focused scenario suite passed 15 tests and targeted lint passed. Database replay, source-owner outcomes, and live multi-step repair remain unverified.

For ticket 34, malformed claim or constraint time windows now return unknown capacity for the requested resource instead of disappearing from the calculation. The focused capacity suite passed 10 tests and targeted lint passed. Real allocation races and Inventory freshness remain unverified.

For ticket 35, the overdue Tasks metric now enforces its documented 28-day lower bound when processing source pages. The focused coach suite passed 8 tests and targeted lint passed. Live consent changes, private access, and lifecycle corrections remain unverified.

For ticket 36, offline busy-window snapshots exceeding the 2,000-window cap now report partial aggregate and source coverage. The focused cache suite passed 11 tests and targeted lint passed. The production browser tool still fails during initialization with an OS kernel-asset path error; a DNS lookup was denied by this task environment. Live authenticated offline behavior remains unverified.

## Core projection migration

Evidence recorded on 2026-10-13 for tickets 01 through 12.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Source and service contracts | Passed | Backend Calendar acceptance run: 14 suites and 136 tests passed. It covers typed projections, registry isolation, registered-source completeness, undeclared modules, source-owner access, dense-series truncation, tenant isolation, event capabilities, lifecycle coverage, Build, Tasks, and HR sources. | This proves application contracts with test doubles and fixtures. |
| Frontend contracts and behavior | Passed | Frontend Calendar run: 55 suites and 356 tests passed. Production, spec, and browser-test TypeScript configurations also passed. | This proves component, hook, schema, cache, and interaction contracts in the test environment. |
| Authenticated browser behavior | Passed with intercepted services | Playwright ran six authenticated journeys for two organization identities at 375x812, 768x1024, and 1280x800. Each journey rendered only its organization projection, opened Calendar accounts, showed Google and Outlook account fixtures, and had no document-level horizontal overflow. | The browser used deterministic intercepted API responses. It proves responsive UI, session scoping, and multi-account presentation without proving a live provider or database. |
| Provider sandbox behavior | Not run | No Google Calendar or Microsoft Outlook sandbox credentials were used in this pass. | Pagination and normalization are contract-tested; provider token refresh, remote write propagation, throttling, and provider-specific failures still need sandbox evidence before a provider-backed release. |
| Deployment status | Not deployed | The changes remain in the local workspace. | No staging or production deployment, migration execution, observability review, or live-provider smoke test is claimed. |

## Commands

- `pnpm exec jest --runInBand --silent` with the 14 focused backend acceptance suites: 136 tests passed.
- `pnpm exec jest --runInBand --silent features/calendar ...`: 55 suites and 356 tests passed.
- `pnpm run typecheck` in `backend`: passed.
- `pnpm run type-check`, `pnpm run type-check:specs`, and `pnpm run type-check:e2e` in `frontend`: passed.
- `pnpm exec playwright test --config playwright-intercepted.config.ts e2e-intercepted/calendar-core.spec.ts --reporter=line`: 6 tests passed.

## Release gate

The core typed projection migration is complete and locally verified. A release that enables real Google Calendar or Outlook accounts still requires provider sandbox evidence followed by staging deployment evidence.

## Availability and booking foundation

Evidence recorded on 2026-10-13 for tickets 13 through 15.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Privacy-safe availability | Passed | Availability engine and service suites cover free, busy, tentative, unknown, timezone, DST, working hours, leave, buffers, permission limits, disconnected providers, truncation, and audience-safe diagnostics. | Provider freshness is exercised through source fixtures rather than live provider accounts. |
| Booking rules | Passed | Immutable rule versions, lifecycle transitions, public token hashing, secure public projection, slot policy, daily limits, buffers, and rule-bound availability passed focused tests and backend production/test typechecks. | Migration 2000 has source-gate evidence but has not been applied to a disposable or staging database in this workspace. |
| Durable holds | Passed locally; database execution blocked | The hold coordinator and validation suites pass. Migration 2001 defines durable hold and claim ledgers, tenant RLS, an active-claim exclusion constraint, idempotency identity, ordered target locks, fencing, atomic release, lazy expiry, and a batched expiry path. The real-database suite covers simultaneous last-unit claims, duplicate submission, expiry during confirmation, and worker rollback recovery. | The database runner refused to start because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. The race suite is test-typechecked but has not executed here. |
| Migration gates | New migrations clean | The discipline and rollback gates reported no violation for migrations 2000 or 2001. | Repository-wide gates still fail on pre-existing discipline findings in 1956, 1958, and 1993 and missing rollback files for 1981 and 1982. |

### Booking foundation commands

- Focused availability acceptance: 4 suites and 32 tests passed.
- Focused booking-rule acceptance: 4 suites and 13 tests passed.
- `pnpm test -- --runInBand ...calendar-booking-hold...`: 2 suites and 4 tests passed; the database suite is intentionally outside ordinary Jest.
- `pnpm run typecheck` and `pnpm run typecheck:test` in `backend`: passed after the hold implementation.
- `pnpm exec jest --config ./jest-db.json --runInBand --forceExit --testPathPattern=calendar-booking-hold.db.spec.ts`: refused before tests because no approved disposable database was configured.

## Idempotent booking commit

Evidence recorded on 2026-10-13 for ticket 16.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Commit coordinator | Passed | The confirmation coordinator re-resolves the live public rule, loads the owned hold, validates rule version and dynamic intake, rechecks policy, daily capacity, host availability, freshness and coverage, and returns safe alternatives for non-confirmation outcomes. | Provider and cross-module source reads are fixture-backed in this pass. |
| Transactional commit | Passed locally | The transaction rechecks the live rule token and expiry, current version, active host, hold state and fence, active constrained claims, fresh availability evidence, daily limit, existing booking, and host overlap. Idempotency and rule-day locks serialize competing requests. | The source evidence fingerprint records the exact freshness snapshot used by the decision; no claim is made that external providers share the local database transaction. |
| Durable receipts | Passed | Receipts support confirmed, rejected, expired, cancelled, pending, and uncertain outcomes and keep local, provider sync, and external effects states separate. Terminal failures release matching fenced claims; uncertain outcomes retain capacity for reconciliation. | Provider synchronization and downstream effects are implemented by later tickets. |
| Focused verification | Passed | Five suites and 15 tests passed. Backend production and test TypeScript configurations passed. No new code comments or diff whitespace errors were found. | The guarded real-database race suite did not execute because the environment has no explicitly approved disposable database. |
| Real persistence suite | Defined; execution blocked | The suite covers two confirmation keys racing one hold, timeout replay, rule or host drift, and independent local/provider/external states using PostgreSQL transactions and row locks. | The database guard refused execution before tests without `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1`. |

## Versioned lifecycle events

Evidence recorded on 2026-10-13 for ticket 17.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Lifecycle contract | Passed | Confirmed, changed, rescheduled, cancelled, no-show, started, ended, failed, and repaired transitions emit versioned `calendar.booking.*` or `calendar.event.*` envelopes with stable effect identities. Native event creation, update, deletion, recurrence exceptions, and booking confirmation publish in their mutation transaction. | Later tickets own provider, invitation, workflow, webhook, and analytics consumers. |
| Consumer safety | Passed | Version classification distinguishes next, duplicate, stale, and gap delivery. Gap events remain replayable after reconciliation; applied event IDs and aggregate cursors provide duplicate and ordering control. | The reusable version decision is unit-tested; the persistence workflow is defined in a guarded PostgreSQL specification. |
| Privacy and deletion | Passed | Payloads carry tenant, aggregate identity, version, lifecycle state, occurrence identity, and time bounds without titles, descriptions, guest addresses, join data, or restricted record content. Deleted and restricted record cases use minimized tombstone-compatible payloads. | Downstream consumers must still reauthorize against current source ownership before reading record details. |
| Regression verification | Passed | The complete Calendar backend run passed 86 suites and 751 tests. Backend production and test TypeScript configurations passed. Focused stale-fixture regressions passed, diff whitespace passed, and no code comments were added in the ticket implementation files. | Expected warning and error logs come from provider failure-path tests. |
| Real persistence suite | Defined; execution blocked | The lifecycle database suite covers aggregate/outbox rollback, duplicate replay, out-of-order gap recovery, stale delivery, and same-aggregate tenant isolation. | The database guard refused execution before tests because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were configured. |
| Migration gates | New migration clean | Migration 2003 adds lifecycle state and monotonic version fields with backfill, checks, journal registration, and rollback. | Repository-wide checks still report older unrelated discipline findings in 1956, 1958, and 1993 and missing rollback files for 1981 and 1982. |

### Lifecycle commands

- `pnpm exec jest --runInBand --silent src/modules/calendar`: 86 suites and 751 tests passed.
- `pnpm run typecheck` and `pnpm run typecheck:test` in `backend`: passed.
- `pnpm test:db-specs --runTestsByPath src/modules/calendar/calendar-lifecycle-events.db.spec.ts`: refused before tests because no approved disposable database was configured.
- `pnpm run check:migration-discipline`: ticket migration clean; failed only on older migrations 1956, 1958, and 1993.
- `pnpm run check:migration-rollback`: ticket rollback clean; failed only on older migrations 1981 and 1982.

## Invitations, guest lifecycle, and reminders

Evidence recorded on 2026-10-13 for ticket 18.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Invitation identity and authorization | Passed | Required and optional internal attendees and external guests receive one current invitation per event occurrence and principal. Internal RSVP requires active organization identity; signed RSVP and join tokens are purpose scoped, expiring, hashed at rest, version bound, and rejected after recipient removal, organizer departure, email replacement, occurrence cancellation, or invitation supersession. | Token behavior is contract tested without delivering through a live email provider. |
| Reminder and delivery lifecycle | Passed | Reminder defaults, channel preferences, quiet-hour delay or skip, snooze, missed-delivery recovery, per-occurrence deduplication, retry, cancellation suppression, and final pre-dispatch version checks are implemented with durable delivery receipts. Concurrent preference, reschedule, cancellation, and delivery paths use conditional version updates and ordered locks. | Worker effects use notification and email outbox contracts; no deployed worker or live email delivery is claimed. |
| Event, booking, recurrence, and provider integration | Passed | Native event changes, recurrence exceptions, booking confirmation and lifecycle transitions, provider conference-link writeback, and legacy member RSVP all synchronize invitation state and lifecycle outbox records in the owning transaction. No-show is limited to an active organizer or booking host after the subject end time. | Real provider reconciliation is owned by ticket 19. |
| Public invitation experience | Passed | Public RSVP and join routes expose minimized invitation data. RSVP pages require an explicit response, join data is available only through a join-purpose token, invalid links hide subject details, and dynamic invitation routes do not request a user session or attach an authorization header. | Browser interaction is covered with component and transport tests rather than a deployed signed-link journey. |
| Regression verification | Passed | The complete backend Calendar run passed 91 suites and 766 tests. Backend production and test TypeScript configurations passed. The public page suite passed 3 tests; the transport suite passed 3 tests; the frontend specification TypeScript configuration passed. Diff whitespace passed and no code comments were added. | Expected warning and error logs originate from exercised provider failure paths. |
| Migration gates | New migration clean | Migration 2004 creates tenant-scoped invitation, signed-token, and delivery ledgers with RLS, uniqueness, checks, grants, journal registration, and rollback. | Repository-wide checks still report older unrelated migration discipline findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, and six older timestamp regressions. |

### Invitation commands

- `pnpm test -- --runInBand src/modules/calendar`: 91 suites and 766 tests passed.
- `pnpm run typecheck` and `pnpm run typecheck:test` in `backend`: passed.
- `pnpm -C frontend test -- --runInBand lib/api-client-request.test.ts`: 1 suite and 3 tests passed.
- Public invitation page acceptance: 1 suite and 3 tests passed.
- `pnpm -C frontend run type-check:specs`: passed.
- Migration discipline, rollback, and chain gates found no issue in migration 2004; only the older repository findings listed above remain.

## Google and Outlook write reconciliation

Evidence recorded on 2026-10-13 for ticket 19.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Provider write contract | Passed | Google creates use a deterministic provider event ID; Outlook creates use a deterministic Graph transaction ID. Accepted-timeout retries converge on the same external identity. Updates and deletes carry provider version preconditions where a version exists. Unsupported recurrence or occurrence behavior fails visibly. | Provider calls are exercised through protocol-shaped test doubles rather than live accounts. |
| Reconciliation and repair | Passed | Duplicate deliveries use stable operation identities; provider versions and timestamps discard duplicate or older notifications; authentication failures require reconnect; provider conflicts require reload and review; conference creation remains pending until a link is returned; expired Google or Outlook continuation state restarts once from a clean first page. Personal and organization reconnects preserve or migrate local connection identity and resume authentication-blocked work. | The normalized webhook ingress assumes the configured upstream provider adapter supplies verified connection and delivery metadata. |
| Regression verification | Passed | The complete backend Calendar run passed 92 suites and 786 tests. The focused provider run passed 9 suites and 102 tests. Focused frontend provider status and contract tests passed 2 suites and 18 tests. Backend production and test TypeScript configurations, frontend production TypeScript, and frontend specification TypeScript passed. | Expected warning and error logs are assertions of failure and repair paths. |
| Migration gates | New migration clean | Migration 2005 adds provider version markers, semantic operation identity, typed failure reasons, uniqueness, indexes, journal registration, and rollback. | Repository-wide discipline, rollback, and chain gates still report only the older findings already listed for tickets 17 and 18. |
| Provider sandbox | Blocked | A complete journey matrix is defined by the ticket and implementation tests. | No authorized Google Calendar or Microsoft Outlook sandbox accounts or tokens are available in this workspace, so create, update, occurrence, cancellation, reconnect, timeout, and duplicate-delivery behavior has not been executed against either live provider. |

### Provider reconciliation commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 92 suites and 786 tests passed.
- Focused provider and reconnect tests: 9 suites and 102 tests passed.
- Focused frontend provider status and contract tests: 2 suites and 18 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- `pnpm -C frontend type-check` and `pnpm -C frontend type-check:specs`: passed.
- Migration discipline, rollback, and chain gates found no issue in migration 2005; only the older repository findings listed above remain.

## Rooms and source-owned resources

Evidence recorded on 2026-10-13 for ticket 20.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Resource model and availability | Passed | Calendar-managed rooms, equipment, and generic resources have tenant-scoped identity, capacity, divisible units, location, accessibility, maintenance, approval, status, and optimistic versions. Immutable booking-rule versions bind their resource requirements. Public slot evaluation exposes only free, busy, or unknown state and safe reason codes. | Source ownership currently uses the HR asset adapter. Additional source modules must provide an owner adapter before their records can be registered. |
| Hold and commit safety | Passed | Resource units are claimed by the durable hold ledger beside the host claim. Commit revalidates live resource state while excluding its own claims from competing capacity. A rejected or uncertain resource cannot create a confirmed booking. Pending approval creates a pending booking and durable per-resource allocation receipt. | External resource owners do not share the local transaction; their decision is represented explicitly as pending until resolved. |
| Approval and failure lifecycle | Passed | An authenticated organization administrator can resolve a versioned allocation with an owner receipt. Approval rechecks maintenance, current source eligibility, claims, capacity, and the frozen rule requirement. The booking confirms only after every resource is committed and any separate rule approval is cleared. Rejection fails the booking, updates the commit receipt, releases other allocations and every hold claim, and emits the versioned lifecycle event. | The organization administrator is the current local approval authority for calendar rooms and HR assets. Delegated source-owner roles can be added through the same receipt contract. |
| Race and edge coverage | Passed locally; database execution blocked | Unit coverage verifies maintenance drift, location, accessibility, divisible capacity, own-claim handling, approval delay, source-owner versions, and partial multi-resource failure. The PostgreSQL suite defines simultaneous room and last-divisible-unit races using exclusion constraints. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. The suite is test-typechecked but no database race result is claimed. |
| Regression verification | Passed | Five focused suites passed 23 tests. The complete Calendar backend run passed 93 suites and 795 tests. Backend production and test TypeScript configurations and focused ESLint passed. Diff whitespace passed. | Prettier is not installed in the backend package, so formatting was enforced by the existing ESLint and TypeScript gates. |
| Migration and route gates | New work clean | Migration 2006 adds resource, maintenance, frozen requirement, and allocation tables with checks, tenant RLS, grants, indexes, journal registration, and rollback. The new route schemas resolve successfully. | Repository-wide gates still report older discipline findings in 1956, 1958, and 1993, missing rollback files for 1981 and 1982, six older journal timestamp regressions, and four unresolved Build approval schemas outside Calendar. |

### Resource commands

- `pnpm -C backend test -- --runInBand ...`: 5 focused suites and 23 tests passed.
- `pnpm -C backend test -- --runInBand src/modules/calendar`: 93 suites and 795 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- Focused Calendar resource ESLint: passed.
- `pnpm -C backend test:db-specs -- --runTestsByPath src/modules/calendar/calendar-booking-hold.db.spec.ts`: refused before tests because no approved disposable database was configured.
- Migration discipline, rollback, and chain gates found no issue in migration 2006; only the older repository findings listed above remain.

## Scheduling polls with expiring holds

Evidence recorded on 2026-10-13 for ticket 21.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Poll lifecycle and voting | Passed | Organizers can create versioned polls with required or optional internal members and signed external guests, vote until expiry, replace a guest identity, close early, cancel, or finalize. Guest tokens bind tenant, poll, voter, identity, version, purpose, and expiry; only hashes are stored. Vote upserts keep one current response per voter and option while preserving aggregate results after closure. | External voters use email identity and signed links; no live email delivery was exercised in this pass. |
| Holds and finalization | Passed | Optional capacity holds use the durable hold and resource-claim ledger and release on expiry, cancellation, or finalization. Finalization uses an optimistic claim, re-resolves the current rule, rechecks host and resource availability, enforces the daily limit, acquires a fresh hold, and commits one booking, invitation set, receipt, resource allocation set, option selection, and lifecycle event in one transaction. | Provider writes and downstream invitation delivery remain asynchronous effects owned by tickets 18 and 19. |
| Changed-state recovery | Passed | A stale finalizing lease reopens safely. Rule or availability lookup failures reopen the poll without discarding votes. A genuinely busy selected option is marked unavailable, votes stay visible, and current alternatives are returned. Departed required members stop finalization; departed optional members are omitted from the committed invitation. | Fresh alternatives are bounded to ten and inherit the current booking rule window. |
| Public experience | Passed | The signed public poll page shows minimized poll details, response controls, aggregate totals, and terminal status at responsive sizes. Invalid tokens reveal no subject details, and public poll routes neither request a session nor attach an authorization header. | This is component and transport proof rather than a deployed signed-link browser journey. |
| Regression verification | Passed | Three focused backend suites passed 10 tests; two focused frontend suites passed 7 tests. The complete backend Calendar run passed 96 suites and 805 tests. Backend production and test TypeScript, frontend production and specification TypeScript, and focused backend ESLint passed. | Expected warning and error logs originate from exercised provider failure paths. |
| Real persistence race suite | Defined; execution blocked | The PostgreSQL suite covers two simultaneous finalization claims, expired and cancelled claim refusal, and repeated vote upserts. | The database guard refused execution before tests because `ALLOW_DESTRUCTIVE_DB_TESTS=1` was absent. No database race result is claimed. |
| Migration and route gates | New work clean | Migration 2007 adds tenant-scoped poll, option, voter, and vote tables with uniqueness, checks, RLS, grants, indexes, journal registration, lock timeout, deferred foreign-key validation, and rollback. New Calendar route schemas resolve successfully. | Repository-wide gates still report older discipline findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, six older timestamp regressions, and four unresolved Build approval schemas outside Calendar. |

### Scheduling poll commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 96 suites and 805 tests passed.
- Focused scheduling poll backend acceptance: 3 suites and 10 tests passed.
- Focused public poll page and transport acceptance: 2 suites and 7 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- `pnpm -C frontend type-check` and `pnpm -C frontend type-check:specs`: passed.
- Focused scheduling poll backend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-scheduling-poll.db.spec.ts`: refused before tests because destructive database opt in was absent.
- Migration discipline, rollback, chain, and route schema gates found no Ticket 21 issue; only the older repository findings listed above remain.

## Deterministic team routing

Evidence recorded on 2026-10-13 for ticket 22.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Versioned rule and explanation contract | Passed | Tenant-scoped immutable versions freeze mode, fallback, collective size, CRM-owner preference, and host weights, priorities, territory, language, skill, and daily capacity. Authorized administrators, rule owners, and selected hosts can read private assignment evidence; other members receive a not-found response. Public booking receipts expose no private routing reasons. | Routing context is supplied through the booking contract. A later form-builder feature may map branded intake answers into this typed context. |
| Eligibility and deterministic selection | Passed | Routing excludes inactive, offboarded, archived, on-leave, busy, stale, permission-limited, disconnected, and over-limit hosts. It supports CRM-owner continuity, territory, skill, language, fair rotation, weighted rotation, least loaded, collective selection, primary-host fallback, next-eligible fallback, and safe no-match outcomes. Stable context and decision hashes bind the selected order and reasons to the hold. | Provider state is verified through normalized source fixtures rather than live Google or Outlook accounts. |
| Hold, commit, and fairness integrity | Passed | Every routed host receives a durable claim. Confirmation revalidates the exact routing version, normalized context, current host state, availability, daily limits, and decision hash under an organization, rule, and day advisory lock. The booking, assignment receipt, and fairness counters commit in one transaction. Idempotent retries reuse the original booking and do not increment fairness again. | External provider calendars do not share the local database transaction; provider synchronization remains asynchronous. |
| Race and edge coverage | Passed locally; database execution blocked | Unit coverage verifies fairness ordering, CRM owner, territory, skill, language, collective minimums, fallbacks, ineligible-host filters, context identity, decision ordering, and private evidence authorization. The PostgreSQL suite defines concurrent fair assignment and duplicate replay checks. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. No real-database race result is claimed. |
| Regression verification | Passed | Eight focused suites passed 31 tests. The complete Calendar backend run passed 99 suites and 821 tests. Backend production and test TypeScript configurations, focused ESLint, and diff whitespace passed. | Expected warning and error logs originate from exercised provider failure and repair paths. |
| Migration and route gates | New work clean | Migration 2008 adds routing rules, immutable versions, host constraints, fairness state, assignment receipts, hold decision metadata, tenant RLS, grants, indexes, lock timeout, deferred foreign-key validation, journal registration, and rollback. | Repository-wide gates still report older discipline findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, six older timestamp regressions, and four unresolved Build approval schemas outside Calendar. |

### Team routing commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 99 suites and 821 tests passed.
- Focused routing, authorization, DTO, availability, hold, and commit acceptance: 8 suites and 31 tests passed.
- `pnpm -C backend typecheck` and `pnpm -C backend typecheck:test`: passed.
- Focused Ticket 22 backend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-team-routing.db.spec.ts`: refused before tests because destructive database opt in was absent.
- Migration discipline, rollback, chain, parameterization, and route schema gates found no Ticket 22 issue; only the older repository findings listed above remain.

## Secure branded and embedded booking

Evidence recorded on 2026-10-13 for ticket 23.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Branded public journey | Passed | The public route renders versioned branding, locale copy, configured intake fields, consent, available slots, terminal receipts, and a safe unavailable state. The focused journey passed four tests, including an automated accessibility scan and an end-to-end mocked hold, confirm, and callback flow. | Provider writes and email delivery remain asynchronous responsibilities of earlier Calendar tickets. |
| Embed and callback security | Passed | Embed access links bind one exact approved origin. Embed sessions require caller state, hash it, and receive a signed token bound to session hash, origin, state hash, and a 24-hour expiry. The callback verifies that signature and returns only the facts approved by the frozen distribution version. | A deployed third-party embedding site was not available in this workspace. |
| Link, session, and abuse lifecycle | Passed | Access tokens and session tokens are stored only as hashes. Expiry, revocation, single-use consumption, 24-hour session expiry, completion-time limits, attempt limits, consent, honeypot persistence, and public read/write/session rate limits are enforced server side. Public failures use non-enumerating responses. | Operational counts are available to authorized rule managers; alert routing is owned by later observability work. |
| Idempotency and attribution | Passed locally; database execution blocked | Conversion rows are unique per booking and per session. Booking conversion, session completion, and single-use link consumption share the booking transaction, so refresh, retry, embed callback, and reschedule do not create a second conversion for the same booking. The PostgreSQL suite defines simultaneous single-use consumption, duplicate retry, and expired-link cases. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. No real-database race result is claimed. |
| Regression verification | Passed | Six focused backend suites passed 22 tests, the frontend public journey passed 4 tests, and the complete backend Calendar run passed 103 suites and 838 tests. Backend and frontend production TypeScript, frontend specification TypeScript, backend test TypeScript, focused ESLint, and diff whitespace passed during the ticket pass. | The final repeated spec-compilation run was stopped after extended no-output memory contention; focused Jest compilation and the earlier successful spec compilers cover the unchanged contracts. |
| Migration and architecture gates | New work clean | Migration 2009 adds identity keys, tenant RLS, grants, exact origin checks, expiry and foreign-key indexes, journal registration, lock timeout, rollback, and conversion uniqueness. Ticket 23 services and frontend components remain below 300 lines. Tenant-index, retention, and OpenAPI path gates passed. | Repository-wide gates still report older migration findings in 1956, 1958, and 1993, rollback omissions for 1981 and 1982, six older timestamp regressions, and unrelated Build/module baseline debt. |

### Secure booking commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 103 suites and 838 tests passed.
- Focused secure distribution, embed, DTO, hold, and commit acceptance: 6 suites and 22 tests passed.
- Focused public booking journey and automated accessibility acceptance: 1 suite and 4 tests passed.
- `pnpm -C backend typecheck`, `pnpm -C backend typecheck:test`, `pnpm -C frontend type-check`, and `pnpm -C frontend type-check:specs`: passed during the ticket pass.
- Focused Ticket 23 backend and frontend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-booking-public-access.db.spec.ts`: refused before tests because destructive database opt in was absent.
- Migration discipline, rollback, chain, route, retention, and tenant gates found no Ticket 23 issue; only the older repository findings listed above remain.

## Paid appointment reconciliation

Evidence recorded on 2026-10-13 for ticket 24.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Durable payment and booking identity | Passed | A tenant-scoped saga binds the public session, hold, immutable booking rule, frozen payment policy, idempotency identity, provider order and payment identities, booking identity, and optimistic version. Payment, booking, refund, chargeback, and repair states remain independently visible through public and managed response schemas. | Provider effects cannot share the local database transaction, so uncertain remote outcomes remain explicitly queued for reconciliation. |
| Duplicate and uncertain-effect safety | Passed locally; database execution blocked | A durable operation ledger claims order creation, capture, and refund effects once. Lost order responses enter `order_unknown`; capture timeouts enter `reconcile_payment`; neither path repeats an uncertain provider effect. The guarded PostgreSQL suite defines concurrent duplicate submit and booking-race cases. | The database runner refused execution because no explicitly approved disposable `DATABASE_URL` and `ALLOW_DESTRUCTIVE_DB_TESTS=1` were present. No real-database race result is claimed. |
| Booking failure, cancellation, and refund | Passed | Booking commit occurs only after authoritative capture. A booking race or commit failure preserves the captured amount and enters `refund_required`. Cancellation uses the frozen notice and late-refund policy, supports partial and full refunds, keeps provider refund identity, and exposes repair failures for retry. | Refund completion remains subject to the configured payment provider and its external settlement lifecycle. |
| Provider reconciliation and chargeback | Passed | A bounded tenant sweep retries due reconciliation and refund work. Verified, deduplicated provider webhooks update matching sagas in the webhook transaction, validate order, amount, and currency before capture, quarantine mismatches, record authoritative refunds and failures, and keep bounded chargebacks separate from booking state. | Live provider sandbox credentials and webhook delivery were unavailable, so provider validation is based on adapter contracts and deterministic tests. |
| Public paid-booking journey | Passed | The booking session exposes the configured amount and currency, the page creates the provider order, invokes the existing secure Razorpay checkout helper, confirms through the saga endpoint, and renders payment, booking, and repair state separately. A refunded booking race is never rendered as confirmed. | This is component and transport proof rather than a deployed third-party checkout journey. |
| Regression verification | Passed | Four focused backend suites passed 16 tests, the focused frontend page suite passed 6 tests, and the complete backend Calendar run passed 106 suites and 852 tests. Backend production and test TypeScript, frontend production and specification TypeScript, focused backend and frontend ESLint, diff whitespace, tenant-index, route, migration, and file-size checks passed for Ticket 24. | Repository-wide gates retain older unrelated migration, module, route-schema, and file-size debt recorded in earlier evidence. |

### Paid appointment commands

- `pnpm -C backend test -- --runInBand src/modules/calendar`: 106 suites and 852 tests passed.
- Focused provider, coordinator, webhook, and Razorpay acceptance: 4 suites and 16 tests passed.
- Focused public paid-booking journey: 1 suite and 6 tests passed.
- `pnpm -C backend typecheck`, `pnpm -C backend typecheck:test`, `pnpm -C frontend type-check`, and `pnpm -C frontend type-check:specs`: passed during the ticket pass.
- Focused Ticket 24 backend and frontend ESLint: passed.
- `pnpm -C backend test:db-specs -- src/modules/calendar/calendar-booking-payment.db.spec.ts`: refused before tests because no approved disposable database and destructive opt in were configured.
- Ticket 24 migration discipline, rollback, chain, tenant-index, sweep-budget, route, and architecture checks passed; only the older repository findings recorded above remain.

## Calendar workflow automation

Implementation recorded on 2026-10-13 for ticket 25. Validation is intentionally deferred while the local server and toolchain are being repaired.

On 2026-10-14, the workflow planner was moved into one tenant transaction for its policy read, rule read, and effect insertion. A new focused regression passed, and targeted lint passed. The prior complete backend Calendar run covered the existing ticket 25 suites but preceded this new test. Real tenant RLS, duplicate delivery, and live notification evidence remain open.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Lifecycle trigger planning | Implemented; validation deferred | The shared outbox consumer maps booking and event creation, change, reschedule, cancellation, no-show, start, end, failure, repair, and source-state changes into versioned rule plans. Stable effect identity prevents duplicate creation while allowing different aggregate versions to be processed out of order. | The new focused suites have not been run in this pass. |
| Execution policy and consent | Implemented; validation deferred | Every pending effect rechecks the current tenant policy, exact policy and rule versions, active recipients, allowed channels, daily limits, notification preferences, quiet hours, and SMS or WhatsApp consent before the notification pipeline delivers it. Dry-run effects remain terminal and send nothing. | Delivery-provider and live channel evidence remains deferred. |
| Retry and repair | Implemented; validation deferred | Effects use optimistic versions, leases, bounded exponential retry, dead-letter state, stable downstream dedupe, version-fenced replay, and explicit suppression reasons. A bounded tenant sweep is exposed through the leased Calendar cron route. | Cron execution and persistence races have not been run in this pass. |
| Operator surface | Implemented; validation deferred | Calendar Settings now manages enablement, dry run, channel and volume limits, rule creation and activation, event-payload previews, recent effect status, error context, and replay. Runtime response contracts reject unknown states and channels. | Browser and responsive layout checks are deferred. |
| Persistence architecture | Implemented; validation deferred | Migration 2011 defines tenant-leading indexes, uniqueness, checks, RLS, grants, journal registration, and rollback for workflow policy, rules, and effects. A guarded database suite covers duplicate producer events, out-of-order aggregate versions, and replay fencing. | Migration and database suites have not been executed in this pass. |

## Scheduling APIs and webhooks

Implementation recorded on 2026-10-13 for ticket 26. Validation is intentionally deferred while the local server and toolchain are being repaired.

On 2026-10-14, API-key booking list and detail reads were moved into tenant transactions bound to the credential organization. A focused service suite passed two tests that reject raw-handle reads, and targeted lint passed. Real RLS and credential replay behavior remain unverified.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Authentication and least privilege | Implemented; validation deferred | Administrators mint one-time, expiring Calendar credentials with documented scopes. The versioned controller is public only to the global JWT guard, then requires API key authentication, exact route scopes, Calendar entitlement, and a per-credential rate budget. Unknown route scope configurations fail closed. | Guard and metadata suites are present but have not been run in this pass. |
| Tenant and write safety | Implemented; validation deferred | Booking reads and lifecycle writes carry credential-derived tenant filters. Creation binds the booking token to the same tenant and checks the requested rule version before acquiring capacity. API key writes use credential-specific idempotency principals, and lifecycle changes require current versions. | Database and concurrent request behavior remains unexecuted in this pass. |
| Webhook delivery contract | Implemented; validation deferred | Calendar lifecycle outbox events fan out through a durable effect ledger into minimized payloads. Each delivery reuses one UUID, dated API version, timestamp, raw body, and HMAC across automatic retries; logs retain the identity and dead-letter state, while operator replay creates a new delivery. | No live subscriber or network retry was exercised. |
| Replay and failure refusal | Implemented; validation deferred | Receiver helpers enforce strict envelopes, header and body agreement, constant-time signatures, bounded clock skew, and an atomic delivery claim. Source cases cover malformed JSON, invalid signature, tampering, stale or future timestamps, duplicate claims, revoked credentials, missing scopes, tenant mismatch, stale versions, and rate refusal. | The focused suites have not been executed during the server outage. |
| Developer and operator surfaces | Implemented; validation deferred | Calendar Settings exposes paginated credential management with one-time secret handling, and webhook setup now lists every published Calendar lifecycle and source event. The developer document covers pagination, scopes, idempotency, errors, retry, replay, deletion, compatibility, and deprecation. | Browser, responsive, accessibility, and generated OpenAPI inspection remain deferred. |
| Persistence architecture | Implemented; validation deferred | Migration 2012 backfills delivery identities and legacy versions, makes both mandatory, adds tenant-scoped replay uniqueness, includes post-checks, is registered in the migration journal, and has a rollback. | Migration apply and rollback have not been run in this pass. |

## Booking analytics and administrative controls

Implementation recorded on 2026-10-13 for ticket 27. Validation is intentionally deferred while the local server and toolchain are being repaired.

On 2026-10-14, unrecognized Calendar source coverage states were changed to count as partial rather than complete. The focused analytics policy suite passed seven tests, including the new unexpected-state case, and targeted lint passed. Live multi-source failure and recovery remain unverified.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Authoritative metric facts | Implemented; validation deferred | A fan-out consumer records minimized lifecycle facts with tenant-scoped producer-event and aggregate-version uniqueness. Booking cohorts start at version 1, latest versions determine period-end state, and late or corrective versions remain visible without consulting mutable projection rows. | The consumer, SQL rollup, and migration have not been executed in this pass. |
| Definitions and source coverage | Implemented; validation deferred | The report exposes organization timezone, effective retention boundary, numerator, denominator, deduplication, correction, deleted-record, and late-event definitions. Source reads publish coverage only on change or a bounded heartbeat; reports separate missing, partial, and failed sources. | Live multi-source failure and recovery have not been exercised. |
| Privacy | Implemented; validation deferred | Facts omit titles, descriptions, attendees, guests, intake, host identities, HR fields, and Finance values. Cohorts below the configurable threshold suppress every numeric metric and the latest booking-event timestamp. | Inference resistance has source tests but no browser or deployed access test in this pass. |
| Enforced governance | Implemented; validation deferred | Tenant policy controls booking availability, domains, link expiry and volume, abuse limits, provider writes, exports, retention, timezone, and privacy. Link revocation and policy changes write transactional audit records; provider workers and public confirmation paths recheck current policy at execution time. Existing workflow policy continues to own automation ceilings. | Provider, export, and public booking runtime paths have not been executed while the server is unavailable. |
| Retention and operator surface | Implemented; validation deferred | Ingestion rejects facts outside retention, reports truncate requested periods visibly, policy reduction deletes expired facts immediately, and a leased tenant sweep performs ongoing deletion. Calendar Settings presents governance, emergency access-link revocation, metric cards, coverage, freshness, privacy state, and methodology. | Scheduled execution, responsive layout, and accessibility validation are deferred. |
| Edge coverage | Implemented; validation deferred | Focused source cases cover late events, stable duplicate identities, out-of-order versions, failed sources, changed routing, deleted-record minimization, and small-cohort suppression. Migration 2013 adds RLS, grants, tenant-leading indexes, policy checks, source-coverage state, rollback, and post-checks. | No test or migration command was run after the user requested that validation pause. |

## Source action proposals and receipts

Implementation recorded on 2026-10-13 for ticket 28. Validation is intentionally deferred while the local server and toolchain are being repaired.

On 2026-10-14, expired confirmation now commits the EXPIRED proposal state before returning a conflict. Step completion also checks the claimed attempt number and running status, so a late result from an older attempt cannot overwrite a newly claimed repair. The focused store suite passed two tests and targeted lint passed. Real database concurrency and source-owner receipts remain unverified.

| Evidence layer | Status | Evidence | Limit |
| --- | --- | --- | --- |
| Reviewable proposal contract | Implemented; validation deferred | Tenant-owned proposals persist the human actor, source identity, expected source version, intended effect, action input, safe impact preview, request hash, idempotency key, expiry, and explicit decision for every step. Previewing creates no source-module mutation. | Route, schema, and persistence execution have not been run in this pass. |
| Source-owner authority | Implemented; validation deferred | Build, CRM, HR interviews, Inventory purchase orders, Finance invoices, and Tasks register owner adapters. Each adapter rechecks current permission, scoped visibility, lifecycle rules, and optimistic source version before applying through its owning module. | Runtime dependency wiring and real permission matrices remain unexecuted during the outage. |
| Per-source receipts | Implemented; validation deferred | Multi-step confirmation releases the proposal transaction before source effects, then persists committed, failed, declined, or uncertain receipts independently. Duplicate confirmation does not execute a claimed proposal again, and timeouts remain explicitly uncertain. | Cross-module owner calls and timeout behavior have source tests but no executed result in this pass. |
| Repair and compensation | Implemented; validation deferred | Retry reauthorizes through the owner. Committed effects can expose compensation, uncertain effects expose retry, manual review, and accept-partial paths, and proposal status never claims atomic rollback across modules. | Compensation and partial-result paths have not been exercised against live source records. |
| Product surface | Implemented; validation deferred | Source-owned calendar items expose a safe preview, explicit confirm or decline, expiry, source receipt, and available repair actions. Calendar projections now carry optimistic versions for Build, Tasks, and HR interviews. | Responsive, accessibility, and browser interaction checks are deferred. |
| Edge coverage | Implemented; validation deferred | Source suites define stale-version, permission-loss, deleted-record, owner-rejection, timeout, retry, duplicate-confirmation, registry uniqueness, repair policy, and guarded database race cases. Migration 2014 adds RLS, grants, actor idempotency, per-step effect identity, attempt uniqueness, indexes, post-checks, journal registration, and rollback. | No test, type, lint, migration, database, server, or browser command was run after validation was paused. |
