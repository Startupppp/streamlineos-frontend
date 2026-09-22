/**
 * PRD-C177 — worker lease recovery and duplicate/loss safety under an abrupt kill.
 *
 * Induces the failure the criterion names: a worker takes a lease and is then
 * killed mid-lease, leaving no terminal write. Runs against the local head
 * database (scratch_head_1010, 677/677 migrations) as the NON-OWNER application
 * role with the tenant GUC set, which is how the real workers connect.
 *
 * Every statement below is the production statement. The claim SQL is copied
 * from:
 *   backend src/common/outbox/outbox-publisher.service.ts:141-160  (claimBatch)
 *   backend src/common/outbox/outbox-publisher.service.ts:265-275  (mark)
 *   backend src/common/workflow/workflow-store.ts:283-296          (claimDueRuns)
 *   backend src/common/workflow/workflow-store.ts:139-161          (write / complete)
 * RETURNING is added only to observe the affected row count; the predicates are
 * byte-for-byte the production predicates.
 *
 * Leases are shortened to ~1.2s and the drill really waits them out, rather than
 * rewinding a clock, so expiry is observed and not simulated.
 */
import postgres from "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/cjs/src/index.js";
import { randomUUID } from "node:crypto";

const OWNER = process.env.OWNER_DATABASE_URL;
const APP = process.env.APP_DATABASE_URL;
if (!OWNER || !APP) { console.error("OWNER_DATABASE_URL and APP_DATABASE_URL are required"); process.exit(2); }

const LEASE_MS = 1200;
/**
 * Production computes the lease in JS and binds it as a parameter
 * (outbox-publisher.service.ts:134, workflow retry-policy.ts:61), so the stored
 * value carries only millisecond precision and round-trips through the driver
 * byte-exact. Computing it server-side with `now() + interval` instead would
 * store microseconds, and the read-back Date would truncate them — every fence
 * comparison would then fail for a reason that has nothing to do with the fence.
 */
const nextLease = () => new Date(Date.now() + LEASE_MS);
const orgId = `lease-drill-${randomUUID()}`;
const userId = `lease-drill-user-${randomUUID()}`;
const eventId = randomUUID();
const runId = `run-${randomUUID()}`;

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok, detail }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const owner = postgres(OWNER, { prepare: false, max: 1, onnotice: () => {} });
const app = postgres(APP, { prepare: false, max: 1, onnotice: () => {} });

/** Runs fn inside one app-role transaction with the tenant GUC set, as the workers do. */
const asTenant = (fn) => app.begin(async (tx) => {
  await tx`SELECT set_config('app.organization_id', ${orgId}, true)`;
  return fn(tx);
});

