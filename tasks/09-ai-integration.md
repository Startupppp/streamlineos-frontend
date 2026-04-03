# Task 09: AI & Agent Integration

## Priority: 🟡 MEDIUM

### 9.1 Enhance Existing AI Chat

**Current**: `lib/ai/automation.ts` + `lib/ai/langchain-graph.ts` + `app/api/ai/`

**Improvements**:
- Add context-aware prompts (inject current user's leads, deals, tasks)
- Add tool functions the AI can call (update lead status, create task, send notification)
- Add streaming response with Vercel AI SDK (already installed)

---

### 9.2 AI-Powered Lead Scoring

**New file**: `lib/ai/lead-scorer.ts`

**Logic**:
- Input: lead data (source, priority, activities count, response time, investment interest)
- AI evaluates and returns 0-100 score with reasoning
- Auto-run on lead creation and after each activity
- Update `leads.score` column

---

### 9.3 AI Email Draft Assistant

**New feature in lead detail page**:
- "Draft Email" button → AI generates follow-up email
- Uses lead context (name, status, last activity, notes)
- User can edit before sending
- Integration with existing email templates

---

### 9.4 AI Weekly Recap

**Enhance existing** `server/actions/weekly-ceo-recap.ts`:
- Use AI to generate narrative summary instead of raw data
- Parse metrics → "This week, 23 new leads came in (↑15% vs last week). Top performer: Ravi with 8 conversions..."
- Send as formatted email

---

### 9.5 Composio Integration (If Approved)

**Install**: `pnpm add composio-core`

**Use cases**:
- WhatsApp message sending to clients
- Gmail integration for lead email tracking
- Slack notifications for team alerts
- Google Calendar sync for meetings

**Alternative** (if Composio not approved):
- Direct WhatsApp Business API integration
- Resend for email (replace SendGrid)
- Custom Slack webhook

---

### 9.6 Smart Notifications

**AI-generated notification text**:
- Instead of "Lead assigned to you", generate "High-priority lead Rajesh Sharma (₹50L potential) assigned to you. Source: Referral from existing client. Suggested action: Call within 2 hours."
- Use AI to determine notification priority and channel

**Acceptance Criteria**:
- AI chat provides context-aware responses
- Lead scoring auto-updates
- Email draft assistant works with lead context
- Weekly recap is AI-generated narrative
- Smart notifications have context
