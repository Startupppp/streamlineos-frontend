# 01 Surface and role ledger

## Discovery (logged out / pre-enable)
| Check | Result | Status | Evidence |
|---|---|---|---|
| Logged-out / | Redirect to /signin?session=expired&callbackUrl=%2Fdirectory | VERIFIED | 09_signin_logged_out.webp |
| /hrms | 404 outside app shell | VERIFIED | 06_hrms_404.png |
| /hr before enable | access-denied page revealing `module:hr` | VERIFIED | 05_hr_access_denied_module_disabled.png |
| Signin email validation | Same message for empty and 'abc' | VERIFIED | 10_signin_empty_submit_validation.webp, 11_signin_abc_validation.webp |
| Console | ERR_HTTP2_PROTOCOL_ERROR on api.streamlineos.in/notifications/events | VERIFIED | console |
| Directory | Intermittent long skeleton | VERIFIED (intermittent) | 07_directory_skeleton_loading.png |
| / logged in | redirects to dashboard | VERIFIED | 01_home_redirects_to_dashboard.png |
| /me pre-enable | HR module not enabled; team "not manager"; support empty | VERIFIED | 02_, 03_, 04_ screenshots |
| Module switcher | HRMS locked pre-enable | VERIFIED | 08_module_switcher_hrms_locked.png |
| Enable HR | /settings/modules toggle, persisted after refresh | VERIFIED | p1_00_*, p1_01_*, p1_00b_* |
| Google sign-in | - | UNTESTED | - |

## /hr surface (Owner)
Pass1 mapped ~30 routes. P2 hard-loaded 13 routes x3 = 39/39 correct.
| Route | Owner result | Status |
|---|---|---|
| /hr (Hub) | Loads; body intermittently blank (HRMS-016) | VERIFIED |
| /hr/approvals | Loads; approve -> 500 (HRMS-002) | VERIFIED |
| /hr/employees | Loads; slow skeleton; 1 error boundary in ~45 loads (HRMS-018) | VERIFIED |
| /hr/org-chart, /hr/positions | Loaded in pass1 map | VERIFIED (load only) |
| /hr/onboarding | Wizard tested in depth (HRMS-006/009/017, UX) | VERIFIED |
| /hr/exit | Loads (Exit Management) | VERIFIED (load only) |
| /hr/assets | Create/edit tested (HRMS-003) | VERIFIED |
| /hr/attendance, /hr/shifts | Load; correction tested via /me (HRMS-014) | VERIFIED (load) |
| /hr/leaves (+holidays, comp-off, analytics) | Leave request tested; /hr/leaves/policies redirects to /hr/settings/policies | VERIFIED |
| /hr/holidays | Add tested (HRMS-013) | VERIFIED |
| /hr/devices, /hr/documents (+templates), /hr/document-types, /hr/document-review | Load | VERIFIED (load only) |
| /hr/cases, /hr/helpdesk, /hr/benefits, /hr/analytics | Load | VERIFIED (load only) |
| /hr/expenses | Empty despite claims (HRMS-004) | VERIFIED |
| /hr/settings (+policies, reporting-managers, workflows, templates, forms, custom-fields, import-export, integrations, preview, versions, automations) | Load; templates/automations/versions/import-export intermittent wrong content in pass1 (HRMS-019) | VERIFIED (load) |
| /hr/identity, /hr/delegations | Load | VERIFIED (load only) |
| /hr/access | Roles, Members, Audit log (slow, HRMS-020) | VERIFIED |
| /hr/payroll | access-denied, payroll module off | VERIFIED / NOT APPLICABLE (module off) |
Functional depth beyond page load for documents, cases, helpdesk, benefits, devices, identity, delegations, exit, positions, workflows, automations, import-export, integrations: UNTESTED.

## Role ledger
| Route / action | Owner | Employee (Member) | Manager (Member) | HR Admin |
|---|---|---|---|---|
| HR sidebar | Full | Full admin-like (HRMS-008) VERIFIED | Not recorded | BLOCKED |
| /hr/approvals | Allowed | DENIED (hr:workflows:approve / hr:leaves:approve) VERIFIED | Partial, not recorded | BLOCKED |
| Request leave | Allowed | Allowed, routed to HR queue (no manager) VERIFIED | UNTESTED | BLOCKED |
| /hr/employees list | Allowed | Allowed, 8 records VERIFIED | Allowed (note) | BLOCKED |
| Others' Sensitive tab | Allowed | ALLOWED (HRMS-001) VERIFIED | ALLOWED (note) VERIFIED | BLOCKED |
| Others' Pay tab | n/a (payroll off) | DENIED VERIFIED | UNTESTED | BLOCKED |
| Edit non-report profile | Allowed | UNTESTED | UI allows, server denies (HRMS-024) | BLOCKED |
| /hr/settings overview | Allowed | ALLOWED (overview) VERIFIED | Visible (note) | BLOCKED |
| Custom field create | Allowed | DENIED (route) VERIFIED | Not completed | BLOCKED |
| /hr/assets edit | Allowed | View only, no edit UI VERIFIED (server UNTESTED) | UNTESTED | BLOCKED |
| /hr/expenses | List empty (HRMS-004) | Own scope VERIFIED | UNTESTED | BLOCKED |
| /hr/cases | Allowed | Allowed (empty) VERIFIED | UNTESTED | BLOCKED |
| /hr/payroll | Module off | Module off | - | NOT APPLICABLE |
| /hr/access | Full | Read-only incl. permission lists VERIFIED | UNTESTED | BLOCKED |
| /settings/roles, /settings/modules | Allowed | DENIED VERIFIED | Partial | BLOCKED |
| Change own role | - | Control absent; not attempted | - | BLOCKED |
| Approve team leave as manager | - | - | BLOCKED (cannot set reporting manager) | BLOCKED |
| Logout propagation | BLOCKED (not run) | - | - | - |
