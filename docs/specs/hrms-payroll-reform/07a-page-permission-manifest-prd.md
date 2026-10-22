# StreamlineOS People + Payroll Page and Permission Manifest PRD

**Status:** Normative experience and authorization contract  
**Owner:** People Product Experience + Security  
**Priority:** P0 for each enabled route  
**Parent:** [Pages, Navigation, and Roles PRD](./07-pages-navigation-roles-prd.md)

## 1. Contract

This manifest supplies the route-level owner, entitlement, permission, and
DataScope omitted by role labels. Roles are grant bundles; backend permission
and field policy remain authoritative. A route may render only when entitlement
and at least one listed read/action permission pass.

Legend: `self`, `direct`, `hierarchy`, `assigned`, `entity`, `location`,
`named`, `all`, or a documented intersection. `own:*` means the source domain
owns commands/read model; the page composes or deep-links.

## 2. Self and Team Routes

| Route/pattern | Owner | Entitlement | Permission / scope | Read model and commands |
|---|---|---|---|---|
| `/me` | Experience | people-self | `people.home.view` / self | own:tasks, requests, domain cards |
| `/me/profile` | Core | core-hr | `worker.view_self` / self | `EmploymentFacts`; allowed edit/correction |
| `/me/documents` | Core | core-hr | `document.view_self` / self | own:document sign/ack/download |
| `/me/onboarding` | Core/Experience | core-hr | `lifecycle.task_self` / self | journey projection; task command |
| `/me/attendance` | Workforce | time | `attendance.view_self` / self | own:clock/regularize |
| `/me/time-off` | Workforce | leave | `leave.view_self` / self | own:request/cancel, safe team calendar |
| `/me/schedule` | Workforce | scheduling | `schedule.view_self` / self | assigned shifts; eligible actions |
| `/me/expenses` | Expenses | expenses | Expenses permission / self | cross-product destination/status only |
| `/me/assets` | Workforce | assets | `asset.custody_self` / self | custody projection; acknowledge/return issue |
| `/me/pay*` | Payroll | payroll-self | `pay.view_self` / self | actor-bound pay/tax documents and actions |
| `/me/goals` | Growth | performance | `goal.view_self` / self | own:goal/check-in |
| `/me/performance` | Growth | performance | `review.view_self` / self | own:review/ack/1:1 content |
| `/me/feedback` | Growth | performance | `feedback.use` / self/named | own:request/submit subject to audience |
| `/me/growth*` | Growth | talent | `growth.view_self` / self | skill/career/development projection |
| `/me/learning` | Growth | learning | `learning.view_self` / self | own:enroll/complete |
| `/me/opportunities` | Growth | talent | `opportunity.discover` / self | discovery; Recruitment handoff only |
| `/me/surveys` | Growth | engagement | `survey.respond` / assigned | one-response token; no result identity |
| `/me/recognition` | Growth | recognition | `recognition.use` / self/named | own:give/view under visibility policy |
| `/me/total-rewards` | Rewards | rewards | `rewards.view_self` / self | labeled compensation/benefit/equity projection |
| `/me/benefits` | Rewards | benefits | `benefit.view_self` / self | enroll; connected claim-status projection |
| `/me/equity` | Rewards | equity | `equity.view_self` / self | provider-sourced grant projection |
| `/me/help*` | Service | people-service | `service.request_self` / self | request/knowledge; participant-only detail |
| `/me/approvals` | Experience | approvals | source approve permission / assigned | normalized envelope; source command |
| `/me/notifications` | Experience | people-self | `notification.view_self` / self | own:read/dismiss |
| `/me/preferences` | Experience | people-self | `preference.manage_self` / self | permitted notification/privacy/locale |
| `/me/team*` | Experience | manager | domain view permission / direct or delegated | scoped composed reads; domain commands |
| `/me/team/payroll` | Payroll | manager-pay-readiness | `pay.readiness_team` / direct | missing/readiness only; no amount/tax/bank |

## 3. HR Operations Routes

