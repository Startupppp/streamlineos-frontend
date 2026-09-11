# S05 approval and evidence record — Operator / break-glass access policy

> **UNSIGNED DRAFT — NOT AN APPROVAL.**
> Every field below except the signatures has been authored from measured evidence so
> that a human has only to review, choose, and sign. No signature, name, approval
> reference or decision status in this file has been supplied by any accountable
> person. Until the signature rows are filled in by the named humans themselves, this
> record satisfies nothing: it is an input to PRD-C180, not the approval PRD-C180 asks
> for. Do not cite it as evidence that operator access has been approved.
>
> Authored 2026-09-03 by an automated agent working ticket 35 (PRD-C180 / PRD-C181)
> from the evidence at
> `architecture-refactor/final-refactor/evidence/42-production-ops/break-glass/`.
>
> Filed under a distinct name rather than the template's `privacy-YYYY-MM-DD.md` so it
> does not collide with the broader S05 privacy record covering PRD-C182/C184/C185.

## Decision identity

- Record ID: `S05-OPERATOR-ACCESS-001`
- Decision date (UTC): _blank — the date the approvers below actually sign_
- Review/expiry date: _proposed_ 12 months from signature, or immediately on any change
  to the grant scopes, the maximum duration, or the approval rule — whichever is sooner
- Decision status: _blank — `approved` / `approved-with-conditions` / `rejected` / `deferred`_
- Scope: the break-glass / operator-access mechanism in
  `backend/src/modules/platform/` on branch `release/code-10-10-v2`, commit `45f8a2e99`.
  Covers **all** organizations and **all** regions, since the grant tables are not
  region-partitioned. Data categories reachable under a grant: organization identity,
  organization membership (name, email, role, join date), subscription state, and
  platform payment history. Environments: every environment running this commit. The two
  grant-gated routes are
  `GET /platform/operator/organizations/:orgId` (scope `read_customer_data`) and
  `GET /platform/operator/organizations/:orgId/billing` (scope `read_payments`).

## Accountable approval

| Function | Name | Role/title | Decision | Date | Signature or approval reference |
|---|---|---|---|---|---|
| Product | | | | | |
| Security | | | | | |
| Privacy/DPO | | | | | |
| Operations | | | | | |
| Legal | | | | | |
| Finance | | | | | |

## Decision

### Item(s) and chosen option

Four decisions are put to the approvers. The implemented state is recorded for each;
options are stated so that a choice can be made rather than inferred.

**D1 — Approval rule (the two-person / no-self rule).**
Implemented today: the person who *requests* a grant cannot approve it. Enforced twice —
`platform-operator-access.service.ts:143` and the database `CHECK chk_oag_self_approval`
(`approver_id IS NULL OR approver_id <> granted_by`). Neither check compares the approver
with `operator_user_id`, so **the operator who receives the access may approve their own
grant** when a third party filed the request. Measured: drill check `C181-5c`, the single
FAIL in `runs/03-drill-c181-rejections.txt`.

- Option D1-a — require `approver_id <> granted_by` **and** `approver_id <> operator_user_id`.
  Two distinct humans neither of whom holds the resulting access. *Recommended.*
- Option D1-b — keep today's rule and accept beneficiary self-approval as residual risk,
  recorded below with a compensating detective control.
- Option D1-c — require an approver drawn from a named approver group rather than any
  eligible admin.

**D2 — Immutability of the operator-access audit trail.**
Implemented today: `public.audit_logs` is genuinely append-only for the application role
(`UPDATE`/`DELETE` revoked, `audit_logs_append_only` trigger present, verified
2026-09-03 by `check:audit-log-privileges`, exit 0). **Break-glass does not write there.**
It writes `public.operator_access_log`, on which the application role holds both `UPDATE`
and `DELETE` and which carries no trigger. Measured, on a real row and rolled back:
`UPDATE 1`, then `DELETE 1`, `breakglass_rows_remaining = 0`
(`runs/04-probe-breakglass-audit-mutability.txt`).

