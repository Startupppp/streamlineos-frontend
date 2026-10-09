# CP-00 — Companion pet experience and personalization

**Status:** Proposed requirements, 2026-10-08. **Depends on:** [program decisions](README.md).
**Outcome:** One approachable pet makes the existing assistant easier to use without obscuring the work surface or forcing conversation.

## Users and jobs

The first-release audience is every signed-in organization member across the three organization standings and applicable module standings and template-derived role records. The pet's capabilities come from effective grants and enabled modules, never the displayed role name. External client-portal guests are outside this release.

| User | Job | Success |
| --- | --- | --- |
| Individual contributor | Ask a work question or request a task across accessible modules. | Correct, scoped answer or confirmed action without hunting through navigation. |
| Manager | Understand a team's accessible work and upcoming events. | Scope and filters are explicit; no private or inaccessible data leaks. |
| User in focused work | Continue work uninterrupted. | Pet stays quiet, honors focus and quiet hours, and offers snooze/disable. |
| Organization admin | Govern AI and prompts. | Allowed capabilities and defaults are visible; users cannot override organization prohibitions. |
| Keyboard/screen-reader/reduced-motion user | Access every pet function. | Equivalent controls and information without animation, hover, drag, or sound. |

## First-release journeys

1. **Discover and open.** On desktop, a small pet occupies a safe corner outside primary controls. Its accessible name identifies the companion. Click, Enter, or Space opens the existing conversational workspace with focus on the composer. Closing returns focus to the launcher. On mobile, the existing quick-action entry offers a compact Companion item; the animated character appears in the opened panel, not over content.
2. **Ask or request work while in context.** The composer accepts any natural-language question or action request, including cross-module requests; it is not limited to the current page. The panel shows the current module and selected record as optional context. The user can remove that context before sending. A request such as “What happened to this bug?” can use the visible record only after server-side object access is checked. Navigating away does not silently change an already submitted request. If a request cannot be executed through an approved available capability, the pet explains why and gives an authorized next step.
   An ambiguous count question such as “How many open bugs do we have?” opens a scope choice even on a project page; a project-specific request can use the visible project after access validation.
3. **Review a suggestion.** The pet can display a concise prompt with its reason and one primary action. Selecting it opens the relevant page or prefilled conversation. Dismiss and snooze are adjacent controls; a prompt never captures focus or covers a form submit button.
4. **Personalize or disable.** Settings expose name, approved appearance preset, tone, animation level, placement, reminder categories, friendly check-ins, snooze, and a master “Hide companion” switch. Hiding the pet retains the normal assistant access path and chat history unless organization AI is disabled.
5. **Continue across sessions.** Conversation list, messages, proposals, and confirmed results remain associated with the signed-in user and organization. A cosmetic change or pet rename never forks the history.
6. **Talk by choice.** The dock microphone keeps the chat panel closed and shows a compact listening card directly above the pet, with status, caption, finish, dismiss, retry, and review controls as appropriate. The composer microphone may use the same capture path inside chat. Capture starts only after activation. A short recording is sent to the authenticated StreamlineOS transcription endpoint, which returns text; the recording is never retained by StreamlineOS. Final words enter an editable draft and are never auto-sent. The user can stop or cancel without losing typed text. Completed assistant replies expose user-triggered read-aloud where speech synthesis is available. Denied or unavailable microphone and transcription errors retain the full text path.

## Surface contract

| Surface | Required behavior and states |
| --- | --- |
| Desktop launcher | Original StreamlineOS character at lower corner; resting footprint small enough not to cover primary page actions. Position can be changed among approved safe anchors and is restored per user. Hide behind modal dialogs, full-screen editors, and other blocking overlays. |
| Open panel | Current chat, conversation history, composer, context chip, suggestions, pending confirmations, settings entry, and clear loading/error/empty states. No model result is represented solely by an animation. |
| Mobile | One compact entry in mobile quick actions; full-height or sheet conversation using the existing mobile shell. No persistent floating pet over the content area. |
| Prompt bubble | Short message, source/reason, action, dismiss, snooze; never a raw private ticket title or HR detail on a shared-screen notification preview. |
| Preferences | User choices, organization-locked settings, effective values, and a test-preview for each animation and prompt category. Changes persist across devices and are scoped to user plus organization. |
| Disabled/unavailable | If user hides the pet, show a stable route to re-enable it. If AI is unavailable, show reason and retry/support path without an empty chat. If organization disables AI, no chat or action control claims it can run. |

### Panel components and state ownership

| Component | Required fields/controls | Empty, loading, and error behavior |
| --- | --- | --- |
| Header | Pet name and state, current organization, close/minimize, settings, conversation switcher. | Organization switch clears the prior transcript before new data loads. |
| Context chip | Module, project or record reference, remove-context control. | Hidden when no safe context is available; an inaccessible or stale record is removed with a brief explanation. |
| Conversation list | Title, last activity time, search, rename/delete where existing Ask OS permits, active selection. | Separate no-conversations, no-search-results, loading, and failed-load/retry states. |
| Message area | User/assistant messages, source cards, bounded work previews, action cards, timestamps, retry and jump-to-latest. | Preserve prior messages on background refresh; distinguish streamed text, stopped turn, failed turn, and no-history state. |
| Composer | Open text entry, explicit voice-input control, visible listening/processing state, editable transcript, send/stop, character limit and validation, suggested questions/options based on available capabilities and optional page context. | Disabled with reason when AI/credits/policy are unavailable; unsent draft is retained when the panel closes. Unsupported/denied voice explains the limitation without disabling text. |
| Action card | Target, proposed before/after values, consequences/recipient, expiry, confirm, decline, pending, success, conflict, and receipt link. | Expired or executed history cannot be reconfirmed; failed execution never appears successful. |
| Prompt/activity area | Prompt text, reason/source, time, primary action, dismiss, snooze, category settings; recent outcomes. | No eligible prompts is quiet, not a blank alert; delivery failures do not become conversational claims. |

