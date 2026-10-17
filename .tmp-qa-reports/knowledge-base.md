# Knowledge base — still to do

Completed items were removed after a check of the frontend on 17 Oct 2026.
What is left was still open, only partly fixed, or could not be confirmed because this repo has no backend.
Same defect filed under two IDs is listed once.
This file is the remaining knowledge-base work. Duplicate and finished reports were removed. Skip any ID that is not listed below.

## Remaining bugs

### KB-B-004 — OPEN

Space "New page" drops the space, and the Page settings "Owner" field is blank even though the space owner is set

Latest report note: Page Owner blank in Page info: STILL OPEN | doc/6 and doc/7 (created by adityachalla01): Page settings → Owner = "Select owner…" while header says "Updated … by adityachalla01" and space header says "Owner: adityachalla01".

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

### KB-B-008 — PARTIAL

Slash menu, toolbar and image blocks: inserted images render at full column width and very tall (UX-level bug)

Latest report note: Inserted images render at full column width and very tall: STILL OPEN | valid-image-0913.png (64×64 source) inserted on doc/8 → rendered box 662 px wide × 497 px tall. No max-height, no resize handles seen.

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

### KB-B-009 — UNKNOWN

Version history records only one version; earlier edits are unrecoverable and "Restore" cannot be exercised

Latest report note: Version history records only one version: STILL OPEN | doc/6 (created this round, edited many times, Draft → Published, visibility changed Team → Public → Private): /doc/6/history shows "VERSIONS (1) · Version 1 · Current · adityachalla01 · 6m ago" only. Publish did not add a version.

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

### KB-B-013 — UNKNOWN

Search does not match partial words or prefixes

Latest report note: Search does not match partial words or prefixes: STILL OPEN | `?q=QA1015R2` → 1 result (Nested Parent). `?q=QA101` → "No results · Try a different query or clear your filters." (no prefix hint).

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

### KB-B-017 — OPEN

Space detail and article editor show skeleton placeholders for 5–15 s on every open

Latest report note: 5–15 s skeletons on open: STILL OPEN | Observed: Spaces list and Trash skeletons for several seconds; imported page doc/10 showed a skeleton for 20+ s on first navigation, then loaded; Wiki home and Templates similar.

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

### KB-B-027 — PARTIAL

Ask KB answer is vague and its Sources list includes an empty page and duplicates

Latest report note: Ask KB answer vague; Sources list includes empty page and duplicates: PARTIAL | /knowledge/chat "What is the QA1015R2 Nested Parent page about?" → answer now uses body text ("starts with a first paragraph of body text", names the inserted image) — better. Sources still list "QA1015R2-import-xss" (no readable body) and each of "QA1015R2 Nested Parent" and "QA1015R2-import-xss" twice (duplicates).

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

### KB-B-028 — UNKNOWN

"Purge" (permanent delete) fails with a server error for pages that have content; only empty pages can be purged

Latest report note: Purge (permanent delete) fails with server error for pages with content: STILL OPEN | Trash → "Purge 1" → "Delete Forever" on FAQ (R1 row) → toast "Something went wrong on our end. Please try again shortly." row stays. Same on a round-2 page doc/8 (≈11 KB body, inserted image, 1 comment, moved under a parent, trashed then purged) → same error. Only empty Untitled pages purged in R1.

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

### KB-B-030 — OPEN

Move page → "Move here" shows "server sent data this screen does not understand", dialog stays open, sidebar not updated (the move did happen)

- Severity: **High** (users retry the move, get no confirmation, and cannot tell whether it worked; same contract-mismatch family as KB-B-002/025)
- Route: /knowledge/wiki/doc/8 → More options → Move → search "QA1015R2 Nested" → select "QA1015R2 Nested Parent" → "Move here"
- Actor: org owner (adityachalla01)
- Source: Run A
- Steps: 1) Open a top-level page (doc/8, "Untitled"). 2) More options → Move. 3) Type "QA1015R2 Nested" and select the parent row. 4) Click "Move here". 5) Wait 10 s. 6) Reload the page.
- Expected: Dialog closes, toast "Page moved", the sidebar shows the page under "QA1015R2 Nested Parent", breadcrumb updates.
- Actual: Dialog stays open with the parent still listed; no toast; sidebar still shows doc/8 at root. Console: `ApiContractError CONTRACT_VIOLATION` on `POST /kb/pages/8/move` (HTTP 200) with issue `success: Invalid input: expected boolean, received undefined` (correlation id a3cbd948-9107-414d-8ccf-dcc0e22636b4; 3 more attempts logged the same error). After a reload the move is in place: breadcrumb "Wiki › QA1015R2 Nes… › Untitled" and the parent is collapsed in the sidebar. Repeating Move would re-run a server move.
- Impact: Users believe the move failed and retry; the UI shows a red error for a successful operation; the dialog is left open. Nested-page reorganisation is hard to trust.
- Likely code area: `/kb/pages/:id/move` response schema on the client (expects `success: boolean`; server returns 200 with the page/no `success` field); move mutation's onError still runs after 2xx; dialog not closed/invalidated on success.
- Suggested fix: Align the move response with the client schema (return `{ success: true, ... }` or drop the field from the client schema); on 2xx close the dialog, invalidate the page tree and breadcrumb queries, and show "Page moved".
- Acceptance check: Move doc/8 under "QA1015R2 Nested Parent" → dialog closes, toast "Page moved", sidebar shows the child under the parent without reload, no console contract error.

