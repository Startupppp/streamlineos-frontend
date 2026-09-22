/**
 * Local reproduction of `failure-drill --drill=queue-backlog --execute`.
 *
 * The shipped drill (backend src/scripts/failure-drill.mjs:106-160) resolves its
 * tenant with `(SELECT id FROM organizations LIMIT 1)`. The local head database
 * scratch_head_1010 is migration-only (677/677 applied, 0 organizations), so that
 * subselect yields NULL and the INSERT trips organization_id NOT NULL. Nothing
 * about the drill's predicate is wrong; it has no tenant to attach to.
 *
 * This runs the drill's own SQL verbatim, with a throwaway organization seeded
 * inside the SAME transaction, which is rolled back. Nothing persists.
 */
import postgres from "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/cjs/src/index.js";
import { randomUUID } from "node:crypto";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL required"); process.exit(2); }

const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
let passed = false;
let detail = {};
const orgId = `drill-${randomUUID()}`;

try {
  await sql.begin(async (tx) => {
    // Deferred FK organizations(id, owner_membership_id) -> organization_members
    // is DEFERRABLE INITIALLY DEFERRED, so the org and its owner row may be
    // inserted in either order inside one transaction.
    await tx`SET CONSTRAINTS ALL DEFERRED`;
    const userId = `drill-user-${randomUUID()}`;
    await tx`INSERT INTO users (id, email, name) VALUES (${userId}, ${userId + "@drill.invalid"}, 'failure drill')`;
    await tx`INSERT INTO organizations (id, name, slug, owner_membership_id) VALUES (${orgId}, 'failure drill org', ${orgId}, 1)`;
    const [member] = await tx`
      INSERT INTO organization_members (org_id, user_id, role) VALUES (${orgId}, ${userId}, 'OWNER') RETURNING id
    `;
    await tx`UPDATE organizations SET owner_membership_id = ${member.id} WHERE id = ${orgId}`;

    // ---- verbatim from failure-drill.mjs drillQueueBacklog ----
    const syntheticId = randomUUID();
    const oldTimestamp = new Date(Date.now() - 600_000).toISOString();
    await tx`
      INSERT INTO outbox_events (
        event_id, organization_id, aggregate_type, aggregate_id,
        aggregate_version, event_type, payload, occurred_at, created_at, delivery_state
      ) VALUES (
        ${syntheticId},
        ${orgId},
        'failure-drill', ${syntheticId}, 1,
        'failure-drill.queue-backlog-test', '{"drill":true}'::jsonb,
        ${oldTimestamp}::timestamptz, ${oldTimestamp}::timestamptz, 'PENDING'
      )
    `;

    const rows = await tx`
      SELECT
        organization_id AS org_id,
        MIN(created_at) AS oldest_pending_at,
        COUNT(*) FILTER (WHERE delivery_state = 'PENDING') AS pending_count,
        COUNT(*) FILTER (WHERE delivery_state = 'IN_FLIGHT') AS in_flight_count,
        SUM(retry_count) AS total_retries,
        COUNT(*) FILTER (WHERE retry_count >= 3) AS high_retry_count
      FROM outbox_events
      WHERE delivery_state IN ('PENDING', 'IN_FLIGHT')
        AND event_type = 'failure-drill.queue-backlog-test'
      GROUP BY organization_id
    `;

    const ageMs = rows[0]?.oldest_pending_at
      ? Date.now() - new Date(rows[0].oldest_pending_at).getTime()
      : 0;
    const ageSecs = Math.floor(ageMs / 1000);
    passed = ageSecs > 300;
    detail = { insertedEventId: syntheticId, ageSecs, rowCount: rows.length, thresholdSecs: 300 };
    // ---- end verbatim ----

    throw new Error("intentional rollback — drill complete");
  });
} catch (err) {
  if (!err.message.startsWith("intentional rollback")) {
    console.log(JSON.stringify({ drill: "queue-backlog", outcome: "fail", detail: { error: err.message } }));
    await sql.end();
    process.exit(1);
  }
}

// Prove the rollback really discarded everything.
const [{ count: orgLeft }] = await sql`SELECT count(*)::int AS count FROM organizations WHERE id = ${orgId}`;
const [{ count: evLeft }] = await sql`SELECT count(*)::int AS count FROM outbox_events WHERE event_type = 'failure-drill.queue-backlog-test'`;
await sql.end();

const rollbackClean = orgLeft === 0 && evLeft === 0;
console.log(JSON.stringify({
  drill: "queue-backlog",
  outcome: passed && rollbackClean ? "pass" : "fail",
  detail: { ...detail, rowsLeftAfterRollback: { organizations: orgLeft, outboxEvents: evLeft }, rollbackClean },
}, null, 2));
process.exit(passed && rollbackClean ? 0 : 1);
