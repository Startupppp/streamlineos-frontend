# S05 approval and evidence record — AI and integration provider approvals (PRD-C185)

> **UNSIGNED DRAFT — NOT AN APPROVAL. NO PROVIDER BELOW IS APPROVED.**
> Every field except the signatures has been authored from measured evidence so that a human
> has only to review, choose, and sign. No signature, name, approval reference or decision
> status in this file has been supplied by any accountable person. **This record enumerates
> providers; it does not approve them.** Until the signature rows are filled in by the named
> humans themselves it satisfies nothing: it is an input to PRD-C185, not the approval
> PRD-C185 asks for.
>
> Authored 2026-09-03 by an automated agent working ticket 35 (PRD-C185). The provider list was
> enumerated from the **code that actually calls each provider** — the gateway, adapter and
> service sources plus `backend/.env.example` and `package.json` — not from a prior list.
> The agent is not Product, Security, Privacy/DPO, Operations, Legal or Finance and has not
> signed as any of them.

## Decision identity

- Record ID: `S05-PROVIDER-APPROVALS-001`
- Decision date (UTC): _blank — the date the approvers below actually sign_
- Review/expiry date: _proposed_ 12 months from signature, or immediately on adding any
  provider, changing `AI_LLM_PROVIDER` / `AI_CHAT_PROVIDER` / `EMAIL_PROVIDER`, or enabling a
  new Composio toolkit — whichever is sooner
- Decision status: _blank — `approved` / `approved-with-conditions` / `rejected` / `deferred`_
- Scope: the **15 external providers** reachable from backend commit `45f8a2e99` on branch
  `release/code-10-10-v2`. All organizations, all regions. Environments: every environment
  running this commit with the corresponding credential set.

## Accountable approval

| Function | Name | Role/title | Decision | Date | Signature or approval reference |
|---|---|---|---|---|---|
| Product | | | | | |
| Security | | | | | |
| Privacy/DPO | | | | | |
| Operations | | | | | |
| Legal | | | | | |
| Finance | | | | | |

---

## The register

**Region column, read honestly.** No provider region is established by repository
configuration. `PRIMARY_REGION=primary` is a label, `R2_REGION=auto` lets Cloudflare choose,
and every other provider's region follows the credential issued to it. Where a cell says
"deployment-determined" that is the finding, not an omission.

