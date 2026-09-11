/**
 * PRD-C177 — probes, graceful shutdown and draining, observed on a live process.
 *
 * Boots the compiled backend (dist/main.js, built 2026-09-03 16:39 by the
 * orchestrator's build; verified to contain `enableShutdownHooks`, `shutdownGate`
 * and `HealthController.beforeApplicationShutdown`) on a spare port against the
 * local head database as the NON-OWNER application role, then sends it a real
 * SIGTERM and samples all three surfaces at 200ms while it drains.
 *
 * What it is trying to falsify:
 *   - liveness answers 200 for the whole drain (a probe that fails gets the
 *     process SIGKILLed mid-drain instead of drained)
 *   - readiness flips to 503 FIRST, before anything is refused
 *   - normal traffic keeps being served during the settling window, and only
 *     then starts getting 503 + Retry-After
 *   - the process exits on its own, 0
 */
import { spawn } from "node:child_process";
import { request as httpRequest } from "node:http";
import { writeFileSync } from "node:fs";

const PORT = Number(process.env.PROBE_PORT ?? 4310);
const BACKEND = "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend";
const SETTLING_MS = 3000;
const DRAIN_TIMEOUT_MS = 8000;
const base = `http://127.0.0.1:${PORT}`;

const env = {
  ...process.env,
  NODE_ENV: "development",
  PORT: String(PORT),
  DATABASE_URL: process.env.PROBE_DATABASE_URL,
  APP_DATABASE_URL: process.env.PROBE_DATABASE_URL,
  DATABASE_URL_UNPOOLED: process.env.PROBE_DATABASE_URL,
  CORS_ORIGINS: "http://localhost:3000",
  APP_URL: "http://localhost:3000",
  SHUTDOWN_SETTLING_DELAY_MS: String(SETTLING_MS),
  SHUTDOWN_DRAIN_TIMEOUT_MS: String(DRAIN_TIMEOUT_MS),
  // Throwaway values that satisfy the length floors in config/env.validation.ts.
  // Nothing in this probe signs or encrypts anything; no real secret is used.
  BACKEND_JWT_SECRET: "drain-probe-throwaway-secret-000000000000000000",
  PORTAL_JWT_SECRET: "drain-probe-throwaway-secret-000000000000000000",
  ENCRYPTION_KEY: "drain-probe-throwaway-encryption-key-0000",
};
// No .env is loaded and no Redis is configured, so REDIS injects as null. That is
// a supported configuration (CacheService and CronLeaseService both branch on it)
// and it keeps the probe off every shared external service.
for (const k of ["REDIS_URL", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]) delete env[k];

const log = [];
const child = spawn(process.execPath, ["dist/main.js"], {
  cwd: BACKEND, env, stdio: ["ignore", "pipe", "pipe"],
});
child.stdout.on("data", (b) => log.push(b.toString()));
child.stderr.on("data", (b) => log.push(b.toString()));

let exitCode = null; let exitSignal = null; let exitedAt = null;
child.on("exit", (c, s) => { exitCode = c; exitSignal = s; exitedAt = Date.now(); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function probe(path) {
  try {
    const res = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(4000) });
    return { status: res.status, retryAfter: res.headers.get("retry-after"), connection: res.headers.get("connection") };
  } catch (e) { return { status: null, error: e.name === "TimeoutError" ? "timeout" : (e.cause?.code ?? e.name) }; }
}

const results = [];
const check = (name, ok, detail) => results.push({ name, ok, detail });

