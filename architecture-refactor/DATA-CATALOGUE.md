# DATA-CATALOGUE.md — Personal Data Inventory

**Status: AWAITING OPERATOR APPROVAL. Nothing in this file is approved.**
**Criterion: PRD-C183 — purpose, lawful basis, subjects, processors, location, retention, owner and deletion behaviour.**
**Revision: 3 (2026-09-03).** Revision 1 (2026-09-01) was derived from `backend/src/db/schema/**`.
Revision 2 re-derived it from the live catalog. **Revision 3 re-scanned the catalog independently,
diffed the result against this file's own text, added the twenty-four uncatalogued tables in §13,
and corrected four of revision 2's own claims (§1.1) — including two evidence citations that
pointed at files which do not exist.**
**Derived from: `information_schema` on `scratch_head_1010` (REACHED_HEAD 677/677), backend source at `release/code-10-10-v2`, `backend/.env.example`.**

Each entry maps a personal-data class to purpose, lawful basis, data subjects, processor,
processing location, retention, owner and deletion behaviour.

Where retention is genuinely a policy choice the cell reads `DECISION REQUIRED` with a
recommended default and the reason. **That is the honest cell.** Where a statute sets a floor,
the statute is named and the cell is not a decision — only the exact period, where the statute is
silent or state-specific, is referred to Legal.

No policy in this file is approved without a signed record in `architecture-refactor/decisions/`.
Two unsigned records accompany this revision and were **written by revision 3** —
revision 2 referenced them but neither file existed:
`decisions/privacy-C184-pii-policy.md` and `decisions/privacy-C185-provider-approvals.md`.

---

## 0. Scan method and coverage

The inventory was enumerated from the live catalog, not from the ORM schema files, so that
columns which drifted away from the declared schema are caught.

```
psql scratch_head_1010 -> information_schema.columns / information_schema.tables
```

| Measure | Value |
|---|---|
| Non-system schemas | 4 — `public`, `build`, `build_events`, `drizzle` |
| Base tables scanned | **1,027** — `public` 944, `build` 80, `build_events` 3 (`drizzle` = 1 migration-bookkeeping table, excluded) |
| Columns scanned | **13,536** — `public` 12,580, `build` 929, `build_events` 27 |
| **Direct/sensitive personal-data columns found** | **244**, across **109 tables** (`public` 241/106, `build` 3/3) |
| Columns matching any personal-data pattern (broad sweep, `public`) | **2,030** across 700+ tables |

The broad sweep decomposes as: 746 person-reference foreign keys across 483 tables
(`user_id`, `created_by`, `approved_by`, `assigned_to`, `actor_id`, …), 602 free-text columns
across 432 tables (`notes`, `body`, `description`, `reason`, `comment`, …), 239 generic `name`
columns across 228 tables, and 443 columns in the fifteen named identifier classes below.

| Identifier class | Columns | Tables |
|---|---|---|
| Address / locality | 97 | 62 |
| Email | 68 | 53 |
| Credential / token | 66 | 45 |
| Compensation | 46 | 23 |
| Phone / WhatsApp | 27 | 21 |
| Health, gender, nationality (raw match) | 26 | 17 |
| Government identifier (PAN, TAN, GSTIN, ESI, passport, national ID) | 25 | 11 |
| Bank / payment instrument | 23 | 17 |
| IP, user-agent, device | 21 | 16 |
| Person name (first/last/emergency contact) | 19 | 12 |
| Photo / avatar | 8 | 8 |
| Biometric | 5 | 5 |
| Signature | 5 | 4 |
| Geolocation (lat/lng) | 4 | 2 |
| Date of birth | 3 | 3 |

**Two limits of the method, stated plainly.** (1) Name-pattern matching over-matches: of the 26
"health" hits, 14 are customer-success `health_score` / `health_status` columns that are not health
data at all, and they are excluded below. (2) It cannot see personal data inside `jsonb` or
free-text columns. The 602 free-text and 45 `jsonb` columns are handled as a class in §12 rather
than column by column, because their contents are user-supplied and unbounded.

### 0.1 Revision 3 re-scan — independent, and it does not agree with revision 2

Revision 3 re-ran the sweep with a wider and differently-ordered pattern set, then did the step
revision 2 did not: **it diffed the tables it found against the text of this file.**

| Measure | Revision 2 | Revision 3 | Why they differ |
|---|---|---|---|
| Base tables scanned | 1,027 | **1,027** | agree — `public` 944, `build` 80, `build_events` 3, `drizzle` excluded |
| Columns scanned | 13,536 | **13,536** | agree |
| Direct personal-data columns | 244 | **296** | rev 3's classes are wider: standalone `city`, `secret$`, `bank_name`, `credential*` and `beneficiary` are in scope |
| Tables holding them | 109 | **136** | as above |
| **Tables holding personal data that this file did not name** | not measured | **35 — 26 real, 9 pattern false positives** | **this is the completeness gap PRD-C183 asks about, and revision 2 never measured it** |

The 26 real ones are catalogued in §13. The 9 false-positive tables are listed there too, with
the reason each was dismissed, so that the next scan does not re-raise them.

**Coverage claim.** After §13, every one of the 136 tables the scan flagged is named somewhere in
this file. That is the strongest completeness statement the method supports, and it is bounded by
the same two limits stated above: it says nothing about personal data inside `jsonb` or free text
(§14), and nothing about a column whose name does not betray its contents.

Reproduce with the scripts kept at
`architecture-refactor/final-refactor/evidence/42-production-ops/` (see §17) — the column sweep is
`data-catalogue-c183/pd-column-scan.sql`.

---

## 1. Corrections to revision 1

Revision 1 was written against the schema source. Four of its claims do not survive contact with
the live catalog. They are corrected here rather than silently overwritten.

| # | Revision 1 said | The catalog says | Effect |
|---|---|---|---|
| R1 | `hr_people.date_of_birth`, `.gender`, `.national_id_number`, `.phone`, `.mobile_phone`, `.current_address` | **None of these columns exist.** `hr_people` is now an 11-column link table (`id`, `org_id`, `user_id`, `organization_person_id`, `deleted_at`, `row_version`, `archived_at`, `archived_by_membership_id`, `updated_by_membership_id`, `created_at`, `updated_at`). Every one of those attributes now lives on **`organization_people`**. | The whole of §2 was cataloguing a table that holds no personal data. Rewritten as §3 against `organization_people`. |
| R2 | `projects`, `project_members`, `project_meetings`, `meeting_attendees`, `webhook_deliveries` catalogued as `public` tables | They exist, but in the **`build` schema**, not `public`. A `public`-only inventory misses them and the other 78 `build` tables with them. | Scan widened to all four schemas; `build` intake data added as §11. |
| R3 | D8: "AI PII-stripping layer — implement before any EU HR data sent to AI providers" | **The layer exists and is on by default.** `redactSensitiveData` (`backend/src/modules/ai/core/redaction.util.ts`) is applied in `preflightCall` (`backend/src/modules/ai/core/gateway/ai-gateway-runner-call.ts:76-82`) to every gateway call unless the caller passes `redact: false`. | D8 restated as a *scope* decision, not a build decision — see §10 and the measured coverage gap. |
| R4 | §10 listed 11 subprocessors | The code also calls **Twilio**, **Cloudflare Turnstile**, a **TURN/STUN relay**, and **Web Push (VAPID → FCM/Mozilla/Apple)**. The `subprocessors` table exists and is **empty, with no application code reading or writing it**. | Provider register rebuilt as §14 and fed to `decisions/privacy-C185-provider-approvals.md`. |

### 1.1 Corrections to revision 2 (made by revision 3)

Revision 2 corrected revision 1 and introduced four errors of its own. They are corrected in place;
they are also listed here, because a compliance file that quietly rewrites itself is not auditable.

| # | Revision 2 said | Verified state | Where |
|---|---|---|---|
| R5 | Evidence at `.../compliance-drill-2026-09-03.txt` and `.../ai-redaction-probe-2026-09-03.txt` | **Neither file exists.** The compliance drill genuinely ran and its output is at `RB-10-privacy-compliance/runs/01-compliance-drill-execute.txt` (`EXIT_CODE=0`); **the redaction probe had no artifact at all** and was re-run by revision 3 to produce one | §5, §11, §17 |
| R6 | "Nineteen tables carry a recorded retention decision… Nineteen of 1,027" | **Twenty-eight.** Parsed from `RETENTION_MATRIX` directly; the cited line range `46-135` is also stale (the object ends at 192) | §5 |
| R7 | `hr_employee_sensitive_fields` has "22 columns" | **23** — `information_schema` count | §4 |
| R8 | "11 of 16 probe strings" reached the provider unredacted | **14 of 20** on the re-run, which added GSTIN and a bare 10-digit Indian mobile. The finding is unchanged and worse: every Indian identifier still passes | §11 |

Two of these matter beyond bookkeeping. **R5 is the serious one**: a compliance artifact that cites
evidence which does not exist is indistinguishable, to a reader, from one that fabricates it. The
drill was real; the citation was not. **R6 understated the platform's own retention coverage by a
third** — which is the rare case of an error that made the position look worse than it is.

---

## 2. How to read this catalogue

**Lawful basis** cites GDPR Art. 6/9. India's DPDP Act 2023 has no legitimate-interest basis:
where a row relies on Art. 6(1)(f), the DPDP position is consent or a "legitimate use" under
s.7 and is flagged. Both are named because the platform stores Indian payroll data and is
deployed under a European-style basis model.

**Processor & location** names who processes it beyond StreamlineOS and where. `PRIMARY_REGION`
defaults to the literal string `primary` (`backend/.env.example:243`) — a *name*, not a
geography. **No processing location is established by repository configuration.** Every location
cell therefore reads "deployment-determined" and residency is a single decision, taken once, in
`decisions/privacy-C184-pii-policy.md` §2.

**Deletion behaviour** uses this vocabulary, and it is the column most likely to be
misread as stronger than it is:

| Token | Meaning |
|---|---|
| `CASCADE` | FK `ON DELETE CASCADE` — the row goes when its parent or org row goes |
| `SOFT` | `deleted_at` is stamped; **the row and its personal data remain in the table** |
| `WORKER:<name>` | A named retention cron deletes or anonymises it |
| `KEEP-FOREVER` | Recorded decision in the retention matrix; no worker, no deletion path |
| `NOT-ERASED` | **The erasure request completes without physically removing this data** — see §4 |
| `MANUAL` | Object-storage purge is not implemented; removal requires a human |

---

## 3. Workforce identity — `organization_people` (replaces revision 1 §2)

Data subjects: **employees, contractors and workers** of a customer organization.
Controller: the customer organization. Processor: StreamlineOS.

| Columns | Purpose | Lawful basis | Processor & location | Retention | Owner | Deletion behaviour |
|---|---|---|---|---|---|---|
| `first_name`, `last_name`, `display_name`, `preferred_name` | Directory, attribution, payroll identity | Art. 6(1)(b) contract | StreamlineOS; deployment-determined | Employment end + statutory payroll floor (§7) | HR Manager | `SOFT` (`deleted_at`) then `CASCADE` on org purge |
| `work_email` | Platform access, HR communication | Art. 6(1)(b) | StreamlineOS + email provider (§14) | Employment end + 1 year | HR Manager | `SOFT`; also present in `email_outbox`, `notification_deliveries` |
| `personal_email` | Exit correspondence, payslip delivery after access ends | Art. 6(1)(b) + Art. 6(1)(c) | StreamlineOS + email provider | DECISION REQUIRED — **recommended: delete at employment end + 1 year**, because its only post-exit purpose is delivering statutory payslips and Form 16, which is complete within one assessment year | HR Manager | `SOFT` |
| `phone`, `whatsapp_number` | HR contact; WhatsApp/SMS notification channel | Art. 6(1)(b); channel use requires consent where marketing | StreamlineOS + **Twilio** (§14) | Employment end + 1 year | HR Manager | `SOFT` |
| `address` | Statutory filing, professional-tax state determination | Art. 6(1)(c) | StreamlineOS; deployment-determined | Statutory payroll floor (§7) | HR / Finance | `SOFT` |
| `date_of_birth` | Age verification, PF/ESI eligibility, gratuity | Art. 6(1)(c) | StreamlineOS | Statutory payroll floor (§7) | HR Manager | `SOFT` |
| `gender` | Statutory returns, POSH and maternity-benefit administration | Art. 6(1)(c); **Art. 9(2)(b)** where treated as special category | StreamlineOS | Statutory floor (§7) | HR Manager | `SOFT` |
| `nationality` | Right-to-work, visa administration | Art. 6(1)(c) + Art. 9(2)(b) — nationality may reveal ethnic origin | StreamlineOS | Employment end + statutory floor | HR / Legal | `SOFT` |
| `emergency_contact` | Safety and emergency response | Art. 6(1)(d) vital interests + Art. 6(1)(f) | StreamlineOS | Employment end + 30 days | HR Manager | `SOFT` |
| `avatar_url` | Directory photo | Art. 6(1)(f); consent where optional | StreamlineOS + **Cloudflare R2** | Life of account | HR / Platform | `SOFT` + `MANUAL` for the R2 object (§4) |
| `linkedin_url`, `github_url`, `bio` | Directory enrichment | Art. 6(1)(a) consent — employee-supplied and optional | StreamlineOS | Life of account | HR | `SOFT` |
| `timezone`, `language_code` | Localisation | Art. 6(1)(b) | StreamlineOS | Life of account | Platform | `SOFT` |

> **The `emergency_contact` subject is a third party** — a spouse, parent or friend who has no
> account and was never asked. There is no notice path to them. Recorded as a §16 decision.

---

## 4. The most sensitive table — `hr_employee_sensitive_fields`

**This table is absent from revision 1 entirely.** It is the single highest-risk table in the
schema: **23 columns** holding statutory identifiers, banking, salary, health and disciplinary data,
one row per employment, `ON DELETE CASCADE` from `hr_employments`, and `FORCE`-free RLS policy
`tenant_isolation` on `org_id`.

Data subjects: **employees**. Controller: customer organization.

| Column | Data class | At rest | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|---|---|
| `pan_number` | Indian tax identifier | **Encrypted** (AES-256-GCM envelope, `encryptField`, `hr-sensitive.service.ts:165-168`) | TDS deduction, Form 16, 24Q returns | Art. 6(1)(c); DPDP s.7(b) | **Statutory — Income-tax Act 1961.** Not a decision. See §7 | Finance / Payroll | `CASCADE` |
| `national_id` | National identifier (Aadhaar where captured) | **Encrypted** | PF/ESI enrolment, right to work | Art. 6(1)(c) | Statutory floor (§7) | HR | `CASCADE` |
| `tax_id` | Foreign tax identifier | **Encrypted** | Cross-border payroll | Art. 6(1)(c) | Statutory floor of the paying jurisdiction | Finance | `CASCADE` |
| `passport_number` | Passport | **Encrypted** | Right to work, travel | Art. 6(1)(c) | Employment end + 1 year, or visa expiry, whichever is later | HR / Legal | `CASCADE` |
| `bank_details` | Bank account (sealed JSON) | **Encrypted** (`sealSensitiveJson`) | Salary disbursement | Art. 6(1)(b) + 6(1)(c) | Statutory floor (§7) | Finance | `CASCADE` |
| `medical_notes` | **Health data** | **Encrypted** | Occupational health, accommodation | Art. 6(1)(c) + **Art. 9(2)(b)/(h)** | DECISION REQUIRED — **recommended: accommodation end + 1 year, and never longer than the employment record**, because the note's purpose ends with the adjustment it justifies | HR / Occupational health | `CASCADE` |
| `blood_group` | **Health data** | **PLAINTEXT** | Emergency response | Art. 6(1)(d) vital interests + **Art. 9(2)(c)** | DECISION REQUIRED — **recommended: delete at employment end**, no statutory basis to keep it | HR | `CASCADE` |
| `salary_amount_cents`, `salary_currency`, `salary_frequency` | Compensation | **PLAINTEXT** | Payroll computation | Art. 6(1)(b) + 6(1)(c) | Statutory floor (§7) | Finance | `CASCADE` |
| `passport_expiry`, `visa_type`, `visa_expiry` | Immigration status | **PLAINTEXT** | Right-to-work monitoring | Art. 6(1)(c) | Employment end + 1 year | HR / Legal | `CASCADE` |
| `disciplinary_records` (`jsonb`), and child table `hr_employee_sensitive_disciplinary_records` | Disciplinary history | **PLAINTEXT jsonb** | Employment management, dispute evidence | Art. 6(1)(b) + 6(1)(f) | DECISION REQUIRED — **recommended: 3 years from closure for a live matter, deleted at employment end otherwise**, aligned to the limitation period for an industrial dispute | HR / Legal | `CASCADE` |
| `grievance_records` (`jsonb`), and child table `hr_employee_sensitive_grievance_records` | Grievance history, may include POSH complaints | **PLAINTEXT jsonb** | Grievance and POSH administration | Art. 6(1)(c) + **Art. 9(2)(b)** | DECISION REQUIRED — **recommended: 3 years from closure**; POSH matters follow the POSH Act 2013 reporting cycle | HR / Legal | `CASCADE` |
| `bgv_status`, `bgv_completed_at` | Background-verification outcome | **PLAINTEXT** | Pre-employment screening | Art. 6(1)(b) pre-contractual | DECISION REQUIRED — **recommended: 1 year after hire decision** | HR / Talent | `CASCADE` |
| `encryption_key_ref` | Key version pointer | n/a | Key rotation | n/a | Life of row | Platform Security | `CASCADE` |

**Findings a human must rule on.** Six columns are encrypted and eight are not. `blood_group` is
health data in plaintext. `disciplinary_records` and `grievance_records` are unbounded plaintext
`jsonb` that will, in practice, contain health and POSH allegations — the two highest-sensitivity
categories in the schema — with no Art. 9 condition recorded and no retention. `ENCRYPTION_KEY`
is validated at ≥32 characters and the app refuses to start without it
(`backend/src/config/env.validation.ts:110-112`), so the encryption is real, not aspirational.

---

## 5. Deletion behaviour — measured, not asserted

`npm run compliance:drill` was executed against `scratch_head_1010` on 2026-09-03. It exercised
the export → legal hold → refused erasure → hold release → retention policy → erasure → org purge
sequence in a rolled-back transaction, wrote 7 audit rows, and **exited 0**. Full output at
`final-refactor/evidence/42-production-ops/RB-10-privacy-compliance/runs/01-compliance-drill-execute.txt`
(`EXIT_CODE=0`, org `drill-4373b133`). **Revision 2 cited
`.../compliance-drill-2026-09-03.txt`, which does not exist on disk.**

The drill's own closing section is the honest answer to "deletion behaviour":

```
─── Known gaps (honest report) ────────────────────────────
  INCOMPLETE: Export pipeline — hr_data_requests tracks requests; no export worker
              produces an actual data file.
  INCOMPLETE: object_storage purge adapter — returns FAILED
              ('not yet implemented, manual cleanup required').
  INCOMPLETE: database_rows adapter — marks statusV2=PURGED but does NOT physically
              delete tenant data rows.
```

**Read against every `Deletion behaviour` cell in this file, that means:**

1. An erasure request today produces an **audit trail and a status change, not a deletion**. Every
   cell marked `CASCADE` or `SOFT` describes what happens when the *parent row* is deleted by the
   application — not what happens when a data subject exercises Art. 17 / DPDP s.12(3). The
   subject-erasure path is `NOT-ERASED`.
2. **No object in Cloudflare R2 is ever deleted by the platform.** Every avatar, CV, payslip PDF,
   signed document, feedback screenshot and export file is `MANUAL`. `storage_pending_purge` exists
   to queue this work; the adapter that would drain it returns `FAILED`.
