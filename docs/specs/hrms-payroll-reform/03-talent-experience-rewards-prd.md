# StreamlineOS Talent, Experience, and Rewards PRD

**Status:** Normative domain PRD  
**Owner:** People Growth and Rewards  
**Priority:** P0 performance foundation; P1 complete talent/rewards suite; P2 work-aware intelligence  
**Depends on:** Core HR, Workflow, Learning content providers, Payroll, Build

## 1. Outcome

Organizations can align goals, coach performance, understand skills, develop
people, listen safely, and make fair reward decisions from connected facts.
Recommendations support accountable managers and HR; they do not make
autonomous employment decisions.

## 2. Scope

### P0 — required

- Goal and key-result creation, alignment, updates, status, and evidence.
- Review-cycle setup, eligibility, self/manager/peer/upward feedback, reminders,
  completion tracking, sign-off, and employee acknowledgment.
- Continuous feedback and structured 1:1s.
- KPI and competency libraries linked to job profiles.
- Basic performance reporting with cohort privacy.
- Compensation history, salary bands, compensation-review cycles, worksheets,
  budget controls, approvals, letters, and payroll-effective changes.
- Sensitive access controls, audit, conflict checks, and calibration evidence.

### P1 — complete suite

- Skills taxonomy, employee skills profile, proficiency, evidence, verification,
  endorsements, gap analysis, and correction.
- Learning catalog, assignments, paths, due dates, completion, certificates,
  compliance learning, and provider integrations.
- Career paths, growth plans, mentoring, internal opportunities, and talent marketplace.
- Calibration sessions, configurable talent grids, succession plans, readiness,
  critical-role coverage, and development actions.
- Engagement and pulse surveys, lifecycle surveys, anonymity thresholds, action
  plans, and follow-up.
- Recognition programs, peer recognition, awards, values, budgets, and moderation.
- Benefits plan catalog, eligibility, enrollment windows, employee elections,
  dependents, connected-carrier claim status, payroll-deduction handoff, and carrier export.
- Equity grants, vesting schedules, statements, events, and secure employee visibility.
- Total-rewards statements combining authorized salary, benefits, equity, and perks.
- Multi-currency compensation cycles and pay-equity reporting.

### P2 — differentiators

- Authorized project outcomes and work evidence linked to goals without
  converting activity volume into performance scores.
- Skills-to-project, mentor, learning, and internal-opportunity matching with
  explanations, consent, and correction.
- Development plans generated from employee-selected goals, verified skill
  gaps, review feedback, and available learning.
- Compensation and workforce-plan impact preview before cycle approval.
- Early-warning insight for goal drift, review bottlenecks, critical-skill
  concentration, and succession gaps.

### P3 / partner-dependent

- Licensed market-compensation datasets.
- Benefits carrier enrollment/EDI, insurance brokerage, and regulated advisory.
- Equity administration, cap-table, tax, or brokerage execution.
- Country-specific mandated training content from approved providers.

### Out of scope

- Recruiting pipeline and external-candidate assessment.
- Opaque potential, attrition, or performance scores used as decision authority.
- Public popularity feed, gamified surveillance, or activity-based productivity ranking.
- Benefits, compensation, investment, tax, or legal advice.

## 3. Users and Jobs

| User | Job |
|---|---|
| Employee | Set goals, request feedback, complete reviews/learning, manage skills, understand rewards |
| Manager | Align goals, coach, review, calibrate, plan development, recommend rewards |
| HR/talent operator | Configure cycles, frameworks, learning, surveys, succession, and governance |
| Compensation operator | Build bands and cycles, manage budgets, validate fairness, publish decisions |
| Executive | Understand capability, succession, engagement, performance, and reward health |
| Auditor | Review decision process, access, changes, evidence, and communications |

## 4. Product Principles

1. Development first: reviews must produce feedback, goals, or growth actions.
2. Evidence with context: imported work facts are references, never automatic ratings.
3. Employee agency: people can view, correct, or contest profile and skill facts.
4. Cohort privacy: anonymous reporting requires configurable minimum groups and
   blocks differencing attacks.
5. Fair process: compensation, calibration, succession, and talent decisions
   preserve criteria, participants, overrides, and rationale.
6. No sensitive inference: protected characteristics, medical facts, leave
   reasons, and private cases are excluded from recommendations.

## 5. Functional Requirements

### Goals, feedback, and 1:1s

- **FR-TAL-001:** Goals support organization/team/individual ownership,
  hierarchy, weight, measures, targets, dates, visibility, check-ins, and evidence.
- **FR-TAL-002:** Goal progress may be manual or sourced from an authorized
  system; source values retain timestamp and provenance.
- **FR-TAL-003:** Private goals and 1:1 notes are excluded from broad analytics
  and exports unless explicitly shared.
- **FR-TAL-004:** Feedback supports requested/unsolicited, named/anonymous when
  policy allows, visibility, moderation, and immutable submission history.
- **FR-TAL-005:** 1:1s support agenda, recurring schedule, shared/private notes,
  action items, and links to goals or development plans.

### Reviews and calibration

- **FR-TAL-006:** Cycle eligibility snapshots worker, manager, job, and review
  participants at launch while allowing governed reassignment.
- **FR-TAL-007:** Templates support rating, text, competency, goal, and
  acknowledgment sections with requiredness and audience rules.
- **FR-TAL-008:** In-flight submissions autosave drafts and preserve prior
  submitted versions after permitted reopen.
- **FR-TAL-009:** Calibration uses permissioned worksheets, distribution and
  cohort context, comments, proposed/final ratings, and override rationale.
- **FR-TAL-010:** Talent grids are configurable evidence views, not automated
  termination/promotion queues.
- **FR-TAL-011:** The employee sees the published review and acknowledgment
  state but not restricted calibration discussion.

### Skills, careers, succession, and mobility

- **FR-TAL-012:** A skill has taxonomy, aliases, category, description,
  proficiency scale, lifecycle, and source.
- **FR-TAL-013:** Proficiency evidence distinguishes self-declared, manager
  assessed, certified, project-evidenced, imported, and AI-suggested.
- **FR-TAL-014:** AI-suggested skills remain pending until employee or
  authorized reviewer confirms them.
- **FR-TAL-015:** Job profiles define skill/competency expectations by level;
  gap analysis shows evidence and uncertainty.
- **FR-TAL-016:** Internal opportunities may originate in Recruitment or Build.
  This product owns employee discovery and interest; Recruitment owns candidacy.
- **FR-TAL-017:** Succession plans define critical role, successor, readiness,
  risk, development action, and restricted visibility.
- **FR-TAL-018:** Career recommendations explain matched requirements and never
  use protected or private HR facts.

### Learning

- **FR-TAL-019:** Learning supports courses, sessions, paths, assignment rules,
  due dates, prerequisites, completion, score, certificate, and expiry.
- **FR-TAL-020:** Compliance learning versions content and assignment evidence;
  completion from a provider is idempotent and reconcilable.
- **FR-TAL-021:** Managers can assign development learning only within scope;
  HR can distinguish required from recommended assignments.
- **FR-TAL-022:** Learning recommendations disclose why they were suggested and
  allow dismissal without adverse employment consequence.

### Engagement and recognition

- **FR-TAL-023:** Surveys support audience, anonymity threshold, schedule,
  channels, reminders, question bank, scale, free text, and action plans.
- **FR-TAL-024:** Results suppress groups below the threshold and prevent
  repeated filters from isolating a respondent.
- **FR-TAL-025:** Free-text analysis uses redaction, restricted access, and
  traceable themes; it does not expose quoted text to unauthorized leaders.
- **FR-TAL-026:** Recognition supports named values, peer/manager awards,
  optional points/budget, moderation, visibility, and anti-abuse controls.

### Compensation

- **FR-TAL-027:** Salary bands are effective-dated by job/level/location/entity,
  currency, range, benchmark source, and visibility.
- **FR-TAL-028:** Compensation cycles support merit, market, promotion, equity,
  and bonus budgets; worksheets include current pay, band, compa-ratio,
  performance context, recommendation, guideline, and approved result.
- **FR-TAL-029:** Managers see only authorized workers and compensation fields;
  exports preserve the same scope.
- **FR-TAL-030:** Changes outside policy require reason and configured approval;
  the system records guideline, recommendation, final value, and override.
- **FR-TAL-031:** Approved recurring salary decisions command Core HR to create
  the canonical future-dated `CompensationAssignment`; Payroll consumes that
  version. Approved one-time decisions emit versioned `OneTimeAward` and never
  a second salary fact; Payroll validates treatment but does not originate eligibility.
- **FR-TAL-032:** Pay-equity reporting applies minimum cohort sizes and does not
  claim legal or causal conclusions.

### Benefits, equity, and total rewards

- **FR-TAL-033:** Benefit eligibility is evaluated from effective worker facts
  and a versioned plan rule.
- **FR-TAL-034:** Enrollment supports life-event or window changes, dependents,
  documents, employee/employer cost, approval, and a versioned
  `BenefitDeductionInstruction` with interval/frequency, termination, refund/
  retro, void/supersession, Payroll acknowledgment, and reconciliation.
