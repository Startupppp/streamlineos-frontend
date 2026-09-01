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

### Current implementation state (updated 2026-09-01)

Migration `0747` applied. Tables: `operator_access_grants` — schema at
`backend/src/db/schema/common/platform-operator-grants.ts`. `assertGrant` requires
`status = 'active'`. DB CHECK `approver_id != granted_by` is convalidated (no self-approval).

**What IS built (2026-09-01):**
- `PlatformOperatorAccessService` — full grant lifecycle: create, approve (dual-control), reject,
  revoke, `assertGrant` (checks status + expiry + revokedAt in one query), and transactional
  `authorizeRequest` (checks the grant and writes `operator_access_log` before the tenant read).
- `OperatorSessionGuard` — requires an authenticated human session, reads `userId` + `:orgId`,
  calls `authorizeRequest`, and sets the target organization on the request before the data
  service runs.
- `@RequireOperatorGrant(scope)` — decorator, attached to the guard via `Reflector`.

**What is NOT built:**
- No `OperatorAuditInterceptor` — individual API calls are logged by the guard, but a
  dedicated interceptor (diffing data accessed) is not implemented.
- No tenant notification dispatch is wired to the operator-grant lifecycle. The recipient
  population, mandatory channel, and customer-facing disclosure still require an approved policy;
  the existing notification catalog cannot be treated as that decision.
- No emergency exception/bypass path exists. Requests without a normal, two-person grant are
  denied by the existing guard; adding an emergency path requires an approved authority, scope,
  duration, and post-incident review procedure.
- No periodic review worker or selected review cadence exists. The expiry sweep only closes stale
  pending requests and does not replace the unresolved monthly-versus-quarterly governance choice.

**Current repository data-plane routes:**

The management-plane routes in `PlatformOperatorAccessController` use `INTERNAL_API_SECRET`
plus an eligible human session. The separate customer data-plane controller is JWT-backed and
uses `OperatorSessionGuard` with `:orgId`:

| Route | Auth model | Reads tenant data? | Can take OperatorSessionGuard? |
|---|---|---|---|
| `GET /platform/operator/organizations/:orgId` | JWT human session | Yes — customer/member data | `read_customer_data` |
| `GET /platform/operator/organizations/:orgId/billing` | JWT human session | Yes — billing/payment data | `read_payments` |
| `POST /platform/operator-access/grants` | INTERNAL_API_SECRET + human session | No — creates a pending grant | Management plane |
| `POST /platform/operator-access/grants/:grantId/approve` | INTERNAL_API_SECRET + human session | No — updates grant status | Management plane |
| `POST /platform/operator-access/grants/:grantId/reject` | INTERNAL_API_SECRET + human session | No — updates grant status | Management plane |
| `GET /platform/operator-access/grants` | INTERNAL_API_SECRET + human session | No — lists grant metadata | Management plane |
| `DELETE /platform/operator-access/grants/:grantId` | INTERNAL_API_SECRET + human session | No — revokes grant | Management plane |
| `GET /platform/operator-access/logs` | INTERNAL_API_SECRET + human session | No — lists access-log metadata | Management plane |

`PlatformOperatorAdminService` also contains additional per-organization readers, but only the
customer and billing routes above are currently exposed. The repository proves those two route
bindings and focused behavior tests; it does not prove that every future data-plane route is
protected or that the deployed route set matches the repository.

Current enforcement level: DB schema + service + two repository data-plane routes. The guard
enforces per-request expiry, organization/scope matching, human-session identity, and audit-row
creation where applied. Deployed route coverage remains open.

### Decision required: policy parameters

The operator must choose:

| Parameter | Option A | Option B (recommended) | Option C |
|---|---|---|---|
| Session max duration | 1 hour | 4 hours | 8 hours |
| Approval requirement | 1 approver | 2 approvers (dual control) | Manager + security |
| Minimum reason length | 10 chars | 20 chars | free-text required |
| Ticket reference | optional | required | required + validated against issue tracker |
| Content-blind default | No (current) | Yes — explicit elevation per org | Yes — always |
| Audit granularity | Session-level | Per-request (current) | Per-request + diff of data accessed |
| Review cadence | Never | Monthly | Quarterly |
| Auto-expiry of pending grants | Never | 24 hours | 48 hours |

