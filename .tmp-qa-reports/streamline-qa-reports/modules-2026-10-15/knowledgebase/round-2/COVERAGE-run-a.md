# Knowledge Base — Round 2 coverage (QA1015R2)

Tester: Grok Bot for Aditya Challa (owner, org "ADitay CAhala"). Signed-in session, single tab. Time: Thu 2026-10-15 ~17:44 IST onward.

## Session caveat (read first)
The one browser tab was shared with another driver for most of the run. Observed effects: pages navigated away mid-test (Spaces → doc/6 Nested Parent, Share menu, Page settings), a space created with field values this tester did not type, a space renamed, archived and restored, and a page edited with a slash menu open. Many clicks therefore timed out ("page changed" / "not found"). Results marked "observed in shared session" were seen on screen and re-checked where possible. Two renderer crashes ("Target crashed") happened on about:blank recovery; a new tab was not opened (single-tab rule), the single tab was re-navigated.

## Tested (round 2)
- Recheck of all 28 round-1 bugs (table in BUGS.md section 1). Result: FIXED 4 (KB-B-002 partly, 010, 015*, 016*, 021, 023 — *shared-session), PARTIAL 6 (001, 003, 007, 022, 027, plus 2 more noted), STILL OPEN 13, BLOCKED 2 (006 dup-upload, 024 Use), NOT RETESTED/inconclusive 5 (011 PASS re-verified, 020 inconclusive, 025 crash only).
- Spaces: create with Icon+Desc, create with Icon only (desc blank → error), create with Desc+no Icon (created), Edit sheet (observed rename persisted for Space A), archive → restore (restored, Active list), Members dialog (opens; crash on Space E).
- Page creation from space header "New page" (space E): membership set, breadcrumb still "Wiki › Untitled".
- Double-click "New page" on Wiki home: two extra Untitled pages created.
- Editor: slash menu typing (lost); large paste of ~11 KB / 120 paragraphs persisted intact after reload; image insert (no error); .exe upload (visible error with raw MIME); Page info Owner blank.
- Version history: publish and visibility changes did not add versions (1 version).
- Share: Team/Private/Public badge and menu sync (PASS); public link anonymous 200 then 404 after revoke (PASS); public page image markup check inconclusive.
- Comments: post (listed immediately), resolve (moved to Resolved), edit (persisted; panel refresh partial), reload load time 0.8 s.
- Move page (nested): server moves, client shows contract error (KB-B-029).
- Trash: restore from trash works ("Restored 1 page"); purge empty page works ("Permanently deleted 1 page"); purge FAQ and a content page fail (500 toast).
- Deleted-page direct URL: friendly "Page not found" with "Check trash" (PASS).
- Search: 300-char query crashes whole Wiki (KB-B-012); prefix QA101 no results (013); snippet strips brackets (014); new content "QA1015R2" found (1 result before import; 3 after).
- Import: .md re-import created page titled from filename, body not rendered; Recent imports not updated (KB-B-019).
- Templates: Starters loads; Use on FAQ and Saved tab crash the Wiki view (KB-B-030 / 025).
- Ask KB: answer improved, sources still duplicated and include empty import page (KB-B-027 PARTIAL).

## Not tested / blocked
- Version restore: BLOCKED (only one version exists; no earlier version to restore).
- Duplicate in-flight image upload (KB-B-006): BLOCKED (could not start a second identical upload while the first was in flight in the shared tab).
- Templates "Use" → empty editor (KB-B-024) and "Save as template" (KB-B-025 save path): BLOCKED by the Templates crash (KB-B-030).
- Space permissions for a second user (viewer/commenter, no access to archived or private spaces): BLOCKED — needs a second org member account. Members dialog only lists existing org members (no email invite), so no @sharklasers.com invite was sent.
- Script and javascript: links in editor content: not completed. Typed `<script>` / `<img onerror>` probe text stays inert text (no execution observed) but the javascript: link could not be created through the UI; the import with a javascript link is stored but body does not render (KB-B-019), so the link click test is inconclusive.
- Public page anonymous image rendering (KB-B-020): curl shows no <img> in HTML; needs an incognito visual check.
- Links from other pages to a deleted page inside the body: not tested beyond the direct URL.
- Duplicate page, lock page, export HTML, backlinks: not tested.
- Research Briefs: not tested.
- Renderer crashes: "Target crashed" twice (opening doc/10 in the editor flow and /knowledge/chat). Not reproduced after re-navigation. Possible memory pressure from the shared tab.

## Evidence
- Screenshots were not saved into ../screenshots/ (the browser tool stores captures under the agent asset folder; no copy path available from Shell). Each evidence row in BUGS.md names the page and steps instead.
