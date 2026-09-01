# DATA-CATALOGUE.md — Personal Data Inventory

**Status: AWAITING OPERATOR APPROVAL.**
**Derived from: `backend/src/db/schema/**`, `pg_catalog` probe 2026-09-01, `backend/.env.example`.**
**Maintained by: Lane 9 (architecture-refactor programme, 2026-09-01).**

Each entry maps a personal-data class to purpose, lawful basis, retention period and owner.
Where a retention period is genuinely undecided the cell reads `DECISION REQUIRED` with a recommended default.
No policy is presented as approved without a signed decision record in `architecture-refactor/decisions/`.

---

## 1. Identity and Authentication

| Column / Table | Data class | Purpose | Lawful basis (GDPR Art. 6) | Retention | Owner |
|---|---|---|---|---|---|
| `users.email` | Contact identifier | Platform login, notification delivery | Art. 6(1)(b) — contract | Life of account + 30 days post-deletion | Platform team |
| `users.name` | Personal name | Display, audit attribution | Art. 6(1)(b) — contract | Life of account + 30 days | Platform team |
| `accounts.password` (Argon2id hash) | Credential | Authentication | Art. 6(1)(b) — contract | Overwritten on change; deleted on erasure | Platform team |
| `accounts.provider_account_id` | OAuth identifier | SSO login | Art. 6(1)(b) — contract | Deleted on erasure | Platform team |
| `user_sessions.session_token` | Session credential | Maintain authenticated state | Art. 6(1)(b) — contract | Expires per TTL (24h); deleted on logout | Platform team |
| `audit_logs.metadata.email` | Contact identifier | Audit traceability for `user.registered` event | Art. 6(1)(f) — legitimate interest (fraud/access) | DECISION REQUIRED — recommended 3 years | Compliance officer |

---

## 2. Employment

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `hr_people.date_of_birth` | Date of birth | Age verification, statutory reporting | Art. 6(1)(c) + Art. 9(2)(b) — legal obligation + employment | 7 years post-employment | HR Manager |
| `hr_people.gender` | Gender | Statutory reporting, diversity | Art. 6(1)(c) + Art. 9(2)(b) | 7 years post-employment | HR Manager |
| `hr_people.national_id_number` | National identifier | Tax, statutory compliance | Art. 6(1)(c) | 7 years post-employment | HR Manager |
| `hr_people.phone`, `mobile_phone` | Contact | HR communication | Art. 6(1)(b) | 7 years post-employment | HR Manager |
| `hr_people.current_address` | Address | Statutory filing, emergency | Art. 6(1)(b) + Art. 6(1)(c) | 7 years post-employment | HR Manager |
| `hr_employments.*` | Employment record | Payroll, statutory reporting, HR operations | Art. 6(1)(b) + Art. 6(1)(c) | 7 years post-employment | HR Manager |
| `employee_salary_profiles.basic_salary` | Financial — compensation | Payroll calculation | Art. 6(1)(b) + Art. 6(1)(c) | 7 years post-employment | Finance / HR |

---

## 2A. Sensitive Employment and Workplace Records

| Column / Table | Data class | Purpose | Lawful basis (GDPR Art. 6) | Special-category basis (Art. 9) | Retention | Owner |
|---|---|---|---|---|---|---|
| `biometric_logs.*` | Biometric identifier and attendance evidence | Identity or attendance control where enabled | DECISION REQUIRED - recommended Art. 6(1)(b) or Art. 6(1)(c), depending on use | DECISION REQUIRED - select Art. 9(2)(b) or another documented exception before collection | DECISION REQUIRED - recommended deletion when the control purpose ends | HR / Security |
| `hr_wellness_checkins.*` | Health and wellness information | Workplace wellbeing administration | DECISION REQUIRED - recommended Art. 6(1)(b) or Art. 6(1)(f) | DECISION REQUIRED - document Art. 9(2)(b), (h), or explicit consent as applicable | DECISION REQUIRED - recommended 1 year after employment unless a legal hold applies | HR / Occupational health |
| `hr_accommodation_requests.*` | Disability or accommodation information | Reasonable workplace accommodation | Art. 6(1)(c) + Art. 6(1)(b) | DECISION REQUIRED - recommended Art. 9(2)(b) with need-to-know access | DECISION REQUIRED - recommended 7 years post-employment only where legally required; otherwise accommodation end + 1 year | HR |
| `hr_safety_incidents.*` | Health and safety record | Workplace safety and incident response | Art. 6(1)(c) + Art. 6(1)(f) | DECISION REQUIRED - confirm the applicable Art. 9 condition | DECISION REQUIRED - recommended 7 years after incident closure | HR / Safety |
| `hr_work_authorizations.*` | Immigration and work-authorization record | Right-to-work and statutory compliance | Art. 6(1)(c) | DECISION REQUIRED - confirm legal classification | DECISION REQUIRED - recommended 7 years post-employment | HR / Legal |

