# HRM-14g — Catalog: Recruitment (BOUNDARY only)

> Acceptance reference only. Dispatch and status live in [README.md](./README.md).

> Parent: [14-page-catalog-readme.md](./14-page-catalog-readme.md)

**Scope rule:** This pack does **not** deliver ATS feature completion. Every
route below is accounted so none are “forgotten,” but anatomy is **thin**:
owner = future Recruitment program; HRMS only keeps hire → onboarding deep
links and universal `/me/job-openings` / `/me/referrals`.

## Accounting table (all live routes)

| Route | Disposition | Minimal HRMS obligation |
|-------|-------------|-------------------------|
| `/hr/recruitment` | BOUNDARY | Hub must not 404; link hire→onboarding when present |
| `/hr/recruitment/jobs` | BOUNDARY | |
| `/hr/recruitment/jobs/new` | BOUNDARY | |
| `/hr/recruitment/jobs/[jobId]/edit` | BOUNDARY | |
| `/hr/recruitment/candidates` | BOUNDARY | |
| `/hr/recruitment/candidates/[candidateId]` | BOUNDARY | On hire → `/hr/onboarding/[userId]` |
| `/hr/recruitment/candidates/import` | BOUNDARY | |
| `/hr/recruitment/candidates/intake` | BOUNDARY | |
| `/hr/recruitment/pipeline` | BOUNDARY | Only kanban in product today — ATS owns |
| `/hr/recruitment/interviews` | BOUNDARY | |
| `/hr/recruitment/offers` | BOUNDARY | |
| `/hr/recruitment/offer-templates` | BOUNDARY | |
| `/hr/recruitment/referrals` | BOUNDARY | |
| `/hr/recruitment/refer` | BOUNDARY | |
| `/hr/recruitment/internal-jobs` | BOUNDARY | Align with `/me/job-openings` |
| `/hr/recruitment/recruiters` | BOUNDARY | |
| `/hr/recruitment/booking-links` | BOUNDARY | |
| `/hr/recruitment/inbox` | BOUNDARY | |
| `/hr/recruitment/vendors` | BOUNDARY | |
| `/hr/recruitment/talent-pools` | BOUNDARY | |
| `/hr/recruitment/analytics` | BOUNDARY | inline page — ATS extract later |
| `/hr/recruitment/settings` | BOUNDARY | inline link hub |
| `/hr/recruitment/automations` | BOUNDARY | |
| `/hr/recruitment/diversity-report` | BOUNDARY | |
| `/hr/recruitment/email-sequences` | BOUNDARY | |
| `/hr/recruitment/headcount` | BOUNDARY | May feed HR dashboard signal only |
| `/hr/recruitment/hiring-flows` | BOUNDARY | |
| `/hr/recruitment/interviewer-performance` | BOUNDARY | |
| `/hr/recruitment/question-bank` | BOUNDARY | |
| `/hr/recruitment/reports` | BOUNDARY | |
| `/hr/recruitment/requisitions` | BOUNDARY | |
| `/hr/recruitment/scorecard-analytics` | BOUNDARY | |
| `/hr/recruitment/scorecard-templates` | BOUNDARY | |
| `/hr/recruitment/sla` | BOUNDARY | |
| `/hr/recruitment/sla-report` | BOUNDARY | |
| `/me/recruitment` | BOUNDARY | Candidate self surface |

## HRMS-owned handoff only

- [ ] **HRM-14g-001** hired candidate → onboarding deep link contract tested.
- [ ] **HRM-14g-002** headcount signal on HR dashboard documented (read-only).
- [ ] **HRM-14g-003** open Recruitment program PRD (separate folder) for full
  filters/views/sheets/API catalog — **not** duplicated here.
- [ ] **HRM-14g-004** fix stale `/recruitment` product path exception (HRM-08).

## Explicit non-work in this pack

Do not spend HRMS remediation capacity on: pipeline kanban UX, scorecards,
offer generation, SLA reports, email sequences, interviewer performance,
diversity report, booking links — unless blocking an HRMS P0 handoff.
