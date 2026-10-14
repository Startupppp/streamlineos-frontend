# Build module recheck summary — 14 Oct 2026
Source: `RECHECK.md` (latest / retest row wins per ID). Site: https://www.streamlineos.in, project 7 "QA Project Alpha" (QAB). Prefix RC1014.
## Counts
| Status | Count |
|---|---|
| PASS | 36 |
| FAIL | 12 |
| PARTIAL | 18 |
| BLOCKED | 17 |
| **Total IDs** | **83** |

New bugs from this recheck (see `NEW-BUGS.md`): NEW-R1, NEW-R2, NEW-R3, NEW-R4 (not in the per-ID table above).

## Final status per ID
| ID | Status | Recheck note (latest) |
|---|---|---|
| B-013 | PASS | QAB-135 "RC1014 attach types": PNG attached (valid-image-0913.png) via Attach files; page stays loaded, no "Ticket Error" after reload; thumbnail shows under Attachments; "View image" opens the 64x64 file. |
| B-016 | PASS | QAB-135: JPEG, GIF, WebP and PDF attached to the same ticket (one upload); page stays loaded after reload; all four images listed in Attachments; View image opens each 64x64 file (JPEG, GIF, WebP checked). Done on one ticket, not one ticket per type. |
| B-024 | PASS | QAB-135 with 7 PDFs (valid-doc-0913.pdf, multi-pdf-01..06). Single click on multi-pdf-01 opens a PDF tab from a signed R2 URL (no 500 seen; no storage/download call at all). Double-click on multi-pdf-06 opened one tab only. Reload shows all 7 with no Ticket Error. Could not get all 10 PDFs onto the ticket because of repeated tab crashes; PDF content not visually confirmed. |
| B-001 | PASS | Double-click on Create issue sent 1 POST /build/7/tickets; search shows one "RC1014 DBLCLICK issue" ticket (created as RC1014 test data). |
| B-014 | PASS | Double-click on Create Portfolio sent 1 POST /build/portfolios; list shows one "RC1014 DBL portfolio". |
| B-015 | PASS | Double-click on Create Program sent 1 POST /build/programs; list shows one "RC1014 DBL program". |
| B-043 | PASS | Double-click on Create epic sent 1 POST /build/7/tickets (epic "RC1014 epic dbl"). Epics page then shows count 10 (brief said 9 before the QA run, so 9 to 10 fits one epic). The board search that would list the title crashed the tab, so the title was not re-read. |
| B-044 | PASS | Double-click on Create Milestone sent 1 POST /build/7/milestones; list shows one "RC1014 milestone" (Pending, Oct 30, 2026). |
| B-045 | PASS | Double-click on Create Release sent 1 POST /build/7/releases; list shows one "RC1014 release dbl 2.0.0-rc1014 Draft". |
| B-065 | PASS | Create with Readiness Blocked and Risk High returned 201 (blocked/high in response); list shows Blocked / High after reload. Edit to Ready / Critical returned 200; list shows Ready / Critical after reload. Setting back to Not set not tested. |
| B-039 | PASS | Posting "RC1014 update status probe" returned 201 and no error appeared. After reload the Updates page lists it (plus the older R4 update) with no "Failed to load project updates". Note: the new item was not visible in the list at the instant the dialog closed; it showed after reload. |
| B-027 | PASS | Keyboard Space, ArrowRight x2, Space moved "RC1014 DBLCLICK issue" from Todo to the empty In review column: PATCH /rank returned 200 (status IN_REVIEW). After reload the card is in In review (count 1). Mouse drag not retested. The board counts did not update until reload (see B-028). |
| B-037 | PASS | retest (owner): keyboard in-column move of "RC1014 epic dbl" up one slot in In progress (Space, ArrowUp, Space): PATCH /build/7/tickets/162/rank 200, order shows epic first; persists after reload. Earlier 409 did not recur. Mouse drag not retested. |
| B-084 | PASS | retest (member qamem1012c, private window, email OTP): /build/7/approvals row "R11 milestone approval 1013 run3" shows "Approval actions" with Decide. Decide dialog (Approve default) submitted once; after reload row shows Approved. Row still showed Escalated until reload (see B-076). Inbox "Approval requested" link not checked. |
| B-003 | PASS | Double-click on Post comment on QAB-135 (text "RC1014 DBL comment") produced one comment (one entry, count 1 in Activity). |
| B-004 | PASS | Ticket detail controls now have accessible names in the accessibility tree: combobox "Status", "Priority", "Type", "Epic", "Workstream", "Cycle"; spinbutton "Points"; button "Customer: None". |
| B-028 | FAIL | retest (owner): keyboard move of "RC1014 attach types" (QAB-135) Todo to In progress, PATCH rank 200. Counts stayed stale right after the move (Todo 1, In progress 1, card already in In progress). After reload Todo 0, In progress 2. Still stale until reload. |
| B-005 | PASS | Issues search (/build/7/issues): 256, 306 and 600-char queries (typed via fill, owner session). No "Something went wrong"; the search box stays mounted and usable; board shows "No tickets match your search". Search box is not capped (no maxlength), so the 600 chars were sent; no 400 page error seen. Network status not captured (listener saw no request). Original 306-char test did not crash the tab (one earlier tab crash was from memory pressure, recovered by a new tab). |
| B-007 | FAIL | Project settings (/build/7/settings), owner: Project Name set to three spaces and Save Changes clicked. After reload the Project Name field was empty (saved as a blank name). Restored to "QA Project Alpha" (verified exact on reload). The save toast was not captured because the tab crashed twice during the test (memory). |
| B-074 | PARTIAL | Create Portfolio and Create Program (owner): a name of three spaces shows "Required" under Name and sends no POST (no record created). Client side fixed. Server-side 400 for a direct POST/PATCH with a whitespace name could not be tested from the browser, so not confirmed. |
| B-008 | PASS | QAB-135 (ticket 160, owner): Start, wait, Stop. Save and Discard stay visible and the elapsed time stays shown (not lost). Save after Stop sent one POST /build/7/tickets/160/time-entries; toast "Time logged (00:02)"; after reload the block shows "0.01h logged". Discard opens "Discard tracked time?" with Cancel/Discard. |
| B-019 | PASS | QAB-135 (ticket 160, owner): Start, wait until Stop/Save show, then double-click Save. Exactly one request, POST /build/7/tickets/160/time-entries 201; toast "Time logged (00:02)". |
| B-010 | PARTIAL | Issues > Import / Export > Import with rc1014-import-points.csv (rows: points 101 and 100). Dry run POST /build/7/import-export/tickets/preview returned 200, but the dialog never rendered the dry-run summary or row errors (Import stayed disabled). A one-row file with points 100 also rendered no result, so the points-101 rule could not be checked. Nothing imported; no records created. |
| B-011 | FAIL | /build/7/issues > Calendar button goes to /calendar?source=build&projectId=7. No Build tickets source and no QAB ticket text found. Initial view showed "Loading calendar sources" then the source toggles (HR events, and others). Then the calendar showed "Calendar error / Failed to load the calendar" and Try Again did not recover it. |
| B-025 | FAIL | Board (/build/7/issues?orderBy=created&orderDir=desc, and priority desc): the first cards are QAB-2, 4, 5, 6 ... (rank order), identical for both orderings; the newest To Do ticket QAB-137 is not first, so Board Ordering is still ignored. List view: created desc starts QAB-137, 135, 134 and created asc starts QAB-2, 4, 5, so the list direction now works. |
| B-034 | PARTIAL | Table view: orderBy=priority desc starts QAB-39, 43, 47, 51 (Pag B items); orderBy=dueDate asc starts QAB-137, 136, 135 with the Due Date cells empty, so priority and due date now differ, but tickets without a due date sort first (acceptance says last). orderBy=updated desc gives a different order (QAB-136, 137, 135, 134) and the URL keeps it. List view not separately checked. |
| B-035 | PARTIAL | /build/7/issues?columnBy=priority&rowBy=none: columns are now Priority groups with counts (URGENT 19, HIGH 19, MEDIUM 31, LOW 18); the Todo/In progress/In review/Done status columns are gone. ?columnBy=assignee shows an Unassigned group (87). Label, Cycle and Project columns and the Display > Columns UI click path were not tested. |
| B-022 | BLOCKED | The repro needs a sign-in as invitee qadbl1013@sharklasers.com (pending invite to QA Build Org 1012b). This run only had the owner and the member (qamem1012c) sessions authorized, so the org-setup Join banner was not tested. Needs an authorized invitee session. |
| B-029 | BLOCKED | Needs a 768 px viewport; the browser tool cannot set the viewport size and no zoom check was done. Not confirmed. |
| B-030 | FAIL | Owner, /build/7/files: still shows "Project error / Failed to load project. Please try again or contact support." with Try Again (checked after load). |
| B-031 | PARTIAL | retest (member qamem1012c): QAB-97 now returns "Page Not Found" for the member, so QAB-97 was not used. On QAB-135 (RC1014, member view) the ticket page has no file input at all (no hidden image input in DOM) and no Attach control, so the upload path is not exposed. Server 403 for POST /storage/upload not tested (no browser-side way to send it). |
| B-033 | PASS | retest (member qamem1012c): calendar "Add to calendar" menu lists only "Add event"; "Add ticket due date" is not offered. Nothing created. |
| B-042 | PARTIAL | /build/7/agile-reports now redirects to /build/7/reports, which shows the Agile Reports content (no 404). The "Agile reports" link on the project was not found in More tools, so the link click itself was not confirmed. |
| B-046 | PARTIAL | Owner, /build/7/budget, Set Budget: a 23-digit value shows the inline message "Budget must be 10,00,00,00,00,000 or less" and sends no PATCH (no 500 in this run). Editor cancelled; budget left as Not set. Server-side 400 for a direct PATCH could not be tested from the browser. |
| B-047 | BLOCKED | /build/7/triage has 41 unassigned QA tickets (none are RC1014). Decline would change an existing shared QA record, so it was not clicked. Triage search "R5" returned no results. Needs a RC1014 triage item to test safely. |
| B-048 | PARTIAL | Owner, /build/7/releases, "RC1014 release dbl": Actions > Delete opened only the "Delete release?" alert (no Edit Release dialog seen). Clicking its Delete removed the release (confirmed after reload; RC1014 release dbl is now deleted). The list still showed the deleted row until reload (stale list, see G5). The DELETE request was not captured. |
| B-049 | PASS | Owner, /build/7/releases, New Release with the existing version 6.0.1014 (name "RC1014 dup version"): the save was rejected with the inline message "A release with this version already exists in this project" (also a toast); no duplicate row was created and the dialog was cancelled. |
| B-066 | PASS | Owner, Edit Release "RC1014 release ready" (6.0.1014): Release Notes set to 10,000 characters (counter "10,000 / 10,000"), Save Changes sent PATCH /build/7/releases/11 → 200, toast "Release updated". The server now accepts the limit the counter shows. Notes left at 10,000 characters (RC1014 test data). |
| B-062 | PASS | Owner, Epics: "RC1014 epic dbl" Edit > Priority High, Status In Progress > Save changes → PATCH 200; the card updated at once to "In progress \| High" with no reload. |
| B-056 | PARTIAL | Owner, Approvals > Request approval > Task (Request Approval dialog): the "Search tasks…" picker opens with a default list of 50 tickets (QAB-3, QAB-1, QAB-2, QAB-4 ...). Typing QAB-135 into the picker did not filter the list (no matching option, no "No items found"), so the search for new tickets could not be confirmed. No approval was submitted; the dialog was cancelled. |
| B-061 | FAIL | Owner, /build/7/approvals: the row "R11 milestone approval 1013 run3" (approver qamem1012c, status Escalated) has a Decide item in the owner row menu (Decide, Delegate, Cancel, Delete) even though the owner is not the approver. Decision not submitted (to avoid changing the member approval). Server 403 not tested. Confirm-intended item: UI still offers Decide to a non-approver. |
| B-070 | PASS | QAB-135 (RC1014 attach types) "Blocks" QAB-136 (RC1014 DBLCLICK issue): POST /build/7/tickets/160/relations 201. QAB-135 shows "Blocks, RC1014 DBLCLICK issue (QAB-136)"; QAB-136 shows "Blocked by, RC1014 attach types (QAB-135)" after reload. "Duplicate of" not tested. |
| B-059 | BLOCKED | Needs a 375 px viewport; the browser tool cannot set the viewport size, so not measured. |
| B-060 | BLOCKED | Needs a 375 px viewport; the browser tool cannot set the viewport size, so not measured. |
| B-085 | PASS | retest (member qamem1012c, private window, re-signed in): milestone "RC1014 milestone edit" Actions menu is empty (no Edit, no Delete). /build/7/releases has no Actions column for the member, and clicking "RC1014 release ready edit" opens no Edit Release sheet and no Save Changes button. No "Missing permission" text seen. Direct PATCH as member not tested. |
| B-075 | PARTIAL | Portfolios (owner): creating "RC1014 refresh pf" showed it in the list immediately, no reload. Deleting it: the row was still listed right after the confirm closed, and gone on a later read (the refresh looked delayed). Programs and product lists not checked. Test portfolio deleted (cleanup). |
| B-057 | PARTIAL | Epic edit (owner, "RC1014 epic dbl"): double-click on Save changes sent one PATCH (200) and the dialog closed. Save/Delegate on the ticket-level dialogs (the Delegate path in the B-057 report) not tested. |
| B-002 | PASS | retest (owner): created "RC1014 B-002 ..." with U+202E and U+200B in the title. Saved title has no U+202E or U+200B; emoji, ZWJ family sequence, CJK, Arabic and combining mark kept. One ticket created (RC1014 test data). |
| B-006 | PARTIAL | retest (owner): q=% and q=_ now show "No tickets match your filters". q=Bulk%item still returns 32 Todo cards ("Bulk pag item NN"), so % still acts as a wildcard mid-term. |
| B-009 | PASS | retest (owner): /build/7/issues header has no "Log time" link (none found by text or timesheets href). Timesheets on/off state not checked. |
| B-012 | PASS | retest (owner): New Project wizard, name RC1014 wizard, Scrum, Next to step 7. Step 7 subtitle "Review the details before creating the project." (differs from step 6). Summary shows name, key, type "scrum", template, workflow, features. Not created (wizard closed with Escape). |
| NEW-10 | PASS | retest (owner): /build/projects scope switcher label "Switch Build scope — current: Organization QA Build Org 1012b"; visible text shows "QA Build Org 1012b". |
| NEW-11 | PASS | retest (owner): Key "qa-1!" becomes "QA1" and the note "Removed characters that keys can't contain: - !" shows. Not created. |
| NEW-26 | FAIL | retest (owner): Name "A" + Next shows "Name must be at least 2 characters". Name changed to "QA Name OK" and Tab: the same error is still visible. |
| B-017 | FAIL | retest (owner): 0-byte fixtures/empty-0byte-0913.pdf set on the Activity file input of QAB-135, wait 6 s: no request sent and no "is empty" message shown. Still silent. |
| B-020 | PASS | retest (owner): QAB-135 loaded 3 times (single tab): heading showed the title within 3-5 s each time. Two-tab conflict repro not run. |
| B-023 | FAIL | retest (owner): Create Issue dialog, typed "RC1014 back-forward probe", Back then Forward: dialog reopened (?create=1) but the title was empty. Draft not kept. |
| NEW-06 | PASS | retest (owner): Create dialog title now has maxlength 500 (was none in round 11) and detail "Edit title" maxlength 500. 201 chars kept, no 200-char message. Both inputs share the 500 cap; server 400 not tested. Nothing saved. |
| NEW-27 | FAIL | retest (owner): fixtures/qa-test.exe set on the image-only file input (accept image/jpeg,png,gif,webp) of QAB-135. No request sent and no "not an allowed file type" message appeared within 6 s. |
| B-036 | FAIL | retest (owner): /build/7/issues?priority=URGENT, sidebar Overview then sidebar Issues: URL is /build/7/issues with no query, so the Priority filter is dropped. |
| B-040 | PARTIAL | retest (owner): sidebar "Draft awaiting review" item (323 unbroken chars) stays inside the sidebar with an ellipsis at 100% zoom. Its element has aria-label with the full text but no title attribute, so no hover tooltip was confirmed. |
| B-038 | BLOCKED | retest: needs a 375 px viewport. Browser zoom (Ctrl +) only reached 150% (about 853 CSS px) in this session, and the zoom bubble could not go further; mobile ticket sheet not tested. Zoom reset to 100%. |
| B-041 | BLOCKED | retest: /build/7/triage has no row with a long unbroken title (no 120+ character token on the page). Not created, to avoid extra triage records. |
| B-083 | BLOCKED | retest: needs a 375 px viewport (same zoom limit as B-038; zoom reset to 100%). Statuses tab not checked at narrow width. |
| B-050 | PASS | retest (owner): Planned Budget -500 then Save: "Budget must be 0 or more" shown under the field, no PATCH. |
| B-051 | PASS | retest (owner): 12.345 shows "Use at most 2 decimal places" with no request. 12.35 saved; Planned Budget, Remaining and utilisation all show ₹12.35. |
| B-052 | PARTIAL | retest (owner): 9999999999 saved (PATCH seen as the page updated). Labels now read "₹999.9Cr" (no "KCr"), but the full value is not shown on hover (Planned Budget has only the section title as tooltip). |
| B-053 | PARTIAL | retest (owner): New Release Version "abc", "1.0.0.0", "-1.0.0" and "v1..0" each show "Enter a valid version..." on Save, with no POST. Valid "1.0" acceptance and the new hint text not confirmed (a valid save would create a release). Cancelled; nothing created. |
| B-068 | PASS | retest (owner): set Release Notes of "RC1014 release ready edit" to `"><img src=x onerror=alert(1)> R6 XSS probe`, saved. The list row preview shows that text as plain text (no &gt; or &lt;); no img element created. Notes replaced the 10,000-character test notes. |
| B-080 | PASS | retest (owner): Timeline month dropdown: November shows "November", December shows "December". |
| B-069 | BLOCKED | retest: timeline bars have no accessible name in this view, so a bar could not be located for the drag; no drag done. Not tested. |
| B-063 | BLOCKED | retest (owner): inconclusive. Linked "RC1014 DBLCLICK issue" (open) to "RC1014 epic dbl" (0 of 1 items). Edit > Status Done > Save changes closed the dialog with no confirmation shown, and the card still read In progress, so the Done change was not confirmed. Not re-run. |
| B-064 | PARTIAL | retest (owner): epic "Link" picker on RC1014 epic dbl lists Task items (e.g. "RC1014 DBLCLICK issue", "RC1014 B-002 ...") as well as stories, and linking one worked. Option rows show no type label. |
| B-054 | BLOCKED | retest (owner): needs a pending approval assigned to another user to Delegate to the requester. The approvals list read showed no pending rows to use, so not run. |
| B-055 | BLOCKED | retest (owner): needs a pending Level 1 approval to Escalate. None available in this run, so not run (round 11 showed level still 1 after escalate). |
| B-071 | BLOCKED | retest (owner): needs a ticket with a subtask. "Link existing" on QAB-135 did not attach QAB-136 (see B-073), so no parent with a child was set up. Delete not run. |
| B-072 | BLOCKED | retest (owner): needs a ticket with a child to test the Parent picker. Not set up. The subtask picker on QAB-135 excluded QAB-135 itself. |
| B-073 | PARTIAL | retest (owner): Subtasks header has "Link existing", which opens a project ticket search. Results listed QAB-136, QAB-137, QAB-138 and excluded QAB-135 (itself). Choosing QAB-136 did not attach it: it is not under Subtasks after reload. Not conclusive. |
| B-076 | FAIL | retest: after the member's Decide (Approve) on "R11 milestone approval 1013 run3", the approvals row still read "Escalated" until a reload, then "Approved". |
| B-077 | BLOCKED | retest (owner): the Request approval dialog did not open in this run and the approvals table read empty, so the past-date check was not run. |
| B-079 | BLOCKED | retest (owner): no link item with a remove control found on QAB-135 (no related links shown in its main content). No Create-dialog link was added, so the B-079 path was not run. |
| B-081 | BLOCKED | retest (owner): needs a parent with a child on the table view (none set up in this run). Not run. |
| B-082 | PARTIAL | retest (owner): QAB-135 History lists Created and Updated entries only. No entry for the Blocks relation to QAB-136 was seen. Parent set/remove not tested. |