Current max grant duration: 4 hours (`MAX_GRANT_DURATION_MS` in `platform-operator-access.service.ts`).
The four-hour limit and pending-grant expiry sweep are implemented; named Product/Security approval
and the operator-selected pending-grant/review cadence remain required.

**Recommended defaults:** Option B throughout. Dual control prevents insider threat from a single
compromised operator account. 4-hour sessions cover a typical incident response window. 20-char
reason + ticket ref forces documentation. Monthly review catches grants left open.

### AWAITING OPERATOR APPROVAL

Record here: chosen parameters, approver name, date, rationale. Then update `MAX_GRANT_DURATION_MS`
in `platform-operator-access.service.ts` to match the chosen duration. Wire
`@UseGuards(JwtAuthGuard, OperatorSessionGuard)` + `@RequireOperatorGrant(scope)` to any new
JWT-authenticated routes reading per-org tenant data in the platform module.

---

## 2. Data inventory, lawful purpose and retention owner

**PRD requirement (§6):** "Approve data inventory, lawful purpose, retention owner and residency policy."

### Current implementation state

Tables with retention-related data:
- `hr_retention_policies` — exists; schema at `backend/src/db/schema/hr/governance.ts`. The
  `CronHrRetentionService` reads active policies and applies supported outcomes in bounded batches.
- `hr_legal_holds` + `organization_legal_holds` — exist and are enforced by `GdprService` and
  `purge-user.mjs`. Repository/dry-run legal-hold checks PASS 2026-09-01; deployed drill evidence remains open.
- `audit_logs.metadata` — stores contextual metadata per action. The `user.registered` action stores
  `{ email, companyName }` — this is PII. Operator must decide whether this is within the approved
  inventory and lawful basis.

**Data categories the system processes (from pg_catalog, 2026-09-01):**
- Identity: `users` (email, name, auth credentials)
- Employment: `hr_people`, `hr_employments`, `employee_salary_profiles`, `fin_bank_accounts`
- Payroll: `payroll_runs`, `payslip_publications`, bank account details
- Communication: `chat_messages`, `mail_message_metadata`, `notifications`, and queued attendance report emails from `hr/time/attendance-email-report.service.ts`
- Time: `attendance`, `timesheets`, `leave_requests`
- Documents: `candidate_documents_vault`, `documents`
- Financial: `expenses`, `invoices`, `salary_loans`
- Recruitment: `candidates`, `candidate_applications`, `candidate_offers`
- Sensitive workplace records: `biometric_logs`, `hr_wellness_checkins`,
  `hr_accommodation_requests`, `hr_safety_incidents`, and `hr_work_authorizations`
- AI processing: `ai_chat_conversations`, `ai_chat_messages`, `ai_feedback`, `ai_jobs`, and
  `ai_usage_logs`
- Knowledge base: `kb_chat_conversations`, `kb_chat_messages`, `kb_pages`, `kb_page_versions`,
  and `kb_article_chunks`
- Support: `support_tickets`, `support_ticket_messages`, `support_ticket_attachments`, and
  `support_csat_requests`
- Signatures: `sign_documents` and `sign_audit_events`
- Notifications: `notification_preferences`, `notification_consents`, `notification_deliveries`,
  `notification_outbox`, and `notification_digest_runs`
- Integrations and webhooks: `user_integration_connections`, `webhook_deliveries`, and
  `webhook_logs`
- Organization and collaboration metadata: `organizations`, `organization_members`,
  `calendar_events`, `event_attendees`, `project_meetings`, `meeting_attendees`, `projects`, and
  `project_members`

The detailed schema-backed inventory is maintained in
`architecture-refactor/DATA-CATALOGUE.md`; the reviewable row-based form is maintained in
`architecture-refactor/runbooks/data-map-template.md`. Neither is approval evidence until a
dated decision record is signed.

### Decisions required

**2a. Data inventory sign-off:**
The operator (DPO or equivalent) must review the categories above, confirm each is in scope of
processing, and sign the inventory. A template data map is in
`architecture-refactor/runbooks/data-map-template.md`; copy it to a dated controlled record
after the DPO review.