| # | Provider | Called from (verified) | Personal data it receives | Region | Retention at the provider | Transfer basis |
|---|---|---|---|---|---|---|
| P1 | **Neon** (Postgres) | `DATABASE_URL` | **Everything in DATA-CATALOGUE** — 296 personal-data columns across 136 tables, including encrypted PAN/national ID and plaintext salary, `blood_group`, disciplinary and grievance records | deployment-determined; `PRIMARY_REGION=primary` is a **name, not a geography** | Provider-determined + the PITR window | **DECISION REQUIRED** |
| P2 | **Cloudflare R2** | `@aws-sdk/client-s3`, `R2_ENDPOINT`, `region.config.ts:235` | Every uploaded and generated file: CVs, ID scans, payslip PDFs, signed documents, avatars, interview recordings, feedback screenshots, GDPR export bundles | **`R2_REGION=auto` — Cloudflare chooses** | **Indefinite — nothing is ever deleted by the platform** (the purge adapter returns `FAILED`) | **DECISION REQUIRED** |
| P3 | **Upstash** (Redis) | `@upstash/redis`, `UPSTASH_REDIS_REST_URL` | Session tokens, permission versions, rate-limit counters, AI retention cursors | per-URL, deployment-determined | TTL-bounded | **DECISION REQUIRED** |
| P4 | **ZeptoMail** (Zoho) | `EMAIL_PROVIDER=zeptomail` (**the default**), `ZEPTOMAIL_API_URL=https://api.zeptomail.in/v1.1/email` | Recipient address, subject, **full body** — payslip notices, invitations, offer letters, password resets | **`.in` endpoint — India** | Provider-determined | India; **Zoho DPA to execute** |
| P5 | **Resend** | `resend@^6.16.0`, `EMAIL_PROVIDER=resend` | as P4 | Provider-determined | Provider-determined | **DECISION REQUIRED** |
| P6 | **Twilio** | `twilio.gateway.ts:53` → `https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages` | **Phone number and full message body**, SMS and WhatsApp | Provider-determined | Provider-determined | **DECISION REQUIRED** |
| P7 | **Ably** | `ably@^2.23.0`, `realtime/ably.service.ts` | Realtime channel names (**they embed org and user ids**) and message bodies | global edge | transient | SCCs required for EU data |
| P8 | **OpenAI** | `@langchain/openai`, `llm-provider.config.ts:41-42`, `embeddings.service.ts` | Prompts, and **all KB/support embeddings — always**, even when `AI_LLM_PROVIDER=openrouter` (the code states this: "OpenRouter has no embeddings endpoint — set `OPENAI_API_KEY` even when `AI_LLM_PROVIDER=openrouter`") | Provider-determined | Provider-determined; **zero-retention terms to confirm** | **DECISION REQUIRED** |
| P9 | **Google Generative AI** | `@ai-sdk/google`, `AI_CHAT_PROVIDER` — `.env.example:163` documents **`google (default)`** | Chat prompt content | Provider-determined | Provider-determined | **DECISION REQUIRED** |
| P10 | **OpenRouter** | `llm-provider.config.ts:14` → `https://openrouter.ai/api/v1` | Prompts — **then forwarded to an underlying model provider that OpenRouter selects** | **A double hop; the terminal processor is not knowable from configuration** | depends on the terminal model | **Recommend: DO NOT ENABLE for personal data** until the model allow-list is fixed and disclosed |
| P11 | **Composio** | `@composio/core@^0.14.0`, `integrations/core/composio.gateway.ts`; `COMPOSIO_AUTH_CONFIG_GMAIL` / `_OUTLOOK` / `_GOOGLE_CALENDAR` | OAuth tokens **and, through the Gmail / Outlook / Google Calendar toolkits, mailbox and calendar content** — including correspondence with third parties who never consented to this platform | US-based SaaS; **endpoint is set by the SDK and is not pinned in repository configuration** | Provider-determined | SCCs + **user-facing disclosure required** |
| P12 | **Razorpay** | `razorpay.adapter.ts:124` → `https://api.razorpay.com/v1/orders` | Customer email, amount, payment signature | **India** | Statutory (RBI / PA-PG rules) | India |
| P13 | **Cloudflare Turnstile** | `turnstile.service.ts:42` → `https://challenges.cloudflare.com/turnstile/v0/siteverify` | **Visitor IP address** and challenge token | Cloudflare global | transient | **DECISION REQUIRED** |
| P14 | **Web Push (VAPID)** | `web-push@^3.6.7`, `realtime/web-push.service.ts:28,82` | Push endpoint (**identifies the browser/device**) and notification body → **Google FCM / Mozilla / Apple**, whichever the subscriber's browser names | browser-vendor-determined | transient | **DECISION REQUIRED** |
| P15 | **TURN/STUN relay** | `TURN_URLS`, `GET /realtime/ice-servers` | **Relayed audio/video and the participants' IP addresses** for huddle calls across strict NATs | operator-configured; **unset by default** | transient | **DECISION REQUIRED** |

**The register is not published.** `subprocessors` and `subprocessor_subscribers` exist as
tables and are **empty, with no application code reading or writing them** — the only reference
in the repository is a column name in `scan-legacy-org-actors.mjs:59`. Populating them from this
table is condition **C-5** below.

---

## Decision

### 1. Which providers are approved, and for what data

Nothing is approved by this document. The recommendation put to the signers is a **tiering**,
because approving fifteen providers as one block is how a subprocessor list stops meaning
anything:

| Tier | Providers | Recommended position |
|---|---|---|
| **Core infrastructure** — no product without them | P1 Neon, P2 R2, P3 Upstash | Approve, **conditional on a declared and pinned region** (C-1) |
| **Communications** | P4 ZeptoMail, P5 Resend, P6 Twilio, P7 Ably, P14 Web Push | Approve, conditional on DPAs and on P4-vs-P5 being an explicit choice rather than an env var toggled per deployment |
| **Payments** | P12 Razorpay | Approve — India-resident, statutory retention, narrow data set |
| **Edge security** | P13 Turnstile | Approve — receives an IP and a token, nothing else. Note it fires on **marketing-site forms**, so it is the platform acting as controller |
| **AI** | P8 OpenAI, P9 Google | Approve **only for the redacted path**, conditional on C-3 and C-4 below |
| **AI relay** | P10 OpenRouter | **Recommend: do not approve for personal data.** The terminal processor is unknowable from configuration, which makes a subprocessor list naming "OpenRouter" incomplete by construction |
| **Integrations** | P11 Composio | Approve **only with user-facing disclosure** — it carries mailbox and calendar *content*, not just tokens, and the correspondents have no relationship with this platform |
| **Realtime relay** | P15 TURN | Defer — unset by default; approve when an operator configures one, since the relay sees participants' IPs and media |

