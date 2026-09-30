> Last updated: 2026-09-29 18:18 IST (owner pass 3 merged; DRAFT v1.0 owner-complete)

# Streamline Build OS — QA Report

**Status:** DRAFT v1.0 — **owner-complete**. All 12 owner gap items from the pass-3 brief were exercised or marked N/A / blocked with a reason. A few owner-reachable sub-checks (webhooks, retention, 1440 px, etc.) are still listed as NOT TESTED in §13. Member / Client / Restricted-Client testing is still **BLOCKED** (see §13).
**Env:** https://www.streamlineos.in/build. Orgs: **Alpha Digital Agency** (Org A) and **Beta Software Labs** (Org B). The Streamline OS org was not touched.
**Tester session:** Owner account (A1) only. Alpha HR module left **OFF** (Tarun decision 2026-09-29 17:38 IST). No Member promoted to Org Admin to work around the gate.
**Dates:** 2026-09-29 ~13:00–18:20 IST (owner pass 3: ~17:45–18:20 IST).
**Sources:** BUILD_OS_LIVING_NOTES.md, BUILD_BUG_DRAFTS.md, OWNER_PASS_NOTES.md, VALIDATION_DEBOUNCE.md, ACME_SEED.md, ALPHA_PROJECTS.md, ALPHA_INVITES.md, ALPHA_ACCEPT.md, HR_GATE.md
**Evidence folder:** /workspace/streamline-orgs/ (acme-*, alpha-*, beta-*, val-*, owner-*, owner2-*, owner3-*, accept-*, hr-off-*)

---

## 1. Executive Summary

**Verdict (draft): NOT READY for an agency to run client delivery on it.** The single-owner feature surface is broad and mostly functional, but:

1. **Multi-user onboarding is broken (P0).** Every invited Member (including the intended Client A8) is force-redirected to an HR employee-onboarding form that needs bank/IFSC/PAN, and its final submit fails with 400. The gate stays in place even with the HR module OFF (BUG-018/019/030). As a result, no non-owner user could reach Build at all. The multi-role collaboration, permission matrix and client-portal isolation tests are **BLOCKED**.
2. **Invite security (P0).** Join links sign the invitee straight in with no proof of email ownership (BUG-020). There's no Client or Restricted-Client role, and project roles are "informational only" (access is org-level) (BUG-001/002/021/034). Once the onboarding gate is fixed, a client invited as Member would likely see internal data. That's a **CRITICAL risk, not yet provable**.
3. **Owner-side core delivery works with notable breaks:** issues, cycles, epics, milestones, releases, QA suites/runs, risks, decisions, wiki, files, saved views, intake, incidents, CRs, meetings and whiteboard all create and persist. The broken parts are Modules (500), board drag-and-drop, type change on the detail page, meeting action items (400), and approvals (approver/title not honored).
4. **Systemic engineering gaps:** no double-submit guard on create dialogs (duplicates in QA cases/runs, approvals, incidents); semantic validation missing (whitespace titles, non-semver, inverted dates); server 400s surfaced as generic toasts or silence; SPA route "bounce-back" and stale lists after actions; floating Feedbucket widget covering primary actions.
5. **Org isolation (owner smoke): PASS.** Beta shows no Alpha projects, and the Alpha deep link from Beta → Page Not Found. Re-smoked in pass 3 with the same result.
6. **AI:** ticket-level AI couldn't be evaluated (trial AI credits exhausted → 402). In pass 3 the Ask OS assistant did answer ("Summarize my day"). There's no AI Agents page (404 / not in nav).
7. **Pass 3 (owner gaps closed):** chat, forms, automations, custom fields, reports + CSV export, budget, goals and portfolios work for the owner. New defects are in Managed Products (list empty after create), Templates (default tasks dropped), Programs (stale list), cycle board counts (project-wide), and chat composer (not cleared). The New Issue dialog **does** guard double-submit, unlike the other create dialogs.

**Is the UI good enough that a serious team would switch? Not yet.** The visual design is clean and modern, and the feature breadth rivals Linear/Jira/ClickUp. But reliability (silent failures, duplicates, stale views, broken DnD) and the broken multi-user onboarding would stop a team in its first week.

## 2. Coverage Summary

Legend: **Done** = exercised with evidence; **Partial** = some sub-checks done or failed mid-way; **Blocked** = can't be exercised under current constraints; **Not tested** = reachable, not reached yet.

