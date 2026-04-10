# CRM / Sales / Marketing / Customer Executive — Feature Roadmap

> HR features are tracked separately in `tasks/hr-features-roadmap.md`

## Status Legend
- ✅ Done — Fully implemented and working
- 🔧 Partial — Exists but needs improvement
- ❌ Missing — Not implemented yet

---

## 1. CRM MODULE

### Core Features (Implemented)
| Feature | Status | Notes |
|---------|--------|-------|
| Lead Pipeline (Kanban + Table) | ✅ | Status: NEW → CONTACTED → INTERESTED → QUALIFIED → CONVERTED/LOST |
| Lead Creation (Sheet) | ✅ | Phone input with country code, financial fields, source tracking |
| Lead Import (CSV/XLSX) | ✅ | Auto-detect headers, auto-distribute to sales reps |
| Lead Export (XLSX) | ✅ | Filtered export with date range |
| Lead Scoring Rules | ✅ | Configurable field/operator/value rules with points |
| Lead Assignment Rules | ✅ | Auto-assignment based on criteria |
| SLA Policies | ✅ | Response time SLAs per priority |
| Lead Distribution | ✅ | Manual + auto distribution to sales team |
| Lead Detail Sheet | ✅ | Activity timeline, quick actions, edit form |
| Deal Pipeline | ✅ | PROSPECT → NEGOTIATION → PROPOSAL → WON/LOST |
| Deal Detail Page | ✅ | Activity timeline, edit form, stage transitions |
| Contacts Directory | ✅ | Table + card view, phone validation |
| Organizations | ✅ | Company accounts with size/industry |
| Clients | ✅ | Client accounts with health tracking |
| CRM Analytics | ✅ | 10+ chart types, date range picker, export per chart |
| CRM Reports | ✅ | SLA compliance, export |
| Targets + Leaderboard | ✅ | Metric targets per rep, achievement tracking |
| Email Templates | ✅ | Template management for CRM emails |
| CRM Settings | ✅ | Tabbed layout: Scoring / Assignment / SLA / Email |

### Missing — To Build
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| C1 | Activity Logging (Calls/Meetings) | ✅ Done | API at /api/leads/[leadId]/activities (call, email, whatsapp, meeting, site_visit). Full Zod validation. Quick Actions UI in lead detail |
| C2 | Lead-to-Deal Conversion Flow | ✅ Done | Conversion modal has "Auto-create Deal" checkbox. Pre-fills deal name, value, notes from lead. Creates deal via useCreateDeal |
| C3 | Lead Duplicate Detection | ✅ Done | API at /api/leads/check-duplicates (email/phone fuzzy match). Warning banner in create-lead-sheet with duplicate details |
| C4 | Deal Approval Workflow | ✅ Done | deal_approval_rules + deal_approvals tables. API: /api/deals/approvals (request + resolve) + /api/deals/approval-rules. Auto-notifies requester. Migration: 0033 |
| C5 | Pipeline Forecasting | ✅ Done | API at /api/deals/forecast. Weighted revenue by month + stage breakdown. Default probabilities per stage. Hook: useDealForecast() |
| C6 | Bulk Email Campaigns | Medium | Select leads by filter → pick template → send bulk. Track open/click/bounce per campaign |
| C7 | Custom Fields (JSONB) | Medium | Admin UI to define custom fields on leads/deals/contacts. Render dynamically in forms/tables |
| C8 | Contact-to-Lead Linking | Medium | Link contacts to leads/deals/orgs. Show relationship graph |
| C9 | Lead Source Attribution | Medium | Track which campaign/channel/UTM generated each lead. Attribution reporting |
| C10 | Follow-up Reminders | ✅ Done | Schema: followUpDate + followUpNotes on leads & deals. API: /api/leads/follow-ups?overdue=true. Hook: useOverdueFollowUps(). Migration: 0030 |
| C11 | Territory Management | Low | Define geographic territories (state/city). Assign reps to territories. Filter leads/deals by territory |
| C12 | Web-to-Lead Form | Low | Embeddable form (iframe/JS widget) that creates leads via API. For website integration |

---

## 2. SALES MODULE

