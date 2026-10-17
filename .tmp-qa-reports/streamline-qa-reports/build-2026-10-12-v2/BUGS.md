# Build module QA — build-2026-10-12-v2 — BUGS

Owner: qaown1012b@sharklasers.com | Member: qamem1012c@sharklasers.com | Org: QA Build Org 1012b | Site: https://www.streamlineos.in
Evidence: text only (URLs, steps, HTTP/console status, exact messages). Full step log in RUNLOG.md. No screenshots.
Status key: OPEN = reproduced in this run; REPRO-PENDING = observed once, needs a clean repro; NOT RETESTED = not re-run in this run; FIXED = verified fixed this run.

## Open bugs by severity

### High
**BUG-04 — Duplicate project key returns 409 on Create; wizard resets to Step 1** — OPEN (reconfirmed)
- URL: https://www.streamlineos.in/build/projects (New Project wizard)
- Steps: 1) Project "QA Project Alpha", key QAB, complete wizard, Create Project -> created (/build/7). 2) New Project: name "QA Project Beta", key "QAB", Next through steps 2–6, Review, Create Project.
- Expected: blocked before submit with the duplicate-key message on the Key field, or a clear error toast; wizard stays on the review step with values kept.
- Actual: console "Failed to load resource: the server responded with a status of 409 () @ https://api.streamlineos.in/build:0". Wizard jumps to Step 1 "Basics" with inline "A project with key "QAB" already exists in this organization." Values kept, but the user must go back through the wizard; no toast.
- Note: the inline message is new relative to the earlier run; the 409 on submit is still there.

### Medium
**BUG-06 — Story points out of range: inline error shown but ticket still created; value saved as 0** — OPEN (reconfirmed, worse than before)
- URL: https://www.streamlineos.in/build/7/issues -> Create Issue
- Steps: 1) Title "x", Story points 1000000000 (or -5). Observe inline "Enter a whole number between 0 and 100". 2) Click "Create issue".
- Expected: blocked; or the value is rejected with a clear message and nothing is saved.
- Actual: the dialog closed and ticket QAB-1 was created. On the ticket detail, Points spinbutton shows "0". On the ticket detail page, entering -5 and tabbing out left the field showing -5, but after reload Points = 0.
- Evidence: RUNLOG items 23–26.

**NEW-13 — Comment Edit then Escape changes the saved comment body (needs clean repro)** — REPRO-PENDING
- URL: https://www.streamlineos.in/build/7/tickets/QAB-1, Activity
- Steps: 1) Post comment `<svg onload=alert(1)> **bold** _it_ [x](javascript:alert(1))`. Renders bold/italic and shows "<svg onload=alert(1)>" as text. 2) Click the comment's "Edit comment" icon, then press Escape. 3) Reload.
- Expected: comment unchanged (or Edit canceled with no save).
- Actual: after reload the body shows `**bold** _it_ [x](javascript:alert(1))` as plain text — leading `<svg ...>` text gone and markdown no longer rendered. Unclear whether an explicit save fired.
- Also check: the editor path must not inject raw HTML (no alert observed in this run, but not verified with a dialog listener).

**NEW-07 — Attach of a disallowed .exe on ticket comment gives a generic error** — OPEN (reconfirmed)
- URL: https://www.streamlineos.in/build/7/tickets/QAB-1, Activity > Attach files to ticket, file /workspace/streamline-qa/fixtures/qa-test.exe
- Expected: "qa-test.exe is not an allowed file type." (as in the create dialog)
- Actual: toast "Failed to attach qa-test.exe. Try again."; console "Failed to load resource: ... status of 400 () @ https://api.streamlineos.in/build/7/files:0". File not attached (correct), but the message is misleading.