- Option D2-a — extend the `0930` pattern to `operator_access_log` (and to
  `operator_access_grants`): revoke `UPDATE`/`DELETE` from `streamline_app`, add the
  append-only trigger, and widen `verify-audit-log-privileges.mjs` to assert both tables.
  *Recommended.* This is what makes C180's "immutable audit" true.
- Option D2-b — route operator-access events into `public.audit_logs` as well, keeping
  `operator_access_log` as a mutable operational index.
- Option D2-c — accept a mutable break-glass trail. Not recommended: the role that can
  exercise break-glass is the same role that can erase the evidence of it.

**D3 — Grant defaults.**
Implemented today: `operator_access_grants.status` is `NOT NULL DEFAULT 'active'`
(`backend/src/db/schema/common/platform.ts:141`), and the authorization predicate never
requires `approver_id IS NOT NULL`. A row inserted without an explicit `status` is live,
unapproved, and authorizes access — measured in
`runs/05-probe-default-active-unapproved-grant.txt`. The single application insert path
sets `status: 'pending'` explicitly (`service.ts:91`), so this is not reachable over the
API on this commit.

- Option D3-a — change the default to `'pending'` and add
  `CHECK (status <> 'active' OR approver_id IS NOT NULL)`. *Recommended.*
- Option D3-b — leave the default and rely on the single code path, tracked as residual risk.

**D4 — Notification and customer-facing disclosure.**
Implemented today: one event, `security.operator_access.requested`, emitted at request
time only (`service.ts:104-116`). It is a mandatory, non-user-configurable,
quiet-hours-bypassing catalog event
(`notification-events-security-support.catalog.ts:14-22`) — but its recipients are
`[operatorUserId]`, i.e. the operator about to receive the access. **No one in the
customer organization is notified**, at request, approval, use, revocation or expiry.

- Option D4-a — notify the customer organization's owner and admins on request, approval
  and revocation, and send a summary of what was accessed after the grant closes.
  *Recommended if any customer-facing commitment is made.*
- Option D4-b — notify on approval only.
- Option D4-c — no customer notification; disclose the mechanism in the trust/security
  page and make the log available on request.

### Purpose and lawful basis (where applicable)

Purpose: incident response and customer support requiring sight of a single customer
organization's data. Every grant carries a mandatory `incident_ref` and a free-text
`reason` of 3–1000 characters that must differ from the incident reference
(`service.ts:391-397`).

Lawful basis: _blank — Privacy/DPO to state._ The defensible reading is legitimate
interests for security and service continuity (GDPR Art. 6(1)(f)), with the controller
relationship and any processor-side commitment stated in D4 and in the customer DPA.
This must be stated by the DPO, not inferred.

### Retention period and accountable owner

- `operator_access_grants`, `operator_access_log`: _blank — retention period to be set._
  Neither table appears in a retention policy today. A break-glass trail is normally kept
  longer than ordinary application data (2–7 years is the usual range) and must be kept
  at least as long as the incident records it references.
- Accountable owner: _blank — proposed: Head of Security._

### Residency, transfer, DPA/SCC, and subprocessor position

The grant tables are not region-partitioned: `operator_access_grants` and
`operator_access_log` are keyed by `org_id` text and are subject to the standard
`tenant_isolation` RLS policy, but placement follows the organization's own cell. An
operator in one jurisdiction may hold a grant against an organization in another; the
record of that access lives with the organization's data. No new subprocessor is
introduced by this mechanism. _Legal to confirm whether cross-jurisdiction operator
access requires a transfer basis distinct from the customer's existing DPA._

### Operator-access parameters (if applicable)