### Core Features (Implemented)
| Feature | Status | Notes |
|---------|--------|-------|
| Sales Dashboard | 🔧 | Uses mock data — needs real DB aggregation |
| Pipeline Value | ✅ | From deals data |
| Deals Won Count | ✅ | From deals data |
| Conversion Rate | ✅ | Calculated metric |
| Revenue Trend Chart | ✅ | Area chart with timeline |
| Pipeline Funnel | ✅ | Visual funnel by stage |
| Top Deals | ✅ | Highest-value deals list |
| Sales Leaderboard | ✅ | Rep rankings by revenue |
| Activity Feed | ✅ | Recent sales activities |
| Deals by Stage | ✅ | Stage-wise breakdown cards |
| Enhanced Metrics (7-day) | ✅ | Active clients, calls, meetings, emails, site visits |
| Sales Person Detail Page | ✅ | Individual rep dashboard |

### Missing — To Build
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| S1 | Real Data Aggregation | ✅ Done | getSalesDashboard() in server/queries/crm-dashboards.ts — real SQL aggregations on crmDeals, crmActivities, crmMonthlyMetrics tables |
| S2 | Quota vs Actual Tracking | ✅ Done | sales_quotas table + API at /api/sales/quotas (GET+POST). Zod validation. Hooks: useSalesQuotas(), useCreateSalesQuota(). Migration: 0031 |
| S3 | Commission Calculator | ✅ Done | commission_rules + commissions tables. Flat % or tiered rules. Engine at server/lib/commission-engine.ts. API: /api/sales/commission-rules + /api/sales/commissions. Migration: 0033 |
| S4 | Call Logging | ✅ Done | API at /api/deals/[dealId]/activities (GET+POST). Types: call, email, meeting, note, document. Zod validated. Hook: useLogDealActivity() already existed |
| S5 | Meeting Notes | ✅ Done | Log meetings linked to deals. Agenda, attendees, action items, recording link |
| S6 | Win/Loss Analysis | Medium | On deal WON/LOST, capture structured reason (competitor, price, timing, fit). Aggregate for trends |
| S7 | Sales Activity Dashboard | Medium | Daily/weekly activity metrics per rep: calls made, emails sent, meetings held, proposals sent |
| S8 | Deal Aging Report | Medium | Track how long deals stay in each stage. Flag stale deals (>X days in same stage) |
| S9 | Sales Playbook | Low | Knowledge base of best practices: scripts, objection handling, pricing guidelines |
| S10 | Revenue Forecasting Report | Low | Exportable monthly/quarterly forecast with weighted pipeline and closed-won projections |

---

## 3. MARKETING MODULE

### Core Features (Implemented)
| Feature | Status | Notes |
|---------|--------|-------|
| Marketing Dashboard | 🔧 | Uses mock data — needs real DB aggregation |
| Active Campaigns | ✅ | Campaign status tracking |
| MQL Tracking | ✅ | Marketing qualified leads count |
| ROI Calculation | ✅ | Overall marketing ROI |
| MQL Trend Chart | ✅ | Area chart |
| Lead Gen Funnel | ✅ | Funnel visualization |
| Channel Breakdown | ✅ | Donut chart by channel |
| Content Performance | ✅ | Views, leads, conversion rate per content |
| Upcoming Events | ✅ | Marketing events list |
| Digital Marketing Page | ✅ | Separate module for DM role |

### Missing — To Build
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| M1 | Real Data Aggregation | ✅ Done | getMarketingDashboard() — real SQL on crmCampaigns, crmLeads, crmContent, crmEvents |
| M2 | Campaign Builder | ✅ Done | Full CRUD at /api/marketing/campaigns (GET/POST) + /[campaignId] (GET/PATCH/DELETE). Enhanced schema with channel, dates, audience, owner. Migration: 0032. Hooks: useMarketingCampaigns(), useCreateMarketingCampaign(), useUpdateMarketingCampaign(), useDeleteMarketingCampaign() |
| M3 | Email Campaign System | ✅ Done | email_campaigns + email_campaign_recipients tables. Full CRUD + send API (/api/marketing/email-campaigns). Filter leads by status/source/priority. Migration: 0034 |
| M4 | UTM Link Generator | ✅ Done | API at /api/marketing/utm (POST=generate, GET=attribution). UTM params: source, medium, campaign, term, content |
| M5 | Landing Page Analytics | Medium | Track page views, form submissions, conversion rate per landing page URL |
| M6 | A/B Testing | Medium | Email subject line A/B tests. Split audience, track winner by open rate |
| M7 | Marketing Calendar | ✅ Done | Visual calendar showing all campaigns, events, content deadlines. Drag-to-reschedule |
| M8 | Lead Source Report | Medium | Which channels/campaigns generate the most leads and highest-value deals |
| M9 | Content Calendar | Low | Plan blog posts, social content, email sends. Assign to team members with deadlines |
| M10 | Social Media Analytics | Low | Pull engagement metrics from LinkedIn/Twitter via API. Show trends |

