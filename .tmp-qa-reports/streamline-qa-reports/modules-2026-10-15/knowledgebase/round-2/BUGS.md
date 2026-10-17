# Knowledge Base — Round 2 QA (merged runs A + B, QA1015R2)

Testers: two parallel Grok Bot runs (run A and run B) on behalf of Aditya Challa (owner, org "ADitay CAhala"), same signed-in account.
Window: Thu 2026-10-15 ~17:44–18:05 IST. Build of record: https://streamlineos.in (www.streamlineos.in) /knowledge/wiki.

> **Shared session caveat (affects confidence):** both runs drove **one shared browser tab**. Dialogs opened, spaces were created/renamed/archived/restored, and pages navigated under each other mid-test. Results marked *(observed in shared session)* were seen on screen but were not always driven step-by-step by a single tester. **Items marked "observed in shared session" should be re-verified in round 3** under a single exclusive session. Source files kept as `*-run-a.md` and `*-run-b.md`.

## 1. Recheck of round-1 bugs (KB-B-001..028)

Legend: FIXED / STILL OPEN / PARTIAL / PASS / NOT RETESTED (reason) / BLOCKED (reason)

Where runs disagree, the more evidenced status is kept and both are noted.

| ID | Title (short) | Status | Evidence (round 2, merged) |
|----|---------------|--------|----------------------------|
| KB-B-001 | Space create fails when Icon empty (`icon: ... received null`) | PARTIAL | Both runs: Name-only (Icon AND Description blank) → toast `description: … received null` + `icon: … received null`; sheet stays open. Run A: Icon blank + Description filled → created, sheet closed, no icon error; card shows no icon (no default). Still blocks the default/name-only flow (see KB-B-026). |
| KB-B-002 | Space create false error "server sent data this screen does not understand" after save | STILL OPEN (intermittent) | **Disagree.** Run B: Name+Description+📚 → red toast "The server sent data this screen does not understand…", sheet stayed open; reload showed exactly one saved space (no duplicate). Run A: later create with Icon+Description → sheet closed, no error toast. Behaviour differs between creates; treat as intermittent until round-3 re-verify. Other Create paths still fail (KB-B-001/026). |
| KB-B-003 | "New page" inside a space creates the article outside that space | PARTIAL | Both runs: space header "New page" → new doc; breadcrumb stays "Wiki › …" (no space); sidebar lists at root. Page is attached (Page settings → Space; space card page count updates) — Run B notes attachment only after first save; Run A saw Space E Hierarchy list the Untitled. Space-level breadcrumb still missing. |
| KB-B-004 | Page Owner blank in Page info | STILL OPEN | Both: doc/6 (and Run A also doc/7) → Page settings → Owner = "Select owner…" while header says "Updated … by adityachalla01". |
| KB-B-005 | Slash menu swallows typing | STILL OPEN | Both: "/" opens menu; typed "heading 2" / "bullet" do not filter or insert; "/" stays in body; menu stays open. Clicking "Bullet List" converts the line but next typed text is lost. Stored content keeps a stray `slash_input` node (see KB-B-033). |
| KB-B-006 | Upload failure toast shown although image inserted; duplicate-request leaks raw conflict message | STILL OPEN | **Disagree on retestability.** Run A: NOT RETESTED (blocked — could not start a second identical upload in the shared tab); single upload OK. Run B: two `setInputFiles` of valid-image-0913.png → toast "Upload failed: … A matching request is already in progress; retry shortly"; exactly one image inserted. Kept STILL OPEN on Run B evidence. |
| KB-B-007 | Rejected .exe attachment fails silently | PARTIAL | Both: qa-test.exe → red toast `Upload failed: qa-test.exe` + `Unsupported file type: application/x-msdownload`. Silent failure fixed, but message leaks raw MIME and does not list allowed types (.pdf .doc(x) .xls(x) .ppt(x) .csv .txt .zip). |
| KB-B-008 | Inserted images render at full column width and very tall | STILL OPEN | Both: 64×64 valid-image-0913.png inserted → large rendered box. Run A measured 662×497 px; Run B measured 662×662 px. No max-height, no resize handles seen. |
| KB-B-009 | Version history records only one version | STILL OPEN | Both: /doc/6/history → "VERSIONS (1) · Version 1 · Current" after many saves, title change, Publish, and visibility changes. Restore BLOCKED (only one version). |
| KB-B-010 | Share dialog "Private" vs header "Team" mismatch | STILL OPEN | **Disagree.** Run A: FIXED on fresh doc/6 Team state (badge and menu both Team). Run B: STILL OPEN — after Publish, header badge "Public" while Share dialog opens with "Private — Only you" aria-active (reproduced on two opens). Kept STILL OPEN on Run B evidence; same family as KB-B-034. |
| KB-B-011 | Public share link works anonymously; revoke returns 404 (PASS in R1) | PASS (re-verified) | Both: after Publish, anonymous HTTP 200 with page title; after Private, anonymous 404. Token not recorded. |
| KB-B-012 | Search query over 200 characters crashes the whole Wiki view | STILL OPEN | Run A: /knowledge/wiki/search, ~300 chars → whole Wiki replaced by "Something went wrong — Failed to load the wiki"; sidebar gone. Run B: NOT RECHECKED. |
| KB-B-013 | Search does not match partial words or prefixes | STILL OPEN | Run A: `?q=QA1015R2` → 1 result; `?q=QA101` → "No results" (no prefix hint). Run B: NOT RECHECKED. |
| KB-B-014 | Search snippet strips `<`/`>` | NOT RETESTED (pending) | Neither run completed a dedicated recheck. |
| KB-B-015 | Space rename does not persist | PARTIAL | **Disagree.** Run A: FIXED *(observed in shared session)* — rename "QA1015R2 Space A" → "… A edited" persisted after navigation. Run B: PARTIAL — Edit sheet opens blank (KB-B-029); typing all three fields + Save → PATCH persisted after reload, but red "server sent data…" toast and sheet stayed open. Kept PARTIAL on Run B's own Edit→Save evidence. |
| KB-B-016 | Archived space Restore is a no-op | FIXED | Both confirmed restore returns the space to Active. Run A: *(observed in shared session; re-verify)*. Run B: Archive → Archived filter → Restore → Active after reload; no success toast (see KB-B-036 / UX). |
| KB-B-017 | 5–15 s skeletons on open | STILL OPEN | Both observed: Spaces list, space detail, Trash/search placeholders for several seconds. Run A: imported page doc/10 skeleton 20+ s on first navigation. |
| KB-B-018 | Double-click on "New page" creates two untitled articles | STILL OPEN | Run A: double-click Wiki home "New page" → two Untitled pages (doc/8, doc/9); caveat shared-session. Run B: NOT RECHECKED (saw extra Untitled pages it did not create). |
| KB-B-019 | Imported Markdown body does not render; title from filename | STILL OPEN | Run A: re-imported QA1015R2-import-xss.md → doc/10 titled from filename; editor "Start writing…" while Words 33; Recent imports not updated. Run B: NOT RECHECKED (fixture ready). |
| KB-B-020 | Public page shows broken images | NOT RETESTED (inconclusive) | Run A: anonymous curl of public page with image → HTTP 200 but no `<img>` in server HTML; needs incognito visual check (single-tab rule). Run B: NOT RECHECKED. |
| KB-B-021 | Share dialog stale after Public → Private | PARTIAL | **Disagree.** Run A: FIXED on doc/6 — checkmark, badge, and link row updated in same view (no reload); toast not caught. Run B: PARTIAL — toast "Visibility updated" and revoke work (anonymous 404); header badge changes ~1–2 s after toast; dialog active option unreliable (KB-B-010 / KB-B-034). Kept PARTIAL. |
| KB-B-022 | Posted, edited and resolved comments do not appear until reload | PARTIAL | Run A: post listed within seconds + toast; Resolve → Resolved (1) at once; Edit→Save text confirmed only after next action/reload. Run B: NOT RECHECKED. |
| KB-B-023 | Comments panel shows an empty list (no loading state) for ~10 s | FIXED | Run A: full reload of doc/8 → Comments opened in 0.26 s; existing comment listed ~0.8 s later. Not re-tested on R1 doc/1. Run B: NOT RECHECKED. |
| KB-B-024 | Page created with "Use" on a starter template shows empty editor | BLOCKED | Run A: Starters loads but "Use" attempts (4) ended in full-page error (KB-B-031) before a page was created; empty-editor symptom not observable. Run B: NOT RECHECKED. |
| KB-B-025 | Save as template reports failure; saved template crashes Templates view | STILL OPEN | Run A: Templates → "Saved" tab → whole Wiki "Something went wrong" (sidebar gone); reproduced 2×. "Save as template" path blocked by crash (KB-B-031). Run B: NOT RECHECKED. |
| KB-B-026 | Space create with empty Description fails with raw validation message | STILL OPEN | Both: Name + Icon with Description blank (or name-only) → toast `description: Invalid input: expected string, received null`; sheet stays open; no record. Run A reproduced twice. |
| KB-B-027 | Ask KB answer vague; Sources list includes empty page and duplicates | PARTIAL | Run A: answer now uses body text (improved); Sources still list empty import page and duplicates of Nested Parent / import-xss. Run B: NOT RECHECKED. |
| KB-B-028 | Purge (permanent delete) fails with server error for pages with content | STILL OPEN | Run A: Trash → Purge on FAQ (R1) and on round-2 doc/8 (content + image + comment) → toast "Something went wrong on our end…"; row stays. Empty Untitled pages purged OK in R1. Run B: NOT RECHECKED (trash list viewed only). |