The desktop panel must fit beside ordinary page work at supported widths and may expand to a larger focused view. The mobile quick-action menu labels its entry “Companion”; it does not add a second floating assistant button. Existing navigation and command-palette destinations remain reachable. The panel may suggest one to three relevant next actions after a request, but options are grounded in currently available tools and never imply that a denied action is available.

## Character and motion

The asset is one original StreamlineOS character with curated appearance presets, not a selection of separate pets. Create a compact robot/creature with a readable silhouette and expressive face, inspired by the *size and emotional clarity* of the supplied reference rather than its exact pixels or distinctive design. Provide light/dark and high-contrast variants. States: idle, attention, listening/input, thinking/loading, action-ready, success, recoverable error, reminder, and sleeping/quiet. Each state has a static fallback. Motion must be short, non-flashing, and paused when the page is hidden; decorative loops stop under reduced motion or the user's animation-off setting. The pet never conveys success until the owning action reports success.

## Preference and interaction rules

- Default: visible on desktop; subtle idle animation; text replies; no auto-speech; friendly check-ins disabled. A new user can opt out at first encounter without opening settings.
- Tone controls wording only. It cannot change data, permissions, confirmation policy, reminder eligibility, or the model's tool access.
- Appearance presets are curated and can be restricted by an admin. No uploaded executable animation or remote asset URL in this release.
- The pet may be moved only to safe anchors, not arbitrary coordinates that can obscure work. An obscured launcher must be recoverable from settings and keyboard navigation.
- Repeated clicks while a turn is running reopen the same panel and turn; they do not submit a duplicate message or action.
- When a prompt and an active conversation compete, the panel remains stable. The prompt is queued or placed in a nonblocking activity area.
- On logout or organization switch, clear in-memory conversation/context and load only the newly authorized organization's state. Local cosmetic preferences may persist only in the authenticated, scoped preference store.
- On the first visit, introduce the pet with “Ask”, “Customize”, and “Hide” choices. Do not block the user behind onboarding, require naming the pet, or start friendly conversation.
- Voice activation is always a direct user action. Audio exists transiently in browser memory and in the authenticated transcription request; StreamlineOS does not persist it. Recordings are limited to 30 seconds and 4 MiB. Starting listening stops local reply playback to avoid feedback. Dismissing the compact card, hiding the tab, submitting, logging out, or switching organization ends the active voice session. A browser recognition fallback may be used if recording APIs are unavailable. Browser/provider errors never clear typed text.

## Accessibility and quality requirements

- Keyboard and screen-reader users can open/close the panel, reach every action, read prompt reasons, operate confirmation cards, change settings, and dismiss/snooze without pointer gestures.
- Focus remains predictable across dialog, panel, and page transitions. Announce only meaningful reply completion or actionable prompts; idle motion is `aria-hidden`.
- Honor `prefers-reduced-motion` on first paint and respond when it changes. No essential information depends on color, sound, movement, or hover.
- On small viewports, zoom, and virtual keyboard, the pet and panel do not obscure the composer, navigation, or primary page action. Reserve safe areas.
- Lazy-load visual and conversational code; never make pet animation a dependency for the base shell to render. Provide a static launcher if assets fail.

## Acceptance scenarios

| ID | Scenario | Pass condition |
| --- | --- | --- |
| CP-00-A01 | Desktop user opens, closes, and reopens by mouse and keyboard. | Same conversation, correct focus return, no lost draft. |
| CP-00-A02 | Mobile user opens Companion from quick actions at narrow width and with keyboard visible. | Panel and composer remain usable; no overlay collision. |
| CP-00-A03 | User enables reduced motion or animation-off during an active turn. | Motion stops immediately; text state remains accurate. |
| CP-00-A04 | User changes name, tone, preset, and anchor, then signs in on another device. | Saved effective settings load in the same organization. |
| CP-00-A05 | User hides the pet, switches organizations, or loses AI access. | No stale content or controls from the prior scope; re-enable path is clear where permitted. |
| CP-00-A06 | Pet assets fail to load. | Static accessible launcher, chat, and actions continue to work. |
| CP-00-A07 | Dialog, full-screen editor, and page bottom action coexist with pet. | No blocked controls or focus trap; prompt waits or relocates. |
| CP-00-A08 | User starts voice input, reviews the transcript, edits it, and sends. | Permission begins only after activation; listening/processing is visible; transcript is not auto-sent; stop/error/unsupported states preserve typed input. |
| CP-00-A09 | User asks to read a completed response aloud and stops it. | Only visible assistant prose is spoken after activation; no directive/token content or automatic playback; close/unmount stops speech. |

## Out of first release

Background listening, stored audio, automatic spoken replies, remembered voice selection, pet marketplace, user-supplied pet code or animation, multiple specialist pets, autonomous social conversation, and a mobile floating character.