**2b. Lawful purpose per category:**
Each category needs a lawful basis under GDPR Art. 6 (contract, legal obligation, legitimate
interest, consent). The operator must choose one per category. Employment data is typically
Art. 6(1)(b) + Art. 9(2)(b); marketing is consent.

**2c. Retention owner:**
Each category needs a named owner accountable for enforcing the retention period.
Current state: `CronHrRetentionService` reads active `hr_retention_policies` per organization,
applies the supported employee/case/attendance/document/payroll outcomes in bounded batches, and
writes retention audit rows. Repository coverage is partial and deployed scheduling/execution
evidence is still required. The operator must name an owner for each category and approve the
policy periods.

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

### Additional inventory decisions required

The following policy choices are unresolved and must be recorded before the expanded inventory
can be approved:

| Decision | Options to record | Recommended default |
|---|---|---|
| Sensitive HR data and Art. 9 conditions | Permit each field with a documented condition; restrict collection; or remove the field | Restrict collection until the condition, access group and retention are approved |
| AI prompts, responses and usage | Retain for service history; retain only redacted metadata; or delete after processing | Delete prompts/responses after 90 days and retain non-content usage metadata for 2 years |
| Knowledge-base and support content | Category-specific periods and special-category handling | KB chat active account + 1 year; support closure + 2 years; derived chunks follow source deletion |
| Signature records | Statutory period, contract period, or shorter period | 7 years after document expiry or applicable statutory period |
| Notification consent and delivery records | Evidence period and operational message period | Consent evidence for processing period + 3 years; operational delivery records 90 days |
| Integrations and webhooks | Permitted payload classes, provider disclosures and deletion periods | Delete connections on disconnect; payloads 30 days; no unapproved special-category payloads |
| Organization, membership, calendar, meeting and project metadata | Owners, closure events and retention periods | Retain access/audit history only as required; delete collaboration content on approved closure-based periods |

### AWAITING OPERATOR APPROVAL

Record the decision maker, selected option, lawful basis, special-category condition where
applicable, retention period, owner and rationale for each additional inventory decision. Do not
mark any row approved based on this template or the repository catalogue alone.

---

## 3. Residency policy

**PRD requirement (§6):** Approve residency policy as part of data inventory decisions.

### Current implementation state

The checked-in example describes a primary region/cell and optional explicitly configured
secondary regions. The current production values and deployed placement are not established by
the repository alone. Redis uses `UPSTASH_REDIS_REST_URL`; object storage uses `R2_REGION`,
`R2_ENDPOINT`, and placement-specific settings.

**Cell-model implication:** The cell architecture supports per-region databases (`REGION_KEYS`,
`REGION_CELL_2_APP_DATABASE_URL`). An org can be placed in a specific cell via `cell:place-org`.
The source supports an `eu` region when its database, storage, and cell variables are explicitly
configured. No deployed EU cell or customer commitment is evidenced here.

### Decision required

| Option | What it means | What it requires |
|---|---|---|
| A — No residency guarantee (current) | Data remains in the configured deployment region; the repository does not establish the deployed region | Document the deployed region in ToS; no code change |
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
| Neon (postgres) | All tenant data | Configured deployment region; repository does not establish the deployed location | Primary database |
| Upstash | Session tokens, cache keys, rate-limit counters, permission-version numbers | Configurable (env) | Redis REST API |
| Cloudflare R2 | File uploads, exports, attachments | Configurable (env) | S3-compatible API |
| Resend | Email content + recipient addresses | Provider-configured region | SMTP/API |
| Ably | Realtime event payloads (channel names + message bodies) | Global (Ably edge) | WebSocket |
| OpenAI | LLM prompt content when `AI_LLM_PROVIDER=openai` and embeddings for KB RAG via `OPENAI_API_KEY` | Provider/deployment dependent | HTTPS API |
| Google | Chat prompt content when `AI_CHAT_PROVIDER=google` | Provider/deployment dependent | HTTPS API |
| OpenRouter | LLM or chat prompt content when `AI_LLM_PROVIDER=openrouter` or `AI_CHAT_PROVIDER=openrouter` | Provider and underlying model dependent | HTTPS API |
| ZeptoMail | Email content and recipient addresses when configured | Provider/deployment dependent | HTTPS API |
| Razorpay | Payment amount and customer billing contact data when configured | India/provider dependent | HTTPS API |
| Composio | Third-party integration credentials (OAuth tokens) | US | REST API |

