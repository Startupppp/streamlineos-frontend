# HRMS RBAC matrix — Round 2 (2026-10-14)
Site https://www.streamlineos.in · Org "QA Build Org 1012b". Route checks = URL typed/loaded; "DENIED" = redirect to /access-denied with the permission named in the URL (no data rendered).

## Actor: employee qahr1014a (QA HR Thirteen) — org role Member, no HR role group
Sign-in: email OTP via Guerrilla (qahr1014a). Incognito window. Onboarding "Skip for now" used. Banner: "Your own employee profile is still incomplete".

| Route | Result | Permission in denial / what is shown |
|---|---|---|
| /hr (HRMS hub) | DENIED | hr:employees:view, hr:attendance:view, hr:leaves:view |
| /hr/approvals | DENIED | hr:workflows:approve, hr:leaves:approve |
| /hr/employees | DENIED | hr:employees:view |
| /hr/employees/2f9891d6-… (own HR profile id) | DENIED | hr:employees:view (own profile NOT viewable in HR module) |
| /hr/employees/d76d0fb7-… (owner, IDOR probe) | DENIED | hr:employees:view — no data |
| /directory/211e950e-… (own directory card) | ALLOWED | Name, email, "Added 14 Oct 2026", Member linked. No phone/salary/address |
| /directory/d76d0fb7-… (owner directory card, IDOR-style) | ALLOWED | Name, email, "Added 12 Oct 2026". No salary/PII |
| /directory | ALLOWED | 2 rows only (self + owner). Placeholder headers "Column 1–6" shown while loading (HR-B-012 family) |
| /hr/org-chart | DENIED | hr:employees:view |
| /hr/positions | DENIED | hr:positions:view |
| /hr/onboarding | DENIED | hr:onboarding:manage |
| /hr/exit | DENIED | hr:exit:view |
| /hr/fnf | DENIED | hr:payroll:approve |
| /hr/termination | DENIED | hr:exit:manage |
| /hr/assets | DENIED | hr:assets:view |
| /hr/asset-returns | DENIED | hr:assets:view |
| /hr/attendance (team view) | DENIED | hr:attendance:view (employee uses /me/attendance instead) |
| /me/attendance (self) | ALLOWED | Own clock + Request Correction |
| /hr/shifts | DENIED | hr:attendance:manage |
| /hr/leaves | ALLOWED | "My leaves" only (no Approvals tab, no WFH queue). Own rows only |
| /hr/leaves/analytics | DENIED | hr:leaves:view |
| /hr/comp-off | DENIED | hr:leaves:view |
| /hr/settings/policies | DENIED | hr:policies:view |
| /hr/holidays | ALLOWED | Holiday Calendar (company holidays — expected) |
| /hr/devices | DENIED | hr:biometric:manage |
| /hr/biometric | DENIED | hr:attendance:manage |
| /hr/documents | DENIED | hr:documents:view |
| /hr/document-types | DENIED | hr:documents:manage |
| /hr/document-review | DENIED | hr:documents:view |
| /hr/cases | DENIED | hr:cases:view (sensitive; good) |
| /hr/helpdesk | DENIED | hr:helpdesk:view |
| /hr/expenses | ALLOWED | "My expenses" — own claims only (empty). Submit expense claim visible |
| /hr/travel | ALLOWED | Travel page (content not checked in detail) |
| /hr/travel/approvals | DENIED | hr:expenses:manage |
| /hr/benefits | DENIED | hr:benefits:view, hr:compensation:manage, hr:equity:view |
| /hr/analytics | DENIED | hr:analytics:read |
| /hr/settings | DENIED | settings:organization:manage … (long list) |
| /hr/settings/import-export | DENIED | hr:import:manage, hr:export:manage |
| /hr/settings/integrations | DENIED | hr:integrations:manage |
| /hr/settings/reporting-managers | DENIED | hr:reporting-lines:manage |
| /hr/settings/workflows | DENIED | hr:workflows:view |
| /hr/settings/templates | DENIED | hr:templates:view |
| /hr/settings/forms | DENIED | hr:forms:view |
| /hr/settings/custom-fields | DENIED | hr:custom-fields:manage |
| /hr/settings/preview, /versions | DENIED | hr:policies:view |
| /hr/settings/automations | DENIED | hr:automations:view |
| /hr/identity | DENIED | hr:identity:view |
| /hr/delegations | DENIED | hr:workflows:manage |
| /hr/access | DENIED | hr:access:view |
| /hr/announcements | ALLOWED | Company announcements: "No announcements yet" |
| /hr/payroll | NOT ENABLED | /access-denied?required=module:payroll&reason=org-disabled — "Payroll is not enabled" (module off; Enable Payroll button not clicked) |
| /hr/leave-policies | NOT TESTED | alias of /hr/settings/policies (denied) |
| /me/time-off (self) | ALLOWED | Own leave; Request leave / WFH |
| /me/attendance (self) | ALLOWED | Own clock; Request Correction |