3. `subject_requests` records `region_outcomes`, `backups_expire_by` and `total_records_affected`,
   so the schema anticipates all three of these. The columns are the design; the workers are absent.

`npm run check:retention-coverage:self-test` **exited 0** with 22 checks passing, proving the
retention gate detects an uncovered high-growth table. Run live against `scratch_head_1010` it
reports `highGrowthTables: 0` — the scratch database is schema-only, so the gate has nothing to
measure. **A green live run here is not evidence of retention coverage in production**; it is
evidence of an empty database.

**Twenty-eight** tables carry a recorded retention decision in `RETENTION_MATRIX`
(`backend/src/scripts/check-retention-coverage.mjs:46-192`, counted by parsing the object:
`kb_article_chunks, chat_messages, timesheets, ai_usage_logs, kb_chat_conversations,
kb_page_versions, webhook_deliveries, notifications, notification_events,
notification_deliveries, email_outbox, documents, helpdesk_tickets, performance_reviews,
mail_message_metadata, announcements, notification_outbox, outbox_events, gdpr_export_jobs,
audit_logs, hr_audit_logs, payroll_runs, hr_people, hr_employments, hr_reporting_lines,
attendance, permissions, role_permission_grants`). **Twenty-eight of 1,027 base tables, and
twenty-eight against the 136 tables that actually hold personal data (§0).** Revision 2 said
nineteen; that was wrong and is corrected here.

---

## 6. Identity, authentication and session

Data subjects: **platform users**, and invited people who never became users.

| Table / columns | Purpose | Lawful basis | Processor & location | Retention | Owner | Deletion |
|---|---|---|---|---|---|---|
| `users.email`, `.email_verified` | Login, notification delivery | Art. 6(1)(b) | StreamlineOS + email provider | Life of account + 30 days | Platform | `NOT-ERASED` (§5) |
| `users.first_name`, `.last_name`, `.phone`, `.whatsapp_number` | Identity, contact | Art. 6(1)(b) | StreamlineOS + Twilio | Life of account | Platform | `NOT-ERASED` |
| `users.date_of_birth`, `.gender` | Profile; statutory where employed | Art. 6(1)(b); Art. 9(2)(b) for gender where special category | StreamlineOS | Life of account | Platform / HR | `NOT-ERASED` |
| `users.emergency_contact` | Emergency response | Art. 6(1)(d) | StreamlineOS | Life of account | Platform / HR | `NOT-ERASED` |
| `users.totp_secret`, `.totp_enabled` | MFA | Art. 6(1)(b) + 6(1)(f) security | StreamlineOS | Until MFA disabled | Platform Security | Overwritten on change |
| `accounts.access_token`, `.refresh_token`, `.id_token`, `.session_state` | OAuth SSO | Art. 6(1)(b) | StreamlineOS + the identity provider | Until disconnect | Platform Security | `CASCADE` |
| `user_sessions.session_token`, `.ip_address`, `.user_agent`, `.device_id` | Session state, session-hijack detection | Art. 6(1)(b) + 6(1)(f) | StreamlineOS + **Upstash** (cache) | Session TTL | Platform Security | Deleted on logout / expiry |
| `login_history.ip_address`, `.user_agent`, `.device_id`, `.city` | Anomalous-login detection, user-visible session list | Art. 6(1)(f); **DPDP: s.7 legitimate use, security** | StreamlineOS | DECISION REQUIRED — **recommended 12 months**: long enough to show a user a year of logins, short enough that a stale IP history is not a standing disclosure risk | Platform Security | No worker — `NOT-ERASED` |
| `user_api_tokens.token_hash`, `agent_tokens.token_hash`, `magic_link_tokens.token_hash`, `verification_tokens.token` | Programmatic and passwordless auth | Art. 6(1)(b) | StreamlineOS | Until revoked/expired | Platform Security | Deleted on revoke |
| `invitations.email`, `.token_hash`, `portal_invitations.email` | Invite a person to an organization | Art. 6(1)(f) — the inviter's interest in onboarding | StreamlineOS + email provider | DECISION REQUIRED — **recommended: delete 90 days after expiry**. An unaccepted invitation is an email address held about someone who never engaged | Platform | No worker — `NOT-ERASED` |
| `platform_waitlist.email`, `.ip_address`, `.user_agent`, `.token_hash` | Pre-signup waitlist | Art. 6(1)(a) consent | StreamlineOS | DECISION REQUIRED — **recommended: 12 months, then delete**, or on conversion | Growth / Platform | No worker |
| `platform_messages.email`, `.phone`, `.ip_address`, `.user_agent` | Marketing-site contact form | Art. 6(1)(a) / 6(1)(f) | StreamlineOS | DECISION REQUIRED — **recommended: 24 months** | Growth | No worker |
| `platform_visits.user_agent`, `.session_token` | Marketing-site analytics | **Consent required** — ePrivacy Art. 5(3) for the identifier; Art. 6(1)(f) for the analysis | StreamlineOS | DECISION REQUIRED — **recommended: 90 days raw, aggregate thereafter** | Growth | No worker |

---

## 7. Payroll and tax — Indian jurisdiction

Data subjects: **employees and ex-employees**. Controller: customer organization
(the employer of record). Processor: StreamlineOS. Location: deployment-determined.

**Retention here is largely not a decision.** Indian statute sets floors. The statute is named;
where it sets a period the cell is not marked `DECISION REQUIRED`. Where the statute is silent or
the period is state-specific, only *that* is referred to Legal — and it is referred as a
confirmation, not as a policy choice.

| Table | Data | Purpose | Lawful basis | Statutory floor | Owner | Deletion |
|---|---|---|---|---|---|---|
| `payroll_tds_ytd_ledger` (`tds_paise`, `previous_employer_tds_paise`) | TDS deducted year-to-date | Quarterly 24Q returns, Form 16 | Art. 6(1)(c); DPDP s.7(b) | **Income-tax Act 1961** — Rule 6F(5) of the Income-tax Rules 1962 requires books to be kept **6 years** from the end of the relevant assessment year; s.149(1)(b) permits reassessment up to **10 years** in specified cases. Legal to confirm which is operative | Finance | `KEEP-FOREVER` until floor expires; no worker |
| `tax_declarations` (`hra`, `previous_employer_tds`) | Employee investment/HRA declarations | Compute TDS | Art. 6(1)(c) | **Income-tax Act 1961**, as above. Landlord PAN inside an HRA declaration is a *third party's* identifier | Finance | No worker |
| `payroll_runs`, `payroll_run_employees`, `payroll_line_items` | Gross, deductions, net, per-component | Salary computation and statutory returns | Art. 6(1)(c) + 6(1)(b) | **Payment of Wages Act 1936** s.13A — wage registers **3 years** after the last entry; **Companies Act 2013** s.128(5) — books of account **8 financial years**. The longer governs | Finance | `KEEP-FOREVER` in the retention matrix |
| `payslip_publications`, `payslip_templates` | Published payslips | Statutory wage slip | Art. 6(1)(c) | **Payment of Wages Act 1936** / state Shops & Establishments rules — **3 years**, extended to 8 by Companies Act s.128(5) where it forms part of the books | Finance | No worker; PDF in R2 is `MANUAL` |
| `payroll_entities`, `legal_entities` (`pan`, `tan`, `esi_code`, `gstin`) | Employer statutory registrations | Filing returns | Art. 6(1)(c) — org data, but a **sole proprietor's PAN is personal data** | Life of the entity + the longest filing floor | Finance / Legal | No worker |
| `payroll_bank_batches`, `payroll_bank_batch_items` (`ifsc`) | Salary payment instruction files | Disbursement | Art. 6(1)(b) + 6(1)(c) | **Companies Act 2013** s.128(5) — **8 years** as a book of account | Finance | No worker |
| `payroll_filings`, `payroll_statutory_rule_sets`, `payroll_tax_windows` | Filed returns and the rule set used | Statutory proof of filing | Art. 6(1)(c) | Same as the return filed — Income-tax 6–10 yr, **EPF & MP Act 1952** and **ESI Act 1948** as below | Finance | No worker |
| PF (EPF contributions inside `payroll_line_items`, `employee_salary_profiles`) | Provident-fund contributions and UAN | Statutory PF | Art. 6(1)(c) | **Employees' Provident Funds and Miscellaneous Provisions Act 1952** and the EPF Scheme 1952 (para 76 preservation of records). Legal to confirm the operative period — the Act does not state a single number | Finance / HR | No worker |
| ESI (`legal_entities.esi_code`, `payroll_entities.esi_code`, contribution lines) | Statutory insurance | Art. 6(1)(c) | **Employees' State Insurance Act 1948**; **ESI (General) Regulations 1950, Reg. 66** — register of employees preserved **5 years** | Finance / HR | No worker |
| `fnf_settlements` (`bonus_due`, `deductions`, `net_payable`, `reimbursements_due`) | Full-and-final settlement | Exit accounting, gratuity | Art. 6(1)(b) + 6(1)(c) | **Payment of Gratuity Act 1972** — no express preservation period; limitation-driven. Legal to set. Companies Act s.128(5) 8-year floor applies to the accounting entries | Finance | No worker |
| `salary_loans`, `payroll_loan_adjustments` | Employee loans | Recovery from salary | Art. 6(1)(b) | Companies Act s.128(5) — 8 years from settlement | Finance | No worker |
| `employee_salary_profiles`, `salary_structure_templates`, `salary_components` | Compensation structure | Payroll computation | Art. 6(1)(b) | Employment end + the payroll floor above | Finance / HR | No worker |
| `expenses`, `fin_reimbursement_batches` | Expense claims and reimbursement | Reimbursement, input tax credit | Art. 6(1)(b) + 6(1)(c) | **CGST Act 2017 s.36** — accounts retained **72 months** from the due date of the annual return | Finance | No worker |
| `fin_bank_accounts` (`account_number_masked`, `ifsc`, `bank_name`), `payment_manual_methods` (`upi_id`, `ifsc_swift_iban`, `masked_account_number`) | Bank and UPI instruments | Disbursement and collection | Art. 6(1)(b) | Companies Act s.128(5) — 8 years | Finance | No worker |
| `invoices`, `credit_notes`, `purchase_bills`, `ar_documents`, `billing_invoice_snapshots` (`customer_gstin`, `supplier_gstin`, `buyer_tax_ids`, `seller_tax_ids`, `buyer_address`, `seller_address`) | Counterparty tax identity on tax documents | GST compliance | Art. 6(1)(c) — **a sole proprietor's GSTIN embeds their PAN and is personal data** | **CGST Act 2017 s.36** — **72 months**; Companies Act s.128(5) — 8 years | Finance | No worker |
| `billing_profiles` (`pan`, `gstin`, `billing_email`, `address_line1/2`, `city`, `pincode`, `state`), `clients.gstin`, `inv_vendors.gstin` | Customer/vendor tax registration | Invoicing, GST | Art. 6(1)(c) | CGST s.36 — 72 months | Finance | No worker |
| `platform_payments` (`customer_email`, `razorpay_signature`, `provider_signature`), `payment_webhook_events`, `payment_audit_events` (`ip_address`, `user_agent`) | Platform subscription billing | Payment processing, dispute defence | Art. 6(1)(b) + 6(1)(c) | **Razorpay** (India). Companies Act s.128(5) — 8 years for the payment record; DECISION REQUIRED for the `ip_address`/`user_agent` on the audit event — **recommended 24 months**, the practical chargeback and fraud window | Finance / Platform | No worker |

> **Cross-border consequence.** Every row above is Indian statutory data. If a customer
> organization's data is placed in an EU or US region, this data leaves India for the life of the
> statutory floor. That is a residency decision with a tax-compliance consequence and it is the
> reason §2 of the C184 record cannot be deferred.

---

## 8. Attendance, biometrics and location

Data subjects: **employees and contractors**. These are the categories where an employment
regulator, not a customer, is the likely complainant.

| Table / columns | Data class | Purpose | Lawful basis | Art. 9 | Retention | Owner | Deletion |
|---|---|---|---|---|---|---|---|
| `attendance.*`, `timesheets.*` | Working time | Payroll, statutory hours | Art. 6(1)(b) + 6(1)(c) | n/a | **Payment of Wages Act 1936** s.13A — 3 years; `timesheets` is `KEEP-FOREVER` in the retention matrix | HR / Finance | `KEEP-FOREVER` |
| `biometric_logs` (`biometric_user_id`, `device_id`), `hr_device_employee_mappings.biometric_id` | **Biometric identifier** — the device-side template reference | Attendance capture | DECISION REQUIRED — **recommended Art. 6(1)(c)** where a statutory attendance register is the purpose, never Art. 6(1)(a): consent from an employee to a biometric clock-in is not freely given | **Art. 9(2)(b)** must be recorded *before* collection; there is no other available condition in an employment context | DECISION REQUIRED — **recommended: raw logs 90 days, the derived attendance record for the statutory 3 years**. The template reference should be deleted at employment end | HR / Security | `CASCADE`; the **template on the physical device is outside the platform's deletion reach entirely** |
| `biometric_devices.ip_address`, `hr_device_sync_logs.device_id` | Device estate | Device management | Art. 6(1)(f) | n/a | DECISION REQUIRED — **recommended 12 months** | Platform / HR | No worker |
| `geofences.lat`, `.lng` | Workplace boundary | Geofenced attendance | Art. 6(1)(b) | n/a | Life of the fence | HR | No worker |
| `hr_travel_visit_logs.lat`, `.lng` | **Employee location traces** | Field-visit verification, travel reimbursement | DECISION REQUIRED — **recommended Art. 6(1)(b)** limited to the reimbursement claim. Continuous location tracking of a worker requires a documented necessity test and worker notice | n/a, but location can reveal special-category facts (place of worship, clinic) | DECISION REQUIRED — **recommended: 90 days, or the life of the expense claim it supports, whichever is shorter.** A location trace has no purpose once the claim it evidences is settled | HR | No worker — `NOT-ERASED` |
| `leave_requests.*`, `leave_policies.gender_restriction` | Leave records; maternity/menstrual policy eligibility | HR administration, **Maternity Benefit Act 1961** | Art. 6(1)(b) + 6(1)(c) | A gender-restricted leave type **reveals health or gender** by the fact of the request | Employment end + 3 years | HR Manager | No worker |
| `hr_wellness_checkins`, `hr_safety_incidents` (`confidential_medical_note`, `medical_attention`), `hr_accommodation_requests.confidential_medical_note`, `hr_insurance_claims` | **Health data** | Wellbeing, safety reporting, accommodation, insurance | Art. 6(1)(c) + 6(1)(b) | DECISION REQUIRED — **recommended Art. 9(2)(b)** for accommodation and safety, **Art. 9(2)(h)** for occupational health, never 9(2)(a) consent from an employee | Safety: DECISION REQUIRED — **recommended 7 years from closure**, matching the Employees' Compensation Act 1923 claim window. Wellness: **recommended employment end**, no statutory reason to keep it | HR / Occupational health | No worker |
| `hr_work_authorizations`, `hr_dependents.date_of_birth` | Right to work; **dependants' dates of birth** | Immigration compliance; PF nominee and insurance dependant cover | Art. 6(1)(c) | Dependant data may reveal family and health status | DECISION REQUIRED — **recommended: employment end + 1 year for dependants.** They are third-party subjects with no account and no notice path | HR / Legal | `CASCADE` |
| `documents.*`, `policy_acknowledgments.ip_address` | HR documents; policy sign-off evidence | HR records, POSH/policy proof | Art. 6(1)(b) + 6(1)(c) | Inherits from the document | `WORKER:CronHrRetentionService` via `hr_retention_policies` (recordType=document), with legal-hold exclusion — **the only subject-level retention worker that exists** | HR Manager | `WORKER` for the row; the R2 object is `MANUAL` |

---

## 9. Recruitment and third-party subjects

**The subjects in this section are not users and mostly did not choose this platform.**

| Table / columns | Subjects | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|---|
| `candidates` (`email`, `first_name`, `last_name`, `phone`, `gender`) | Job applicants | Recruitment | Art. 6(1)(a) consent, or 6(1)(b) pre-contractual once applying | **6 months post-rejection** unless extended consent. `gender` needs an Art. 9(2)(b) condition or should not be collected | Talent team | No worker — `NOT-ERASED` |
| `candidate_documents_vault`, `candidate_applications` | Applicants | CV, ID, application | Art. 6(1)(a) | 6 months post-rejection | Talent | Row: no worker. R2 object: `MANUAL` |
| `candidate_offers` (`offered_salary`, `acceptance_token`), `offer_versions`, `offer_negotiations` | Applicants | Pre-employment contract | Art. 6(1)(b) pre-contractual | Accepted: employment + payroll floor (§7). Declined: DECISION REQUIRED — **recommended 1 year**, the practical discrimination-claim window | HR Manager | No worker |
| `candidate_reference_checks` (`reference_email`, `reference_phone`) | **Referees** — third parties who never applied and were named by the candidate | Reference checking | Art. 6(1)(f); **the referee has had no notice** — Art. 14 notice obligation is unmet | DECISION REQUIRED — **recommended: delete at the hire decision.** A referee's contact details have no purpose after the check | Talent | No worker |
| `interviews` (`recording_url`, `recording_platform`, `calendar_sync_token`), `interview_booking_links.token` | Applicants and interviewers | Interview scheduling and recording | Art. 6(1)(a) consent for recording; recording an interview without consent is not defensible under 6(1)(f) | DECISION REQUIRED — **recommended: 90 days after the hire decision**, long enough to defend the decision, short enough not to be a standing library of people's faces | Talent | No worker; recording in R2 is `MANUAL` |
| `referrals.referred_email`, `candidate_referrals`, `external_referrers` (`email`, `phone`, `referral_token`), `external_referrals.ip_address` | **Referred people and external referrers** | Referral programme | Art. 6(1)(f) for the referrer; **the referred person's email is processed before they know it exists** | DECISION REQUIRED — **recommended: delete the referred person's email 90 days after the referral closes** | Talent / Growth | No worker |
| `alumni_profiles.email` | Ex-employees | Alumni network | Art. 6(1)(a) consent — must be re-obtained at exit, not inherited from employment | DECISION REQUIRED — **recommended: until consent is withdrawn, reconfirmed every 24 months** | HR | No worker |
| `recruitment_vendors` (`contact_email`, `contact_phone`, `portal_token`) | Agency staff | Vendor management | Art. 6(1)(b) | Contract end + 1 year | Talent / Procurement | No worker |
| `terminations` (`email_sent_at`, `email_status`), `resignations` | Ex-employees | Exit administration | Art. 6(1)(b) + 6(1)(c) | Statutory payroll floor (§7) | HR | No worker |
| `worker_engagements`, `hr_compliance_requirements` | Contingent workers | Engagement management | Art. 6(1)(b) + 6(1)(c) | Engagement end + statutory floor | HR / Legal | No worker |
| `survey_participants` (`email`, `phone`, `access_token_hash`), `nps_responses.respondent_email`, `csat_responses.respondent_email`, `survey_collectors.token` | Employees and customers | Engagement, NPS, CSAT | Art. 6(1)(f); consent where the survey is presented as anonymous | DECISION REQUIRED — **recommended: sever the email from the response at collection close.** A survey promised as anonymous that stores `respondent_email` alongside the answer is not anonymous | HR / Product | No worker |

---

## 10. CRM — prospects, contacts and call analysis

**An entire domain absent from revision 1.** Data subjects: **prospects, customers' employees and
third-party contacts** who have no relationship with StreamlineOS and, for cold outbound, none
with the customer either. Controller: the customer organization. StreamlineOS is the processor,
and this is the domain where a customer's misuse creates StreamlineOS's exposure.