### 2. PII minimization — measured, and it does not hold

**The redaction layer is real and on by default.** `preflightCall`
(`ai-gateway-runner-call.ts:76-82`) applies `redactSensitiveData` to both the system and user
prompt unless the caller passes `redact: false`. This is a genuine control, not an aspiration.

**What it actually catches.** `redaction.util.ts` holds six regexes: email, US SSN
`\d{3}-\d{2}-\d{4}`, a NANP-shaped phone, a 13–19 digit card run, `Bearer` tokens, and
`sk-`/`ghp-`/`xox*` API keys. Probed 2026-09-03 by loading the real module and stripping only
its type annotations, so the shipped regexes executed
(`.../data-catalogue-c183/ai-redaction-probe.txt`, exit 0):

| Probe | Result |
|---|---|
| PAN `ABCDE1234F`, Aadhaar (spaced and solid), UAN, **GSTIN**, IFSC | **all pass through** |
| Indian mobile `+91 98765 43210` **and bare `9876543210`** | **pass through** |
| Person name, postal address, date of birth, passport `M1234567`, blood group, salary | **all pass through** |
| Email, US SSN, US phone, card number, Bearer token, API key | redacted (6 of 6 controls) |

**14 of 20 probe strings reached the provider unredacted.** The layer is **US-shaped**: it
catches nothing in the Indian identifier set that DATA-CATALOGUE §7 shows this platform is
built to store. That is a scoping gap, not an absent control — **D8**.

**Eleven production call sites disable redaction outright** (`redact: false`; twelve matches in
`src/`, one a spec):

```
payroll/insights/payroll-ai-explain.service.ts:129
accounting/ai/accounting-ai.service.ts:44,144,198,218
inventory/ai/inv-ai-explain.service.ts:166,233,283,409
timesheets/core/timesheets-ai.service.ts:83
feedbucket/feedbucket-ai.service.ts:233
```

The payroll one is the sharpest. Inspection of its payload builder (`:107-121`) shows it sends
**amounts and component names, not direct identifiers** — gross pay, total deductions, net pay
and every earning/deduction line-item name. That is a real minimization and it should be
credited. It is nonetheless **compensation data about an identifiable employee, sent to a
third-country provider, with redaction explicitly switched off**, and no signer should approve
it without being told so in those words.

**Recommended minimization decisions:**

| # | Item | Recommendation |
|---|---|---|
| M1 | Extend `redactSensitiveData` | Add PAN, Aadhaar, UAN, IFSC, GSTIN and `+91`/bare-10-digit Indian mobile patterns. **Until then, no Indian HR or payroll data should reach any AI provider** |
| M2 | The 11 `redact: false` sites | Each must carry a written justification in the record, or be flipped back to redacted. An opt-out with no stated reason is not a minimization decision |
| M3 | `crm_call_analyses` | **Preserve the existing design** — it stores a transcript *hash* and derived features, not the transcript. State this in the DPA as a minimization commitment |
| M4 | Embeddings (P8) | Every KB/support embedding goes to OpenAI regardless of `AI_LLM_PROVIDER`. Disclose this; it is invisible from the provider setting |
| M5 | Feedbucket (D21) | `console_logs` / `network_logs` are captured from an end user's browser and then **sent to an AI model**. They routinely contain bearer tokens, session identifiers and other people's data. Scrub on ingest before any AI call |

### 3. Retention and deletion at the provider

| Provider | Retention today | Recommended |
|---|---|---|
| P1 Neon | provider-determined + PITR | Pin the PITR window and state it; a backup is a copy that survives erasure |
| P2 R2 | **indefinite — nothing is ever deleted** | **Build the purge adapter.** This is the single largest deletion gap in the platform |
| P3 Upstash | TTL-bounded | Acceptable as-is; confirm no persistence beyond TTL |
| P4–P6 email/SMS | provider-determined | Contract for the shortest log retention the provider offers |
| P8–P10 AI | provider-determined | **Zero-retention / no-training terms are the condition of approval**, not a nice-to-have |
| P11 Composio | provider-determined | Confirm token and content retention; confirm deletion on disconnect |
| P12 Razorpay | statutory | Accept — RBI rules govern |
| P13, P14, P15 | transient | Confirm no logging of IPs beyond the request |

