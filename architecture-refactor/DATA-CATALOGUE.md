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
| `sessions.session_token` | Session credential | Maintain authenticated state | Art. 6(1)(b) — contract | Expires per TTL (24h); deleted on logout | Platform team |
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
| `hr_people_payroll.basic_salary`, `gross_salary` | Financial — compensation | Payroll calculation | Art. 6(1)(b) + Art. 6(1)(c) | 7 years post-employment | Finance / HR |

---

## 3. Payroll and Banking

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `hr_banking_details.account_number` | Bank account | Salary disbursement | Art. 6(1)(b) | 7 years post-employment | Finance |
| `hr_banking_details.ifsc_code` | Bank identifier | Salary disbursement | Art. 6(1)(b) | 7 years post-employment | Finance |
| `payroll_runs.*` | Payroll computation | Statutory payroll record | Art. 6(1)(c) — legal obligation | 7 years | Finance |
| `payroll_payslips.*` | Payslip | Employee statutory record | Art. 6(1)(c) | 7 years | Finance |

---

## 4. Communication

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `chat_messages.content` | Message content | Internal team communication | Art. 6(1)(b) — contract | DECISION REQUIRED — recommended: active employment + 1 year | Platform team |
| `mail_messages.body`, `subject` | Email content | Business communication | Art. 6(1)(b) | DECISION REQUIRED — recommended: active employment + 1 year | Platform team |
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
| `hr_documents.*` | Employment document | HR records | Art. 6(1)(b) + Art. 6(1)(c) | 7 years post-employment | HR Manager |
| Object-storage blobs (`R2_BUCKET_NAME`) | All of the above in binary form | Storage of documents listed above | Inherits from owning record | Same as owning record | Platform + owning team |

---

## 7. Recruitment

| Column / Table | Data class | Purpose | Lawful basis | Retention | Owner |
|---|---|---|---|---|---|
| `candidates.email`, `name`, `phone` | Candidate identity | Recruitment process | Art. 6(1)(a) — consent | 6 months post-rejection; longer with explicit consent | Talent team |
| `applications.*` | Application data | Recruitment process | Art. 6(1)(a) — consent | 6 months post-rejection | Talent team |
| `offer_letters.*` | Employment terms | Pre-employment contract | Art. 6(1)(b) — pre-contractual | Life of employment + 7 years | HR Manager |

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
| **Neon** (Postgres) | All personal data in DB | Singapore (ap-southeast-1) | Primary storage — no transfer | No (APAC) |
| **Upstash** (Redis) | Session tokens, cache keys, permission versions, rate-limit counters | Configurable per `UPSTASH_REDIS_REST_URL` region | Caching layer | DECISION REQUIRED — depends on region |
| **Cloudflare R2** | File uploads, exported data, document blobs | Configurable per `R2_ENDPOINT` | Object storage | DECISION REQUIRED — depends on bucket region |
| **Resend** | Email content + recipient addresses | US | Email delivery | SCCs required for EU data |
| **ZeptoMail** | Email content + recipient addresses | India / US (Zoho infra) | Transactional email | DECISION REQUIRED |
| **Ably** | Realtime event payloads (channel names + message bodies) | Global edge | Realtime messaging | SCCs required for EU data |
| **OpenAI** (`AI_PROVIDER=openai`) | AI prompt content (may include HR data) | US | AI inference | SCCs required; PII-stripping layer recommended |
| **Anthropic** (`AI_PROVIDER=anthropic`) | AI prompt content | US | AI inference | SCCs required; PII-stripping layer recommended |
| **OpenRouter** (`AI_PROVIDER=openrouter`) | AI prompt content | US | AI inference | SCCs required; DECISION REQUIRED — which underlying models |
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

---

## Approval Record

**DPO / Operator:** (name, role) _______________

**Date of approval:** _______________

**Deferred items with target date:** _______________

File signed decision record at `architecture-refactor/decisions/privacy-YYYY-MM-DD.md`.