| Table / columns | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|
| `crm_people` (`email`, `phone`, `initials`), `contacts`, `leads` (`email`, `phone`, `whatsapp_number`, `ip_address`, `city`), `business_parties` (`email`, `phone`, `whatsapp_phone`), `gl_parties` (`email`, `phone`, `billing_city`, `billing_postal_code`, `shipping_*`), `party_contacts`, `deals` (`contact_email`, `contact_phone`), `client_accounts` | Sales relationship management | Art. 6(1)(f) for an existing business contact. **For cold outbound, Art. 6(1)(f) is contested and India's DPDP Act has no equivalent basis — consent or a lawful "legitimate use" is needed** | DECISION REQUIRED — **recommended: 24 months from last meaningful contact, then delete.** A prospect record that has not moved in two years is not a legitimate interest, it is a liability | Sales Ops / Privacy | No worker — `NOT-ERASED` |
| `crm_contact_channel_consent` (`legal_basis`, `source`, `captured_at`, `expires_at`), `crm_contact_consent_events` | **Proof of consent and its basis, per channel** | Art. 7(1) GDPR accountability; DPDP s.6 | **Longer than the processing it authorises** — recommended processing period + 3 years. Deleting consent evidence destroys the defence, not the risk | Privacy | Must survive erasure of the contact record |
| `crm_suppression_hashes.address_hash`, `email_suppressions.email`, `crm_outbound_class_stops` | **Do-not-contact lists** | Honour opt-outs | Art. 6(1)(c) — required to *comply* | **Indefinite.** An opt-out record must outlive the erasure of everything else about that person, or the opt-out is lost and they are contacted again. Store as a hash where possible — `crm_suppression_hashes` already does | Privacy / Sales Ops | **Never delete.** Explicit Art. 17(3)(b) carve-out |
| `crm_call_recording_consent` (`jurisdiction`, `org_party_consented_at`, `counterparty_consented_at`, `counterparty_withdrawn_at`, `attested_by_user_id`) | Two-party call-recording consent with jurisdiction | Art. 6(1)(a); two-party-consent jurisdictions make this mandatory | Life of the recording + 3 years | Legal / Sales Ops | Must survive the recording |
| `crm_call_analyses` (`transcript_hash`, `transcript_chars`, `talk_ratio_bps`, `objections`, `competitor_mentions`, `model`, `prompt_key`) | AI analysis of sales calls | Art. 6(1)(f) — analysing the *rep's* performance is also **employee monitoring** and needs worker notice | DECISION REQUIRED — **recommended 12 months.** Note this table stores a transcript **hash and derived features, not the transcript** — a deliberate minimisation that should be preserved and stated in the DPA | Sales Ops / Privacy | No worker |
| `crm_call_analysis_refusals`, `crm_call_analysis_releases` | Refusal and release control over call analysis | Art. 6(1)(c) accountability | Same as the analysis | Privacy | Must survive the analysis |
| `crm_mailbox_sync.mailbox_address`, `lead_emails` (`from_email`, `to_email`), `crm_outbound_messages.recipient_email`, `mail_message_metadata` (`sender_email`, `sender_name`, `subject`) | **Ingesting a user's mailbox** — correspondence with third parties who never consented to this platform | Art. 6(1)(b) for the user; the **correspondent** is processed on Art. 6(1)(f) with no notice path | `WORKER:CronMailRetentionService` — 365 days from `synced_at`; a re-syncable projection, not the system of record | Integrations / Privacy | `WORKER` |
| `crm_cold_outbound_settings`, `crm_sequences`, `crm_sequence_enrollments`, `crm_campaigns` | Outbound sequencing | As the channel consent above | Campaign end + 24 months | Sales Ops | No worker |
| `crm_imports`, `crm_import_rows` | **Bulk import of contact lists** | The customer warrants a basis; StreamlineOS cannot verify one | DECISION REQUIRED — **recommended: delete raw import rows 30 days after the import completes.** They are a duplicate copy of personal data whose only purpose was the import | Sales Ops / Privacy | No worker |
| `subjects`, `subject_types`, `subject_party_links`, `subject_requests` (`subject_email`, `region_outcomes`, `backups_expire_by`, `due_by`) | **The DSAR register itself** | Art. 12–22 / DPDP s.11–13 | Request + 3 years, as proof of timely handling | Privacy / DPO | Must survive the erasure it records |

---

## 11. AI processing — measured coverage, not asserted

The redaction layer exists and is **on by default**. `preflightCall`
(`backend/src/modules/ai/core/gateway/ai-gateway-runner-call.ts:76-82`) applies
`redactSensitiveData` to both the system and user prompt unless the caller passes `redact: false`.
This corrects revision 1's D8, which said the layer was unbuilt.

**What it actually catches.** The util
(`backend/src/modules/ai/core/redaction.util.ts`) holds six regexes: email, US SSN
`\d{3}-\d{2}-\d{4}`, a NANP-shaped phone, a 13–19 digit card run, `Bearer` tokens, and
`sk-`/`ghp-`/`xox*` API keys. Revision 3 re-ran the probe against **twenty** strings, executing the *real* exported
`redactSensitiveData` by loading `redaction.util.ts` itself and stripping only its type
annotations, so the result is the shipped regexes and not a transcription of them
(`final-refactor/evidence/42-production-ops/data-catalogue-c183/ai-redaction-probe.txt`,
script at `.../data-catalogue-c183/ai-redaction-probe.mjs`, exit 0). **Revision 2 cited
`.../ai-redaction-probe-2026-09-03.txt`, which does not exist on disk.**

| Probe | Result |
|---|---|
| PAN `ABCDE1234F` | **passes through** |
| Aadhaar `2345 6789 0123` | **passes through** |
| UAN `101234567890` | **passes through** |
| GSTIN `27ABCDE1234F1Z5` | **passes through** |
| Indian mobile, bare `9876543210` | **passes through** |
| IFSC `HDFC0001234` | **passes through** |
| Indian mobile `+91 98765 43210` | **passes through** |
| Person name, postal address, date of birth, passport `M1234567`, blood group, salary | **all pass through** |
| Email, US SSN, US phone, card number | redacted (controls) |

**14 of 20 probe strings reached the provider unredacted, and all six controls were caught.** The layer is US-shaped; it catches
nothing in the Indian identifier set that §7 shows this platform is built to store. That is a
scoping gap, not an absent control, and it is D8 in §16.

**Eleven production call sites disable it outright** (`redact: false`) — twelve matches in
`src/`, one of which is a spec — including
`backend/src/modules/payroll/insights/payroll-ai-explain.service.ts:129`, which sends gross pay,
total deductions, net pay and every earning/deduction line-item name to the provider. Inspection
of the payload builder (`:107-121`) shows it sends **amounts and component names, not direct
identifiers** — but it is compensation data about an identifiable employee, sent to a third-country
provider, with redaction explicitly switched off. The other ten are accounting, inventory,
timesheets and feedbucket.

| Table / columns | Purpose | Lawful basis | Processor & location | Retention | Owner | Deletion |
|---|---|---|---|---|---|---|
| `ai_chat_conversations`, `ai_chat_messages` | Assistive workflows | Art. 6(1)(b) + 6(1)(f) | **OpenAI / Google / OpenRouter** — region provider-determined | DECISION REQUIRED — **recommended 90 days after last message**; a conversation's assistive purpose does not survive the quarter | AI / Privacy | No worker — `NOT-ERASED` |
| `ai_jobs`, `ai_feedback` | Async AI work, quality signal | Art. 6(1)(b) + 6(1)(f) | as above | DECISION REQUIRED — **recommended 90 days / 12 months** | AI / Privacy | No worker |
| `ai_usage_logs` (`prompt_tokens`, `completion_tokens`, cost) | Billing, capacity, abuse | Art. 6(1)(f) + 6(1)(b) | StreamlineOS | `WORKER:CronAiUsageRetentionService` — **730-day default, dry-run by default** | AI / Finance | `WORKER` |
| `ai_credit_transactions`, `ai_credit_packs` | Credit accounting | Art. 6(1)(b) | StreamlineOS | Companies Act s.128(5) — 8 years | Finance | No worker |
| `kb_chat_conversations`, `kb_chat_messages` | KB question answering | Art. 6(1)(b) + 6(1)(f) | OpenAI (embeddings) | `WORKER:CronKbChatRetentionService` — org-configured, default 90 days | Knowledge / Privacy | `WORKER` |
| `kb_article_chunks` (`tokens`, embeddings) | Retrieval and semantic search | Inherits from the source page | **OpenAI** — embeddings always use `OPENAI_API_KEY` even when `AI_LLM_PROVIDER=openrouter` (`.env.example:135`) | `WORKER:CronKbChunkRetentionService` — pruned when the parent page is deleted or unpublished | Knowledge / Platform | `WORKER` |
| `kb_pages`, `kb_page_versions` | Authored knowledge, revision history | Art. 6(1)(b) + 6(1)(f) | StreamlineOS | Pages: page life. Versions: `KEEP-FOREVER` — the content audit trail, bounded by a snapshot throttle | Knowledge owner | Versions never deleted |
| `crm_call_analyses` | Sales-call analysis | see §10 | OpenAI/Google/OpenRouter | see §10 | Sales Ops | No worker |
| `feedbucket_submissions.ai_analysis`, `.ai_model` | Triage of end-user bug reports | Art. 6(1)(f) | as above | see §12 | Product | No worker |

---

## 12. The `build` schema — public intake, screenshots and browser logs

80 tables, absent from revision 1. Three hold personal data directly, and one of them is the
highest-risk *undocumented* class in the platform.

