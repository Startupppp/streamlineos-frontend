# knowledge-base — pending items recovered from the QA zips

These were still open, partial, blocked, or not re-checked. Fixed and pass items are omitted.

## KB-B-001 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-001 | Space create fails when Icon empty (`icon: ... received null`) | PARTIAL | Both runs: Name-only (Icon AND Description blank) → toast `description: … received null` + `icon: … received null`; sheet stays open. Run A: Icon blank + Description filled → created, sheet closed, no icon error; card shows no icon (no default). Still blocks the default/name-only flow (see KB-B-026). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-001: Creating a space fails when the optional Icon field is left empty
- Severity: High (blocks a default create flow)
- Route: /knowledge/wiki/spaces → "New space" / "Create space" side sheet
- Actor: org owner (adityachalla01)
- Steps: 1) Click "New space". 2) Type Name "QA1015 Space A". 3) Leave "Icon (emoji)" empty. 4) Keep Audience = Internal. 5) Click "Create".
- Expected: Space is created (icon is optional per placeholder "e.g. 📚"), sheet closes, space card appears.
- Actual exact text (toast, red): `icon: Invalid input: expected string, received null`
- Impact: Users cannot create a space unless they know to type an emoji; raw validation text leaks to the user. Probably affects every empty-icon create.
- Likely code area: space create form submit payload (icon sent as `null` instead of omitted/`""`), and the create-space API/schema validator (icon schema is `z.string()` without `.nullish()`/`.optional()`).
- Suggested fix: Either omit `icon` from the payload when empty or make the schema accept null/empty (`z.string().nullish()`); map empty input to `undefined`. Show a friendly message for any validation error instead of the raw key.
- Acceptance check: With Name only filled (icon blank, audience Internal), Create closes the sheet, shows the new space in the list with a default icon, no toast. Also repeat with Public and Mixed audiences.

## KB-B-002 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-002 | Space create false error "server sent data this screen does not understand" after save | STILL OPEN (intermittent) | **Disagree.** Run B: Name+Description+📚 → red toast "The server sent data this screen does not understand…", sheet stayed open; reload showed exactly one saved space (no duplicate). Run A: later create with Icon+Description → sheet closed, no error toast. Behaviour differs between creates; treat as intermittent until round-3 re-verify. Other Create paths still fail (KB-B-001/026). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-002: Space create reports an error ("server sent data this screen does not understand") even though the space was saved; sheet stays open and invites duplicate creates
- Severity: High (false failure → duplicate records)
- Route: /knowledge/wiki/spaces → "Create space" side sheet
- Actor: org owner (adityachalla01)
- Steps: 1) Fill Name "QA1015 Space A", Description, Icon "📚", Audience Internal. 2) Click "Create". 3) Observe the sheet. 4) Reload the Spaces page.
- Expected: Sheet closes on success, list shows the new space exactly once, no error toast.
- Actual: Sheet stays open with a red toast `The server sent data this screen does not understand. Refresh to try again — if it keeps happening, this app is out of date with the API.` After a reload, the space "📚 QA1015 Space A — Internal — 0 pages · 1 member — Owned by adityachalla01" exists (so the server did save it).
- Impact: Users believe the create failed and click Create again → duplicate spaces. Response contract mismatch between the create endpoint and the client.
- Likely code area: space create mutation's response parser / zod response schema on the client; the create endpoint returns a shape (e.g. missing `icon`/`memberCount` or different envelope) that the client schema rejects; the mutation's onError path still runs after server success.
- Suggested fix: Align the create response with the client schema (or the client should trust a 2xx and refetch). Only show an error when the server did not persist; on a 2xx, close the sheet and invalidate the spaces query. Add idempotency or a disabled-while-pending Create button.
- Acceptance check: Create a space with icon; sheet closes with no toast; list shows exactly one new card; API response passes the client schema (no toast). Create-retry after a network error must not create a second space.

## KB-B-003 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-003 | "New page" inside a space creates the article outside that space | PARTIAL | Both runs: space header "New page" → new doc; breadcrumb stays "Wiki › …" (no space); sidebar lists at root. Page is attached (Page settings → Space; space card page count updates) — Run B notes attachment only after first save; Run A saw Space E Hierarchy list the Untitled. Space-level breadcrumb still missing. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-003: "New page" inside a space creates the article outside that space
- Severity: High (content lands in the wrong place; space shows empty)
- Route: /knowledge/wiki/spaces/1 → "New page" button (header) — also the "New page" in the Hierarchy panel
- Actor: org owner (adityachalla01)
- Steps: 1) Open space "📚 QA1015 Space A" (/knowledge/wiki/spaces/1). 2) Click "New page". 3) Editor opens at /knowledge/wiki/doc/1 with breadcrumb "Wiki › Untitled". 4) Go back to /knowledge/wiki/spaces/1.
- Expected: The new page opens inside "QA1015 Space A" (breadcrumb shows the space; Hierarchy lists it; page count becomes 1).
- Actual: Breadcrumb is only "Wiki › Untitled" (no space); the sidebar lists the page at top level; the space still shows "0 pages", "No pages in this space yet", Hierarchy "No pages yet". The page only appears in the space after manually opening Page info → Space → "📚 QA1015 Space A".
- Impact: Articles created from a space silently land in the workspace root; users will think the space is empty and create duplicates.
- Likely code area: space detail "New page" handler (create-doc mutation should pass `spaceId`); /knowledge/wiki/doc/new route loader ignores the space context.
- Suggested fix: Pass the current space id in the create-page payload (or route `/knowledge/wiki/doc/new?space=:id`) and show the space in the breadcrumb.
- Acceptance check: From space 1 click New page → breadcrumb shows "QA1015 Space A", after going back the space lists the new page and shows "1 page". No manual move needed.

## KB-B-005 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-005 | Slash menu swallows typing | STILL OPEN | Both: "/" opens menu; typed "heading 2" / "bullet" do not filter or insert; "/" stays in body; menu stays open. Clicking "Bullet List" converts the line but next typed text is lost. Stored content keeps a stray `slash_input` node (see KB-B-033). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-005: Slash command menu swallows typing (keystrokes after "/" are lost)
- Severity: High (blocks keyboard-only block insertion; text typed is silently dropped)
- Route: /knowledge/wiki/doc/1 → body editor
- Actor: org owner
- Steps: 1) Click at the end of a paragraph, press Enter. 2) Type "/". The block menu opens (Text, Heading 1, Heading 2, Heading 3, Bullet List, Numbered List …). 3) Type "heading 2" (or "bullet"). 4) Press Enter.
- Expected: The menu filters as you type ("heading 2" → Heading 2 only); Enter inserts Heading 2; the typed characters are not inserted into the body.
- Actual: After "/" the typed characters do not filter the menu and do not appear in the body; the menu stays open at "/". Only Escape (then typing) restores normal typing. Clicking "Heading 2" in the menu applies the heading but the resulting heading is empty ("Untitled heading" in the OUTLINE box) and the following keystrokes are lost until Escape is pressed.
- Impact: Keyboard users cannot insert blocks; text is lost without any warning.
- Likely code area: slash-command extension (suggestion plugin) keydown/onUpdate handler in the rich-text editor; the query text is not written into the suggestion range.
- Suggested fix: Ensure the suggestion plugin receives typed characters (don't `preventDefault` printable keys), update the query on each transaction, and close the menu on Escape/blur without losing input.
- Acceptance check: Type "/", then "bullet", Enter → a bullet list is created; no "/bullet" text remains; typed characters appear after the list item. Same for "/heading 2" and "/table".

## KB-B-006 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-006 | Upload failure toast shown although image inserted; duplicate-request leaks raw conflict message | STILL OPEN | **Disagree on retestability.** Run A: NOT RETESTED (blocked — could not start a second identical upload in the shared tab); single upload OK. Run B: two `setInputFiles` of valid-image-0913.png → toast "Upload failed: … A matching request is already in progress; retry shortly"; exactly one image inserted. Kept STILL OPEN on Run B evidence. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-006: Upload failure toast shown although the image was inserted; duplicate-request guard leaks a raw conflict message
- Severity: Medium
- Route: /knowledge/wiki/doc/1 → Insert and format → Image
- Actor: org owner
- Steps: 1) Insert and format → Image → choose valid-image-0913.png. 2) While it is uploading (placeholder with spinner), choose the same file again (or trigger the file chooser twice).
- Expected: One image is inserted; a duplicate attempt is ignored or queued with a clear message ("Already uploading").
- Actual: Toast (red): `Upload failed: valid-image-0913.png — A matching request is already in progress; retry shortly`. A few seconds later the image is inserted successfully (the image renders), so the user sees a failure and a success for the same file. Console shows `409` on the media upload endpoint (api.streamlineos.in/kb/media).
- Impact: Users retry and get duplicate images; error text is developer-facing.
- Likely code area: media upload hook (in-flight key dedupe returns 409 and the client maps it to "failed").
- Suggested fix: Treat the in-flight duplicate as a no-op (don't show an error), or wait for the first request; keep the placeholder in sync with the first upload's result.
- Acceptance check: Two identical uploads started quickly produce exactly one image and no error toast.

## KB-B-007 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-007 | Rejected .exe attachment fails silently | PARTIAL | Both: qa-test.exe → red toast `Upload failed: qa-test.exe` + `Unsupported file type: application/x-msdownload`. Silent failure fixed, but message leaks raw MIME and does not list allowed types (.pdf .doc(x) .xls(x) .ppt(x) .csv .txt .zip). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-007: Rejected .exe attachment fails silently (no block, no message)
- Severity: Medium (user gets no feedback on a disallowed type)
- Route: /knowledge/wiki/doc/1 → Insert and format → File
- Actor: org owner
- Steps: 1) Insert and format → File → choose /workspace/streamline-qa/fixtures/qa-test.exe (14-byte MZ-header fixture). 2) Wait 10 s.
- Expected: Upload is refused with a visible message such as "Executable files (.exe) are not allowed" and no block is inserted. (Allowed list shown in the picker: .pdf .doc .docx .xls .xlsx .ppt .pptx .csv .txt .zip.)
- Actual: Nothing is inserted, no toast, no error text, no console message beyond the existing 409 from earlier. The user cannot tell whether the upload happened.
- Impact: Users think the upload is broken or retry endlessly; the rejection rule itself is not communicated.
- Likely code area: file attachment picker / media upload validation (client `accept` only, no user-facing error for disallowed MIME/extension).
- Suggested fix: Validate extension and MIME on the client before upload and show "Type not allowed: qa-test.exe. Allowed: pdf, doc(x), xls(x), ppt(x), csv, txt, zip." Mirror the server rule.
- Acceptance check: Choosing qa-test.exe shows the message above within 1 s; no block or request is created. valid-doc-0913.pdf still attaches (310 B).

## KB-B-010 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-010 | Share dialog "Private" vs header "Team" mismatch | STILL OPEN | **Disagree.** Run A: FIXED on fresh doc/6 Team state (badge and menu both Team). Run B: STILL OPEN — after Publish, header badge "Public" while Share dialog opens with "Private — Only you" aria-active (reproduced on two opens). Kept STILL OPEN on Run B evidence; same family as KB-B-034. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-010: Share dialog shows "Private" as the active option while the page badge says "Team"
- Severity: Medium (access state is ambiguous)
- Route: /knowledge/wiki/doc/1 → "Share page" button
- Actor: org owner
- Steps: 1) Article status shows Draft → Unverified → "Team" badge in the header. 2) Click "Share page".
- Expected: The dialog highlights the same audience the header shows ("Team · Org members").
- Actual: The dialog highlights "Private — Only you" as active; the header badge says "Team". After Public → Private revoke, the badge changes to "Public" then back, but the initial mismatch remains.
- Impact: Users may think the page is private while org members can read it (or the reverse).
- Likely code area: share-state selector reads `visibility` while the header reads `audience`/default team.
- Suggested fix: Use one `visibility` field for both the badge and the share dialog; default new pages to the same value the badge shows.
- Acceptance check: New page → header badge and Share dialog both show the same audience before any click.

## KB-B-012 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-012 | Search query over 200 characters crashes the whole Wiki view | STILL OPEN | Run A: /knowledge/wiki/search, ~300 chars → whole Wiki replaced by "Something went wrong — Failed to load the wiki"; sidebar gone. Run B: NOT RECHECKED. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-012: Search query over 200 characters crashes the whole Wiki view ("Something went wrong")
- Severity: High (any long paste breaks search; the page is replaced by an error, sidebar disappears)
- Route: /knowledge/wiki/search?q=<300 chars>
- Actor: org owner
- Steps: 1) Open /knowledge/wiki/search. 2) Type or paste a 300-character string (e.g. "lorem ipsum " × 25). 3) Wait 2 s.
- Expected: Either the input stops at 200 characters (maxLength), or the search shows a field-level message "Search is limited to 200 characters" and results for the first 200 characters; the sidebar stays.
- Actual: Full-page error card: `Something went wrong` / `Failed to load the wiki. Please try again.` with a "Try again" button. Console: `400 /kb/pages/full-search?q=…&facets=true` and `ApiError: Validation failed … details: [{path:"q", message:"Too big: expected string to have <=200 characters"}]`.
- Impact: One long paste makes search unusable until the URL is edited; technical error text visible in the console.
- Likely code area: search input (no `maxLength`), query builder in the Wiki search page, and the API schema for `q` (max 200) with no client-side guard; the error boundary wraps the whole `/knowledge/wiki` layout.
- Suggested fix: Add `maxLength={200}` (and a counter) to the search box, trim/slice the query before sending, and scope the error boundary to the results pane so the sidebar remains.
- Acceptance check: Pasting 300 chars → input holds 200 chars with a hint; no 400 request; sidebar stays visible.

## KB-B-014 — not re-run

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-014 | Search snippet strips `<`/`>` | NOT RETESTED (pending) | Neither run completed a dedicated recheck. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-014: Search result snippet cuts the closing ">" from special-character matches
- Severity: Low
- Route: /knowledge/wiki/search?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E
- Steps: Search `<img src=x onerror=alert(1)>` → 1 result. The snippet reads `img src=x onerror=alert(1` (closing `>` and leading `<` missing).
- Expected: The snippet shows the matched text as written, escaped (e.g. `&lt;img src=x onerror=alert(1)&gt;`).
- Actual: Snippet truncated; no script executed (XSS safe). Result is correctly rendered as text.
- Likely code area: snippet highlighter strips angle brackets as tags.
- Suggested fix: Escape the snippet before highlighting; don't treat `<` as HTML.

## KB-B-015 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-015 | Space rename does not persist | PARTIAL | **Disagree.** Run A: FIXED *(observed in shared session)* — rename "QA1015R2 Space A" → "… A edited" persisted after navigation. Run B: PARTIAL — Edit sheet opens blank (KB-B-029); typing all three fields + Save → PATCH persisted after reload, but red "server sent data…" toast and sheet stayed open. Kept PARTIAL on Run B's own Edit→Save evidence. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-015: Editing a space name and clicking Save does not persist the change
- Severity: Medium
- Route: /knowledge/wiki/spaces → card "Edit" (also /knowledge/wiki/spaces/1 after reload)
- Actor: org owner (adityachalla01), space admin
- Steps: 1) Click "Edit" on "📚 QA1015 Space A". 2) Change Name to "QA1015 Space A edited". 3) Click "Save". 4) Reload /knowledge/wiki/spaces.
- Expected: Dialog closes, toast "Space updated", card shows "QA1015 Space A edited", "Updated just now".
- Actual: Dialog closes with no visible toast; after reload the name is still "QA1015 Space A" and the card still says "Updated 20m ago" (no change). Repeated twice with the same result. The space header (/spaces/1) also shows the old name.
- Impact: Users believe they renamed a space; names and descriptions cannot be corrected.
- Likely code area: space update mutation (PATCH) — payload probably sends `icon: ""`/null like KB-B-001, or the request is rejected and the error is swallowed.
- Suggested fix: Check the PATCH response in the network log; apply the same empty-icon normalisation as create; show an error toast on failure; invalidate the spaces query on success.
- Acceptance check: Rename → reload → new name shown and "Updated just now" changes; a forced failure shows an error toast and keeps the dialog open.

## KB-B-018 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-018 | Double-click on "New page" creates two untitled articles | STILL OPEN | Run A: double-click Wiki home "New page" → two Untitled pages (doc/8, doc/9); caveat shared-session. Run B: NOT RECHECKED (saw extra Untitled pages it did not create). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-018: Double-click on "New page" creates two untitled articles
- Severity: High (duplicate records; no guard on create)
- Route: /knowledge/wiki → "New page" (header) — same on /knowledge/wiki/spaces/:id
- Actor: org owner
- Steps: 1) Open /knowledge/wiki with at least one page. 2) Double-click "New page" once (2 clicks within 300 ms). 3) Wait 15 s. 4) Look at the sidebar "Untitled" entries.
- Expected: One new article ("Untitled", /knowledge/wiki/doc/N) is created and opened; the second click is ignored (button disabled while "Creating…").
- Actual: Two "Untitled" articles appear in the left sidebar (doc/2 and doc/3 in this run); the editor opens on the last one. The "Creating…" disabled state seen on the space's New page button is not applied on the Wiki home button.
- Impact: Duplicate empty drafts clutter the library and "My pages"; users must find and delete them.
- Likely code area: create-page button handler lacks an in-flight guard (`isPending` not wired to `disabled`) and the mutation is not idempotent.
- Suggested fix: Disable the button on pointer-down/while pending, or de-duplicate on the server with a client-generated request id.
- Acceptance check: Double-click → exactly one new page in the sidebar after 15 s; repeated Enter key presses behave the same.

## KB-B-019 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-019 | Imported Markdown body does not render; title from filename | STILL OPEN | Run A: re-imported QA1015R2-import-xss.md → doc/10 titled from filename; editor "Start writing…" while Words 33; Recent imports not updated. Run B: NOT RECHECKED (fixture ready). |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-019: Imported Markdown body does not render; page title comes from filename, not the H1
- Severity: High (imported content appears empty to users)
- Route: /knowledge/wiki/import → "Choose files" (.md) → "Import 1 page"; result at /knowledge/wiki/doc/4
- Actor: org owner
- Steps: 1) Import `QA1015-import-xss.md` (H1 "QA1015 Import XSS", one paragraph, two links, one `<img onerror>`, one `<script>`) with target space "No space", visibility Team, duplicate policy "Skip duplicates". 2) Wait ~20 s for "Importing…" to finish; "Recent imports" stays "No imports yet". 3) Open the new page; reload it.
- Expected: Title "QA1015 Import XSS" (from the H1); body paragraph "Safe paragraph for QA1015 import test." and the links visible in the editor; recent-imports list shows the job.
- Actual: Page is created once (search finds 1 result, Draft, Team) with title "QA1015-import-xss" (the filename). The editor shows only the "Start writing…" placeholder with no text, and no links, although the sidebar stats say Words 20. Reload shows the same. "Recent imports" still says "No imports yet" after success. The import panel also showed "Import queued…" / "Importing…" for ~20 s before clearing.
- Impact: Imported documentation is silently empty; users would re-import or re-type it. XSS check on imported body could not be completed because nothing renders (see COVERAGE.md).
- Likely code area: markdown-to-document converter (body stored but not mapped into the editor schema; H1 not used for title) and the import-history query.
- Suggested fix: Map the first H1 to the title; verify the stored body JSON renders in the editor; add the completed job to Recent imports.
- Acceptance check: Import the QA1015 .md file → page title "QA1015 Import XSS"; editor shows the paragraph and the good link; `javascript:` link is not clickable; `<img onerror>` and `<script>` do not execute; Recent imports lists the job with "1 page".

## KB-B-020 — not re-run

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-020 | Public page shows broken images | NOT RETESTED (inconclusive) | Run A: anonymous curl of public page with image → HTTP 200 but no `<img>` in server HTML; needs incognito visual check (single-tab rule). Run B: NOT RECHECKED. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-020: Public (anyone-with-link) page shows broken images; images show alt text only
- Severity: Medium
- Route: https://www.streamlineos.in/wiki/<token> (token created from /knowledge/wiki/doc/1 → Share page → Public)
- Actor: anonymous visitor (verified in a Chrome private/incognito window, signed out)
- Steps: 1) Article doc/1 contains three inserted images (valid-image-0913.png, QA1015-valid-3mb.png, QA1015-valid-6mb.png) and a PDF attachment (valid-doc-0913.pdf). 2) Set Share = Public. 3) Open the public link in a private window.
- Expected: Images render on the public page (natural size or capped), the PDF attachment chip is downloadable.
- Actual: Heading and paragraphs render. Each image shows the browser broken-image icon with its file name as alt text, leaving tall empty boxes; the PDF appears as a chip with no visible download action. The page itself is readable, and the share link returns 404 after revoke (KB-B-011 path re-verified).
- Impact: Public readers see broken content; the share feature is only useful for text-only pages.
- Likely code area: inserted images in the editor use relative `src="/api/media/image?key=<org>/kb-media/..."` (authenticated media endpoint, seen on doc/1 in the owner session). The public renderer reuses the same URL, which an anonymous visitor cannot load; no token-scoped media URL is used.
- Suggested fix: Serve media referenced by a publicly shared page through a token-scoped public media URL (or inline the images); make the file chip a download link.
- Acceptance check: Anonymous view of a shared page with an image shows the image; no broken-image icons; the PDF chip opens/downloads.
- Screenshot: screenshots/KB-B-020-public-share-broken-images.webp (top of anonymous view: screenshots/public-share-top-anon-view.webp).

## KB-B-021 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-021 | Share dialog stale after Public → Private | PARTIAL | **Disagree.** Run A: FIXED on doc/6 — checkmark, badge, and link row updated in same view (no reload); toast not caught. Run B: PARTIAL — toast "Visibility updated" and revoke work (anonymous 404); header badge changes ~1–2 s after toast; dialog active option unreliable (KB-B-010 / KB-B-034). Kept PARTIAL. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-021: Share dialog keeps showing "Public" checked and the header badge stale after switching to Private, even though "Visibility updated" toast appears
- Severity: Medium (access state shown to the owner is wrong right after a change)
- Route: /knowledge/wiki/doc/1 → "Share page" → "Private"
- Actor: org owner (adityachalla01)
- Steps: 1) With the page Public, open "Share page". 2) Click "Private — Only you". 3) Watch the dialog and the header badge for ~5 s.
- Expected: Checkmark moves to Private, header badge changes to "Private", and the toast matches.
- Actual: Toast "Visibility updated" appears, but the menu still checks "Public — Anyone with link" (share URL still listed) and the header badge still reads "Public". Only after a later page reload does the badge read "Private". The server did switch to Private (anonymous link returns 404 afterwards), so the client state is stale.
- Impact: Owner may think the page is still public (or re-click and toggle it back to Public).
- Likely code area: visibility mutation's onSuccess does not invalidate/update the page query used by the header badge and share menu (optimistic value not reverted/refreshed).
- Suggested fix: Update the cached page `visibility` on mutation success (or invalidate the page query) and derive both the header badge and the menu checkmark from that single value.
- Acceptance check: Public → Private: menu checkmark and header badge both show Private within 1 s of the toast, without reload; the share URL row disappears.

## KB-B-022 — partial

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-022 | Posted, edited and resolved comments do not appear until reload | PARTIAL | Run A: post listed within seconds + toast; Resolve → Resolved (1) at once; Edit→Save text confirmed only after next action/reload. Run B: NOT RECHECKED. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-022: Posted, edited and resolved comments do not appear in the Comments panel until the page is reloaded
- Severity: High (users re-post the same comment; edits look lost)
- Route: /knowledge/wiki/doc/1 → More options → Comments
- Actor: org owner (adityachalla01)
- Steps: 1) Open Comments. 2) Type "QA1015 R1 comment A" and click "Post comment". 3) Wait 5 s. 4) Click "Edit" on that comment, change the text to "... edited", click "Save", wait 5 s. 5) Click "Resolve". 6) Wait 5 s. 7) Reload and reopen Comments.
- Expected: After each action the list updates at once: the new comment appears, the edited text shows, the resolved comment moves to "Resolved (1)".
- Actual: After Post, the field clears but the new comment is not listed (it exists after a reload). After Save, the editor closes and the old text "QA1015 R1 comment A" stays on screen; after reload it reads "... edited" (saved). After Resolve, the card still shows as active with "Resolve" until reload. The server state is correct each time; only the panel is stale.
- Impact: Users re-post duplicates after Post, and re-edit or re-resolve believing the earlier action failed.
- Likely code area: comment mutations do not invalidate/refetch the comments query (or the list query key differs from the one the mutation writes to).
- Suggested fix: Invalidate the page-comments query on post/edit/resolve/delete success (or update the cache optimistically) and show the change in the panel immediately.
- Acceptance check: Post → the comment is listed at the bottom with no reload; Edit → the card shows the new text on Save; Resolve → it moves into "Resolved (n)" at once.

## KB-B-024 — blocked, not confirmed fixed

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-024 | Page created with "Use" on a starter template shows empty editor | BLOCKED | Run A: Starters loads but "Use" attempts (4) ended in full-page error (KB-B-031) before a page was created; empty-editor symptom not observable. Run B: NOT RECHECKED. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-024: Page created with "Use" on a starter template shows an empty editor although the word count says 40
- Severity: High (template content is not visible; same symptom class as KB-B-019)
- Route: /knowledge/wiki/templates → Starters → "Use" (FAQ card) → /knowledge/wiki/doc/5
- Actor: org owner (adityachalla01)
- Steps: 1) Open Templates (Starters tab). 2) Click "Use" on the "FAQ" card. 3) Wait for the editor (~10 s). 4) Reload the page after it opens.
- Expected: A new page titled "FAQ" opens with the FAQ template sections (questions and answers) visible in the editor.
- Actual: Page "FAQ" (Draft, Team) opens and the sidebar lists it, and the details panel says Words 40, but the editor shows only "Start writing…". The same after reload. No template text is visible anywhere.
- Impact: Starter templates appear to produce blank pages; users re-type the structure or abandon templates.
- Likely code area: template-to-document conversion stores the body in a shape the editor schema does not render (same converter path as KB-B-019).
- Suggested fix: Verify the template body JSON is mapped into the editor schema on create; add a check that a created page renders its body; cover with a test that uses a starter template.
- Acceptance check: "Use" on FAQ → editor shows the FAQ headings and placeholder answers; Words in the panel matches the visible text.
- Note: the "Use" click on the card was made in error during this QA run; the page was kept as QA1015 test data (doc/5, to be deleted in cleanup).

## KB-B-025 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-025 | Save as template reports failure; saved template crashes Templates view | STILL OPEN | Run A: Templates → "Saved" tab → whole Wiki "Something went wrong" (sidebar gone); reproduced 2×. "Save as template" path blocked by crash (KB-B-031). Run B: NOT RECHECKED. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-025: "Save as template" reports "Failed to save template" although the template is saved; the saved template then crashes the whole Wiki/Templates view
- Severity: High (template creation looks failed, retry gives 409, and the Templates page becomes unusable)
- Route: /knowledge/wiki/doc/1 → More options → "Save as template" → name "QA1015 Template R1" → Save; then /knowledge/wiki/templates (Saved tab)
- Actor: org owner (adityachalla01)
- Steps: 1) Open a published page (doc/1) → More options → Save as template. 2) Keep the name "QA1015 Template R1" → Save. 3) Wait 5 s. 4) Click Save again. 5) Open /knowledge/wiki/templates, then the "Saved" tab.
- Expected: Dialog closes with a success toast; "QA1015 Template R1" appears once under Saved; the Templates page loads.
- Actual: Step 2 shows a red toast "Failed to save template" and the dialog stays open. Console: POST /kb/page-templates returned 201 (the template was stored), but the client rejected the response: `ApiContractError … CONTRACT_VIOLATION … issues: [{path:"content", message:"Invalid input: expected record, received array"}]`. Step 4 returns 409 (name already exists). From then on, opening /knowledge/wiki/templates (Saved list loads `data.0.content`, same error) replaces the Templates view with "Something went wrong — Failed to load the wiki. Please try again." (sidebar gone). Screenshot: screenshots/KB-B-025-templates-saved-tab-crash.png.
- Impact: Users cannot save templates or reach the Templates page once one exists; retries create conflicts; the same contract mismatch family as KB-B-002.
- Likely code area: page-templates API serialises `content` as an array (or stores the Tiptap doc as an array) while the client schema expects a record; error boundary wraps the whole Wiki layout.
- Suggested fix: Align the template `content` type in the API response and client schema (record of doc JSON); on a 2xx response close the dialog; treat a name conflict (409) as "already saved" with a clear message; scope the error boundary to the Templates list so the sidebar survives.
- Acceptance check: Save as template → one success toast, dialog closes, template listed once under Saved; Templates page (Starters and Saved) loads without error; using the saved template creates a page whose body renders.

## KB-B-026 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title (short) | Status | Evidence (round 2, merged) |
| KB-B-026 | Space create with empty Description fails with raw validation message | STILL OPEN | Both: Name + Icon with Description blank (or name-only) → toast `description: Invalid input: expected string, received null`; sheet stays open; no record. Run A reproduced twice. |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-1/BUGS.md`:

### KB-B-026: Creating a space with an empty Description fails with a raw validation message and nothing is saved
- Severity: High (same root cause family as KB-B-001: optional fields sent as null)
- Route: /knowledge/wiki/spaces → "New space" → Create
- Actor: org owner (adityachalla01)
- Steps: 1) Click "New space". 2) Name "QA1015 Space C". 3) Leave "Description" empty. 4) Icon "🧭". 5) Audience = Public. 6) Click "Create".
- Expected: Space is created (Description is optional, placeholder "Optional description"); sheet closes; card appears.
- Actual: Red toast `description: Invalid input: expected string, received null`. Sheet stays open. Reloading the list shows the space was not created. Creating it again with a description works.
- Impact: Optional fields break creation; raw schema text is shown to the user (repeat of KB-B-001's wording problem).
- Likely code area: space create payload sends `description: null` for empty input; API/client schema is `z.string()` without nullish/optional handling.
- Suggested fix: Omit empty optional fields from the payload (or send ""), accept null on the server, and map validation errors to field messages.
- Acceptance check: Name + Icon + Audience only → Create closes the sheet and shows the card; same for Public and Mixed audiences; no raw key text in any toast.

## KB-B-029 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title | Severity |
| KB-B-029 | Edit space sheet opens with Name/Description/Icon blank | High |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS-run-a.md`:

### KB-B-029: Move page → "Move here" shows "server sent data this screen does not understand", dialog stays open, sidebar not updated (the move did happen)
- Severity: High (users retry the move, get no confirmation, and cannot tell whether it worked; same contract-mismatch family as KB-B-002/025)
- Route: /knowledge/wiki/doc/8 → More options → Move → search "QA1015R2 Nested" → select "QA1015R2 Nested Parent" → "Move here"
- Actor: org owner (adityachalla01)
- Steps: 1) Open a top-level page (doc/8, "Untitled"). 2) More options → Move. 3) Type "QA1015R2 Nested" and select the parent row. 4) Click "Move here". 5) Wait 10 s. 6) Reload the page.
- Expected: Dialog closes, toast "Page moved", the sidebar shows the page under "QA1015R2 Nested Parent", breadcrumb updates.
- Actual: Dialog stays open with the parent still listed; no toast; sidebar still shows doc/8 at root. Console: `ApiContractError CONTRACT_VIOLATION` on `POST /kb/pages/8/move` (HTTP 200) with issue `success: Invalid input: expected boolean, received undefined` (correlation id a3cbd948-9107-414d-8ccf-dcc0e22636b4; 3 more attempts logged the same error). After a reload the move is in place: breadcrumb "Wiki › QA1015R2 Nes… › Untitled" and the parent is collapsed in the sidebar. Repeating Move would re-run a server move.
- Impact: Users believe the move failed and retry; the UI shows a red error for a successful operation; the dialog is left open. Nested-page reorganisation is hard to trust.
- Likely code area: `/kb/pages/:id/move` response schema on the client (expects `success: boolean`; server returns 200 with the page/no `success` field); move mutation's onError still runs after 2xx; dialog not closed/invalidated on success.
- Suggested fix: Align the move response with the client schema (return `{ success: true, ... }` or drop the field from the client schema); on 2xx close the dialog, invalidate the page tree and breadcrumb queries, and show "Page moved".
- Acceptance check: Move doc/8 under "QA1015R2 Nested Parent" → dialog closes, toast "Page moved", sidebar shows the child under the parent without reload, no console contract error.

## KB-B-031 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title | Severity |
| KB-B-031 | Templates view crashes (Starters "Use" and Saved tab) | High |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS-run-a.md`:

### KB-B-031: Space detail page for "QA1015R2 Space E" crashes to full-page "Something went wrong" (members endpoint returns an object where an array is expected)
- Severity: High (a space becomes unopenable; its pages, New page and Members are unreachable from the UI)
- Route: /knowledge/wiki/spaces/6 (also any space whose `/kb/spaces/:id/members` response has the same shape)
- Actor: org owner (adityachalla01)
- Steps: 1) Open /knowledge/wiki/spaces → "QA1015R2 Space E" (Internal, 1 member). 2) Click the card (or open /knowledge/wiki/spaces/6 directly). 3) Wait 5 s.
- Expected: Space header, Hierarchy and Members load (sidebar stays).
- Actual: Whole Wiki view replaced by "Something went wrong — Failed to load the wiki. Please try again." Console: `ApiContractError CONTRACT_VIOLATION` on `GET /kb/spaces/6/members` (HTTP 200) with issue `(root): Invalid input: expected array, received object` (correlation id 8ca46f2a-cf69-4336-9592-c2bba51d77c4). /knowledge/wiki/spaces/4 (QA1015R2 Space A edited, 1 member) loads normally, so the failure is specific to this space's members response. Earlier in the session the same space page rendered; the failure appeared later.
- Impact: The space can't be managed (members, edit, New page); users see a generic error and cannot reach its pages from the space view.
- Likely code area: members list API (`/kb/spaces/:id/members`) returns `{ items: [] }` or an empty-object shape for some spaces; client schema expects an array; the route error boundary wraps the whole Wiki layout.
- Suggested fix: Return the array shape the client expects (or update the client schema); scope the error boundary to the space body so the sidebar survives; log the failing endpoint and correlation id.
- Acceptance check: /knowledge/wiki/spaces/<id> loads for every space, including one with 0 and one with several members; the Members dialog lists members; no CONTRACT_VIOLATION in the console.

## KB-B-032 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title | Severity |
| KB-B-032 | Space detail crashes (members endpoint object vs array) | High |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`:

### KB-B-032: Space detail page for "QA1015R2 Space E" crashes to full-page "Something went wrong" (members endpoint returns an object where an array is expected)
- Severity: **High** (a space becomes unopenable; its pages, New page and Members are unreachable from the UI)
- Route: /knowledge/wiki/spaces/6 (also any space whose `/kb/spaces/:id/members` response has the same shape)
- Actor: org owner (adityachalla01)
- Source: Run A
- Steps: 1) Open /knowledge/wiki/spaces → "QA1015R2 Space E" (Internal, 1 member). 2) Click the card (or open /knowledge/wiki/spaces/6 directly). 3) Wait 5 s.
- Expected: Space header, Hierarchy and Members load (sidebar stays).
- Actual: Whole Wiki view replaced by "Something went wrong — Failed to load the wiki. Please try again." Console: `ApiContractError CONTRACT_VIOLATION` on `GET /kb/spaces/6/members` (HTTP 200) with issue `(root): Invalid input: expected array, received object` (correlation id 8ca46f2a-cf69-4336-9592-c2bba51d77c4). /knowledge/wiki/spaces/4 (QA1015R2 Space A edited, 1 member) loads normally, so the failure is specific to this space's members response. Earlier in the session the same space page rendered; the failure appeared later.
- Impact: The space can't be managed (members, edit, New page); users see a generic error and cannot reach its pages from the space view.
- Likely code area: members list API (`/kb/spaces/:id/members`) returns `{ items: [] }` or an empty-object shape for some spaces; client schema expects an array; the route error boundary wraps the whole Wiki layout.
- Suggested fix: Return the array shape the client expects (or update the client schema); scope the error boundary to the space body so the sidebar survives; log the failing endpoint and correlation id.
- Acceptance check: /knowledge/wiki/spaces/<id> loads for every space, including one with 0 and one with several members; the Members dialog lists members; no CONTRACT_VIOLATION in the console.

## KB-B-033 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title | Severity |
| KB-B-033 | Typed "/" stays as stray `slash_input` and is published | Medium |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`:

### KB-B-033: Typed "/" stays in the body as a stray `slash_input` node and is saved and published to the public page
- Severity: **Medium** (junk text and an internal node type persist in saved and published content)
- Route: /knowledge/wiki/doc/6 → body → type "/" → menu opens → Escape or click elsewhere → Publish
- Source: Both runs (same finding)
- Steps: 1) Type "QA1015R2 first paragraph" + Enter. 2) Type "/" and leave the menu open. 3) Publish the page. 4) Curl / anonymously request the public share URL.
- Expected: A lone "/" is removed (or never saved) when the slash menu is dismissed; published HTML/JSON contains only the paragraph.
- Actual: The published page's embedded JSON contains `{"type":"slash_input", ...}` node with the text "/" (renders as "/" in the body, and a bullet after the Bullet List click). The editor body after reload shows "/" and extra empty lines.
- Impact: Public readers can see stray slash characters; search and Ask KB index the junk.
- Likely code area: slash-command extension leaves its input node in the document on dismiss (no removal on Escape/blur); serialiser does not strip `slash_input` before publish.
- Suggested fix: On Escape/blur/selection change remove the `slash_input` node (replace with its text or delete it); exclude `slash_input` in the publish/serialise step.
- Acceptance check: "/" then Escape → no "/" remains in the editor or published JSON; curl of the public page contains no "slash_input".

## KB-B-034 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title | Severity |
| KB-B-034 | Share dialog marks Private active on a Public page | Medium |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`:

### KB-B-034: Share dialog opens with "Private" active for a Public page (and no active option after switching to Public)
- Severity: **Medium** (same family as KB-B-010; access state misread)
- Route: /knowledge/wiki/doc/6 → "Share page"
- Source: Both runs
- Steps: 1) With the header badge "Public" (after Publish), open "Share page". 2) Read the active option. 3) Click "Public — Anyone with link" and read the dialog again.
- Expected: The active option is "Public" and the share link row is shown.
- Actual: On open, "Private — Only you" is aria-active. After clicking Public, the dialog shows the link row but no option is marked active.
- Impact: Owner cannot confirm which audience is live from the dialog.
- Likely code area: share dialog reads a different field than the header; the active-state selector is not derived from the same visibility value.
- Suggested fix: One `visibility` value drives badge, dialog active state and the link row (see KB-B-010).
- Acceptance check: Public page → dialog opens with Public active and the link row visible; switching to Private removes the link row and marks Private.

## KB-B-035 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title | Severity |
| KB-B-035 | Public share link 404s for Draft while UI says Public | Medium |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`:

### KB-B-035: Public share link returns 404 for a Draft page while the Share dialog and badge say "Public"
- Severity: **Medium** (owner believes the page is public; readers get 404 with no explanation)
- Route: /knowledge/wiki/doc/6 (status Draft) → Share page → Public
- Source: Both runs
- Steps: 1) Keep the page in Draft. 2) Share page → Public. 3) Copy the link and open it anonymously.
- Expected: Either the dialog warns "Publish the page to share it" / disables Public, or the link serves the page.
- Actual: The dialog shows the link and the badge reads "Public", but the anonymous request returns HTTP 404 until the page is published (verified: 404 while Draft, 200 after Publish).
- Impact: Shared links look live but do not work; support tickets likely.
- Likely code area: public route checks `status === published` while the share UI only checks `visibility`.
- Suggested fix: Block Public for Draft pages with a clear hint, or serve Draft public pages consistently and say so.
- Acceptance check: Draft + Public → dialog shows a hint and the link returns the same result the dialog implies (200 or blocked-in-UI).

## KB-B-036 — still open

Latest status source: `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`

| ID | Title | Severity |
| KB-B-036 | Restore/Archive of a space show no success toast | Low |

Write-up from `streamline-qa-reports/modules-2026-10-15/knowledgebase/round-2/BUGS.md`:

### KB-B-036: Restore and Archive of a space show no success toast
- Severity: **Low**
- Route: /knowledge/wiki/spaces?status=archived → Restore → confirm (and Archive path)
- Source: Run B
- Steps: 1) Archive a space (confirm). 2) Open Archived filter → Restore → confirm "Restore space?".
- Expected: Toast "Space restored" (and "Space archived" on archive); list updates without requiring a full mental reload.
- Actual: The dialog closes and the list updates after reload; no toast is shown.
- Impact: Users cannot tell the action worked without a reload.
- Likely code area: archive/restore mutations omit onSuccess toast (or toast is swallowed).
- Suggested fix: Show success toasts for archive/restore; refetch Active/Archived lists on 2xx.
- Acceptance check: Restore → toast visible within 1 s; list updates without reload. Same for Archive.