| # | Area (brief scope #) | Status | Result | Key refs |
|---|---|---|---|---|
| 1 | Account & onboarding / invites (1) | Partial | FAIL | BUG-001/002/018/019/020/030/031 |
| 2 | Org create (A/B) | Done | PASS | living notes |
| 3 | Portfolios / programs / goals / templates / products (2,3,5,6) | Done (pass 3) | PARTIAL: portfolio/goal PASS; program stale list; product list empty; template tasks dropped | BUG-053/054/055/056 |
| 4 | ≥4 projects (4) | Done | PASS (with UX issues) | BUG-003/004/005 |
| 5 | Command Center / My Work / Inbox (7,8) | Partial | PASS (counts matched) | alpha-command-center-4proj-3open-0overdue.png |
| 6 | ≥40 issues seeded (9) | Done | PASS (49 tickets ACP-1..49) | ACME_SEED.md, CSV import |
| 7 | Board (10) | Partial | FAIL (DnD, fake due date) | BUG-010/013/015 |
| 8 | List / Table / Workload sync (11) | Done | PASS; Gantt 404 | owner2-board-synced-*, BUG-032 |
| 9 | Saved views (12) | Partial | PASS on refresh; logout not tested | owner2-savedview-* |
| 10 | Backlog → sprint (13) | Partial | FAIL (backlog shows all) | BUG-014 |
| 11 | Epics (14) | Done | PASS (race once) | BUG-012 |
| 12 | Modules (15) | Blocked by bug | FAIL (500) | BUG-008 |
| 13 | Milestones (16) | Done | PASS (not on timeline) | BUG-032 |
| 14 | Cycles/Sprints (17,18) | Partial | Start PASS; cycle board counts wrong; complete/carry-over not tested | BUG-017, BUG-057 |
| 15 | Intake → Triage (19) | Done | PARTIAL/FAIL | BUG-037/038/039 |
| 16 | Ticket detail depth (20) | Partial | Mostly PASS; draft bug; image attachment not verified | BUG-009/050 |
| 17 | Import/export (21) | Done | PASS (16 rows imported) | living notes |
| 18 | QA suites/runs (22) | Done | PASS w/ bugs | BUG-022/028 |
| 19 | Releases (23) | Partial | PASS draft; release→client not tested | BUG-026 |
| 20 | Incidents (24) | Done | PASS w/ bugs | BUG-043/044 |
| 21 | Change requests (25) | Done | PASS w/ bugs | BUG-045 |
| 22 | Approvals (26) | Done | FAIL | BUG-040/041/042 |
| 23 | Risks / Decisions (27,28) | Done | PASS w/ validation bugs | BUG-024/027 |
| 24 | Budget (29) | Done (pass 3) | PASS (₹5L set; actual-from-timesheets not exercised) | owner3-budget-set.webp |
| 25 | Status updates (30) | Done | FAIL (draft/no publish) | BUG-046 |
| 26 | Meetings + action items (31) | Done | Meeting PASS / action items FAIL | BUG-048/049 |
| 27 | Wiki (32) | Done | PASS w/ bugs | BUG-033/035 |
| 28 | Files (33) | Done | PASS (PDF) | owner-acme-files-upload-pdf-PASS.png |
| 29 | Whiteboard (34) | Done | PASS (persist) / UX FAIL | BUG-051 |
| 30 | Project chat ≥3 users (35) | Partial: owner Done / multi-user **Blocked** | Owner PASS w/ bugs (composer not cleared; convert→task ACP-50 OK) | BUG-058 |
| 31 | Forms "Bug Report" (36) | Done (pass 3) | PASS (create, required validation, submission); no ticket without an action | BUG-059 |
| 32 | Feedbucket → work item (37) | Blocked / N/A | No in-app Feedbucket integration; the widget is the vendor's own feedback tool (not sent, no spam) | owner3-feedbucket-no-build-tool.webp |
| 33 | Client portal A8 / A9 (38,39) | **Blocked** | – | §7 |
| 34 | Reports / Agile charts / export (40,41) | Done (pass 3) | PASS (Reports 51/49/2 match board; velocity CSV export OK); project Overview KPI still FAIL | BUG-036, BUG-057 |
| 35 | Workload & capacity (42) | Partial | PASS (owner counts) | owner2-workload-44-* |
| 36 | Timesheets multi-user (43) | Blocked (multi-user) | – | – |
| 37 | AI features (44) | Partial | Ticket AI blocked (402, last known); Ask OS answered in pass 3 | BUG-052, owner3-askos-works.webp |
| 38 | AI Agents (45) | Done (pass 3) | N/A: no AI Agents page (404, not in nav/palette) | owner3-ai-agents-not-found-palette.webp |
| 39 | Workflow / custom fields / automations / webhooks / retention (46–50) | Partial (pass 3) | Statuses view, custom field, automation create PASS; webhooks/retention/transitions not tested | BUG-035 ext., BUG-007/016 ext. |
| 40 | Access matrix (51) | **Blocked** | – | §5 |
| 41 | Org isolation (52) | Done (owner smoke, re-run pass 3) | PASS | §6 |
| 42 | Client isolation (53) | **Blocked** | – | §7 |
| 43 | Search/filters/modals (54) | Partial | PASS (triage search URL sync) | owner2-triage-search-checkout-12.png |
| 44 | Responsive (55) | Partial | 390/768/1366 done (usable; Feedbucket overlap); 1440 not tested | §11 |
| 45 | Validation / double-submit / refresh (56) | Done (owner forms) | FAIL pattern; New Issue empty + double-click PASS; search debounce PASS-with-issue | VALIDATION_DEBOUNCE.md VAL-23..28, BUG-060 |
| 46 | Full E2E BNPL lifecycle (57) | Blocked (multi-role) / partial pieces | – | §8 |
| 47 | Org B workflow (58) | Partial (isolation only) | – | §6 |
| 48 | Multi-project issues Nova / Orbit (4, item 18) | Done (pass 3) | PASS (NMB-1/2, OPP-1; separate keys, no leakage into Acme) | owner3-nova-issues-created.webp, owner3-orbit-issue-created.webp |

Tally: **Done 26 · Partial 15 · Blocked 7 · Not tested 0** (of 48 rows; some rows span several brief items). "Not tested 0" means every row has been touched. Leftover sub-checks inside Partial rows are listed in §13. The v0.9 tally line was miscounted; it's recounted here.

## 3. Bug Summary

Source: BUILD_BUG_DRAFTS.md (BUG-001–060, deduped). Severities follow the brief.

| Severity | BUG-001–035 (pass 1) | BUG-036–052 (owner pass 2) | BUG-053–060 (owner pass 3) | Total |
|---|---|---|---|---|
| CRITICAL | 6 (002, 018, 019, 020, 030, 034) | 0 | 0 | **6** |
| HIGH | 10 (001, 005, 006, 008, 009, 010, 021, 022, 023, 031) | 2 (041, 049) | 0 | **12** |
| MEDIUM | 14 (003, 004, 011, 012, 013, 014, 016, 024, 025, 027, 028, 032, 033, 035) | 9 (036, 037, 038, 040, 042, 043, 046, 047, 048) | 3 (053, 054, 057) | **26** |
| LOW / LOW-MED | 5 (007, 015, 017, 026, 029) | 6 (039, 044, 045, 050, 051, 052) | 5 (055, 056, 058, 059, 060) | **16** |
| **Total** | 35 | 17 | 8 | **60** |

Retest status: BUG-009 and BUG-010 retested (still reproduce). BUG-030 confirmed after HR OFF. BUG-013 re-confirmed in pass 2 and again in pass 3 (board cards at 768/1366). BUG-036 re-confirmed in pass 3 (Overview 51 vs Reports 49). BUG-035 and BUG-007/016 extended in pass 3. The rest are single-observation unless noted. BUG-002 and BUG-034 are CRITICAL *candidates* whose real impact is unprovable until Members can log in.

## 4. Detailed Bugs

Format: Severity · Area · Steps · Expected · Actual · Impact · Evidence · Retest. Evidence is under /workspace/streamline-orgs/ unless noted.

### BUG-001 — Invite roles limited to Member / Org Admin
- **Severity:** HIGH · **Area:** Administration → People → Invite User
- **Steps:** Org settings → Members & Access → Invite User → Role dropdown
- **Expected:** PM / Developer / QA / Designer / Viewer / Client / Restricted Client (or project-scoped equivalents)
- **Actual:** Only Member and Org Admin, although Roles & Permissions lists 44 module roles
- **Impact:** No least-privilege provisioning. Clients get Member.
- **Evidence:** alpha-invite-role-options.webp, ALPHA_INVITES.md · **Retest:** pending

### BUG-002 — No Client / Restricted Client role at invite
- **Severity:** CRITICAL (candidate) · **Area:** Invite + client portal
- **Expected:** Distinct Client / Restricted Client roles with reduced visibility
- **Actual:** None. A8/A9 invited as Member.
- **Impact:** Client isolation can't be configured. Clients risk internal access.
- **Evidence:** ALPHA_INVITES.md · **Retest:** pending (blocked by BUG-018)

