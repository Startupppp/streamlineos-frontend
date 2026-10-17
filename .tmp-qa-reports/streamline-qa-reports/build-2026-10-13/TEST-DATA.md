# Test data created in build-2026-10-13 (clean up at end)
Format: item | where | how created | cleaned?
- (pre-existing, NOT mine) QAB-1 title = 300x "N" from build-2026-10-12-v2 run; leave unless owner asks.
- QAB-81 title "abc" (created to test padded title trimming; trimmed correctly) — to delete
- QAB-82 title "🚀 Émoji 日本語 ..." with U+202E/U+200B (B-002 evidence) — to delete
- QAB-83, QAB-84 title "DBLCLICK-0913 double submit" (B-001 evidence) — to delete
- QAB-84 comments: "PROBE comment 0913", "DBL comment 0913 🎉" x2, "LONG0913 lorem..." (10.8k chars) — to delete with ticket
- QAB-84 title "DBLCLICK-0913 double submit" — to delete (ticket)
- QAB-95 is internal id of QAB-84 (comments posted there)
- Cycle "Cy" (id 3, 27–28 Oct 2026, capacity 0, Draft) — to delete
- Cycle "Cap empty probe" (29–30 Oct 2026, capacity empty -> saved) — to delete
- Overlap probe "Cy overlap probe" was rejected with 409 (not created)
- QAB-82, QAB-83, QAB-84 etc. see above
- Labels "SaveBtn0913", "Refresh0913" (project QAB labels, created in Labels settings) — delete at end
- Label list also has NEWLBL and <svg onload> labels from prior run (NOT mine; leave)
- Time entry 00:04 on QAB-84 (ticket internal id 95) from B-008 test — delete if the UI allows (ticket Time Tracking / history)
- QAB-85 "Émoji ... quoted, comma" (import edge test), QAB-86 "Good row 0913" 101 pts (import edge test; B-010) — to delete
- Fixtures created: /workspace/streamline-qa/fixtures/empty-0913.csv, header-only-0913.csv, import-edge-0913.csv, import-1001-0913.csv (keep fixtures; not tickets)
- !! QAB-84 is BROKEN by attachment valid-image-0913.png (B-013). Delete QAB-84 via a non-ticket-page route (table row "Ticket actions" menu or board card menu) during cleanup. Storage file ae98f907-72d1-4cbd-968f-fe8228e7d111-valid-image-0913.png
- QAB-87 "Attach probe 0913" (internal id 98) — also broken by B-013 — delete during cleanup

## Round 2 update (2026-10-13 afternoon) — cleanup status
DELETED in round 2 (verified: board search for R2 / DBLCLICK / Good row / Attach probe returns no tickets; cycle and label lists re-read; portfolio and program lists re-read):
- QAB-81, QAB-82, QAB-85, QAB-86 (round-1 items): DELETE 204 each.
- QAB-83, QAB-84, QAB-87 (round 1; already deleted per COVERAGE.md; confirmed absent).
- Round 2 tickets: QAB-88 (JPEG), QAB-89 (GIF), QAB-90 (WebP), QAB-91 (PDF; had a comment "R2 DBL edit 0913" and one time entry), QAB-92 (0-byte PDF), QAB-93 (unicode-name PDF), QAB-94 (2.1 MB PNG), QAB-95 (10 files), QAB-96 (reload test; title set to 300 chars): all DELETE 204.
- Cycles "Cy" (id 3) and "Cap empty probe" (id 4): DELETE 204. Cycle "R2 DBL cycle 0913" (14–15 Oct 2026): DELETE 204.
- Labels "SaveBtn0913", "Refresh0913", "R2 DBL label 0913": DELETE 204 each.
- Project "R2 DBL project 0913" (key R2D, /build/15, created by the double-click test): deleted via Danger Zone (typed-name confirm), DELETE 204.
- Portfolios "R2 DBL portfolio 0913" ×2 (double-click duplicate): deleted; list re-read shows none.
- Programs "R2 DBL program 0913" ×2 (double-click duplicate): DELETE 204 ×2.

STILL OPEN / NOT CLEANED (needs owner or a parent decision):
- Pending invitation for qadbl1013@sharklasers.com (Member, Build Member preset, created by the double-click invite test; invite sent 201). The Invitations tab in Members & Access lists only members; I could not find a cancel control. Pending Invites count shows 1. Owner should cancel it or let it expire.
- User qadbl1013 (invitee) is signed in in the QA browser on /org-setup with the pending invite (not joined). This account has no sign-out control on /org-setup (see B-022). It does NOT appear in the member list.
- Storage objects from the B-013/B-016 uploads (JPEG, GIF, WebP, PNG 64×64, 2.1 MB PNG, 10 × 32×32 PNG, PDFs, 0-byte file rejected) remain orphaned in storage (no UI to delete storage objects).
- Time entry on QAB-91 from the single-click Save test: removed with the ticket.
- Left untouched (not mine): QAB-1 / QAB-2 long titles, labels "NEWLBL" and "<svg onload=alert(1)>", project "QA Project Delta".