### Recheck counts (merged)

| Status | Count | IDs |
|--------|------:|-----|
| FIXED / PASS | 3 | KB-B-011 (PASS), KB-B-016, KB-B-023 |
| PARTIAL | 7 | KB-B-001, 003, 007, 015, 021, 022, 027 |
| STILL OPEN | 15 | KB-B-002, 004, 005, 006, 008, 009, 010, 012, 013, 017, 018, 019, 025, 026, 028 |
| BLOCKED | 1 | KB-B-024 |
| NOT RETESTED | 2 | KB-B-014, 020 |

## 2. New bugs (KB-B-029 onward)

Deduped by meaning across runs A and B. Run B's "Edit space sheet blank fields" (High) confirms run A's unconfirmed note. Renumbered sequentially from KB-B-029. (Run B's duplicate-upload toast and .exe MIME copy issues fold into KB-B-006 / KB-B-007 PARTIAL above, not as separate IDs.)

## Page: Spaces list — Edit space sheet (/knowledge/wiki/spaces)

### KB-B-029: "Edit space" sheet opens with Name, Description and Icon blank
- Severity: **High** (a one-field edit fails; current values are not visible; saving can wipe fields)
- Route: /knowledge/wiki/spaces → card "Edit" on a space that has name, description and icon (e.g. "QA1015R2 Space A" / "QA1015R2 Space A edited", desc filled, 📚; also observed on Space D with 🧭)
- Confirmed by: Run B (full retest); Run A had this as an unconfirmed observation on Space D
- Steps: 1) Click "Edit". 2) Read Name, Description, Icon. 3) Optionally change only Name and click Save.
- Expected: All fields pre-filled with saved values; Audience = current audience. Changing only Name succeeds.
- Actual: Name, Description and Icon are empty (placeholders "Space name", "Optional description", "e.g. 📚"). Changing only the Name and clicking Save fails with `description: … received null; icon: … received null` (sheet stays open).
- Impact: Users cannot see what they edit; a rename needs all three fields re-typed; looks like Save does nothing (same family as KB-B-015).
- Likely code area: space edit form defaultValues (record not passed into the form, or form resets before the query resolves); PATCH payload sends null for empty optional fields (same as KB-B-001/026).
- Suggested fix: Initialise the form from the space record (`description ?? ""`, `icon ?? ""`); send empty optional fields as omitted or ""; keep the form in sync when the record loads.
- Acceptance check: Edit a space with description + icon → all three show the saved values; change only Name → Save → toast "Space updated", card shows the new name and the old description/icon.

