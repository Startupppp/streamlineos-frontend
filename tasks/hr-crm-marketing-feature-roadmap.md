# HR / CRM / Marketing — Feature Roadmap

## Status Legend
- ✅ Done — Fully implemented and working
- 🔧 Partial — Exists but needs improvement
- ❌ Missing — Not implemented, needed or good-to-have

---

## 1. CRM MODULE

### Core Features
| Feature | Status | Notes |
|---------|--------|-------|
| Lead Pipeline (Kanban + Table) | ✅ Done | Status flow: NEW → CONTACTED → INTERESTED → QUALIFIED → CONVERTED/LOST |
| Lead Creation (Sheet) | ✅ Done | With phone input (country code), financial fields, source tracking |
| Lead Import (CSV/XLSX) | ✅ Done | Auto-detect headers, auto-distribute to sales reps |
| Lead Export (XLSX) | ✅ Done | Filtered export with date range |
| Lead Scoring Rules | ✅ Done | Configurable field/operator/value rules with points |
| Lead Assignment Rules | ✅ Done | Auto-assignment based on criteria |
| SLA Policies | ✅ Done | Response time SLAs per priority |
| Lead Distribution | ✅ Done | Manual + auto distribution to sales team |
| Lead Detail Sheet | ✅ Done | Activity timeline, quick actions, edit form |
| Deal Pipeline | ✅ Done | PROSPECT → NEGOTIATION → PROPOSAL → WON/LOST |
| Deal Detail Page | ✅ Done | Activity timeline, edit form, stage transitions |
| Contacts Directory | ✅ Done | Table + card view, phone validation |
| Organizations | ✅ Done | Company accounts with size/industry |
| Clients | ✅ Done | Client accounts with health tracking |
| CRM Analytics | ✅ Done | 10+ chart types, date range filter, export per chart |
| CRM Reports | ✅ Done | SLA compliance, export |
| Targets + Leaderboard | ✅ Done | Metric targets per rep, achievement tracking |
| Email Templates | ✅ Done | Template management for CRM emails |
| CRM Settings Tab Nav | ✅ Done | Tabbed layout: Scoring / Assignment / SLA / Email |

### Missing — Should Build
| Feature | Priority | Description |
|---------|----------|-------------|
| Deal Approval Workflow | High | Require manager approval for deals above a threshold |
| Pipeline Forecasting | High | Probability-weighted revenue forecast by month/quarter |
| Activity Logging (Calls/Meetings) | High | Structured call/meeting logs linked to leads/deals |
| Lead-to-Deal Conversion Flow | Medium | When lead is CONVERTED, auto-create a deal with pre-filled data |
| Bulk Email Campaigns | Medium | Send template-based emails to filtered lead segments |
| Lead Duplicate Detection | Medium | Warn when creating lead with existing email/phone |
| Custom Fields | Medium | Admin-definable fields on leads/deals/contacts (JSONB) |
| Lead Source Attribution | Low | Track which campaign/channel generated each lead |
| Territory Management | Low | Geographic/account-based territory assignment |
| WhatsApp Integration | Low | Send WhatsApp messages from lead detail (API) |

---

## 2. HR MODULE

### Core Features
| Feature | Status | Notes |
|---------|--------|-------|
| Employee Directory | ✅ Done | CRUD, photo, department, designation, reporting |
| Employee Onboarding | ✅ Done | Multi-step wizard with personal/bank/document info |
| Attendance | ✅ Done | Clock in/out, calendar view, daily history |
| Leave Management | ✅ Done | Request/approve leaves, WFH, balance tracking |
| Payroll | ✅ Done | Monthly generation, payslips, LOP, overtime |
| Expenses | ✅ Done | Claim creation, category filter, approval workflow |
| Documents | ✅ Done | Rich text editor, versioning, sharing |
| Recruitment | ✅ Done | Job postings, candidates, interview scheduling |
| Devices | ✅ Done | Device inventory tracking |
| Performance Reviews | 🔧 Partial | Basic dashboard, no review cycles |
| Incentives | 🔧 Partial | Tracking page, no calculation engine |
| Org Chart | ✅ Done | Hierarchy visualization |
| Work Logs | ✅ Done | Daily work log entries |
| Timesheets | ✅ Done | Time entries, project-based, weekly chart |
| Helpdesk | ✅ Done | Support ticket system |