| Route/pattern | Owner | Entitlement | Permission / scope | Read model and commands |
|---|---|---|---|---|
| `/hr` | Experience | core-hr | `people.command_center` / granted scope | exception/readiness projections |
| `/hr/employees*` | Core | core-hr | `worker.view/manage` / granted scope | worker detail/lifecycle commands |
| `/hr/org-chart` | Core | core-hr | `org_chart.view` / granted scope | bounded reporting graph |
| `/hr/positions` | Core | positions | `position.view/manage/approve` / entity | position commands; Recruitment handoff |
| `/hr/onboarding*` | Core/Experience | core-hr | `onboarding.view/manage` / scope | lifecycle facts + journey tasks |
| `/hr/lifecycle` | Core | core-hr-advanced | `lifecycle.manage` / scope | P1 bulk/designer; P0 exceptions use `/hr` and employees |
| `/hr/offboarding` | Core | core-hr | `exit.view/manage` / scope | exit; FnF status projection |
| `/hr/documents` | Core | documents | `document.manage` / scope/class | document/policy evidence commands |
| `/hr/policies` | Core | policies | `policy.manage` / scope | Platform-versioned Core policy commands |
| `/hr/attendance` | Workforce | time | `attendance.manage` / scope | attendance/regularization |
| `/hr/leaves` | Workforce | leave | `leave.manage` / scope | requests, ledgers, calendars |
| `/hr/scheduling` | Workforce | scheduling | `schedule.manage` / scope | P0 assignments; P1 roster actions |
| `/hr/overtime` | Workforce | time | `overtime.manage` / scope | P0 eligible hours; P1 comp-off |
| `/hr/holidays` | Workforce | leave | `holiday.manage` / entity/location | calendar publication |
| `/hr/time-clocks` | Workforce | clock-connectors | `clock.manage` / location | device/event reconciliation |
| `/hr/work-logs` | Workforce | work-log-connectors | `worklog.view` / scope | Build summary/handoff status |
| `/hr/assets` | Workforce | assets | `asset.view/manage` / entity/location | P0 custody; P1 inventory actions |

Expense/travel administration is not an HR route; it uses Expenses-owned
entitlement, permissions, settings, and commands.

## 4. Talent, Rewards, and Service Routes

| Route/pattern | Owner | Entitlement | Permission / scope | Read model and commands |
|---|---|---|---|---|
| `/hr/goals` | Growth | performance | `goal.manage` / scope | programs/alignment |
| `/hr/feedback` | Growth | performance | `feedback.manage` / scope | program/safeguard commands |
| `/hr/performance` | Growth | performance | `review.manage` / scope | P0 cycle; `calibration.manage` P1 tab |
| `/hr/skills` | Growth | talent | `skill.manage` / scope | taxonomy/job-profile projection |
| `/hr/learning` | Growth | learning | `learning.manage` / scope | catalog/assignment/provider |
| `/hr/talent` | Growth | talent | `talent.manage` / named/scope | career/development/mobility |
| `/hr/succession` | Growth | succession | `succession.manage` / named | restricted plans |
| `/hr/engagement` | Growth | engagement | `survey.manage` / scope | survey/action plans; identity suppressed |
| `/hr/recognition` | Growth | recognition | `recognition.manage` / scope | programs/moderation/budget |
| `/hr/compensation` | Rewards | compensation | `compensation.manage` / scope | P0 bands/cycles; P1 total rewards |
| `/hr/benefits` | Rewards | benefits | `benefit.manage` / scope | plans/enrollment/provider status |
| `/hr/equity` | Rewards | equity | `equity.manage` / named/scope | provider-backed records |
| `/hr/service*` | Service | people-service | `service.fulfill` / assigned | request/SLA/knowledge-safe commands |
| `/hr/cases*` | Service | restricted-cases | `case.view/manage` / explicit named | restricted case projection/commands |
| `/hr/accommodations` | Service | accommodations | `accommodation.manage` / explicit | separated evidence/instruction views |
| `/hr/safety` | Service | safety | `safety.manage` / entity/location | incidents/actions |
| `/hr/emergency` | Service | emergency | `emergency.manage` / entity/location | plans/authorized contacts |
| `/hr/labor-relations` | Service | labor-relations | `labor_case.manage` / explicit | restricted specialist records |
| `/hr/legal-holds` | Governance | privacy-governance | `legal_hold.manage` / record class | place/review/release |
| `/hr/knowledge` | Service | people-service | `knowledge.manage` / audience | P0 author/version/review |
| `/hr/announcements` | Service | communications | `announcement.manage` / audience | compose/preview/publish |
| `/hr/journeys` | Experience | journeys | `journey.manage` / scope | template/progress; domain state read-only |

## 5. Insight, Settings, and Payroll Routes

