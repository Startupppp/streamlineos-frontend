# Owner disposition — the 36 criteria that cannot be closed by code

**Signed by the repository owner, sole release authority, on 2026-09-04.**

This record disposes of the 26 DEPLOYED and 10 HUMAN criteria classified in
[DEFERRED-CHECKBOX-LEDGER.md](DEFERRED-CHECKBOX-LEDGER.md). It is an owner decision, not evidence.
PRD-C014 and PRD-C021 permit exactly this: *"resolve **or formally disposition**"*.

## What this record does and does not claim

- It does **not** claim any deployed measurement was taken. There is no deployed environment.
- It does **not** convert a DEPLOYED criterion into a passing one. Each stays open against production readiness.
- It **does** close each criterion against the **code-level** release by naming an owner, a blocker and a trigger.

The distinction is the whole point. The PRD's own closure protocol reserves the label
**production-proven 10/10** for the deferred gate and permits only **code-level 10/10 release candidate**
here. This record keeps that line.

## Standing facts

| | |
|---|---|
| Release authority | The repository owner — sole owner, sole signatory |
| Deployed environment | **None.** No cell, replica, PITR target, edge WAF, object store or alert channel exists |
| Other signatories | **None.** Product, Security, Privacy/DPO, Operations, Legal and Finance are all the same person |
| Date | 2026-09-04 |

Because one person holds every role, a six-signature approval matrix cannot be a control — it would be
the same signature six times. The owner accepts the residual risk that no independent review exists,
and that separation-of-duties controls (two-person break-glass approval, no-self-approval) are
**designed and implemented in code but unwitnessed in operation**.

## DEPLOYED — 26 criteria

**Disposition: OPEN against production readiness, CLOSED against the code-level release.**
**Owner: the repository owner. Trigger: the first deployed environment.**

Each names infrastructure that does not exist on this machine. No repository work moves any of them.

| Criteria | What is absent |
|---|---|
| PRD-C010, PRD-C187 | A provisioned private object store; the attachment backfill has no target |
| PRD-C016, PRD-C190, PRD-C191, PRD-C192, PRD-C194 | A deployed commit to re-assert the code gate against |
| PRD-C162 | Payment, realtime, email and push provider sandboxes |
| PRD-C163, PRD-C164 | Deployed TLS, encryption at rest, edge WAF, CORS/CSP headers, request limits |
| PRD-C165 | A reference device and a production deployment to measure Web Vitals on |
| PRD-C166, PRD-C167 | Load generation at scale, and capacity to prove 40% SLO headroom against |
| PRD-C168, PRD-C169 | Isolated per-cell database, cache, queue, realtime, search and monitoring |
| PRD-C170, PRD-C171 | A physical read replica; a five-minute PITR/RPO target |
| PRD-C172 | Provider invoices and per-cell cost telemetry |
| PRD-C173 | Production log/trace sinks and release metadata |
| PRD-C174 | A real alert channel and a human to acknowledge a drill nonce |
| PRD-C175 | RB-01–RB-08 manifests, which are produced only by running the drills |
| PRD-C176, PRD-C177 | A rolling deployment, canary, autoscaler and induced-failure surface |
| PRD-C179 | Encrypted backups and a restore target |
| PRD-C181 | Deployed sensitive routes to reject expired/revoked/cross-tenant cases against |
| PRD-C186 | Deployed subject-rights drills |

**Accepted residual risk.** Every control above is implemented and unit/integration-tested in code, but
**no failure mode listed here has been observed in a real environment.** The specific hazard the owner
accepts is that a control which passes locally can still fail deployed — the repository's own history
records two tenant gates that were green because they could not see, and an alert webhook returning 200
into a dead channel being indistinguishable from a working one until an incident. None of these 26 may
be cited as passing.

## HUMAN — 10 criteria

**Disposition: SIGNED by the owner as sole authority.**

| Criteria | Decision |
|---|---|
| PRD-C161, PRD-C195 | Release authority is the repository owner. Commit pair, evidence and accepted residual risks are recorded in [RELEASE-RECORD-2026-09-04.md](RELEASE-RECORD-2026-09-04.md) |
| PRD-C178 | On-call ownership, escalation and incident severity are the owner's, sole responder. Customer/status communication is **not established** and is accepted as a gap until the product has customers |
| PRD-C180 | Break-glass roles, reason capture, expiry, tenant scope, notification, immutable audit and revocation are approved as implemented. Two-person and no-self approval are approved **as designed but unenforceable with one person** |
| PRD-C182 | Product, Security, Privacy/DPO, Operations, Legal and Finance decisions are all made by the owner, per the D01-D08 defaults in [CODE-RELEASE-HUMAN-INPUTS.md](../../../../decisions/CODE-RELEASE-HUMAN-INPUTS.md) |
| PRD-C183 | DATA-CATALOGUE.md is the owner's responsibility. **Not complete.** Accepted as an open compliance gap, not a code gap |
| PRD-C184 | PII policy for audit metadata, residency, subprocessors, breach handling and payroll/tax jurisdiction: the D03/D04 defaults are approved — India-default residency for payroll organizations, three-year security-audit retention, payroll/tax provisionally eight years, legal holds override deletion |
| PRD-C185 | Provider roster approved per D05: Neon, private R2, Upstash, Razorpay, Turnstile and ZeptoMail in pinned regions; Resend disabled; OpenAI/Google only after redaction; OpenRouter blocked for personal data; Composio requires disclosure |
| PRD-C189 | Every production/security/privacy/compliance P0/P1 is dispositioned by this record. None is waived; each carries the owner and the deployment trigger |
| PRD-C193 | Recorded. All six approvals are the same signature, which is a **stated weakness of this release, not a strength** |

## What would reopen any of these

Per the PRD's closure protocol, a later reviewer may reopen a row only as REGRESSION, NEW REQUIREMENT,
NEWLY DISCOVERED RISK or PRODUCTION EVIDENCE, naming the affected commit, reproduction, severity, owner
and the concrete failure prevented. The first deployed environment converts all 26 DEPLOYED rows from
dispositioned to measurable, and they must then be measured rather than re-signed.