Sources: `backend/src/modules/mail/resend.service.ts`, `backend/src/common/ably/ably.service.ts`,
`backend/src/modules/ai/core/providers/llm-provider.config.ts`,
`backend/src/modules/ai/core/services/chat-assistant-model.ts`,
`backend/src/modules/ai/core/providers/embeddings.service.ts`, `backend/src/modules/integrations/`.

### Decisions required

**4a. Standard contractual clauses (SCCs):**
For transfers from the EU/EEA to a provider or region outside the approved residency boundary
(including Resend, Ably, OpenAI, Google, OpenRouter, ZeptoMail, Razorpay, or Composio where applicable), the operator
must ensure SCCs or an equivalent adequacy mechanism is in place with each subprocessor.

**4b. Subprocessor list publication:**
GDPR requires informing data subjects of subprocessors. The operator must publish and maintain
this list.

**4c. AI data transfer:**
AI prompt content may contain personal data (names, employment details in HR AI features). The
operator must decide: (a) accept transfer to the AI provider's US infrastructure under SCCs, or
(b) use an EU-hosted model, or (c) strip PII from prompts before sending.
Current state: the shared AI gateway applies default regex redaction, but the streaming chat path also sends conversation content and requires separate minimization verification before approval.

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

## 5. Secret Rotation — ownership and evidence

**Derived from `backend/.env.example` (2026-09-01). Secret VALUES are never listed here — only names.**

| Secret name | Category | Owner | Rotation procedure | Evidence requirement |
|---|---|---|---|---|
| `DATABASE_URL` / `APP_DATABASE_URL` | Database credential | Platform DBA | Rotate in Neon console → update deployment env var → redeploy → verify health probe | Neon audit log screenshot; deployment redeploy timestamp |
| `BACKEND_JWT_SECRET` | Signing — user JWT | Platform security | Generate ≥44-char secret (`openssl rand -base64 48`) → update both backend and frontend env → rolling redeploy (existing sessions expire at their TTL) | Old secret must not appear in any log line post-rotation |
| `PORTAL_JWT_SECRET` | Signing — portal JWT | Platform security | Same as `BACKEND_JWT_SECRET`; must differ from it | Same |
| `INTERNAL_API_SECRET` | API auth — operator panel | Platform security | Generate ≥32-char secret → update backend and any admin panel env → verify platform operator-access routes reject old secret | Manual rotation test: call `POST /platform/operator-access/grants` with old secret, expect 401 |
| `ENCRYPTION_KEY` | Encryption at rest (payment, PII) | Platform security | DECISION REQUIRED — key rotation requires re-encrypting all encrypted columns. No rotation procedure exists yet. Minimum: ≥32 chars hex. | Before any rotation: audit all encrypted columns; implement re-encryption job. |
| `CRON_SECRET` | Cron endpoint auth | Platform ops | Rotate in deployment env → update cron trigger config | Cron trigger config updated in CI |
| `ZEPTOMAIL_TOKEN` / `RESEND_API_KEY` | Provider — email | Platform ops | Rotate in ZeptoMail/Resend console → update env → send test email | Successful transactional email delivery after rotation |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Cache credential | Platform ops | Rotate in Upstash console → update env → verify `GET /health/ready` | Health probe passes; no `42501` errors in logs |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | Storage credential | Platform ops | Rotate in Cloudflare console → update env → verify file upload/download | Storage integration test passes |
| `ABLY_API_KEY` | Realtime credential | Platform ops | Rotate in Ably console → update env → verify realtime connection | Realtime connection test in staging |
| `PLACEMENT_SIGNING_KEY` | Cell placement JWT | Platform security | Issue new key with new `PLACEMENT_SIGNING_KEY_ID` → set `PLACEMENT_SIGNING_KEY_PREVIOUS` to outgoing key → redeploy → drain existing sessions (at most 24h) → remove PREVIOUS | Verify `cell:replica` passes after rotation |
| `NEON_API_KEY` | Neon management API | Platform DBA | Rotate in Neon console | `pnpm -C backend drill:pitr:self-test` passes |
| `AI_CONFIRMATION_SECRET` | AI confirmation signing | Platform security | Same as JWT secrets | AI confirmation endpoint rejects old secret |