## 2B. AI Processing

| Column / Table | Data class | Purpose | Lawful basis (GDPR Art. 6) | Special-category basis (Art. 9) | Retention | Owner |
|---|---|---|---|---|---|---|
| `ai_chat_conversations.*`, `ai_chat_messages.*` | AI prompts, responses and conversation metadata | Assistive HR and platform workflows | DECISION REQUIRED - recommended Art. 6(1)(b) or Art. 6(1)(f) | DECISION REQUIRED - prohibit special-category input unless an approved condition exists | DECISION REQUIRED - recommended 90 days after conversation closure | AI / Privacy |
| `ai_feedback.*` | Feedback and ratings linked to an AI interaction | Quality, safety and evaluation | Art. 6(1)(f) | DECISION REQUIRED if special-category data is retained | DECISION REQUIRED - recommended 1 year | AI / Privacy |
| `ai_jobs.*` | AI job requests, status and result references | Run and audit asynchronous AI work | Art. 6(1)(b) + Art. 6(1)(f) | Inherits from referenced input; no special-category processing without approval | DECISION REQUIRED - recommended 90 days after completion | AI / Platform |
| `ai_usage_logs.*` | Usage, token and cost metadata | Billing, capacity and abuse monitoring | Art. 6(1)(f) | Review prompt-derived fields before approval | DECISION REQUIRED - recommended 2 years | AI / Finance |

## 2C. Knowledge Base and Support

| Column / Table | Data class | Purpose | Lawful basis (GDPR Art. 6) | Special-category basis (Art. 9) | Retention | Owner |
|---|---|---|---|---|---|---|
| `kb_chat_conversations.*`, `kb_chat_messages.*` | Knowledge-base chat content and participant identifiers | Answer questions and improve retrieval | Art. 6(1)(b) + Art. 6(1)(f) | DECISION REQUIRED - define handling of sensitive content | DECISION REQUIRED - recommended active account + 1 year | Knowledge / Privacy |
| `kb_pages.*`, `kb_page_versions.*` | Authored knowledge content and revision history | Knowledge management and accountability | Art. 6(1)(b) + Art. 6(1)(f) | Review authored content for special-category data | DECISION REQUIRED - recommended published page life + 1 year; versions 2 years | Knowledge owner |
| `kb_article_chunks.*` | Search-indexed article text and embeddings | Retrieval and semantic search | Art. 6(1)(b) + Art. 6(1)(f) | Inherits from source article | Same as source page; DECISION REQUIRED where source policy is undecided | Knowledge / Platform |
| `support_tickets.*`, `support_ticket_messages.*`, `support_ticket_attachments.*`, `support_csat_requests.*` | Support requests, correspondence, files and satisfaction data | Customer support and service improvement | Art. 6(1)(b) + Art. 6(1)(f) | DECISION REQUIRED - define permitted sensitive content and escalation handling | DECISION REQUIRED - recommended ticket closure + 2 years | Support / Privacy |

## 2D. Signatures and Notifications

| Column / Table | Data class | Purpose | Lawful basis (GDPR Art. 6) | Special-category basis (Art. 9) | Retention | Owner |
|---|---|---|---|---|---|---|
| `sign_documents.*`, `sign_audit_events.*` | Signature identity, intent, timestamps and audit events | Execute and prove document signing | Art. 6(1)(b) + Art. 6(1)(c) | Inherits from signed document; DECISION REQUIRED for sensitive documents | DECISION REQUIRED - recommended 7 years after document expiry or statutory period | Legal / HR |
| `notification_preferences.*`, `notification_consents.*` | Delivery preferences and consent records | Respect communication choices | Art. 6(1)(a) or Art. 6(1)(f), according to channel | Not generally applicable | DECISION REQUIRED - retain consent evidence for processing period + 3 years | Privacy / Platform |
| `notification_deliveries.*`, `notification_outbox.*`, `notification_digest_runs.*` | Delivery address, status, message and retry metadata | Deliver and troubleshoot notifications | Art. 6(1)(b) + Art. 6(1)(f) | Inherits from message content | DECISION REQUIRED - recommended 90 days, except consent/audit evidence | Platform |

## 2E. Integrations, Webhooks and Organization Metadata