### Missing — Should Build
| Feature | Priority | Description |
|---------|----------|-------------|
| Performance Review Cycles | High | Quarterly/annual review cycles with goals, self-assessment, manager review |
| Employee Offboarding | High | Exit workflow: asset return, access revocation, exit interview |
| Training & Development | Medium | Course assignments, completion tracking, certifications |
| Employee Self-Service Portal | Medium | Employees update own profile, view payslips, request documents |
| Advanced Leave Calendar | Medium | Team-wide leave calendar with conflict detection |
| Shift Management | Medium | Configurable shifts, shift swap requests |
| Automated Payroll Rules | Medium | Auto-calculate LOP, overtime, bonus based on attendance |
| HR Analytics Dashboard | Medium | Attrition rate, headcount trends, department distribution |
| Document Templates | Low | Generate offer letters, contracts from templates |
| Employee Surveys | Low | Engagement surveys, pulse checks |
| Grievance Management | Low | Anonymous complaint submission and tracking |

---

## 3. SALES MODULE

### Core Features
| Feature | Status | Notes |
|---------|--------|-------|
| Sales Dashboard | 🔧 Partial | Uses mock data — needs real aggregation |
| Pipeline Value | ✅ Done | From deals data |
| Deals Won Count | ✅ Done | From deals data |
| Conversion Rate | ✅ Done | Calculated metric |
| Revenue Trend Chart | ✅ Done | Area chart with timeline |
| Pipeline Funnel | ✅ Done | Visual funnel by stage |
| Top Deals | ✅ Done | Highest-value deals list |
| Sales Leaderboard | ✅ Done | Rep rankings by revenue |
| Activity Feed | ✅ Done | Recent sales activities |
| Deals by Stage | ✅ Done | Stage-wise breakdown |
| Enhanced Metrics (7-day) | ✅ Done | Active clients, calls, meetings, emails, site visits |
| Sales Person Detail Page | ✅ Done | Individual rep dashboard |

### Missing — Should Build
| Feature | Priority | Description |
|---------|----------|-------------|
| Real Data Aggregation | Critical | Replace `useSalesDashboard()` mock with real DB queries |
| Quota vs Actual Tracking | High | Track each rep's quota attainment percentage |
| Commission Calculator | High | Auto-calculate commission based on deals closed |
| Sales Forecasting | Medium | AI-powered deal close probability predictions |
| Call Logging | Medium | Log calls with duration, outcome, next action |
| Meeting Scheduler | Medium | Schedule meetings with clients from deals page |
| Sales Playbook | Low | Best practices, objection handling, scripts |
| Territory Analytics | Low | Performance comparison by geographic territory |

---

## 4. MARKETING MODULE

### Core Features
| Feature | Status | Notes |
|---------|--------|-------|
| Marketing Dashboard | 🔧 Partial | Uses mock data — needs real aggregation |
| Active Campaigns | ✅ Done | Campaign status tracking |
| MQL Tracking | ✅ Done | Marketing qualified leads count |
| ROI Calculation | ✅ Done | Overall marketing ROI |
| MQL Trend Chart | ✅ Done | Area chart |
| Lead Gen Funnel | ✅ Done | Funnel visualization |
| Channel Breakdown | ✅ Done | Donut chart by channel |
| Content Performance | ✅ Done | Views, leads, conversion rate per content |
| Upcoming Events | ✅ Done | Marketing events list |
| Digital Marketing Page | ✅ Done | Separate module for DM role |

### Missing — Should Build
| Feature | Priority | Description |
|---------|----------|-------------|
| Real Data Aggregation | Critical | Replace `useMarketingDashboard()` mock with real DB queries |
| Campaign Builder | High | Create/edit campaigns with budget, channels, dates |
| Email Campaign System | High | Bulk email sending with templates, tracking open/click rates |
| Social Media Scheduler | Medium | Schedule posts to LinkedIn, Twitter, Instagram |
| Landing Page Analytics | Medium | Track conversion rates for landing pages |
| A/B Testing | Medium | Test email subject lines, landing page variants |
| Attribution Modeling | Medium | First-touch / last-touch / multi-touch attribution |
| Marketing Calendar | Low | Visual calendar of all campaigns and events |
| UTM Tracking | Low | Auto-generate UTM links, track by campaign |
| Content Calendar | Low | Plan and schedule content across channels |

