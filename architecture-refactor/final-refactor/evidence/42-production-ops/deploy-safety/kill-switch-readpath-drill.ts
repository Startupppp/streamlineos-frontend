/**
 * PRD-C176 — kill switches honoured on the live read path.
 *
 * Imports the PRODUCTION resolver (backend src/modules/autonomy/kill-switch.ts)
 * and runs it over rows read from the real `autonomy_switches` table in the local
 * head database, using the same SELECT the service issues at
 * backend src/modules/autonomy/autonomy-actions.service.ts:351-368 (`isAllowed`),
 * which gates the two act paths at :126-127 and :258-259.
 *
 * Reads run as the NON-OWNER application role with the tenant GUC set, so the
 * table's `tenant_isolation` policy is in force exactly as it is in production.
 * Everything is seeded and torn down; nothing persists.
 */
import postgres from "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/node_modules/.pnpm/postgres@3.4.9/node_modules/postgres/cjs/src/index.js";
import { randomUUID } from "node:crypto";
import {
  resolveSwitch,
  switchesFor,
  type SwitchRow,
} from "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/autonomy/kill-switch.ts";

const OWNER = process.env.OWNER_DATABASE_URL;
const APP = process.env.APP_DATABASE_URL;
if (!OWNER || !APP) { console.error("OWNER_DATABASE_URL and APP_DATABASE_URL are required"); process.exit(2); }

const orgA = `ks-drill-a-${randomUUID()}`;
const orgB = `ks-drill-b-${randomUUID()}`;
const results: { name: string; ok: boolean; detail: string }[] = [];
const check = (name: string, ok: boolean, detail: string) => { results.push({ name, ok, detail }); };

const owner = postgres(OWNER, { prepare: false, max: 1, onnotice: () => {} });
const app = postgres(APP, { prepare: false, max: 1, onnotice: () => {} });

/** The production `isAllowed` read, verbatim, as the app role inside the tenant GUC. */
async function isAllowed(organizationId: string, kind: string) {
  return app.begin(async (tx) => {
    await tx`SELECT set_config('app.organization_id', ${organizationId}, true)`;
    const rows = await tx<SwitchRow[]>`
      SELECT organization_id AS "organizationId", kind, enabled, reason
      FROM autonomy_switches
      WHERE organization_id IS NULL OR organization_id = ${organizationId}`;
    return {
      rowsSeen: rows.length,
      decision: resolveSwitch(organizationId, kind as never, switchesFor(organizationId, rows)),
    };
  });
}

async function seedOrg(id: string): Promise<void> {
  const userId = `ks-user-${randomUUID()}`;
  await owner.begin(async (tx) => {
    await tx`SET CONSTRAINTS ALL DEFERRED`;
    await tx`INSERT INTO users (id, email, name) VALUES (${userId}, ${userId + "@drill.invalid"}, 'kill switch drill')`;
    await tx`INSERT INTO organizations (id, name, slug, owner_membership_id) VALUES (${id}, 'kill switch drill', ${id}, 1)`;
    const [m] = await tx`INSERT INTO organization_members (org_id, user_id, role) VALUES (${id}, ${userId}, 'OWNER') RETURNING id`;
    await tx`UPDATE organizations SET owner_membership_id = ${m.id} WHERE id = ${id}`;
  });
  seededUsers.push(userId);
}
const seededUsers: string[] = [];

const setSwitch = (org: string | null, kind: string, enabled: boolean, reason: string | null) =>
  owner`INSERT INTO autonomy_switches (autonomy_switch_id, organization_id, kind, enabled, reason)
        VALUES (${`sw-${randomUUID()}`}, ${org}, ${kind}, ${enabled}, ${reason})`;
const clearSwitches = () => owner`DELETE FROM autonomy_switches WHERE autonomy_switch_id LIKE 'sw-%'`;

try {
  await seedOrg(orgA);
  await seedOrg(orgB);
  await clearSwitches();

  // 1. Baseline: nothing is switched off, so the system may act.
  let r = await isAllowed(orgA, "stage.advanced");
  check("no switch row: the act path is allowed by default",
    r.decision.allowed && r.decision.decidedBy === "default",
    `allowed=${r.decision.allowed} decidedBy=${r.decision.decidedBy} rowsSeen=${r.rowsSeen}`);

  // 2. Org-scoped switch for one kind.
  await setSwitch(orgA, "stage.advanced", false, "drill: org kind off");
  r = await isAllowed(orgA, "stage.advanced");
  check("org+kind switch OFF stops that kind for that org",
    !r.decision.allowed && r.decision.decidedBy === "org-kind",
    `allowed=${r.decision.allowed} decidedBy=${r.decision.decidedBy} reason=${r.decision.reason}`);

  r = await isAllowed(orgA, "task.extracted");
  check("org+kind switch does not stop a different kind",
    r.decision.allowed, `allowed=${r.decision.allowed} decidedBy=${r.decision.decidedBy}`);

  // 3. Tenant isolation: org B must not see org A's switch.
  r = await isAllowed(orgB, "stage.advanced");
  check("another org is unaffected by org A's switch (RLS + switchesFor)",
    r.decision.allowed && r.decision.decidedBy === "default",
    `allowed=${r.decision.allowed} decidedBy=${r.decision.decidedBy} rowsSeen=${r.rowsSeen}`);

  // 4. Platform-wide '*' beats a tenant's explicit enable.
  await setSwitch(orgB, "*", true, "drill: tenant tried to enable everything");
  await setSwitch(null, "*", false, "drill: platform kill switch");
  r = await isAllowed(orgB, "stage.advanced");
  check("platform '*' OFF overrides a tenant's own enabled switch",
    !r.decision.allowed && r.decision.decidedBy === "platform-all",
    `allowed=${r.decision.allowed} decidedBy=${r.decision.decidedBy} reason=${r.decision.reason}`);

  r = await isAllowed(orgA, "task.extracted");
  check("platform '*' OFF reaches every org and every kind",
    !r.decision.allowed && r.decision.decidedBy === "platform-all",
    `allowed=${r.decision.allowed} decidedBy=${r.decision.decidedBy}`);

  // 5. Turning it back on restores service (a kill switch that cannot be undone is a outage).
  await owner`UPDATE autonomy_switches SET enabled = true WHERE organization_id IS NULL AND kind = '*'`;
  await owner`DELETE FROM autonomy_switches WHERE organization_id = ${orgA}`;
  r = await isAllowed(orgA, "stage.advanced");
  check("switching the platform kill switch back on restores the act path",
    r.decision.allowed, `allowed=${r.decision.allowed} decidedBy=${r.decision.decidedBy}`);
} finally {
  try { await clearSwitches(); } catch (e) { console.error("cleanup switches:", (e as Error).message); }
  for (const id of [orgA, orgB]) { try { await owner`DELETE FROM organizations WHERE id = ${id}`; } catch (e) { console.error("cleanup org:", (e as Error).message); } }
  for (const u of seededUsers) { try { await owner`DELETE FROM users WHERE id = ${u}`; } catch { /* ignore */ } }
  const [{ count }] = await owner<{ count: number }[]>`SELECT count(*)::int AS count FROM autonomy_switches`;
  console.log(`\ncleanup: autonomy_switches rows remaining = ${count}`);
  await owner.end(); await app.end();
}

console.log("");
for (const x of results) console.log(`${x.ok ? "PASS" : "FAIL"}  ${x.name.padEnd(64)} ${x.detail}`);
const failed = results.filter((x) => !x.ok);
console.log(`\nRESULT: checks=${results.length} failed=${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);
