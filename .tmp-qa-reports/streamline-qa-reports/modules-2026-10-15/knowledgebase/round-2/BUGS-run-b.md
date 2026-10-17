# Knowledge Base — Round 2 bugs, run B (QA1015R2)

Written by a second Grok Bot run (run B) on the same account, org "ADitay CAhala", Thu 2026-10-15 ~17:45–18:05 IST.
**Collision warning:** another run (run A) writes to ../round-2/BUGS.md, and both runs drove the same browser tab. Run B stopped
driving the tab at ~18:05 IST to avoid corrupting run A's data. Run B's IDs KB-B-029..035 may collide with run A's numbering
(run A's BUGS.md already uses KB-B-030..032 for the same three titles as below). The parent should merge by title.

Status legend: FIXED / STILL OPEN / PARTIAL / PASS / NOT RECHECKED (reason).

## 1. Recheck of round-1 bugs (run B evidence only)

| ID | Title (short) | Run B status | Evidence |
|----|---------------|--------------|----------|
| KB-B-001 | Space create fails with empty Icon (`icon: … received null`) | PARTIAL | Name-only (Icon AND Description empty), Internal → toast `description: Invalid input: expected string, received null; icon: Invalid input: expected string, received null`; sheet stays open; nothing saved. Name + Description with Icon empty was reported as created by run A (not re-run by run B). Still blocks the name-only flow. |
| KB-B-002 | Space create shows "server sent data this screen does not understand" though saved | STILL OPEN (run B) / conflicting | Run B: Name "QA1015R2 Space A", Description filled, Icon 📚, Internal → red toast "The server sent data this screen does not understand…", sheet stayed open; reload showed exactly one "QA1015R2 Space A" (saved, no duplicate). Run A saw a clean close for a later create. Behaviour differs between creates; treat as intermittent until re-verified. |
| KB-B-003 | "New page" inside a space creates the article outside that space | PARTIAL | Space detail (/spaces/4) → header "New page" → /doc/6. Breadcrumb stays "Wiki › <title>" (no space). Sidebar lists the page at root. The page is attached to the space only after the first save: Page settings → Space shows the space; space card goes from "0 pages" to "1 page". Before that, the space detail showed "No pages in this space yet". |
| KB-B-004 | Page Owner blank in Page info | STILL OPEN | doc/6 (after publish) → Page settings → Owner "Select owner…" while header says "Updated … by adityachalla01". |
| KB-B-005 | Slash menu swallows typing | STILL OPEN | doc/6: "/" opens the block menu; typed "heading 2" and "bullet" do not filter or insert; the "/" stays in the body and the menu stays open. Clicking "Bullet List" converts the line to a bullet and the next typed text is lost. |
| KB-B-006 | Duplicate image upload: failure toast though image inserted | STILL OPEN | Two `setInputFiles` of valid-image-0913.png in a row → toast "Upload failed: valid-image-0913.png — A matching request is already in progress; retry shortly". Exactly one image ends up in the body (dedupe works; the error toast is still wrong). |
| KB-B-007 | Rejected .exe gives no feedback | PARTIAL | qa-test.exe via the File picker → red toast "Upload failed: qa-test.exe — Unsupported file type: application/x-msdownload". Nothing inserted. Feedback now exists but shows a raw MIME type and no allowed-list (see KB-B-033). |
| KB-B-008 | Inserted image renders huge (~662 px) | STILL OPEN | 64×64 valid-image-0913.png inserted → `main img` 662×662 px (`/api/media/image?key=…`). No resize control seen. |
| KB-B-009 | Version history records one version | STILL OPEN | /knowledge/wiki/doc/6/history → "VERSIONS (1) · Version 1 · Current · adityachalla01 · 6m ago" after ~8 saves, a title change, Publish, and four visibility changes. Restore cannot be exercised (BLOCKED: only one version). |
| KB-B-010 | Share dialog "Private" vs header "Team" | STILL OPEN | doc/6 header badge "Public" (after Publish) while the Share dialog opens with "Private — Only you" aria-active. Reproduced on two opens. (Run A reported FIXED for a different page state; the mismatch reproduces here once the page is Public.) |
| KB-B-011 | Public link anonymous + revoke | PASS (re-verified) | After Publish, anonymous HTTP request → 200 with the page title. After switching to Private → 404. Token not recorded. |
| KB-B-015 | Space rename does not persist | PARTIAL | Edit sheet opens with blank fields (new KB-B-029). Typing all three fields and Save → PATCH persisted (after reload the new name and "Updated just now"), but the red "server sent data…" toast appears and the sheet stays open. |
| KB-B-016 | Archived space Restore has no effect | FIXED | Archive (confirm dialog) → Archived filter lists it → Restore (confirm "Restore space?") → after reload it is in Active. No success toast appears (see UX-run-b.md). |
| KB-B-021 | Share dialog stale after Public → Private | PARTIAL | Toast "Visibility updated" and the server revoke work (anonymous 404 after). The header badge changes to Private about 1–2 s after the toast, not at once. The dialog does not reliably show the active option (KB-B-010 / KB-B-031). |
| KB-B-026 | Space create with empty Description fails | STILL OPEN | Name-only attempt → toast `description: … received null`; sheet stays open. |
| KB-B-017 | 5–15 s skeletons on open | STILL OPEN (observed) | Spaces list, space detail hierarchy ("Loading results…"), and Wiki search showed placeholders for several seconds. Not timed precisely by run B. |
| KB-B-012, 013, 014, 018, 019, 020, 022, 023, 024, 025, 027, 028 | Search / Wiki home / Import / Public images / Comments / Templates / Ask KB / Purge | NOT RECHECKED (run B) | Run B stopped driving the shared tab at ~18:05 IST. Run A reports several of these as STILL OPEN. |

## 2. New bugs (run B)

## Page: Spaces list — Edit space sheet (/knowledge/wiki/spaces)

### KB-B-029: "Edit space" sheet opens with Name, Description and Icon blank
- Severity: High (a one-field edit fails; the current values are not visible)
- Route: /knowledge/wiki/spaces → card "Edit" on a space that has name, description and icon (e.g. "QA1015R2 Space A", desc "QA1015R2 description A", 📚)
- Steps: 1) Click "Edit". 2) Read Name, Description, Icon.
- Expected: All fields pre-filled with saved values; Audience = current audience.
- Actual: Name, Description and Icon are empty (placeholders "Space name", "Optional description", "e.g. 📚"). Changing only the Name and clicking Save fails with `description: … received null; icon: … received null` (the sheet stays open).
- Impact: Users cannot see what they edit; a rename needs all three fields re-typed; looks like Save does nothing (KB-B-015).
- Likely code area: space edit form defaultValues (record not passed into the form, or the form resets before the query resolves); PATCH payload sends null for empty optional fields (same as KB-B-001/026).
- Suggested fix: Initialise the form from the space record (`description ?? ""`, `icon ?? ""`); send empty optional fields as omitted or ""; keep the form in sync when the record loads.
- Acceptance check: Edit a space with description + icon → all three show the saved values; change only Name → Save → toast "Space updated", card shows the new name and the old description/icon.