### BUG-003 — New empty project shows Health "At risk" + Status "In progress"
- **Severity:** MEDIUM · **Area:** Project create / overview
- **Expected:** Not started / Healthy or neutral empty-state
- **Actual:** At risk + In progress with 0 issues. Later "Critical" at 4% progress.
- **Evidence:** alpha-project-acme-overview.png, owner2-overview-open48-includes-done-health-critical.webp

### BUG-004 — Project wizard Features vs Review mismatch
- **Severity:** MEDIUM · **Area:** New Project wizard
- **Actual:** Features step shows Backlog/Kanban/Epics/Bug Tracker/QA ON. Review lists only Epics, Time Tracking, Wiki, and omits PM/client/dates.
- **Evidence:** alpha-project-wizard-review-acme.png

### BUG-005 — Cannot attach a client to a Build project
- **Severity:** HIGH · **Area:** Project Client field / CRM
- **Actual:** Dropdown only "No client". CRM clients exist only via won-lead conversion. Contacts/Companies/Business Parties/Clients overlap.
- **Impact:** The agency multi-client model can't be represented.
- **Evidence:** alpha-crm-clients-empty-won-lead-only.png

### BUG-006 — CRM overview failed to load (seen once)
- **Severity:** HIGH (if reproducible) · **Area:** /crm
- **Actual:** "Failed to load CRM data" + 4 console errors. /crm/clients loaded fine.
- **Evidence:** alpha-crm-overview-error.png · **Retest:** required

### BUG-007 / BUG-016 — Feedbucket widget overlays and blocks controls (merged)
- **Severity:** MEDIUM · **Area:** Global chrome
- **Actual:** `#feedbucket-root` intercepts pointer events over the date-picker Next button, table date picker, QA run delete, Approvals row "…", and Meeting "Save Notes". At 390 px it covers the 2nd board column.
- **Evidence:** acme-bug-feedbucket-blocks-calendar-next.png, acme-bug-table-datepicker-under-feedbucket.png, owner2-feedbucket-widget-blocks-row-actions.webp, owner-acme-board-390w-responsive.png

### BUG-008 — Module create fails HTTP 500, silent UI
- **Severity:** HIGH · **Area:** Project Modules
- **Steps:** Modules → New Module → name (± dates) → Create
- **Expected:** Module created or clear error
- **Actual:** 500, no message, dialog stays open. 0/5 modules could be created.
- **Evidence:** acme-bug-module-create-500-silent.png · **Retest:** required

### BUG-009 — Type change to Bug on detail page blanks the page ("Bug not found")
- **Severity:** HIGH · **Area:** Issue detail
- **Actual:** Page blanks, 404 `/build/40/bugs/<id>`, "Bug not found". The change persists after reload. Works from Table.
- **Evidence:** acme-bug-type-change-to-bug-blank-page.png, acme-bug009-retest-blank-after-type-bug.png · **Retest:** FAIL (reproduced)

### BUG-010 — Board drag-and-drop does nothing
- **Severity:** HIGH · **Area:** Kanban board
- **Actual:** Card stays in place, no error, with both Playwright drag and native mouse drag. The empty column says "Drop a ticket here".
- **Evidence:** acme-bug-board-dnd-no-effect.webp, acme-bug010-retest-dnd-no-effect.png · **Retest:** FAIL (reproduced)

### BUG-011 — Story points sometimes not saved on create
- **Severity:** MEDIUM · **Actual:** ACP-8/12/13 have no points despite entry. "Create more" carries points over but resets priority.

### BUG-012 — Epics count/list race after create
- **Severity:** MEDIUM · **Actual:** Count 1 with empty list; later all 3 · **Evidence:** acme-bug-epic-count1-list-empty.png

### BUG-013 — Board shows fake due date on cards with none
- **Severity:** MEDIUM · **Actual:** Cards show "Sep 29, 2026". Table/List show empty. · **Retest:** re-confirmed pass 2

### BUG-014 — Backlog lists all tickets (sprint, done, epics)
- **Severity:** MEDIUM · **Expected:** Unscheduled only · **Actual:** All tickets listed, no cycle/type columns · **Evidence:** acme-backlog-final.png

### BUG-015 — Epics appear as Todo cards; Done header/body disagree
- **Severity:** LOW-MED · **Actual:** Epics inflate Todo. Done header "2 tickets" vs body "Nothing done yet". About 9 cards render per column.

### BUG-017 — Naming: Cycles only (no Sprint); "iteration" only in subtitle
- **Severity:** LOW · **Impact:** Migration expectation mismatch for Scrum teams

### BUG-018 — Members forced into HR employee onboarding; cannot reach Build
- **Severity:** CRITICAL · **Area:** Post-invite gate
- **Steps:** Accept Member invite (A3/A4/A7/A8) → open /build/40
- **Expected:** Members/Clients reach Build / portal without payroll data
- **Actual:** Redirect to /employee-onboarding needing bank, IFSC, PAN. No skip for Members.
- **Evidence:** accept-a8-client-forced-employee-onboarding.webp, ALPHA_ACCEPT.md

### BUG-019 — Employee onboarding final submit always 400 "Validation failed"
- **Severity:** CRITICAL (with BUG-018 it traps users) · **Actual:** A3 submit failed 3× with no field mapping · **Evidence:** accept-a3-onboarding-submit-validation-failed.webp

### BUG-020 — Invite join link grants access without email verification
- **Severity:** CRITICAL · **Area:** Invite accept
- **Actual:** Opening the link + entering a name + Accept creates the account and signs in. Anyone holding the link becomes that user.
- **Evidence:** ALPHA_ACCEPT.md

### BUG-021 — No Client role; project access team-based only
- **Severity:** HIGH (CRITICAL once Members get in) · **Evidence:** ALPHA_ACCEPT.md

### BUG-022 — Double-click Create duplicates QA test cases / runs
- **Severity:** HIGH · **Actual:** TC-1/TC-2 and Run #1/#2 duplicates · **Evidence:** val-qa-tc-doubleclick-created-2-duplicates-FAIL.png, val-qa-run-doubleclick-2-runs-FAIL.png

### BUG-023 — Rapid title edit before Create saves stale value
- **Severity:** HIGH · **Actual:** First typed value persisted · **Evidence:** val-qa-tc-rapid-edit-stale-title-saved-FAIL.png

### BUG-024 — Whitespace-only title accepted
- **Severity:** MEDIUM · **Actual:** Blank RISK-1 created · **Evidence:** val-risk-whitespace-title-accepted-blank-RISK-1-FAIL.png

### BUG-025 — 600-char title → 400 with no field message
- **Severity:** MEDIUM · **Evidence:** val-qa-tc-600char-title-400-no-field-error-FAIL.png

### BUG-026 — Release version non-semver accepted; notes counter stuck at 0
- **Severity:** LOW-MED · **Evidence:** val-release-invalid-version-accepted-FAIL.png, val-release-notes-counter-stuck-0.png

### BUG-027 — Decision revisit date before decided date accepted
- **Severity:** MEDIUM · **Evidence:** val-decision-revisit-before-decided-accepted-FAIL.png