---

## 4. CUSTOMER EXECUTIVE MODULE

### Core Features (Implemented)
| Feature | Status | Notes |
|---------|--------|-------|
| CE Dashboard | 🔧 | Uses mock data — needs real DB aggregation |
| Total Clients | ✅ | Client count metric |
| NPS Score | ✅ | Net Promoter Score |
| CSAT Score | ✅ | 5-point scale |
| Retention Rate | ✅ | Percentage with trend |
| Client Health Donut | ✅ | Healthy/At Risk/Critical |
| Upcoming Renewals | ✅ | Renewal timeline table |
| Key Accounts | ✅ | Top accounts with CSM assignment |
| Support Overview | ✅ | Open tickets, avg resolution, first response |
| Retention + CSAT Trends | ✅ | Area charts |

### Missing — To Build
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| CE1 | Real Data Aggregation | ✅ Done | getCustomerExecutiveDashboard() — real SQL on crmCompanies, crmSupportTickets, crmActivities |
| CE2 | Client Health Scoring | ✅ Done | healthScore, healthStatus, churnRiskScore columns on clients. API: /api/clients/health (with summary). AI churn analysis updates score. Migration: 0033 |
| CE3 | Churn Risk Alerts | ✅ Done | API at /api/clients/churn-alerts. Lists at-risk + critical clients. Summary counts. Hook: useChurnAlerts() |
| CE4 | Client Activity Timeline | ✅ Done | API at /api/clients/[clientId]/timeline. Aggregates deal activities, lead activities, conversion events. Sorted by date. Hook: useClientTimeline() |
| CE5 | CSAT Survey Builder | Medium | Create simple 1-5 star surveys. Send via email. Aggregate results per client |
| CE6 | Upsell/Cross-sell Tracker | Medium | Log expansion opportunities per client. Track from identified → proposed → won/lost |
| CE7 | Client Onboarding Checklist | Medium | Template-based checklist for new clients. Track completion %, assign tasks to team |
| CE8 | Renewal Pipeline | Low | Kanban board for renewals: Upcoming → In Discussion → Renewed / Churned |
| CE9 | SLA Compliance Dashboard | Low | Track first-response and resolution times vs SLA targets. Show breach % |

---

## 5. AI FEATURES (Claude API)

> All AI features use Claude API via `@anthropic-ai/sdk`. Cost-effective: Claude Haiku for bulk operations, Sonnet for complex analysis.

### Lead Intelligence
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| AI1 | AI Lead Scoring | ✅ Done | GPT-4o-mini scores leads 0-100 with reasoning, strengths, weaknesses, suggested actions. Button on lead detail header + popover. API: POST /api/ai/score-lead |
| AI2 | Lead Enrichment Summary | ✅ Done | GPT-4o generates company insight, estimated size, industry, talking points, potential needs, recommended approach. API: POST /api/ai/enrich-lead. Hook: useEnrichLead() |
| AI3 | Duplicate Lead Detection (AI) | Medium | Fuzzy-match leads by name/company similarity beyond exact email/phone match. "Rahul Sharma at Acme" ≈ "R. Sharma — Acme Corp" |

### Sales Copilot
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| AI4 | AI Follow-up Email Generator | ✅ Done | GPT-4o-mini generates personalized emails with 3 tones (formal/friendly/urgent). Dialog with copy-to-clipboard. API: POST /api/ai/generate-email |
| AI5 | Deal Win/Loss Prediction | ✅ Done | GPT-4o-mini predicts win probability with risk factors, positive signals, actions. API: POST /api/ai/predict-deal. Hook: usePredictDeal(). Auto-updates deal probability |
| AI6 | Conversation Summary | ✅ Done | GPT-4o-mini summarizes activity notes into key points, action items, sentiment. API: POST /api/ai/summarize. Hook: useSummarizeConversation() |
| AI7 | Smart Next-Best-Action | ✅ Done | GPT-4o-mini suggests next action with urgency level + reasoning. API: POST /api/ai/next-action. Hook: useNextBestAction(). Considers stage, recency, follow-ups |
| AI8 | Objection Handler | Medium | Given a deal's lost reason or objection text, suggest counter-arguments and talking points from historical winning deals |

