# RB-10 — Privacy, Compliance and Operator Decisions

**Status: AWAITING OPERATOR APPROVAL on every item below.**

Each item is a human decision that cannot be made from code alone. This document provides:
- The concrete options available to the operator.
- The current implemented state with file:line evidence.
- A recommended default where one is defensible.

No item here is marked done. An operator must read each section, choose an option, record
their decision (name, date, rationale), and file the result as evidence.

---

## 1. Break-glass / Operator-access policy

**PRD requirement (§20):** "Operator/support access is time-bound, approved, reasoned and audited."

### Current implementation state

Migration `0747` applied. Tables: `platform_operator_access_grants` — schema at
`backend/src/db/schema/common/platform-operator-grants.ts`. `assertGrant` requires
`status = 'active'`. DB CHECK `approver_id != granted_by` is convalidated (no self-approval).

**What is NOT built:**
- No `OperatorAccessService` — grants must be inserted directly into `platform_operator_access_grants`.
- No `OperatorSessionGuard` — time-bound expiry is not enforced at the HTTP layer.
- No `OperatorAuditInterceptor` — individual API calls under an operator session are not audited.
- No content-blind default — a platform operator with a valid JWT can read any route their role permits.

Current enforcement level: DB schema enforces dual-approval and self-approval prevention.
Application layer enforcement: NONE yet.

### Decision required: policy parameters

The operator must choose:

| Parameter | Option A | Option B (recommended) | Option C |
|---|---|---|---|
| Session max duration | 1 hour | 4 hours | 8 hours |
| Approval requirement | 1 approver | 2 approvers (dual control) | Manager + security |
| Minimum reason length | 10 chars | 20 chars | free-text required |
| Ticket reference | optional | required | required + validated against issue tracker |
| Content-blind default | No (current) | Yes — explicit elevation per org | Yes — always |
| Audit granularity | Session-level | Per-request | Per-request + diff of data accessed |
| Review cadence | Never | Monthly | Quarterly |
| Auto-expiry of pending grants | Never | 24 hours | 48 hours |

**Recommended defaults:** Option B throughout. Dual control prevents insider threat from a single
compromised operator account. 4-hour sessions cover a typical incident response window. 20-char
reason + ticket ref forces documentation. Monthly review catches grants left open.

### AWAITING OPERATOR APPROVAL

Record here: chosen parameters, approver name, date, rationale. Then assign to a lane to build
`OperatorAccessService`, `OperatorSessionGuard` and `OperatorAuditInterceptor`.

---

## 2. Data inventory, lawful purpose and retention owner

**PRD requirement (§6):** "Approve data inventory, lawful purpose, retention owner and residency policy."

### Current implementation state

Tables with retention-related data:
- `hr_retention_policies` — exists; schema at `backend/src/db/schema/hr/data-requests.ts`. No worker
  reads them to trigger scheduled deletions.
- `hr_legal_holds` + `organization_legal_holds` — exist and are enforced by `GdprService` and
  `purge-user.mjs`. Verified working: legal-hold drill PASS 2026-09-01.
- `audit_logs.metadata` — stores contextual metadata per action. The `user.registered` action stores
  `{ email, companyName }` — this is PII. Operator must decide whether this is within the approved
  inventory and lawful basis.

**Data categories the system processes (from pg_catalog, 2026-09-01):**
- Identity: `users` (email, name, auth credentials)
- Employment: `hr_people`, `hr_employments`, `hr_people_payroll`, `hr_banking_details`
- Payroll: `payroll_runs`, `payroll_payslips`, bank account details
- Communication: `chat_messages`, `mail_messages`, `notifications`
- Time: `attendance`, `timesheets`, `leave_requests`
- Documents: `candidate_documents_vault`, `hr_documents`
- Financial: `expenses`, `invoices`, `salary_loans`
- Recruitment: `candidates`, `applications`, `offer_letters`

### Decisions required

**2a. Data inventory sign-off:**
The operator (DPO or equivalent) must review the categories above, confirm each is in scope of
processing, and sign the inventory. A template data map is in
`architecture-refactor/runbooks/data-map-template.md` (to be created by the operator).

**2b. Lawful purpose per category:**
Each category needs a lawful basis under GDPR Art. 6 (contract, legal obligation, legitimate
interest, consent). The operator must choose one per category. Employment data is typically
Art. 6(1)(b) + Art. 9(2)(b); marketing is consent.

**2c. Retention owner:**
Each category needs a named owner accountable for enforcing the retention period.
Current state: `hr_retention_policies` table exists but no automatic enforcement. The operator
must name an owner for each category, set a retention period, and commission the retention-sweep
worker (see OPERATOR-EVIDENCE.md Gap 1).

**2d. Audit log PII review:**
`audit_logs.metadata` contains `{ email, companyName }` in `user.registered` events. The operator
must decide: (a) this is approved (traceability for audit trail under Art. 5(1)(f)) or
(b) replace with `user_id` reference only and purge historical rows.

