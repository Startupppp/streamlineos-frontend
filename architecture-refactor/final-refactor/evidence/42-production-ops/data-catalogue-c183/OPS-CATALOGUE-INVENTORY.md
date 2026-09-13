# OPS-CATALOGUE Data Inventory — PRD-C183/C184/C185

Produced 2026-09-13 against backend source HEAD and frontend source HEAD, working from
`architecture-refactor/prd/completion-plan.md` §OPS-CATALOGUE and existing evidence in
`data-catalogue-c183/`. Unsigned C184/C185 drafts are NOT adopted as approvals here.

Legend:
- **SOURCE** — verifiable from schema / source code at HEAD, no human approval needed
- **OPEN** — requires a named human approver before the field is settled
- **DEFERRED** — explicitly deferred in the completion plan with a named future stage

---

## 1. Identity and Authentication

### 1.1 Global identity (`users`, `accounts`, `sessions`)

| Field | Content | Owner | Lawful basis | Processor / region | Retention | Export | Erasure |
|---|---|---|---|---|---|---|---|
| `users.email` | Login address | Platform | **OPEN-1** | Neon — **OPEN-4** | Kept until erasure request; `anonymiseGlobalIdentity` rewrites it | GDPR export fetcher | Anonymised in-txn |
| `users.password_hash` | Argon2id | Platform | **OPEN-1** | Neon — **OPEN-4** | Kept until erasure | Not exported | Nulled on erasure |
| `user_devices.fingerprint` | Browser fingerprint string | Platform | **OPEN-2** | Neon — **OPEN-4** | Kept until erasure | Not exported | Cascade-deleted |
| `user_devices.user_agent`, `ip` | Login context | Platform | **OPEN-2** | Neon — **OPEN-4** | Kept until erasure | Not exported | Cascade-deleted |
| `login_events.*` | IP, user-agent, timestamp | Platform | **OPEN-2** | Neon — **OPEN-4** | No sweep in `RETENTION_MATRIX` — **OPEN-5** | Not exported | Not cleared by `erase` — **OPEN-5** |
| `audit_logs.user_id`, `metadata` | Action + IP in metadata | Platform | **OPEN-3** | Neon — **OPEN-4** | KEEP-FOREVER in retention matrix | Audit export | Excluded from erasure by `audit_logs_append_only` trigger — F-1 in FINDINGS.md |

### 1.2 Invitations and portal tokens

| Field | Content | Retention | Notes |
|---|---|---|---|
| `organization_invitations.email` | Invitee address | Kept until accepted/expired + terminal cleanup | Soft-delete; terminal cleanup is in `CronNotificationRetentionService` range |
| `organization_invitations.token_hash` | Hash only at rest | Same | Source: `token_hash`, not raw token |
| `platform_waitlist.email` | Platform sign-up email | No sweep defined — **OPEN-5** | Unique index on email; token_hash only |

### 1.3 Pseudonymous voting

| Table | Column | Content | Notes |
|---|---|---|---|
| `roadmap_votes` | `voter_ip_hash` | SHA hash of voter IP | Partial index on non-null; hash is one-way but DPDP pseudonymous — **OPEN-2** |
| `feedback_votes` | `voter_ip_hash` | Same | Same |

---

## 2. HR and Employment

### 2.1 Core employment records

| Table | Key personal fields | Retention | Erasure path |
|---|---|---|---|
| `hr_people` | name, DOB, gender, nationality, address, phone, blood_group, medical_notes, emergency_contact JSONB | Per org `hr_retention_policies`; medical/blood fields — **OPEN-6** | Soft-delete via status; erasure path: `gdpr-export-fetchers-hr.ts` covers export; erasure clears `hr_people` rows |
| `hr_employments` | dates, designation, manager, salary | Per org `hr_retention_policies`; payroll records excluded from sweeps | Soft-delete |
| `organization_people` | emergency_contact JSONB | Per org `hr_retention_policies` | Soft-delete |
| `workers` | payability flag | Same | |

Lawful basis for HR collection: **OPEN-1** (contract / legitimate interest / legal obligation; India DPDP classification unresolved).

### 2.2 Sensitive categories requiring explicit decisions