| Column / Table | Data class | Purpose | Lawful basis (GDPR Art. 6) | Special-category basis (Art. 9) | Retention | Owner |
|---|---|---|---|---|---|---|
| `user_integration_connections.*` | OAuth connection identifiers, scopes and provider metadata | Connect user-authorized services | Art. 6(1)(a) + Art. 6(1)(b) | Inherits from connected service data; DECISION REQUIRED for sensitive flows | Delete on disconnect; consent/audit evidence DECISION REQUIRED - recommended 3 years | Integrations / Privacy |
| `webhook_deliveries.*`, `webhook_logs.*` | Endpoint, delivery status, headers and payload content | Deliver and troubleshoot integration events | Art. 6(1)(b) + Art. 6(1)(f) | DECISION REQUIRED - prohibit unapproved sensitive payloads | DECISION REQUIRED - recommended 30 days for payloads and 1 year for delivery metadata | Integrations / Security |
| `organizations.*`, `organization_members.*` | Organization profile, roles and membership relationships | Tenant administration and access control | Art. 6(1)(b) + Art. 6(1)(f) | Membership may reveal sensitive affiliation; DECISION REQUIRED | DECISION REQUIRED - recommended life of organization/account + 7 years for required history | Platform / Legal |
| `calendar_events.*`, `event_attendees.*`, `project_meetings.*`, `meeting_attendees.*` | Event titles, times, attendees, notes and meeting metadata | Scheduling and collaboration | Art. 6(1)(b) + Art. 6(1)(f) | DECISION REQUIRED for sensitive notes or topics | DECISION REQUIRED - recommended event end + 1 year; recordings/notes need separate policy | Collaboration / HR |
| `projects.*`, `project_members.*` | Project assignments, roles, status and work metadata | Planning, delivery and resource management | Art. 6(1)(b) + Art. 6(1)(f) | Review free-text fields | DECISION REQUIRED - recommended project closure + 2 years | Operations |

## 3. Payroll and Banking

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `fin_bank_accounts.account_number_masked` | Bank account | Salary disbursement | Art. 6(1)(b) | 7 years post-employment | Finance |
| `fin_bank_accounts.ifsc` | Bank identifier | Salary disbursement | Art. 6(1)(b) | 7 years post-employment | Finance |
| `payroll_runs.*` | Payroll computation | Statutory payroll record | Art. 6(1)(c) — legal obligation | 7 years | Finance |
| `payslip_publications.*` | Payslip | Employee statutory record | Art. 6(1)(c) | 7 years | Finance |

---

## 4. Communication

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `chat_messages.content` | Message content | Internal team communication | Art. 6(1)(b) — contract | DECISION REQUIRED — recommended: active employment + 1 year | Platform team |
| `mail_message_metadata.subject` | Email metadata | Business communication | Art. 6(1)(b) | DECISION REQUIRED — recommended: active employment + 1 year | Platform team |
| `attendance-email-report.service.ts` queued reports | Recipient addresses and aggregate attendance data | Deliver authorized attendance reports to active organization members | Art. 6(1)(b) + Art. 6(1)(c) | DECISION REQUIRED — recommended: report delivery + 90 days | HR / Privacy |
| `notifications.title`, `body` | Notification content | Service notification | Art. 6(1)(b) | 90 days | Platform team |

---

## 5. Time and Attendance

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `attendance.*` | Attendance record | Payroll, statutory compliance | Art. 6(1)(b) + Art. 6(1)(c) | 7 years | HR / Finance |
| `timesheets.*` | Work hours | Payroll, project billing | Art. 6(1)(b) + Art. 6(1)(c) | 7 years | HR / Finance |
| `leave_requests.*` | Leave record | HR administration | Art. 6(1)(b) | 7 years post-employment | HR Manager |

---

## 6. Documents and Files

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `candidate_documents_vault.*` | Recruitment document (CV, ID) | Candidate evaluation | Art. 6(1)(a) — consent | 6 months post-rejection unless extended consent | Talent / HR |
| `documents.*` | Employment document | HR records | Art. 6(1)(b) + Art. 6(1)(c) | 7 years post-employment | HR Manager |
| Object-storage blobs (`R2_BUCKET_NAME`) | All of the above in binary form | Storage of documents listed above | Inherits from owning record | Same as owning record | Platform + owning team |

---

## 7. Recruitment

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `candidates.email`, `name`, `phone` | Candidate identity | Recruitment process | Art. 6(1)(a) — consent | 6 months post-rejection; longer with explicit consent | Talent team |
| `candidate_applications.*` | Application data | Recruitment process | Art. 6(1)(a) — consent | 6 months post-rejection | Talent team |
| `candidate_offers.*` | Employment terms | Pre-employment contract | Art. 6(1)(b) — pre-contractual | Life of employment + 7 years | HR Manager |

---

## 8. Financial Operations

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `expenses.*` | Expense claims | Reimbursement, accounting | Art. 6(1)(b) + Art. 6(1)(c) | 7 years | Finance |
| `invoices.*` (org customer-facing) | Customer data | Accounts receivable | Art. 6(1)(b) | 7 years | Finance |
| `salary_loans.*` | Loan record | Employee financial record | Art. 6(1)(b) | 7 years post-repayment | Finance |
| `platform_payments.customer_email` | Platform billing contact | Payment record | Art. 6(1)(b) | 7 years | Platform / Finance |

