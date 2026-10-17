# RBAC-ROUND10 — build-2026-10-13 (Build module, project 7)
One line per observation: role | action | UI shown/hidden | result/status.

SETUP (owner qaown1012b, before member sign-in)
- owner | create R10 A (QAB-124) and R10 B (QAB-125) | Create Issue dialog shown | 201 each
- owner | B parent = A (Parent picker) | Add parent shown | PATCH 200 (Subtasks 0/1 on A)
- owner | A Blocks B (Relations > Add > Blocks) | Relations Add shown | POST /relations 201
- owner | create milestone "R10 milestone" (id 7) | New Milestone dialog | 201
- owner | create release "R10 release" (id 8) | New Release dialog | 201
- owner | create epic "R10 epic" = QAB-126 | Create epic dialog | 201
- owner | milestone approval id 9, approver qamem1012c | Request milestone approval | 201
- owner | task approval id 10 (entity QAB-4), approver qamem1012c | Request task approval | 201
- owner | task approval with OWNER as approver | Approver picker shows "No members found" for qaown1012b (owner not offered) | NOT CREATED; Delegate to owner -> PATCH /approvals/10 400 "Approver cannot be the requester" (B-054 still reproduces)
- owner | task picker search for new tickets "R10 A"/"R10"/"QAB-125" | No items (B-056 still reproduces on fresh load)
MEMBER qamem1012c (signed in via guerrillamail OTP qamem1012c@sharklasers.com after clear site data; 429 wait observed; dashboard reached)
- member | /build/7/approvals list | list shown (2 rows: R10 milestone approval, R10 task approval, both approver qamem1012c, Pending); "Request approval" button HIDDEN | PASS (read access)
- member | row "Actions" cell for R10 milestone approval (assigned to me) | Actions cell EMPTY (no "Approval actions" button, no Decide item) | Decide NOT reachable from list (see next line for detail-page check)
- member | click row R10 milestone approval (detail) | no detail sheet/dialog opened; no Decide control shown | FAIL/UNCLEAR — Decide not available to the assigned approver from list or row click
- member | row "Actions" for R10 task approval (assigned to me) | empty; no Decide | FAIL — new bug B-084 (no Decide for assigned approver)
- member | Decide (approve) on approval assigned to me (ids 9 and 10) | Decide control HIDDEN (no UI path, /build/7/approvals/9 → Page Not Found) | BLOCKED by UI — B-084 filed; decision NOT recorded
- member | Decide on approval assigned to OWNER | NOT TESTABLE: owner cannot be made approver of owner-requested approvals (picker "No members found"; delegate → 400 "Approver cannot be the requester", B-054) so no owner-assigned approval exists
- member | Inbox "Approval requested" item | item opens empty panel, no link to approval | observation (folded into B-084)
- member | QAB-124 (R10 A) view Relations | Blocks → R10 B shown (read-only) | PASS (view)
- member | QAB-124 Relations "Add" | control HIDDEN (no Add button) | PASS (hidden) for role — see RBAC table
- member | QAB-124 remove link | no remove control on relation card | HIDDEN
- member | QAB-124 Add subtask | "Add subtask…" input HIDDEN; Subtasks shows 0/1 (R10 B) read-only | HIDDEN
- member | QAB-124 field controls (Status/Priority/Type/Points/Epic/Workstream/Cycle) | rendered disabled | HIDDEN/DISABLED (only "To Do" status combobox, disabled)
- member | QAB-125 (R10 B) view parent | Parent shows QAB-124 R10 A | PASS (view)
- member | QAB-125 Remove parent | no Remove parent / Parent picker control; Parent field not editable | HIDDEN
- member | QAB-125 Relations | shows "Blocks — R10 A" (should read Blocked by; B-070 re-confirmed); read-only, no Add | add HIDDEN; B-070 reproduces
- member | /build/7/milestones row "R10 milestone" → "Actions for R10 milestone" menu | menu shows ONLY "Edit" (no Delete) | Delete HIDDEN (PASS); Edit VISIBLE
- member | Milestone Edit → change name to "R10 milestone edited" → Save Changes | Edit dialog opens and fields are editable; Save sends NO request; toast "Missing permission: build:workspace:manage"; dialog stays open | Edit visible but blocked client-side — see B-085
- member | /build/7/releases row "R10 release" → Actions | (see next lines) |
- member | /build/7/epics "R10 epic" card | epic list shows "View" only; (see next lines) |
- member | /build/7/releases: Actions column | no Actions column / no row menu for member | Delete HIDDEN (PASS)
- member | /build/7/releases row click "R10 release" | opens "Edit Release" sheet (editable) | Edit VISIBLE
- member | Release Save Changes (Name → "R10 release edited") | no request; toast "Missing permission: build:manage"; sheet stays open; name unchanged | Edit visible but blocked — B-085 (also releases)
- member | /build/7/epics "R10 epic" card | card expands only; no "More actions", no Edit, no Delete, no "Create epic" | Edit/Delete HIDDEN (PASS)
- member | /build/7/reports (direct URL) | page renders (Agile Reports, Overview/Quality/Workload tabs, charts) | VIEW allowed (PASS)
- member | /build/7/reports "Export velocity CSV" | button shown and enabled; browser download velocity-report.csv produced | ALLOWED (view-level export)
- member | Direct URL /build/7/approvals | list renders (2 rows); no "Request approval" button | PASS (view), create HIDDEN
- member | Direct URL /build/7/releases | list renders (R10 release, Draft); no "New Release" control; no Actions column | PASS (view), create/delete HIDDEN; edit via row click visible → B-085
- member | Milestone Delete | only "Edit" in the milestone action menu; no Delete | Delete HIDDEN (PASS)