**Note on `ENCRYPTION_KEY`:** Rotation is a DECISION REQUIRED item. The application refuses to boot without it, but no key rotation procedure exists. Until a re-encryption job is implemented, the key must be treated as permanent. Operator must decide: (a) accept the current state and document it, or (b) commission the re-encryption job before any rotation.

---

## 6. End-to-End GDPR Compliance Drill Workflow

**Context:** The four drills were each exercised individually on 2026-09-01. Ticket S05 requires fresh deployed evidence for the complete end-to-end workflow.

**Repository status (2026-09-01):** `backend/src/scripts/compliance-drill-e2e.mjs` exists and
has self-test/live dry-run commands, but no redacted deployed evidence bundle is committed.
Repository focused S05 tests also pass 48 suites / 617 tests for the current operator, GDPR,
retention, purge, and scheduling implementation. Commands:

```bash
# Verify each assertion bites (no DB required)
node backend/src/scripts/compliance-drill-e2e.mjs --self-test

# Full dry-run against live DB (auto-discovers a test subject)
node --env-file-if-exists=backend/.env backend/src/scripts/compliance-drill-e2e.mjs

# With explicit subject and org
node --env-file-if-exists=backend/.env backend/src/scripts/compliance-drill-e2e.mjs \
  --subject keeper-c5b82e53@test.invalid --org c5b82e53-e69e-4937-ace8-1126ae3c0c7f
```

**All commands run as dry-run / rolled-back transactions. Nothing is committed unless `--execute --i-know-what-im-doing` is passed to the individual drills.**

### Pre-flight checks

```bash
# Verify the app role can connect
cd backend
node --input-type=module << 'EOF'
import { config } from 'dotenv';
config({ path: '.env' });
import postgres from 'postgres';
const sql = postgres(process.env.APP_DATABASE_URL, { ssl: 'require', max: 1 });
const r = await sql`SELECT current_user, app.current_org_id_or_null() AS guc`;
console.log('app role:', r[0]);
await sql.end();
EOF

# Verify legal hold machinery is live
pnpm -C backend drill:erasure:self-test
# Expected: exit 0
```

### Step 1 — Legal hold drill (commits real rows, then releases them)

```bash
# Use a test subject email and org id from your staging/test data
SUBJECT_EMAIL="gdpr-drill-$(date +%Y%m%d)@test.invalid"
ORG_ID="<your-test-org-id>"

pnpm -C backend drill:legal-hold "$SUBJECT_EMAIL" "$ORG_ID"
# Expected: RESULT: PASS (the drill's reported checks pass; do not hard-code a count here)
# This commits and releases real hold rows. Confirm no orphan holds remain:
node --input-type=module << 'EOF'
import { config } from 'dotenv'; config({ path: '.env' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const r = await sql`SELECT COUNT(*) FROM hr_legal_holds WHERE released_at IS NULL`;
console.log('active HR holds:', r[0].count);
await sql.end();
EOF
```

### Step 2 — Export drill (dry-run — no data file produced)

```bash
pnpm -C backend drill:export "$SUBJECT_EMAIL"
# Expected: RESULT: PASS with all declared source sections and cross-tenant isolation
```

### Step 3 — Erasure drill (dry-run — rolled back)

```bash
pnpm -C backend drill:erasure "$SUBJECT_EMAIL"
# Expected: RESULT: PASS — dry-run complete (rolled back; 0 residual row(s) in simulation)
# Note: org owner cannot be erased without ownership transfer first.
```

### Step 4 — Compliance audit trail drill (dry-run — rolled back)

```bash
pnpm -C backend compliance:drill
# Expected: All required audit actions present. Dry run complete — transaction rolled back.
```

### Step 5 — Verify audit trail immutability

