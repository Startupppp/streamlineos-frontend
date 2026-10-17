# Knowledge Base — Round 2 QA (QA1015R2)

Tester: Grok Bot (computerUse subagent) on behalf of Aditya Challa (owner, org "ADitay CAhala"), signed-in session, one tab.
Started: Thu 2026-10-15 ~17:44 IST. Build of record: https://streamlineos.in (www.streamlineos.in) /knowledge/wiki.

> **Session caveat (affects confidence):** the single shared browser tab was observed changing on its own during this run
> (dialogs opened, a space was created with field values this tester did not type, a space was renamed, archived and restored
> by something other than this tester). Results below marked *(observed in shared session)* were seen on screen but not
> driven step-by-step by this tester; they are re-verified where noted. See COVERAGE.md.

## 1. Recheck of round-1 bugs (KB-B-001..028)

Legend: FIXED / STILL OPEN / PARTIAL / NOT RETESTED (reason) / BLOCKED (reason)

| ID | Title (short) | Status | Evidence (round 2) |
|----|---------------|--------|--------------------|
| KB-B-001 | Space create fails when Icon empty (`icon: ... received null`) | PARTIAL | Icon blank + Description filled ("QA1015R2 Space E", "QA1015R2 desc F", Internal) → created, sheet closed, no icon error; card shows no icon (no default icon). BUT Name-only (Icon AND Description blank) → toast `description: ... expected string, received null` + `icon: ... received null`; sheet stays open. Still blocks the default flow (see KB-B-026). |
| KB-B-002 | Space create false error "server sent data this screen does not understand" after save | FIXED (create with Icon + Description filled) | "QA1015R2 Space D" (icon 🧭, desc filled, Internal) → sheet closed, no error toast seen, exactly one card after reload. Note: the other Create paths still fail (KB-B-001/026), so the false-error path itself was not reproduced. |
| KB-B-003 | "New page" inside a space creates the article outside that space | PARTIAL | Space E (id 6, 0 pages) → header "New page" → /doc/7. Page info → Space now reads "QA1015R2 Space E" and the space Hierarchy/table lists "Untitled · Draft · just now", so the page is attached. BUT the editor breadcrumb still reads only "Wiki › Untitled" and the sidebar lists it at root. Space-level breadcrumb missing. |
| KB-B-004 | Page Owner blank in Page info | STILL OPEN | doc/6 and doc/7 (created by adityachalla01): Page settings → Owner = "Select owner…" while header says "Updated … by adityachalla01" and space header says "Owner: adityachalla01". |
| KB-B-005 | Slash menu swallows typing | STILL OPEN | doc/6: type "/" → menu opened; typed "bullet" did not filter the menu and did not appear in body; body shows a stray "/" and menu stayed open. |
| KB-B-006 | Upload failure toast shown although image inserted; duplicate-request leaks raw conflict message | NOT RETESTED (blocked: could not start a second identical upload while the first was in flight; the shared tab kept navigating) | Single upload of valid-image-0913.png on doc/8 → image inserted, no error toast seen. |
| KB-B-007 | Rejected .exe attachment fails silently | PARTIAL | doc/8 → Insert and format → Upload file → qa-test.exe → now shows a red toast `Upload failed: qa-test.exe` + `Unsupported file type: application/x-msdownload`. Silent failure fixed, but the message leaks a raw MIME type and does not list the allowed types (.pdf .doc(x) .xls(x) .ppt(x) .csv .txt .zip). |
| KB-B-008 | Inserted images render at full column width and very tall | STILL OPEN | valid-image-0913.png (64×64 source) inserted on doc/8 → rendered box 662 px wide × 497 px tall. No max-height, no resize handles seen. |
| KB-B-009 | Version history records only one version | STILL OPEN | doc/6 (created this round, edited many times, Draft → Published, visibility changed Team → Public → Private): /doc/6/history shows "VERSIONS (1) · Version 1 · Current · adityachalla01 · 6m ago" only. Publish did not add a version. |
| KB-B-010 | Share dialog "Private" vs header "Team" mismatch | FIXED (doc/6, new page) | Fresh page doc/6 (created this round): header badge "Team" and Share menu checkmark on "Team · Org members" at the same time. Mismatch not reproduced. |
| KB-B-011 | Public share link works anonymously; revoke returns 404 (PASS in R1) | PASS (re-verified) | doc/6 (round-2 page): Public → anonymous curl HTTP 200 (page title and text in HTML) → Private → anonymous curl HTTP 404. Token not recorded here. |
| KB-B-012 | Search query over 200 characters crashes the whole Wiki view | STILL OPEN | /knowledge/wiki/search, typed "lorem ipsum " × 25 (300 chars): input accepted 300 chars (no maxlength); after load the whole Wiki view was replaced by "Something went wrong — Failed to load the wiki. Please try again." with "Try again"; sidebar gone. |
| KB-B-013 | Search does not match partial words or prefixes | STILL OPEN | `?q=QA1015R2` → 1 result (Nested Parent). `?q=QA101` → "No results · Try a different query or clear your filters." (no prefix hint). |
| KB-B-014 | Search snippet strips `<`/`>` | NOT RETESTED (pending) | |
| KB-B-015 | Space rename does not persist | FIXED (observed; re-verify) | Space renamed "QA1015R2 Space A" → "QA1015R2 Space A edited"; after navigation the Active card shows the new name and "Updated just now" (and "1 page" after the page move). Own Edit→Save test still to run. |
| KB-B-016 | Archived space Restore is a no-op | FIXED (observed in shared session; re-verify) | Archived "QA1015R2 Space A edited" → Archived filter → Restore → confirm → card returned to Active list with no reload needed to see it. |
| KB-B-017 | 5–15 s skeletons on open | STILL OPEN | Observed: Spaces list and Trash skeletons for several seconds; imported page doc/10 showed a skeleton for 20+ s on first navigation, then loaded; Wiki home and Templates similar. |
| KB-B-018 | Double-click on "New page" creates two untitled articles | STILL OPEN | Double-click on Wiki home "New page" → sidebar gained two new "Untitled" pages (doc/8 and doc/9) in addition to doc/7 (from Space E). Test rows kept for cleanup. Caveat: the shared tab was also being driven by another session. |
| KB-B-019 | Imported Markdown body does not render; title from filename | STILL OPEN | Re-imported `QA1015R2-import-xss.md` (H1 "QA1015R2 Import XSS", 1 paragraph, good link, javascript link, `<img onerror>`, `<script>`) with target "No space", Team, Skip duplicates → page doc/10 titled "QA1015R2-import-xss" (filename). Editor shows only "Start writing…" while the stats say Words 33. Recent imports still lists only the R1 job ("1 page · 1/1 pages · completed · 16h ago"); the new job does not appear. Search finds the page with snippet "Safe…". |
| KB-B-020 | Public page shows broken images | NOT RETESTED (inconclusive) | Anonymous curl of a public page with an inserted image returned HTTP 200 but no `<img>` in the server HTML, so the R1 broken-image symptom could not be confirmed or ruled out with curl. Needs an incognito visual check (not run: single-tab rule). |
| KB-B-021 | Share dialog stale after Public → Private | FIXED (doc/6) | doc/6 Public → "Private — Only you" selected: menu checkmark moved to Private, header badge changed to "Private" within the same view, share URL row disappeared (no reload). Toast was not caught in the snapshot. |
| KB-B-022 | Posted, edited and resolved comments do not appear until reload | PARTIAL | doc/8: "QA1015R2 comment A" posted → listed in panel within seconds with toast "Comment posted." (no reload). Resolve → card moved into "Resolved (1)" at once. Edit → Save: updated text confirmed only after the next action/reload (not visible in panel at first check). |
| KB-B-023 | Comments panel shows an empty list (no loading state) for ~10 s | FIXED (on doc/8) | Full reload of doc/8 → Comments opened in 0.26 s; existing comment listed ~0.8 s later. Not re-tested on the R1 page (doc/1, with more comments). |
| KB-B-024 | Page created with "Use" on a starter template shows empty editor | BLOCKED | Starters loads (FAQ card visible), but "Use" attempts (4) ended in the full-page error view (KB-B-030) before a page was created. Empty-editor symptom not observable this round. |
| KB-B-025 | Save as template reports failure; saved template crashes Templates view | STILL OPEN | Templates → "Saved" tab → whole Wiki view replaced by "Something went wrong / Failed to load the wiki" (sidebar gone). Reproduced 2x. Also see KB-B-030. "Save as template" re-test not run (blocked by the crash). |
| KB-B-003 | "New page" inside a space creates the article outside that space | PARTIAL | Space E (id 6, 0 pages) → header "New page" → /doc/7. Page info → Space now reads "QA1015R2 Space E" and the space Hierarchy/table lists "Untitled · Draft · just now", so the page is attached. BUT the editor breadcrumb still reads only "Wiki › Untitled" and the sidebar lists it at root. Space-level breadcrumb missing. |
| KB-B-004 | Page Owner blank in Page info | STILL OPEN | doc/6 and doc/7 (created by adityachalla01): Page settings → Owner = "Select owner…" while header says "Updated … by adityachalla01" and space header says "Owner: adityachalla01". |
| KB-B-005 | Slash menu swallows typing | STILL OPEN | Type "/" → menu opens; typed "heading 2" and "bullet" are not filtered and not inserted; the menu stays open. Clicking "Bullet List" converts the line to a bullet but the next typed text is lost. Stored content keeps a stray `slash_input` node (see KB-B-030). |
| KB-B-010 | Share dialog "Private" vs header "Team" mismatch | FIXED (doc/6, new page) | Fresh page doc/6 (created this round): header badge "Team" and Share menu checkmark on "Team · Org members" at the same time. Mismatch not reproduced. |
| KB-B-011 | Public share link works anonymously; revoke returns 404 (PASS in R1) | PASS (re-verified) | doc/6 (round-2 page): Public → anonymous curl HTTP 200 (page title and text in HTML) → Private → anonymous curl HTTP 404. Token not recorded here. |
| KB-B-021 | Share dialog stale after Public → Private | FIXED (doc/6) | doc/6 Public → "Private — Only you" selected: menu checkmark moved to Private, header badge changed to "Private" within the same view, share URL row disappeared (no reload). Toast was not caught in the snapshot. |
| KB-B-026 | Space create with empty Description fails with raw validation message | STILL OPEN | "QA1015R2 Space E" with Icon 🧪 and Description blank, Audience Internal → toast `description: Invalid input: expected string, received null`; sheet stayed open; no record created. Reproduced twice. |
| KB-B-027 | Ask KB answer vague; Sources list includes empty page and duplicates | PARTIAL | /knowledge/chat "What is the QA1015R2 Nested Parent page about?" → answer now uses body text ("starts with a first paragraph of body text", names the inserted image) — better. Sources still list "QA1015R2-import-xss" (no readable body) and each of "QA1015R2 Nested Parent" and "QA1015R2-import-xss" twice (duplicates). |
| KB-B-028 | Purge (permanent delete) fails with server error for pages with content | STILL OPEN | Trash → "Purge 1" → "Delete Forever" on FAQ (R1 row) → toast "Something went wrong on our end. Please try again shortly." row stays. Same on a round-2 page doc/8 (≈11 KB body, inserted image, 1 comment, moved under a parent, trashed then purged) → same error. Only empty Untitled pages purged in R1. |