VIEWER qaview1012e (clear site data again; signed in via guerrillamail OTP qaview1012e@sharklasers.com; dashboard reached)
- viewer | Direct URL /build/7/approvals | "Access Restricted" (required build:approvals:view), redirected to /access-denied | PASS (blocked)
- viewer | Direct URL /build/7/releases | "Access Restricted" (required build:view), redirected to /access-denied | PASS (blocked)
- viewer | Direct URL /build/7/reports | "Access Restricted" (required build:view), redirected to /access-denied | PASS (blocked)
- viewer | QAB-124 (R10 A) direct URL view | "Access Restricted" (build:tickets:view), redirected to /access-denied; no ticket data | PASS (blocked)
- viewer | QAB-125 (R10 B) direct URL view | "Access Restricted" (build:tickets:view) | PASS (blocked)
- viewer | View links on R10 A/B | not reachable (ticket pages blocked) | BLOCKED (N/A)
- viewer | Add link / remove link / Remove parent / Add subtask on R10 A/B | not reachable (ticket pages blocked) | HIDDEN (PASS, route-level)
- viewer | Direct URL /build/7/milestones (edit/delete) | "Access Restricted" (build:view) | PASS (blocked)
- viewer | Direct URL /build/7/epics (edit/delete) | "Access Restricted" (build:tickets:view) | PASS (blocked)
- viewer | Releases edit/delete (/build/7/releases) | "Access Restricted" (build:view) | PASS (blocked)
- viewer | Approvals Decide on approval 9/10 (assigned to qamem1012c) | /build/7/approvals "Access Restricted" (build:approvals:view); no approval visible | PASS (blocked)
- viewer | /build/7/issues | "Access Restricted" (build:tickets:view); R10 not visible | PASS (blocked)

OWNER re-check (after viewer, before cleanup)
- owner | QAB-125 Remove parent | PATCH /tickets/136 → 200; Parent becomes "Add parent" | done
- owner | B-082 history after Remove parent (QAB-125) | HISTORY shows only "created this ticket" | B-082 STILL REPRODUCES
- owner | QAB-124 Relations: Remove relation (Blocks → R10 B) | DELETE /tickets/135/relations?relatedId=136 → 204 | done
- owner | B-082 history after relation removal (QAB-124 and QAB-125) | only "created" entries | B-082 STILL REPRODUCES (2/2 + set case)