| Table | Sensitive field | Current controls | Human approval needed |
|---|---|---|---|
| `hr_people.blood_group` | Health data | Stored plaintext; access-gated | **OPEN-6**: lawful basis, retention period, encryption-at-rest decision |
| `hr_people.medical_notes` | Health data | Stored plaintext | **OPEN-6** |
| `hr_accommodation_requests.confidential_medical_note` | Health / disability | Stored as text | **OPEN-6** |
| `hr_safety_incidents.confidential_medical_note` | Health | Stored as text | **OPEN-6** |
| `hr_accommodation_requests` (type: medical_restriction) | Health / disability accommodation | Access-gated | **OPEN-6** |
| `hr_cases` (type: disciplinary, grievance, POSH via `case_type`) | Disciplinary / legal proceedings | Access-gated; `hr_audit_logs` | **OPEN-7**: retention period, third-party disclosure |
| `hr_disciplinary_actions` | Disciplinary | Same | **OPEN-7** |
| `biometric_devices`, `biometric_logs` | Biometric attendance (punch_time, biometric_user_id string from third-party device) | Raw biometric template NOT stored in platform; only device-assigned user ID string | Deletion outside platform control — **OPEN-8**: third-party biometric device DPA/deletion mechanism |
| `hr_wellness_benefits` (enum value: wellness) | Wellness programme participation | Access-gated | **OPEN-6** |

### 2.3 Recruitment and candidate data

| Table | Content | Retention | Notes |
|---|---|---|---|
| `candidates` | Name, contact, CV | No sweep defined — **OPEN-5** | Includes vendor-submitted candidates via integration |
| `candidate_reference_checks` | Reference details | Cascade-deleted with candidate; no independent retention | |
| `alumni_profiles` | Post-exit profile (name, contact, previous title) | No sweep defined — **OPEN-5** | Soft-delete not visible in source |
| `hr_interview_*` | Interview records, scores | No sweep defined — **OPEN-5** | |
| `hr_onboarding_sessions` | Onboarding form submissions | No sweep defined | Covered by `hr_retention_policies` per org |

Anonymous survey flag: `is_anonymous` boolean exists on survey responses, performance reviews, feedback. **OPEN-9**: no server-side mechanism verifies that the respondent cannot be re-identified from row metadata (org_unit, timestamp, role); identity severance is promised but unproved.

### 2.4 Financial / payroll records

| Table | Content | Retention | Notes |
|---|---|---|---|
| `hr_pay_slips`, `payroll_runs`, `payroll_line_items`, `payroll_journal_batch_lines` | Salary, deductions, tax | Excluded from automatic sweeps per completion-plan baseline; immutability required | **OPEN-5**: no approved minimum legal retention period on record; India Payments Act / TDS / PF requires 5–8 years — needs named approver |
| `hr_bank_accounts` | IFSC, account number | Encrypted or access-gated? — **OPEN-10** | IFSC redacted in AI flows by `redaction.util.ts`; raw column not encrypted at column level |
| Platform payment records (`platform_payments`, `subscription_purchases`) | Razorpay/Stripe order/payment IDs | Per billing; no sweep | KEEP-FOREVER or financial audit period — **OPEN-5** |

---

## 3. AI and Machine Learning

### 3.1 AI usage telemetry

| Table | Content | Retention | Notes |
|---|---|---|---|
| `ai_usage_logs` | model, tokens, feature, org_id, user_id, latency | 730 days — documented in completion-plan baseline | Soft-delete column / partition drop; dry-run default |
| AI credit ledger (`ai_wallet_transactions`) | credits charged, model, feature | KEEP-FOREVER (immutable billing record) | Separate from usage analytics |

### 3.2 AI conversations and knowledge

| Asset | Content | Retention | Notes |
|---|---|---|---|
| KB chat history | Messages with embeddings, per org | `chat_history_retention_days` (org config, default 90 days) | Source-verifiable default |
| AI conversation sessions | Tool calls, prompts, responses | **OPEN-5**: no approved retention period on record | |
| AI job outputs | Generated text, structured results | **OPEN-5**: no approved retention period | |

### 3.3 Embeddings (vector store)