New fixtures this round (keep; not tickets): /workspace/streamline-qa/fixtures/valid-image-0913.jpg, valid-image-0913.gif, valid-image-0913.webp, valid-doc-0913.pdf, "Résumé 设计 测试 file-0913.pdf", empty-0byte-0913.pdf, multi-01..10-0913.png.

## Round 5 — CLEANUP (build-2026-10-13, Build QA run, owner qaown1012b, project 7 "QA Project Alpha"; no screenshots)
Run before the new tests. Deletes made through the app UI (table row "Ticket actions" > Delete; alert "Delete ... ?" > Delete).
- Tickets QAB-97, QAB-98, QAB-99, QAB-100, QAB-101, QAB-102, QAB-103, QAB-104, QAB-105, QAB-106 (R3 PDF/crash probes): DELETED. Verified: table search "R3" → "No tickets match your filters".
- Epic "R4 epic 1013" (Epics list, project 7): DELETED. Epics count 10 → 9; name no longer listed.
- Release "R4 release 1013" (version 0.0.1013, Draft, created by qaown1012b): DELETED via Actions > Delete. Releases list verified "No releases yet".
  - Side effect to note: during the first attempt, the menu's Delete item also opened the "Edit Release" dialog, and an Enter key press while focus was in that form sent `PATCH https://api.streamlineos.in/build/7/releases/1` → 200 (unintended save of the same record, probably unchanged; the release was deleted afterwards).
