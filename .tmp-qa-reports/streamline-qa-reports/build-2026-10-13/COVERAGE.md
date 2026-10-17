# Coverage — build-2026-10-13 (owner account only; no screenshots)
## Done (owner qaown1012b)
- Issues: board load, Create Issue validation (blank/whitespace/min-length/title trim, emoji/bidi, story-points boundaries 0/100/101/2.5/1e2/-1), double-click create (B-001), table view + column ids, filters (Priority=Urgent, persistence on reload), search (special chars, empty state, 600 chars → B-005, % and _ → B-006), Add column validation, Delete ticket confirm (alertdialog) and delete path.
- Ticket detail: title trim, status change (persisted), due date set/persist, start>due blocked by picker, comments (whitespace disabled, double-click dup B-003, Ctrl+Enter, 10.8k chars), accessibility names (B-004), attachments (oversize 2 MB blocked client-side; .exe; valid PNG → B-013), timer Start/Stop/Save (B-008), subtask whitespace validation, history panel (no field-change entries seen; unconfirmed regression vs v2 note).
- Import/Export: dry run edge CSV, row errors, 1001-row limit, import (B-010), export CSV (85 rows), export→import dry run round trip (85 ready).
- Cycles: name/capacity/description validation, create, overlap 409 message, list/detail.
- Project settings: General (blank name saved, B-007), Labels (whitespace disabled, dup 409 generic message, create/refresh), Statuses (dup name message), Custom Fields (empty state), Teams & Roster, Danger Zone (Delete Project present, not clicked).
- Project wizard: steps 1–7 walked, step-1 name/key rules (NEW-11, NEW-26 rechecked), step-7 copy (B-012), Escape closes with no discard prompt. Project not created.
- Views: Timeline loads; Calendar goes to /calendar (B-011); Workload not inspected in detail.
- Other Build pages: Command Center, My Work, All Work (search 300 chars → 400, same as B-005), Teams (empty), Inbox, Search (global search works).
- Shortcuts: ?, c, g i verified. Two-tab stale edit: partial (see below).
- Time log page /timesheets: "Module not enabled" (B-009).

## Not done / partial
- Two-tab stale edit: tab 1 set status In Progress persisted; tab 2 priority High set but reloaded value Medium — unconfirmed (could be lost update or click issue); needs repeat.
- Viewer (qaview1012e) sign-in and NEW-16b retest; Member/Admin RBAC re-check of new surfaces; live session revocation.
- Narrow window (~800px) not tested (no viewport control via tools used; no screenshots).
- Rapid double-click on other submit buttons (cycle create, project create, labels, delete column); reload mid-request; back/forward in dialogs; description editing with long paste; board drag-and-drop; Backlog bulk actions; Products/Portfolios/Programs; labels on tickets; Custom Field add flow; attachment types other than PNG.
- Prior open items NEW-06, NEW-10, NEW-11, NEW-26 re-verified (see below); NEW-16b, NEW-27 (partly), NEW-28..30 not re-verified (NEW-28..30 have no definitions in the prior records).

## Cleanup status: NOT COMPLETE
Deleted: QAB-83, QAB-84 (broken by B-013), QAB-87 (probe). Remaining to delete: QAB-81 ("abc"), QAB-82 (emoji/bidi), QAB-85 (import emoji), QAB-86 ("Good row 0913", 101 pts); cycles "Cy" and "Cap empty probe"; labels "SaveBtn0913" and "Refresh0913". Storage file for B-013 remains orphaned. Pre-existing data (QAB-1/QAB-2 long titles, NEWLBL/<svg> labels, QA Project Delta) left untouched.

## Round 2 — build-2026-10-13 afternoon (owner qaown1012b; no screenshots)