### BUG-028 — QA run header stuck "Not Started" at 100%
- **Severity:** MEDIUM · **Evidence:** acme-qa-run1-header-not-started-while-100pct.png

### BUG-029 — Org switch drops to Home dashboard; /build/projects 404
- **Severity:** LOW-MED · **Evidence:** living notes

### BUG-030 — Onboarding gate not tied to HR module flag
- **Severity:** CRITICAL · **Steps:** Alpha → Modules → HR OFF → sign in as A3/A8 → /build/40
- **Actual:** Still redirected from every route incl. client-portal. Copy says "before using HR".
- **Evidence:** hr-off-a3-build40-redirects-employee-onboarding-BLOCKED.webp, HR_GATE.md · **Retest:** confirmed

### BUG-031 — Old join links → blank sign-in / "Invalid or expired invitation"
- **Severity:** HIGH · **Actual:** 404 shown as a blank auth panel, no message · **Evidence:** ALPHA_ACCEPT.md

### BUG-032 — Timeline omits undated items and milestones; Gantt 404
- **Severity:** MEDIUM · **Actual:** 6/46 items shown, no milestones, /gantt and /roadmap 404 · **Evidence:** owner-acme-timeline-6-dated-items.png

### BUG-033 — Wiki "New page" auto-persists Untitled; list shows "Owner missing"
- **Severity:** MEDIUM · **Evidence:** owner-acme-wiki-page-created-owner-missing.png

### BUG-034 — Client portal: referenced "Client Access settings" doesn't exist; project roles informational only
- **Severity:** CRITICAL (agency client isolation) · **Actual:** No grant path found (/settings/client-access 404). Access governed by org role.
- **Evidence:** owner-acme-client-portal-preview-empty-unpublished.png

### BUG-035 — Global "c" shortcut opens New Issue while typing
- **Severity:** MEDIUM · **Area:** Wiki editor focus edge

### BUG-036 — Overview "Open issues" counts Done tickets
- **Severity:** MEDIUM · **Area:** Project overview KPIs
- **Actual:** Open 48 = Done 2 + In progress 4 + In review 1 + Todo 41. It should exclude Done.
- **Evidence:** owner2-overview-open48-includes-done-health-critical.webp

### BUG-037 — Triage = every TODO ticket; list stale after Accept
- **Severity:** MEDIUM · **Steps:** /build/40/triage → Accept ACP-12
- **Actual:** "41 awaiting triage" (incl. epics and planned sprint work). Toast OK, but the list still showed ACP-12 until reload. Accept jumps to In Progress.
- **Evidence:** owner2-triage-41-all-todo.png

### BUG-038 — Intake Accept: raw Zod error; chosen state ignored
- **Severity:** MEDIUM · **Steps:** Intake → item → Accept & Create with no State; then State = Backlog
- **Actual:** "Invalid input: expected string, received undefined". Backlog choice produced ACP-49 in TODO. No link to the created ticket. No In Review option.
- **Evidence:** owner2-intake-accept-raw-zod-error.png, owner2-intake-acp49-created-todo-not-backlog.png, owner2-intake-accepted-no-ticket-link.png

### BUG-039 — Intake Accept/Decline icon buttons unnamed (a11y)
- **Severity:** LOW

### BUG-040 — Approvals double-submit creates duplicates
- **Severity:** MEDIUM · **Evidence:** owner2-approvals-doubleclick-2-dupes.png

### BUG-041 — Approvals: typed title and chosen approver not honored
- **Severity:** HIGH · **Steps:** Request release approval → title "Go/no-go: …", approver A3 PM → Submit
- **Expected:** Saved with typed title, routed to A3
- **Actual:** Title "Approve release: Acme Commerce v2.0". Approver column = Owner. Viewer/Client selectable as approvers, A5/A6 missing.
- **Impact:** Approvals may route to the wrong person, undermining sign-off governance.
- **Evidence:** owner2-approvals-doubleclick-2-dupes.png, owner2-approvals-approved-1-dupe-pending.png

### BUG-042 — Approvals bulk "Cancel selected" is a no-op
- **Severity:** MEDIUM · **Evidence:** owner2-approvals-cancel-selected-noop.png

### BUG-043 — Incidents double-submit creates INC-1 + INC-2; empty submit shows no message
- **Severity:** MEDIUM · **Evidence:** owner2-incidents-doubleclick-INC1-INC2-dupes.png

### BUG-044 — Incident list shows SLA "On track" when no SLA is set
- **Severity:** LOW · **Evidence:** owner2-incident-INC1-detail-no-sla-vs-ontrack.png

### BUG-045 — Change requests: no create loading state; negative estimate → generic toast; no CR detail/decision action
- **Severity:** LOW-MED · **Evidence:** owner2-cr1-negative-estimate-generic-validation-failed.png, owner2-cr1-paypal-created-submitted.png

### BUG-046 — Status update "Post" creates Draft + Internal with no publish/visibility control
- **Severity:** MEDIUM · **Impact:** Client status reporting unusable from this surface · **Evidence:** owner2-update-posted-as-draft-internal.png

### BUG-047 — SPA route bounce-back
- **Severity:** MEDIUM · **Actual:** Tab/route changes revert to the previous route (client portal Preview→Visibility, Visibility→Grants, timeline/files/wiki). The incidents deep link renders the list first. The URL and view drift apart.
- **Evidence:** owner2-client-portal-preview-tab-bounced-to-visibility.png

### BUG-048 — Meetings default to UTC; times shown without TZ label
- **Severity:** MEDIUM · **Evidence:** owner2-meeting-MTG1-created-utc-time.png

### BUG-049 — Meeting action items: Add Item returns 400, no UI error
- **Severity:** HIGH · **Steps:** MTG-1 → New Action Item → Title (± assignee/due) → Add Item
- **Actual:** POST /build/40/meetings/1/action-items → 400 (3/3). Modal stays open with no message.
- **Impact:** Meeting → work follow-through impossible
- **Evidence:** owner2-meeting-action-item-400-silent.png

### BUG-050 — Comment draft not cleared after posting
- **Severity:** LOW-MED · **Actual:** Inbox → Comment Drafts and the sidebar still show the posted text. 400 on /build/comment-drafts/tickets/260.
- **Evidence:** owner2-bug-comment-draft-not-cleared-after-post.webp

### BUG-051 — Whiteboard "Unsaved" never clears; Save gives no feedback; false beforeunload
- **Severity:** LOW-MED · **Actual:** Content persisted after reload despite the indicator. Ctrl+S opens the browser Save dialog.
- **Evidence:** owner2-whiteboard-persisted-after-reload.png

### BUG-052 — AI 402 handling inconsistent
- **Severity:** LOW · **Actual:** Suggest subtasks: silent 402. Improve: clear "AI credits exhausted" panel. · **Evidence:** owner2-ai-improve-credits-exhausted.webp

