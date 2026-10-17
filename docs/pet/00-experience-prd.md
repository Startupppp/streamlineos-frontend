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

1. **Discover and open.** A compact pet occupies a movable position on desktop and a smaller footprint above mobile navigation. Its accessible name identifies the companion. Click, Enter, or Space opens the existing conversational workspace with focus on the composer. Closing minimizes the chat while preserving history and the unsent draft. Pointer drag or Alt+arrow keys move the pet within the viewport; position is saved separately for desktop and mobile and bounded away from the top navigation and mobile bottom navigation. A visible Minimize control collapses the pet to a small restore button. The mobile chat is a short bottom sheet rather than a full-screen overlay.
2. **Ask or request work while in context.** The composer accepts any natural-language question or action request, including cross-module requests; it is not limited to the current page. The panel shows the current module and selected record as optional context. The user can remove that context before sending. A request such as “What happened to this bug?” can use the visible record only after server-side object access is checked. Navigating away does not silently change an already submitted request. If a request cannot be executed through an approved available capability, the pet explains why and gives an authorized next step.
   An ambiguous count question such as “How many open bugs do we have?” opens a scope choice even on a project page; a project-specific request can use the visible project after access validation.
3. **Review a suggestion.** The pet can display a concise prompt with its reason and one primary action. Selecting it opens the relevant page or prefilled conversation. Dismiss and snooze are adjacent controls; a prompt never captures focus or covers a form submit button.
4. **Personalize or disable.** Settings expose name, approved appearance preset, tone, animation level, reminder categories, friendly check-ins, snooze, and a master “Hide companion” switch. Users place the pet by dragging it or with Alt+arrow keys; there is no separate Position selector. Hiding the pet retains the normal assistant access path and chat history unless organization AI is disabled.
5. **Continue across sessions.** Conversation list, messages, proposals, and confirmed results remain associated with the signed-in user and organization. A cosmetic change or pet rename never forks the history.
6. **Talk by choice.** The pet microphone keeps chat closed and opens a compact status card with Listening, Thinking, Working on it, Speaking, connection, and error states. It never displays a live transcript or repeats user/assistant words; the privacy and confirmation explanation is available through an Info button. Capture starts only after activation. The live session uses a short-lived token, WebRTC, automatic speech turns and spoken replies; workspace questions and actions pass through the existing permission-scoped Ask OS flow, and changes still require confirmation in chat. End, tab hide, organization switch, and unmount stop the session. The separate chat-composer microphone retains a short-audio transcription path that produces an editable draft and is never auto-sent. Denied or unavailable microphone and provider errors retain the text path.

## Surface contract

| Surface | Required behavior and states |
| --- | --- |
| Desktop launcher | Original StreamlineOS character at a bounded movable position; default lower corner and visible minimize/restore control. Pointer and keyboard placement are saved per organization in local browser storage. An existing server anchor remains a fallback for users who set it before the Position selector was removed; no new anchor choice is written by this settings page. Hide behind modal dialogs, full-screen editors, and other blocking overlays. |
| Open panel | Current chat, conversation history, composer, context chip, suggestions, pending confirmations, settings entry, and clear loading/error/empty states. No model result is represented solely by an animation. |
| Mobile | Smaller movable pet above bottom navigation, with chat and voice controls plus minimize/restore. One short bottom-sheet conversation with safe-area padding; no duplicate Companion item in quick actions while the pet is visible. |
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

The desktop panel must fit beside ordinary page work at supported widths and may expand to a larger focused view. On mobile, minimizing the sheet returns to the compact pet without losing the draft. Existing navigation and command-palette destinations remain reachable. The panel may suggest one to three relevant next actions after a request, but options are grounded in currently available tools and never imply that a denied action is available.

## Character and motion

The asset is one original StreamlineOS character with curated appearance presets, not a selection of separate pets. Create a compact robot/creature with a readable silhouette and expressive face, inspired by the *size and emotional clarity* of the supplied reference rather than its exact pixels or distinctive design. Provide light/dark and high-contrast variants. States: idle, attention, listening/input, thinking/loading, action-ready, success, recoverable error, reminder, and sleeping/quiet. Each state has a static fallback. Motion must be short, non-flashing, and paused when the page is hidden; decorative loops stop under reduced motion or the user's animation-off setting. The pet never conveys success until the owning action reports success.