**Recommended defaults:**
- Employment: Art. 6(1)(b) + Art. 9(2)(b), 7 years post-employment.
- Communication: Art. 6(1)(b) while employed, explicit consent after.
- Recruitment: consent, 6 months after rejection unless candidate consents to longer.
- Audit logs: Art. 6(1)(c) (legal obligation), 3 years.
- Audit log email in metadata: keep for traceability, document under Art. 6(1)(f) legitimate
  interest for fraud/access investigation.

### AWAITING OPERATOR APPROVAL

Record here: DPO name, sign-off date, chosen lawful bases per category, retention periods per
category, owner assignments.

---

## 3. Residency policy

**PRD requirement (§6):** Approve residency policy as part of data inventory decisions.

### Current implementation state

All data resides in Neon Postgres, region `ap-southeast-1` (Singapore). Redis via Upstash (region
set per deployment environment variable). Object storage: Cloudflare R2 (regional bucket configurable).
No data residency enforcement in code — all orgs share the same region.

**Cell-model implication:** The cell architecture supports per-region databases (`REGION_KEYS`,
`REGION_CELL_2_APP_DATABASE_URL`). An org can be placed in a specific cell via `cell:place-org`.
This would allow EU-resident data to be placed in an EU cell. No EU cell exists.

### Decision required

| Option | What it means | What it requires |
|---|---|---|
| A — No residency guarantee (current) | All data in ap-southeast-1; documented in ToS | Document in ToS; no code change |
| B — Residency by request | Orgs can request a specific region cell; provisioning is manual | Provision cell(s) per region; `cell:place-org` to move org |
| C — Residency by org country | Org's `country` field automatically determines cell | Add cell-placement logic to org-creation flow |

**Recommended:** Option A for initial launch with a clear ToS statement. Option B when an EU or
India customer requires it. Option C when cell provisioning is automated.

### AWAITING OPERATOR APPROVAL

Record here: chosen option, ToS statement language, any commitments made to customers.

---

## 4. Regional transfer and subprocessors

**PRD requirement (§6):** "Approve regional transfer and subprocessor decisions."

### Current subprocessors (from code evidence)

| Subprocessor | Data transferred | Region | Mechanism |
|---|---|---|---|
| Neon (postgres) | All tenant data | ap-southeast-1 (Singapore) | Primary database |
| Upstash | Session tokens, cache keys, rate-limit counters, permission-version numbers | Configurable (env) | Redis REST API |
| Cloudflare R2 | File uploads, exports, attachments | Configurable (env) | S3-compatible API |
| Resend | Email content + recipient addresses | US (Resend infrastructure) | SMTP/API |
| Ably | Realtime event payloads (channel names + message bodies) | Global (Ably edge) | WebSocket |
| OpenAI / Anthropic | AI prompt content (if `AI_PROVIDER=openai` or `anthropic`) | US | HTTPS API |
| Composio | Third-party integration credentials (OAuth tokens) | US | REST API |

Sources: `backend/src/modules/mail/resend.service.ts`, `backend/src/common/ably/ably.service.ts`,
`backend/src/modules/ai/ai-gateway.service.ts`, `backend/src/modules/integrations/`.

### Decisions required

**4a. Standard contractual clauses (SCCs):**
For transfers from the EU/EEA to the US (Resend, Ably, OpenAI/Anthropic, Composio), the operator
must ensure SCCs or an equivalent adequacy mechanism is in place with each subprocessor.

**4b. Subprocessor list publication:**
GDPR requires informing data subjects of subprocessors. The operator must publish and maintain
this list.

**4c. AI data transfer:**
AI prompt content may contain personal data (names, employment details in HR AI features). The
operator must decide: (a) accept transfer to the AI provider's US infrastructure under SCCs, or
(b) use an EU-hosted model, or (c) strip PII from prompts before sending.
Current state: prompts are sent as-is; no PII-stripping layer exists.

**4d. Composio token storage:**
OAuth tokens from third-party integrations are stored via Composio (US). The operator must confirm
this is disclosed to users and covered by the subprocessor agreement.

**Recommended defaults:**
- Execute SCCs with each US subprocessor before any EU-resident data is processed.
- Publish subprocessor list at `[your-domain]/legal/subprocessors`.
- For AI: implement a PII-check layer before sending prompts to external providers.
- For Composio: add disclosure to the integration-connect user flow.

### AWAITING OPERATOR APPROVAL

Record here: SCC status per subprocessor, publication URL, AI data handling decision, Composio
disclosure decision.

---

## Evidence trail

Once each section above is approved, file a signed decision record in
`architecture-refactor/decisions/privacy-YYYY-MM-DD.md` with:
- Item number (1–4)
- Decision maker name + role
- Chosen option
- Date of decision
- Any deferred items with target date

No item in this document may be marked DONE in `OPERATOR-EVIDENCE.md` without that signed record.
