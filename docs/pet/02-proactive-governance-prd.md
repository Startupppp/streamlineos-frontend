# CP-02 — Timely prompts, preferences, and governance

**Status:** Proposed requirements, 2026-10-08. **Depends on:** [program decisions](README.md), [CP-00](00-experience-prd.md).
**Outcome:** The pet notices useful moments without becoming another source of noise or inventing facts about attendance, meetings, or wellbeing.

## Prompt classes and eligibility

| Class | Trigger and source of truth | Default | User action |
| --- | --- | --- | --- |
| Upcoming meeting | Existing calendar event reminder for an invited/own attendee, respecting current event time, cancellation, recurrence exception, and calendar notification policy. | Enabled only where the user's existing meeting reminder category is enabled. | Open event, snooze, dismiss, or configure. |
| Missed clock-in | Attendance module enabled; scheduled shift/workday start plus a proposed 15-minute grace; no recorded clock-in; not on approved leave/holiday/off day. | Off until the user enables this pet prompt category. | Open clock-in, snooze, dismiss, or configure. |
| Break suggestion | Proposed 90 minutes of coarse foreground StreamlineOS session time since the last suggestion; suppress during meetings, focus, and quiet hours. Foreground time does not prove continuous work. | Off until the user opts into this category **and** coarse activity timing. | Start break if available, snooze, dismiss, or configure. |
| Friendly check-in | User opted into this category **and** coarse activity timing; eligible foreground session with no recent direct pet interaction and no higher-priority prompt. Proposed maximum once per workday. | **Off.** | Reply, dismiss, snooze, or disable. |

These timing values are product defaults for the PRD. The pilot must validate them with users and administrators before general availability; changing them should not require changing the meaning of attendance or calendar records. A meeting prompt is never a second independent calendar reminder: it is a pet presentation of the existing event's eligible notification, so deduplication and cancellation remain owned by Calendar/Notifications.

## Eligibility and suppression order

1. Organization policy and module/AI availability. An organization may disable the companion or a prompt category. Existing calendar reminders continue through their normal channels if only the pet is disabled.
2. User master switch, category setting, notification channel/category setting, and snooze. A disabled category creates no visible or audible pet prompt; disabling friendly check-ins does not disable meeting reminders.
3. Current organization, membership, target record access, and fresh event/attendance state. Recheck these at delivery, not only at scheduling. Revoked access or a cancelled/rescheduled event suppresses stale prompts.
4. Quiet hours, timezone, weekends, focus/DND, active meeting, full-screen/presentation mode, and another open modal or critical task. Timezone is the effective user/organization timezone used by owning modules. Never bypass DND for friendly or break messages.
5. Frequency cap and priority: imminent meeting before clock-in before break before friendly check-in. Show at most one pet bubble at a time; queue eligible lower-priority items in an activity area if still relevant, otherwise expire them. No prompt storm on login after time away.

The pet may use only coarse **foreground session duration** after an individual opt-in. Record visibility/focus transitions and bounded duration totals, not keystrokes, clicks, screen contents, unrelated tabs, or continuous user presence. The user can revoke the opt-in independently of reminder category settings; revocation stops new timing and clears short-lived activity state. It must not infer health status or make managerial productivity claims. No individual duration report is exposed to administrators. “You have been working for so long” is replaced with wording such as “StreamlineOS has been open for a while. Want a break?” “You forgot to clock in” is shown only after the attendance eligibility checks and phrased as “No clock-in is recorded for your scheduled day.”

## Delivery, deduplication, and activity history

- A prompt is an event with actor/organization, category, source event reference, eligibility timestamp, expiry, delivery state, reason code, and dedupe key. Meeting prompts reuse the calendar event/occurrence/attendee identity; other prompts use a user/category/day or work-session key as appropriate.
- Server-side eligibility and deduplication make two tabs/devices display at most one actionable prompt for the same event. Client-side BroadcastChannel or local state can improve presentation but is not the authority.
- The pet displays an event only while the authenticated user is present in the right organization. Existing notification channels may deliver in the background according to their own policies; a closed browser does not create a new pet-chat message.
- The activity view shows recent prompt reason, source, time, outcome, and actions, with a route to settings. Dismissed and snoozed prompts remain inspectable without becoming conversation history. Retention follows the platform's notification/audit policy; no indefinite new personal activity log.
- Missing source data, stale calendars, undetermined leave/holiday state, or a delivery failure suppresses the prompt and records an operational reason. It never guesses or says the user missed an obligation.