Self-service leave/correction flows (employee): PASS — both requests created; statuses visible to employee after owner action (see COVERAGE). 

## Summary (employee)
- No salary, payroll, bank or other-employee PII visible anywhere reachable by this employee.
- IDOR by URL/id on /hr/employees/{id} is blocked by permission (no data returned).
- Gap: the employee has no self-service profile page in the HR module; "own profile" = directory card only (name/email). Banner "Finish your details" says completing it "activates your access to the HR module" but HR routes remain denied (copy mismatch; see UI-UX).

---
## Actor: member qamem1012c (same org, non-HR) — Round 2
Sign-in: email OTP via Guerrilla (qamem1012c). Private window. Onboarding not re-prompted on this run.

| Route | Result | Permission in denial / what is shown |
|---|---|---|
| /hr | DENIED | hr:employees:view, hr:attendance:view, hr:leaves:view (no data) |
| /hr/employees | DENIED | hr:employees:view |
| /hr/employees/2f9891d6-… (QA HR Thirteen HR profile id) | DENIED | hr:employees:view — no data |
| /directory | ALLOWED | 2 rows only: QA HR Thirteen and owner qaown1012b (name, work email, "Member linked", Phone "—", Added date). No salary/PII |
| /directory/211e950e-… (QA HR Thirteen card, IDOR-style) | ALLOWED | Name, work email, "Added 14 Oct 2026", Member linked. No phone/salary/address |

## Actor: member qaview1012e (same org, non-HR) — Round 2
Sign-in: email OTP via Guerrilla (qaview1012e). Private window.

| Route | Result | Permission in denial / what is shown |
|---|---|---|
| /hr | REDIRECT → /employee-onboarding (onboarding gate, "Personal details" wizard) → after "Skip for now" → /access-denied?required=hr:employees:view,hr:attendance:view,hr:leaves:view | Denied after the onboarding gate; no HR data |
| /hr/employees | REDIRECT → onboarding gate → after Skip: DENIED hr:employees:view | no data |
| /hr/employees/2f9891d6-… | REDIRECT → onboarding gate → after Skip: DENIED hr:employees:view | no data |
| /directory | ALLOWED | Same 2 rows as the other org members (QA HR Thirteen, owner). Own row not listed (see UX HR-U-016) |
| /directory/211e950e-… | ALLOWED | Name, work email, "Added 14 Oct 2026", Member linked. No salary/PII |

## Actor: outsider qaout1012g (other org "Outsider Org 1012g") — Round 2
Sign-in: email OTP via Guerrilla (qaout1012g). Private window. Org trial banner visible.

| Route | Result | Permission in denial / what is shown |
|---|---|---|
| /hr | DENIED | /access-denied?required=module:hr&reason=org-disabled (HR module not enabled for this org) |
| /hr/employees | DENIED | same module:hr org-disabled |
| /hr/employees/2f9891d6-… (QA HR Thirteen HR profile) | not separately loaded; /hr/employees path denied with module:hr org-disabled | no data |
| /directory/211e950e-… (QA HR Thirteen card) | "Not found — This doesn't exist, or you don't have access to it." | No name, email or org data leaked |

## Leak check (Round 2, other actors)
- No salary, payroll, bank, phone, address or other-employee PII visible to qamem1012c, qaview1012e or qaout1012g.
- Same-org non-HR members see the directory name + work email + Added date for QA HR Thirteen and owner (by design of Directory page; flagged as a question in HR-U-016, not a bug).
- Outsider (other org) cannot see QA HR Thirteen's directory card (Not found). No cross-org leak observed.