### BUG-053 — Managed Products list empty after create
- **Severity:** MEDIUM · **Area:** Org Build → Products (/build/managed-products)
- **Steps:** New product → "QA owner3 Nova App" → Create → reload
- **Expected:** The product is listed
- **Actual:** Success toast, but the page still says "No managed products yet" after reload. The product **does** appear in the scope switcher under Browse.
- **Impact:** Products can't be managed or linked from their own page, and users may create duplicates.
- **Evidence:** owner3-product-created-list-empty.webp, owner3-product-list-empty-after-reload.webp, owner3-product-exists-in-switcher.webp · **Retest:** pending

### BUG-054 — Templates drop default tasks; focus jumps while typing the name
- **Severity:** MEDIUM · **Area:** Org Build → Templates
- **Steps:** New Template → type the name → Add Task (title) → Save → reload
- **Expected:** Template saved with 1 task, and the name field keeps focus while typing
- **Actual:** Focus jumped from Template Name to the task title mid-typing (name left as "QA o"). After I corrected it and saved, the card shows "0 tasks / No tasks defined", even after reload.
- **Impact:** Templates can't bootstrap work, which defeats their purpose.
- **Evidence:** owner3-template-form-with-task.webp, owner3-template-focus-jump.webp, owner3-template-0-tasks-after-reload.webp

### BUG-055 — Programs list stale after create
- **Severity:** LOW-MED · **Actual:** The "Program created" toast shows, but the list stays at "No programs yet" until reload (same stale-list family as BUG-012/037). · **Evidence:** owner3-program-toast-list-stale.webp, owner3-program-created.webp

### BUG-056 — Portfolios list request returns 400
- **Severity:** LOW · **Actual:** GET /build/portfolios?limit=20&sort=createdAt:0 → 400 in the console, while the list still renders (fallback). Likely a bad sort param. · **Evidence:** owner3-portfolio-created.webp (console)

### BUG-057 — Cycle detail board shows project-wide column counts
- **Severity:** MEDIUM · **Area:** Cycles → Sprint 01 (/build/40/cycles/50)
- **Expected:** Column counts reflect the cycle's 11 tickets
- **Actual:** Todo 43 / In progress 5 / In review 1 (project totals). An empty search says "No tickets in this cycle" instead of "No matches".
- **Impact:** Sprint scope looks inflated, and the empty-state copy misleads.
- **Evidence:** owner3-bug-cycle-board-counts-43-5-1-project-wide.webp, owner3-cycle-search-first-char-lost-empty-copy.webp, owner3-cycles-sprint01-2of11.webp

### BUG-058 — Project chat composer not cleared after send; raw-enum convert toast
- **Severity:** LOW-MED · **Actual:** The message was delivered, but the text stayed in the composer, with a console contract error at the same time (text not captured). Message → task created ACP-50, but the toast said "Created TASK" (raw enum) with no link.
- **Evidence:** owner3-chat-msg-sent-composer-not-cleared-contract-error.png, owner3-chat-convert-to-task-toast-raw-enum-no-link.png, owner3-chat-task-ACP50-exists.webp

### BUG-059 — Form submission "Processed" with no ticket
- **Severity:** LOW · **Actual:** A Bug Report-type form with no "Actions on Submit" marks its submission Processed with Ticket "—". It gives no warning that no action is configured, and there's no default "create ticket". · **Evidence:** owner3-forms-submission-processed-no-ticket.png

### BUG-060 — Issues search shows the previous query's results during rapid typing
- **Severity:** LOW · **Actual:** After clearing "stripe webhook" and typing "checkout" quickly, the ACP-24 (Stripe) result and the q=stripe+webhook URL stayed visible for a moment, then settled correctly (17 matches). No request cancellation. · **Evidence:** owner3-val-search-rapid-type-2-stale-prev-query-results.webp, owner3-val-search-rapid-type-3-settled-checkout-17.webp

### Extensions recorded in pass 3 (no new ID)
- **BUG-035:** the "c" shortcut also opens New Issue while typing a Custom Field name. Evidence: owner3-bug-customfield-typing-opens-new-issue.webp
- **BUG-036:** re-confirmed. Overview "Open issues 51" vs Reports "Open 49". Evidence: owner3-acme-overview-open51.webp
- **BUG-007/016:** Feedbucket covers Workflow Statuses row actions, the In review column at 768 and the Done column at 1366. Evidence: owner3-workflow-statuses-raw-enums-feedbucket-covers-delete.png, owner3-responsive-768-board.png, owner3-responsive-1366-board-feedbucket-over-done.png

## 5. Permission Matrix Findings

**Status: BLOCKED.** Only the Owner (A1) and briefly the Org Admin (A2) reached the app.

| Role | Account state | Build access | Result |
|---|---|---|---|
| A1 Owner | Active | Full | Tested (all owner findings) |
| A2 Org Admin | Active | Full incl. Danger Zone ("Skip for now" on onboarding) | Smoke only |
| A3 PM, A4 Dev, A7 Viewer | Active Member | **Redirected to /employee-onboarding** | BLOCKED (BUG-018/019/030) |
| A5 QA, A6 Designer, A9 Restricted Client | Invite pending | – | BLOCKED |
| A8 Client | Active Member | **Redirected to /employee-onboarding** | BLOCKED |
| B2/B3 (Beta) | Invite pending | – | BLOCKED |

Structural findings (proven): the invite form offers only Member / Org Admin. Project settings say "project-level roles are informational; access is governed by org-level permissions." No Client role exists. The approver picker offers Viewer and Client. **Inference (unproven):** every Member will see every project in the org once past the gate.

## 6. Organization Isolation Results

**PASS (owner smoke).** Same owner account, switched into Beta Software Labs:
- Beta Build → All Projects = "No projects yet". No Alpha projects or ACP tickets. Evidence: beta-projects-empty-isolation-PASS.png
- Deep link /build/40 while in Beta → "Page Not Found" + "This Build scope is no longer available to you". Evidence: beta-deeplink-build40-blocked-isolation-PASS.png
- Not tested: cross-org access by a *separate* Beta user (B2/B3 not accepted), API-level ID probing, search/notifications leakage. The project IDs are a global sequential integer (40–43), which is worth an API-level check.
- **Pass-3 re-smoke (2026-09-29 ~18:05 IST): PASS.** In Beta, Build projects are empty, All Work is empty, and /build/40 → "Page Not Found" + "This Build scope is no longer available to you". I switched back to Alpha afterwards. Evidence: owner3-beta-no-projects.webp, owner3-beta-allwork-empty.webp, owner3-beta-build40-blocked.webp

## 7. Client Portal Isolation Results

