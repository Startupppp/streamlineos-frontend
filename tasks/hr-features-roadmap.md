# HR Module — Complete Feature Roadmap

## Current Status (Implemented)

### Core HR
- [x] Employee directory with search, filter, pagination, export
- [x] Employee onboarding wizard (multi-step form)
- [x] Employee detail page with profile/professional/bank sections
- [x] Department management
- [x] Org chart (tree view + department grid)
- [x] Employee termination

### Attendance & Time
- [x] Clock in/out with timer
- [x] Break tracking
- [x] Monthly attendance calendar
- [x] Attendance history
- [x] Work logs (daily entries with admin approval)
- [x] Timesheet management

### Leave Management
- [x] Leave types + balances
- [x] Leave request workflow (apply → approve/reject)
- [x] WFH requests (apply → approve/reject)
- [x] Holiday calendar (admin managed)

### Payroll
- [x] Salary structures
- [x] Payroll generation (bulk + individual)
- [x] Payslip preview with LOP/bonus/overtime
- [x] Payroll approval workflow (Draft → Approved → Paid)
- [x] Employee payslip view + PDF download

### Expenses
- [x] Expense submission with receipt upload
- [x] Expense approval workflow
- [x] Admin expense management
- [x] Expense categories
- [x] Export reports

### Documents
- [x] Document upload with categories
- [x] Rich document editor (TipTap) with templates
- [x] Document publish/unpublish
- [x] Custom folders
- [x] Storage usage tracking

### Recruitment
- [x] Job posting CRUD (Draft → Open → Paused → Closed → Filled)
- [x] Candidate management with card-based pipeline
- [x] Candidate status tracking (New → Screening → Interview → Offer → Hired)
- [x] Interview scheduling with type/duration/link
- [x] Interview result tracking
- [x] Recruitment stats dashboard
- [x] Candidate applications

### Performance
- [x] Performance reviews listing + creation + completion
- [x] Review cycles (quarterly/annual/custom) with CRUD
- [x] Goals CRUD with progress tracking + deletion
- [x] 1-on-1 meeting scheduling + status management
- [x] Ad-hoc + cycle-based review support

### Other
- [x] Helpdesk ticket system
- [x] Employee devices tracking
- [x] Incentives management
- [x] Incentive configuration

---

## Missing Features (To Implement)

### Recruitment Enhancements
- [x] Candidate detail page with applications + interviews + status change
- [x] Interview feedback forms with structured scoring rubric (slider-based)
- [x] Recruitment pipeline kanban board (DnD between stages)
- [x] Offer letter generation from candidate + job posting → TipTap document
- [x] Referral tracking (referredBy field on candidates)
- [x] Bulk candidate import (CSV/JSON up to 500 at once)
- [x] Public careers page (/careers — no auth, shows open jobs)
- [x] Email templates (CRUD for HR email templates with variables)

### Performance Management
- [x] Review cycles (quarterly/annual/custom) with CRUD
- [x] Review creation (ad-hoc + cycle-based) with ratings
- [x] 1-on-1 meeting scheduling + notes + action items
- [x] OKR tracking with key results (CRUD for key results per goal)
- [x] Performance improvement plans (PIP) with objectives, tracking, outcome
- [x] Skills matrix (employee skills with 1-5 levels, verification)
- [x] 360-degree feedback (self, peer, manager, skip-level with rubric)
- [x] Career ladder / growth paths (levels with skills + experience)

### Employee Self-Service
- [x] My Payslips page (accessible to all roles via sidebar)
- [x] My Leaves (already accessible via sidebar)
- [x] My Attendance (already accessible via sidebar)
- [x] My Expenses (already accessible via sidebar)
- [x] My Profile API (edit personal info, bank details, emergency contact)
- [x] Attendance heatmap API (yearly data with intensity + streak tracking)
- [x] My Goals API (personal goals + key results)
- [x] My Training API (enrollments + certifications)