## Page: Move dialog (/knowledge/wiki/doc/:id → More options → Move)

### KB-B-030: Move page → "Move here" shows "server sent data this screen does not understand", dialog stays open, sidebar not updated (the move did happen)
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

## Page: Templates (/knowledge/wiki/templates)

### KB-B-031: Templates view crashes to full-page "Something went wrong" (sidebar removed) — Starters "Use" and Saved tab both reproduce
- Severity: **High** (the whole Templates area is unusable; page creation from templates blocked)
- Route: /knowledge/wiki/templates (Starters → "Use" on FAQ; Saved tab)
- Actor: org owner (adityachalla01)
- Source: Run A (also blocks KB-B-024 / KB-B-025 save-path retest)
- Steps: 1) Open /knowledge/wiki/templates (loads, "Built-in skeletons ready to use", Starters). 2) Click "Use" on the FAQ card, or click the "Saved" tab. 3) Wait 5 s.
- Expected: A page "FAQ" is created with the template body, or the Saved list shows; sidebar stays.
- Actual: The entire Wiki layout is replaced by "Something went wrong — Failed to load the wiki. Please try again." with "Try again"; sidebar and top nav "Wiki" controls gone. Also observed: the Templates page sometimes flipped to this error on its own a few seconds after loading. Reload restores Starters. 4 "Use" attempts did not create a page.
- Impact: Starter templates and saved templates cannot be used; users see a generic failure and retry.
- Likely code area: the Wiki layout error boundary wraps all of `/knowledge/wiki`; templates list and "Use" (`page-templates` read + create) schemas mismatch (same family as KB-B-025 `content` array vs record); "Use" template→doc conversion.
- Suggested fix: Scope the error boundary to the Templates list (keep sidebar); fix the page-templates response schema; add a test that loads Starters and Saved and clicks Use.
- Acceptance check: Templates loads (Starters and Saved) with the sidebar visible for 2 minutes of tab switching; "Use" on FAQ opens a page with the FAQ headings.