| Asset | Processor | Region | Content | Notes |
|---|---|---|---|---|
| `kb_chunks.embedding` | OpenAI `text-embedding-*` at index time | **OPEN-4** | Chunk text derived from KB pages | Redaction gate: PAN/GSTIN/IFSC stripped before embedding; Aadhaar, UAN, mobile, email NOT stripped — **AI-GAP-1** (from ai-redaction-probe.txt: 14 of 20 probe strings unredacted, every Indian identifier passes through) |
| Vector column in Neon | Neon (primary) | **OPEN-4** | Same | ANN/exact query depending on tenant size |

Disclosure requirement: OpenAI processes chunk text for embedding. OpenRouter personal-data restriction is active per completion plan — OpenRouter must not receive personal data.

---

## 4. Communications

### 4.1 Outbound email

| Provider | Config | Known region | Content sent | DPA |
|---|---|---|---|---|
| ZeptoMail | `ZEPTOMAIL_API_URL = https://api.zeptomail.in/v1.1/email` (SOURCE) | India (API endpoint confirms) | To-address, rendered HTML/text body (may contain names, task/ticket content) | **OPEN-11** |
| Resend | `RESEND_API_KEY` optional | **OPEN-4** | Same | **OPEN-11** |

Email provider is runtime-configured; both may be active in different deployments.

Retention: `email_outbox.to_email` 13 months; `email_outbox.html/text/subject` 90 days — SOURCE (completion-plan baseline and `cron-notification-retention.service.ts`).

F-7 (FINDINGS.md) is open: erasure request does NOT clear `email_outbox.to_email` / `notification_deliveries.recipient_address` — they age out on retention schedule only (up to 13 months after erasure request).

### 4.2 Push notifications

| Provider | Config | Region | Content |
|---|---|---|---|
| VAPID / Web Push | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Browser/OS relay (Google FCM or Apple APNs) — **OPEN-4** | Push payload (title, body fragment) |

### 4.3 SMS (e-signature OTP)

| Provider | Config | Region |
|---|---|---|
| Twilio or custom SMS provider | `TWILIO_*` or `SIGN_SMS_PROVIDER_URL/TOKEN` | **OPEN-4** |
| Twilio | Account SID + auth token | US-based; India routing — **OPEN-4** |

### 4.4 Realtime (Ably)

| Provider | Config | Region | Content |
|---|---|---|---|
| Ably | `ABLY_API_KEY` | **OPEN-4** | Channel events (typed payloads); no persistent storage expected on provider side | DPA: **OPEN-11** |

---

## 5. Integrations (Composio)

| Asset | Content | Notes |
|---|---|---|
| `user_integration_connections` | Provider OAuth tokens (mirrored), connector status | F-9 in FINDINGS.md: org-purge has no Composio disconnect path — `failedAdapter`; subject erasure path also missing |
| Content accessed via Composio | Google Calendar events, Google Meet links, third-party app data | Platform does not store provider content beyond connection metadata | **OPEN-12**: Composio's own retention/sub-processor disclosure required |

Composio personal-data access: Google Meet approval is explicit per completion plan (P16); retired TURN/STUN excluded.

---

## 6. Object Storage (Cloudflare R2)

| Bucket | Config key | Content | Region |
|---|---|---|---|
| Primary (attachments, documents, exports) | `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_REGION` | Uploaded files, GDPR export archives | `R2_REGION` env var — actual value deployment-specific — **OPEN-4** |
| KB media | `R2_KB_BUCKET_NAME`, `R2_KB_PUBLIC_URL` | KB page attachments, media | Same env var |

F-9: org purge adapter enumerates and deletes from R2 (three retries), returns `FAILED` on residual; subject erasure has no parallel object-store purge step.

---

## 7. Cache (Upstash Redis)

| Provider | Config | Region | Content | Retention |
|---|---|---|---|---|
| Upstash | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | **OPEN-4** | Permission cache, session cache, rate-limit counters, idempotency keys | TTL-bounded; Redis tombstones 30 days (session revocation) |

---

## 8. Payments