## 2. New bugs (KB-B-029 onward)

(sections follow, grouped by page)


## Page: Article editor (/knowledge/wiki/doc/:id) — new

## Page: Templates (/knowledge/wiki/templates)

### KB-B-030: Typed "/" stays in the body as a stray `slash_input` node and is saved and published to the public page
- Severity: Medium (junk text and an internal node type persist in saved and published content)
- Route: /knowledge/wiki/doc/6 → body → type "/" → menu opens → Escape or click elsewhere → Publish
- Steps: 1) Type "QA1015R2 first paragraph" + Enter. 2) Type "/" and leave the menu open. 3) Publish the page. 4) Curl the public share URL (anonymous).
- Expected: A lone "/" is removed (or never saved) when the slash menu is dismissed; published HTML contains only the paragraph.
- Actual: The published page's embedded JSON contains `{"type":"slash_input", ...}` node with the text "/" (renders as "/" in the body, and a bullet after the Bullet List click). The editor body after reload shows "/" and extra empty lines.
- Impact: Public readers can see stray slash characters; search and Ask KB index the junk.
- Likely code area: slash-command extension leaves its input node in the document on dismiss (no removal on Escape/blur); serialiser does not strip `slash_input` before publish.
- Suggested fix: On Escape/blur/selection change remove the `slash_input` node (replace with its text or delete it); exclude `slash_input` in the publish/serialise step.
- Acceptance check: "/" then Escape → no "/" remains in the editor or published JSON; curl of the public page contains no "slash_input".