| Parameter | Implemented value | Source |
|---|---|---|
| Scopes | `read_customer_data`, `read_messages`, `read_payments`, `read_leads`, `manage_subscription` | `service.ts:20-25` |
| Grant-gated routes | 2 (both `GET`) | `platform-operator-customer.controller.ts:18-31` |
| Maximum duration | 4 hours from request | `service.ts:27`, enforced `service.ts:63-67` |
| Expiry enforcement | at every authorization, not only by the sweep | `service.ts:334` |
| Reason | mandatory, 3–1000 chars, must differ from `incident_ref` | `service.ts:391-397` |
| Incident reference | mandatory, `NOT NULL` | schema |
| Approval | second eligible human, `INTERNAL_API_SECRET` + human session, role in `ADMIN`/`OWNER`/`ORG_ADMIN` or org owner | `controller.ts:36-54`, `service.ts:143` |
| Concurrent approval | one winner; the loser gets `409 Conflict`. The same person firing two concurrent approvals of their own request wins neither | `service.ts:149-159`, drill `C181-5a` and `C181-5d` |
| Revocation | immediate, conditional, audited; takes effect at the next authorization | `service.ts:354-389` |
| Pending-request expiry sweep | closes stale pending requests without extending access | `service.ts:239-284` |
| Audit written | **before** access is granted, in the same transaction | `service.ts:344-350`, drill `C181-6` |
| Emergency bypass path | none exists | — |
| Periodic access review | none exists | — |

### Customer-facing commitment or disclosure

_Blank — Product and Legal to state._ Nothing in the product surfaces the existence of
operator access to a customer today. Whatever is chosen under D4 becomes the commitment.

### Rationale

_Blank — the approvers' own reasoning._

The evidence supporting a decision: the mechanism is time-bound, reasoned, scoped,
tenant-isolated, dual-controlled against the requester, revocable, and — verified —
audits before it authorizes. The two gaps that bear on the wording of PRD-C180 are the
mutability of the break-glass trail (D2) and beneficiary self-approval (D1).

## Evidence index

| Evidence | Commit/environment | Timestamp (UTC) | Result | Artifact path or hash |
|---|---|---|---|---|
| `check:audit-log-privileges` over the non-owner app role | backend `45f8a2e99`, local `scratch_head_1010`, role `streamline_app` (`bypassrls=false`) | 2026-09-03T16:25:09Z | PASS, exit 0 — `{"role":"streamline_app","isAppRole":true,"updateRevoked":true,"deleteRevoked":true,"triggerPresent":true}` | `final-refactor/evidence/42-production-ops/break-glass/runs/01-check-audit-log-privileges.txt` |
| `check:audit-log-privileges:self-test` (proves the gate can detect a failure) | backend `45f8a2e99`, local | 2026-09-03T16:25:09Z | PASS, exit 0 | `.../runs/02-check-audit-log-privileges-self-test.txt` |
| PRD-C181 six-case rejection drill, non-owner role, RLS live | backend `45f8a2e99`, local `scratch_head_1010` | 2026-09-03T16:25:33Z | 9/10 — exit 1; the one FAIL is `C181-5c-self-approval-beneficiary` (D1). The six named cases and the same-person-twice variant `C181-5d` all pass | `.../runs/03-drill-c181-rejections.txt`, script `.../drill-c181-sensitive-route-rejections.mjs` |
| Break-glass audit-trail mutability probe (rolled back) | backend `45f8a2e99`, local, role `streamline_app` | 2026-09-03T16:25:54Z | app role UPDATEs and DELETEs `operator_access_log`; `permission denied` on `audit_logs` (D2) | `.../runs/04-probe-breakglass-audit-mutability.txt`, script `.../probe-breakglass-audit-mutability.sql` |
| Default-`active` unapproved-grant probe (rolled back) | backend `45f8a2e99`, local, role `streamline_app` | 2026-09-03T16:26:10Z | a grant with `approver_id = NULL` is authorized (D3) | `.../runs/05-probe-default-active-unapproved-grant.txt` |
| Repository source/test evidence — operator-access and audit-immutability specs | backend `45f8a2e99` | 2026-09-03T16:26:31Z | 7 suites, 77 tests, all pass, exit 0 | `.../runs/06-jest-breakglass-specs.txt` |
| Findings and file:line trace | backend `45f8a2e99` | 2026-09-03 | — | `.../break-glass/README.md` |
| Deployed drill output (redacted) | — | — | **NOT CAPTURED** | PRD-C181 asks for *deployed* sensitive routes. No deployed environment exists on the machine where this evidence was produced. This row must not be filled from a local run. |
| Provider/configuration evidence | — | — | not applicable | this mechanism introduces no external provider |

