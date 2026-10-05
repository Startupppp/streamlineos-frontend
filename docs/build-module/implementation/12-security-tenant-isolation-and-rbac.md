# 12 — Security, tenant isolation, and RBAC

Status: Planned release contract with Current unverified source anchors

The complete role design is [Build RBAC](../governance/rbac/01-role-model-and-open-risks.md). This document defines implementation and negative-proof requirements.

## Defense sequence

Authentication/token validation → active organization membership or explicit external grant → module enablement → permission scope → project reachability → record/field/lifecycle policy → tenant transaction/RLS → audited result. UI visibility is a convenience after the access snapshot; it is never a security control.

Every tenant query includes `org_id` in the database predicate even when RLS is active. Child records validate parent tenant/project consistency. Cache keys, search documents/results, event payloads/consumers, jobs, exports, signed files, and AI tools carry the same scope.

## Permission matrix

| Operation | Owner/Admin | Build Admin | Member/manager | External client | Service/AI |
|---|---|---|---|---|---|
| Enter enabled Build | Yes | Yes when assigned | Only with Build assignment | Portal only | Credential/tool scope |
| View Project/Ticket | Reachability still applies | Reachability still applies | Assigned/team/explicit scope | Grant-visible projection | Explicit project/tool scope |
| Create/update Ticket | Permission + field/lifecycle | Permission + field/lifecycle | Granted permission | Only client request/comment paths | Command permission; AI confirmation for write |
| Manage membership/access | Org/module authority | Build member manage | No by default | Never | Never unless dedicated admin service actor |
| Configure workflow/fields/views | Authorized admin | Authorized admin | Delegated manager only | Never | Automation can use configured workflow, not change it |
| Client grant | Authorized grant manager | Authorized grant manager | Only explicit delegation | Never self-expand | No ambient right |
| Export | Explicit export/view plus scope | Same | Same | Grant-limited export only if enabled | Job scope matches caller |
| Archive/restore/delete | Explicit lifecycle permission | Same | Same | Never internal records | Dedicated command and audit |

Org Member without module assignment is denied Build. Org Owner/Admin receives enabled-module access but cannot bypass record isolation, disabled modules, field policy, MFA, plan constraints, or target-tenant checks. Viewer is a restricted module/custom role, not an organization role.

## External/public access

Magic links and public form/widget/whiteboard tokens are random high-entropy credentials stored hashed where feasible, scoped to one purpose/tenant/project, expiring, revocable, rate-limited, and never logged or placed in analytics/referrer leakage. Client grant reads enforce `ACTIVE` and `expires_at` on every request. Internal preview selects an actual grant and uses the same projection.

Signed file URLs are minted only after current authorization, bind file/variant/disposition where supported, expire quickly, and cannot be used to list a bucket. File metadata and malware-processing state remain server authorized.

## Input/output security

- Zod/DTO validation applies bounds and rejects unknown security-relevant fields.
- Rich text/Markdown is sanitized on rendering; raw HTML, SVG, links, and mentions follow the central policy.
- Import/export protects against formula injection, zip bombs, oversized rows/files, malicious MIME, and cross-tenant IDs.
- Webhooks use SSRF protections described in document 11.
- Logs/telemetry omit tokens, secrets, OTPs, signed URLs, message bodies, and unrestricted personal text.
- Search and AI retrieve only through authorized scoped reads; filtering after retrieval is insufficient.
- AI sees only allowed tools for the turn and writes through durable confirmation plus the human command seam.

## Negative-test matrix

| Attack/failure | Required result |
|---|---|
| Same record ID from another organization | `404`, no timing/body/count leak, no cache fill |
| Org Member with no Build assignment | no nav plus backend denial |
| User with permission but no Project reach | `404`/deny before record data |
| Revoked client grant with cached portal page | immediate denial and cache/signed-link invalidation |
| Expired grant still marked ACTIVE | deny by timestamp |
| Cross-project child ID bound to reachable parent path | deny; repository predicate binds org, parent, child |
| Hidden field sent in update DTO | reject or ignore only by an explicit safe policy; never mutate |
| Export/search/AI requests broader scope | scope intersection on server, no hidden rows in counts/facets |
| Stolen/replayed idempotency key with changed payload | `409 IDEMPOTENCY_MISMATCH` |
| Webhook to private/metadata address or redirect | reject before connection and on redirect |
| Permission revoked during edit | mutation denied, editor preserves local safe draft and shows revoked state |
| Public token in logs/analytics/referrer | test fails; token redacted and referrer policy enforced |

Security, baseline export, recovery, and tenant isolation are never paid-plan gates.

## Delivery checklist

Track completion in the [requirement ledger](REQUIREMENT-LEDGER.md) and [work claims](WORK-CLAIMS.md). An unchecked item stays open until evidence is recorded on the current branch.

- [x] Verify enabled-module entry for Org Owner/Admin and explicit Build assignment for Org Member, followed by project, record, field, and action authorization.
- [x] Test every Build API and mutation with owner, org admin, assigned member, unassigned member, project outsider, client, expired grant, and wrong-tenant actors.
- [x] Prove public form/widget tokens, client grants, signed file URLs, exports, search, AI tools, and cache keys cannot broaden scope or survive revocation.
- [x] Audit role and grant changes for atomic version bumps, immediate denial, safe logs, and authorization rechecks in workers and long-running operations.
- [ ] Attach browser/network, backend negative tests, database isolation, and deployed-revision evidence before marking RBAC behavior verified.
