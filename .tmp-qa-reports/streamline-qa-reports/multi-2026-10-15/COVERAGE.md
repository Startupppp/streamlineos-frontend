# Coverage — Org Settings & Onboarding (multi-2026-10-15)

Updated 2026-10-15 ~01:10 IST.

Account in use (user's own signed-in account, display name "adityachalla01"; no email recorded). Org in use: "ADitay CAhala" (only org in the user's switcher). Earlier notes about account qaown1012b / QA Build Org 1012b are superseded (that session had been signed out).

Entry point: top-right account avatar menu, per the user's steering. Menu items: My Account, Billing & Plan, AI Credits, Organization, Members, Roles, Delegations, Modules, Notification Preferences, Personal Access Tokens, Sign out (NOT clicked).

## A. Settings map

| Menu item / section | URL | Mapped | Tested | Notes |
|---|---|---|---|---|
| My Account | /settings | Yes | View | Profile (display name, photo), reporting line, companion, quiet-hours link, My sessions (Sign out all others NOT clicked) |
| Notification Preferences | /settings/notifications/my-preferences | Yes | View | Channels, quiet hours, digest, categories, event notifications. Push "blocked" banner |
| Notifications sub-tabs | /settings/notifications/templates, broadcasts, providers, events, policy | Partly | No | Routes load; only the tab bar was captured in the text read |
| Organization | /settings/organization | Yes | Yes | General (edit/validate/persist/revert), Branding (validate/persist/revert), Localization (edit/persist/revert), Business Hours (validate/persist/revert), Holiday Calendar (validate/add/persist/delete), Data & Privacy (view), Session policy (view only), App Configuration (view only), Companion (view only), Danger Zone (view only; Transfer / Archive / Delete NOT clicked) |
| Members & Access | /settings/users | Yes | Yes | Invite validation, invite send, role change on invite, revoke invite. Members tab (1 owner) not changed |
| Roles & Permissions | /settings/roles | Yes | Partly | 44 system roles, read-only detail. Groups tab: New group, validation, Rename / Manage panels. No custom-role create and no delete found |
| Delegations | /settings/delegations | Yes | View | Empty state with "Delegate" button (not used) |
| Modules | /settings/modules | Yes | View | HR, CRM, Build, Accounting, Inventory, Knowledge Base, Chat (always on), Support, Feedbucket (Disabled), Surveys, Payroll, Sign, Timesheets. No toggles changed |
| Billing & Plan | /settings/billing | Yes | View only | Plan Starter; trial ends 26 Oct 2026; tabs Plan / Invoices & Payments / Billing Profile. No upgrade, coupon, or payment action |
| AI Credits | /settings/billing/ai-credits | Yes | View only | Balance 100 cr; Buy buttons NOT clicked; Auto Top-Up Disabled |
| Personal Access Tokens | /settings/api-tokens | Yes | View only | Empty; no token created |
| Org structure (sidebar) | /settings/organization/structure, business-units, branches, departments, teams, locations, cost-centers, chart | Yes | Partly | Business Units: add (validation + create) and archive tested. Branches, Teams, Departments, Locations, Cost Centers: empty states (not created) |
| Incoming Transfer | /settings/incoming-transfer | Yes | View | Empty |
| Directory (sidebar) | /directory/settings, /directory/access | Yes | View | Lists loaded empty in this read |
| Audit Logs | /settings/audit-log | Yes | View | Entries present for the user's own actions; Export CSV not used |
| Webhooks | /settings/webhooks | Yes | View | Empty; not created |

## B. Test areas