---

## 5. CUSTOMER EXECUTIVE MODULE

### Core Features
| Feature | Status | Notes |
|---------|--------|-------|
| CE Dashboard | 🔧 Partial | Uses mock data — needs real aggregation |
| Total Clients | ✅ Done | Client count metric |
| NPS Score | ✅ Done | Net Promoter Score tracking |
| CSAT Score | ✅ Done | Customer satisfaction (5-point scale) |
| Retention Rate | ✅ Done | Percentage with trend |
| Client Health Donut | ✅ Done | Healthy/At Risk/Critical breakdown |
| Upcoming Renewals | ✅ Done | Renewal timeline table |
| Key Accounts | ✅ Done | Top accounts with CSM assignment |
| Support Overview | ✅ Done | Open tickets, avg resolution, first response |
| Retention Trend | ✅ Done | Area chart |
| CSAT Trend | ✅ Done | Area chart |

### Missing — Should Build
| Feature | Priority | Description |
|---------|----------|-------------|
| Real Data Aggregation | Critical | Replace `useCustomerExecutiveDashboard()` mock with real DB queries |
| Client Health Scoring | High | Automated health score based on engagement, tickets, renewal date |
| Churn Risk Alerts | High | Flag clients at risk of churning based on usage/engagement |
| Upsell/Cross-sell Tracker | Medium | Track expansion revenue opportunities per client |
| Client Onboarding Checklist | Medium | Guided onboarding workflow for new clients |
| CSAT Survey Builder | Medium | Create and send satisfaction surveys |
| Customer Journey Map | Low | Visual timeline of client lifecycle events |
| Knowledge Base | Low | Self-service articles for clients |
| SLA Compliance Dashboard | Low | Track response/resolution time vs SLA targets |

---

## 6. CROSS-CUTTING FEATURES

### Implemented ✅
- Role-based access control (8 roles)
- Branch isolation (data scoped by branch)
- TOTP MFA + session management
- Audit logging
- API keys
- Real-time chat (Ably)
- Calendar with Google Meet
- Push notifications
- CSV import/export
- Dark mode
- Responsive design
- Sentry error tracking

### Missing — Should Build
| Feature | Priority | Description |
|---------|----------|-------------|
| Advanced Permissions (ACL) | High | Object-level permissions beyond role-based |
| Scheduled Reports | Medium | Email digest with key metrics daily/weekly |
| Webhook System | Medium | Allow external integrations via webhooks |
| API Documentation (OpenAPI) | Medium | Auto-generated API docs |
| Global Search | Medium | Full-text search across leads, contacts, deals, tickets |
| Data Import/Export Hub | Low | Centralized import/export for all modules |
| Mobile PWA | Low | Progressive web app for mobile access |
| Zapier/Make Integration | Low | Connect to third-party tools |

---

## Build Priority Order

### Phase A — Critical (Mock → Real Data)
1. Replace mock sales dashboard with real DB aggregation
2. Replace mock marketing dashboard with real DB aggregation
3. Replace mock CE dashboard with real DB aggregation

### Phase B — High Impact Features
4. Performance review cycles (HR)
5. Deal approval workflows (CRM)
6. Pipeline forecasting (Sales)
7. Activity logging — calls/meetings (CRM)
8. Client health scoring (CE)
9. Employee offboarding (HR)

### Phase C — Medium Impact
10. Email campaign system (Marketing)
11. Quota vs actual tracking (Sales)
12. Training & development (HR)
13. Lead duplicate detection (CRM)
14. Campaign builder (Marketing)
15. CSAT survey builder (CE)

### Phase D — Polish & Integrations
16. Global search
17. Scheduled reports
18. Webhook system
19. Territory management
20. WhatsApp integration
