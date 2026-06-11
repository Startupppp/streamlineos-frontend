import { promises as fs } from "fs";
import * as path from "path";

const ROOT = path.resolve(__dirname, "..");
const API_DIR = path.join(ROOT, "app", "api");

const PUBLIC_ROUTE_PATTERNS = [
  /\/api\/auth\//,
  /\/api\/public\//,
  /\/api\/webhooks\//,
  /\/api\/health/,
  /\/api\/cron\//,
  /\/api\/blog\/feed/,
  /\/api\/careers/,
  /\/api\/inngest/,
  /\/api\/integrations\/google\/callback/,
  /\/api\/landing\/submit/,
  /\/api\/leads\/ingest/,
  /\/api\/marketing\/landing-pages\/[^/]+\/track/,
  /\/api\/platform\/visit/,
  /\/api\/push\/vapid-public-key/,
];

const METHOD_RE = /export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;

type Verdict = "ok" | "warn" | "fail";

interface RouteAudit {
  file: string;
  methods: string[];
  withAuth: boolean;
  abilityCheck: boolean;
  errResponse: boolean;
  rolePermissionCheck: boolean;
  publicByPattern: boolean;
  verdict: Verdict;
  notes: string[];
}

async function walk(dir: string, out: string[] = []): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) await walk(p, out);
    else if (e.isFile() && e.name === "route.ts") out.push(p);
  }
  return out;
}

function relative(p: string): string {
  return p.replace(ROOT, "").replace(/\\/g, "/");
}

async function auditFile(file: string): Promise<RouteAudit> {
  const content = await fs.readFile(file, "utf8");
  const relPath = relative(file);
  const methods = Array.from(content.matchAll(METHOD_RE)).map((m) => m[1]);
  const withAuth =
    /\bwithAuth\b/.test(content) ||
    /\bwithAdmin\b/.test(content) ||
    /\bwithBlogAdmin\b/.test(content) ||
    /\bwithRoles\b/.test(content) ||
    /\bwithAbility\b/.test(content) ||
    /\bauth\(\)/.test(content);
  const abilityCheck =
    /getSessionAbility\b/.test(content) ||
    /ability\.can\(/.test(content) ||
    /checkPermission\(/.test(content) ||
    /requirePermission\(/.test(content) ||
    /requireFeature\(/.test(content) ||
    /\bwithAdmin\b/.test(content) ||
    /\bwithBlogAdmin\b/.test(content) ||
    /\bwithRoles\b/.test(content) ||
    /\bwithAbility\b/.test(content);
  const errResponse = /\berr\(.+,\s*4\d\d\)|status:\s*4\d\d/.test(content);
  const rolePermissionCheck =
    /isPlatformAdmin|isOrgOwner|session\.user\.isPlatformAdmin|session\.user\.isOrgOwner/.test(
      content,
    );
  const publicByPattern = PUBLIC_ROUTE_PATTERNS.some((re) => re.test(relPath));

  const notes: string[] = [];
  let verdict: Verdict = "ok";

  if (publicByPattern) {
    verdict = "ok";
    notes.push("public route — auth not required");
  } else if (!withAuth) {
    verdict = "fail";
    notes.push("missing withAuth() or auth() — route is not authenticated");
  } else if (
    methods.some((m) => m !== "GET") &&
    !abilityCheck &&
    !rolePermissionCheck
  ) {
    verdict = "warn";
    notes.push(
      "writes (POST/PUT/PATCH/DELETE) without explicit ability check — relies on withAuth only",
    );
  }

  if (errResponse === false && verdict === "ok") {
    notes.push("no err(...) response paths — verify by hand");
  }

  return {
    file: relPath,
    methods,
    withAuth,
    abilityCheck,
    errResponse,
    rolePermissionCheck,
    publicByPattern,
    verdict,
    notes,
  };
}

async function main() {
  console.log("Scanning", API_DIR);
  const files = await walk(API_DIR);
  console.log(`Found ${files.length} route files\n`);

  const audits = await Promise.all(files.map(auditFile));
  const fails = audits.filter((a) => a.verdict === "fail");
  const warns = audits.filter((a) => a.verdict === "warn");
  const oks = audits.filter((a) => a.verdict === "ok");

  console.log("=== SUMMARY ===");
  console.log(`OK:    ${oks.length}`);
  console.log(`WARN:  ${warns.length}`);
  console.log(`FAIL:  ${fails.length}`);
  console.log("");

  if (fails.length) {
    console.log("=== FAILURES ===");
    for (const a of fails) {
      console.log(`  ${a.file}  [${a.methods.join(",")}]`);
      a.notes.forEach((n) => console.log(`    - ${n}`));
    }
    console.log("");
  }

  if (warns.length) {
    console.log("=== WARNINGS (writes without explicit ability check) ===");
    for (const a of warns) {
      console.log(`  ${a.file}  [${a.methods.join(",")}]`);
    }
    console.log("");
  }

  process.exit(fails.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