| Provider | Config | Region | Content | Notes |
|---|---|---|---|---|
| Razorpay | `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | India | Order IDs, payment IDs, webhook signatures | SOURCE: India-only per account |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | **OPEN-4** | Same; international deployments | Backend support exists; frontend checkout not yet wired for Stripe — **OPEN-13** |

Financial records: `platform_payments.razorpay_payment_id`, `platform_payments.razorpay_order_id` retained; no sweep. **OPEN-5** for retention period.

---

## 9. Security / Verification

| Provider | Config | Content | Region |
|---|---|---|---|
| Cloudflare Turnstile | `TURNSTILE_SECRET_KEY` (from `turnstile.service.ts`) | CAPTCHA challenge token (no PII beyond IP passed by browser) | Cloudflare CDN — **OPEN-4** |

---

## 10. Redaction Coverage

From `ai-redaction-probe.txt` (probe at commit `45f8a2e99`):

| Identifier | Redacted in AI flows |
|---|---|
| PAN | YES (SOURCE: `redaction.util.ts`) |
| GSTIN | YES |
| IFSC | YES |
| Aadhaar | NO — **AI-GAP-1** |
| UAN | NO — **AI-GAP-1** |
| Mobile number | NO — **AI-GAP-1** |
| Email address | NO — **AI-GAP-1** |

AI-GAP-1 is an open finding from the existing probe. OpenRouter personal-data restriction remains active. Google AI (Gemini) receives chat content; redaction gap means Indian identifiers may reach the provider.

---

## 11. Retention Decisions — Status

Documented application contracts (source-verifiable against cron services and completion-plan baseline):

| Class | Period | Authority |
|---|---|---|
| KB chunks (orphaned) | Pruned when parent archived | SOURCE: `cron-kb-chunk-retention` |
| AI usage analytics | 730 days | SOURCE: completion-plan baseline |
| KB / org chat history | `chat_history_retention_days` default 90 days | SOURCE |
| Build webhook completed attempts | 90 days (pending retained) | SOURCE |
| Notifications | 180 days | SOURCE |
| Notification delivery bodies / email-outbox bodies | 90 days | SOURCE |
| Notification records / email-outbox records | 13 months | SOURCE |
| Terminal outbox events | 30 days | SOURCE |
| HR documents / attendance / hr_people | Per org `hr_retention_policies` | SOURCE |
| Helpdesk resolved/closed | 730 days | SOURCE |
| Mail projection | 365 days from `synced_at` | SOURCE |
| Announcements | expired + 90 days OR created + 730 days | SOURCE |
| Audit logs, HR audit logs | KEEP-FOREVER | SOURCE (`RETENTION_MATRIX`) |
| Payroll / financial records | EXCLUDED from sweeps | SOURCE — legal minimum not approved |

---

## 12. Open Items Requiring Named Human Approver

The following are NOT resolved by this inventory. Each requires an identified Privacy/DPO, Legal, or Product owner to make and sign a decision before the item is closed.

1. **OPEN-1** — Lawful basis per data class under India DPDP 2023: identify whether collection is for (a) performance of contract, (b) legal obligation, (c) legitimate interest, or (d) consent, for each of: identity/auth, HR employment, HR sensitive categories (health, biometric, disciplinary), recruitment, AI usage, communications. DPDP requires a "Data Fiduciary" notice per purpose; no such notice is recorded.

2. **OPEN-2** — Fingerprint and IP hash collection: security-necessity vs. consent classification under DPDP. Device fingerprint (`user_devices.fingerprint`) and pseudonymous IP hashes (`voter_ip_hash`) require a lawful-basis decision. If consent-based, a consent record must exist and be erasable.

3. **OPEN-3** — Audit log personal-data exemption: confirm that the `KEEP-FOREVER` classification for `audit_logs` (and `hr_audit_logs`, `notification_audit_logs`) is backed by an identified legal obligation (regulatory audit requirement), not an internal policy preference. Named legal authority required.

4. **OPEN-4** — Processor regions: confirm actual deployed regions for Neon (primary and read replicas), Upstash Redis, Cloudflare R2 (actual `R2_REGION` value in production), Ably, Resend, Twilio, Google AI (Gemini), OpenAI. For each non-India processor receiving personal data, confirm: SCCs or equivalent transfer mechanism exist; DPA is signed; subprocessor list is published. India-default payroll premise (historical proposal) is not an approved transfer mechanism.

5. **OPEN-5** — Missing approved retention periods: the following classes have no approved retention period on record; the completion plan explicitly says "record missing approval rather than reusing unsigned recommendations":
   - AI conversation sessions and job outputs
   - Support tickets (completion plan baseline: 730 days proposed but not approved)
   - Audit/consent records beyond KEEP-FOREVER classification
   - E-signature / digital signature records
   - Webhook payload bodies
   - Recruitment candidate records (after hire/rejection)
   - Alumni profiles
   - Platform waitlist entries
   - Login events
   - Platform payment / billing records
   - Sensitive HR categories (health, disciplinary) — if not already covered by `hr_retention_policies` per org

6. **OPEN-6** — Sensitive health data controls: `blood_group`, `medical_notes`, `confidential_medical_note` are stored as plaintext in Neon. Decisions needed: (a) lawful basis for collection (consent / employment contract / occupational safety obligation); (b) whether column-level encryption is required before deployed use; (c) approved retention period; (d) access log adequacy (currently access-gated by RBAC, no separate access audit for these columns).

7. **OPEN-7** — Disciplinary, grievance, and POSH data: `hr_cases` (types: disciplinary, grievance), `hr_disciplinary_actions`. Decisions needed: (a) lawful basis (legal obligation / legitimate interest); (b) retention period (typically 3–7 years in employment law); (c) disclosure obligations to third parties (employee, works council, regulator); (d) legal-hold integration (F-12: 11 of 16 cron services do not check legal holds).

8. **OPEN-8** — Biometric device deletion: `biometric_logs` stores `biometric_user_id` assigned by a third-party biometric device. Raw biometric templates are not stored in the platform. Decisions needed: (a) DPA/processing agreement with biometric hardware vendor; (b) deletion mechanism for biometric enrollment on the device when employment ends (outside platform control — confirmed by F-9-style gap); (c) lawful basis for biometric attendance data under DPDP (consent required for biometric in most jurisdictions).

9. **OPEN-9** — Anonymous survey identity severance: `is_anonymous` boolean is set on survey responses, performance reviews, and feedback, but no server-side control prevents re-identification from row metadata (org_unit, department, timestamp, role_level). Decisions needed: (a) confirm whether the anonymity promise is technically enforced or advisory only; (b) if technically enforced, document the mechanism; (c) if advisory, update user-visible privacy notice to reflect this.

10. **OPEN-10** — Bank account data encryption: `hr_bank_accounts` contains IFSC code and account number. IFSC is redacted in AI flows by `redaction.util.ts` but raw columns are not column-level encrypted. Decision: whether encryption at rest at the column level is required before deployed use (RBI guidelines for payment/salary data may require this).

11. **OPEN-11** — DPA existence per communications vendor: signed DPAs with ZeptoMail (Zoho), Resend, Ably, and Twilio must be confirmed by the named Legal owner. For Twilio: confirm India routing via DLT (TRAI requirement for transactional SMS). For Resend: separate approval required per completion plan.

12. **OPEN-12** — Composio subprocessor chain: Composio accesses Google Calendar, Google Meet, and other third-party app data on behalf of the tenant. Decisions needed: (a) Composio DPA; (b) disclosure of Composio's sub-processors to data principals; (c) Composio's own retention period for accessed data; (d) confirm disconnect-deletion behavior when a tenant disconnects an integration.

13. **OPEN-13** — Stripe frontend checkout: `env-schema-providers.ts` includes Stripe credentials, and the backend models Stripe alongside Razorpay. The frontend checkout (`checkout-script.ts`, `plan-tab.tsx`) only supports Razorpay. Decision: confirm whether Stripe is intended for live use in this release and, if so, wire the frontend checkout seam (already consolidated into `checkout-script.ts` as the single provider-specific file) for Stripe.

---

## Evidence Provenance

- Schema enumeration: `pd-columns.csv` (296 personal-data columns, 136 tables, from `scratch_head_1010`) — produced 2026-09-03
- Redaction probe: `ai-redaction-probe.txt` — produced 2026-09-03 at `45f8a2e99`
- Privacy findings: `RB-10-privacy-compliance/FINDINGS.md` (F-1 through F-13)
- Retention baseline: `completion-plan.md` §OPS-CATALOGUE line ~1246
- Provider config: `backend/src/config/env-schema-app.ts`, `env-schema-providers.ts` — verified at HEAD
- Sensitive schema: `db/schema/hr/biometric.ts`, `hr/cases.ts`, `hr/enterprise-ops.ts`, `hr/core-people.ts`, `hr/offboarding.ts`, `hr/hiring-candidates.ts`, `hr/travel.ts` — verified at HEAD
- Redaction source: `modules/ai/core/redaction.util.ts` — verified at HEAD