## Page: Article editor (/knowledge/wiki/doc/:id)

### KB-B-030: Typed "/" stays in the body as a stray `slash_input` node and is published
- Severity: Medium
- Route: /knowledge/wiki/doc/6 → body → type "/" → menu opens → leave it open → Publish
- Steps: 1) Type a paragraph + Enter. 2) Type "/" and leave the menu open. 3) Publish. 4) Anonymous request to the public link.
- Expected: A lone "/" is removed when the menu is dismissed; published content has only the paragraph.
- Actual: The published page's embedded JSON contains a `slash_input` node with text "/". The editor shows "/" and extra empty lines after reload.
- Impact: Stray characters in public pages and in search/Ask KB text.
- Likely code area: slash-command extension leaves its input node in the document on dismiss; the publish serialiser does not strip `slash_input`.
- Suggested fix: On Escape/blur remove the `slash_input` node; strip it in serialise/publish.
- Acceptance check: "/" then Escape → no "/" in the editor; published JSON has no `slash_input`.

### KB-B-031: Share dialog marks "Private" as active on a Public page; no option is marked active after switching to Public
- Severity: Medium (same family as KB-B-010)
- Route: /knowledge/wiki/doc/6 → "Share page"
- Steps: 1) With header "Public", open Share page. 2) Read the active option. 3) Click Public and read again.
- Expected: Public is active; the link row is shown.
- Actual: "Private — Only you" is aria-active on open. After clicking Public the link row appears but no option is marked active.
- Impact: The owner cannot confirm the live audience from the dialog.
- Likely code area: share dialog active-state selector reads a different field than the header badge.
- Suggested fix: One `visibility` value drives badge, active option and the link row.
- Acceptance check: Public page → dialog opens with Public active and the link row visible.

