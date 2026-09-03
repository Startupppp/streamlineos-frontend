#!/usr/bin/env node
/* global process */
/**
 * PRD-C181 break-glass rejection drill.
 *
 * Replays the SIX rejection cases PRD-C181 names against a real PostgreSQL
 * database, using the exact predicates the running service uses, over the
 * NON-OWNER application role so RLS is live:
 *
 *   1. expired approval
 *   2. revoked approval
 *   3. cross-tenant use
 *   4. wrong scope
 *   5. concurrent approval (two-person rule attacked)
 *   6. audit-write failure  <- ordering: does the sensitive read still proceed?
 *
 * The authorization predicate replayed here is verbatim from
 *   backend/src/modules/platform/platform-operator-access.service.ts:325-338
 * (`authorizeRequest`, the function OperatorSessionGuard actually calls), and
 * the approval transition from the same file, lines 145-168.
 *
 * This drill is NOT deployed evidence. It is a local database drill: it proves
 * what the SQL and the schema constraints do, not what a deployed cell does.
 *
 * Usage:
 *   APP_DATABASE_URL=postgres://streamline_app:...@host/db node drill-c181-sensitive-route-rejections.mjs
 *   node drill-c181-sensitive-route-rejections.mjs --self-test
 */
import { createRequire } from "node:module";

const require = createRequire(
  "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/package.json",
);
const postgres = require("postgres");

const ORG_A = "bg-drill-org-a";
const ORG_B = "bg-drill-org-b";
const OPERATOR = "bg-drill-operator";
const REQUESTER = "bg-drill-requester";
const APPROVER_1 = "bg-drill-approver-1";
const APPROVER_2 = "bg-drill-approver-2";

const results = [];
function record(id, expectation, observed, pass, detail) {
  results.push({ id, expectation, observed, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  process.stdout.write(`${mark}  ${id}\n      expected: ${expectation}\n      observed: ${observed}\n`);
  if (detail) process.stdout.write(`      detail:   ${detail}\n`);
  process.stdout.write("\n");
}

/** Verbatim replay of authorizeRequest's grant predicate (service.ts:325-338). */
async function authorizeRequest(sql, { operatorUserId, orgId, scope, action, failAudit = false }) {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.organization_id', ${orgId}, true), set_config('app.audience', 'INTERNAL', true)`;
    const rows = await tx`
      SELECT grant_id FROM public.operator_access_grants
       WHERE operator_user_id = ${operatorUserId}
         AND org_id           = ${orgId}
         AND scope            = ${scope}
         AND status           = 'active'
         AND expires_at       > now()
         AND revoked_at IS NULL
       LIMIT 1`;
    if (rows.length === 0) throw new Error("FORBIDDEN: No active operator access grant for this organisation and scope");
    // The audit insert is inside the SAME transaction and is awaited before the
    // guard is allowed to return true. `failAudit` injects a genuine write
    // failure (a grant_id with no parent row violates the composite FK).
    await tx`
      INSERT INTO public.operator_access_log (grant_id, operator_user_id, org_id, action, ip_address)
      VALUES (${failAudit ? "00000000-0000-0000-0000-0000000000ff" : rows[0].grant_id},
              ${operatorUserId}, ${orgId}, ${action}, '10.0.0.1')`;
    return rows[0].grant_id;
  });
}

/** Verbatim replay of approveGrant's conditional transition (service.ts:145-168). */
async function approveGrant(sql, grantId, orgId, approverId) {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.organization_id', ${orgId}, true), set_config('app.audience', 'INTERNAL', true)`;
    const updated = await tx`
      UPDATE public.operator_access_grants
         SET status = 'active', approver_id = ${approverId}
       WHERE grant_id = ${grantId}
         AND status   = 'pending'
         AND revoked_at IS NULL
         AND expires_at > now()
       RETURNING grant_id`;
    if (updated.length === 0) throw new Error("CONFLICT: Grant was changed before approval completed");
    await tx`
      INSERT INTO public.operator_access_log (grant_id, operator_user_id, org_id, action, ip_address)
      VALUES (${grantId}, ${approverId}, ${orgId}, 'grant.approved', '10.0.0.1')`;
    return updated[0].grant_id;
  });
}

