# S05 approval and evidence record — PII policy (PRD-C184)

> **UNSIGNED DRAFT — NOT AN APPROVAL.**
> Every field below except the signatures has been authored from measured evidence so that a
> human has only to review, choose, and sign. No signature, name, approval reference or
> decision status in this file has been supplied by any accountable person. Until the
> signature rows are filled in by the named humans themselves, this record satisfies nothing:
> it is an input to PRD-C184, not the approval PRD-C184 asks for. Do not cite it as evidence
> that a PII policy has been approved.
>
> Authored 2026-09-03 by an automated agent working ticket 35 (PRD-C183 / PRD-C184) from
> `architecture-refactor/DATA-CATALOGUE.md` revision 3 and the evidence at
> `architecture-refactor/final-refactor/evidence/42-production-ops/RB-10-privacy-compliance/`.
> The agent is not Product, Security, Privacy/DPO, Operations, Legal or Finance and has not
> signed as any of them.

## Decision identity

- Record ID: `S05-PII-POLICY-001`
- Decision date (UTC): _blank — the date the approvers below actually sign_
- Review/expiry date: _proposed_ 12 months from signature, or immediately on any of:
  a new subprocessor, a new deployment region, a change to `ENCRYPTION_KEY` handling, or the
  first customer contract carrying an erasure SLA — whichever is sooner
- Decision status: _blank — `approved` / `approved-with-conditions` / `rejected` / `deferred`_
- Scope: all personal data processed by StreamlineOS on branch `release/code-10-10-v2`,
  backend commit `45f8a2e99`, frontend commit `7469d2789`. **1,027 base tables / 13,536
  columns scanned; 296 personal-data columns across 136 tables** (DATA-CATALOGUE §0.1).
  Covers every organization and every region — the platform is not region-partitioned in
  configuration today (see §2 below). Environments: every environment running this commit.

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

## Decision

PRD-C184 names six items. Each is put below with the measured implemented state, the options,
and a recommended default. **The recommendation is the agent's; the decision is the signer's.**

### 1. Audit metadata

**Implemented state.** `audit_logs` carries `user_id`, `actor_user_id`, `org_id`, `action`,
`ip_address` and a `jsonb` `metadata` column. `metadata` is confirmed to carry an **email
address** on the `user.registered` event. `audit_logs` is `KEEP-FOREVER` in `RETENTION_MATRIX`
with **no worker** — there is no code path that ever deletes an audit row. Three further audit
tables exist with no retention decision at all: `hr_audit_logs` (which is in the matrix),
`notification_audit_logs`, `payment_audit_events` and `sign_audit_events` (which are not).

**Decision required.**