## Conditions and residual risk

| Condition or risk | Owner | Due date | Mitigation | Release-authority disposition |
|---|---|---|---|---|
| **P0 — the break-glass audit trail is mutable and erasable by the application role.** `operator_access_log` grants `UPDATE`/`DELETE` to `streamline_app` and carries no append-only trigger; break-glass never writes to the protected `audit_logs`. PRD-C180's "immutable audit" is not met. | Security | before release | D2-a: revoke `UPDATE`/`DELETE`, add the `0930`-style trigger, widen the verifier to both tables | |
| **P0 — the beneficiary can approve their own grant.** Both no-self checks compare `approver_id` with `granted_by`, never with `operator_user_id`. | Security | before release | D1-a: add `approver_id <> operator_user_id` in the service and widen `chk_oag_self_approval` | |
| **P1 — `status` defaults to `'active'` and authorization never checks `approver_id`.** Any insert path that omits `status` mints a live, never-approved grant. Not reachable over the API on this commit. | Security | before release | D3-a: default `'pending'`, add `CHECK (status <> 'active' OR approver_id IS NOT NULL)`, add the predicate | |
| **P1 — the fail-closed audit ordering has no test.** Every guard/controller spec mocks `authorizeRequest`; nothing would fail if the audit `INSERT` were moved after the return or wrapped in a `catch`. | Engineering | before release | add a unit spec asserting `authorizeRequest` rejects when the log insert rejects | |
| **P1 — the tested predicate is not the live one.** The expiry/revocation/scope specs all exercise `assertGrant` (`service.ts:211`), which nothing calls; the guard calls `authorizeRequest`, whose duplicated predicate is untested. | Engineering | before release | delete `assertGrant`/`assertAndLog` or make `authorizeRequest` call it, so one predicate is enforced and tested | |
| **P1 — "eligible operator" is a tenant role, not a platform-operator population.** `isEligibleOperator` (`platform-operator-access.controller.ts:52-54`) checks the caller's role in their *own* organization; the only real gate on every management route is the shared static `INTERNAL_API_SECRET`. Both halves of the two-person rule are drawn from the same undifferentiated pool. | Security | before release | define a named platform-operator population and require the approver to be in it; state the secret's rotation policy | |
| **P2 — the customer tenant is never notified.** Notification goes only to the operator, only at request time. | Product / Privacy | per D4 | implement the chosen D4 option | |
| **P2 — denied break-glass attempts are not audited.** `authorizeRequest` throws before its `INSERT`; only successful accesses leave a row. | Engineering | post-release acceptable | write a `grant.denied` row on the rejection path | |
| **P2 — no periodic access review and no emergency bypass procedure exist.** RB-10 §1 records both as unresolved; the monthly-versus-quarterly cadence has not been chosen. | Operations | per review cycle | choose a cadence; decide explicitly whether an emergency path is wanted | |
| **PRD-C181 is only half satisfied by this record.** The criterion says "verify **deployed** sensitive routes reject …". The rejections are verified in code and schema against a local database; they are not verified against a deployed cell. | Operations | before release sign-off | re-run the drill and an HTTP probe of both grant-gated routes against the deployed environment, and file that output as deployed evidence | |

## Attestation

I confirm that this decision covers the stated scope, that the evidence index is
accurate and redacted appropriately, and that deferred conditions remain tracked.

- Release authority:
- Name/title:
- Date:
- Signature or approval reference:
