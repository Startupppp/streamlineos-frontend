# Knowledge Base — Round 1 bugs (QA1015)

Tester session: account adityachalla01, org "ADitay CAhala", tester time Thu 2026-10-15 ~00:51 IST.
Scope note: the "Knowledge Base" module lives at /knowledge (sidebar: Ask KB /knowledge/chat, Wiki /knowledge/wiki, Research Briefs /knowledge/research-briefs). The spaces / articles / editor / versions / trash surface is under Wiki, so most bugs below are on /knowledge/wiki/*.

## Page: Spaces (/knowledge/wiki/spaces)

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

## Page: Space detail (/knowledge/wiki/spaces/:id)

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

### KB-B-004: Space "New page" drops the space, and the Page settings "Owner" field is blank even though the space owner is set
- Severity: Low
- Route: /knowledge/wiki/doc/:id → "More options" → "Page info" (Page settings sheet)
- Actor: org owner (adityachalla01)
- Steps: Open an article created in Wiki (doc/1) → More options → Page info. Look at "Owner".
- Expected: Owner shows the creator (adityachalla01), matching the "Team" and "Updated just now by adityachalla01" text in the header.
- Actual: "Select owner…" placeholder (empty combobox) while the header says "Updated just now by adityachalla01" and the Space shows "Owner: adityachalla01".
- Impact: Pages can show no owner; owner-based filters ("All owners") and reviews may miss them.
- Likely code area: page owner field initialisation in Page settings (doc metadata missing ownerId on create).
- Suggested fix: Set `ownerId` to the creator on page create; populate the Owner select from the stored value.
- Acceptance check: New article → Page info shows Owner = adityachalla01; "All owners" filter in the Wiki list finds it.

## Page: Article editor (/knowledge/wiki/doc/:id)

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

### KB-B-008: Slash menu, toolbar and image blocks: inserted images render at full column width and very tall (UX-level bug)
- Severity: Low
- Route: /knowledge/wiki/doc/1 → inserted PNG
- Actor: org owner
- Steps: Insert valid-image-0913.png (64×64 px gradient) via Insert and format → Image.
- Expected: Image shown at natural size or with a sane max height, with resize handles.
- Actual: Image box is ~662×662 px, pixelated, pushing content down; before the image loads the figure is an empty white box about 662 px tall. No resize or alignment controls are visible.
- Impact: Articles become hard to scan; empty placeholder looks broken.
- Likely code area: image node view CSS (no max-height / aspect-ratio placeholder).
- Suggested fix: Add a max-height and an aspect-ratio placeholder; expose a width/resize control.
- Acceptance check: A 64 px image renders at ≤ 64 px (or natural size); a 6 MB photo is capped at the column width with max-height ~600 px.

### KB-B-009: Version history records only one version; earlier edits are unrecoverable and "Restore" cannot be exercised
- Severity: High (version restore is a core requirement)
- Route: /knowledge/wiki/doc/1/history (More options → Version history → "Open full history")
- Actor: org owner
- Steps: 1) Create an article, type and insert content over ~30 minutes (≈20 autosaves: title changes, paragraph edits, table, image, file block, publish). 2) Open More options → Version history, then /knowledge/wiki/doc/1/history.
- Expected: Each meaningful save (or at least each publish / title change / 5-minute interval) creates a version; the list shows several versions with "Restore" for each older one.
- Actual: "VERSIONS (1) — Version 1 · Current · adityachalla01 · 10m ago" only. Publishing the page (Draft → Published) did not add a version either. Selecting Version 1 shows only the Current copy with a Restore button that restores the same content.
- Impact: Users cannot roll back accidental deletions or bad edits; the version UI promises history it does not keep.
- Likely code area: page version snapshot service (versions written only on create or not written on autosave/publish; the history query probably groups by a stale `versionId`).
- Suggested fix: Snapshot on save with debounce (e.g. every 5 min of edits and on publish/archive/title change), and keep the Compare list in sync.
- Acceptance check: Make 3 edits separated by a publish → History lists ≥3 versions newest-first; Restore on version 1 brings back the first content and creates a new version.

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

### KB-B-011: Public share link works anonymously, and revoke works (verified) — PASS (recorded for coverage)
- Severity: n/a (pass). Route: /knowledge/wiki/doc/1 → Share page → Public → link `https://www.streamlineos.in/wiki/<token>`.
- Evidence: Anonymous curl (no session) → HTTP 200, page title and body text visible, no login form. After switching back to Private → HTTP 404 with no body. Public exposure window was ~4 minutes; the test article was returned to Private immediately.
- Note: the link shows as a full-width tokenised URL; the token is not included in this report.

## Page: Search (/knowledge/wiki/search)

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

### KB-B-013: Search does not match partial words or prefixes
- Severity: Low (product decision; flagged so the team can confirm the intended behaviour)
- Route: /knowledge/wiki/search?q=QA101
- Actor: org owner
- Steps: 1) With the article "QA1015 XSS …" present, search "QA1015 XSS" → 1 result (works). 2) Search "QA101" → "No results / Try a different query or clear your filters."
- Expected (if prefix search is intended): the page with "QA1015" in its title appears. Exact-token search works; prefix does not.
- Actual: "No results".
- Impact: Users who remember part of a word get nothing; the empty state does not suggest adjusting the query.
- Likely code area: full-text index query (token match, no prefix operator `*`).
- Suggested fix: Use prefix matching for the last token (`QA101*` / ngram index) or document that search is whole-word only and say so in the empty state.
- Acceptance check: "QA101" finds "QA1015 XSS …"; "QA1015 XSS" still ranks it first.

### KB-B-014: Search result snippet cuts the closing ">" from special-character matches
- Severity: Low
- Route: /knowledge/wiki/search?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E
- Steps: Search `<img src=x onerror=alert(1)>` → 1 result. The snippet reads `img src=x onerror=alert(1` (closing `>` and leading `<` missing).
- Expected: The snippet shows the matched text as written, escaped (e.g. `&lt;img src=x onerror=alert(1)&gt;`).
- Actual: Snippet truncated; no script executed (XSS safe). Result is correctly rendered as text.
- Likely code area: snippet highlighter strips angle brackets as tags.
- Suggested fix: Escape the snippet before highlighting; don't treat `<` as HTML.

## Page: Spaces list (/knowledge/wiki/spaces) — space edit / archive

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

### KB-B-016: "Restore" on an archived space has no effect (space stays archived)
- Severity: High (archived content cannot be brought back from the UI)
- Route: /knowledge/wiki/spaces?status=archived → card "Restore"
- Actor: org owner
- Steps: 1) On /knowledge/wiki/spaces, choose Archive for "📚 QA1015 Space A" and confirm "Archive" (dialog text: "Archiving … will hide it from users. Pages and content are preserved and can be restored."). 2) Filter Status = Archived. 3) Click "Restore" on the card. 4) Wait 5 s; reload the page with the Active filter.
- Expected: Card leaves the Archived list; Active list shows "QA1015 Space A"; a toast "Space restored" appears.
- Actual: No dialog, no toast, no visible change. Reload with Active filter → "No spaces yet". Archived filter still lists the space ("Updated 1m ago"). Tried twice.
- Impact: Data appears lost to members; the copy promises restore.
- Likely code area: spaces restore endpoint / archived-status toggle (the "Restore" action likely calls archive again or sends the wrong status).
- Suggested fix: Verify the restore request/status value (`archived` → `active`); refetch both filters after success; show a toast on success or failure.
- Acceptance check: Archive → Restore → space is back in Active with its 1 page and member count unchanged; Archived filter no longer lists it.

## Performance (cross-page)

### KB-B-017: Space detail and article editor show skeleton placeholders for 5–15 s on every open
- Severity: Medium
- Route: /knowledge/wiki/spaces/1, /knowledge/wiki/doc/1, /knowledge/wiki/doc/1/history, /knowledge/wiki/trash, /knowledge/wiki/spaces (after reload)
- Actor: org owner
- Steps: Open each route fresh (full page load) on the signed-in session and time until the title/body appears.
- Expected: Header and title within ~2 s; the editor usable within ~3 s.
- Actual: Space detail: breadcrumb shows "Space Space" (placeholder text) and grey skeleton blocks for ~5–8 s before the name "QA1015 Space A" appears. Article: sidebar "Untitled" and empty editor for 10–15 s after "New page". History page: skeleton for ~10 s. Wiki search results: "Loading results…" for 5–15 s with no results.
- Impact: Users re-click and create duplicates; looks broken.
- Likely code area: client data fetching waterfalls (space → pages → members) and missing cached header data; lazy editor bundle.
- Suggested fix: Render the header from the list payload, parallelise requests, and show a real progress state after 1 s.
- Acceptance check: Lighthouse-style timing or manual stopwatch: space detail name visible in ≤2 s on a warm session.

## Page: Wiki home (/knowledge/wiki) — create

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


## Page: Import & Export (/knowledge/wiki/import)

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

## Page: Share dialog (/knowledge/wiki/doc/:id → "Share page") — round 1 continuation (QA1015)

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

## Page: Public share page (https://www.streamlineos.in/wiki/:token — anonymous view)

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

## Page: Comments panel (/knowledge/wiki/doc/:id → More options → Comments)

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

### KB-B-023: Comments panel shows an empty list (no loading state) for ~10 s before existing comments appear
- Severity: Medium
- Route: /knowledge/wiki/doc/1 → More options → Comments (after a full page load)
- Actor: org owner
- Steps: Reload /knowledge/wiki/doc/1, open More options → Comments, and read the panel for 10 s.
- Expected: A loading indicator in the panel for a moment, then the existing comments within ~2 s.
- Actual: The panel shows the header, "Discuss this page…" and the "Post comment" box with no list and no spinner. Existing comments ("QA1015 comment test …") appear only after about 10–15 s. A user would read this as "no comments".
- Impact: Users think their discussion is gone and may post duplicates; same class of issue as KB-B-017.
- Likely code area: comments query waits behind the page query waterfall; no pending state rendered in the panel.
- Suggested fix: Render a skeleton/spinner in the panel while the comments query is pending; fetch comments in parallel with the page.
- Acceptance check: Open Comments on a warm session: existing comments listed within 2 s, or a visible loading state before that.

## Page: Templates (/knowledge/wiki/templates) and template-created articles

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

## Page: Ask KB (/knowledge/chat)

### KB-B-027: Ask KB answer is vague and its Sources list includes an empty page and duplicates
- Severity: Medium (answer quality and trust cues)
- Route: /knowledge/chat → question "What is the QA1015 Article One page about?" (Scope: default)
- Actor: org owner (adityachalla01)
- Steps: 1) Open Ask KB. 2) Ask "What is the QA1015 Article One page about?". 3) Wait for the answer and read Sources.
- Expected: A direct answer that uses the page text (the page has two plain paragraphs: "QA1015 first paragraph of body text." and "Second paragraph with bold text."), and sources that point to pages with real content only, each listed once.
- Actual: Answer is generic ("provides an introduction and key information related to the QA1015 topic… further detailed content… is not provided") even though the body is short and readable. Sources list "QA1015 Article One", "QA1015-import-xss", "FAQ", and "QA1015 Article One" again. "QA1015-import-xss" and "FAQ" show no body text in the editor (see KB-B-019 and KB-B-024), so they cannot support an answer.
- Impact: Answers look unreliable; users cannot tell which source actually supports the answer; duplicate citations clutter the list.
- Likely code area: retrieval indexes pages whose stored body is not rendered (import and template bodies) and does not de-duplicate sources; answer prompt is given only titles/summaries.
- Suggested fix: Index the same body the editor shows; de-duplicate citations per page; show the cited passage under each source; flag pages with no readable body.
- Acceptance check: The same question returns a direct answer quoting the first paragraph; each page appears once in Sources; empty pages are not cited.

## Page: Trash (/knowledge/wiki/trash)

### KB-B-028: "Purge" (permanent delete) fails with a server error for pages that have content; only empty pages can be purged
- Severity: High (cannot permanently remove deleted pages with content; data-retention and cleanup requirement)
- Route: /knowledge/wiki/trash → select row(s) → "Purge N" → "Delete Forever"
- Actor: org owner (adityachalla01)
- Steps: 1) Move 5 QA1015 pages to trash (FAQ, QA1015-import-xss, two empty Untitled, QA1015 Article One). 2) On Trash, select all → "Purge 5" → "Delete Forever". 3) Retry with each row alone.
- Expected: Selected pages are removed permanently with a success message; rows disappear.
- Actual: Bulk purge shows the red toast "Something went wrong on our end. Please try again shortly." and no rows are removed. Single-row purge fails the same way for "QA1015 Article One", "FAQ" and "QA1015-import-xss" (each tried, retried once). The two empty "Untitled" pages purged fine (rows removed, no toast). Console: 500 on `/kb/pages/trash/purge` (three times for the bulk attempt). No success toast is shown on the successful single purges either.
- Impact: Deleted content (including test data and any sensitive text) cannot be permanently removed from the UI; trash retention (30 days) is the only path.
- Likely code area: trash purge handler fails when a page has related rows (versions, comments, attachments/media records, template links, or search index entries) — the cascade or the index removal throws.
- Suggested fix: Return the real failing step in logs, make purge cascade or soft-delete related rows, and return a per-row error message; show a success toast on purge.
- Acceptance check: Purge a page that has versions, a comment and an inserted image → the row disappears and the page cannot be opened by URL; response is 200 and the toast says "Permanently deleted".