**The deletion position must be stated plainly to the signers:** the compliance drill
(exit 0, `runs/01-compliance-drill-execute.txt`) self-reports that the **object-storage purge
adapter returns `FAILED` ('not yet implemented, manual cleanup required')**. Every file at P2 —
every CV, payslip PDF, ID scan, interview recording and export bundle — is `MANUAL`. No
provider-deletion commitment can be honoured through the product today.

### 4. Disclosure

| Audience | What must be disclosed | State today |
|---|---|---|
| Customers (controllers) | The subprocessor list, with region and data category | **Nothing published**; the tables are empty |
| Customers | 30 days' notice before a new subprocessor | No mechanism |
| Data subjects | That prompts may reach OpenAI / Google, and that KB content is embedded at OpenAI | Not disclosed |
| Data subjects | That sales calls are analysed by a model, **which is also employee monitoring of the rep** | Not disclosed |
| End users | That feedbucket captures console and network logs from their browser | **Not disclosed at capture** |
| Users connecting a mailbox | That Composio receives mailbox and calendar **content** | Understated as "OAuth tokens" in earlier revisions |

---

## Evidence index

| Evidence | Commit/environment | Timestamp (UTC) | Result | Artifact path or hash |
|---|---|---|---|---|
| Provider enumeration from source | backend `45f8a2e99` | 2026-09-03 | 15 providers, each located in the calling source file or `package.json` | this register |
| AI redaction probe (real module) | backend `45f8a2e99` | 2026-09-03T16:36:33Z | **exit 0 — 14 of 20 unredacted**; 6 of 6 controls caught | `.../data-catalogue-c183/ai-redaction-probe.txt` |
| Probe script | backend `45f8a2e99` | 2026-09-03 | loads `redaction.util.ts` itself; no transcription of the regexes | `.../data-catalogue-c183/ai-redaction-probe.mjs` |
| `grep -rn "redact:\s*false" src/` | backend `45f8a2e99` | 2026-09-03 | 12 matches — **11 production sites**, 1 spec | listed in §2 |
| `npm run compliance:drill` | backend `45f8a2e99`, local | 2026-09-03T16:20:30Z | **exit 0**; object-storage purge adapter self-reported `FAILED` | `.../RB-10-privacy-compliance/runs/01-compliance-drill-execute.txt` |
| Provider config defaults | backend `45f8a2e99` | 2026-09-03 | `EMAIL_PROVIDER=zeptomail`, `ZEPTOMAIL_API_URL` `.in`, `R2_REGION=auto`, `PRIMARY_REGION=primary`, `AI_CHAT_PROVIDER` documented `google (default)` | `backend/.env.example:95-96,152,163,164,264` |
| **Provider region attestations** | — | — | **NOT OBTAINED — requires each provider's contract or console, neither reachable from this machine** | none |
| **Deployed egress verification** | — | — | **NOT RUN — no deployed environment exists on this machine.** Which regions traffic actually reaches is unverified | none |

## Conditions and residual risk

| # | Condition or risk | Owner | Due date | Mitigation | Release-authority disposition |
|---|---|---|---|---|---|
| C-1 | **No provider region is established by configuration.** `PRIMARY_REGION=primary`, `R2_REGION=auto` | Operations / Legal | | Declare and pin regions before approving P1–P3 | |
| C-2 | **P2 R2 retention is indefinite; the purge adapter returns `FAILED`** | Platform | | Build the adapter | **Recommend: blocks any provider-deletion commitment** |
| C-3 | **AI redaction is US-shaped — every Indian identifier passes** (M1) | AI / Security | | Extend the pattern set | **Recommend: blocks AI on Indian HR/payroll data** |
| C-4 | **11 production sites disable redaction**, one sending compensation data (M2) | AI / module owners | | Justify each in writing or revert it | |
| C-5 | **Subprocessor register empty and unwired** | Privacy / Legal | | Populate from this table; wire notice; publish | |
| C-6 | **P10 OpenRouter's terminal processor is unknowable** | Privacy / Legal | | Fix a model allow-list, or do not enable for personal data | |
| C-7 | **P11 Composio carries mailbox and calendar content**, not just tokens | Integrations / Privacy | | User-facing disclosure + SCCs | |
| C-8 | **Provider regions and egress are unverified** — no deployed environment | Operations | | Verify in a deployed environment | **Cannot be closed from this machine** |

## Attestation

I confirm that this decision covers the stated scope, that the evidence index is accurate and
redacted appropriately, and that deferred conditions remain tracked.

- Release authority:
- Name/title:
- Date:
- Signature or approval reference:
