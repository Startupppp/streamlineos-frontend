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

Migration `0747` applied. Tables: `platform_operator_access_grants` — schema at
`backend/src/db/schema/common/platform-operator-grants.ts`. `assertGrant` requires
`status = 'active'`. DB CHECK `approver_id != granted_by` is convalidated (no self-approval).

**What IS built (2026-09-01):**
- `PlatformOperatorAccessService` — full grant lifecycle: create, approve (dual-control), reject,
  revoke, assertGrant (checks status + expiry + revokedAt in one query), assertAndLog (asserts +
  writes `operator_access_log`). 34 tests pass, all four guard behaviors proven with bite proofs.
- `OperatorSessionGuard` — reads `req.user.userId` (JWT sub) + `:orgId` route param, calls
  `assertAndLog`, writes a log row on every privileged call. 7 tests, all bite proofs labeled.
- `@RequireOperatorGrant(scope)` — decorator, attached to the guard via `Reflector`.

**What is NOT built:**
- No `OperatorAuditInterceptor` — individual API calls are logged by the guard, but a
  dedicated interceptor (diffing data accessed) is not implemented.

**Why the guard is attached to no route — a route-by-route decision:**

All routes in `PlatformOperatorAccessController` use `INTERNAL_API_SECRET` header auth (no JWT).
The `OperatorSessionGuard` reads `req.user?.userId` (set by `JwtAuthGuard`), so the two auth
models are incompatible. Bolting the guard onto an `INTERNAL_API_SECRET` route would cause it to
throw `UnauthorizedException` on every request since `req.user` is always undefined there.

| Route | Auth model | Reads tenant data? | Can take OperatorSessionGuard? |
|---|---|---|---|
| `POST /platform/operator-access/grants` | INTERNAL_API_SECRET | No — creates a pending grant | No: no JWT user |
| `POST /platform/operator-access/grants/:grantId/approve` | INTERNAL_API_SECRET | No — updates grant status | No: no JWT user |
| `POST /platform/operator-access/grants/:grantId/reject` | INTERNAL_API_SECRET | No — updates grant status | No: no JWT user |
| `GET /platform/operator-access/grants` | INTERNAL_API_SECRET | No — lists grant metadata | No: no JWT user |
| `DELETE /platform/operator-access/grants/:grantId` | INTERNAL_API_SECRET | No — revokes grant | No: no JWT user |
| `GET /platform/operator-access/logs` | INTERNAL_API_SECRET | No — lists audit log metadata | No: no JWT user |
| `GET /health/workflows` | INTERNAL_API_SECRET | No — infrastructure read | No: no JWT user |
| `GET /health/db` | INTERNAL_API_SECRET | No — infrastructure read | No: no JWT user |
| `POST /internal/audit` | INTERNAL_API_SECRET | No — writes audit log | No: no JWT user |

`PlatformAdminService` has methods that read per-org business data (`listCustomers`,
`getCustomerBySlug` with `users.email`/`users.name`, `listMessages`, `listLeads`, `listPayments`),
but these are not exposed via any HTTP controller. When those routes are wired (under JWT auth +
`:orgId` param), `OperatorSessionGuard` + `@RequireOperatorGrant(scope)` can be applied directly.

**Guard is architecturally correct and fully tested.** The absence of compatible routes to attach it
to is not a guard defect — it reflects the current state of the admin surface. The INTERNAL_API_SECRET
pattern is appropriate for the management plane (grant lifecycle); the guard is appropriate for the
data plane (operator reading customer data under an active grant). They are different surfaces and
require different auth models.

Current enforcement level: DB schema + `PlatformOperatorAccessService` layer. Guard enforces
per-request expiry and writes audit rows wherever it is applied.
Application layer enforcement: guard is tested and ready; awaiting compatible routes.

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

Current max grant duration: 24 hours (`MAX_GRANT_DURATION_MS` in `platform-operator-access.service.ts`).
The recommended value is 4 hours. This is an engineering change requiring the operator's sign-off.

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

**Status (2026-09-01):** `backend/src/scripts/compliance-drill-e2e.mjs` is built and verified.
It runs all five phases as a single ordered workflow against the live DB. Self-test PASS (8/8
assertion bite proofs). Live dry-run PASS (13/13 checks). Commands:

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
# Expected: RESULT: PASS (8 passed, 0 failed)
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
# Expected: RESULT: PASS — 6 checks including cross-tenant isolation
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
# Expected: 6 passed

# Confirm streamline_app privileges on audit_logs (read-only probe)
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
# Current result (2026-09-01): DELETE, INSERT, SELECT, UPDATE
# FINDING P1: DELETE and UPDATE should be revoked — see §Handoffs
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
| Immutability | 6 specs pass; privilege list noted for migration handoff |
| Object storage | DECISION REQUIRED — manual until adapter is implemented |

### Known gaps owned by Ticket S05

1. Export worker not implemented — `hr_data_requests` tracks requests; no worker produces an actual data file.
2. Object storage purge adapter returns FAILED — not yet implemented.
3. Database rows adapter marks `statusV2=PURGED` as a soft flag only — physical deletion not implemented.
4. No background retention-sweep service — `hr_retention_policies` are inserted but no worker reads them.

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
