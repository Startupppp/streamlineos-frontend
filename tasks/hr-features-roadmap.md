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
- [ ] Job posting public page / careers page
- [ ] Referral tracking (which employee referred)
- [ ] Hiring funnel analytics (conversion rates per stage)
- [ ] Email templates for candidate communication
- [ ] Bulk candidate import (CSV upload)

### Performance Management
- [x] Review cycles (quarterly/annual/custom) with CRUD
- [x] Review creation (ad-hoc + cycle-based) with ratings
- [x] 1-on-1 meeting scheduling + notes + action items
- [ ] 360-degree feedback (peer, manager, self-review)
- [ ] OKR tracking with key results + check-ins
- [ ] Performance improvement plans (PIP)
- [ ] Skills matrix / competency mapping
- [ ] Employee growth path / career ladder

### Employee Self-Service
- [x] My Payslips page (accessible to all roles via sidebar)
- [x] My Leaves (already accessible via sidebar)
- [x] My Attendance (already accessible via sidebar)
- [x] My Expenses (already accessible via sidebar)
- [ ] My Profile page (edit personal info, bank details)
- [ ] My Attendance heatmap visualization
- [ ] My Goals dashboard
- [ ] My Training / certifications

### Advanced Payroll
- [x] Payroll reimbursements (submit → approve → pay workflow)
- [x] Loan management / salary advance (apply → approve → disburse → EMI tracking)
- [ ] Tax calculation engine (TDS, PF, ESI for India)
- [ ] Bonus processing (festival/performance)
- [ ] Full & Final settlement calculation
- [ ] Payroll compliance reports (Form 16, 24Q)

### Training & Development
- [x] Training programs catalog (CRUD with publish/archive)
- [x] Course enrollment (self-enroll + admin enroll)
- [x] Enrollment status tracking (Enrolled → In Progress → Completed)
- [ ] Certification management with expiry alerts
- [ ] Skills assessment tests
- [ ] Learning path recommendations

### Employee Engagement
- [x] Recognition / kudos system (social feed, 5 categories, cross-org)
- [ ] Pulse surveys
- [ ] Anonymous feedback
- [ ] Employee NPS (eNPS) tracking
- [ ] Birthday/anniversary celebrations feed
- [ ] Team building event management

### Compliance & Legal
- [x] Policy acknowledgment tracking (send → acknowledge/decline workflow)
- [ ] Background verification tracking
- [ ] Employee handbook versioning
- [ ] Statutory compliance dashboard
- [ ] Document expiry alerts + auto-reminders

### Analytics & Reports
- [x] HR analytics dashboard (headcount, dept distribution, gender diversity, role distribution)
- [x] Payroll cost analysis (YTD)
- [x] Expense tracking (approved YTD)
- [x] Leave requests by status + monthly trend
- [x] Recruitment analytics (hiring funnel, source effectiveness, avg time-to-hire)
- [x] Attendance reports (department-wise, daily summary by month)
- [ ] Attrition analysis
- [ ] Compensation benchmarking

### Exit Management
- [x] Resignation workflow (submit → approve → complete) with notice period tracking
- [x] Exit interview notes + structured feedback questionnaire
- [x] Exit checklist system (admin can add checklist items)
- [ ] Asset return tracking
- [ ] Full & final settlement
- [ ] Experience letter generation
- [ ] Alumni network

### Integrations
- [ ] Google Calendar sync for interviews
- [ ] Slack/Teams notifications for approvals
- [ ] Accounting software export (Tally, QuickBooks)
- [ ] Job board integrations (LinkedIn, Naukri, Indeed)
- [ ] Biometric device integration
- [ ] Email integration for candidate communication

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