- **FR-TAL-035:** Carrier/provider export is a signed, auditable job with
  acknowledgment and reconciliation; unacknowledged delivery is not “complete.”
- **FR-TAL-036:** Equity records support grant, type, quantity, price/currency
  reference, vest schedule, events, documents, and source provider.
- **FR-TAL-037:** Total rewards labels estimates, sources, effective date, and
  excluded values; it never presents volatile equity as guaranteed cash.
- **FR-TAL-038:** Benefit claims remain carrier/provider-owned. StreamlineOS may
  show permissioned submitted/status/reference/document-request projections
  with sync time and deep link, but cannot adjudicate or present them as paid.
- **FR-TAL-039:** Succession, recognition, benefit enrollment, and equity each
  define draft/active/published-or-granted/changed/closed-or-archived states,
  correction and dispute paths, owner, evidence, and employee-visible history.

## 6. Required Pages

### Self and manager

- `/me/goals`, `/me/performance` (reviews, 1:1s, acknowledgment), `/me/feedback`
- `/me/growth` (skills/career/plan), `/me/learning`, `/me/opportunities`
- `/me/surveys`, `/me/recognition`, `/me/total-rewards`, `/me/benefits`, `/me/equity`
- `/me/team` performance/skills/development tabs

### HR and specialist

- `/hr/performance` with cycles, templates, reviews, 1:1s, calibration, and analytics.
- `/hr/goals` and `/hr/feedback`.
- `/hr/skills` (includes job architecture), `/hr/learning`, `/hr/talent`
  (includes internal mobility), `/hr/succession`.
- `/hr/engagement` (includes surveys) and `/hr/recognition`.
- `/hr/compensation` (includes total rewards), `/hr/benefits`, and `/hr/equity`.

PRD 07 defines final canonical routes and migration from current route names.

## 7. UX Requirements

- Every cycle has setup, preview, launch, progress, exception, publish, and
  archive states.
- Non-cycle P1 modules declare create, review, effective, correction/dispute,
  close/archive, and provider-reconciliation behavior before release.
- Employees can see what is visible to whom before submitting feedback or review text.
- Managers receive prioritized incomplete work rather than separate reminder pages.
- Calibration and compensation tables support pinned identity, column controls,
  keyboard navigation, dense mode, and safe exports.
- Skill and career matches show matched/missing criteria and permit correction.
- Sensitive insights use neutral language and never present probabilistic output
  as fact.

## 8. Security and Responsible Intelligence

- Protected characteristics, private leave/case/accommodation, union activity,
  health, and unrelated communications are prohibited model inputs.
- Models and prompts receive only fields the actor may read.
- Recommendations record model/version, input sources, output, uncertainty,
  reviewer, decision, override, and feedback.
- The system cannot autonomously change rating, promotion, salary, succession,
  opportunity candidacy, learning mandate, or employment status.
- Anonymous survey identity mapping, if technically necessary, is encrypted and
  unavailable to normal product roles.

## 9. Success Measures

- review and acknowledgment completion on time;
- quality signals: useful feedback, completed 1:1 actions, and goal update cadence;
- verified skill coverage and closed critical skill gaps;
- learning completion, certification validity, and development-plan follow-through;
- internal-opportunity discovery-to-interest rate without adverse-impact signal;
- survey participation, action-plan ownership, and repeat improvement;
- compensation cycle time, budget variance, out-of-band exception, and audit completeness;
- benefits enrollment/reconciliation and total-rewards engagement.

## 10. Acceptance Criteria

- [ ] A review cycle snapshots eligible participants and supports governed reassignment.
- [ ] Submitted review versions and calibration overrides remain auditable.
- [ ] Private notes and restricted calibration content never enter broad reporting.
- [ ] Skills show source and verification status and can be corrected.
- [ ] Internal opportunity interest crosses into Recruitment without duplicating ATS state.
- [ ] Learning provider retries do not duplicate completion.
- [ ] Survey drill-down cannot isolate a respondent below the cohort threshold.
- [ ] Compensation worksheets enforce scope, budget, bands, approvals, and override reason.
- [ ] Approved recurring and one-time compensation reach Payroll through distinct contracts.
- [ ] Benefit provider exports reconcile delivery and acknowledgment.
- [ ] Connected benefit claim status cannot be mistaken for native adjudication or payment.
- [ ] Succession, recognition, enrollment, and equity states support correction,
      archive, audit, and employee-visible publication where applicable.
- [ ] Total rewards clearly separates salary, benefits, equity, and estimates.
- [ ] No AI output can directly execute an employment or pay decision.
