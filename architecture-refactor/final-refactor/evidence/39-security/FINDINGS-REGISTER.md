# Ticket 39 — security and compliance findings register

Every finding carries current file/symbol evidence, severity, the concrete failure it permits,
a verdict, the smallest safe change, migration consequences and how it would be verified.
Findings marked **re-verified** were checked against source or the live database by the session
orchestrator, not only by the lane that raised them.

Status vocabulary: **CLOSED** · **OPEN** · **OPERATOR-BLOCKED** · **PRODUCT-BLOCKED**.

---

## F-01 — multer buffers 50 MB before the application rejects at 10 MB

**Status:** OPEN · **Severity:** medium · **Verdict:** REPAIR · **re-verified**

`modules/storage/storage.controller.ts:109` declares
`FileInterceptor("file", { limits: { fileSize: 50 * 1024 * 1024 } })`, but line 124 rejects at
`MAX_UPLOAD_SIZE` = `10 * 1024 * 1024` (line 42). The interceptor runs first, so a 50 MB body is
fully read into process memory and only then thrown away.

**Concrete failure:** any authenticated member can hold 40 MB of heap per in-flight request that
was always going to be rejected. At a few concurrent uploads this is memory pressure on a pod that
also serves every tenant in the cell; the request cost is paid before authorization on size ever runs.

**Smallest safe change:** `limits: { fileSize: MAX_UPLOAD_SIZE }` so multer rejects at the same
boundary, keeping line 124 as the defence in depth. **Migration consequences:** none — the app
already rejects anything over 10 MB, so no currently-accepted upload changes behaviour.
**Verification:** `test/security/upload-controls.spec.ts` already pins both numbers; update the
assertion to require them equal.

**Owner:** storage is platform-operations territory; not S6's to change under this ticket.

## F-02 — `validateMagicBytes` returns true for an unknown mime type

**Status:** CLOSED (not exploitable as written) · **Severity:** informational · **Verdict:** KEEP

`modules/storage/file-signatures.ts` returns `true` when it holds no signature table for a mime
type. Reached directly that would be a bypass, but the generic upload endpoint checks
`ALLOWED_UPLOAD_TYPES` first and every entry in that allowlist has a signature table, so the
permissive branch is unreachable from that route.

**Why it stays a finding:** it is reachable the moment someone adds a type to the allowlist without
adding its signature. Covered by `test/security/upload-controls.spec.ts`, which asserts the
allowlist and the signature table stay in step.

## F-03 — no malware scanning and no quarantine bucket

**Status:** OPERATOR-BLOCKED · **Severity:** high · **Verdict:** REPLACE

No ClamAV, no scanner integration, no quarantine bucket and no S3 event trigger exist anywhere in
`modules/storage/`. PRD §20 requires "uploads enforce type/size, quarantine, malware scan and signed
retrieval"; three of the four are present.

**Concrete failure:** a member uploads a malicious document; it is served to colleagues through a
signed URL from a first-party domain, carrying the organization's trust.

**Unblock condition:** a product/operator decision on which scanning service to use, and a bucket
for quarantine. No code change is safe to make before that choice — the scan point determines
whether uploads become asynchronous.

## F-04 — public token hashing is unsalted SHA-256

**Status:** CLOSED (correct for this use) · **Severity:** informational · **Verdict:** KEEP

`common/security/token.util.ts` `hashToken` is a bare `sha256(raw)`. That is the right primitive
here and not a password-hashing defect: the inputs are 192-bit `randomBytes(24)` tokens, not
user-chosen secrets, so there is no dictionary to precompute and a salt would only prevent the
lookup that makes revocation work. `test/security/public-token-controls.spec.ts` pins the hash
shape, the `slos_` prefix and that the raw token is returned exactly once.

## F-05 — agent tokens may be created with no expiry

**Status:** OPEN · **Severity:** medium · **Verdict:** REPAIR

`db/schema/common/agent-tokens.ts` declares `expiresAt` nullable and
`modules/agent-access/agent-tokens.service.ts` leaves it `null` when the caller supplies no
`expiresInDays`. The 10-active-token cap and the scope ceiling both hold, so this is a lifetime
problem, not an authority problem.

**Concrete failure:** a machine credential minted once keeps working forever; PRD §2 requires a
service principal to be "short-lived, scope-limited, auditable". Cache lifetime rules (§16) say a
grant may not outlive its token — with no expiry there is nothing to bound it by.

**Smallest safe change:** a default TTL applied at creation, with an explicit non-expiring option
gated on org-owner standing. **Migration consequences:** existing null-expiry tokens must be
backfilled to a date rather than revoked, or integrations break without warning.

## F-06 — no operator/support access mechanism exists at all

**Status:** PRODUCT-BLOCKED · **Severity:** high · **Verdict:** REPLACE

Searching for `impersonat`, `support-access` and `operator-access` outside tests returns nothing.
`ModuleLadder`'s `"platform-admin"` value governs billing module delegation, not human access to
tenant data. There is no time-bound session, no approval, no reason capture and no dedicated audit
trail. PRD §20 requires all four.

**Concrete failure:** an engineer debugging a production incident today has exactly two routes —
connect as the database owner, which has `BYPASSRLS` and therefore sees every tenant, or borrow an
org owner's credentials. Neither produces an audit record attributable to the engineer, so after an
incident there is no answer to "who read this tenant's data, when, and why".

**Why nothing was built here:** designing an approval workflow is a product decision, not a
verification task, and inventing one under a verification ticket would be the wrong shape of work.
`test/security/operator-access.spec.ts` records the absence so it cannot be quietly forgotten.

**Unblock condition:** a decision on the approval model (self-approve with notification, two-person,
or ticket-linked) and the maximum session length.

## F-07 — `audit_logs` carries no request id, reason or principal type as columns

**Status:** OPEN — needs a migration · **Severity:** medium · **Verdict:** REPAIR · **re-verified**

Live column list for `audit_logs`: `id, action, user_id, org_id, target_id, target_type,
actor_user_id, resource_type, resource_id, metadata, ip_address, created_at, is_platform_event,
actor_membership_id`. PRD §9 requires "actor principal, membership, organization, request ID and
reason". Organization, actor and membership are columns; **request id and reason live only inside
`metadata` jsonb, and principal type is absent entirely**.

`actor_membership_id` is present and indexed — added by S4's `migrations/0641_financial_actor_audit_identity.sql`,
which is applied. That half of the requirement is genuinely closed, and this register does not
re-raise it.

**Concrete failure:** correlating an audit row to the request that produced it means a jsonb probe
that no index supports, so the one query an incident actually needs — "everything that happened
under correlation id X" — is a sequential scan of the audit table.

**Smallest safe change** (DDL only; S6 did not write the migration because `db/schema/common/`
is shared and the journal is being written by four other sessions this hour):

```sql
ALTER TABLE audit_logs
  ADD COLUMN request_id text,
  ADD COLUMN reason text,
  ADD COLUMN principal_type text
    CHECK (principal_type IN ('user','agent-token','delegation','operator','system'));
```

**Migration consequences:** all three nullable and additive, so no backfill is required and existing
readers are unaffected; `AuditService.buildValues` would populate them from the `AuditEntry` fields
that already exist. An index on `(org_id, request_id)` should land in the same migration or the new
column repeats the problem it fixes.

## F-08 — the data-export pipeline is a tracking table with no worker

**Status:** PRODUCT-BLOCKED · **Severity:** high · **Verdict:** REPAIR

`hr_data_requests` accepts `type = 'export'` and `modules/hr/governance/retention/` exposes
`approveRequest` and `processRequest`, but no worker produces an actual export artefact. The drill
confirms a request is recorded and audited; nothing produces a file a data subject could receive.

**Concrete failure:** a GDPR/DPDP subject access request can be logged and marked complete without
any data ever being exported. The audit trail says the obligation was met when it was not.

**Unblock condition:** a decision on export format and delivery (signed download vs emailed archive)
and on which tables constitute "the subject's data".

## F-09 — the `object_storage` purge adapter cannot run

**Status:** OPERATOR-BLOCKED · **Severity:** high · **Verdict:** REPAIR · **re-verified**

`modules/organization/core/lifecycle/organization-purge-adapters.ts` returns `FAILED` for
`object_storage` with the reason stated in source: object-storage keys carry no org-scoped prefix
(`folder/uuid-filename`), tenants share one bucket, and enumerating an org's files would require a
per-table audit of every `file_key` column in the schema.

**Concrete failure:** an organization purge completes and reports success at the database layer while
every uploaded file — payslips, HR documents, signed contracts — remains in the bucket indefinitely.
This is the gap most likely to be material in a real erasure request.

**Smallest safe change:** prefix new object keys with `org/<orgId>/` so future purges are a prefix
delete, and generate the `file_key` column inventory for the existing objects. Both halves are
needed; the prefix alone does not reach existing files.

**Migration consequences:** key format is a compatibility break for anything that parses keys, and
existing objects need either a copy-and-delete migration or a permanent legacy-prefix branch.

## F-10 — the `database_rows` purge adapter does not delete rows

**Status:** PRODUCT-BLOCKED · **Severity:** high · **Verdict:** REPAIR · **re-verified**

Same file: the adapter confirms `statusV2 === 'PURGED'` and states in source that "physical row
deletion not implemented; purge worker marks statusV2=PURGED but does not cascade-delete tenant data".

**Concrete failure:** the same as F-08 and F-09 — the workflow reports a completed purge while the
tenant's rows remain readable to anyone who can reach the database.

**Note:** `scripts/purge-user.mjs` already solves the hard half of this problem for a *user* — it
derives delete order from `pg_catalog` across 951 `NO ACTION` foreign keys and handles the
`organizations`↔`members` cycle. An org-level purge should reuse that derivation rather than
hand-maintain a table list.

**Unblock condition:** a product decision on whether org purge is a hard delete or a permanent
anonymisation, because the two need different code and only one satisfies erasure.

## F-11 — cross-tenant negative-test coverage is 18%

**Status:** OPEN — baseline recorded · **Severity:** medium · **Verdict:** REPAIR

`check:tenant-isolation` reports 817 service files holding a `db` handle, 773 of them tenant-owned,
136 with a cross-tenant negative test — **18%**.

**The first number this check produced was 27%, and it was wrong.** The original heuristic marked a
service covered when any spec contained the service's bare filename **stem** as a substring, so
`leave.service.ts` was "covered" by any spec mentioning *leaving* or *bereavement-leave*.
Attribution now requires the exported class name as a whole word or an import of the module path.
The number went down because the measurement got honest, which is the right direction for a metric
nobody should be able to move by accident. The check exits non-zero and prints the uncovered
list, with anti-vacuity assertions (>100 services, >5 test files) so a broken walk cannot report
full coverage.

**Concrete failure:** RLS is the actual control for most of these services, and RLS is real — but a
table with no policy is readable org-wide and nothing else notices. 564 services have no executable
test that would catch a missing policy, a raw query that forgets `org_id`, or a `SECURITY DEFINER`
helper that widens scope.

**Why it is a baseline and not a fix:** writing 637 shallow specs would produce a number, not
safety. **The systemic control for these services is RLS, not per-service unit tests** — and that
control is now provably complete (F-12). The per-service count is a secondary trend with the
uncovered list as its work queue.

## F-12 — three tenant tables were live with no RLS policy

**Status:** CLOSED · **Severity:** high · **Verdict:** REPAIR · **found and fixed in this session**

`db:verify-rls` reported `RESULT: 3 CHECK(S) FAILED`. All 17 behavioural checks passed; the
coverage check did not. `inv_carton_types`, `inv_shipment_status_events` and
`organization_cell_traffic` each carried a NOT NULL `org_id`, `relrowsecurity = false`, zero rows in
`pg_policies` — and `streamline_app` already held SELECT/INSERT/UPDATE/DELETE on them, because
grants arrive through `ALTER DEFAULT PRIVILEGES`. A table created without a policy is readable
org-wide and nothing complains.

All three were empty, so nothing had leaked; the hole was structural rather than exploited. None
belonged to session 6 — two are Inventory (excluded from this PRD, no owning session) and the third
came from `0627_org_cell_traffic`. Fixed here rather than filed, because Inventory has no owner to
file it with.

**Fix:** `migrations/0650_tenant_isolation_for_three_unprotected_tables.sql`, journalled at idx 357
and applied. Follows `0591` exactly: ENABLE, DROP IF EXISTS, CREATE POLICY, REVOKE from PUBLIC,
GRANT to the app role — in that order, because reversing the last two leaves PUBLIC holding rights
on a table whose policy is already live.

**Proof, as `streamline_app` with the tenant GUC, in a rolled-back transaction:**

```
as orgA, rows visible: 1
cross-tenant INSERT blocked with 42501
as orgB, rows visible: 0   (invisible, not forbidden — what makes a 404 honest)
rows after rollback: 0
```

`db:verify-rls` now prints `RESULT: RLS VERIFIED`. Guarded against regression by
`test/security/rls-exemption-allowlist.spec.ts`, which pins `PLATFORM_GLOBAL_TABLES` — the one list
that can silence this check — and fails if a tenant business table is ever added to it.

---

## Summary

| Status | Findings |
|---|---|
| CLOSED | F-02, F-04, F-12 |
| OPEN | F-01, F-05, F-07, F-11 |
| OPERATOR-BLOCKED | F-03, F-09 |
| PRODUCT-BLOCKED | F-06, F-08, F-10 |

The three purge/export findings (F-08, F-09, F-10) are one story told three ways: **the deletion
half of GDPR is tracked and audited but not executed.** The drill proves the workflow, the audit
trail and the legal-hold interlock all work; it also proves, honestly, that nothing is erased at the
end of it.
