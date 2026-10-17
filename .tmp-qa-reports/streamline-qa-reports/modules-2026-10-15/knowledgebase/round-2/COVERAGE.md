# Knowledge Base — Round 2 coverage (merged runs A + B, QA1015R2)

Account: adityachalla01 (owner), org "ADitay CAhala", signed-in session. Window: Thu 2026-10-15 ~17:44–18:05 IST.
Build: https://streamlineos.in /knowledge/wiki.

## Session caveat (read first)
**Both runs shared one browser tab** for most of the window. Observed effects: pages navigated away mid-test, spaces created/renamed/archived/restored by the other run, Untitled pages appearing that one run did not create, tool errors (`page_changed` / "not found"), and two renderer crashes ("Target crashed") on about:blank recovery. Run B stopped driving the tab at ~18:05 IST to avoid corrupting run A's data.

**Items marked "observed in shared session" in BUGS.md should be re-verified in round 3 under a single exclusive session.**

Source files: `*-run-a.md`, `*-run-b.md`. Merged recheck table and new bugs: `BUGS.md`.

## Recheck summary (merged — see BUGS.md §1)

| Status | Count |
|--------|------:|
| FIXED / PASS | 3 |
| PARTIAL | 7 |
| STILL OPEN | 15 |
| BLOCKED | 1 |
| NOT RETESTED | 2 |

Disagreements resolved toward the more evidenced status: KB-B-002 STILL OPEN (intermittent), KB-B-006 STILL OPEN (Run B), KB-B-010 STILL OPEN (Run B on Public), KB-B-015 PARTIAL, KB-B-021 PARTIAL.

## New bugs (merged — see BUGS.md §2)

8 unique new bugs after dedupe (KB-B-029..036):

| ID | Title | Severity |
|----|-------|----------|
| KB-B-029 | Edit space sheet opens with Name/Description/Icon blank | High |
| KB-B-030 | Move page "Move here" contract error; dialog stays open (move did happen) | High |
| KB-B-031 | Templates view crashes (Starters "Use" and Saved tab) | High |
| KB-B-032 | Space detail crashes (members endpoint object vs array) | High |
| KB-B-033 | Typed "/" stays as stray `slash_input` and is published | Medium |
| KB-B-034 | Share dialog marks Private active on a Public page | Medium |
| KB-B-035 | Public share link 404s for Draft while UI says Public | Medium |
| KB-B-036 | Restore/Archive of a space show no success toast | Low |

## Tested (union of both runs)
- Spaces: create Name-only (fail); create Name+Desc+icon (intermittent false error / clean close); create Desc without icon (created, no default icon); Edit sheet blank fields (KB-B-029); rename + Save (persists with toast/sheet issues); Archive → Restore (FIXED; no success toast).
- Page from space "New page": membership/space attachment (partial); breadcrumb without space; sidebar at root until save/reload.
- Double-click "New page" on Wiki home (Run A): two Untitled pages.
- Editor: slash menu (lost typing + slash_input); large paste ~11 KB persisted (Run A); image insert; duplicate in-flight image (Run B); .exe reject with raw MIME; Page info Owner blank; Publish; Verify control present.
- Version history: still one version after many saves + publish + visibility changes.
- Share: Team/Private/Public; Public while Draft → 404; after Publish → 200; Private → 404; dialog active-state mismatch on Public pages.
- Comments (Run A): post, resolve, edit (panel refresh partial); reload load ~0.8 s.
- Move page (Run A): server moves, client contract error (KB-B-030).
- Trash (Run A): restore works; purge empty works; purge content pages fail (KB-B-028). Run B: trash list viewed only.
- Deleted-page direct URL (Run A): friendly "Page not found" + "Check trash" (PASS).
- Search (Run A): 300-char crash; prefix miss; snippet/bracket pending; new content found.
- Import (Run A): .md title from filename, body not rendered; Recent imports stale.
- Templates (Run A): Starters loads; Use and Saved crash Wiki view.
- Ask KB (Run A): answer improved; sources still duplicated / include empty import page.
- Space detail members: Space E crashes (KB-B-032); Space A edited loads.

## Not tested / blocked
- Version restore: BLOCKED (only one version).
- Templates "Use" → empty editor (KB-B-024) and "Save as template" path: BLOCKED by Templates crash (KB-B-031).
- Space permissions for a second user: BLOCKED — needs a second org member (@sharklasers.com); Members dialog lists existing members only (no email invite).
- Public page anonymous image rendering (KB-B-020): curl inconclusive; needs incognito visual check.
- Script / javascript: links in editor: incomplete (import body does not render; UI link creation inconclusive).
- Duplicate page, lock page, export HTML, backlinks, Research Briefs: not tested.
- Links from other pages to a deleted page in body: not tested beyond direct URL.
- Renderer crashes: twice; not reproduced after re-navigation.

## Coverage gaps for round 3 (single exclusive session)
1. Re-verify all "observed in shared session" and disagreed items (KB-B-002, 010, 015, 016, 021).
2. Confirm KB-B-029 Edit sheet blank on a clean space; confirm Space D name.
3. Templates Use/Saved (KB-B-031 / 024 / 025), purge (KB-B-028), import (KB-B-019), search (KB-B-012/013/014), comments on a clean page (KB-B-022).
4. Version restore after ≥2 versions exist.
5. Permissions with a second @sharklasers.com account.

## Evidence / screenshots
Browser tool screenshots live in the agent asset store (not copied into ../screenshots/). Evidence is recorded as text (page, steps, correlation ids) in BUGS.md.