async function insertGrant(sql, { orgId, operatorUserId, scope, status, expiresAt, revokedAt = null, grantedBy = REQUESTER, approverId = APPROVER_1 }) {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.organization_id', ${orgId}, true), set_config('app.audience', 'INTERNAL', true)`;
    const rows = await tx`
      INSERT INTO public.operator_access_grants
        (operator_user_id, org_id, incident_ref, granted_by, scope, expires_at, revoked_at, status, approver_id)
      VALUES (${operatorUserId}, ${orgId}, 'INC-DRILL', ${grantedBy}, ${scope},
              ${expiresAt}, ${revokedAt}, ${status}, ${approverId})
      RETURNING grant_id`;
    return rows[0].grant_id;
  });
}

async function cleanup(sql) {
  for (const org of [ORG_A, ORG_B]) {
    await sql.begin(async (tx) => {
      await tx`SELECT set_config('app.organization_id', ${org}, true), set_config('app.audience', 'INTERNAL', true)`;
      await tx`DELETE FROM public.operator_access_log    WHERE org_id = ${org}`;
      await tx`DELETE FROM public.operator_access_grants WHERE org_id = ${org}`;
    });
  }
}

async function countLogs(sql, orgId) {
  return sql.begin(async (tx) => {
    await tx`SELECT set_config('app.organization_id', ${orgId}, true), set_config('app.audience', 'INTERNAL', true)`;
    const rows = await tx`SELECT count(*)::int AS n FROM public.operator_access_log WHERE org_id = ${orgId}`;
    return rows[0].n;
  });
}

async function main() {
  const url = process.env.APP_DATABASE_URL;
  if (!url) {
    process.stderr.write(
      "PREREQUISITE UNMET — cannot determine. This drill needs a live database reached over the\n" +
        "NON-OWNER application role; the owner role has BYPASSRLS and would report a boundary the\n" +
        "running service does not have. Nothing about break-glass enforcement was measured.\n" +
        "Required variable: APP_DATABASE_URL\n",
    );
    process.exit(2);
  }

  const sql = postgres(url, { prepare: false, max: 4, onnotice: () => {} });
  try {
    const who = await sql`SELECT current_user AS role, current_database() AS db,
                                 (SELECT rolbypassrls FROM pg_roles WHERE rolname = current_user) AS bypassrls`;
    process.stdout.write(
      `role=${who[0].role} database=${who[0].db} bypassrls=${who[0].bypassrls}\n` +
        `predicate source: platform-operator-access.service.ts:325-338 (authorizeRequest)\n` +
        `transition source: platform-operator-access.service.ts:145-168 (approveGrant)\n\n`,
    );
    if (who[0].bypassrls) throw new Error("refusing to run: connected role has BYPASSRLS, RLS would not be exercised");

    await cleanup(sql);

    const future = new Date(Date.now() + 60 * 60 * 1000);
    const past = new Date(Date.now() - 60 * 60 * 1000);

    // ---- CONTROL: a good grant must be ALLOWED, or every DENY below is vacuous.
    const good = await insertGrant(sql, { orgId: ORG_A, operatorUserId: OPERATOR, scope: "read_customer_data", status: "active", expiresAt: future });
    try {
      const grantId = await authorizeRequest(sql, { operatorUserId: OPERATOR, orgId: ORG_A, scope: "read_customer_data", action: "operator.get./platform/operator/organizations/:orgId" });
      record("CONTROL-allow", "an active, unexpired, correctly-scoped grant AUTHORIZES", `authorized grant ${grantId}`, grantId === good);
    } catch (error) {
      record("CONTROL-allow", "an active, unexpired, correctly-scoped grant AUTHORIZES", `DENIED: ${error.message}`, false);
    }

    // ---- CASE 1: expired approval.
    await insertGrant(sql, { orgId: ORG_A, operatorUserId: `${OPERATOR}-exp`, scope: "read_customer_data", status: "active", expiresAt: past });
    try {
      await authorizeRequest(sql, { operatorUserId: `${OPERATOR}-exp`, orgId: ORG_A, scope: "read_customer_data", action: "operator.get.expired" });
      record("C181-1-expired", "expired grant is REJECTED", "AUTHORIZED — expired grant accepted", false);
    } catch (error) {
      record("C181-1-expired", "expired grant is REJECTED", error.message, error.message.startsWith("FORBIDDEN"), "predicate: expires_at > now()");
    }

    // ---- CASE 2: revoked approval.
    await insertGrant(sql, { orgId: ORG_A, operatorUserId: `${OPERATOR}-rev`, scope: "read_customer_data", status: "revoked", expiresAt: future, revokedAt: new Date() });
    try {
      await authorizeRequest(sql, { operatorUserId: `${OPERATOR}-rev`, orgId: ORG_A, scope: "read_customer_data", action: "operator.get.revoked" });
      record("C181-2-revoked", "revoked grant is REJECTED", "AUTHORIZED — revoked grant accepted", false);
    } catch (error) {
      record("C181-2-revoked", "revoked grant is REJECTED", error.message, error.message.startsWith("FORBIDDEN"), "predicates: status='active' AND revoked_at IS NULL");
    }

    // ---- CASE 3: cross-tenant use. Grant is for ORG_A; the route names ORG_B.
    try {
      await authorizeRequest(sql, { operatorUserId: OPERATOR, orgId: ORG_B, scope: "read_customer_data", action: "operator.get.cross-tenant" });
      record("C181-3-cross-tenant", "a grant for org A does not authorize org B", "AUTHORIZED — cross-tenant grant accepted", false);
    } catch (error) {
      record("C181-3-cross-tenant", "a grant for org A does not authorize org B", error.message, error.message.startsWith("FORBIDDEN"), "predicate org_id = :orgId, plus the RLS tenant_isolation policy on the same table");
    }

    // ---- CASE 4: wrong scope. Grant is read_payments; the route requires read_customer_data.
    await insertGrant(sql, { orgId: ORG_A, operatorUserId: `${OPERATOR}-pay`, scope: "read_payments", status: "active", expiresAt: future });
    try {
      await authorizeRequest(sql, { operatorUserId: `${OPERATOR}-pay`, orgId: ORG_A, scope: "read_customer_data", action: "operator.get.wrong-scope" });
      record("C181-4-wrong-scope", "a read_payments grant does not authorize a read_customer_data route", "AUTHORIZED — wrong-scope grant accepted", false);
    } catch (error) {
      record("C181-4-wrong-scope", "a read_payments grant does not authorize a read_customer_data route", error.message, error.message.startsWith("FORBIDDEN"), "predicate scope = :scope");
    }

    // ---- CASE 5a: concurrent approval — two approvers race one pending grant.
    const pending = await insertGrant(sql, { orgId: ORG_A, operatorUserId: OPERATOR, scope: "read_leads", status: "pending", expiresAt: future, grantedBy: REQUESTER, approverId: null });
    const race = await Promise.allSettled([
      approveGrant(sql, pending, ORG_A, APPROVER_1),
      approveGrant(sql, pending, ORG_A, APPROVER_2),
    ]);
    const won = race.filter((r) => r.status === "fulfilled").length;
    const lost = race.filter((r) => r.status === "rejected").length;
    record(
      "C181-5a-concurrent-approval",
      "exactly one of two concurrent approvals commits; the other CONFLICTS",
      `${won} approved, ${lost} conflicted`,
      won === 1 && lost === 1,
      `loser: ${race.find((r) => r.status === "rejected")?.reason?.message ?? "n/a"}`,
    );

    // ---- CASE 5b: two-person rule — the requester approving their own request.
    const selfPending = await insertGrant(sql, { orgId: ORG_A, operatorUserId: OPERATOR, scope: "read_messages", status: "pending", expiresAt: future, grantedBy: REQUESTER, approverId: null });
    try {
      await approveGrant(sql, selfPending, ORG_A, REQUESTER);
      record("C181-5b-self-approval-requester", "the requester (granted_by) cannot be the approver", "ACCEPTED — requester approved their own grant", false);
    } catch (error) {
      record("C181-5b-self-approval-requester", "the requester (granted_by) cannot be the approver", error.message, /chk_oag_self_approval|23514/.test(error.message), "DB CHECK chk_oag_self_approval backstops the service check at service.ts:143");
    }

    // ---- CASE 5d: the two-person rule attacked by ONE person approving TWICE,
    // concurrently. This is the literal reading of C181's "concurrent-approval".
    const twicePending = await insertGrant(sql, { orgId: ORG_A, operatorUserId: OPERATOR, scope: "read_leads", status: "pending", expiresAt: future, grantedBy: REQUESTER, approverId: null });
    const twice = await Promise.allSettled([
      approveGrant(sql, twicePending, ORG_A, REQUESTER),
      approveGrant(sql, twicePending, ORG_A, REQUESTER),
    ]);
    const twiceWon = twice.filter((r) => r.status === "fulfilled").length;
    record(
      "C181-5d-same-person-twice-concurrent",
      "the requester firing two concurrent approvals of their own request satisfies nothing — both are rejected",
      `${twiceWon} approved, ${twice.length - twiceWon} rejected`,
      twiceWon === 0,
      `rejections: ${twice.filter((r) => r.status === "rejected").map((r) => r.reason.message.split("\n")[0]).join(" | ")}`,
    );

    // ---- CASE 5c: two-person rule — the BENEFICIARY approving their own access.
    // granted_by is a third party, so service.ts:143 and chk_oag_self_approval
    // both pass. The person who GAINS the access signs it off.
    const benePending = await insertGrant(sql, { orgId: ORG_A, operatorUserId: OPERATOR, scope: "manage_subscription", status: "pending", expiresAt: future, grantedBy: REQUESTER, approverId: null });
    try {
      await approveGrant(sql, benePending, ORG_A, OPERATOR);
      record("C181-5c-self-approval-beneficiary", "the operator who RECEIVES the access cannot be the approver", "ACCEPTED — the beneficiary approved their own break-glass access", false, "neither service.ts:143 nor chk_oag_self_approval compares approver_id with operator_user_id");
    } catch (error) {
      record("C181-5c-self-approval-beneficiary", "the operator who RECEIVES the access cannot be the approver", error.message, true);
    }

    // ---- CASE 6: audit-write failure. The sensitive operation MUST NOT proceed.
    const before = await countLogs(sql, ORG_A);
    let authorized = false;
    let auditError = "";
    try {
      await authorizeRequest(sql, { operatorUserId: OPERATOR, orgId: ORG_A, scope: "read_customer_data", action: "operator.get.audit-failure", failAudit: true });
      authorized = true;
    } catch (error) {
      auditError = error.message.split("\n")[0];
    }
    const after = await countLogs(sql, ORG_A);
    record(
      "C181-6-audit-write-failure",
      "when the audit insert fails the authorization FAILS CLOSED — the caller never receives permission",
      authorized ? "AUTHORIZED despite a failed audit write" : `DENIED: ${auditError}`,
      !authorized && after === before,
      `operator_access_log rows before=${before} after=${after} (the SELECT and the INSERT share one transaction, so the read authorization is rolled back with the failed write)`,
    );

    process.stdout.write(
      "\nNOTE — what this drill does NOT establish:\n" +
        "  * It replays the service's SQL against a local database. It is not a deployed-route probe.\n" +
        "  * Case 6 proves the DB transaction aborts. That the HTTP handler is then never entered is a\n" +
        "    property of OperatorSessionGuard.canActivate awaiting authorizeRequest before returning\n" +
        "    true (operator-session.guard.ts:49-59); Nest does not invoke a handler when a guard rejects.\n",
    );

    const failed = results.filter((r) => !r.pass);
    process.stdout.write(`\nSUMMARY: ${results.length - failed.length}/${results.length} checks passed.\n`);
    for (const f of failed) process.stdout.write(`  FAILED: ${f.id} — ${f.observed}\n`);
    process.exitCode = failed.length === 0 ? 0 : 1;
  } finally {
    await cleanup(sql).catch(() => {});
    await sql.end();
  }
}

await main();