### Done
- Attachments (scratch tickets QAB-88..QAB-95): JPEG, GIF, WebP break the ticket page (B-016; B-013 is NOT PNG-only); PDF attaches and stays usable; unicode-name PDF attaches ("File attached"); 0-byte file → 400 `contentBase64 … Too small`, no visible message (B-017); 2.1 MB PNG blocked client-side ("oversize-2mb-0913.png exceeds the 2 MB file limit.", no request); 10 files at once → 2 uploads only before the ticket error (B-018, unconfirmed).
- Double-click submits: Create Issue (round 1 B-001), Create Project → 1 POST (PASS), Create Cycle → 1 POST (PASS), Create Label → 1 label (PASS), Create Portfolio → 2 POST (B-014), Create Program → 2 POST (B-015), Comment edit Save → 1 PATCH 200 (PASS), Time-entry Save while running → 0 POST in 3 attempts (B-019), Invite (new address) → 1 POST 201 (PASS), Invite (existing member) → 2 × 409 with "already a member" message (no duplicate, PASS).
- Reload mid-request: ticket created once (QAB-96). Back/forward with the Create Issue dialog open: draft lost (B-023). Beforeunload prompt observed on full page navigation.
- Two-tab conflicts (QAB-96): priority, status, title, assignee — second writer receives 409 and a "This issue changed while you were editing" dialog with Keep / Discard (no silent last-write-wins). Heading "Loading..." seen for >15 s in 2 of about 8 loads (B-020).
- History panel: field changes ARE logged (priority MEDIUM→HIGH, status TODO→IN_PROGRESS, rename, assignee) — no regression seen.
- Products/Portfolios/Programs: /build/managed-products (empty "Start with a product"), /build/portfolios and /build/programs (empty states, New buttons, dup-on-double-click B-014/B-015). /build/products = Page Not Found (sidebar uses managed-products).
- Keyboard: "?" opens shortcuts overlay; "c" opens Create Issue; Tab ×22 stays inside the Create dialog (focus trap PASS); Esc closes; "g i" goes to Issues.
- Carried-over items rewritten and retested: NEW-06 (still open), NEW-10 (still open), NEW-11 (silent rewrite still open; stale error fixed), NEW-26 (still open). NEW-16b: prompt now shown on /org-setup (FIXED; residual B-022). NEW-27: still open.
- Cleanup: all round-1 and round-2 test tickets, cycles, labels, project, portfolios and programs deleted (see TEST-DATA.md). Project create double-click created project /build/15, deleted.

### Not done / partial
- Member (qamem1012c) and viewer (qaview1012e) re-checks on time log, calendar and import: NOT DONE. After the invitee test the QA browser is stuck on /org-setup for qadbl1013 (no sign-out control there; Join is inert, B-022), so sign-out and the member/viewer sign-ins could not be performed. Next step: owner or parent to clear the QA browser session (or sign in via a clean browser) and re-run the member/viewer checks.
- Narrow window (about 800 px and 400 px) for board, ticket detail, dialogs and sidebar: NOT DONE. The browser tools cannot set the viewport and the Computer tool would return screenshots, which were excluded by the instruction.
- Sort options (list/table/backlog), filter persistence on list/table: NOT DONE this round (board filter persistence was verified in round 1).
- Board drag-and-drop: NOT conclusive. Mouse drag from a card did not move it (no PATCH) and the target column header could not be located; the "Drag to reorder column" handles are for columns, not cards. Keyboard card drag not located.
- Pending invite for qadbl1013 remains (cannot cancel from the Invitations tab).

