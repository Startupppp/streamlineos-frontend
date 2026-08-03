# Recon Lane N — AI Module Audit
Date: 2026-07-31 | Scope: `backend/src/modules/ai/**` (excl. `billing/`) + `frontend/components/ai/**`

---

## 1. AI Feature Inventory (56 endpoints total; 11 HR/payroll-flagged)

| # | Method | Path | Controller file:line | What it does | Model tier | Max tokens | Module | HR/Pay? |
|---|--------|------|----------------------|--------------|------------|-----------|--------|---------|
| 1 | POST | /ai/attrition-risk | hr-ai.controller.ts:60 | Employee attrition risk scoring | fast | 512 | HR | ✓ |
| 2 | POST | /ai/generate-review | hr-ai.controller.ts:72 | Performance review draft | fast | 1536 | HR | ✓ |
| 3 | POST | /ai/generate-jd | hr-ai.controller.ts:84 | Job description text generation | fast | 1024 | HR | ✓ |
| 4 | POST | /ai/score-candidate | hr-ai.controller.ts:93 | Candidate fit scoring 0-100 | fast | 512 | HR/ATS | ✓ |
| 5 | POST | /ai/helpdesk-reply | hr-ai.controller.ts:110 | Helpdesk ticket reply suggestion | fast | 768 | HR | ✓ |
| 6 | GET  | /ai/hr/policy-qa/capabilities | hr-ai.controller.ts:129 | Returns capability manifest (no LLM) | — | — | HR | |
| 7 | POST | /ai/hr/policy-qa | hr-ai.controller.ts:135 | Policy Q&A from active HR policies | fast | 1024 | HR | ✓ |
| 8 | POST | /ai/hr/interview-kit | hr-ai.controller.ts:146 | Interview question kit draft | fast | 2048 | HR/ATS | ✓ |
| 9 | POST | /ai/hr/letter-draft | hr-ai.controller.ts:158 | Employment letter draft | fast | 1024 | HR | ✓ |
| 10 | POST | /ai/hr/interview-notes-summary | hr-ai.controller.ts:175 | Interview round notes summary | fast | 1024 | HR/ATS | ✓ |
| 11 | POST | /ai/hr/accept-candidate-score | hr-ai.controller.ts:191 | Applies AI score to candidate (DB write, no LLM) | — | — | HR/ATS | ✓ |
| 12 | POST | /ai/score-lead | crm-ai.controller.ts:105 | Lead fit scoring 0-100 + auto-save | fast | 512 | CRM | |
| 13 | POST | /ai/predict-deal | crm-ai.controller.ts:124 | Deal win probability + auto-save | fast | 512 | CRM | |
| 14 | POST | /ai/churn-risk | crm-ai.controller.ts:138 | Client churn risk + auto-save health score | fast | 512 | CRM | |
| 15 | POST | /ai/next-action | crm-ai.controller.ts:155 | Next best sales action suggestion | fast | 512 | CRM | |
| 16 | POST | /ai/account-summary | crm-ai.controller.ts:168 | Account/client summary | fast | — | CRM | |
| 17 | POST | /ai/meeting-prep | crm-ai.controller.ts:179 | Meeting preparation brief | fast | — | CRM | |
| 18 | POST | /ai/nl-search | crm-ai.controller.ts:190 | NL-to-filter search | fast | — | CRM | |
| 19 | POST | /ai/enrich-lead | crm-ai.controller.ts:201 | Lead research brief (UNCHARGED) | standard | 1024 | CRM | |
| 20 | POST | /ai/generate-email | crm-ai.controller.ts:211 | Sales follow-up email draft (UNCHARGED) | fast | 1024 | CRM | |
| 21 | POST | /ai/objection-handler | crm-ai.controller.ts:220 | Objection counter-arguments (UNCHARGED) | fast | 1024 | CRM | |
| 22 | POST | /ai/sentiment-analysis | crm-ai.controller.ts:231 | Client sentiment analysis (UNCHARGED) | fast | 512 | CRM | |
| 23 | POST | /ai/summarize | crm-ai.controller.ts:242 | Conversation summary (UNCHARGED) | fast | 512 | CRM | |
| 24 | POST | /ai/report-narrator | crm-ai.controller.ts:250 | Report narrative (UNCHARGED) | fast | 1024 | CRM | |
| 25 | GET  | /ai/prioritize-tasks | crm-ai.controller.ts:262 | Task prioritization | fast | — | CRM | |
| 26 | GET  | /ai/suggestions | crm-ai.controller.ts:269 | Task/workload suggestions | fast | — | CRM | |
| 27–44 | POST | /ai/projects/:id/* and /ai/tickets/:pid/:tid/* | projects-ai.controller.ts:49–274 | 18 project+ticket AI actions (summary, risks, plan, extract, ask, weekly-update, change-impact, handoff, drafts, describe, subtasks, checklist, comments, title) | fast | 512–2048 | Build | |
| 45 | POST | /public/kb/ask | kb-rag.controller.ts:14 | Public KB RAG answer (UNAUTHENTICATED) | fast | 1024 | KB | |
| 46 | POST | /ai/blog/posts/:id/improve-writing | blog-ai.controller.ts:46 | Blog writing improvement (phantom orgId) | standard | 1024 | Blog | |
| 47 | POST | /ai/blog/posts/:id/suggest-title | blog-ai.controller.ts:56 | Blog title suggestion (phantom orgId) | fast | 128 | Blog | |
| 48 | POST | /ai/blog/posts/:id/summarize | blog-ai.controller.ts:67 | Blog excerpt summary (phantom orgId) | fast | 200 | Blog | |
| 49 | POST | /ai/surveys/:id/summarize-responses | survey-ai.controller.ts:37 | Survey open-response summarization | standard | 768 | Survey | |
| 50 | POST | /ai/meetings/prep | meetings-ai.controller.ts:51 | Meeting agenda draft | fast/standard | — | Calendar | |
| 51 | POST | /ai/meetings/follow-up | meetings-ai.controller.ts:64 | Follow-up email draft | fast/standard | — | Calendar | |
| 52 | POST | /ai/meetings/follow-up/propose-send | meetings-ai.controller.ts:80 | Propose send (confirmation token, no LLM) | — | — | Calendar | |
| 53 | POST | /ai/meetings/follow-up/confirm-send | meetings-ai.controller.ts:95 | Execute confirmed send (no LLM) | — | — | Calendar | |
| 54 | GET  | /ai/executive-brief | executive-brief.controller.ts:16 | Get cached brief snapshot (no LLM) | — | — | Cross-module | |
| 55 | POST | /ai/executive-brief/generate | executive-brief.controller.ts:22 | Generate executive brief | standard | 1024 | Cross-module | |
| 56 | POST | /chat | chat-assistant.controller.ts:198 | Streaming multi-tool chat assistant | Gemini 1.5 Pro / GPT-4o | unlimited (stopWhen 10 steps) | Cross-module | ✓ (hr tools) |
| +12 | POST/GET | /ai/crm/* (CrmCopilotController) | crm-copilot.controller.ts:85–202 | Lead summary, deal summary, next-best-actions, email-draft, summarize-notes, objection-help, duplicates, meeting-follow-up, stale-pipeline, data-quality, *-with-citations | fast/standard | varies | CRM | |

---

## 2. Gateway Abstraction

**File:** `modules/ai/core/gateway/ai-gateway.service.ts`

**Public methods and purpose:**

| Method | Returns aiUsage meta? | Dedupes? | Purpose |
|--------|----------------------|----------|---------|
| `invokeStructured<T>(opts)` | No | Optional (dedupe flag) | Structured JSON output, no usage summary to caller |
| `invokeStructuredWithUsage<T>(opts)` | Yes | No | Structured JSON + aiUsage for UI display |
| `invokeStructuredWithImage<T>(opts)` | No | No | Structured JSON + image input |
| `invokeStructuredWithImageWithUsage<T>(opts)` | Yes | No | Structured JSON + image + aiUsage |
| `invokeText(opts)` | No | Optional | Free-text output |
| `invokeTextWithUsage(opts)` | Yes | No | Free-text + aiUsage for UI display |

**Plain vs WithUsage distinction:** Both variants reserve credits, call the LLM, settle credits, and log to `ai_usage_logs` + audit log (`settleAndTrack`, lines 350–409). The ONLY difference is whether `aiUsage` meta (model, tokens, credits, costUsd) is returned to the caller for display via `AiUsageChip`. Internally, usage is always tracked.

**Features using the non-WithUsage (no aiUsage returned to client) variants — full list:**

All features except `ExecutiveBriefService.generate` return no `aiUsage` to clients:

| Feature / Service | Gateway call | File:line |
|-------------------|-------------|-----------|
| HR attrition-risk | invokeStructured | hr-ai.service.ts:176 |
| HR generate-review | invokeStructured | hr-ai.service.ts:274 |
| HR helpdesk-reply | invokeStructured | hr-ai.service.ts:326 |
| HR score-candidate | invokeStructured | hr-ai.service.ts:387 |
| HR policy-qa | invokeStructured | hr-ai.service.ts:461 |
| HR interview-kit | invokeStructured | hr-ai.service.ts:542 |
| HR letter-draft | invokeStructured | hr-ai.service.ts:601 |
| HR interview-notes-summary | invokeStructured | hr-ai.service.ts:681 |
| HR generate-jd | invokeText | hr-ai.service.ts:723 |
| Blog improve-writing | invokeText | blog-ai.service.ts:44 |
| Blog suggest-title | invokeText | blog-ai.service.ts:67 |
| Blog summarize | invokeText | blog-ai.service.ts:80 |
| Survey summarize-responses | invokeText | survey-ai.service.ts:76 |
| KB public-ask | invokeText | kb-rag.service.ts:188 |
| CRM enrich-lead | invokeStructured | crm-content.service.ts:56 |
| CRM generate-email | invokeStructured | crm-content.service.ts:82 |
| CRM objection-handler | invokeStructured | crm-content.service.ts:136 |
| CRM sentiment-analysis | invokeStructured | crm-content.service.ts:163 |
| CRM summarize | invokeStructured | crm-content.service.ts:182 |
| CRM report-narrator | invokeText | crm-content.service.ts:198 |
| CRM score-lead | invokeStructured | crm-scoring.service.ts:102 |
| CRM predict-deal | invokeStructured | crm-scoring.service.ts:196 |
| CRM churn-risk | invokeStructured | crm-scoring.service.ts:261 |
| CRM next-action | invokeStructured | crm-scoring.service.ts:343 |
| All Projects/Ticket AI | invokeStructured | projects-ai.service.ts, ticket-ai.service.ts |
| HrCopilotTools askHrPolicy | invokeText | hr-copilot-tools.ts:61 |
| HrCopilotTools draftPerformanceReviewNote | invokeText | hr-copilot-tools.ts:201 |
| HrCopilotTools draftPromotionLetter | invokeText | hr-copilot-tools.ts:274 |

**Only `ExecutiveBriefService.generate`** uses `invokeTextWithUsage` (`executive-brief.service.ts:126`) and the chat assistant uses the AI SDK directly (not the gateway).

---

## 3. Credit Integration

**Mechanism (gateway):** Reserve estimate → LLM call → settle actual milli-credits. Atomic: reserve throws `BadRequestException("Insufficient AI credits")` before the provider call. Refunds via `ledger.release(reservationId, reason)` on provider error or invalid output.

| Feature | charge flag | Notes |
|---------|------------|-------|
| All HR AI features (1–10) | `charge: true` | ✓ Correct |
| HR generate-jd | `charge: true` BUT `orgId: "system"` | Credits charged to phantom org "system" — hr-ai.service.ts:700 |
| Blog improve-writing/suggest-title/summarize | `charge: true` BUT `orgId: ""` | Credits charged to phantom org "" — blog-ai.service.ts:44,67,80 |
| Survey summarize | `charge: true` | ✓ Correct |
| KB public-ask | `charge: true`, `userId: null` | Charges to the queried org, no user attribution — kb-rag.service.ts:188 |
| ExecutiveBrief generate | `charge: true` | ✓ Correct |
| CRM score-lead, predict-deal, churn-risk, next-action | `charge: true` | ✓ Correct |
| CRM enrich-lead | `charge: undefined` (actorCharge(undefined)) | Tokens burn, 0 credits charged — crm-content.service.ts:56 |
| CRM generate-email | `charge: undefined` | Same — crm-content.service.ts:82 |
| CRM objection-handler | `charge: undefined` | Same — crm-content.service.ts:136 |
| CRM sentiment-analysis | `charge: undefined` | Same — crm-content.service.ts:163 |
| CRM summarize | `charge: undefined` | Same — crm-content.service.ts:182 |
| CRM report-narrator | `charge: undefined` | Same — crm-content.service.ts:198 |
| Chat assistant | Direct ledger.reserve() before stream | ✓ Correct: reserve at chat-assistant.service.ts:303, settle in onFinish:433 |

**Anonymous/unauthenticated provider call risk:** `POST /public/kb/ask` (`kb-rag.controller.ts:14`) is `@Public()`. The KB RAG service checks for published public articles before calling the LLM (`hasPublishedPublicArticles`, line 128). If articles exist, any caller can trigger an LLM call that charges the org's credits. Only `@UseRateLimit("ai:public-kb-ask")` stands between an attacker and credit exhaustion.

---

## 4. PII / Comp Redaction (MOST IMPORTANT)

### Redaction utility
`modules/ai/core/redaction.util.ts` — deterministic regex, applied by gateway when `redact: true` (default for all calls):
- Email: `[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}` → `[REDACTED_EMAIL]`
- SSN: `\d{3}-\d{2}-\d{4}` → `[REDACTED_SSN]`
- Credit card: 13-19 consecutive digits → `[REDACTED_CARD]`
- Phone (US-format): `(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}` → `[REDACTED_PHONE]`
- Bearer token / API key: → `[REDACTED_TOKEN]`
- NOT covered: Aadhaar (12-digit), PAN (`[A-Z]{5}\d{4}[A-Z]`), IFSC, bank account numbers, Indian phone numbers (10-digit bare, e.g. `9876543210`)

### Per-feature prompt PII trace

**HR Attrition Risk** (`hr-ai.service.ts:160–174`, prompt: `hr.prompts.ts:158–193`)
- Data sent: employee name, role, tenure months, attendance rate %, leave days count, open ticket count, last review rating, has-goals boolean
- No salary, PAN, Aadhaar, bank data
- `redact: true` at gateway covers any email in free-text
- PII level: LOW (name + aggregate behavioral metrics)

**HR Generate Review** (`hr-ai.service.ts:258–272`, prompt: `hr.prompts.ts:62–106`)
- Data sent: employee name, role, period dates, goal titles with completion status, attendance rate %
- No salary, PAN, Aadhaar, bank data
- PII level: LOW

**HR Score Candidate** (`hr-ai.service.ts:372–385`, prompt: `hr.prompts.ts:16–46`)
- Data sent: firstName, lastName, **email** (redacted by gateway regex ✓), currentCompany, currentRole, experienceYears, skills[], source, notes (free text — gateway redacts)
- email → `[REDACTED_EMAIL]` before LLM ✓
- notes may contain sensitive text but is redacted at gateway
- PII level: MEDIUM (candidate PII, email redacted; notes not pre-screened at service level)

**HR Helpdesk Reply** (`hr-ai.service.ts:317–323`, prompt: `hr.prompts.ts:117–143`)
- Data sent: ticket title, description (free text), category, priority, employeeName
- No redaction at service level for description; gateway `redact: true` covers email/SSN/card/US-phone in description
- PII level: MEDIUM (ticket description may contain personal complaints, health info — no service-level redaction)

**HR Policy Q&A** (`hr-ai.service.ts:440–459`, prompt: `hr.prompts.ts:200–210`)
- User question: `redactSensitiveData(question)` applied at service level (`hr-ai.service.ts:440`) before passing to prompt → DOUBLE redaction (service + gateway) ✓
- Policy data sent: policy type, scope type, name (metadata only, no content)
- PII level: LOW

**HR Interview Kit** (`hr-ai.service.ts:535–548`, prompt: `hr.prompts.ts:219–228`)
- Data sent: jobTitle, jobDescription (sliced to 1000 chars), requirements (sliced to 500 chars), round types
- No individual PII
- PII level: NONE

**HR Letter Draft** (`hr-ai.service.ts:592–596`, prompt: `hr.prompts.ts:237–247`)
- `details` parameter: `redactSensitiveData(details)` applied at service level ✓
- Data sent: letterType, employeeName, currentTitle, safeDetails
- PII level: LOW (name + title; details redacted)

**HR Interview Notes Summary** (`hr-ai.service.ts:666–668`, prompt: `hr.prompts.ts:255–266`)
- Per-round: feedback and notes each passed through `redactSensitiveData()` at service level before going to prompt ✓
- Data: candidateName, jobTitle, round type, rating, result, redacted feedback/notes
- PII level: MEDIUM (candidate name; notes redacted at service level)

**HR Generate JD** (`hr-ai.service.ts:700–733`)
- Data: jobTitle, location, employment type, **salary range `₹X–₹Y`** (role-level range, not individual salary)
- Salary range is role-level business data (typical for JD generation), not individual compensation
- `actor: { orgId: "system", userId: null }` — phantom org, credits uncharged effectively
- PII level: LOW (no individual PII; salary is range not personal)

**Chat Context Prompt** (`chat-assistant.service.ts:97–153`, prompt builder: lines 178–289`)
- Fetches `payrollRunEmployees.net` (individual net salary) into `recentPayrolls[].netSalary` (line 128)
- BUT prompt only emits `${p.month} (${p.status})` — net salary is NOT included in the system prompt (line 189) ✓
- Context includes: project count, ticket count, attendance check-in status, pending leaves count, lead names + status + priority
- PII level: LOW (aggregate counts and own attendance/leave data; salary fetched but not sent)

**Chat HrCopilot draftPerformanceReviewNote** (`hr-copilot-tools.ts:168–243`)
- Data sent to LLM: employee name (resolved from hr_employments), reviewPeriod, keyAchievements (user-supplied text), areasForImprovement (user-supplied text), overallRating
- `keyAchievements` and `areasForImprovement` are user-supplied and pass through gateway `redact: true`
- No salary/PAN/Aadhaar
- PII level: LOW-MEDIUM (name + manager notes about individual)

**Chat HrCopilot draftPromotionLetter** (`hr-copilot-tools.ts:246–321`)
- Data: employee name, currentTitle, newTitle, newGrade, effectiveDate, additionalContext (user-supplied)
- No salary numbers in prompt
- PII level: LOW

**CRM Lead Scoring** (`crm-scoring.service.ts:84–99`, prompt: `crm.prompts.ts:40–55`)
- **Email** in prompt → gateway `redact: true` catches email addresses ✓
- **Phone** in prompt → gateway `redact: true` applies US-format phone regex
- **CRITICAL GAP:** Indian mobile numbers (10-digit bare format, e.g. `9876543210`) do NOT match regex `(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}` — they flow to the LLM unredacted (`redaction.util.ts:11`)
- Also includes: company, designation, city, potentialValue (₹), investmentInterest (₹), notes, tags
- PII level: HIGH for phone (Indian numbers unredacted)

**CRM Lead Enrichment** (`crm-content.service.ts:53–67`, prompt: `crm.prompts.ts:252–274`)
- Includes email in prompt → gateway redacts emails ✓
- `actor: { orgId: "", userId: null }` and `charge: undefined` — UNCHARGED
- PII level: MEDIUM (email redacted, name/company in prompt)

### Redaction helpers / org-opt-in gates
- `redactSensitiveData()` at `redaction.util.ts` — always on by default (`redact: true`)
- Per-service pre-redaction: `hr-ai.service.ts:440` (policy question), `hr-ai.service.ts:592` (letter details), `hr-ai.service.ts:667-668` (interview notes)
- `sanitizePolicyCitations()` at `hr-ai-guardrails.ts:41` — anti-hallucination citation filter
- **No org opt-in gate for AI features** — all active orgs can use AI if plan permits; no per-org data-sharing consent mechanism
- **No Aadhaar/PAN/IFSC/bank-account regex** in redaction util (`redaction.util.ts:1–24`)

---

## 5. Logging

**`ai_usage_logs` table** (`ai-usage.service.ts:36–53`): orgId, userId, feature, model, promptTokens, completionTokens, totalTokens, estimatedCostUsd, creditsMilli, metadata, latencyMs, correlationId, outcome.
- **No prompt or completion content persisted** ✓

**Audit log** (`audit.service`, called at gateway `ai-gateway.service.ts:392–408`): action="ai.invoke", userId, orgId, feature, model, promptKey, promptVersion, correlationId, latencyMs, tokens, outcome.
- **No prompt or completion content in audit log** ✓

**Chat history** (`chat-history.service.ts`): Stores user and assistant message text verbatim in `ai_chat_history`/`ai_conversations` tables. This IS content — the user's chat messages and model replies are persisted. This is intentional for conversation continuity but means conversation content is stored in Postgres.

---

## 6. Grounding / RAG

**Embedding model:** OpenAI `text-embedding-3-small` (1536 dimensions) — `embeddings.service.ts:4`
**Provider:** OpenAI Embeddings API (LangChain `@langchain/openai`)
**Index type:** pgvector cosine distance (`<=>`) — kb-rag.service.ts:73 uses `kbArticleChunks.embedding <=> ${vector}::vector`. HNSW index confirmed from prior schema audit.
**Tenant scoping:** `eq(kbArticleChunks.orgId, orgId)` — line 73. Public endpoint additionally filters `eq(kbArticles.visibility, "public")` + space audience. ✓
**Content-hash guard:** ABSENT. No mechanism to skip re-embedding unchanged content. Every indexing operation embeds content regardless of whether it changed.
**Short-circuit before provider call:** `hasPublishedPublicArticles()` check at `kb-rag.service.ts:128` prevents LLM call when no public articles exist. ✓

---

## 7. Human-in-the-Loop

### HR features (employment/hiring/termination decisions)

| Feature | Auto-applies? | Advisory label? | Human decision recorded? |
|---------|-------------|----------------|------------------------|
| Attrition risk | No — returns score + factors only | ✓ `advisory: true` + disclaimer | N/A (analysis only) |
| Generate review | No — draft only | ✓ "Draft only — requires human review" | No explicit record |
| Score candidate | No — draft score | ✓ "AI estimate only. Human decision required." | Yes — separate `/accept-candidate-score` endpoint writes score only when explicitly called |
| Accept candidate score | User must call endpoint | N/A | ✓ DB write only on explicit call |
| Policy Q&A | No | ✓ `advisory: true`, `forbiddenActions` list | N/A |
| Interview kit | No — draft only | ✓ "Draft only. Review and customize before use." | No |
| Letter draft | No — draft only | ✓ "DRAFT — AI-generated. Requires human review, editing, and authorized signature" | No |
| Interview notes summary | No | ✓ "AI-generated summary. Verify against original notes" | No |
| HrCopilot draftPerformanceReviewNote | No — draft only | ✓ "DRAFT — Requires human review and approval" | No |
| HrCopilot draftPromotionLetter | No — draft only | ✓ "DRAFT — Must be reviewed and approved by HR leadership" | No |
| Chat `hr.grantBonus` | Requires explicit confirmation | ✓ "PENDING payroll approval" | ✓ Bonus created as PENDING status |

### CRM features (sales/client decisions)

| Feature | Auto-applies? | Advisory label? |
|---------|-------------|----------------|
| score-lead | **YES** — auto-writes `leads.score` | None on DB write |
| predict-deal | **YES** — auto-writes `deals.probability` | None on DB write |
| churn-risk | **YES** — auto-writes `clients.healthScore`, `healthStatus`, `churnRiskScore`, `churnRiskReasoning` | None on DB write |
| next-action | No | None |
| All CrmCopilot features | No | Varies |

**CRM auto-apply risk:** `crm-scoring.service.ts:116–120` (scoreLead), `crm-scoring.service.ts:209–213` (predictDeal), `crm-scoring.service.ts:279–290` (churnRisk) — these silently mutate production DB records without user confirmation. If AI model produces a bad score (e.g., on malformed data), it overwrites the human-set value automatically.

### FORBIDDEN_HR_AI_ACTIONS list
`hr-ai-guardrails.ts:17–27` explicitly lists: `approve_run, lock_run, mark_paid, generate_payout_batch, submit_statutory_filing, recalculate_payroll, change_salary, override_exception, invent_policy_rule`. These are returned to the client as a capability manifest so the UI can enforce them.

---

## 8. Authorization

| Method | Path | Controller file:line | @RequirePermission | Guards | Rate limit? | Tenant scoped? |
|--------|------|----------------------|--------------------|--------|-------------|----------------|
| POST | /ai/attrition-risk | hr-ai.controller.ts:60 | hr:employees:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/generate-review | hr-ai.controller.ts:72 | hr:performance:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/generate-jd | hr-ai.controller.ts:84 | hr:interviews:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId (but service uses "system") |
| POST | /ai/score-candidate | hr-ai.controller.ts:93 | hr:interviews:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/helpdesk-reply | hr-ai.controller.ts:110 | hr:helpdesk:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/hr/policy-qa | hr-ai.controller.ts:135 | hr:policies:view | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/hr/interview-kit | hr-ai.controller.ts:146 | hr:interviews:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/hr/letter-draft | hr-ai.controller.ts:158 | hr:employees:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/hr/interview-notes-summary | hr-ai.controller.ts:175 | hr:interviews:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/hr/accept-candidate-score | hr-ai.controller.ts:191 | hr:interviews:manage | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/score-lead (and other crm-ai) | crm-ai.controller.ts:68 | crm:ai:use (class-level) | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/projects/:id/* and /ai/tickets/* | projects-ai.controller.ts:49 | build:ai:use (class-level) | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /public/kb/ask | kb-rag.controller.ts:14 | **NONE** (@Public) | RateLimitGuard only | ai:public-kb-ask | Caller-supplied orgId (no auth check) |
| POST | /ai/blog/* | blog-ai.controller.ts:35 | blog:ai:use (per-method) | JWT+Permission+RateLimit | ai:invoke | orgId="" (NOT org-scoped!) |
| POST | /ai/surveys/:id/summarize-responses | survey-ai.controller.ts:37 | surveys:ai:use | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/meetings/* | meetings-ai.controller.ts:35 | calendar:ai:use (class-level) | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /ai/executive-brief/generate | executive-brief.controller.ts:22 | ai:executive-brief:generate | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |
| POST | /chat | chat-assistant.controller.ts:198 | ai:chat:use | JWT+Permission+RateLimitGuard | ai:chat | ✓ orgId |
| POST | /ai/crm/* | crm-copilot.controller.ts:68 | crm:ai:use (class-level) | JWT+Permission+RateLimit | ai:invoke | ✓ orgId |

**Ungated endpoint:** `POST /public/kb/ask` — `@Public()` with no `@RequirePermission`. Only rate limit. Any internet user can call with any orgId.

**Missing `requireFeature()` gate:** `CrmCopilotController` (`crm-copilot.controller.ts`) endpoints have no `requireFeature(u.plan, ...)` call. All plans can access these CRM copilot features regardless of subscription tier.

---

## 9. Efficiency

**HR AI Service — prompt context assembly:**
- `analyzeAttritionRisk`: 5 parallel queries (`Promise.all` — lines 97–154) ✓
- `generateReview`: 2 parallel queries (`Promise.all` — lines 218–249) ✓
- `suggestHelpdeskReply`: 1 query, single join ✓
- `scoreCandidate`: 2 sequential queries (candidate then job) — could be `Promise.all` ✗ (minor)
- `draftLetter`: 1 raw SQL + 1 fallback query — sequential ✓ (conditional)
- `summarizeInterviewNotes`: 2 queries (candidate + interviews) + 1 optional (job title) — sequential ✗ (could be parallel)

**Text caps:**
- HR notes: `redactSensitiveData(feedback/notes)` — no char cap before LLM
- CRM notes: `trunc(notes, 2000)` at `crm-scoring.service.ts:38` ✓
- CRM email: `trunc(lastActivityNotes)` at `crm-content.service.ts:107` ✓
- Blog content: `.slice(0, 3000)` at `blog-ai.service.ts:38` ✓
- KB context: `r.content` passed in full per chunk — chunks are sized at embedding time (no per-invoke cap)
- CRM brief/account: depends on `crm-brief.service.ts` (not fully read)

**Whole-entity dump risk:**
- `HrAiService.policyQa` executes `SELECT id, policy_type, scope_type, name FROM hr_policies WHERE org_id = ${orgId} ... LIMIT 20` — only metadata sent (no content column) ✓
- `ExecutiveBriefService.generate` dumps `JSON.stringify(sources.crm)` directly (`executive-brief.service.ts:199`) — full CRM dashboard data object serialized without projection or cap ✗

**Deduplication:**
- `invokeStructured` with `dedupe: true` → SHA-256 hash of prompt content in `inflightMap` (`ai-gateway.service.ts:46–58`)
- Only `CrmContentService.summarize` uses `dedupe: true` (`crm-content.service.ts:190`)
- Chat assistant has no deduplication (streaming)

---

## 10. Top 12 Findings

| SEV | File:line | Finding |
|-----|-----------|---------|
| P0 | kb-rag.controller.ts:14 | `@Public()` endpoint with `charge: true` — any unauthenticated caller can burn org AI credits using only an orgId. Rate limit is the sole barrier |
| P1 | crm.prompts.ts:40-55 + redaction.util.ts:11 | Indian phone numbers (10-digit bare, e.g. 9876543210) sent to LLM unredacted. US-centric regex `\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}` does not match Indian mobile format |
| P1 | crm-content.service.ts:41-44 | `actorCharge(undefined)` for 6 CRM content endpoints (enrich-lead, generate-email, objection-handler, sentiment-analysis, summarize, report-narrator) — tokens burn without billing; revenue leak |
| P1 | blog-ai.service.ts:44,67,80 | Blog AI service passes `actor: { orgId: "", userId }` with `charge: true` — credits charged to phantom orgId=""; likely fails at runtime or succeeds silently unmetered |
| P1 | hr-ai.service.ts:700 | `HrAiService.generateJd` uses `orgId: "system"` for actor — phantom org; generate-jd credit billing is broken |
| P2 | crm-scoring.service.ts:116-120,209-213,279-290 | score-lead, predict-deal, and churn-risk auto-write AI scores to production DB on every invocation with no user acceptance step. A bad AI score silently overwrites a human-set value |
| P2 | redaction.util.ts:1-24 | No regex patterns for Aadhaar (12-digit), PAN (`[A-Z]{5}\d{4}[A-Z]`), IFSC, or bank account numbers. Any of these appearing in free-text fields (helpdesk tickets, interview notes, letter details) reach the LLM |
| P2 | executive-brief.service.ts:199 | `JSON.stringify(sources.crm)` dumps entire CRM dashboard object into the prompt without field projection or character cap — could be large |
| P3 | All services except executive-brief | No `aiUsage` meta returned to clients — `AiUsageChip` component cannot display token/credit usage for 50+ AI features; users have no visibility into credit consumption per action |
| P3 | crm-copilot.controller.ts:85-202 | 12 CRM copilot endpoints have no `requireFeature(u.plan, ...)` plan gate — any plan tier can access premium CRM copilot features |
| P3 | kb-rag.service.ts (kb-rag controller) | No content-hash guard before re-embedding KB articles — unchanged content is re-embedded on every indexing call, wasting OpenAI embedding budget |
| P3 | hr-ai.service.ts:387 | `scoreCandidate` passes `actor: { orgId, userId: null }` to gateway — no user attribution in usage logs; audit trail broken for candidate scoring |

---

## Coverage Gaps

- `modules/ai/core/services/crm-brief.service.ts` — not fully read; CRM brief/account-summary prompt content and charge behavior unverified
- `modules/ai/core/services/meetings-prep.service.ts` — follow-up draft prompt content not read
- `modules/ai/core/services/ticket-ai.service.ts` — ticket AI prompt content not verified (no payroll PII expected)
- `modules/ai/core/services/crm-copilot.service.ts` — copilot prompt content not fully verified
- `modules/ai/core/workspace-copilot-tools.ts`, `ops-copilot-tools.ts`, `crm-copilot-tools.ts` — chat tool prompt content not read; may expose additional data to model
- `modules/ai/confirmation/ai-confirmation.service.ts` — confirmation token mechanism not audited for replay/TOCTOU
- `modules/ai/core/providers/llm.service.ts` — LLM provider config and model routing not read
- `modules/ai/jobs/` — async job handlers not audited
- `frontend/components/ai/` — only 3 files (use-ai-inline-action.ts, use-ai-popover-action.ts, index.ts); no HR-specific frontend AI surfaces found; `AiActionsMenu` and `AiUsageChip` references confirm the UI pattern exists