| Area | Status | Result |
|---|---|---|
| Org General validation: blank, whitespace, invalid email, invalid URL, invalid phone | Done | Blank name rejected. Whitespace name accepted (ORG-B-001). Invalid email blocked by browser. Invalid URL "Must be a valid URL". Invalid phone accepted (ORG-B-002) |
| Org General edit + persistence after refresh + revert | Done | Legal name, Website, Support email persisted and reverted |
| Org General: <script> and 300-char long values | Not reached | Not saved, to avoid stored data; the Workspace name in onboarding was checked for the cap (100 chars) only |
| Branding validation / persistence / revert | Done | Invalid URL blocked; javascript: URL accepted (ORG-B-004); primary colour auto-filled (ORG-B-005). Reverted |
| Localization edit + persistence + revert | Done | Week starts on Monday→Sunday→Monday; Timezone shown blank in edit (ORG-B-006) |
| Business hours validation + persistence + revert | Done | Close before open accepted (ORG-B-007). Reverted |
| Holiday calendar add/validation/delete | Done | Name and date required; add persisted; deleted (no confirm) |
| Session policy / Data & Privacy / App Configuration / Companion changes | Not reached | View only. Changing MFA, sessions, IP allowlist or directory visibility risked locking out the owner or exposing employee data |
| Members: invite validation | Done | Blank → "Email is required"; invalid → "Enter a valid email address" |
| Members: invite qa1015inv@sharklasers.com with role | Done | Sent with Member role and Build Member preset |
| Members: change invite role | Done | Member → Org Admin → Member, persisted |
| Members: revoke invite | Done | Status changed to Revoked |
| Custom role "QA1015 role" create / delete | Partly | No custom-role create on Roles tab. Created a permission group "QA1015 role" via Groups → New group (server 201; UI error ORG-B-008). No delete control found (ORG-B-009). Group LEFT IN PLACE |
| Onboarding: fresh account qa1015onb@sharklasers.com via email OTP (guerrillamail) | Done | Sign-in screen → code emailed → code read from the qa1015onb inbox → verified (one transient network error on auto-submit, ONB-B-003) |
| Onboarding step 1 Workspace: blank validation | Done | "Enter a workspace name.", "Select team size", "Select industry" |
| Onboarding step 1: whitespace name | Done | "Enter a workspace name." |
| Onboarding step 1: <script> name | Partly | Typed; step did not advance because team size and industry were blank; name then replaced. Not saved |
| Onboarding step 1: long name | Done | Stored at most 100 characters (silent cap, UX) |
| Onboarding step 1: invalid phone | Done | Accepted (ONB-B-001); cleared before finishing |
| Onboarding step 1: Back / Next with values kept | Done | Values retained on Back |
| Onboarding step 2 Modules: none selected | Done | Continue disabled with warning |
| Onboarding step 2: select, deselect, sub-chips | Done | Selection and sub-chips work |
| Onboarding: refresh mid-step (Modules) | Done | Selections persisted after reload |
| Onboarding step 3 People: invalid email | Done | "Enter a valid email address" |
| Onboarding step 3 People: duplicate invitee | Done | "That address is already on the invite list." |
| Onboarding step 3 People: add invitee then Back/Next | Done | Invitee kept |
| Onboarding step 3 People: Skip for now | Not reached | Used "Build my organization" with an invitee instead |
| Onboarding: double-submit "Build my organization" | Done | Two clicks sent; exactly one org "QA1015 Onboarding Co" exists in the switcher |
| Onboarding: invitee created after finish | Done (failed) | No invitation exists (ONB-B-002) |
| Onboarding: /org-setup after org exists | Done | Redirects to /dashboard |
| Onboarding: closed private window | Done | Incognito tab closed; user's main window still signed in |

## C. Not reached / not done
- Notification sub-pages (templates, broadcasts, providers, events, policy) were not read in full.
- Session policy, App Configuration, Companion policy, Data & Privacy retention: view only.
- Modules toggles: not changed.
- Branches, Departments, Teams, Locations, Cost Centers, Structure, Organization Chart: empty states only; no create.
- Personal Access Token creation, webhook creation, AI credits purchase: not done (out of scope / money / secrets).
- Custom role delete: no UI control found; the "QA1015 role" group still exists (see TEST-DATA.md).
- Onboarding "Skip for now" on People: not exercised.
- <script> and 300-char values on org General: not saved.