## UX notes that are not done

### Must change
- **Version history does not keep history; restore has no success toast** (KB-B-009 + note): Only “Version 1 · Current” appears after many autosaves/publish, so Restore cannot be exercised. After a real restore, show a success toast.
- **No space delete control** (note): Spaces only offer Archive and Restore. There is no permanent delete for a space (including archived QA1015 Space A).
- **Trash Purge fails for pages with content** (KB-B-028): Bulk and single purge 500 for FAQ, QA1015-import-xss, QA1015 Article One; only empty Untitled pages purge. No success toast on the ones that do succeed.
- **Move does not move between spaces** (note / coverage intent): “Move” only reparents under a page, not between spaces. Space assignment still requires Page info → Space.
- **Skeleton / load times of 5–15 s** (KB-B-017 + note): Space detail, editor, history, trash, search, and comments show long skeletons or empty states; users re-click and create duplicates.

### Good to have
- **Page Owner blank in Page info** (KB-B-004): Combobox shows “Select owner…” while header/space show the creator.
- **Inserted images render huge with no resize** (KB-B-008): 64×64 PNG becomes ~662×662; tall empty placeholder before load; no resize/align controls.
- **Search is whole-word only** (KB-B-013): “QA101” misses “QA1015…”; empty state does not explain prefix behaviour.
- **Ask KB answer quality and Sources** (KB-B-027): Vague answer; Sources include empty import/template pages and duplicate the target page.

### Must change
- Wiki-level crash: Templates and Space detail replace the whole Wiki view with "Something went wrong" and remove the sidebar (KB-B-030, KB-B-031, KB-B-025). Scope error boundaries to the content pane.
- Trash purge: content pages fail with a generic "Something went wrong on our end" and the row stays (KB-B-028). Show the reason and a retry path.
- Version history: only one version after many saves and a publish (KB-B-009).

### Good to have
- Space cards created without an icon show no icon; offer a default icon.
- Breadcrumb should show the space name.
- Insert-and-format popover closes when its own button is clicked again.
- Inserted images cap at column width with max height (KB-B-008 still 662 px wide).
- Ask KB Sources: de-duplicate, hide pages with no readable body (KB-B-027).
- Search empty state: suggest prefix/whole-word hint (KB-B-013).
- Skeleton waits of 5–20 s on Space detail, Trash and imported pages (KB-B-017).

### Must change
- **Slash menu loses typing and leaves a "/" behind** (KB-B-005, KB-B-030): fix the keyboard flow and strip the `slash_input` node.
- **Version history keeps one version** (KB-B-009): add snapshots on save/publish so Restore is usable.

### Good to have
- **Owner blank in Page settings** (KB-B-004): default to the creator.
- **Inserted images render at 662 px square** (KB-B-008): cap width/height and add resize.
- **Long loading skeletons** (KB-B-017): space detail and history show placeholders for seconds; show a header from the list payload.

### Must change
- **False "server sent data this screen does not understand" after Create/Save/Move** (KB-B-002 intermittent, KB-B-015 PARTIAL, KB-B-030): the sheet/dialog stays open after the record is saved; users re-submit. Close the sheet/dialog and refetch on 2xx; align response schemas.
- **Trash purge of content pages** (KB-B-028): fails with a generic "Something went wrong on our end" and the row stays. Show the reason and a retry path.
- **Version history keeps one version** (KB-B-009): add snapshots on save/publish so Restore is usable.

### Good to have
- **Owner blank in Page settings** (KB-B-004): default to the creator.
- **Space cards created without an icon show no icon**: offer a default icon.
- **Inserted images render huge (~662 px)** (KB-B-008): cap width/height and add resize handles.
- **Ask KB Sources**: de-duplicate, hide pages with no readable body (KB-B-027 PARTIAL).
- **Search empty state**: suggest prefix/whole-word hint (KB-B-013).
- **Quick find (Ctrl+K)** should not hijack the editor's link shortcut (observation, to verify in round 3).
- **Insert-and-format popover** closes when its own button is clicked again.
- **Long loading skeletons** (KB-B-017): Space detail, Trash, history and imported pages show placeholders for seconds; show a header from the list payload where possible.
