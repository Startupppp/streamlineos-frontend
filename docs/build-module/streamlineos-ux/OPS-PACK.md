# Completeness Wave Owner — census QA/tests, Incidents, Change requests, Intake

**Account/org:** Account A / `PXC-Design-A-20260930`  
**Project scope:** `/build/47` (sidebar label observed: `PXC-Project-Alpha`)  
**UI-only census:** 2026-09-30 (UTC+5:30). No items were created. New-item dialogs were opened only to inspect craft and then cancelled.

## Exact URLs

| Surface | URL | More Build tools entry | Result |
|---|---|---|---|
| QA / Tests | https://www.streamlineos.in/build/47/qa | QA and tests | VERIFIED |
| Incidents | https://www.streamlineos.in/build/47/incidents | Incidents | VERIFIED |
| Change Requests | https://www.streamlineos.in/build/47/change-requests | Change requests | VERIFIED |
| Intake | https://www.streamlineos.in/build/47/intake | Intake | VERIFIED |

The four entries were visible in the project's **More Build tools** menu with the routes above. Evidence: `more-build-tools.webp`. Intake tab state is URL-addressable (`?tab=pending`, `?tab=accepted`, `?tab=declined`, `?tab=all`); base URL above is the canonical surface URL.

## Surface findings

### QA / Tests — VERIFIED
- **Empty/filled craft:** Test Cases selected; empty state `No test cases` / `Create a test case to get started.` Test Runs tab is present; switching it exposes `New Test Run` and no populated run content was visible.
- **CTAs:** `New Test Case` in header and empty state. Test-case dialog has required Title; Suite (No suite); Priority (Medium); Automation (Manual); Component; Preconditions; Steps (No steps yet); Expected Result; Linked Ticket (None); `Cancel` / `Create`.
- **Filters:** Search cases; All suites; All priorities; All automation.
- **UX note:** Good empty-state affordance and domain-specific filters; Test Runs empty content should retain an explicit empty message and primary CTA for parity with Test Cases.
- Evidence: `qa-tests.webp`

### Incidents — VERIFIED
- **Empty/filled craft:** `No incidents found` / `Create an incident to start tracking.` Summary cards show Open 0, SLA Breached 0, Resolved 0.
- **CTAs:** Header and empty-state `New Incident`. Dialog fields: required Title; rich-text Description; Severity (medium); Status (Detected); Impact; Root cause; Customer communication; Owner (Unassigned); Detected at, Response due, Resolution due date/time controls; Linked Ticket (None); Affected release (No release); `Cancel` / `Create Incident`.
- **Filters:** Search incidents; Status options All statuses, Detected, Investigating, Mitigating, Resolved, Post-mortem, Closed; Severity options All severities, Critical, High, Medium, Low.
- **UX note:** Empty state is supported by useful operational counters and two entry points; date/time controls are disabled until a date is picked.
- Evidence: `incidents.webp`

### Change Requests — VERIFIED
- **Empty/filled craft:** `No change requests` / `Create a change request to get started.`
- **CTAs:** Header and empty-state `New Change Request`. Dialog fields: required Title; rich-text Description; Impact; `Cancel` / `Create`.
- **Filters:** Search change requests; Status options All statuses, Submitted, Under Review, Estimated, Awaiting Approval, Approved, Rejected, In Progress, Completed; Visibility options All visibility, Client visible, Internal only; `Filter by impact…` search field.
- **UX note:** Strong empty-state CTA and a compact, scannable filter row; Impact is both a creation field and a dedicated filter, which is coherent.
- Evidence: `change-requests.webp`

### Intake — VERIFIED
- **Empty/filled craft:** On All tab, visual empty state `No all items` / `Items will appear here once triaged.` Pending tab exposes `No pending items` / `Share the form URL to start receiving submissions.` Accepted and Declined tabs are available and empty.
- **CTAs:** `Copy Form URL`, header `New Item`, and Pending empty-state `Create First Item`. Create dialog has Title, Description, `Cancel` / `Create Item`.
- **Filters:** No search/filter controls; status is segmented by Pending, Accepted, Declined, All tabs.
- **UX note:** Sharing is a first-class empty-state action. The All-tab copy is awkward (`No all items`); a clearer label would be `No intake items` or `No items yet`.
- Evidence: `intake-pending.webp`, `intake-accepted.webp`, `intake-declined.webp`, `intake-all.webp`

## Safety / scope outcome

- No create action was submitted; no records were added.
- No sign-out, member/role changes, Client Access changes, deletes, or OTP flow were attempted.
- Meetings, Chat, Wiki, Whiteboard, and Modules were not visited.
- **Overall:** 4/4 scoped surfaces VERIFIED; no surface blocked.