```bash
# Confirm no DELETE/UPDATE on audit_logs via the code-level spec
node ./node_modules/jest/bin/jest.js src/modules/platform/audit-log-immutability.spec.ts --maxWorkers=1 --no-coverage
# Expected: the focused audit immutability suite passes

# Confirm streamline_app privileges on audit_logs (read-only probe)
# Preferred verifier (uses APP_DATABASE_URL and also checks the enabled trigger):
node --env-file-if-exists=.env src/scripts/verify-audit-log-privileges.mjs
# The inline DATABASE_URL probe below is retained only as historical context;
# do not use the owner connection as evidence for application-role privileges.
node --input-type=module << 'EOF'
import { config } from 'dotenv'; config({ path: '.env' });
import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require', max: 1 });
const priv = await sql`
  SELECT privilege_type FROM information_schema.role_table_grants
  WHERE table_schema='public' AND table_name='audit_logs' AND grantee='streamline_app'
  ORDER BY privilege_type
`;
console.log('streamline_app privileges on audit_logs:', priv.map(r => r.privilege_type));
await sql.end();
EOF
# Recorded result from the configured environment (2026-09-01): role=streamline_app, UPDATE=false, DELETE=false, trigger_present=false.
# The result above supersedes any earlier privilege snapshot in this runbook; the remaining P1 is the absent enabled trigger, not app-role UPDATE/DELETE grants.
# FINDING P1: the enabled append-only trigger is absent — see §Handoffs; the configured
# application role already reports UPDATE=false and DELETE=false.
```

### Step 6 — Object storage erasure (manual — not scripted)

```bash
# 1. Run the storage key audit to find blobs for the subject
node src/scripts/audit-storage-keys.mjs --subject "$SUBJECT_EMAIL"
# 2. For each key returned, manually delete from R2:
#    wrangler r2 object delete $R2_BUCKET_NAME <key>
# 3. Confirm no remaining blobs for subject
# Note: the automated storage purge adapter is required by Ticket S05.
```

### Pass/fail criteria

| Step | Pass criterion |
|---|---|
| Legal hold | 8/8 checks pass; no orphan holds after release |
| Export | RESULT: PASS; 0 cross-tenant rows |
| Erasure | RESULT: PASS; 0 residual rows in simulation |
| Compliance audit | All required audit actions present |
| Immutability | Focused specs pass; application-role verifier confirms denied UPDATE/DELETE; trigger deployment remains open |
| Object storage | Adapter enumerates/deletes/retries/verifies keys in code; deployed provider evidence and failed-key evidence are still required |

### Known gaps owned by Ticket S05

1. Export worker is resumable by stable per-section cursor and covers the declared repository sources, including reporting-line history; object bytes, sources outside the repository catalog, and deployed evidence are still required.
2. Object storage purge enumerates all pages, retries failed deletes, and verifies absence when the adapter exposes `fileExists`; live configuration and immutable evidence are missing, and failed keys remain release-blocking.
3. Database rows adapter physically deletes the organization row after adapter confirmation and
   retains detached platform audit evidence; deployed database and dependent-row evidence remain required.
4. `CronHrRetentionService` reads `hr_retention_policies` and the coverage matrix has no unclassified measured high-growth table, but deployed scheduling/execution and policy-owner approval are not evidenced.

5. Retention scheduling is only partially wired in the repository: HR policy retention,
   notification retention, and AI-usage retention have authenticated, leased cron routes;
   AI usage explicitly invokes the non-dry-run sweep. The source-level contract is covered by
   `backend/src/modules/cron/__tests__/s05-retention-scheduling-contract.spec.ts`. A deployed
   scheduler identity, cadence, successful run, failure alert, and retry evidence are still
   required for the S05 gate.

6. Downstream purge status is explicit rather than inferred. The organization purge registry
   reports cache and Postgres-side search as `NOT_APPLICABLE`, deletes and verifies the
   repository's `kb_article_chunks` vector source, and returns `FAILED` for analytics copies,
   provider mirrors, and backups until configured adapters and verification evidence exist.
   These outcomes are covered by `organization-purge-adapters.spec.ts`; they do not prove that
   external caches, warehouses, provider accounts, or backup/PITR copies are absent.

---

## Evidence trail

Once each section above is approved, copy
`architecture-refactor/decisions/README.md` to a dated decision record in
`architecture-refactor/decisions/privacy-YYYY-MM-DD.md` with:
- Item number (1–4)
- Decision maker name + role
- Chosen option
- Date of decision
- Any deferred items with target date

No item in this document may be marked DONE in `OPERATOR-EVIDENCE.md` without that signed record.