| Route/pattern | Owner | Entitlement | Permission / scope | Read model and commands |
|---|---|---|---|---|
| `/hr/analytics` | Analytics | people-analytics | metric permission / cohort-safe scope | P0 operational; P1 workforce models |
| `/hr/reports` | Analytics | people-reports | report/export permission / scope | P0 catalog; P1 custom builder |
| `/hr/workforce-planning*` | Planning | workforce-planning | `plan.manage/approve` / entity | scenarios; Core position command |
| `/hr/workforce-cost` | Planning | workforce-planning | `workforce_cost.view` / entity | masked cost projection |
| `/hr/audit` | Governance | audit | `audit.view/export` / purpose/class | immutable audit projection |
| `/hr/settings/**` | Platform/domain owner | relevant module | matching `*.configure` / entity | no implicit domain-admin grant |
| `/payroll` | Payroll | payroll | `payroll.command_center` / pay group | readiness and exceptions |
| `/payroll/setup` | Payroll | payroll | `payroll.configure` / entity | maker-checker setup |
| `/payroll/employees*` | Payroll | payroll | `payroll_profile.view/manage` / pay group | pay-specific facts |
| `/payroll/{structures,components,pay-groups}` | Payroll | payroll | `payroll.configure` / entity | versioned configuration |
| `/payroll/{inputs,runs,payslips}` | Payroll | payroll | stage-specific permission / pay group | calculation/publication commands |
| `/payroll/payouts` | Payroll | payroll-payout | funding/release/reconcile grants / entity | incompatible roles enforced |
| `/payroll/statutory*` | Payroll Compliance | payroll-compliance | calculate/review/file grants / registration | separate obligation records |
| `/payroll/tax-declarations` | Payroll | payroll | employee self or `tax_proof.review` / scope | proof/projection |
| `/payroll/{reimbursements,bonuses,loans,fnf}` | Payroll | payroll | program/stage permission / pay group | P0/P1 actions per PRD 05 |
| `/payroll/contractors` | Payroll | contractor-pay | `contractor_pay.manage` / entity | separate worker/tax contract |
| `/payroll/accounting` | Payroll/Accounting boundary | payroll-accounting | prepare/ack/reconcile grants / entity | no books mutation without contract |
| `/payroll/reports` | Payroll | payroll-reports | `payroll_report.view/export` / pay group | locked-fact reports |
| `/payroll/import-export` | Payroll | payroll | `payroll_import/export` / scope/purpose | durable jobs |
| `/payroll/access` | Security/Payroll | payroll | `payroll_access.manage` / entity | cannot grant own incompatible role |
| `/payroll/settings` | Payroll | payroll | `payroll.configure` / entity | sensitive setting SoD |

## 6. Implementation Routes

| Route/pattern | Owner | Entitlement | Permission / scope |
|---|---|---|---|
| `/implementation` | Implementation | implementation | `implementation.portfolio` / named projects |
| `/implementation/[projectId]/**` | Implementation | implementation | `implementation.view/manage/approve` / named project; sources/mappings/migrations/configuration/parallel-payroll/cutover/stabilization inherit the same grant plus domain overlays |

Source/bank/payroll/case/document fields additionally require their owning
domain permission. Implementation role never bypasses production DataScope.
Temporary consultant/customer grants expire at handoff.

## 7. Field and Action Overlays

- Medical, case, legal, bank, tax, compensation, beneficiary, and identity
  fields require explicit field-purpose grants beyond route access.
- Export is a separate permission and purpose; screen access never implies export.
- Create/manage/approve/release/acknowledge/reconcile/access-admin are distinct.
- Bank change, calculation override, payroll approval, payout release, journal
  acknowledgment, filing, and access administration have incompatible-role rules.
- Delegation grants only an action envelope, never the underlying role or hidden fields.
- Aggregate access enforces minimum cohort and cannot drill to forbidden records.

## 8. Acceptance Criteria

- [ ] Every canonical route in PRD 07 matches one manifest row.
- [ ] Direct URL/API access enforces entitlement, permission, DataScope, object state, and field purpose.
- [ ] A hidden route, count, filter, error, export, or AI response leaks no record existence.
- [ ] Every mutating page action calls only the owning domain command.
- [ ] Specialist and implementation roles cannot self-grant or combine incompatible duties.
- [ ] Manager, finance, executive, auditor, and implementation views pass field-level denial tests.
