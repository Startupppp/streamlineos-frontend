import fs from "node:fs";
import path from "node:path";

const root = path.resolve("backend/src/db/schema");
const exempt = new Set([
  "users", "accounts", "sessions", "verification_tokens", "user_sessions",
  "mfa_backup_codes", "magic_link_tokens", "email_otp_codes", "user_api_tokens",
  "devices", "permissions", "organizations", "indian_states", "marketplace_apps",
  "ai_credit_packs", "assignment_rule_state", "task_sequence_steps",
]);

const rows = [];

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".ts") && !ent.name.includes(".spec.")) {
      const txt = fs.readFileSync(p, "utf8");
      const rel = path.relative(root, p).replace(/\\/g, "/");
      const re = /export const \w+ = pgTable\(\s*["']([\w_]+)["']/g;
      let m;
      while ((m = re.exec(txt)) !== null) {
        const table = m[1];
        if (exempt.has(table)) continue;
        const slice = txt.slice(m.index, m.index + 1200);
        const hasOrg =
          /org_id|organization_id|"orgId"|organizationId/.test(slice) ||
          /orgId:|organizationId:/.test(slice);
        rows.push({ table, file: rel, hasOrg });
      }
    }
  }
}

walk(root);
const tenant = rows.filter((r) => r.hasOrg);
const byModule = {};
for (const r of tenant) {
  const mod = r.file.split("/")[0];
  byModule[mod] = (byModule[mod] ?? 0) + 1;
}
console.log(JSON.stringify({ total: rows.length, tenantScoped: tenant.length, byModule }, null, 2));