| # | Item | Option A | Option B (recommended) | Option C |
|---|---|---|---|---|
| D1 | Email in `audit_logs.metadata` | Hash it at write time | **Retain in clear** — the registering email *is* the identity being audited; hashing destroys the record's purpose | Drop the field |
| D3 | Audit-log retention | Keep forever (today's behaviour) | **3 years, then delete** | 7 years |
| — | The other four audit tables | Leave implicit | **Align all five to the D3 period, with one worker** | Per-table periods |

**Rationale for the recommendation.** "Keep forever" is currently doing duty as both a privacy
position and a growth position, and it was never chosen as either — it is the default that
results from having no worker. Three years covers the limitation period for the disputes an
audit log is kept to defend, and is the shortest period that does not weaken incident
investigation. Note the direction of travel honestly: **shortening audit retention is a
security cost accepted for a privacy benefit**, and Security should say so or refuse.

**Operator access is the exception.** `operator_access_log` records a StreamlineOS operator
reading a customer's data. It must be retained **at least** as long as the audit period and
must never be erasable by the operator it records. Approved separately in
`decisions/operator-access-2026-09-03.md`.

### 2. Residency and transfers

**Implemented state, and it is the finding that most needs a decision.** No processing location
is established anywhere in repository configuration:

| Setting | Value | What it means |
|---|---|---|
| `PRIMARY_REGION` | `primary` | a **label, not a geography** |
| `R2_REGION` | `auto` | **Cloudflare chooses** the bucket's location |
| `REGION_KEYS` | `primary,cell-2` | cell names, not countries |

Meanwhile DATA-CATALOGUE §7 shows the platform stores **Indian statutory payroll data** — PAN,
TDS ledgers, PF/UAN, ESI, Form 16 inputs — under retention floors of six to eight years.

**Decision required (D17).** Declare one region per organization; pin `R2_REGION` explicitly
rather than `auto`; publish the region map to customers.

**Recommended default:** an **India-resident default region** for any organization running
payroll, with EU and US regions available for organizations that do not. The reason is not
preference but consequence: if an Indian organization's payroll data is placed in an EU or US
region, that statutory data leaves India for six to eight years, and the transfer is not a
one-off — it is the location of the record for the whole of its statutory life.

**Transfer basis.** Every provider in §16 of the catalogue is a cross-border transfer unless it
is pinned in-region. SCCs (or the DPDP s.16 route) must be executed **before** the region is
declared, not after. Legal to confirm which mechanism applies per provider.

### 3. Subprocessors

**Implemented state (D18).** The tables `subprocessors` and `subprocessor_subscribers` exist
and are **empty, with no application code reading or writing them.** The only reference in the
entire repository is a column name in `backend/src/scripts/scan-legacy-org-actors.mjs:59`.
There is therefore **no published subprocessor list and no subscriber notification path** —
a commitment most enterprise DPAs require.

**Decision required.** Populate `subprocessors` from the fifteen providers enumerated in
DATA-CATALOGUE §16; wire the subscriber notice path; publish the list; commit to a notice
period before adding a new subprocessor.

**Recommended default:** publish the list, and commit to **30 days' notice with a right to
object** before a new subprocessor begins processing. Approve the provider set itself in the
companion record `privacy-C185-provider-approvals.md` — this record approves only the
*obligation to publish and notify*.

### 4. Breach handling

**Implemented state (D22).** There is **no breach-handling owner, clock, or channel anywhere in
the repository.** Not a stale one — absent. This is the item on which the platform is furthest
from a defensible position, because the obligation runs on a clock that starts without warning.

**Decision required.** Adopt a written procedure naming, at minimum:

| Element | Recommended default | Why |
|---|---|---|
| Regulator clock | **GDPR Art. 33 — 72 hours** from awareness | the binding outer limit |
| Indian obligation | **DPDP Act 2023 s.8(6)** — notify the Data Protection Board *and each affected Data Principal* | DPDP has **no risk threshold**: unlike GDPR there is no "unlikely to result in a risk" exemption, so an Indian breach is notifiable even when a GDPR one would not be |
| Decision-maker | a **named on-call role** empowered to declare a breach out of hours | the clock does not wait for a quorum |
| Controller notification | notify the customer **without undue delay**, as processor | Art. 33(2) — the processor's own duty |
| Channel | a monitored address plus the `subprocessor_subscribers` path once wired | §3 above |
| Evidence | every breach recorded with the same hashing/redaction discipline as the drills | so the record survives review |

**The DPDP asymmetry is the point.** A policy written only to the GDPR threshold will
under-notify in India, which is where this platform's statutory payroll data lives.

### 5. Payroll and tax jurisdiction

**Implemented state.** DATA-CATALOGUE §7 catalogues sixteen payroll and tax classes against
named Indian statutes. **Retention here is largely not a policy choice**, and the record says so
rather than deferring it:

| Statute | Floor it sets |
|---|---|
| Income-tax Rules 1962, Rule 6F(5) | **6 years** from the end of the relevant assessment year |
| Income-tax Act 1961, s.149(1)(b) | reassessment up to **10 years** in specified cases |
| Payment of Wages Act 1936, s.13A | wage registers **3 years** after the last entry |
| Companies Act 2013, s.128(5) | books of account **8 financial years** |
| CGST Act 2017, s.36 | **72 months** from the due date of the annual return |
| ESI (General) Regulations 1950, Reg. 66 | register of employees **5 years** |
| EPF & MP Act 1952 / EPF Scheme 1952 para 76 | preservation required; **no single period stated** |
| Payment of Gratuity Act 1972 | **no express preservation period**; limitation-driven |

**Decision required — and it is narrow.** Only three things are genuinely open, and Legal is
asked to *confirm*, not to choose a policy:

1. Whether the 6-year (Rule 6F) or the 10-year (s.149) income-tax period is operative for this
   data set. **Recommended: adopt 8 years** — it satisfies Companies Act s.128(5) and CGST s.36
   simultaneously and sits between the two income-tax figures; adopting a single number avoids
   eight parallel deletion schedules that will not be built.
2. The operative EPF preservation period, which the Act does not state.
3. The gratuity period, which is limitation-driven rather than statutory.

**Everything else in §7 is a statutory floor and is not a decision.** No signer should be asked
to "approve" a retention period that Parliament has already set.

**Consequence to accept explicitly:** these floors mean a data subject's Art. 17 / DPDP s.12(3)
erasure request **cannot** be honoured for payroll data during the floor. That refusal is lawful
(Art. 17(3)(b) — compliance with a legal obligation) but it must be *disclosed in the privacy
notice*, not discovered by the subject at the point of refusal.

### 6. Controller / processor duties

**Position.** For customer workforce, CRM, support and build data, the **customer organization
is the controller** and **StreamlineOS is the processor**. For platform accounts, billing,
security telemetry and the marketing site (`platform_waitlist`, `platform_messages`,
`platform_visits`), **StreamlineOS is the controller**.

**The duties that follow, and their measured state:**

| Art. 28 duty | State today | Gap |
|---|---|---|
| Process only on documented instructions | Implicit in the product surface | No DPA text in the repository |
| Confidentiality commitments | Employment terms | Not evidenced here |
| Art. 32 security | Real: AES-256-GCM envelope encryption on 6 sensitive columns; `ENCRYPTION_KEY` validated ≥32 chars and the app **refuses to start without it** (`env.validation.ts:110-112`); RLS `tenant_isolation` on `org_id` | **8 of 23 columns in `hr_employee_sensitive_fields` are plaintext**, including `blood_group` (health data) and two unbounded `jsonb` columns likely to hold POSH allegations — **D19** |
| Subprocessor engagement + notice | **Absent** | D18, §3 above |
| Assist with data-subject rights | Partial | **D16 — see below** |
| Delete or return at end of contract | Queue exists, adapter does not | D16 |
| Make available information for audits | This catalogue | Unsigned until this record is signed |

**D16 is the release-blocking one and must not be softened.** The compliance drill
(`runs/01-compliance-drill-execute.txt`, exit 0) self-reports three gaps:

```
INCOMPLETE: Export pipeline — hr_data_requests tracks requests; no export worker
            produces an actual data file.
INCOMPLETE: object_storage purge adapter — returns FAILED
            ('not yet implemented, manual cleanup required').
INCOMPLETE: database_rows adapter — marks statusV2=PURGED but does NOT physically
            delete tenant data rows.
```

**Read plainly: an erasure request today produces an audit trail and a status change, not a
deletion, and no object in Cloudflare R2 is ever deleted by the platform.** The recommended
decision is therefore not a retention period but a constraint: **do not answer any DSAR as
"completed", and do not sign a customer contract carrying an erasure SLA, until those three
adapters exist.** A processor that reports an erasure it did not perform has made a false
statement to a controller.

---

## Retention periods and accountable owners (summary of the open cells)

Every row is `DECISION REQUIRED` in DATA-CATALOGUE with the recommendation repeated here.
Rows whose period is set by statute are **not** listed — see §5.

| Data class | Recommended period | Reason | Owner |
|---|---|---|---|
| `personal_email` (workforce) | Employment end + 1 year | its only post-exit purpose is statutory payslips and Form 16, complete within one assessment year | HR Manager |
| `blood_group`, `medical_notes` | Employment end / accommodation end + 1 year | the note's purpose ends with the adjustment it justifies | HR / Occ. health |
| `disciplinary_records`, `grievance_records` | 3 years from closure | industrial-dispute limitation; POSH matters follow the POSH Act 2013 cycle | HR / Legal |
| `login_history` | 12 months | long enough to show a user a year of logins, short enough that a stale IP history is not a standing disclosure risk | Platform Security |
| `devices.fingerprint` (**D23**) | 12 months after `last_seen_at` | a fingerprint for a device unseen in a year identifies a person without protecting them | Platform Security |
| Unaccepted `invitations` | 90 days after expiry | an email address held about someone who never engaged | Platform |
| CRM prospect records | 24 months from last meaningful contact | a prospect record that has not moved in two years is a liability, not a legitimate interest | Sales Ops / Privacy |
| `crm_imports` raw rows | 30 days after import completes | a duplicate copy whose only purpose was the import | Sales Ops |
| AI conversations (`ai_chat_*`) | 90 days after last message | the assistive purpose does not survive the quarter | AI / Privacy |
| `support_tickets` (**D24**) | Closure + 24 months | aligns the table with its twin `helpdesk_tickets`, which already has a decision | Support |
| `hr_comp_recommendations` (**D25**) | Review cycle + 3 years | and **record whether a model is in the loop — Art. 22 applies if so** | HR / Compensation |
| `build.feedbucket_submissions` | 12 months; console/network logs stripped at 30 days | the log pair routinely contains bearer tokens and *other people's* data from the page under test | Product / Privacy |
| Suppression / do-not-contact lists | **Never delete** | an opt-out must outlive the erasure of everything else about that person, or the opt-out is lost — explicit Art. 17(3)(b) carve-out | Privacy |
| Consent evidence | Processing period + 3 years | deleting consent evidence destroys the defence, not the risk | Privacy |

**Third-party subjects with no notice path (D20)** — `emergency_contact`, `hr_dependents`,
`candidate_reference_checks` referees, `referrals.referred_email`, mailbox correspondents,
`vendor_candidate_submissions`, support requesters and feedbucket reporters. Each is a person
the platform holds data about who was never asked and cannot be reached. **Art. 14 requires
notice; there is no path to give it.** The honest options are to author a notice position per
class or to stop collecting. Recommended: stop collecting where the field is optional
(`blood_group`, referee phone), and disclose the rest through the controller's own notice.

## Customer-facing commitment or disclosure

Recommended, contingent on signature:

1. Publish the subprocessor list and commit to 30 days' notice (§3).
2. Publish the region map once declared (§2).
3. State in the privacy notice that **payroll data cannot be erased during its statutory floor**
   (§5) — before a subject asks, not after.
4. **Do not publish an erasure SLA until D16 is closed** (§6).
5. Disclose the feedbucket console/network-log capture to the reporter at capture time (D21).

---

## Evidence index

| Evidence | Commit/environment | Timestamp (UTC) | Result | Artifact path or hash |
|---|---|---|---|---|
| Personal-data column scan | `scratch_head_1010`, local | 2026-09-03 | 1,027 tables / 13,536 columns; **296 PD columns in 136 tables**; 35 tables uncatalogued before revision 3 | `.../data-catalogue-c183/pd-column-scan.sql` |
| `npm run compliance:drill` | backend `45f8a2e99`, local | 2026-09-03T16:20:30Z | **exit 0** — 7 audit rows; erasure correctly refused under legal hold; **3 gaps self-reported** | `.../RB-10-privacy-compliance/runs/01-compliance-drill-execute.txt` |
| `check:retention-coverage:self-test` | backend `45f8a2e99` | 2026-09-03 | **exit 0** — 22 checks pass; the gate detects an uncovered high-growth table | `.../runs/06-check-retention-coverage-self-test.txt` |
| `check:retention-coverage` (live) | `scratch_head_1010` | 2026-09-03 | exit 0, `allHighGrowth: []` — **schema-only DB; not retention evidence** | `.../runs/05-check-retention-coverage.txt` |
| AI redaction probe | backend `45f8a2e99` | 2026-09-03T16:36:33Z | **exit 0 — 14 of 20 unredacted**; all 6 controls caught | `.../data-catalogue-c183/ai-redaction-probe.txt` |
| `RETENTION_MATRIX` parse | backend `45f8a2e99` | 2026-09-03 | **28** tables carry a decision, of 1,027 | `check-retention-coverage.mjs:46-192` |
| Data catalogue | frontend `7469d2789` | 2026-09-03 | Revision 3 | `architecture-refactor/DATA-CATALOGUE.md` |
| Deployed export/erasure drills (**PRD-C186**) | — | — | **NOT RUN — no deployed environment exists on this machine** | none |
| Object / vector / cache / backup deletion (**PRD-C187**) | — | — | **NOT RUN — and §6 shows it would fail today** | none |

## Conditions and residual risk

| Condition or risk | Owner | Due date | Mitigation | Release-authority disposition |
|---|---|---|---|---|
| **D16 — erasure does not erase.** Three adapters missing; a DSAR completes without deleting | Platform / Privacy | | Build the export worker, the R2 purge adapter and the row-delete adapter | **Recommend: release-blocking for any customer with an erasure SLA** |
| **D17 — residency undeclared.** `PRIMARY_REGION=primary`, `R2_REGION=auto`, with Indian statutory payroll data in scope | Operations / Legal | | Declare regions, pin R2, publish the map | |
| **D18 — subprocessor register empty and unwired** | Privacy / Legal | | Populate from §16, wire notice, publish | |
| **D19 — `blood_group` health data in plaintext; `disciplinary_records`/`grievance_records` unbounded plaintext `jsonb`** likely to hold POSH allegations, no Art. 9 condition recorded | Security / HR | | Encrypt all three; record the Art. 9 condition; set retention | |
| **D22 — no breach owner, clock or channel** | Security / Legal | | Adopt §4 | |
| **AI redaction is US-shaped.** 14 of 20 probe strings pass, including every Indian identifier; 11 production sites disable redaction outright | AI / Privacy | | See `privacy-C185-provider-approvals.md` D8 | |
| **PRD-C186 / C187 not executed** — no deployed environment | Operations | | Re-run in a deployed environment before release | **Cannot be closed from this machine** |

## Attestation

I confirm that this decision covers the stated scope, that the evidence index is accurate and
redacted appropriately, and that deferred conditions remain tracked.

- Release authority:
- Name/title:
- Date:
- Signature or approval reference:
