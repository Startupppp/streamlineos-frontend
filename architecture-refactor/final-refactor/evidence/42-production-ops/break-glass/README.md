# Break-glass / operator access — PRD-C180 and PRD-C181 evidence

Ticket 35 (`.scratch/code-release-10-10-v2/issues/35-compliance-privacy-drills.md`),
criteria **PRD-C180** and **PRD-C181**.

Everything below was run on this machine on **2026-09-03 (UTC)** against the local
databases described in the wave brief. Backend commit `45f8a2e99`, branch
`release/code-10-10-v2`.

| Database | Role | Notes |
|---|---|---|
| `scratch_head_1010` | `streamline_app` | `bypassrls = false` — the boundary the running service actually has |
| `scratch_head_1010` | `tarunchintakunta` | owner, used only for read-only catalogue queries |

**This is not deployed evidence.** PRD-C181's own wording is "verify **deployed**
sensitive routes reject …". There is no deployed environment on this machine. What
follows verifies that the *code and schema* reject those cases, replayed over a real
PostgreSQL instance with RLS live. The deployed-route half remains open.

---

## What break-glass is, in this codebase

| Piece | File |
|---|---|
| Grant lifecycle (create / approve / reject / revoke / expire / authorize) | `backend/src/modules/platform/platform-operator-access.service.ts` |
| The guard sensitive routes actually run | `backend/src/modules/platform/operator-session.guard.ts` |
| Scope decorator | `backend/src/modules/platform/require-operator-grant.decorator.ts` |
| Management-plane controller (`INTERNAL_API_SECRET` + eligible human session) | `backend/src/modules/platform/platform-operator-access.controller.ts` |
| The only grant-gated data-plane routes | `backend/src/modules/platform/platform-operator-customer.controller.ts` |
| Tables | `public.operator_access_grants`, `public.operator_access_log` |

The entire grant-gated HTTP surface is two routes:

- `GET /platform/operator/organizations/:orgId` → scope `read_customer_data`
- `GET /platform/operator/organizations/:orgId/billing` → scope `read_payments`

`PlatformAdminService` and `PlatformAnalyticsService` read cross-tenant data but are
referenced by no controller (`platform.module.ts:22-23` only); they are not reachable
over HTTP on this commit.

---

## Runs captured

| File | Command | Exit |
|---|---|---|
| `runs/01-check-audit-log-privileges.txt` | `APP_DATABASE_URL=… npm run check:audit-log-privileges` | 0 |
| `runs/02-check-audit-log-privileges-self-test.txt` | `npm run check:audit-log-privileges:self-test` | 0 |
| `runs/03-drill-c181-rejections.txt` | `APP_DATABASE_URL=… node drill-c181-sensitive-route-rejections.mjs` | **1** (9/10 — the one failure is P0-2 below) |
| `runs/04-probe-breakglass-audit-mutability.txt` | `psql -f probe-breakglass-audit-mutability.sql` + privilege contrast | n/a |
| `runs/05-probe-default-active-unapproved-grant.txt` | `psql` heredoc, rolled back | n/a |
| `runs/06-jest-breakglass-specs.txt` | `npx jest --runInBand --testPathPattern="…platform/(operator-session.guard\|platform-operator-access…\|audit-log-immutability).spec.ts$"` | 0 — 7 suites, 77 tests |

`drill-c181-sensitive-route-rejections.mjs` replays the service's own SQL — the
`authorizeRequest` predicate (`platform-operator-access.service.ts:325-338`) and the
`approveGrant` conditional transition (`:145-168`) — verbatim, over the non-owner role.
It refuses to run on a `BYPASSRLS` role. It creates rows in two scratch organizations
and deletes them in a `finally`.

---

## PRD-C181 — the six rejection cases

| # | Case | Verdict | Where it is rejected | Proof |
|---|---|---|---|---|
| 1 | expired approval | **rejects** | `service.ts:334` `expires_at > now()` | `C181-1-expired` PASS |
| 2 | revoked approval | **rejects** | `service.ts:333,335` `status='active' AND revoked_at IS NULL` | `C181-2-revoked` PASS |
| 3 | cross-tenant use | **rejects** | `service.ts:331` `org_id = :orgId`, plus the `tenant_isolation` RLS policy on the same table and the GUC set by `runInNewTenantTransaction` | `C181-3-cross-tenant` PASS |
| 4 | wrong scope | **rejects** | `service.ts:332` `scope = :scope`, scope supplied by `@RequireOperatorGrant` | `C181-4-wrong-scope` PASS |
| 5 | concurrent approval | **rejects** | conditional `UPDATE … WHERE status='pending'` at `service.ts:149-159` — one winner, one `ConflictException`; requester-as-approver blocked at `service.ts:143` and by DB `CHECK chk_oag_self_approval` | `C181-5a` (two approvers race: 1 approved, 1 conflicted), `C181-5b` (requester self-approves: rejected), `C181-5d` (**the same person fires two concurrent approvals of their own request: 0 approved, 2 rejected**) — all PASS |
| 6 | audit-write failure | **rejects (fails closed)** | see below | `C181-6` PASS |

### Case 6 — the ordering, in full

`OperatorSessionGuard.canActivate` (`operator-session.guard.ts:49-59`) `await`s
`authorizeRequest` and only then `return true`. `authorizeRequest`
(`service.ts:323-352`) opens **one** tenant transaction, `SELECT`s the grant, and
`INSERT`s the `operator_access_log` row **inside that same transaction**, awaited.
There is no `try`/`catch` on either side.

So a failing audit write aborts the transaction, rejects `canActivate`, and Nest never
invokes the handler — the sensitive read is not reached. The drill injects a genuine
write failure (a `grant_id` with no parent row, violating the composite FK) and
observes `operator_access_log` row count unchanged, `before=3 after=3`, and the caller
denied. **The audit record is written before access is granted, not after.**

The guard is also the only thing that sets `operator.orgId = orgId`
(`operator-session.guard.ts:57`), so the downstream tenant transaction cannot even open
against the customer org unless the guard already committed the audit row.

### Coverage gap behind case 6 (not a defect in behaviour)

There is **no test anywhere** that asserts the fail-closed property. Every existing
guard and controller spec mocks `authorizeRequest` wholesale
(`operator-session.guard.spec.ts:10-16`, `platform-operator-customer.controller.spec.ts:25`),
so none of them exercises the transaction that carries the ordering. The 77 passing
tests do not include one that would fail if the audit `INSERT` were moved after the
`return`, or wrapped in a `catch`. The drill in this directory is currently the only
proof. A unit spec belongs at
`backend/src/modules/platform/platform-operator-access.service.ts`'s spec sibling,
mocking the tx so the log insert rejects and asserting `authorizeRequest` rejects.

A second, related gap: the specs that *do* verify expiry/revocation/scope predicates
(`platform-operator-access.spec.ts:346-386`, `platform-operator-access-policy.spec.ts:99-144`)
all test `assertGrant` (`service.ts:211-236`) — which **nothing calls on the live path**.
The guard calls `authorizeRequest`, whose predicate is a separate, duplicated copy at
`service.ts:325-338`. The two happen to agree today. Nothing keeps them agreeing.
`assertGrant`/`assertAndLog` are exported but unreferenced outside their own file.

---

## Findings

### P0-1 — the break-glass audit trail is not immutable

`runs/04-probe-breakglass-audit-mutability.txt`

`public.audit_logs` is genuinely append-only for the app role — `check:audit-log-privileges`
returns `{"role":"streamline_app","isAppRole":true,"updateRevoked":true,"deleteRevoked":true,"triggerPresent":true}`,
exit 0, and the app role gets `ERROR: permission denied for table audit_logs` on both
`UPDATE` and `DELETE`.

**But break-glass writes to `public.operator_access_log`, and never to `public.audit_logs`.**
There is no reference to `audit_logs`/`auditLogs` anywhere in `src/modules/platform/`.

Measured on `operator_access_log` as `streamline_app`:

```
      role      | audit_logs_update | audit_logs_delete | oal_update | oal_delete | oag_update | oag_delete
----------------+-------------------+-------------------+------------+------------+------------+------------
 streamline_app | f                 | f                 | t          | t          | t          | t

         table          |        trigger         |          function
------------------------+------------------------+----------------------------
 audit_logs             | audit_logs_append_only | prevent_audit_log_mutation
 operator_access_grants | (none)                 | (none)
 operator_access_log    | (none)                 | (none)
```

and, on a real row (rolled back):

```
=== A. UPDATE the break-glass audit row as the app role ===
UPDATE 1
  action_after_update  | ip_after_update
-----------------------+-----------------
 REWRITTEN-BY-APP-ROLE |

=== B. DELETE the break-glass audit row as the app role ===
DELETE 1
 breakglass_rows_remaining
---------------------------
                         0
```

The application role can rewrite and erase the record of its own break-glass access.
Migration `0930_audit_logs_append_only_trigger.sql` protects only `public.audit_logs`;
no migration mentions `REVOKE` on `operator_access_log`, and grep for `append_only`
across `migrations/*.sql` returns only `0930`.

PRD-C180 requires an **immutable** audit for operator access. It is not met.

*Fix shape:* a migration mirroring `0930` — `REVOKE UPDATE, DELETE ON
public.operator_access_log FROM streamline_app` plus a
`BEFORE UPDATE OR DELETE … FOR EACH ROW` trigger — and extend
`verify-audit-log-privileges.mjs` to assert both tables rather than one. Consider the
same for `operator_access_grants`, where `revocation_reason` and `approver_id` are
today freely rewritable.

### P0-2 — the beneficiary can approve their own break-glass access

`runs/03-drill-c181-rejections.txt`, check `C181-5c` — the one FAIL.

Both no-self-approval checks compare the **requester** with the approver:

- `platform-operator-access.service.ts:143` — `if (grant.grantedBy === approverId) throw new ForbiddenException(...)`
- DB `CHECK chk_oag_self_approval` — `((approver_id IS NULL) OR (approver_id <> granted_by))`

Neither compares `approver_id` with `operator_user_id` — the person who will *hold* the
access. A grant filed by admin M naming operator O as the beneficiary can be approved by
**O**. Both checks pass; the grant goes active; O now has break-glass access to a
customer tenant that O signed off on.

```
FAIL  C181-5c-self-approval-beneficiary
      expected: the operator who RECEIVES the access cannot be the approver
      observed: ACCEPTED — the beneficiary approved their own break-glass access
```

Two humans are still involved, so the literal "two-person" count holds; "no-self
approval" does not. Whether this is acceptable is a policy call, which is why it is
carried into the decision record as an explicit option rather than silently fixed.

*Fix shape:* add `approverId !== operatorUserId` beside `service.ts:143`, and widen the
CHECK to `approver_id IS NULL OR (approver_id <> granted_by AND approver_id <> operator_user_id)`.

### P1-1 — `status` defaults to `'active'`, and authorization never checks `approver_id`

`runs/05-probe-default-active-unapproved-grant.txt`

`operator_access_grants.status` is `text NOT NULL DEFAULT 'active'`
(`backend/src/db/schema/common/platform.ts:141`, and the live column default). The
authorization predicate at `service.ts:333` trusts `status = 'active'` and **never
requires `approver_id IS NOT NULL`**.

An insert that omits `status` therefore produces a live grant that no one approved:

```
 operator_user_id  | status | approver_id | granted_by
-------------------+--------+-------------+-------------
 op-never-approved | active |             | requester-x

 rows_authorized
-----------------
               1
```

The one application insert path (`service.ts:91`) does pass `status: "pending"`
explicitly, so this is not reachable through the API today. It is default-open in the
schema: any repair script, seed, backfill, or future insert path that forgets the column
mints break-glass access with no approval and no second person. Combined with P0-1 —
where the same role can then delete the log rows — the residual is material.

*Fix shape:* `ALTER COLUMN status SET DEFAULT 'pending'`, add
`CHECK (status <> 'active' OR approver_id IS NOT NULL)`, and add `approver_id IS NOT NULL`
to the `authorizeRequest` predicate as defence in depth.

### P1-2 — "eligible operator" is a tenant role, not a platform-operator population

`platform-operator-access.controller.ts:52-54`:

```ts
function isEligibleOperator(user: CurrentUserContext): boolean {
  return user.isOrgOwner || ["ADMIN", "OWNER", "ORG_ADMIN"].includes(user.role);
}
```

`user.role` / `user.isOrgOwner` describe the caller's standing in **their own**
organization. There is no platform-operator role, group or allow-list. Every management
route is therefore gated by exactly one thing: the shared static `INTERNAL_API_SECRET`
header (`controller.ts:36-38`). Anyone who is an admin or owner of *any* organization and
who obtains that one secret can file, approve, reject and revoke break-glass grants
against *any* organization.

The secret is a single shared value with no rotation story visible here, and both the
requester and the approver in the two-person rule are drawn from the same undifferentiated
pool. That materially weakens P0-2: the "second person" need not be a member of an
operations team, only another holder of the same secret.

*Fix shape:* a named platform-operator population (a table, a claim, or an allow-list),
checked in addition to the secret, with the approver required to be in it.

### P2-1 — the customer tenant is not notified

`createGrantAndLog` emits `security.operator_access.requested`
(`service.ts:104-116`), which is a real, mandatory, non-user-configurable,
quiet-hours-bypassing catalog event
(`notification-events-security-support.catalog.ts:14-22`). But `targetUserIds` is
`[params.operatorUserId]` with `notifySelf: true`, and `NotificationDispatchService.emit`
delivers to exactly `targetUserIds` (`notification-dispatch.service.ts:168-174`). The
only person notified is the operator who is about to receive the access. Nobody in the
customer organization is told.

There is also no emission on **approve**, **revoke**, **expire**, or on **use** of a
grant, so a tenant is never told the access was actually exercised.

RB-10 §1 already names the recipient population, mandatory channel and customer-facing
disclosure as unresolved. This is that gap, with the code line attached.

### P2-2 — a denied break-glass attempt is not audited

`authorizeRequest` throws at `service.ts:339-342` **before** reaching its `INSERT`. A
rejected attempt — an expired grant reused, a cross-tenant probe, a scope escalation —
leaves no row in `operator_access_log`. Only successful accesses are recorded.

---

## PRD-C180 — element by element

| C180 element | State | Evidence |
|---|---|---|
| operator/break-glass roles | built — 5 scopes, `service.ts:20-25`; eligibility `controller.ts:52-54` | source |
| reason | enforced, 3–1000 chars, must differ from `incidentRef` — `service.ts:391-397` | `platform-operator-access.spec.ts` |
| two-person approval | **partial** — requester≠approver enforced; beneficiary≠approver **not** | P0-2 |
| no-self approval | **partial** — same | P0-2 |
| duration | enforced, max 4h — `service.ts:27,63-67` | `platform-operator-access-policy.spec.ts:37-98` |
| expiry | enforced at authorization time, not only at sweep — `service.ts:334` | drill `C181-1` |
| tenant scope | enforced by predicate + RLS — `service.ts:331` | drill `C181-3` |
| notification | **partial** — request only, and only to the operator | P2-1 |
| immutable audit | **not met** for the break-glass trail | P0-1 |
| revocation | built — `revokeGrant` `service.ts:354-389`, conditional and audited | `platform-operator-access.spec.ts:387-411` |

The approval itself is a human act. The decision record is at
`architecture-refactor/decisions/operator-access-2026-09-03.md`, authored complete and
**unsigned**.