### Environment notes
- Guerrilla mailbox: set the username to qadbl1013 (inbox span #inbox-id → input → Set button). Reloading Guerrilla resets the address to a random one; re-set before reading codes. Sign-in codes are read from the inbox list; newest first.
- Clicking "Sign in with Google" by mistake (regex matched) opened Google's account chooser; no account was selected and no Google sign-in was completed.
- Browser tabs: multiple tabs left open; one tab crashed (B-021) and was replaced.

---
# Round 5 — Build module QA, build-2026-10-13 (owner qaown1012b; project 7; NO screenshots). Continues from rounds 1–4.

## Cleanup (done first) — see TEST-DATA.md "Round 5 — CLEANUP"
- DONE: tickets QAB-97..QAB-106 deleted (10/10). Epic "R4 epic 1013" deleted. Release "R4 release 1013" deleted (Actions > Delete; a stray PATCH side effect is noted in B-048). Milestone "R4 milestone 1013" deleted.
- NOT FOUND / NO CONTROL: update "R4 update 1013" — the Updates list is empty and has no per-item menu or delete control (B-039).
- Export CSV: the owner says it was deleted locally. On this box, fixtures/export-roundtrip-0913.csv and export-roundtrip-retitled-0913.csv are still present; this run did not delete them.

## Done (round 5)
- B-037 capture: in-column card drag (mouse on title text) → PATCH /build/7/tickets/<id>/rank → 409 CONFLICT, card snaps back (retest recorded as "B-037 RETEST (round 5)"). Keyboard in-column move → 409 too. Drag from card body: no request.
- Budget: validation (empty → saved as Not set; negative → blocked silently; 23-digit → PATCH 500; 12.345 → 12.35 stored; 9999999999 → "₹1KCr"); double-click Save → 2 PATCH; restored to Not set. Findings B-046, B-050, B-051, B-052, B-057.
- Approvals: empty submit (Title required, approver and task required), whitespace title ("cannot be blank"), 1000-char title (client error "Max 200 characters"), reason clamped at 2000, task picker search (new tickets not found: B-056), request a milestone approval (201), Delegate (self → 400 silent: B-054; to another member → 200), Escalate (status changes; level unchanged: B-055), Delete with double-click (204). Edit: no edit action exists (menu: Decide, Delegate, Escalate, Cancel, Delete). Decide and Cancel NOT exercised. Past due dates: the picker disables past days (checked on the milestone picker; approval due-date picker not separately checked).
- Workload: read-only grid with per-row assignee controls. Assignee change NOT exercised (rows could not be located; not done).
- Triage: Accept (double-click → 1 PATCH 200, row removed) PASS. Decline → 400 PROJECTS_INVALID_TICKET_STATUS "CANCELLED" (B-047). Search needs Enter (debounce or no live filter; not logged as a bug).
- Epics: create validation (empty → "Epic title is required"; whitespace → "at least 3 characters"; 300 chars → "120 characters or fewer"), create double-click (2 tickets: B-043), edit validation (same rules), edit save double-click (2 PATCH: B-057), delete (confirm double-clicked; epic removed). PASS for single delete.
- Milestones: create validation (empty name → "Name is required"; target date required; 300-char name → "Name is too long"; whitespace name: no client error, not saved), date picker (past days disabled; Oct 30 chosen), create double-click (2 POST: B-044), duplicate delete (list not refreshed until reload: B-058), edit validation (empty name → required), edit save double-click (2 PATCH: B-057), delete (refreshed; "No milestones yet").
- Releases: create validation (empty name/version; "abc" → "Enter a valid version…"; "1.0" accepted), version rules (B-053), duplicate version (201: B-049), double-click create (2 POST: B-045), edit with invalid versions ("-1.0.0", "v1..0" rejected; "1.0.0.0" accepted), trailing space trimmed, publish (Save with Released → confirm "Publish 'R5 release 1013'?" → PATCH 200, publishedAt set, Release Date auto Oct 13, 2026), delete (Delete menu also opens the Edit dialog: B-048; confirm → 204).
- Client portal: smoke only ("Portal not published"; "No grants"). Visibility preview not tested.
- Backlog: first load rendered rows (smoke; B-032 not re-run).
- Files: still "Project error — Failed to load project" (B-030 still open, retested 1/1 this round).
- Updates: empty list (no error this time); posting not repeated (B-039 kept as-is).

## Not done / remaining (round 5)
- 375 px pass on Build settings tabs and dialogs (Ctrl+Shift+M): NOT DONE. The browser tools cannot change the viewport, and device mode needs DevTools (the Computer tool returns screenshots, which were excluded). Needs a run with DevTools device mode or a headless viewport of 375 px; "restore the viewport" not applicable (nothing changed).
- Approvals: Decide and Cancel actions; approval due-date picker; approval list filters (All statuses, All types, All approvers); approvals for Release and Budget entity types.
- Workload: assignee change and grouping ("No grouping" menu, Add filter) not exercised.
- Triage: Decline cannot be completed (B-047); search filter behaviour; bulk triage not checked.
- Budget: no-currency behaviour and 2-decimal input UI; Cancel; Log hours Remaining logic with billable time.
- Epics: Priority and Status fields on edit (only title and description were changed); epic-to-story link; "Expand epic" children.
- Milestones: Achieved / Missed status transitions; owner picker; filter by target date.
- Releases: Release Notes editor (Bold/Heading/Link/Image buttons) not tested; Risk / Readiness fields not tested; Archived status not tested; filters (All statuses, Filter by release date).
- Client portal: grants, visibility preview, publish toggle.
- Timeline view and Agile reports (B-042 not re-run; B-042 remains).
- Cross-column board drag (retest of B-028) and the empty-column drag (B-027): not re-run this round (already reproduced in round 4).
- Two-tab stale edit (carried over).

## Round 5 summary
- New bugs B-043 to B-058 (16 items): High 3 (B-043 epic double-create, B-044 milestone double-create, B-045 release double-create); Medium 5 (B-046 budget 500 on huge amount, B-047 triage Decline always 400, B-048 release Delete also opens Edit dialog, B-049 duplicate release version, B-056 approval task picker misses new tickets — needs repro); Low 8 (B-050 negative budget silent, B-051 decimal rounding, B-052 "1KCr" label, B-053 version rule, B-054 delegate-to-requester silent 400, B-055 escalate keeps level 1 — needs repro, B-057 double-click Save/Delegate sends 2 PATCH, B-058 milestone list stale after delete — needs repro).
- Retest: B-037 still reproduces (in-column mouse drag and keyboard move both return 409 CONFLICT on PATCH .../rank; payload not readable through the tool).
- Still open from earlier rounds and re-seen: B-030 (Files), B-042 (not re-run), B-039 (Updates; not re-posted).

---
# Round 6 — Build module QA (owner qaown1012b, project 7; no screenshots). Source: BUILD-BUGS.md "Round 6" sections (B-059 to B-069) and TEST-DATA.md "Round 6".

## Done
- 375 px pass (DevTools device mode, width 375): New Release dialog → Release Notes editor runs off the dialog (B-059); ticket page QAB-3 → Activity action row makes the page scroll sideways and cuts "Draft comment" (B-060). Also checked at 1280 px: Release Notes editor is a fixed 639 px box (B-059). Create Cycle dialog opened at 375 px and cancelled (no record). Not covered at 375 px: Build settings tabs, board, sidebar, Approvals, Workload, Epics, Timeline (no check recorded).
- Approvals: Request milestone approval (approver qamem1012c, 1 POST 201); Decide → Approve as non-approver (B-061: 200, Approved); Decide → Reject without comment (200, Rejected); Cancel with confirm "Cancel this approval?" (Keep leaves it pending; Cancel → 200, Cancelled); row menus after decision show only Delete; Decide dialog options (Approve / Reject / Request Changes); milestone picker and approver search. Cleanup of approvals 2–4 (DELETE 204 ×3).
- Workload: total / assigned / unassigned counts after one assignment; reassign from a workload row avatar (one PATCH; counts verified after reload); ticket Assignee single select (QAB-114 → qamem1012c, PATCH 200).
- Cycles (capacity boundary, from the workload item): 100000 accepted; 100001 and 20-digit blocked client-side (no request); "-1" rejected as not a whole number; overlap with an existing cycle → 409 "Cycle dates overlap with …" (Completed and Upcoming).
- Epics: edit save (priority/status) (B-062: card one save behind); Done with open items (B-063); Link picker lists stories only (B-064); Epic dropdown on a ticket accepts tasks (PATCH 200); progress math "0 of 0" → "1 of 3 items, 3 / 10 pts" (correct; progress bar item-based); a story picked from the Link list attaches.
- Milestones: Pending → Achieved (PATCH 200, card updates at once) → Missed (200).
- Releases: create with readiness/risk (B-065); edit save "Release updated" (B-065 again); release notes counter and 10,000-character limit (B-066: server 400 at exactly 10,000; 9,000 accepted); list lag after status change (B-067, intermittent); list preview of notes shows escaped HTML (B-068); XSS payload in notes (no element created in editor, no dialog); status flow Draft → Released (Publish confirm, PATCH 200, Published date set) → Archived (Published cleared) → Draft; Archived and Draft filters; release date set and shown; date filter ("Filter by release date…" → from=2026-10-20); version "6.0.1013" accepted.
- Timeline: loads; dragging bars does not reschedule (B-069, 6 attempts; a mouse-up sometimes opens the ticket).

## Not done / partial (round 6)
- Approvals: Request Changes decision; member qamem1012c's own Decide (sign-in not done); approval list filters (All statuses / All types / All approvers); approvals on Release and Budget entity types.
- Workload: grouping ("No grouping" menu) and "Add filter" not exercised.
- Epics: "Expand epic" child list with several items; epic delete with linked items (delete worked on a 0-item epic in round 7).
- Releases: Release Notes toolbar (Bold / Heading / Link / Image) only partly used; Edit dialog at 375 px not checked; Readiness / Risk filters do not exist on the page.
- Timeline: zoom and date range navigation; Calendar (routes to /calendar, B-011).
- 375 px: Build settings tabs and most dialogs (see above).

---
# Round 7 — Build module QA (owner qaown1012b, project 7; no screenshots). Item 1 = links and subtasks on QAB-113 to QAB-117. Findings B-070 to B-073.

## Done
- Set parent from the child: QAB-114 → QAB-113 (PATCH 200); QAB-115 → QAB-116 (PATCH 200).
- View child list on the parent: QAB-116 (1/1, Done, struck through), QAB-113 (0/2 with QAB-114 and QAB-119), QAB-117 (1/1 with QAB-115).
- Set child from the parent: "Add subtask…" + Enter creates a new child (POST 201; QAB-119). No existing-ticket attach from the parent (B-073).
- Blocks / Blocked by / Relates to: created from both ends; creation 201 (POST /build/7/tickets/126/relations, /127/relations). The display of "Blocks" and "Blocked by" is not inverted on the other ticket (B-070). Relates to is symmetric (PASS).
- Circular parent, both ways: QAB-113 parent = QAB-114 (its child) → PATCH 400 "Cannot set parent: this would create a cycle"; QAB-116 parent = QAB-115 → refused with the same message. (B-072: the offer itself is wrong.)
- Self-parent: not offered in the picker (PASS). Self-link: not offered ("No tickets found.") (PASS).
- Duplicate link: a ticket that is already linked is not offered again in the Relations picker, on either side (PASS). Message is "No tickets found." (misleading; noted under the round 7 checks).
- Move child to another parent: QAB-115 QAB-116 → QAB-113 → QAB-117 (each PATCH 200, "Parent set"); the old parents no longer list it (PASS).
- Delete parent with children: QAB-117 with child QAB-115 → DELETE 204; child kept, parent cleared, relations removed (B-071: no warning).
- Cleanup of the round 7 test tickets (see BUILD-BUGS.md "Round 7 cleanup" and TEST-DATA.md).

## Not done / partial (round 7)
- Remove a relation (unlink) and remove a parent from the Parent field ("Remove parent" control exists; not clicked).
- "Duplicate of" relation type: not tested (only Blocks, Blocked by, Relates to).
- Subtask depth: a child of a child (grandchild) not tested.
- Links from the board, list or table views (no relation or parent column tested).
- Subtask progress rules (parent Done while children open) not tested.
- API status codes: observed from the browser's network responses only (no direct API client was used). The first two relation creates (QAB-113 Blocks QAB-114; QAB-113 Relates to QAB-117) were not captured by the listener, so their status is not recorded.
- Epic linking from a parent ticket (epic is a separate link, not tested here).
- Member (qamem1012c) and viewer (qaview1012e) RBAC on links and parents: not tested.

---
# Round 8 — Build module QA (owner qaown1012b; members qamem1012c and viewer qaview1012e; project 7; no screenshots)
Scope: member/viewer RBAC on approval 7 and the QAB-120/121/122 links; owner "Remove parent" (QAB-122) and "Duplicate of" removal (QAB-120); cleanup of QAB-120..123, approvals 5–8, milestone 6, release 7.

## Done
- Browser: site data cleared before member sign-in; member and viewer signed in one at a time via Guerrilla Mail codes (spaced to avoid the 429 limit).
- Owner "Remove parent" on QAB-122 and removal of "Duplicate of" from the QAB-120 side were run. B-082 logged (no history entry).
- QAB-122 tab crashed during navigation: crashed tab closed; retest of B-078 (still open).
- Cleanup (see TEST-DATA.md "Round 8 — CLEANUP"): tickets QAB-120..123, approvals 5–8, milestone 6, release 7 deleted; lists verified after reload.
- B-048 retest on release delete: still reproduces. B-058/B-075/B-076 stale lists after delete/decision: still reproduce.

## Not completed / limits (round 8)
- Member (qamem1012c) and viewer (qaview1012e) results for Decide on approval 7 and for view/add/remove/Remove parent on QAB-120/121/122 were NOT written to the notes saved in this folder; their exact outcomes need re-running. Re-run would need new tickets and an approval, because those records are now deleted.
- R8 product, portfolios and programs: logged as deleted earlier in round 8; not re-read in this pass.

# Round 9 — Responsive pass at 375 px (owner qaown1012b; Chrome device mode, width 375; no screenshots)
## Done
- Build settings tabs (General, Labels, Statuses, Custom Fields, Teams & Roster, Danger Zone): all reachable. Statuses tab text clipped at 375 px (B-083, needs re-check).
- Board (Todo column, cards, board toolbar): cards render; column scrolls horizontally. Known issues B-029 and B-038 not re-tested in this pass.
- Sidebar (More sheet): opens as a bottom sheet with the full PROJECT and MORE TOOLS list.
- Create Issue sheet: fits; title, description, To Do / Priority / Assignee, pts, Labels, Cycle, Attach, Links, Create more, and "Create issue" all visible. Cancelled, nothing created.
- Create Cycle dialog: fits (Name, Description, Capacity, Start/End Date, Cancel and Create Cycle visible). Cancelled.
- New Release dialog: fits (Name/Version side by side, Status, Release Date, Readiness, Risk Level, Release Notes; Cancel and Create Release visible). Cancelled. (B-059 not re-checked.)
- Request Approval dialog (Milestone type): fits (Entity Type, Milestone, Title, Approver, Reason/Notes, Due Date, Approval Level; Cancel and Submit Request visible). Cancelled.
- Decide dialog: not reachable (no approvals exist after cleanup).
- Device mode turned off after the pass (page back to desktop width).

## Not done
- Decide / Escalate / Cancel approval dialogs at 375 px (no approvals left).
- Release edit dialog and cycle edit dialog at 375 px.
- Ticket detail page and Create dialogs on the Backlog and Overview pages.