let outboxPk = null;
try {
  // ---------- setup (owner) ----------
  await owner.begin(async (tx) => {
    await tx`SET CONSTRAINTS ALL DEFERRED`;
    await tx`INSERT INTO users (id, email, name) VALUES (${userId}, ${userId + "@drill.invalid"}, 'lease drill')`;
    await tx`INSERT INTO organizations (id, name, slug, owner_membership_id) VALUES (${orgId}, 'lease drill org', ${orgId}, 1)`;
    const [m] = await tx`INSERT INTO organization_members (org_id, user_id, role) VALUES (${orgId}, ${userId}, 'OWNER') RETURNING id`;
    await tx`UPDATE organizations SET owner_membership_id = ${m.id} WHERE id = ${orgId}`;

    const [ev] = await tx`
      INSERT INTO outbox_events (event_id, organization_id, aggregate_type, aggregate_id,
        aggregate_version, event_type, payload, occurred_at, delivery_state)
      VALUES (${eventId}, ${orgId}, 'lease-drill', ${eventId}, 1,
        'deploy-safety.lease-drill', '{"drill":true}'::jsonb, now(), 'PENDING')
      RETURNING outbox_event_id`;
    outboxPk = ev.outbox_event_id;

    await tx`
      INSERT INTO workflow_runs (workflow_run_id, organization_id, workflow_name, input, status, run_after)
      VALUES (${runId}, ${orgId}, 'deploy-safety.lease-drill', '{"drill":true}'::jsonb, 'PENDING', now())`;
  });

  // ================= OUTBOX =================
  const claimOutbox = (tx, lease = nextLease()) => tx`
    UPDATE outbox_events SET delivery_state = 'IN_FLIGHT', lease_expires_at = ${lease}
    WHERE outbox_event_id IN (
      SELECT outbox_event_id FROM outbox_events
      WHERE organization_id = ${orgId}
        AND ( (delivery_state = 'PENDING'   AND (lease_expires_at IS NULL OR lease_expires_at <= now()))
           OR (delivery_state = 'IN_FLIGHT' AND lease_expires_at <= now()) )
      ORDER BY outbox_event_id LIMIT 50 FOR UPDATE SKIP LOCKED
    ) RETURNING outbox_event_id, lease_expires_at`;

  // mark(): the fenced terminal write — outbox-publisher.service.ts:265-275
  const markDelivered = (tx, lease) => tx`
    UPDATE outbox_events SET delivery_state = 'DELIVERED', lease_expires_at = NULL, published_at = now()
    WHERE outbox_event_id = ${outboxPk} AND delivery_state = 'IN_FLIGHT' AND lease_expires_at = ${lease}
    RETURNING outbox_event_id`;

  const aOutbox = await asTenant(claimOutbox);
  check("outbox: worker A claims the pending event", aOutbox.length === 1,
    `claimed=${aOutbox.length} lease=${aOutbox[0]?.lease_expires_at?.toISOString?.() ?? null}`);
  const aLease = aOutbox[0].lease_expires_at;

  // --- SIGKILL: worker A stops here. No DELIVERED, no RETRY, no lease release. ---

  const bDuring = await asTenant(claimOutbox);
  check("outbox: no second worker may claim while A's lease is live (no duplicate)",
    bDuring.length === 0, `claimed=${bDuring.length}`);

  await sleep(1500); // outlive the lease for real

  const bAfter = await asTenant(claimOutbox);
  check("outbox: the abandoned event is reclaimed once the lease expires (no loss)",
    bAfter.length === 1 && bAfter[0].lease_expires_at.getTime() !== aLease.getTime(),
    `claimed=${bAfter.length} newLease=${bAfter[0]?.lease_expires_at?.toISOString?.() ?? null}`);
  const bLease = bAfter[0]?.lease_expires_at ?? null;

  const zombieOutbox = await asTenant((tx) => markDelivered(tx, aLease));
  check("outbox: the killed worker's terminal write is FENCED by its stale lease",
    zombieOutbox.length === 0, `rowsUpdatedByZombie=${zombieOutbox.length} (0 = fenced)`);

  const liveOutbox = await asTenant((tx) => markDelivered(tx, bLease));
  check("outbox: the holder of the current lease can still complete it",
    liveOutbox.length === 1, `rowsUpdatedByLeaseHolder=${liveOutbox.length}`);

  // ================= WORKFLOW RUNS =================
  const claimRuns = (tx, lease = nextLease()) => tx`
    UPDATE workflow_runs SET status = 'RUNNING', lease_expires_at = ${lease}, updated_at = now()
    WHERE workflow_run_id IN (
      SELECT workflow_run_id FROM workflow_runs
      WHERE organization_id = ${orgId}
        AND ( (status IN ('PENDING','SLEEPING') AND run_after <= now())
           OR (status = 'RUNNING' AND lease_expires_at IS NOT NULL AND lease_expires_at < now()) )
      ORDER BY run_after ASC LIMIT 25 FOR UPDATE SKIP LOCKED
    ) RETURNING workflow_run_id, lease_expires_at`;

  // complete(): createLifecycleStore.write + ownRun — workflow-store.ts:132-161.
  // The predicate is org + run id. There is no lease term and no status term.
  const completeRun = (tx) => tx`
    UPDATE workflow_runs SET status = 'COMPLETED', output = '{"drill":true}'::jsonb,
      completed_at = now(), lease_expires_at = NULL, last_error = NULL
    WHERE organization_id = ${orgId} AND workflow_run_id = ${runId}
    RETURNING workflow_run_id`;

  const aRun = await asTenant(claimRuns);
  check("workflow: worker A claims the due run", aRun.length === 1,
    `claimed=${aRun.length} lease=${aRun[0]?.lease_expires_at?.toISOString?.() ?? null}`);
  const aRunLease = aRun[0].lease_expires_at;

  // --- SIGKILL: worker A stops here. ---

  const bRunDuring = await asTenant(claimRuns);
  check("workflow: no second worker may claim while A's lease is live (no duplicate)",
    bRunDuring.length === 0, `claimed=${bRunDuring.length}`);

  await sleep(1500);

  const bRunAfter = await asTenant(claimRuns);
  check("workflow: the abandoned run is reclaimed once the lease expires (no loss)",
    bRunAfter.length === 1 && bRunAfter[0].lease_expires_at.getTime() !== aRunLease.getTime(),
    `claimed=${bRunAfter.length} newLease=${bRunAfter[0]?.lease_expires_at?.toISOString?.() ?? null}`);
  const bRunLease = bRunAfter[0]?.lease_expires_at ?? null;

  // The one that matters: worker A wakes up (it was slow, not dead) and finishes.
  const zombieRun = await asTenant(completeRun);
  const [stateAfter] = await asTenant((tx) => tx`
    SELECT status, lease_expires_at FROM workflow_runs WHERE workflow_run_id = ${runId}`);
  check("workflow: the stale worker's terminal write is FENCED by its stale lease",
    zombieRun.length === 0,
    `rowsUpdatedByZombie=${zombieRun.length} (expected 0) — run is now status=${stateAfter.status} ` +
    `lease=${stateAfter.lease_expires_at === null ? "NULL" : stateAfter.lease_expires_at.toISOString()}; ` +
    `worker B's live lease was ${bRunLease === null ? "null" : bRunLease.toISOString()}`);
} finally {
  try { await owner`DELETE FROM organizations WHERE id = ${orgId}`; } catch (e) { console.error("cleanup org:", e.message); }
  try { await owner`DELETE FROM users WHERE id = ${userId}`; } catch (e) { console.error("cleanup user:", e.message); }
  const [{ count: leftovers }] = await owner`
    SELECT (SELECT count(*) FROM outbox_events WHERE event_type = 'deploy-safety.lease-drill')
         + (SELECT count(*) FROM workflow_runs WHERE workflow_name = 'deploy-safety.lease-drill') AS count`;
  console.log(`\ncleanup: rows left behind = ${leftovers}`);
  await owner.end(); await app.end();
}

console.log("");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(72)} ${r.detail}`);
const failed = results.filter((r) => !r.ok);
console.log(`\nRESULT: checks=${results.length} failed=${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