---

## 9. Audit Trail

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `audit_logs.*` | Action metadata (userId, orgId, action, ip) | Security audit, incident investigation | Art. 6(1)(c) — legal obligation + Art. 6(1)(f) — legitimate interest | DECISION REQUIRED — recommended 3 years | Compliance officer |
| `operator_access_log.*` | Operator privileged access record | Break-glass accountability | Art. 6(1)(c) + Art. 6(1)(f) | DECISION REQUIRED — recommended 3 years | Platform security |

---

## 10. Subprocessors and Data Flows

Derived from `backend/.env.example` and service imports (2026-09-01):

| Subprocessor | Data sent | Processing location | Transfer basis | SCC required? |
|---|---|---|---|---|
| **Neon** (Postgres) | All personal data in DB | Configured deployment region | Primary storage; deployed location is not established by repository configuration | DECISION REQUIRED |
| **Upstash** (Redis) | Session tokens, cache keys, permission versions, rate-limit counters | Configurable per `UPSTASH_REDIS_REST_URL` region | Caching layer | DECISION REQUIRED — depends on region |
| **Cloudflare R2** | File uploads, exported data, document blobs | Configurable per `R2_ENDPOINT` | Object storage | DECISION REQUIRED — depends on bucket region |
| **Resend** | Email content + recipient addresses | Provider-configured region | Email delivery | DECISION REQUIRED — depends on provider region and transfer mechanism |
| **ZeptoMail** | Email content + recipient addresses | Configured API endpoint/provider region | Transactional email | DECISION REQUIRED |
| **Ably** | Realtime event payloads (channel names + message bodies) | Global edge | Realtime messaging | SCCs required for EU data |
| **OpenAI** (`AI_LLM_PROVIDER=openai`, or `OPENAI_API_KEY` for embeddings) | LLM prompts, embeddings, and KB RAG content | Provider/deployment dependent | AI inference and embeddings | DECISION REQUIRED; SCCs or adequacy mechanism where applicable |
| **Google** (`AI_CHAT_PROVIDER=google`) | Chat prompt content | Provider/deployment dependent | AI chat | DECISION REQUIRED; SCCs or adequacy mechanism where applicable |
| **OpenRouter** (`AI_LLM_PROVIDER=openrouter` or `AI_CHAT_PROVIDER=openrouter`) | AI prompt content | Provider and underlying model dependent | AI inference | DECISION REQUIRED — which underlying models and transfer mechanism |
| **Composio** | OAuth tokens for third-party integrations | US | Integration credential storage | SCCs required; user disclosure required |
| **Razorpay** | Payment data (amount, customer email) | India | Payment processing | Adequacy for India data |

---

## 11. Decisions Required — Summary

The following items require an explicit decision record signed by the DPO/operator before this catalogue is approved:

| # | Item | Recommended default |
|---|---|---|
| D1 | `audit_logs.metadata` stores email in `user.registered` — approve or purge | Approve under Art. 6(1)(f) legitimate interest; document |
| D2 | Chat and mail message retention period | Active employment + 1 year |
| D3 | Audit log retention | 3 years |
| D4 | Upstash Redis processing region | Match primary app region; SCCs if EU |
| D5 | R2 bucket region | Match primary app region; SCCs if EU |
| D6 | ZeptoMail adequacy mechanism | Review Zoho DPA; SCCs if needed |
| D7 | OpenRouter subprocessor adequacy | Execute SCCs before EU data flows |
| D8 | AI PII-stripping layer | Implement before any EU HR data sent to AI providers |
| D9 | Special-category HR data collection and legal basis | Do not collect biometric, wellness, accommodation or safety fields until the Art. 9 condition, access limits and retention are approved |
| D10 | AI conversation and usage retention | 90 days for conversations/jobs; 2 years for non-content usage metadata |
| D11 | Knowledge-base and support retention | KB chat active account + 1 year; support closure + 2 years; derived chunks follow source deletion |
| D12 | Signature evidence retention | 7 years after document expiry or applicable statutory period |
| D13 | Notification consent and delivery retention | Consent evidence for processing period + 3 years; delivery/outbox data 90 days |
| D14 | Integration and webhook payload handling | Delete connections on disconnect; webhook payloads 30 days; prohibit unapproved sensitive payloads |
| D15 | Organization, collaboration and project metadata | Approve category owners and closure-based periods for memberships, calendar/meetings and projects |

---

## Approval Record

**DPO / Operator:** (name, role) _______________

**Date of approval:** _______________

**Deferred items with target date:** _______________

File signed decision record at `architecture-refactor/decisions/privacy-YYYY-MM-DD.md`.
