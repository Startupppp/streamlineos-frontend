# Code-release human-input register

Status: awaiting one consolidated owner response
Last reconciled: 2026-09-04
Scope: StreamlineOS code release excluding CRM, Inventory, deployed-cloud proof and public landing-page visual changes

This is the only register agents may use for unresolved human choices in the code-release tickets. Agents must not invent additional product policy when a choice below applies. A new human gate may be added only when current source proves that the choice is materially different and affects correctness, security, compatibility, money or destructive data lifecycle.

To approve the proposed code defaults in one response, reply:

`Approve H01-H17 recommended; defer D01-D08 until deployment.`

List only exceptions after that sentence. Approval permits implementation; it does not mark any acceptance criterion complete without code and reproducible evidence.

## Code decisions required now

| ID | Decision needed | Recommended decision | Why this default |
|---|---|---|---|
| H01 | Idempotency for module-access mutations | Require `Idempotency-Key` on grant, revoke, standing and module-access commands; update frontend callers in the same change and retain server-side replay records. | Natural upsert convergence does not protect side effects, audit events or future implementation changes. |
| H02 | Ownership of `/settings/webhooks` | Keep it as an organization-level cross-module integration surface; module-specific webhook configuration remains in each module. | The event catalogue spans modules and has no truthful single-module owner. |
| H03 | Public KB attachment list compatibility | Add a versioned cursor/envelope endpoint, migrate callers and publish deprecation for the bare-array endpoint; do not break the published route in place. | Gives bounded stable pagination without silently breaking external consumers. |
| H04 | Foreign-key delete policy | Default financial, audit, authority and tenant-root relationships to `RESTRICT`; dependent joins/ephemeral children to `CASCADE`; optional display/actor references to `SET NULL`. Require an explicit documented exception for every deviation. | Prevents accidental history/authority loss while allowing true owned children to be collected. |
| H05 | Uncalled HR/autonomy schema | Remove autonomy-repair tables unless a current registered worker uses them. Keep and wire career-path tables only if HR ships career planning in this release; otherwise remove them. Keep and wire subprocessor tables as compliance records. | Executable schema must have a real owner/caller; compliance records are not speculative product surface. |
| H06 | Accounting `gl_*` references | Because Accounting is in release scope, wire canonical GL posting paths and remove only redundant/retired columns after dependency and migration proof. | Dropping the accounting kernel would contradict the release scope; leaving disconnected keys creates false integrity. |
| H07 | Payroll financial permissions | Split ordinary payroll-run management/locking from reopen, reversal and destructive financial corrections; require the stronger permission for the latter. | Least privilege for irreversible or high-risk payroll operations. |
| H08 | Build project visibility | Add explicit project visibility (`private` or `organization`) with private as the default; private resources require project membership in addition to organization/module access. | Tenant membership alone is too broad for confidential projects while still allowing intentionally shared projects. |
| H09 | Workflow command idempotency | Require durable idempotency for trigger, publish and execution-producing mutations; update all frontend callers atomically. | Retries must not create duplicate workflow runs or side effects. |
| H10 | Workflow templates | Hide/remove the unimplemented templates surface for this release; retain only product documentation until a real implementation is scheduled. | An empty feature is dead surface and misleading API/UI contract. |
| H11 | Workflow secrets | If no current executor consumes a secret, hide/remove the write surface and unreachable decryption path; when restored, secrets must be injected only at execution time and never returned or logged. | Write-only unused secrets add breach risk without product value. |
| H12 | Immutable-invoice conflict contract | Return a stable provider-neutral HTTP 409 domain error (`INVOICE_IMMUTABLE`) without database/provider internals. | Prevents constraint failures becoming 500s or leaking implementation detail. |
| H13 | KB upload/embedding transaction boundary | Commit a durable tenant-scoped ingestion intent/outbox job first; perform storage/AI embedding after commit with idempotent retry, compensation and visible status. | External provider calls inside database transactions cause lock amplification and ambiguous commits. |
| H14 | Exact totals on list APIs | Exact totals are opt-in only where the UI demonstrably needs them and the query meets budget; otherwise return cursor plus `hasMore`, with estimated/asynchronous counts when useful. | Avoids an expensive count on every growing list request. |
| H15 | PostgreSQL prepared statements | Do not globally force `prepare: false`; choose pooler-compatible behavior per deployed environment after a representative benchmark and record the result. | The correct choice depends on pooler mode and workload; a global guess can increase latency. |
| H16 | Calendar “this and following” edits | Split into a new local series, truncate the original RRULE, re-parent future exceptions, copy attendees with RSVP reset when timing materially changes, then asynchronously reconcile providers under the approved local-first policy. | Preserves recurrence history and gives deterministic conflict/retry behavior. |
| H17 | Calendar provider drift | Local StreamlineOS state wins after an accepted local mutation; expose `pending`, `failed` and conflict detail with retry/reconnect controls. Never silently overwrite local edits from provider drift. | Matches the already approved local-first synchronization model and avoids invisible data loss. |

## Deployment, legal and named-approval inputs

These inputs cannot truthfully be manufactured from repository code. They are deferred from the code-level release candidate, not waived from production readiness.

| ID | Human or environment input | Recommended/default position until approved |
|---|---|---|
| D01 | Name Product, Security and Operations approvers for break-glass access. | Requester, approver and beneficiary are separated; two-person approval, short expiry, quarterly and event-triggered review, and retrospective review for emergencies. |
| D02 | Approve operator population and audit immutability. | Only a dedicated platform-operator group is eligible; grant/audit rows are append-only to the app role; notify organization owner/admins on request, approval and revocation. |
| D03 | Name Privacy/DPO and Legal approvers; approve lawful bases, retention and sensitive-field policy. | Three-year security-audit retention; payroll/tax retention provisionally eight years subject to Legal; legal holds override deletion; sensitive identifiers use field encryption and least-privilege access. |
| D04 | Approve residency, transfer and subprocessors. | India-default for payroll organizations; explicitly pinned EU/US options; published subprocessor list with 30-day change notice; no personal-data provider enabled without DPA/transfer basis. |
| D05 | Approve provider roster. | Neon, private R2, Upstash, Razorpay, Turnstile and ZeptoMail conditionally approved in pinned regions; Resend disabled unless separately approved; OpenAI/Google only after redaction; OpenRouter blocked for personal data; Composio requires disclosure; TURN deferred until configured. |
| D06 | Supply deployment identities and secrets. | Cell/environment IDs, private bucket and backfill target, physical replica/PITR target, alert webhook, acknowledgement nonce and production URLs are required only for deployed drills. Never place secrets in evidence. |
| D07 | Name Finance and Operations signatories and supply billing/capacity evidence. | Approve per-cell unit cost only from provider invoices/APIs; approve capacity only after workload evidence demonstrates at least 40% headroom. |
| D08 | Name final release authority and sign-off references. | Product, Security, Privacy/DPO, Operations, Legal and Finance record names, date, commit/environment, evidence locations and accepted residual risks. |

## Agent rules

- An affected ticket is human-blocked only while its `Hxx` decision is unapproved. Once approved, implement the recommendation without asking the same question again.
- `D01-D08` never count as completed from local mocks. They remain production-readiness work even when code-level acceptance is green.
- CRM and Inventory are excluded. Do not use their fields, routes or migrations to fail this code-release scope.
- Do not change public landing-page visuals or animations. Performance work may change loading mechanics only when visual and motion behavior remains equivalent.
- Do not close a checkbox from this register alone. Retain commit, command and artifact evidence required by its owning ticket.