## Page: Space detail (/knowledge/wiki/spaces/:id)

### KB-B-031: Share dialog opens with "Private" active for a Public page (and no active option after switching to Public)
- Severity: Medium (same family as KB-B-010; access state misread)
- Route: /knowledge/wiki/doc/6 → "Share page"
- Steps: 1) With the header badge "Public" (after Publish), open "Share page". 2) Read the active option. 3) Click "Public — Anyone with link" and read the dialog again.
- Expected: The active option is "Public" and the share link row is shown.
- Actual: On open, "Private — Only you" is aria-active. After clicking Public, the dialog shows the link row but no option is marked active.
- Impact: Owner cannot confirm which audience is live from the dialog.
- Likely code area: share dialog reads a different field than the header; the active-state selector is not derived from the same visibility value.
- Suggested fix: One `visibility` value drives badge, dialog active state and the link row (see KB-B-010).
- Acceptance check: Public page → dialog opens with Public active and the link row visible; switching to Private removes the link row and marks Private.

### KB-B-032: Public share link returns 404 for a Draft page while the Share dialog and badge say "Public"
- Severity: Medium (owner believes the page is public; readers get 404 with no explanation)
- Route: /knowledge/wiki/doc/6 (status Draft) → Share page → Public
- Steps: 1) Keep the page in Draft. 2) Share page → Public. 3) Copy the link and open it anonymously.
- Expected: Either the dialog warns "Publish the page to share it" / disables Public, or the link serves the page.
- Actual: The dialog shows the link and the badge reads "Public", but the anonymous request returns HTTP 404 until the page is published (verified: 404 while Draft, 200 after Publish).
- Impact: Shared links look live but do not work; support tickets likely.
- Likely code area: public route checks `status === published` while the share UI only checks `visibility`.
- Suggested fix: Block Public for Draft pages with a clear hint, or serve Draft public pages consistently and say so.
- Acceptance check: Draft + Public → dialog shows a hint and the link returns the same result the dialog implies (200 or blocked-in-UI).