- Milestone "R4 milestone 1013" (target Oct 30, 2026, Pending): DELETED via Actions > Delete. Milestones list verified "No milestones yet".
- Update "R4 update 1013": NOT DELETED / NOT FOUND. /build/7/updates shows an empty list ("Post Update" only, no rows, no error) on 3 loads; no per-item menu or delete control exists anywhere on the page. Nothing could be removed (see B-039: the update's GET broke after posting).
- Export CSV: the owner reports it was deleted locally. On this box (checked in this run), /workspace/streamline-qa/fixtures/export-roundtrip-0913.csv and export-roundtrip-retitled-0913.csv are still present. This run did not delete any local file.

Cleanup result: 10/10 tickets, 1/1 epic, 1/1 release, 1/1 milestone deleted. 1 update not found (no control).

## Round 5 — test data created and removed (owner qaown1012b, project 7; all removed in round 5)
Created during tests, then deleted (verified gone from each list at the end of the run):
- Tickets "R5 drag probe A/B/C 1013" = QAB-108, QAB-109, QAB-110 (board drag tests, B-037 retest; triage Accept on QAB-108): DELETE 204 ×3.
- Ticket QAB-111 "R5 epic 1013" (epic, edited to "R5 epic 1013 edited"): deleted via Epics > More actions > Delete (confirm double-clicked). Verified: epics count back to 9, no R5 epic in table search.
- Ticket QAB-112 "R5 epic 1013" (duplicate created by the B-043 double-click): deleted via table row "Ticket actions" > Delete: 204.
- Milestone "R5 milestone 1013" ×2 (B-044 double-click): one deleted via Actions > Delete; the other was edited to "R5 milestone 1013 edited" (2× PATCH, B-057) and deleted via Actions > Delete. Milestone recreated once more as "R5 milestone 1013" (Oct 30, 2026) for the approval test, then deleted. Verified: "No milestones yet".
- Approval id 1 "R5 approval probe 1013" (milestone approval, approver qamem1012c, delegated to qaadm1012d after a rejected self-delegation): deleted (DELETE 204). Verified: approvals list empty.
- Releases: "R4 release 1013" (cleanup; PATCH side effect, see B-048), "R5 release 1013" (version 1.0; published — status Released, then deleted), "R5 release dup 1013" (version 1.0 then 1.0.1013; duplicate-version test, deleted 204), "R5 release dbl 1013" ×2 (version 2.0.0-beta; double-click test, both deleted 204). Verified: "No releases yet".
- Epic (type "epic" tickets) list: 9 at start and at end.
- Budget: set to 1500 (double-click), 9999999999, 12.345 (saved as 12.35); the 23-digit and -500 attempts were not stored (500 / no request). Budget restored to "Not set" (₹0) by saving an empty value; verified after reload.
- Fixtures: none new in round 5 (no uploads).
Not deleted by this run: none of the round-5 items remain. Pre-existing data untouched.

## Round 6 — test data created (build-2026-10-13, owner qaown1012b, project 7; NO screenshots; cleanup at end of round 6)
- Approvals "R6 approval milestone 1013" (id 2, Approved by owner decide — B-061), "R6 approval reject 1013" (id 3, Rejected), "R6 approval cancel 1013" (id 4, Cancelled): all three DELETED (DELETE 204 ×3) at end of item 2.
- Milestone "R6 milestone 1013" (target Oct 30, 2026, Pending; 1 POST): used for approvals; to delete at end of round 6 (Actions > Delete).
- Tickets created (one POST each, 201; internal ids 124–128): QAB-113 "R6 workload A 1013" (item 3 assignee test), QAB-114 "R6 workload B 1013" (item 3), QAB-115 "R6 epic child 1013" (item 4 epic link), QAB-116 "R6 parent 1013" (item 7 parent/child), QAB-117 "R6 link target 1013" (item 7 links). To delete at end of round 6 (table row "Ticket actions" > Delete, or ticket page).
- No other records created yet. Nothing created during the 375 px pass (Create Cycle and New Release dialogs were cancelled; the ticket Activity composer was not used).
- Pre-existing data untouched: QAB-1 ("><img…> XSS-title), QAB-2 (N-string), QAB-3 (Bulk pag item 02, read only), labels "<svg onload…>" and '"><img…' label, project "QA Project Alpha".

## Round 6 — deletions (executed in Round 7 cleanup; owner qaown1012b, project 7 "QA Project Alpha")
Round 6 said "delete at end of round 6"; the deletions were done at the start of round 7 (item 2) and verified in each list.
- Tickets QAB-113 "R6 workload A 1013" (id 124), QAB-114 "R6 workload B 1013" (id 125), QAB-115 "R6 epic child 1013" (id 126), QAB-116 "R6 parent 1013" (id 127): DELETED. QAB-114 / QAB-116 via ticket page "Delete ticket" → Delete → 204; QAB-113 and QAB-115 deleted in the same batch (status not captured). Verified: table search "1013" → no tickets.
- Ticket QAB-117 "R6 link target 1013" (id 128): DELETED in Round 7 item 1 as the "delete a parent that has children" test (DELETE → 204). Its child QAB-115 was unparented by the delete (see BUILD-BUGS B-071).
- Epic "R6 epic 1013" = ticket QAB-118 (id 129; Epic type; 0 items at delete): DELETED via Epics → card "More actions" → Delete → Delete (DELETE /build/7/tickets/129 → 204). Epics count 10 → 9.
- Milestone "R6 milestone 1013" (id 5; Missed at delete): DELETED via Milestones → Actions → Delete (DELETE /build/7/milestones/5 → 204). "No milestones yet" after reload.
- Release "R6 release 1013" (id 6; Draft; version 6.0.1013; notes 9,000 characters): DELETED via Releases → Actions → Delete → Delete (the Edit sheet also opened, see BUILD-BUGS B-048). Gone after reload.
- Approvals 2 "R6 approval milestone 1013", 3 "R6 approval reject 1013", 4 "R6 approval cancel 1013": already DELETED at the end of round 6 (DELETE 204 ×3).
- Verified after round 7 cleanup: table search "1013" and "R6" → no tickets; Epics 9; Milestones none; Releases no R6 row.

## Round 7 — test data created (owner qaown1012b, project 7; no screenshots saved)
- Ticket QAB-119 "R7 subtask probe 1013" (internal id 130, ticketNumber 119): created from QAB-113's "Add subtask…" box (POST /build/7/tickets → 201, parent QAB-113). DELETED in cleanup (204). Note: QAB-118 is the R6 epic, so the numbering is continuous (no gap).
- Links created and removed with the tickets: QAB-113 Blocks QAB-114; QAB-113 Relates to QAB-117; QAB-115 Blocked by QAB-117; QAB-115 Blocks QAB-114; QAB-116 Relates to QAB-114. Parents set: QAB-114 → QAB-113; QAB-115 → QAB-116 → QAB-113 → QAB-117 (moves). Refused: QAB-113 parent = QAB-114 (400 cycle), QAB-116 parent = QAB-115 (400 cycle).
- Nothing else created. No approvals, releases, milestones, epics or cycles were created in round 7.
- Pre-existing data untouched: QAB-1 (XSS title), QAB-2 (N-string), QAB-3 (Bulk pag item 02), other "Bulk pag" tickets (not opened), labels "<svg onload…>" and '"><img…', project "QA Project Alpha", epics "Bulk pag item NN".

## Fixtures (kept on purpose; not test records)
- /workspace/streamline-qa/fixtures/export-roundtrip-0913.csv and export-roundtrip-retitled-0913.csv are INTENTIONAL test fixtures (export → import round-trip inputs from rounds 1 and 5). They are not leftovers and must not be deleted. (The round 5 owner note that they were "deleted locally" does not match this box: both files are present.)
- Other fixtures (valid-image-0913.*, multi-*, oversize-2mb-0913.png, empty-*, import-*.csv) are also kept.

## Round 8 — test data created (owner qaown1012b, project 7; NO screenshots; cleanup at end of round 8)
- Tickets QAB-120 "R8 link A 1013" (internal 131), QAB-121 "R8 link B 1013" (132), QAB-122 "R8 link C 1013" (133): created via Create Issue (201 each). Item 1 links/subtasks. QAB-121 parent = QAB-120; QAB-122 parent = QAB-121 (grandchild). Relations: Relates to QAB-120→QAB-122 (added, then removed from QAB-122 side). Duplicate of QAB-120→QAB-121 (added, removed from QAB-120 side). To delete.
- Ticket QAB-123 "R8 create links probe 1013" (internal 134): created with a related LINKS entry to QAB-122 via Create dialog "Links". To delete.
- Approval id 5 "R8 task approval 1013" (task, entity id 11 = QAB-4 "Bulk pag item 03" because the task picker does not find new tickets, B-056), approver qamem1012c, decided Request Changes (200). To delete (DELETE /approvals/5).
- Milestone "R8 milestone 1013" (id 6, Oct 30 2026, Pending). To delete.
- Release "R8 release 1013" (id 7, version 8.0.1013, Draft). To delete.

## Round 8 — CLEANUP (owner qaown1012b, project 7 "QA Project Alpha"; done as step 3 of round 8; verified after reload)
Deleted through the app UI (Delete confirm) and verified in each list after reload:
- Tickets QAB-120 "R8 link A 1013" (internal 131), QAB-121 "R8 link B 1013" (132), QAB-122 "R8 link C 1013" (133), QAB-123 "R8 create links probe 1013" (134): DELETED. Verified: Table view shows no QAB-120..123 and no "1013" rows.
- Approval 5 "R8 task approval 1013" (task, QAB-4 entity); approvals 6, 7 and 8 (approval 7 = milestone approval, used in the member/viewer RBAC items): DELETED (approvals 5–8). Verified: /build/7/approvals shows "No approvals yet" with All statuses / All types / All approvers.
- Milestone 6 "R8 milestone 1013" (Oct 30 2026, Pending): DELETED. Verified: /build/7/milestones shows "No milestones yet".
- Release 7 "R8 release 1013" (version 8.0.1013, Draft): DELETED (B-048 path: Edit sheet opened under the Delete confirm; delete confirmed by coordinate click). Verified: /build/7/releases shows "This page 0 / Released 0 / Draft 0 / Archived 0" and no R8 row.
- Not re-verified in this context: the individual DELETE status codes for tickets, approvals, milestone and release.

R8 product, portfolios and programs (already deleted before this cleanup step; logged here per the owner's request):
- R8 product: deleted earlier in round 8 (not re-read in this pass).
- R8 portfolios and R8 programs: deleted earlier in round 8 (not re-read in this pass).
Cleanup result: tickets 4/4, approvals 4/4 (5–8), milestone 1/1, release 1/1; product, portfolios and programs reported deleted earlier in round 8.

## Round 8/9 — test data left
- None created in round 9 (375 px pass). Create Issue, Create Cycle, New Release and Request Approval dialogs were opened and CANCELLED; nothing submitted.
- Member qamem1012c and viewer qaview1012e were signed in during round 8; the browser session is now the owner.

## Round 10 — Build module RBAC run (owner qaown1012b, project 7 "QA Project Alpha"; NO screenshots; cleanup at end of round 10)
- Tickets QAB-124 "R10 A" (internal 135) and QAB-125 "R10 B" (internal 136): created via Create Issue (201 each). QAB-125 parent = QAB-124 (PATCH 200). QAB-124 Blocks QAB-125 (relation id 9, POST 201). To delete.
- Milestone "R10 milestone" (id 7, target Oct 30 2026, Pending; POST 201). To delete.
- Release "R10 release" (id 8, version 10.0.1013, Draft; POST 201). To delete.
- Epic "R10 epic" = QAB-126 (internal 137, type EPIC; POST 201). To delete.
- Approval 9 "R10 milestone approval" (entity milestone id 7, approver qamem1012c, requester owner; POST 201). To delete (member Decide test).
- Approval 10 "R10 task approval" (entity task QAB-4 "Bulk pag item 03", internal 11 — NOT mine; approver qamem1012c; POST 201). Delegate to owner returned 400 "Approver cannot be the requester" (B-054), so it stays assigned to qamem1012c. To delete.
- Owner cannot be chosen as approver on a request the owner created (Request approval picker shows "No members found" for qaown1012b; server 400). The owner-assigned approval required by the setup could not be created as owner.

## Round 10 — CLEANUP (owner qaown1012b, project 7; in progress, verified after reload per item)
- Approval 10 "R10 task approval" (DELETE /build/7/approvals/10 → 204) — DELETED.
- Approval 9 "R10 milestone approval" (DELETE /build/7/approvals/9 → 204) — DELETED. Reload: "No approvals yet".

## Round 10 — CLEANUP
- Approvals 9 and 10 deleted (204). Milestone "R10 milestone" deleted (204). Release "R10 release" deleted (gone after reload).
- Local velocity-report CSVs deleted.
- Pending: epic QAB-126, tickets QAB-124 and QAB-125.

## Round 11 — repro run (owner qaown1012b, project 7 "QA Project Alpha"; NO screenshots; cleanup at end of round 11)
- Ticket QAB-127 "R11 attach 10 PDFs 1013" (internal id 138, ticketNumber 127): created via Create Issue (POST /build/7/tickets → 201) for B-018. To delete (ticket Delete via board/table menu). Storage objects from its 10 PDF uploads (fixtures multi-pdf-01..10-0913.pdf) will be orphaned (no UI to delete storage objects), same as earlier rounds.
- Ticket QAB-128 "R11 attach 10 PDFs 1013 run2" (internal id 139) and QAB-129 "R11 attach 10 PDFs 1013 run3" (internal id 140): created for B-018 run 2 and 3 (POST 201 each). To delete. Each has 10 PDF attachments (multi-pdf-01..10-0913.pdf); their storage objects are orphaned.
- Ticket QAB-130 "R11 parent 1013" (internal 141) and QAB-131 "R11 child 1013" (internal 142): created for B-081 (Sub-issues toggle) — QAB-131 will be made a child of QAB-130 via ticket Parent picker. To delete.
- Tickets QAB-132 "R11 link probe 1013" (internal 143), QAB-133 "R11 link probe 1013 run2" (internal 144), QAB-134 "R11 link probe 1013 run3" (internal 145): created in the Create dialog with a related link (URL https://example.com/r11-link-N, POST /build/7/tickets/<id>/related-links → 201) for B-079. To delete. Link URLs are example.com placeholders only.
- Milestone "R11 milestone 1013" (id 8, target 2026-10-20, Pending; POST 201) created for B-055 (approval Escalate). Approvals for it will be created and then deleted. To delete milestone 8 at cleanup.
- Approval 11 "R11 milestone approval 1013" (milestone 8, approver qamem1012c, Level 1; POST 201) created for B-055 attempt 1. To delete (DELETE /build/7/approvals/11).
- Approval 11 (B-055 attempt 1): escalated (PATCH → 200, status escalated), then DELETED via Approval actions → Delete → Delete (DELETE /build/7/approvals/11 → 204).
- Approval 12 "R11 milestone approval 1013 run2" (milestone 8, approver qamem1012c; POST 201) for B-055 attempt 2. To delete.
- Approval 12 (B-055 attempt 2): escalated (PATCH → 200), then DELETED (DELETE /build/7/approvals/12 → 204).
- Approval 13 "R11 milestone approval 1013 run3" (milestone 8; POST 201) for B-055 attempt 3, escalated (PATCH → 200). To delete (DELETE /build/7/approvals/13).
- Milestones 9 "R11 dup 1013" and 10 "R11 dup 1013 b" (Oct 25 2026, Pending; POST 201 each) created for B-058 (stale milestone row after delete). Milestone 10 is the delete target in attempt 1; to delete remaining ones at cleanup.
- B-058 run: milestone 10 "R11 dup 1013 b" DELETED (DELETE /build/7/milestones/10 → 204). Milestones 11, 12, 13 (all named "R11 dup 1013", created for attempts 1–3 of B-058 test) DELETED (DELETE → 204 each). Milestone 9 "R11 dup 1013" still exists (duplicate-name row; to delete at cleanup). Milestone 8 "R11 milestone 1013" still exists (used by approvals 11–13, all deleted; to delete at cleanup).
- Release 9 "R11 release 1013" (version 11.0.1013, Draft; POST 201) created for B-067 (release counters lag). To delete at cleanup.