### KB-B-032: Share → Public on a Draft page gives a link that returns 404
- Severity: Medium
- Route: /knowledge/wiki/doc/6 while status = Draft → Share page → Public → copy link → anonymous request
- Steps: 1) Keep Draft. 2) Share → Public. 3) Open the link anonymously.
- Expected: Either the dialog says "Publish to share" (and blocks Public), or the link serves the page.
- Actual: Badge and dialog show Public and a link is displayed; anonymous request returns 404. After Publish the same link returns 200.
- Impact: Shared links look live but do not work.
- Likely code area: public route checks status = published; the share UI checks only visibility.
- Suggested fix: Block Public for Draft with a hint, or serve it consistently.
- Acceptance check: Draft + Public → dialog hint, and the link behaviour matches the dialog.

## Page: Article editor — Insert and format → File / Image

### KB-B-033: Rejected executable shows a raw MIME type and no allowed-type list
- Severity: Low (UX/copy; the rejection itself works)
- Route: /knowledge/wiki/doc/6 → Insert and format → File → qa-test.exe
- Steps: Choose /workspace/streamline-qa/fixtures/qa-test.exe in the file input.
- Expected: "Type not allowed: qa-test.exe. Allowed: pdf, doc(x), xls(x), ppt(x), csv, txt, zip." (no MIME).
- Actual: Red toast "Upload failed: qa-test.exe — Unsupported file type: application/x-msdownload".
- Impact: Developer-facing text; users do not learn the allowed list.
- Likely code area: upload validator returns the MIME; client shows the raw error.
- Suggested fix: Map the rejection to a friendly message with the allowed extensions.
- Acceptance check: .exe → message names the allowed types; no "application/" text.

### KB-B-034: Duplicate in-flight image upload still shows an error toast (one image inserted)
- Severity: Medium (same as KB-B-006; recorded here with run-B evidence)
- Route: /knowledge/wiki/doc/6 → Insert and format → Image → same file twice quickly
- Expected: No error toast for a duplicate that is ignored or merged.
- Actual: Toast "Upload failed: valid-image-0913.png — A matching request is already in progress; retry shortly", while exactly one image is inserted.
- Impact: Users retry and insert duplicates.
- Suggested fix: Treat the in-flight duplicate as a no-op (no toast).
- Acceptance check: Two quick identical uploads → one image, no toast.

## Page: Spaces list — success feedback

### KB-B-035: Restore and Archive of a space show no success toast
- Severity: Low
- Route: /knowledge/wiki/spaces?status=archived → Restore → confirm
- Expected: Toast "Space restored" (and "Space archived" on archive).
- Actual: The dialog closes and the list updates after reload; no toast is shown.
- Impact: Users cannot tell the action worked without a reload.
- Suggested fix: Show success toasts for archive/restore.
- Acceptance check: Restore → toast visible within 1 s; list updates without reload.