## Page: Move dialog (/knowledge/wiki/doc/:id → More options → Move)

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

### KB-B-030: Templates view crashes to full-page "Something went wrong" (sidebar removed) — Starters "Use" and Saved tab both reproduce
- Severity: High (the whole Templates area is unusable; page creation from templates blocked)
- Route: /knowledge/wiki/templates (Starters → "Use" on FAQ; Saved tab)
- Actor: org owner (adityachalla01)
- Steps: 1) Open /knowledge/wiki/templates (loads, "Built-in skeletons ready to use", Starters). 2) Click "Use" on the FAQ card, or click the "Saved" tab. 3) Wait 5 s.
- Expected: A page "FAQ" is created with the template body, or the Saved list shows; sidebar stays.
- Actual: The entire Wiki layout is replaced by "Something went wrong — Failed to load the wiki. Please try again." with "Try again"; sidebar and top nav "Wiki" controls gone. Also observed: the Templates page sometimes flipped to this error on its own a few seconds after loading. Reload restores Starters. 4 "Use" attempts did not create a page.
- Impact: Starter templates and saved templates cannot be used; users see a generic failure and retry.
- Likely code area: the Wiki layout error boundary wraps all of `/knowledge/wiki`; templates list and "Use" (`page-templates` read + create) schemas mismatch (same family as KB-B-025 `content` array vs record); "Use" template→doc conversion.
- Suggested fix: Scope the error boundary to the Templates list (keep sidebar); fix the page-templates response schema; add a test that loads Starters and Saved and clicks Use.
- Acceptance check: Templates loads (Starters and Saved) with the sidebar visible for 2 minutes of tab switching; "Use" on FAQ opens a page with the FAQ headings.

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

## Page: Editor (/knowledge/wiki/doc/:id) — additional observations (not yet numbered as bugs)

- KB-B-032 (Low, to verify): Ctrl+K inside the article body opens the global Quick find instead of the link popover; pressing Enter then navigated to /me/time-off?create=1. Fix: scope the Quick find shortcut to outside editable fields, or bind link insert to Ctrl+K inside the editor.
- KB-B-033 (Medium, to verify): Link popover "Paste link" with a typed URL (`javascript:alert(3)`) did not create a link; the URL text was inserted into the body as plain text (doc/7). Re-test with a clean selection before filing.
- Space Edit sheet (to verify, possible data loss): on /knowledge/wiki/spaces, opening "Edit" on QA1015R2 Space D showed empty Description and Icon fields (placeholders) although the card shows the description and a 🧭 icon. If confirmed, saving would wipe them (same family as KB-B-015). Not confirmed in the final step.
- Renderer crashes: the tab crashed twice (on loading an imported page and on opening /knowledge/chat). Not reproduced; possibly memory from the shared tab. Recorded in COVERAGE.md.