### Marketing AI
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| AI9 | Email Subject Line Generator | Medium | Given campaign context, generate 5 subject line variations. A/B test winner selection |
| AI10 | Content Brief Generator | Medium | Given a topic + target audience, generate a structured content brief: outline, key points, SEO keywords, CTA suggestions |
| AI11 | Campaign Performance Insights | Low | Weekly AI summary of marketing performance: what's working, what's declining, recommended actions |

### Customer Executive AI
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| AI12 | Churn Risk Analysis | ✅ Done | GPT-4o-mini analyzes engagement, tickets, investment value → churn score + risk level + retention actions. API: POST /api/ai/churn-risk. Hook: useAnalyzeChurnRisk() |
| AI13 | Client Sentiment Analysis | Medium | Analyze ticket/chat history tone → flag negative sentiment trends before they become churn |
| AI14 | Account Summary Generator | Low | Generate a 1-page account summary for any client: key metrics, recent interactions, open issues, renewal status. For executive briefings |

### Platform-Wide AI
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| AI15 | Natural Language Search | Medium | "Show me all hot leads from Mumbai with value above 5L" → auto-generate filters. Powered by Claude function-calling |
| AI16 | Report Narrator | Low | Given any chart/table data, generate a plain-English summary paragraph. "Conversion rate increased 12% this month, driven by website leads..." |
| AI17 | Meeting Prep Brief | Low | Before a scheduled meeting, auto-generate a brief: client history, recent deals, open tickets, talking points |

---

## 6. INTEGRATIONS (via Composio — Free Tier: 1000 actions/mo)

> Composio provides unified API access to 250+ tools. Free tier gives 1000 actions/month. Architecture: `lib/integrations/composio.ts` client → per-integration modules.

### Tier 1 — High Priority (Build First)
| # | Integration | Actions/Mo Est. | Description |
|---|-------------|-----------------|-------------|
| INT1 | WhatsApp Business API | ~300 | Send/receive WhatsApp messages from lead/deal detail pages. Template messages for follow-ups. Delivery + read receipts. Conversation history in activity timeline |
| INT2 | Gmail / Outlook Sync | ~200 | Two-way email sync per rep. Track opens/clicks. Show email history in lead/deal timeline. Send from CRM |
| INT3 | IndiaMART Lead Sync | ~100 | Auto-import new leads from IndiaMART buyer enquiries. Map fields: name, phone, city, product interest → CRM lead. Run every 15 min |
| INT4 | Google Calendar Sync | ~50 | Two-way sync: CRM meetings ↔ Google Calendar. Auto-create calendar event when meeting logged |

### Tier 2 — Medium Priority
| # | Integration | Actions/Mo Est. | Description |
|---|-------------|-----------------|-------------|
| INT5 | JustDial Lead Sync | ~100 | Import leads from JustDial enquiries. Similar to IndiaMART connector |
| INT6 | 99acres / MagicBricks | ~50 | For real estate: import property enquiries as leads |
| INT7 | Razorpay Payment Tracking | ~50 | When invoice is paid via Razorpay, auto-update invoice status. Show payment history |
| INT8 | LinkedIn (via Composio) | ~30 | View lead's LinkedIn profile summary from CRM. One-click connection request |

### Tier 3 — Nice to Have
| # | Integration | Actions/Mo Est. | Description |
|---|-------------|-----------------|-------------|
| INT9 | Slack Notifications | ~50 | Post to Slack channels: new lead assigned, deal won, SLA breached, target achieved |
| INT10 | Google Sheets Export | ~20 | One-click export any table/report to a Google Sheet (linked, auto-updates) |
| INT11 | Twilio (SMS) | ~30 | Send SMS reminders: payment due, meeting reminder, follow-up nudge |

