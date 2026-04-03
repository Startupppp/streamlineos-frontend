# Task 09: AI & Agent Integration

## Priority: MEDIUM | Effort: 4-5 days | Dependencies: Task 05 (Notifications) | Status: NOT STARTED

---

## PRD

### Problem Statement
AI capabilities exist (Google Gemini via Vercel AI SDK + LangChain) but are underutilized:
1. AI chat exists but lacks context about user's data (leads, deals, tasks)
2. Lead scoring is rule-based, not AI-powered
3. Email drafting is manual, no AI assistance
4. Weekly CEO recap is raw data, not AI-generated narrative
5. No AI-powered notification text (generic messages)
6. No integration with external tools (WhatsApp, Gmail, Slack)

### Goals
- Context-aware AI chat that knows user's leads, deals, and tasks
- AI-powered lead scoring with reasoning
- AI email draft assistant for CRM
- AI-generated weekly recap narrative
- Smart notification text with context
- External tool integration via Composio (or alternative)

### Non-Goals
- Building custom LLM (use existing APIs)
- Real-time AI processing (async/background is fine)
- Voice/video AI features

### Success Criteria
- AI chat provides relevant answers about user's specific data
- Lead scores update automatically with AI reasoning
- Email drafts generated in seconds with lead context
- Weekly recap reads like a professional briefing
- Smart notifications include actionable context

---

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

---

## Rules to Follow

1. **Cost Control**: Set token limits per request. Track API costs
2. **Graceful Fallback**: If AI fails, fall back to rule-based/template-based
3. **No PII in Prompts**: Sanitize sensitive data before sending to AI
4. **Background Processing**: AI scoring and recap run as background jobs (Inngest)
5. **User Control**: Users can disable AI features
6. **Streaming**: Use Vercel AI SDK streaming for chat responses

---

## Checklist

- [ ] Enhance AI chat with user data context (leads, deals, tasks)
- [ ] Add tool functions AI can call (update lead status, create task)
- [ ] Create `lib/ai/lead-scorer.ts` with AI scoring
- [ ] Integrate AI scoring into lead creation/update flow
- [ ] Build "Draft Email" button on lead detail page
- [ ] Enhance weekly CEO recap with AI narrative
- [ ] Create smart notification templates with AI
- [ ] Evaluate Composio vs alternatives for external integrations
- [ ] Set up cost tracking for AI API calls
- [ ] Add AI feature flags (can disable per org)
- [ ] `pnpm build` passes

## Acceptance Criteria

1. AI chat responds with context about user's specific leads/deals
2. Lead scoring includes AI-generated reasoning text
3. Email draft generates relevant follow-up in <5 seconds
4. Weekly recap is narrative format, not raw numbers
5. Smart notifications include lead/deal context
6. AI costs tracked and under budget

## Testing Plan

1. **Chat**: Ask "What are my top leads?" - verify correct data returned
2. **Scoring**: Create a lead, verify AI score and reasoning generated
3. **Email**: Click "Draft Email" on a lead, verify relevant email generated
4. **Recap**: Trigger weekly recap, verify narrative quality
5. **Fallback**: Disable AI API key, verify system still works with fallbacks