## Blocked items — reasons
| ID | Reason |
|---|---|
| B-022 | The repro needs a sign-in as invitee qadbl1013@sharklasers.com (pending invite to QA Build Org 1012b). This run only had the owner and the member (qamem1012c) sessions authorized, so the org-setup Join banner was not tested. Needs an authorized invitee session. |
| B-029 | Needs a 768 px viewport; the browser tool cannot set the viewport size and no zoom check was done. Not confirmed. |
| B-047 | /build/7/triage has 41 unassigned QA tickets (none are RC1014). Decline would change an existing shared QA record, so it was not clicked. Triage search "R5" returned no results. Needs a RC1014 triage item to test safely. |
| B-059 | Needs a 375 px viewport; the browser tool cannot set the viewport size, so not measured. |
| B-060 | Needs a 375 px viewport; the browser tool cannot set the viewport size, so not measured. |
| B-038 | retest: needs a 375 px viewport. Browser zoom (Ctrl +) only reached 150% (about 853 CSS px) in this session, and the zoom bubble could not go further; mobile ticket sheet not tested. Zoom reset to 100%. |
| B-041 | retest: /build/7/triage has no row with a long unbroken title (no 120+ character token on the page). Not created, to avoid extra triage records. |
| B-083 | retest: needs a 375 px viewport (same zoom limit as B-038; zoom reset to 100%). Statuses tab not checked at narrow width. |
| B-069 | retest: timeline bars have no accessible name in this view, so a bar could not be located for the drag; no drag done. Not tested. |
| B-063 | retest (owner): inconclusive. Linked "RC1014 DBLCLICK issue" (open) to "RC1014 epic dbl" (0 of 1 items). Edit > Status Done > Save changes closed the dialog with no confirmation shown, and the card still read In progress, so the Done change was not confirmed. Not re-run. |
| B-054 | retest (owner): needs a pending approval assigned to another user to Delegate to the requester. The approvals list read showed no pending rows to use, so not run. |
| B-055 | retest (owner): needs a pending Level 1 approval to Escalate. None available in this run, so not run (round 11 showed level still 1 after escalate). |
| B-071 | retest (owner): needs a ticket with a subtask. "Link existing" on QAB-135 did not attach QAB-136 (see B-073), so no parent with a child was set up. Delete not run. |
| B-072 | retest (owner): needs a ticket with a child to test the Parent picker. Not set up. The subtask picker on QAB-135 excluded QAB-135 itself. |
| B-077 | retest (owner): the Request approval dialog did not open in this run and the approvals table read empty, so the past-date check was not run. |
| B-079 | retest (owner): no link item with a remove control found on QAB-135 (no related links shown in its main content). No Create-dialog link was added, so the B-079 path was not run. |
| B-081 | retest (owner): needs a parent with a child on the table view (none set up in this run). Not run. |

## Notes on multi-row IDs
- **B-084:** earlier BLOCKED / PARTIAL; latest retest **PASS** (member Decide submitted; row Approved after reload).
- **B-037:** earlier FAIL (409); latest retest **PASS** (keyboard in-column move 200).
- **B-028:** FAIL on first check and on retest — still **FAIL** (column counts stale until reload).
- **B-031, B-033, B-085:** earlier BLOCKED; retest with member session → PARTIAL / PASS / PASS respectively.
