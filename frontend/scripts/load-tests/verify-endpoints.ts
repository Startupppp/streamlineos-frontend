import { execSync } from "child_process";

const BASE_URL = process.env.BASE_URL || "http://localhost:1000";
const API_PREFIX = `${BASE_URL}/api`;
const LOAD_TEST_SECRET = process.env.LOAD_TEST_SECRET || "";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

interface EndpointRow {
  path: string;
  name: string;
}

interface CheckResult {
  path: string;
  name: string;
  status: number;
  ms: number;
  ok: boolean;
}

async function getSessionCookie(): Promise<string> {
  return execSync("pnpm exec tsx --env-file=.env scripts/load-tests/get-session.ts", {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  }).trim();
}

async function checkEndpoint(
  path: string,
  name: string,
  cookie: string,
): Promise<CheckResult> {
  const start = performance.now();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": BROWSER_UA,
    Cookie: cookie,
  };
  if (LOAD_TEST_SECRET) {
    headers["X-Load-Test-Secret"] = LOAD_TEST_SECRET;
  }

  const res = await fetch(`${API_PREFIX}${path}`, { headers });
  const ms = Math.round(performance.now() - start);
  return {
    path,
    name,
    status: res.status,
    ms,
    ok: res.status >= 200 && res.status < 300,
  };
}

function firstId(list: unknown): number | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  const item = list[0] as { id?: number };
  return item?.id ?? null;
}

async function main() {
  const {
    HR_READ_ENDPOINTS,
    RECRUITMENT_READ_ENDPOINTS,
    recruitmentDetailEndpoints,
    CHAT_READ_ENDPOINTS,
    chatDetailEndpoints,
  } = await import("./lib/endpoints.js");

  const cookie = await getSessionCookie();
  const results: CheckResult[] = [];

  const allEndpoints: EndpointRow[] = [
    { path: "/health", name: "health" },
    ...HR_READ_ENDPOINTS,
    ...RECRUITMENT_READ_ENDPOINTS,
    ...CHAT_READ_ENDPOINTS,
  ];

  for (const ep of allEndpoints) {
    results.push(await checkEndpoint(ep.path, ep.name, cookie));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": BROWSER_UA,
    Cookie: cookie,
  };
  if (LOAD_TEST_SECRET) {
    headers["X-Load-Test-Secret"] = LOAD_TEST_SECRET;
  }

  const candidatesRes = await fetch(`${API_PREFIX}/hr/recruitment/candidates?limit=5`, { headers });
  const jobsRes = await fetch(`${API_PREFIX}/hr/recruitment/jobs?limit=5`, { headers });
  const interviewsRes = await fetch(`${API_PREFIX}/hr/recruitment/interviews?limit=5`, { headers });
  const channelsRes = await fetch(`${API_PREFIX}/chat/channels`, { headers });

  const ids = {
    candidateId: firstId(await candidatesRes.json()),
    jobId: firstId(await jobsRes.json()),
    interviewId: firstId(await interviewsRes.json()),
    channelId: firstId(await channelsRes.json()),
  };

  const detailEndpoints = [
    ...recruitmentDetailEndpoints(ids),
    ...chatDetailEndpoints(ids.channelId),
  ];

  for (const ep of detailEndpoints) {
    results.push(await checkEndpoint(ep.path, ep.name, cookie));
  }

  const failed = results.filter((r) => !r.ok);
  const passed = results.filter((r) => r.ok);

  console.log("\n── Load test endpoint verification ──\n");
  console.log("PATH".padEnd(52), "STATUS", "MS");
  console.log("-".repeat(72));
  for (const r of results) {
    const mark = r.ok ? "✓" : "✗";
    console.log(`${mark} ${r.path.padEnd(50)} ${String(r.status).padStart(3)}  ${String(r.ms).padStart(4)}`);
  }
  console.log(`\n${passed.length}/${results.length} passed, ${failed.length} failed`);

  if (failed.length > 0) {
    console.error("\nFailed endpoints:");
    for (const f of failed) {
      console.error(`  ${f.status} ${f.path} (${f.name})`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