## Controls and administration

Users can switch the companion on/off, configure each prompt class, set snooze (one hour, rest of day, or until manually resumed), choose quiet hours through existing notification settings, and inspect why a specific prompt appeared. A global “Pause all pet prompts” control does not turn off the underlying product notifications or AI chat. Friendly check-ins have a direct one-click disable affordance.

The settings view shows a separate effective switch for meeting, clock-in, break, and friendly prompts; the source module and any organization lock; the last delivery or suppression reason; and a route to the platform's existing notification quiet-hours settings. It does not create a competing quiet-hours clock. The activity view filters by category and outcome, and each entry shows event time, source, reason, delivered/dismissed/snoozed/expired state, and an access-checked destination.

Admins may disable AI chat/actions, a prompt class, appearance presets, or pet presentation for their organization, and set stricter frequency caps. Admins see policy and aggregate delivery/error metrics, not individual friendly conversations or private content by default. Capability policy intersects with each user's RBAC and module entitlement; it does not grant permission. Policy changes apply to queued prompts before delivery.

No employer-facing productivity score, employee surveillance view, automatic disciplinary inference, or wellness diagnosis is derived from pet events. Notification text shown outside the app is privacy-safe and links to an authenticated detail view.

## Failure and edge cases

- A rescheduled or cancelled recurring event invalidates the old prompt. A new occurrence can produce one new eligible reminder.
- An approved leave, holiday, flexible schedule, or unconfigured shift suppresses missed-clock-in prompting. A late clock-in before display cancels the prompt.
- Break prompts reset on a user-recorded break, are suppressed during meetings, and do not repeat after dismiss until the next eligible window; cap at two per workday by default.
- A prompt arriving during a confirmation card, form submission, accessibility announcement, or active composition waits. Expiry prevents an outdated prompt from appearing later.
- Timezone changes and daylight-saving transitions are evaluated by the owning module's effective local date, not by a browser-only clock. Offline devices reconcile against server state on reconnect without replay storms.
- If the user disables a category on another device, any queued prompt for it is cancelled before display. Organization switch clears prior organization's prompt state immediately.

## Acceptance scenarios

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CP-02-A01 | One meeting is due with two tabs and a mobile session open. | One actionable pet reminder per attendee/occurrence, with correct event link and no duplicated source notification. |
| CP-02-A02 | Event is cancelled, rescheduled, recurring, or attendee loses access. | Old prompt disappears; only a newly eligible occurrence can remind. |
| CP-02-A03 | User is on leave, holiday, off day, unconfigured shift, or already clocked in. | No missed-clock-in prompt and no “forgot” claim. |
| CP-02-A04 | User works through the proposed break threshold, then dismisses or starts a break. | Prompt respects cap/reset and never claims continuous work or diagnoses health. |
| CP-02-A05 | Friendly check-ins remain at default or are disabled from a bubble. | None display until opt-in; disabling takes effect across devices. |
| CP-02-A06 | Quiet hours, focus/DND, active meeting, full-screen, or modal is present. | Nonurgent prompt is suppressed or deferred; primary work is never obscured. |
| CP-02-A07 | Admin disables a class or AI while a prompt is queued. | Delivery rechecks policy, suppresses it, and records reason without exposing content. |
| CP-02-A08 | Notification data is stale, worker retries, or a device reconnects. | No duplicate or fabricated prompt; failure is observable operationally. |
| CP-02-A09 | User inspects a displayed prompt. | Reason, source, time, and available controls are understandable and access checked. |
| CP-02-A10 | User opts into coarse timing, leaves the tab hidden, then revokes consent on another device. | Hidden time is not counted; no granular input data is retained; consent revocation stops future timing and break/friendly prompts across devices. |

## Sign-off evidence

Verify scheduler and outbox behavior with a non-owner database role; test exact per-user/tenant keys, recurrence, timezone, cancellation, preferences, and retries. Complete a browser journey for each prompt class and suppressed state, plus cross-device deduplication and notification delivery in a named nonproduction environment. Record any unavailable source as `CURRENT UNVERIFIED`; no source or unit test alone closes delivery.
