# Knowledge Base — Round 2 coverage, run B (QA1015R2)

Account: adityachalla01 (owner), org "ADitay CAhala", signed-in session, normal window. Single tab.
Window of run: Thu 2026-10-15 ~17:45–18:05 IST.

## Blocker: shared tab driven by a second run
- A second Grok Bot run (run A, same account, same browser tab, same ../round-2/ folder) was active the whole time.
- Observed effects: pages changed under run B mid-script (tool errors `page_changed`), URL moved to /knowledge/wiki/spaces, /doc/7, /doc/8, /search?q=lorem…, /search?q=<img…>, and new data was created that run B did not type: spaces "QA1015R2 Space D" (desc "QA1015R2 desc D"), "QA1015R2 Space E" (desc "QA1015R2 desc F"), several "Untitled" pages (doc/7, doc/8, doc/9).
- Run A overwrote ../round-2/BUGS.md after run B wrote its first version (run B's first table was replaced; run B's KB-B-030..032 text was appended into run A's file).
- Decision: run B stopped driving the shared tab at ~18:05 IST so it would not corrupt run A's data. Everything below is what run B itself did and saw.
- Not done by run B: anything after the upload checks (see "Not tested").

## Tested by run B (with evidence)
- Spaces: create with Name only (fail, KB-B-001/026); create with Name+Description+📚 (error toast, one record saved, KB-B-002); Edit sheet (blank fields, KB-B-029); rename + Save (persisted, error toast, KB-B-015 partial); Archive (confirm dialog) → Archived filter → Restore (confirm) → Active after reload (KB-B-016 fixed).
- Page creation from space detail: "New page" → doc/6, breadcrumb without space, sidebar at root, page attached to the space only after first save (KB-B-003 partial).
- Editor: title + paragraph; "/" menu filtering (KB-B-005 still open; stray slash_input stored, KB-B-030); Bullet List click (block applied, typed text lost).
- Page settings: Space field shows the space; Owner blank (KB-B-004); Publish (toast "Page published"); Verify control present.
- Share: Private / Team / Public option set; Public → badge Public, link row; anonymous request 404 while Draft, 200 after Publish; Private → 404 (KB-B-011 pass; KB-B-032, KB-B-031, KB-B-010, KB-B-021 partial).
- Version history (/doc/6/history): one version after ~8 saves + publish + visibility changes (KB-B-009 still open).
- Upload: two identical image uploads (one image inserted, error toast, KB-B-006/034); image size 662×662 (KB-B-008); .exe rejected with toast showing MIME (KB-B-007 partial / KB-B-033); valid PDF attach attempted but not confirmed (page changed during the step).
- Trash list viewed (/knowledge/wiki/trash): FAQ, QA1015-import-xss, QA1015 Article One present (R1 leftovers; not touched).

## Not tested by run B (reason: shared-tab interference from run A; not a product result)
- KB-B-012/013/014 search (run A reports them), KB-B-017 timings (only observed), KB-B-018 double-click New page (run A reports STILL OPEN; run B saw extra Untitled pages it did not create), KB-B-019 Markdown import (fixture ready: ../../../../generated-qa1015r2/QA1015R2-import-xss.md), KB-B-020 public images, KB-B-022/023 comments, KB-B-024/025 templates, KB-B-027 Ask KB, KB-B-028 purge.
- New-check list from the brief, not done by run B: nested pages (child pages / move), version restore (BLOCKED: one version only), large paste, links to deleted pages, <script> and javascript: links in content (fixture ready), search for new content, public share revoke on a template, templates (Use/Save), trash restore and permanent delete, space permissions (members, non-owner access).
- Non-owner / space-permission check: not run (needs a second account; only @sharklasers.com addresses may be used).

## Coverage gaps the parent should close
1. Run the rest in a single run (one agent on the account at a time), starting with KB-B-019 (import), KB-B-024/025 (templates, which also tests the Templates page crash), KB-B-028 (purge), KB-B-012 (search), KB-B-022 (comments).
2. Restore on history needs ≥2 versions; re-check after KB-B-009 is fixed or after a few more saves in a clean run.
3. Permissions check needs a second account with a @sharklasers.com address.

## Screenshots
- Run B's browser screenshots are not saved to the reports folder: the browser tool writes them to its own asset store, which the shell cannot read. Evidence is recorded as text in BUGS-run-b.md instead.