### Integration Architecture
```
lib/integrations/
  composio.ts          — Composio SDK client, auth, rate limit tracking
  whatsapp.ts          — WhatsApp message send/receive, templates
  email-sync.ts        — Gmail/Outlook sync, tracking pixels
  indiamart.ts         — IndiaMART lead import, field mapping
  justdial.ts          — JustDial lead import
  google-calendar.ts   — Calendar two-way sync
  razorpay.ts          — Payment webhook handler

app/api/integrations/
  composio/auth/route.ts       — OAuth flow for Composio connections
  composio/callback/route.ts   — OAuth callback
  whatsapp/send/route.ts       — Send WhatsApp message
  whatsapp/webhook/route.ts    — Receive WhatsApp webhook
  indiamart/sync/route.ts      — Manual/cron lead sync trigger
  email/sync/route.ts          — Email sync trigger

app/(dashboard)/settings/integrations/
  page.tsx             — Integration management UI: connected accounts, sync status, usage meter
```

### Composio Usage Budget (Free Tier: 1000/mo)
| Integration | Estimated Actions | Notes |
|-------------|-------------------|-------|
| WhatsApp | 300 | ~10 messages/day |
| Email Sync | 200 | ~7 syncs/day |
| IndiaMART | 100 | 4 syncs/day (every 6 hrs) |
| Google Calendar | 50 | On meeting create/update |
| Reserve | 350 | Buffer for other integrations |
| **Total** | **1000** | Fits free tier exactly |

---

## 7. CROSS-CUTTING FEATURES

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

### Missing — To Build
| # | Feature | Priority | Description |
|---|---------|----------|-------------|
| X1 | Global Search | ✅ Done | API at /api/search?q=... searches leads, deals, contacts, clients, tickets. Cmd+K command palette enhanced with entity search + page navigation. ILIKE queries |
| X2 | Scheduled Reports | ✅ Done | Daily sales digest via Inngest (8:30 AM IST weekdays). Notifies CEO/managers with: new leads, deals won, pipeline value, overdue follow-ups |
| X3 | Webhook System | ✅ Done | Admin can create webhooks: on lead.created, deal.won, etc. POST to external URL with JSON payload |
| X4 | Notification Preferences | ✅ Done | Per-user: choose which events trigger push/email/in-app notifications |
| X5 | API Documentation (OpenAPI) | Low | Auto-generated from route handlers. Swagger UI at `/api/docs` |
| X6 | Data Import/Export Hub | ✅ Done | Centralized page for importing/exporting any entity (leads, contacts, deals, employees) |

---

## Build Priority Order

### Phase A — Foundation (Real Data + AI Setup)
1. **S1** — Real sales dashboard aggregation (replace mock)
2. **M1** — Real marketing dashboard aggregation (replace mock)
3. **CE1** — Real CE dashboard aggregation (replace mock)
4. **AI setup** — Install `@anthropic-ai/sdk`, create `lib/ai/client.ts` with Claude Haiku/Sonnet helpers
5. **Composio setup** — Install SDK, create `lib/integrations/composio.ts`, settings/integrations page

### Phase B — Core CRM + AI (Highest ROI)
6. **C1** — Activity logging (calls/meetings)
7. **C2** — Lead-to-deal conversion flow
8. **AI4** — AI follow-up email generator
9. **AI1** — AI lead scoring
10. **C3** — Lead duplicate detection
11. **INT1** — WhatsApp Business integration (Composio)

### Phase C — Sales Power Features
12. **S2** — Quota vs actual tracking
13. **S3** — Commission calculator
14. **AI5** — Deal win/loss prediction
15. **S4** — Call logging
16. **C4** — Deal approval workflow
17. **C5** — Pipeline forecasting

### Phase D — Marketing + Integrations
18. **M2** — Campaign builder
19. **M3** — Email campaign system
20. **INT2** — Gmail/Outlook email sync
21. **INT3** — IndiaMART lead sync
22. **AI9** — Email subject line generator
23. **M4** — UTM link generator

### Phase E — Customer Success + Polish
24. **CE2** — Client health scoring
25. **CE3** — Churn risk alerts
26. **AI12** — AI churn risk analysis
27. **CE4** — Client activity timeline
28. **CE5** — CSAT survey builder
29. **X1** — Global search (Cmd+K)

### Phase F — Advanced AI + Remaining
30. **AI6** — Conversation summary
31. **AI7** — Smart next-best-action
32. **AI2** — Lead enrichment summary
33. **AI15** — Natural language search
34. **X2** — Scheduled reports
35. **INT4** — Google Calendar sync
36. Remaining items based on user feedback