**BLOCKED.**
- The client user (A8) can't get past employee onboarding (BUG-018/030). There's no Client/Restricted role to assign (BUG-002/021), and no "Client Access settings" grant path (BUG-034).
- Owner-side preview only: the portal is unpublished, there are no grants, and Preview = "Nothing visible to clients yet". The internal status update, INC-1 and CR-1 did **not** appear in Preview. That's **PASS for owner preview only**, and it isn't a substitute for a real client login.
- A8 vs A9 difference (brief #39): **not testable**.

## 8. End-to-End Workflow Results

The full Acme "Buy Now Pay Later" lifecycle (brief #57) is **BLOCKED** because it needs PM/Dev/QA/Client roles. Owner-only fragments exercised:

| Step | Result |
|---|---|
| Intake → accept → ticket | PARTIAL (ACP-49 created, wrong state) |
| Triage | PARTIAL (stale list) |
| Epic → issues (9 linked) | PASS |
| Cycle Sprint 01 start | PASS (stale state) |
| Dev status changes (Table) | PASS; Board DnD FAIL |
| CR (CR-1 PayPal) | PASS w/ issues |
| QA suite/run → bug from fail | Run PASS; bug-from-fail linkage not verified |
| Approval (release) | FAIL (approver/title) |
| Release v2.0 draft | PASS; "released" and client review not done |
| Client review / approval | BLOCKED |
| Status update | FAIL (draft only) |
| Report (velocity CSV) | PASS (pass 3) |
| Timesheet / Release complete | Not tested |

The Beta CRM Rebuild workflow (brief #58) wasn't done. Only isolation was checked. Multi-project: in pass 3, Nova Mobile Banking got NMB-1/NMB-2 and Orbit Patient Portal got OPP-1. Keys and numbering are per project, and nothing leaked into Acme. **PASS.**

## 9. Reporting Accuracy Findings

- **Overview KPI FAIL:** "Open issues 48" includes 2 Done tickets (BUG-036). Health escalated to "Critical" without clear criteria (BUG-003).
- **Command Center vs My Work: PASS.** Projects 4 / Open 3 (assigned) / Overdue 0 matched My Work → Assigned 3.
- **Workload: PASS.** 44 open, Assigned 3 / 14 pts matched ACP-4+6+9 = 3+8+3.
- **Board vs Table:** due dates disagree (BUG-013). Done column header vs body disagree (BUG-015). The Epics page has no Bugs card.
- **QA run header** doesn't reflect 100% execution (BUG-028). **Incident SLA** list vs detail disagree (BUG-044).
- **Cycles velocity** chart drew a bar before any cycle completed.
- **Pass 3, Reports Overview: PASS.** Total 51 / Open 49 / Completed 2 match the board (43 + 5 + 1 + 2). The **project Overview** KPI still shows "Open issues 51" (BUG-036).
- **Agile reports (pass 3):** Velocity and Burnup render for Sprint 01 (committed 31 / completed 2). CFD shows "No flow history yet" and needs a manual "Capture today's snapshot" (UX). Cycle/Lead time and Critical Path render. **Export velocity CSV: PASS.** The CSV row (31 pts / 11 tickets committed, 2 / 2 completed) matches Cycles "2 of 11". File: /workspace/streamline-orgs/owner3-reports-velocity-report.csv
- **Cycle board counts** are project-wide, not cycle-scoped (BUG-057).
- **Budget:** Planned ₹5L / Actual ₹0 (0.0 billable h) / Remaining ₹5L, consistent. Actual-from-timesheets isn't exercised.

## 10. UX Findings

**UI quality judgment: visually GOOD, interaction quality NOT GOOD.**
- Good: clean, modern, consistent visual design; strong breadth of tools (22 project tools under "More tools"); useful empty states and quick actions (Schedule Standup, CSV import with dry run); Indian ₹ grouping correct; beforeunload guards exist; special characters render safely.
- Not good (specific):
  - Silent failures: Modules 500, action items 400, AI 402, onboarding 400, whiteboard save.
  - No loading / disabled state on create buttons, which leads to duplicates.
  - Stale UI after actions: triage, cycle start, wiki tree, epics count, board rendering stale table for ~2 s.
  - SPA route bounce-back (BUG-047).
  - The Feedbucket widget covers primary actions on many screens (BUG-007/016).
  - Popovers (status, assignee, type, row menus) aren't in the accessibility tree. Several icon buttons are unnamed. Raw enums appear in UI and aria-labels (IN_PROGRESS, "critical").
  - Project wizard: 7 steps for 2 required fields.
  - Naming inconsistency: Cycles vs Sprints. There is no Backlog status, although Intake offers Backlog.
  - Timezone defaults to UTC with no label (BUG-048).
  - Org switch dumps you to Home, losing Build context. The org name is hidden at 390 px.
  - "Post" produces a Draft (BUG-046). "Cancel selected" is ambiguous (BUG-042).
  - Pass 3: created items missing from their own list (Products BUG-053, Programs until reload BUG-055); template tasks silently dropped (BUG-054); chat composer not cleared (BUG-058); raw enums in Workflow Statuses and the "Created TASK" toast. Positive: the New Issue dialog has a proper in-flight "Creating…" state (other create dialogs should copy it).

## 11. Responsive UI Findings

- **390×844 (board): usable with issues.** Horizontal column scroll and bottom tab bar work. The Feedbucket toolbar covers the 2nd column, a floating FAB overlaps cards, and the org switcher is missing from the header. Evidence: owner-acme-board-390w-responsive.png
- **768×1024 (pass 3): usable.** The sidebar collapses, the org switcher stays in the header, the board scrolls horizontally, and the list truncates titles cleanly. The Feedbucket toolbar overlaps the In review column / list row actions. Evidence: owner3-responsive-768-board.png, owner3-responsive-768-list.png
- **1366×768 (pass 3): good.** The Feedbucket toolbar sits over the Done column. Board cards still show fake due dates (BUG-013). Evidence: owner3-responsive-1366-board-feedbucket-over-done.png, owner3-responsive-1366-list.png
- **1440×900: NOT TESTED.**
- 1280×800 (default): Feedbucket overlap on Approvals rows, meeting notes and Workflow Statuses rows.
- The window was restored to 1280×800 after the pass-3 checks.

## 12. AI Feature Findings

- **BLOCKED by trial AI credits (HTTP 402).** Suggest subtasks: silent failure. Improve description: clear "AI credits exhausted — Top up" panel, and the description was preserved.
- Present but unexercised: Summarize, Generate checklist, Summarize comments, Handoff, Draft comment, meeting agenda Generate, Ask OS.
- A leftover "Draft awaiting review" (comment draft) persists after the comment was posted (BUG-050).
- **Pass 3:** the Ask OS assistant **answered** "Summarize my day" (ACP-4/6/9, no events, 5 unread notifications), with **no 402**. I didn't re-run ticket-level AI this pass, so its last known state is 402. Evidence: owner3-askos-works.webp
- **AI Agents (brief #45): not present.** /build/40/agents and /agents → 404. It isn't in More tools, and the command palette "agent" → no results. Evidence: owner3-ai-agents-not-found-palette.webp
- **Quality: not assessable** beyond one Ask OS answer, which was accurate against My Work. Workflow safety: AI failures didn't corrupt data.

## 13. Blocked Tests

| Blocked area | Blocker | Unblock path |
|---|---|---|
| All Member/PM/Dev/QA/Viewer Build testing | BUG-018/019/030 onboarding gate (persists with HR OFF) | Dev fix to gate / onboarding submit. Tarun declined Org Admin promotion and HR stays OFF. |
| Client (A8) & Restricted Client (A9) portal isolation | Same gate + no Client role + no grant path (BUG-002/021/034) | Dev fix + client role/grant UI |
| Permission matrix Feature×Role | Same | Same |
| Project chat ≥3 users, timesheets multi-user, edit conflict two users, watchers/mentions | Needs other logged-in users | Same |
| Full E2E BNPL lifecycle, Beta CRM Rebuild workflow | Needs roles; Beta invites unaccepted | Same |
| Saved views across logout/login | Deliberately not done (risk to owner session) | Safe test account |
| AI quality | Trial AI credits exhausted | Top up credits / paid plan |
| Modules | BUG-008 (500) | Dev fix |
| Feedbucket → work item | No in-app Feedbucket integration; the floating widget is the vendor's feedback channel (not used, to avoid spamming the vendor) | Product to confirm whether an integration is planned |
| Ticket-level AI quality | Credits (402, last known) | Top up |

**Closed in owner pass 3:** Project chat (owner), Forms "Bug Report", Automations, Custom fields, Workflow statuses (view), Budget, Portfolios / Programs / Goals / Templates / Products, Reports + Agile charts + CSV export, Responsive 768/1366, New Issue empty/double-click, issues search debounce, Nova/Orbit issues, Beta re-smoke, AI Agents (not present).

**Still NOT TESTED (owner-reachable, left out of scope):** Webhooks, Retention, workflow transition rules / custom status creation, proof that the automation fires, Responsive 1440×900, ticket image attachment, Cycle complete / carry-over, Release → released, Saved views across re-login, Budget actual from billable timesheets.

## 14. Recommended Fix Priority

1. **P0:** BUG-018/019/030 (onboarding gate + submit), BUG-020 (join link without email proof), BUG-002/021/034 (client role, grants, project-scoped access). These unblock and secure multi-user/client use.
2. **P1:** BUG-041 (approval routing), BUG-049 (action items), BUG-008 (modules), BUG-010 (board DnD), BUG-009 (type change), BUG-022/040/043 (global double-submit guard: disable in-flight + idempotency key), BUG-023 (flush form state on submit), BUG-031, BUG-005, BUG-006.
3. **P2:** BUG-053/054 (products list, template tasks), BUG-057 (cycle counts), BUG-036/003 (KPI/health), BUG-046 (status update publish/visibility), BUG-047 (router bounce), BUG-037/038 (triage/intake), BUG-048 (TZ), BUG-042, BUG-013/014/015, BUG-032, BUG-011/012/028, BUG-007/016 (Feedbucket placement), validation BUG-024/025/027, BUG-033/035.
4. **P3:** BUG-055/056/058/059/060, BUG-044/045/050/051/052/039/026/029/017, plus a11y (popovers in the a11y tree, named icon buttons, no raw enums).

## 15. Regression Checklist

- [ ] Member invite → accept → lands in Build without HR data (HR ON and OFF)
- [ ] Onboarding submit succeeds with valid data; field-level errors on invalid data
- [ ] Join link requires email proof; expired link shows a clear message
- [ ] Client role: A8 sees only granted portal items; A9 sees less than A8; neither sees budgets/risks/internal comments/other projects/settings
- [ ] Org B user can't read Org A projects via UI, deep link or API IDs
- [ ] Double-click on every Create (issue, TC, run, approval, incident, CR, intake, meeting, action item) creates exactly one
- [ ] Rapid edit then Create saves the last value
- [ ] Whitespace-only / over-length / inverted dates / non-semver rejected with field messages
- [ ] Board DnD moves and persists; Table/List/Board/Workload stay in sync
- [ ] Type change on detail keeps the page
- [ ] Module create works
- [ ] Approval saves the chosen approver + typed title; Cancel selected works
- [ ] Meeting action item create works and appears in work views
- [ ] Status update publish + client visibility
- [ ] Overview Open issues excludes Done
- [ ] Triage/intake lists refresh after action; intake state honored
- [ ] Tabs and deep links don't bounce back
- [ ] Meeting times shown in user TZ with label
- [ ] Whiteboard save indicator accurate
- [ ] Comment draft cleared after post
- [ ] Feedbucket never overlays primary actions (1280, 768, 390)
- [ ] Saved view persists after refresh and re-login
- [ ] Managed product appears in the Products list after create
- [ ] Template saves default tasks; name field keeps focus
- [ ] Programs list refreshes after create; portfolios list request returns 200
- [ ] Cycle board column counts are cycle-scoped
- [ ] Chat composer clears after send; convert-to-task toast links the ticket
- [ ] Global single-key shortcuts never fire inside inputs (wiki, custom field name)
- [ ] Search discards stale responses during rapid typing

## 16. Final Test Statistics

(Counts are approximate from the notes; they cover checks with a recorded outcome.)

| Metric | Value |
|---|---|
| Coverage rows | 48: Done 26 · Partial 15 · Blocked 7 · Not tested 0 (v0.9 was 47 rows with a miscounted tally; row 48 Nova/Orbit added) |
| Bugs logged (deduped) | 60: CRITICAL 6 · HIGH 12 · MEDIUM 26 · LOW 16 (pass 3 added BUG-053–060) |
| Validation checks (VALIDATION_DEBOUNCE.md) | VAL-01..28 recorded. Pass 3 added VAL-23..28: New Issue empty PASS, New Issue double-click PASS (1 ticket, ACP-51), search debounce PASS-with-issue, form required PASS, chat composer FAIL, template focus FAIL |
| Bugs retested | 5 (BUG-009 FAIL, BUG-010 FAIL, BUG-030 confirmed, BUG-013 re-seen, BUG-036 re-confirmed) |
| Test data (Alpha / Acme) | 4 projects; 49 tickets ACP-1..49; 3 epics; 3 milestones; 2 cycles; QA suite + 6 TCs + 2 runs; release v2.0 draft; RISK-001; DEC-1; wiki page; file; saved view; 2 approvals; INC-1; CR-1; 1 draft update; MTG-1; whiteboard. Pass 3: ACP-50 (chat→task), ACP-51 (VAL); Bug Report form + 1 submission; automation; custom field "Client Reference"; budget ₹5L; NMB-1/2; OPP-1; portfolio, program, goal, template, managed product (all "QA owner3 …"). Acme now has 51 tickets |
| Roles actually exercised | 1 of 9 Org A roles fully (Owner) + Org Admin smoke; 0 of 3 Org B non-owner roles |
| Isolation | Org: PASS (smoke, re-run pass 3). Client: BLOCKED. |

**Answers to the brief's final questions (draft):**
- Onboard multiple employees? **No.** Blocked by the onboarding gate.
- Multi-role collaboration? **Unproven** (blocked).
- Sprints plan/complete? Plan/start **yes**. Complete not tested.
- Multi-client agency? **No.** No client entity in Build and no client role.
- QA suites/runs? **Yes**, with bugs.
- Releases? Draft **yes**. Release/client review not tested.
- Client review/approve safely? **Unproven / high risk.**
- Internal vs client perms? **Not configurable** today.
- Org isolation? **PASS** at UI smoke level.
- Reports accurate? **Partly.** The Reports module and CSV are consistent with the board; the project Overview KPI and cycle board counts miscount.
- Time/capacity? Workload **correct** for owner; timesheets not tested.
- Views sync? **Yes**, except Board DnD and board due dates.
- Survives refresh? **Mostly yes.** Re-login not tested.
- AI usable without breaking workflows? It doesn't break workflows. Ticket AI is **unusable** on trial credits (402); Ask OS works. There's no AI Agents page.
- Full agency delivery lifecycle? **Not today.**
- UI good enough to switch? **Not yet:** it looks good but reliability and multi-user gaps block adoption.

## 17. Fix Log

Remediation started 2026-09-29. Work is partitioned into nine lanes with disjoint file ownership so parallel sessions never touch the same file. Migration numbers are pre-assigned per lane; `migrations/meta/_journal.json` is orchestrator-owned.

| Lane | Bugs | Owns | Migrations | Status |
|---|---|---|---|---|
| L1 Onboarding gate | 018, 019, 030 | `lib/wizard-gate.ts`, `lib/onboarding-gate.ts`, employee-onboarding, `hr/onboarding`, `organization/onboarding` | 1601–1605 | **done** |
| L2 Invite security & client access | 001, 002, 020, 021, 031, 034 | administration invite UI, `build/client-portal`, `organization/core/invitation-*` | 1611–1615 | **done** (1611 applied to prod) |
| L3 Board / issues / epics | 009, 010, 011, 012, 013, 014, 015 | `features/build/{tickets,bugs,backlog,epics,ticket-details}`, `build/core/tickets`, `execution/epics.service.ts` | 1621–1625 | **done**; 010/014 reworked in L10 |
| L4 Modules / cycles / reports | 003, 008, 032, 036, 057 | `features/build/{modules,cycles,reports,overview,roadmap,milestones}`, `execution/{modules,cycles,sprints,iterations}`, `core/{analytics,roadmap}` | 1631–1635 | **done** |
| L5 Approvals / meetings / incidents / CRs / updates | 040, 041, 042, 043, 044, 045, 046, 048, 049 | `features/build/{approvals,meetings,incidents,change-requests,updates}`, `build/{approvals,meetings,incidents,updates}` | 1641–1645 | **done** |
| L6 QA / releases / risks / decisions | 022, 023, 024, 025, 026, 027, 028 | `features/build/{qa,releases,governance}`, `build/{qa,governance}`, `core/releases` | 1651–1655 | **done** |
| L7 Intake / forms / chat / wiki / whiteboard / drafts | 033, 035, 037, 038, 039, 050, 051, 058, 059 | `features/build/{intake,triage,forms,whiteboard,drafts,comments}`, `build/{forms,comment-drafts}`, `execution/whiteboard*` | 1661–1665 | **done** |
| L8 Products / templates / programs / portfolios | 053, 054, 055, 056 | `features/build/{managed-products,templates,programs,portfolios,goals}`, `build/{managed-products,portfolios}`, `core/project-crud/projects-templates.*` | 1671–1675 | **done** |
| L9 Global chrome & misc UX | 004, 005, 006, 007/016, 017, 029, 047, 052, 060 | `feedbucket-widget`, `components/layout`, `features/build/{project-create,project-list,navigation,sidebar,shared,ai}`, `features/crm`, `core/project-crud` | 1681–1685 | **done**; 005/006/029/047 moved to L11-L12 |

### Follow-up lanes

| Lane | Bugs | Why it exists | Status |
|---|---|---|---|
| L10 Board DnD + backlog scope | 010, 014 | L3 declared 010 browser-only without diagnosing it, and "fixed" 014 by filtering one page of a server-paginated list in the browser (FE-33/FE-105) | in progress |
| L11 Route bounce + org switch | 047, 029 | L9 blocked on file ownership; the org-switch half lives in `useSwitchOrg` | in progress |
| L12 CRM client link + overview | 005, 006 | L9 declined 005 as "new scope"; it is the defect that stops the product serving an agency | in progress |

### Corrections made to lane output

These are cases where a lane's reported fix did not hold up and the orchestrator reworked it. Recorded because each is a live trap for the next pass.

- **BUG-008 was misdiagnosed.** L4 caught `23505` and called it the cause. `build.modules` is empty with an untouched identity sequence, which proves the INSERT never reached Postgres. The real cause is a create dialog posting `startDate: ""` for an untouched date picker, accepted by the boundary as a plain optional string and failing at bind time against a `date` column. The same shape was present across several Build DTOs; the contract now lives once in `common/validation/calendar-date.schema.ts`.
- **BUG-020 was half-fixed.** The OTP gate was placed in the new-user branch only. `acceptAsExistingUser` still issued an auto-login magic link for an account that already holds the invitee's data — the worse half. The gate moved above the branch and consumes the code exactly once.
- **Migration 1611 would have broken in production.** It used `SERIAL` (BE-37) and granted table privileges but no sequence usage, so every insert as `streamline_app` would have raised 42501. Changed to an identity PK, which needs no separate grant, and verified on production after applying.
- **BUG-019's fix blocked the user.** L1 added a client-side guard telling them to go back and re-save. The wizard resolves a country from the address but submitted the bank draft's empty one; it now submits the resolved value.
- **BUG-032 was half-fixed** (the 404s, not the timeline the redirects point at), and the follow-up's `limit: 200` silently clamps to the 100-row cap; the milestone read is now bound to the visible window.
- **BUG-017's fix was inert.** Keywords were added to a list the typed-search path never reads, and the command list applies its own match on the item value, so the page filter alone changed nothing.

Verification constraints for this remediation: `.env` points at production, so lanes verify by reading code, adding failing-first unit specs, targeted jest and typecheck. Nothing is run against the live database by a lane. Browser-only proof (drag-and-drop pointer events, Feedbucket overlay at 390/768/1366, real focus order) is recorded per bug as **BROWSER-PENDING** rather than claimed.