## Page: Space detail (/knowledge/wiki/spaces/:id)

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

## Page: Article editor (/knowledge/wiki/doc/:id)

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

## Page: Spaces list — success feedback (/knowledge/wiki/spaces)

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

## Additional observations (not filed as new bugs — re-verify in round 3)

- **Ctrl+K in editor** (Low, to verify): Ctrl+K inside the article body opens the global Quick find instead of the link popover; pressing Enter then navigated to /me/time-off?create=1. Fix candidate: scope Quick find to outside editable fields, or bind link insert to Ctrl+K inside the editor. *(Run A)*
- **Link popover `javascript:` URL** (Medium, to verify): Link popover "Paste link" with typed `javascript:alert(3)` did not create a link; URL text was inserted as plain text (doc/7). Re-test with a clean selection before filing. *(Run A)*
- **Renderer crashes**: tab crashed twice (loading imported page / opening /knowledge/chat). Not reproduced; possibly memory from the shared tab. Recorded in COVERAGE.md.
- Run B's .exe raw-MIME copy and duplicate-upload toast findings are tracked under KB-B-007 PARTIAL and KB-B-006 STILL OPEN respectively (not separate IDs).

### New-bug counts

| Severity | Count | IDs |
|----------|------:|-----|
| High | 4 | KB-B-029, 030, 031, 032 |
| Medium | 3 | KB-B-033, 034, 035 |
| Low | 1 | KB-B-036 |
| **Total new** | **8** | KB-B-029..036 |