### Advanced Payroll
- [x] Payroll reimbursements (submit → approve → pay workflow)
- [x] Loan management / salary advance (apply → approve → disburse → EMI tracking)
- [x] Tax calculation engine (TDS, PF, ESI, old/new regime, full breakdown)
- [x] Bonus processing (performance, festival, referral, spot, annual)
- [x] Full & Final settlement (dues, encashment, deductions, loan recovery)
- [x] Payroll reports (monthly summary + Form 16 data per employee)

### Training & Development
- [x] Training programs catalog (CRUD with publish/archive)
- [x] Course enrollment (self-enroll + admin enroll)
- [x] Enrollment status tracking (Enrolled → In Progress → Completed)
- [x] Certification management with expiry tracking (30-day alert query)
- [x] Skills assessment quiz engine (create + take + auto-score)
- [x] Learning paths (ordered steps: training → assessment → certification)

### Employee Engagement
- [x] Recognition / kudos system (social feed, 5 categories, cross-org)
- [x] Pulse surveys (create → publish → collect anonymous/named responses)
- [x] Anonymous feedback (via anonymous survey responses)
- [x] Employee NPS tracking (anonymous scoring 0-10 by period)
- [x] Birthday/anniversary celebrations feed (today + upcoming 7 days)
- [x] Team events (create, RSVP, participant tracking)

### Compliance & Legal
- [x] Policy acknowledgment tracking (send → acknowledge/decline workflow)
- [x] Background verification tracking (initiate → track → pass/fail)
- [x] Handbook versioning (linked to rich documents, changelog)
- [x] Statutory compliance dashboard API (policy acks, cert expiry, BGV, payroll status)
- [x] Document + cert expiry alerts API (configurable days ahead)

### Analytics & Reports
- [x] HR analytics dashboard (headcount, dept distribution, gender diversity, role distribution)
- [x] Payroll cost analysis (YTD)
- [x] Expense tracking (approved YTD)
- [x] Leave requests by status + monthly trend
- [x] Recruitment analytics (hiring funnel, source effectiveness, avg time-to-hire)
- [x] Attendance reports (department-wise, daily summary by month)
- [x] Attrition analysis API (rate, resigned count, monthly trend)
- [x] Compensation benchmarking API (avg/min/max/median by dept + role)

### Exit Management
- [x] Resignation workflow (submit → approve → complete) with notice period tracking
- [x] Exit interview notes + structured feedback questionnaire
- [x] Exit checklist system (admin can add checklist items)
- [x] Asset return tracking (pending → returned/damaged/lost)
- [x] Full & final settlement (API complete)
- [x] Experience letter generation (auto-generates TipTap document from employee data)
- [x] Alumni network (profiles with current company, LinkedIn, opt-in)

### Integrations
- [x] Google Calendar sync for interviews (uses existing OAuth tokens)
- [x] Slack webhook notifications (leave, expense, resignation, custom)
- [x] Accounting export (Tally XML, QuickBooks CSV, JSON)
- [x] Job board posting (LinkedIn, Naukri, Indeed — ready when API keys configured)
- [x] Biometric webhook receiver (check-in/check-out via API key auth)
- [x] Email integration (template variables, candidate auto-fill, SendGrid)

---

## Priority Order for Implementation

### P0 — Critical (Next Sprint)
1. Candidate detail page with timeline
2. Performance review creation flow
3. Goal creation + update flow
4. 1-on-1 meeting scheduling

### P1 — High (Next 2 Sprints)
5. Recruitment pipeline kanban (DnD)
6. Interview feedback forms
7. Tax calculation engine
8. Employee self-service portal
9. HR analytics dashboard

### P2 — Medium (Next Quarter)
10. Training & development module
11. Exit management workflow
12. Offer letter generation
13. Compliance dashboard
14. Background verification tracking

### P3 — Low (Backlog)
15. Employee engagement features
16. External integrations
17. Advanced reporting
18. AI-powered candidate matching