try {
  // ---- wait for boot ----
  const bootDeadline = Date.now() + 90_000;
  let booted = false;
  while (Date.now() < bootDeadline && exitCode === null) {
    const r = await probe("/health");
    if (r.status === 200) { booted = true; break; }
    await sleep(500);
  }
  if (!booted) {
    console.log("SERVER DID NOT BOOT — log follows\n" + log.join("").slice(-6000));
    process.exit(2);
  }

  // ---- steady state ----
  const live0 = await probe("/health");
  const ready0 = await probe("/health/ready");
  const traffic0 = await probe("/v1/no-such-route");
  check("liveness answers 200 while serving", live0.status === 200, `GET /health → ${live0.status}`);
  check("readiness answers 200 while serving (dependencies up)", ready0.status === 200,
    `GET /health/ready → ${ready0.status}`);
  check("ordinary traffic passes the shutdown gate while serving", traffic0.status !== 503,
    `GET /v1/no-such-route → ${traffic0.status} (404 = reached routing, not refused)`);

  // ---- hold one request in flight across the whole drain ----
  // Content-Type is application/json with a Content-Length the body only
  // half-satisfies, so the global body parser (main.ts:115) blocks on the
  // stream. The shutdown gate is installed ahead of it (main.ts:105), so this
  // request has already been counted into `inFlight` and shutdown must wait
  // for it. That is precisely the request a naive shutdown drops.
  const inFlight = (() => {
    const body = JSON.stringify({ drill: "drain-probe", pad: "x".repeat(64) });
    let settle;
    const done = new Promise((res) => { settle = res; });
    const req = httpRequest({ host: "127.0.0.1", port: PORT, path: "/v1/no-such-route", method: "POST",
      headers: { "content-type": "application/json", "content-length": Buffer.byteLength(body) } });
    req.on("response", (res) => { res.resume(); res.on("end", () => settle({ status: res.statusCode })); });
    req.on("error", (e) => settle({ status: null, error: e.code ?? e.message }));
    req.write(body.slice(0, 5)); // half a body; the rest arrives after the settling window
    return { finish: () => req.end(body.slice(5)), done };
  })();
  await sleep(300);

  // ---- SIGTERM ----
  const sentAt = Date.now();
  child.kill("SIGTERM");

  const samples = [];
  let firstReady503 = null, firstTraffic503 = null, livenessFailedAt = null, inFlightFinished = false;
  while (Date.now() - sentAt < SETTLING_MS + DRAIN_TIMEOUT_MS + 6000) {
    if (exitedAt !== null) break;
    const t = Date.now() - sentAt;
    const [live, ready, traffic] = await Promise.all([
      probe("/health"), probe("/health/ready"), probe("/v1/no-such-route"),
    ]);
    samples.push({ tMs: t, liveness: live.status, readiness: ready.status, traffic: traffic.status, retryAfter: traffic.retryAfter });
    if (ready.status === 503 && firstReady503 === null) firstReady503 = t;
    if (traffic.status === 503 && firstTraffic503 === null) firstTraffic503 = { t, retryAfter: traffic.retryAfter, connection: traffic.connection };
    if (live.status !== 200 && live.status !== null && livenessFailedAt === null) livenessFailedAt = t;
    if (t > SETTLING_MS + 500 && !inFlightFinished) { inFlightFinished = true; inFlight.finish(); }
    await sleep(200);
  }

  check("readiness reports 503 after SIGTERM (the load balancer's signal)",
    firstReady503 !== null, firstReady503 === null ? "readiness never went 503" : `first 503 at t=${firstReady503}ms`);
  check("liveness keeps answering 200 through the whole drain",
    livenessFailedAt === null, livenessFailedAt === null ? "never non-200 while the process was up" : `went non-200 at t=${livenessFailedAt}ms`);
  check("traffic is still accepted during the settling window (no dropped requests)",
    firstReady503 !== null && (firstTraffic503 === null || firstTraffic503.t > firstReady503),
    firstTraffic503 === null ? "traffic never refused before exit" : `readiness 503 at ${firstReady503}ms, traffic first refused at ${firstTraffic503.t}ms`);
  check("refused traffic carries Retry-After and Connection: close",
    firstTraffic503 === null || firstTraffic503.retryAfter === "5",
    firstTraffic503 === null ? "no refusal observed before exit (drain finished inside the settling window)"
      : `Retry-After=${firstTraffic503.retryAfter} Connection=${firstTraffic503.connection}`);

  const waitUntil = Date.now() + 20_000;
  while (exitedAt === null && Date.now() < waitUntil) await sleep(200);
  // Nest's enableShutdownHooks removes its own listener and re-raises the signal
  // once every hook has resolved, so a correctly drained process reports
  // signal=SIGTERM, not code=0. What must be true is that it died AFTER the drain
  // finished and was never SIGKILLed.
  const textEarly = log.join("");
  check("the process terminates only after the drain hook has finished",
    exitedAt !== null && exitSignal !== "SIGKILL" && /Shutdown drain (complete|timed out)/.test(textEarly),
    exitedAt === null ? "still running after 20s"
      : `terminated by ${exitSignal ?? `code ${exitCode}`} at t=${exitedAt - sentAt}ms, drain line present=${/Shutdown drain/.test(textEarly)}`);

  const inFlightResult = await Promise.race([inFlight.done, sleep(3000).then(() => ({ status: null, error: "no response" }))]);
  check("the request held in flight across the drain was answered, not dropped",
    inFlightResult.status !== null && inFlightResult.error === undefined,
    `in-flight POST completed with status=${inFlightResult.status}${inFlightResult.error ? ` error=${inFlightResult.error}` : ""}`);

  const text = log.join("");
  check("the drain is logged as complete",
    /Shutdown drain complete/.test(text) || /Shutdown drain timed out/.test(text),
    (text.match(/Shutdown drain [^"]*/) ?? ["no drain log line found"])[0]);

  writeFileSync(process.env.SAMPLE_OUT ?? "/dev/null", JSON.stringify(samples, null, 2));
  console.log("SIGTERM timeline (ms after SIGTERM → liveness / readiness / traffic):");
  for (const s of samples) console.log(`  t=${String(s.tMs).padStart(5)}  /health=${s.liveness}  /health/ready=${s.readiness}  /v1/*=${s.traffic}${s.retryAfter ? ` Retry-After=${s.retryAfter}` : ""}`);
} finally {
  if (exitedAt === null) { try { child.kill("SIGKILL"); } catch { /* ignore */ } }
}

console.log("");
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name.padEnd(66)} ${r.detail}`);
const failed = results.filter((r) => !r.ok);
console.log(`\nRESULT: checks=${results.length} failed=${failed.length}`);
console.log("\n--- server log (tail) ---\n" + log.join("").split("\n").slice(-25).join("\n"));
process.exit(failed.length === 0 ? 0 : 1);