**NEW-16 — Invited member is not placed in the inviting org (acceptance path)** — REPRO-PENDING (blocked test)
- Steps: 1) Owner invites qamem1012c@sharklasers.com (Build Member) -> "Invitation sent!". 2) Member signs in via /signin with OTP -> lands on /org-setup "Welcome, qamem1012c / Launch your organization". 3) Opened the invite link from the email https://www.streamlineos.in/invitation/<token> while signed in as member -> navigated to /org-setup.
- Expected: invite accepted; member sees "QA Build Org 1012b" dashboard; or invite page shows Accept button.
- Actual: no accept step; member lands on org creation. Member could not be tested for permissions.

### Low
**NEW-06 — Title limit differs: 200 in create dialog, 500 on ticket detail** — NOT RETESTED this run (last run: OPEN)
**BUG-09 — Uncommitted title/description edits lost on reload; no unsaved-changes warning** — NOT RETESTED this run (last run: OPEN)
**NEW-04 — New project not in list until reload** — NOT REPRODUCED this run (after Create the app navigated to the project; list showed the new row on return). Keep as needs-repro.
**NEW-08 — AI companion covers wizard Next and due-date controls** — OBSERVED (Next needed retries in the project wizard; no error text captured). Keep as needs-repro.
**NEW-09 — Ticket Points edit did not persist** — NOT REPRODUCED this run: typed 8 + Tab, reload -> Points 8 and History "estimate changed 8". (-5 is coerced to 0; see BUG-06.) Status: CLOSED for valid values.
**NEW-11 — Project Key silently rewritten and stale error kept** — OPEN (new, Low): typing "qa-1!" in Project Key -> field shows "QA1" with no note; the error "Key must contain only uppercase letters (A–Z) and numbers" stays visible though the key is valid.
**NEW-05 — Board/Create: empty title gives no message** — OPEN (Low): Create issue with empty title: no visible error and no request (verified no ticket created).
**NEW-10 — Org name shows "Organization" in the Build header switcher** — OBSERVED (Low): on /build/projects the switcher read "Organization" while /dashboard showed "QA Build Org 1012b".
**NEW-14 — Console 404s: /build/2 and /settings/members** — OPEN (Low): Projects page requests https://api.streamlineos.in/build/2 (404) (stale project id); https://www.streamlineos.in/settings/members returns HTTP 404 (sidebar route is /settings/users).
**NEW-15 — Feedback widget config 404 on every page** — OPEN (Low): https://api.streamlineos.in/public/feedbucket/fb_.../config returns 404 on each page load.

## Verified fixed / passing this run
- Org setup inline validation ("Enter a workspace name.", "Select a team size.", "Select an industry.").
- Invite email validation ("Enter a valid email address") and invite sent ("Invitation sent!").
- Create Issue title limit 200 enforced inline ("Title must be 200 characters or fewer"), no request sent.
- Comment markdown: bold/italic render; javascript: link href stripped.
- XSS payload `"><img src=x onerror=alert(1)> XSS-title` stored and shown as literal text (ticket heading, board card, Edit title); no image element created.
- Signed-out access to /build/7/issues redirects to /signin?callbackUrl=%2Fbuild%2F7%2Fissues.
- BUG-08 (exe on comment path): blocked (400), file not attached.
- BUG-05 (duplicate create on double submit) not re-tested in this run.

## Not tested this run (see COVERAGE.md)
Permissions as member, sprints/backlog, filters/sort, pagination, archive/delete, most ticket fields, board drag (tool could not move the card), concurrency.

## Session C4–C5 additions (2026-10-12 ~14:10 IST)
- BUG-09 (Low/Med) STILL OPEN: unsaved title edit on QAB-2 lost on reload, no beforeunload warning.
- NEW-06 (Low) STILL OPEN: detail title maxlength=500 (300 chars saved) vs Create dialog 200. QAB-2 title left as 300x "N".
- NEW-23 (Medium, unverified): Todo column count changes across reloads with no data change (67/76/66/75).
- NEW-24 (Low, a11y/UX): mouse drag-and-drop on board did not move cards; keyboard drag (handle + Space/Arrows) works and persists.
- Priority=Urgent filter applied (Todo 20); filter chip and persistence after reload not verified.