## Preference and interaction rules

- Default: visible on desktop; subtle idle animation; text replies; no auto-speech; friendly check-ins disabled. A new user can opt out at first encounter without opening settings.
- Tone controls wording only. It cannot change data, permissions, confirmation policy, reminder eligibility, or the model's tool access.
- Appearance presets are curated and can be restricted by an admin. No uploaded executable animation or remote asset URL in this release.
- The pet may be dragged within viewport bounds. Saved placement is separate for desktop and mobile, and the top navigation and mobile bottom navigation remain clear. Alt+arrow keys provide equivalent placement, and minimize/restore is keyboard accessible. Dragging must not trigger chat opening.
- When the pet is visible, Alt+Shift+C toggles chat, Alt+Shift+V starts or ends live voice, and Alt+Shift+M minimizes or restores the pet. The existing global ? shortcut opens the shortcut help dialog, which lists the companion commands. Companion shortcuts do not run while typing, composing text, or using an open modal or select menu. Voice still needs an explicit key press or click and follows the same permission flow as the microphone button.
- Repeated clicks while a turn is running reopen the same panel and turn; they do not submit a duplicate message or action.
- When a prompt and an active conversation compete, the panel remains stable. The prompt is queued or placed in a nonblocking activity area.
- On logout or organization switch, clear in-memory conversation/context and load only the newly authorized organization's state. Local cosmetic preferences may persist only in the authenticated, scoped preference store.
- On the first visit, introduce the pet with “Ask”, “Customize”, and “Hide” choices. Do not block the user behind onboarding, require naming the pet, or start friendly conversation.
- Voice activation is always a direct user action. Live audio is sent to OpenAI through the short-lived Realtime session while active; StreamlineOS does not persist the audio. The pet shows task state only, never user or assistant transcripts. Dismissing the card, hiding the tab, logging out, or switching organization ends the session. The chat-composer short recording remains limited to 30 seconds and 4 MiB, yields an editable draft, and never clears typed text on error.

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
| CP-00-A02 | Mobile user opens the compact pet at narrow width and with keyboard visible. | Short sheet and composer remain usable; pet stays clear of bottom navigation and can be minimized or moved. |
| CP-00-A03 | User enables reduced motion or animation-off during an active turn. | Motion stops immediately; text state remains accurate. |
| CP-00-A04 | User changes name, tone, and preset, then signs in on another device. | Saved effective settings load in the same organization. Dragged pet placement is remembered in the browser separately for desktop and mobile and does not follow the user to another device. |
| CP-00-A05 | User hides the pet, switches organizations, or loses AI access. | No stale content or controls from the prior scope; re-enable path is clear where permitted. |
| CP-00-A06 | Pet assets fail to load. | Static accessible launcher, chat, and actions continue to work. |
| CP-00-A07 | Dialog, full-screen editor, and page bottom action coexist with pet. | No blocked controls or focus trap; prompt waits or relocates. |
| CP-00-A08 | User starts a live voice conversation from the pet. | Permission begins only after activation; the compact card shows Listening/Thinking/Working/Speaking without either party's words; Info explains audio processing; stop/error/unsupported states preserve the text path. |
| CP-00-A09 | User asks a workspace question or prepares an action by voice, then stops the session. | Spoken reply follows the scoped tool result; changes require chat confirmation; no directive/token content is spoken; end/close/unmount stops audio and microphone tracks. |
| CP-00-A10 | User chooses a voice in the pet dock and speaks in another language. | The voice picker uses the shared shadcn Select, retains the choice for this browser and organization, and applies it to the next live session. There is no language picker: the companion answers in the language of the latest user utterance, including after a tool result. A workspace operation receives a short spoken working acknowledgement in that language. Actual multilingual speech and timing require provider and browser verification. |

## Out of first release

Background listening, stored audio, cross-device voice preference sync, pet marketplace, user-supplied pet code or animation, multiple specialist pets, and autonomous social conversation.