| Table / columns | Subjects | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|---|
| `build.feedbucket_submissions` — `reporter_name`, `reporter_email`, `page_url`, `screenshot_url`, `screenshot_key`, **`console_logs`**, **`network_logs`**, `metadata`, `ai_analysis` | **Anonymous end users of a customer's product** — the customer's customers | In-product bug reporting | Art. 6(1)(f) of the customer; the reporter is often given no notice at all | DECISION REQUIRED — **recommended: 12 months for the submission, and console/network logs stripped at 30 days.** A captured `console_logs`/`network_logs` pair routinely contains bearer tokens, session identifiers and *other* people's data pulled from the page under test. It is an uncontrolled personal-data intake with no schema | Product / Privacy | `SOFT` (`deleted_at`); screenshot in R2 is `MANUAL` |
| `build.feedback_posts` — `submitted_by_name`, `submitted_by_email` | Customers and end users | Public feature requests | Art. 6(1)(f) / consent | DECISION REQUIRED — **recommended 24 months** | Product | `SOFT` |
| `build.intake_items` — `submitter_email`, `submitter_name`, `decline_reason` | Requesters | Work intake | Art. 6(1)(f) | DECISION REQUIRED — **recommended: closure + 12 months** | Product | No `deleted_at` |
| `build.form_submissions.submitted_by_name`, `.values` (`jsonb`) | Form respondents | Custom intake forms | Depends entirely on the form the customer built | DECISION REQUIRED — **the customer defines the fields, so StreamlineOS cannot state a class or a basis.** Recommended: contractual requirement that the customer declares the fields, plus a default 24-month ceiling | Product / Privacy | No `deleted_at` |
| `build.projects`, `build.project_members`, `build.project_meetings`, `build.meeting_attendees`, `build.webhook_deliveries` | Employees | Delivery management | Art. 6(1)(b) + 6(1)(f) | `webhook_deliveries`: `WORKER:CronBuildRetentionService`, 90 days for completed attempts. Others: DECISION REQUIRED — **recommended project closure + 2 years** | Operations | Mixed |
| `build.project_forms.public_token`, `build.project_whiteboards.share_token`, `build.project_webhooks.secret`, `build.git_connections.webhook_secret` | n/a | Public sharing and integration | Art. 6(1)(f) | Until revoked | Platform Security | No worker |

---

## 13. Domains revision 2 missed — found by independent re-scan (revision 3)

Revision 3 re-ran the sweep from `information_schema` with a wider and differently-ordered
pattern set (§0) and then **diffed every table it found against the text of this file**. Thirty-five
tables holding personal data were named nowhere in revision 2. Nine of those are pattern false
positives and are dismissed below with the reason; the remaining **twenty-six** are catalogued
here. This section is the completeness answer to PRD-C183 — the file is not complete because it
describes the sensitive tables well, it is complete when nothing with personal data in it is absent.

**Dismissed as false positives** — nine tables, recorded so the next scan does not re-raise them:
`inv_locations` (`capacity`) and `sign_watermark_policies` (`opacity`) — **both contain the
literal substring `city`**; `inv_demand_forecasts` (`input_fingerprint`) — an idempotency digest,
not a biometric; `payment_test_transactions` (`signature_verified`) — a boolean;
`billing_plans`, `payment_providers` and `notification_provider_accounts` (`display_name`) and
`chat_channels` (`avatar_url`) — names and images of products and channels, not of people;
`inv_warehouses` (`address`, `city`) — premises of the organization, not of a person.
One further *column* is dismissed while its table is kept: `fin_bank_transactions.fingerprint`
is an idempotency digest, but the table is catalogued at §13.4 for its other columns.

### 13.1 Support desk — an entire domain, uncatalogued

The subjects here are **the customer's customers**: people who wrote to a support address and
have no account, no relationship with StreamlineOS, and no notice from it.

| Table / columns | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|
| `support_tickets.requester_email` | Identify and reply to the person who raised the ticket | Art. 6(1)(b) where the requester is the customer; **Art. 6(1)(f) where they are a third party who emailed in** | DECISION REQUIRED — **recommended: closure + 24 months**, matching the contract-limitation window in which a dispute could cite the ticket. `helpdesk_tickets` already carries a matrix decision; `support_tickets` does not, and the two are different tables | Support | No worker |
| `support_ticket_messages.source_contact_email` | The address a message actually arrived from | Art. 6(1)(f) | Same as the parent ticket | Support | No worker |
| `support_channels.inbound_secret` | Shared secret for an inbound mail/webhook channel | n/a — credential | Until the channel is deleted or rotated | Platform Security | No worker |

> `helpdesk_tickets` **is** in `RETENTION_MATRIX`; `support_tickets`, `support_ticket_messages` and
> `support_channels` are not. Two parallel ticket tables with one retention decision between them is
> exactly the failure mode §15 names for the four audit tables.

### 13.2 Device fingerprints — `devices`

| Table / columns | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|
| `devices` — `user_id`, **`fingerprint`**, `browser`, `os`, `platform`, `trusted`, `last_seen_at` | Recognise a returning device, mark it trusted, support step-up authentication | Art. 6(1)(f) security. **A device fingerprint is terminal-equipment access: ePrivacy Art. 5(3) requires consent unless it is strictly necessary for the service the user requested** — for a security/anti-fraud control that exemption is arguable, and the argument must be recorded rather than assumed | DECISION REQUIRED — **recommended: delete a device row 12 months after `last_seen_at`.** A fingerprint for a device that has not appeared in a year identifies a person without protecting them | Platform Security | No worker — `NOT-ERASED` |

`devices` sits beside `user_sessions` and `login_history` in §6 and was catalogued with neither.
It is the more sensitive of the three: a session token expires, a fingerprint is durable and is
designed to survive one.

### 13.3 Compensation surfaces outside payroll

§7 catalogues payroll. These three hold compensation data and are not part of a payroll run, so the
statutory payroll floor does **not** carry them — they need their own decision.

| Table / columns | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|
| `hr_comp_recommendations.current_salary_cents` | **A recommendation about an identified employee's pay** | Art. 6(1)(b) + 6(1)(f) | DECISION REQUIRED — **recommended: the review cycle it belongs to + 3 years.** Where the recommendation is produced or ranked by a model, Art. 22 (automated decision-making with a significant effect) is engaged and a human-review path must be recorded | HR / Compensation | No worker |
| `hr_contracts.stipend_cents` | Contract terms for interns and fixed-term staff | Art. 6(1)(b) | Contract end + the statutory payroll floor (§7) | HR / Legal | No worker |
| `job_postings.salary_min`, `.salary_max` | Advertised pay band | **Not personal data** while the posting is generic; becomes personal where a posting is a single named role | Life of the posting + 12 months | Talent | No worker |
| `vendor_candidate_submissions.pay_rate` | **A staffing vendor submits a worker's rate to the platform** | Art. 6(1)(f); the submitted worker is a third-party subject who has had no notice from StreamlineOS and often none from the customer | DECISION REQUIRED — **recommended: 6 months after the submission is closed**, matching the `candidates` rejection period in §9 | Talent / Procurement | No worker |

### 13.4 Bank feeds — counterparty names in transaction narratives

| Table / columns | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|
| `fin_bank_transactions`, `fin_bank_imports`, `fin_bank_transfers` (`bank_account_id`, and the imported narrative/description fields) | Bank reconciliation | Art. 6(1)(b) + 6(1)(c) | **CGST Act 2017 s.36 — 72 months**; Companies Act 2013 s.128(5) — 8 years, as books of account | Finance | No worker |
| `bank_profiles.bank_name`, `.display_name` | The organization's own banking profile | Art. 6(1)(b) — **personal data where the customer is a sole proprietor** (§7) | Life of the entity + 8 years | Finance | No worker |

> A bank statement line is free text the platform did not author and cannot bound. It routinely
> carries a **counterparty's name** — a landlord, a contractor, an employee reimbursed by transfer.
> It belongs to the §14 free-text class as much as to Finance, and no import screen tells the
> uploading customer that.

### 13.5 Remaining classes

| Table / columns | Subjects | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|---|
| `certifications.credential_id`, `.credential_url` | Employees | Professional qualification and licence tracking | Art. 6(1)(b) + 6(1)(c) where a licence is legally required for the role | Employment end + 3 years; **longer where a regulator requires proof of competence** | HR / Compliance | No worker |
| `organizations.legal_name`, `.address`, `.billing_email`, `.support_email`, `.support_phone` | The customer organization | Contracting, billing, support routing | Art. 6(1)(b) | **Personal data whenever the customer is a sole proprietor or a single-member entity** — the legal name is then a person's name and the address is their home. Companies Act s.128(5) — 8 years after the relationship ends | Finance / Legal | No worker |
| `blog_authors.email`, `.avatar` | Marketing-site authors, including external contributors | Attribution on published content | Art. 6(1)(a) consent for an external author; Art. 6(1)(b) for staff | Until the author asks for removal, or content retirement + 12 months | Growth | No worker |
| `build.feedback_votes.voter_ip_hash`, `build.roadmap_votes.voter_ip_hash` | Anonymous voters on a public roadmap | One-vote-per-person enforcement | Art. 6(1)(f) | **A hashed IP is pseudonymous, not anonymous** — the input space is small enough to reverse by brute force, so it remains personal data. DECISION REQUIRED — **recommended: 12 months, then drop the hash and keep the tally** | Product | No worker |
| `inv_sales_orders.shipping_address` | **Customers, including individual consumers** | Order fulfilment and delivery | Art. 6(1)(b) | **CGST Act 2017 s.36 — 72 months** where the order is a tax document; otherwise order + 24 months. A shipping address is a home address whenever the buyer is an individual | Operations / Finance | No worker |
| `activity_participants.address`, `relationship_participants.address` | CRM contacts and their organizations | Activity and relationship records | Art. 6(1)(f) — as §10 | As §10 — 24 months from last meaningful contact | Sales Ops | No worker |
| `chat_channel_invite_links.token_hash` | Invitees | Channel invitation | Art. 6(1)(b) | Until revoked or expired | Platform | No worker |
| `hr_automation_rules.webhook_secret`, `hr_webhook_subscriptions.secret`, `inv_webhooks.secret`, `sign_org_settings.webhook_secret`, `support_channels.inbound_secret`, `payment_provider_credentials.secret_ref`, `.webhook_secret_ref` | n/a — credentials | Outbound integration authentication | n/a | Until rotated or the integration is removed | Platform Security | No worker |

> §15 catalogues `webhook_endpoints.secret` alone. There are **seven** webhook-secret columns
> across six modules. Any rotation or breach-response procedure that names only one of them
> leaves the other six live.

---

## 14. Free text, JSON and derived copies

The 602 free-text columns across 432 tables and the `jsonb` columns cannot be catalogued by
column, because their contents are user-supplied. They are catalogued as a class.

| Class | Why it is personal data | Position | Owner |
|---|---|---|---|
| Free-text `notes`, `description`, `body`, `reason`, `comment`, `remarks`, `summary` | An HR note, a support ticket body or a grievance description will contain health, ethnicity, union membership and allegations against named people, whatever the field is called | **No class can be asserted.** Policy position must be: prohibit special-category data in free text; detect and act on it; never claim the field is clean | Privacy / module owners |
| `audit_logs.metadata` (`jsonb`) | Confirmed to carry `email` on the `user.registered` event | Retained on the audit-log period (§15). D1 in §16 | Compliance officer |
| `chat_messages.content` | Internal messages; unbounded | `WORKER` — partitioned monthly, `DETACH PARTITION CONCURRENTLY` + `DROP`, **365-day** retention | Platform |
| Derived copies — `kb_article_chunks`, embeddings, `crm_call_analyses.transcript_hash`, `ai_response_cache`, search indexes | A derived copy is a second copy. Erasing the source and leaving the derivation is a failed erasure | KB chunks have a worker tied to the parent. **Embeddings and cache entries have no documented deletion path** — recorded as D16 | Platform / AI |
| Exports — `gdpr_export_jobs.file_key`, `payroll_run_export_jobs`, HR/expense/finance export workers | An export is a full extract of personal data as a single file in R2 | `gdpr_export_jobs.expires_at` exists; **the R2 object behind it is `MANUAL`.** An expired export job with a live object is worse than no expiry | Privacy / Platform |

---

## 15. Audit, consent evidence and security telemetry

**These rows are the ones that must survive erasure**, and saying why is the point of the section.

| Table / columns | Purpose | Lawful basis | Retention | Owner | Deletion |
|---|---|---|---|---|---|
| `audit_logs` (`user_id`, `actor_user_id`, `org_id`, `action`, `ip_address`, `metadata`) | Security audit, incident investigation, tenant accountability | Art. 6(1)(c) + 6(1)(f); DPDP s.7 legitimate use | **`KEEP-FOREVER` in the retention matrix, with no worker.** DECISION REQUIRED — **recommended: 3 years, then delete.** "Keep forever" is a growth decision, not a privacy one, and it is currently doing duty as both | Compliance officer | `KEEP-FOREVER` — survives erasure by design |
| `audit_logs.metadata.email` on `user.registered` | Traceability of the registration event | Art. 6(1)(f) | **D1 — approve or purge.** Recommended: approve, because the registering email is the identity being audited and hashing it destroys the audit's purpose | Compliance officer | as above |
| `hr_audit_logs` (`ip_address`, `user_agent`), `notification_audit_logs`, `payment_audit_events`, `sign_audit_events` (`actor_email`, `ip_address`, `user_agent`) | Module-level accountability | Art. 6(1)(c) + 6(1)(f) | DECISION REQUIRED — **recommended: align to the parent audit period (3 years).** Four separate audit tables with four separate implicit periods is the failure mode | Compliance / module owners | No worker |
| `operator_access_log` (`operator_user_id`, `org_id`, `action`, `detail`, `ip_address`) | **Break-glass accountability** — a StreamlineOS operator reading customer data | Art. 6(1)(c) + 6(1)(f) | DECISION REQUIRED — **recommended 3 years, and never shorter than the audit-log period.** This is the record that proves the platform did not read a tenant's data without approval | Platform Security | Must never be erasable by the operator it records |
| `notification_consents`, `notification_consent_events` (`ip`, `user_agent`, `state`) | **Proof of consent**, with the capture IP and agent | Art. 7(1) accountability; ePrivacy | Processing period + 3 years. **Survives erasure of the subject** — the evidence is the defence | Privacy | Must survive |
| `notification_preferences` | Channel choices | Art. 6(1)(a)/6(1)(f) by channel | Life of account | Platform | `CASCADE` |
| `notification_deliveries` (`recipient_address`), `notification_outbox`, `email_outbox` (`to_email`), `notification_events` | Delivery and troubleshooting | Art. 6(1)(b) + 6(1)(f) | `WORKER:CronNotificationRetentionService` — **90-day body purge, 13-month record delete**; outbox terminal states 30 days | Platform | `WORKER` |
| `notifications`, `chat_messages` | Notification and chat content | Art. 6(1)(b) | Partitioned + dropped — notifications **180 days**, chat **365 days** | Platform | `WORKER` |
| `sign_recipients` (`email`, `phone`, `otp_code_hash`, `consent_ip`, `consent_user_agent`, `signing_token_hash`), `sign_documents`, `sign_envelopes`, `sign_signature_assets` | **Signature identity and intent evidence** | Art. 6(1)(b) + 6(1)(c) | The evidence must outlive the document. **Recommended: the document's own statutory period** — 8 years where it is a book of account (Companies Act s.128(5)), employment life + payroll floor where it is an HR document | Legal / HR | No worker; the signed PDF is `MANUAL` |
| `policy_acknowledgments.ip_address` | Proof an employee accepted a policy | Art. 6(1)(c) | Employment end + 3 years | HR / Legal | No worker |
| `webhook_logs`, `webhook_endpoints.secret`, `hr_webhook_deliveries`, `inv_channel_webhook_deliveries`, `provider_webhook_events` | Integration delivery and payloads | Art. 6(1)(b) + 6(1)(f) | DECISION REQUIRED — **recommended: payload bodies 30 days, delivery metadata 12 months.** A stored webhook payload is a full copy of whatever it carried | Integrations / Security | Mixed |
| `user_integration_connections` (`account_email`, scopes) | User-authorised third-party connections | Art. 6(1)(a) + 6(1)(b) | Delete on disconnect; keep the consent event 3 years | Integrations / Privacy | Deleted on disconnect |
| `push_subscriptions.user_agent` | Web-push endpoint | Art. 6(1)(a) | Until unsubscribed or the endpoint 410s | Platform | Deleted on 410 |
| `organization_legal_holds`, `hr_legal_holds`, `hr_legal_hold_items` | **Suspend deletion for litigation** | Art. 6(1)(c) + 6(1)(f) | Life of the hold + 1 year. Exercised and proven by `compliance:drill` — an erasure request was correctly refused while a hold was active | Legal | Never auto-deleted |
| `hr_retention_policies` (`record_type`, `retention_months`, `country_code`, `action`) | **Per-org, per-country retention configuration** | Art. 6(1)(c) | Life of the org | Privacy / HR | — |
| `organization_purge_confirmations`, `storage_pending_purge` (`storage_key`, `bucket`, `status`, `failed_reason`) | Org purge and object-purge queue | Art. 6(1)(c) | Purge + 3 years as evidence | Platform / Privacy | The queue exists; **the adapter that drains it is not implemented** (§5) |

---

## 16. External providers — the register (feeds PRD-C185)

Enumerated from `backend/.env.example`, the gateway and adapter sources, not from a prior list.
**Nothing here is approved.** The approval record is
`decisions/privacy-C185-provider-approvals.md`.

`subprocessors` and `subprocessor_subscribers` exist as tables and are **empty, with no
application code reading or writing them** — the only reference in the repository is a column
name in `backend/src/scripts/scan-legacy-org-actors.mjs:59`. There is therefore **no published
subprocessor list and no subscriber notification path**, which is a DPA commitment most
enterprise customers require. Recorded as D18.

| # | Provider | Called from | Personal data it receives | Region | Retention at the provider | Transfer basis |
|---|---|---|---|---|---|---|
| P1 | **Neon** (Postgres) | `DATABASE_URL` | **Everything in this catalogue** | `PRIMARY_REGION=primary` — a label, not a geography | Provider-determined + PITR window | DECISION REQUIRED |
| P2 | **Cloudflare R2** | `R2_*`, `setup-r2-buckets.ts` | Every uploaded and generated file: CVs, ID scans, payslip PDFs, signed documents, avatars, feedback screenshots, GDPR export bundles | `R2_REGION=auto` — **Cloudflare chooses** | **Indefinite — nothing is ever deleted** (§5) | DECISION REQUIRED |
| P3 | **Upstash** (Redis) | `UPSTASH_REDIS_REST_URL` | Session tokens, permission versions, rate-limit counters, AI retention cursors | Per-URL; a test fixture references `cell-2.upstash.io` | TTL-bounded | DECISION REQUIRED |
| P4 | **ZeptoMail** (Zoho) | `EMAIL_PROVIDER=zeptomail` (**the default**), `ZEPTOMAIL_API_URL=https://api.zeptomail.in/v1.1/email` | Recipient address, subject, full body — payslip notices, invitations, offer letters | **`.in` endpoint — India** | Provider-determined | India; adequacy/DPA to confirm |
| P5 | **Resend** | `EMAIL_PROVIDER=resend` | as P4 | Provider-determined | Provider-determined | DECISION REQUIRED |
| P6 | **Twilio** | `TwilioGateway`, `backend/src/modules/email/dispatch/twilio.gateway.ts` | **Phone number and full message body**, SMS and WhatsApp | Provider-determined | Provider-determined | DECISION REQUIRED. **Absent from revision 1** |
| P7 | **Ably** | `backend/src/modules/realtime/ably.service.ts` | Realtime channel names (embed org and user ids) and message bodies | Global edge | Transient | SCCs required for EU data |
| P8 | **OpenAI** | `llm-provider.config.ts`, `embeddings.service.ts` | Prompts, and **all KB/support embeddings — always, even when `AI_LLM_PROVIDER=openrouter`** | Provider-determined | Provider-determined; zero-retention terms to confirm | DECISION REQUIRED |
| P9 | **Google Generative AI** | `AI_CHAT_PROVIDER=google` (**the default**) | Chat prompt content | Provider-determined | Provider-determined | DECISION REQUIRED |
| P10 | **OpenRouter** | `AI_LLM_PROVIDER`/`AI_CHAT_PROVIDER=openrouter`, `https://openrouter.ai/api/v1` | Prompts — **then forwarded to an underlying model provider that OpenRouter selects** | **Двойной hop; the terminal processor is not knowable from configuration** | Depends on the terminal model | **Must not be enabled for personal data until the model allow-list is fixed and disclosed** |
| P11 | **Composio** | `backend/src/modules/integrations/core/composio.gateway.ts` | OAuth tokens **and, through Gmail/Outlook/Google Calendar toolkits, mailbox and calendar content** — `COMPOSIO_AUTH_CONFIG_GMAIL`/`_OUTLOOK`/`_GOOGLE_CALENDAR` | US (`app.composio.dev`) | Provider-determined | SCCs + user disclosure required. Revision 1 understated this as "OAuth tokens" |
| P12 | **Razorpay** | `backend/src/modules/billing/payments/adapters/razorpay.adapter.ts` | Customer email, amount, payment signature | **India** | Statutory (RBI/PA-PG) | India |
| P13 | **Cloudflare Turnstile** | `backend/src/common/security/turnstile.service.ts` | **Visitor IP address** and challenge token | Cloudflare global | Transient | DECISION REQUIRED. **Absent from revision 1** |
| P14 | **Web Push (VAPID)** | `backend/src/modules/realtime/web-push.service.ts` | Push endpoint (identifies the browser/device) and notification body → **Google FCM / Mozilla / Apple**, whichever the subscriber's browser names | Browser-vendor-determined | Transient | DECISION REQUIRED. **Absent from revision 1** |
| P15 | **TURN/STUN relay** | `TURN_URLS`, `GET /realtime/ice-servers` | **Relayed audio/video and the participants' IP addresses** for huddle calls across strict NATs | Operator-configured; unset by default | Transient | DECISION REQUIRED. **Absent from revision 1** |

---

## 17. Evidence

Commands run on 2026-09-03 against `postgresql://tarunchintakunta@localhost:5432/scratch_head_1010`
(local; the remote Neon branch was not touched). Artifacts under
`architecture-refactor/final-refactor/evidence/42-production-ops/`.

| Command | Exit | Result | Artifact |
|---|---|---|---|
| `psql -f pd-column-scan.sql` (revision 3) | 0 | 1,027 base tables / 13,536 columns scanned; **296 personal-data columns in 136 tables**; **35 of those tables were named nowhere in revision 2** | `data-catalogue-c183/pd-column-scan.sql` |
| `npm run compliance:drill` | **0** | 7 audit rows; erasure correctly refused under legal hold; **3 gaps self-reported** (§5) | `RB-10-privacy-compliance/runs/01-compliance-drill-execute.txt` |
| `npm run check:retention-coverage:self-test` | **0** | 22 checks pass — the gate detects an uncovered high-growth table | `.../runs/06-check-retention-coverage-self-test.txt` |
| `npm run check:retention-coverage` (live) | 0 | `uncovered: []`, `allHighGrowth: []` — **the scratch DB is schema-only; this is not retention evidence** | `.../runs/05-check-retention-coverage.txt` |
| `node ai-redaction-probe.mjs` — loads the real `redaction.util.ts` and strips only its type annotations | **0** | **14 of 20 probe strings unredacted**; all 6 controls caught; every Indian identifier passes through | `.../data-catalogue-c183/ai-redaction-probe.txt` |
| `grep -rn "redact:\s*false" src/` | 0 | 12 matches — **11 production call sites**, 1 spec | listed in §11 |
| `node` parse of `RETENTION_MATRIX` | 0 | **28** tables carry a retention decision (revision 2 said 19) | §5 |

Every artifact above was produced on this machine against the local database. **No row in this
table is a simulation, and no row describes a deployed environment.**

**Not evidenced here, and not claimed:** no deployed environment exists on this machine, so
PRD-C186 (deployed export/erasure/portability drills), PRD-C187 (object/search/vector/cache
deletion and backup aging) and live provider region attestations were **not** run. §5's gaps mean
that even in a deployed environment, C187 would fail today.

---

## 18. Decisions required

Every row is unresolved. D1–D15 carry forward from revision 1 with their numbering intact;
D16–D22 are new from this scan. Signature blocks are in the two decision records.

| # | Item | Recommended default | Record |
|---|---|---|---|
| D1 | `audit_logs.metadata` stores email on `user.registered` | **Approve** under Art. 6(1)(f) — the email *is* the identity being audited | C184 |
| D2 | Chat and mail message retention | Chat 365 days (already worker-enforced); mail 365 days from `synced_at` | C184 |
| D3 | Audit-log retention | **3 years, then delete** — replace `KEEP-FOREVER` | C184 |
| D4 | Upstash region | Match the primary app region; SCCs if EU | C185 |
| D5 | R2 bucket region | Pin explicitly; `R2_REGION=auto` is not a residency answer | C185 |
| D6 | ZeptoMail adequacy | India endpoint confirmed; execute the Zoho DPA | C185 |
| D7 | OpenRouter adequacy | **Do not enable for personal data** until the model allow-list is fixed | C185 |
| D8 | AI PII-stripping **scope** (restated) | Layer exists; **extend to PAN/Aadhaar/UAN/IFSC/+91 and review the 11 `redact: false` sites** | C185 |
| D9 | Special-category HR collection | Do not collect biometric, wellness, accommodation or safety data until the Art. 9 condition, access limits and retention are approved | C184 |
| D10 | AI conversation and usage retention | 90 days conversations/jobs; 730 days usage metadata (already worker-enforced) | C184 |
| D11 | KB and support retention | KB chat 90 days (worker-enforced); support closure + 2 years | C184 |
| D12 | Signature evidence retention | The signed document's own statutory period | C184 |
| D13 | Notification consent and delivery retention | Consent evidence processing + 3 years; delivery 90-day body purge / 13-month record (worker-enforced) | C184 |
| D14 | Integration and webhook payload handling | Payload bodies 30 days; delivery metadata 12 months | C184 |
| D15 | Organization and collaboration metadata | Closure-based periods with named owners | C184 |
| **D16** | **Erasure does not erase.** `database_rows` marks `PURGED` without deleting; object storage returns `FAILED`; no export worker exists | **Do not answer a DSAR as "completed" until these three adapters are built.** Treat as a release blocker for any customer with an erasure SLA | C184 |
| **D17** | **Residency is undeclared.** `PRIMARY_REGION=primary`, `R2_REGION=auto`, `REGION_KEYS` unset — and §7 shows Indian statutory payroll data | Declare one region per organization; pin R2; publish the map | C184 |
| **D18** | **The subprocessor register is empty and unwired** | Populate `subprocessors` from §16, wire the subscriber notice path, publish the list | C184 + C185 |
| **D19** | **`blood_group` is health data in plaintext; `disciplinary_records` and `grievance_records` are unbounded plaintext `jsonb`** likely to hold POSH allegations | Encrypt all three; record the Art. 9 condition; set retention | C184 |
| **D20** | **Third-party subjects with no notice path** — `emergency_contact`, `hr_dependents`, `candidate_reference_checks` referees, `referrals.referred_email`, mailbox correspondents, feedbucket reporters | Author an Art. 14 notice position for each, or stop collecting | C184 |
| **D21** | **`feedbucket_submissions.console_logs` / `.network_logs` / `.screenshot_url`** capture uncontrolled third-party personal data and secrets from an end user's browser, then send it to an AI model | Strip logs at 30 days; scrub tokens on ingest; disclose the capture to the reporter | C184 + C185 |
| **D22** | **Breach handling has no named owner, clock or channel** anywhere in the repository | Adopt the 72-hour GDPR Art. 33 clock and the DPDP s.8(6) obligation; name the on-call decision-maker | C184 |
| **D23** | **`devices.fingerprint`** is a durable per-user device fingerprint with no retention and no recorded ePrivacy Art. 5(3) position (§13.2) | Record the strictly-necessary security argument or take consent; delete 12 months after `last_seen_at` | C184 |
| **D24** | **`support_tickets` / `support_ticket_messages` hold third-party requester emails** and have no retention decision, while the parallel `helpdesk_tickets` does (§13.1) | Give both ticket tables one decision — closure + 24 months — or merge them | C184 |
| **D25** | **`hr_comp_recommendations`** holds a pay recommendation about an identified employee; if a model produces or ranks it, **GDPR Art. 22** is engaged (§13.3) | Record whether a model is in the loop, and if so the human-review path and the subject's right to contest | C184 |
| **D26** | **Seven webhook-secret columns across six modules** (§13.5); rotation and breach procedures name one | Enumerate all seven in the rotation runbook and the breach playbook | C184 + C185 |

---

## 19. Approval record

**This catalogue is not approved.** Approval is recorded in, and only in:

- `architecture-refactor/decisions/privacy-C184-pii-policy.md` — PII policy: audit metadata,
  residency and transfers, subprocessors, breach handling, payroll/tax jurisdiction, and
  controller/processor duties.
- `architecture-refactor/decisions/privacy-C185-provider-approvals.md` — AI and integration
  provider approvals: regions, PII minimisation, retention, deletion and disclosure.

Both records were **written by revision 3** — revision 2 named them but neither file existed on
disk — and are authored complete with **every signature field blank**. They were prepared by an
automated agent from the evidence in §17 and carry no approval of any kind. The agent that wrote
them is not Product, Security, Privacy/DPO, Operations, Legal or Finance, and did not sign as any
of them. A named Product,
Security, Privacy/DPO, Operations, Legal and Finance signatory must review and sign each one
before PRD-C183, C184 or C185 may be marked complete.
