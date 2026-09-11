/**
 * Reproduces, in isolation, exactly the middleware stack src/main.ts installs
 * ahead of routing, and prints every response header the backend actually emits.
 *
 * It is NOT a substitute for probing a deployed endpoint: TLS, HSTS at the edge,
 * WAF rules and CDN-injected headers are invisible here. It answers only the
 * question the repository can answer — which headers the application code sets.
 *
 * Run:  node <this file>        (cwd must be the backend repo root)
 */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { pathToFileURL } from "node:url";

// Resolve express/helmet/cors out of the BACKEND's own node_modules, so this
// probe exercises the exact versions main.ts loads. Pass the backend repo root
// as argv[2], or run with the backend as cwd.
const backendRoot = process.argv[2] ?? process.cwd();
const req = createRequire(pathToFileURL(backendRoot + "/package.json"));
const express = req("express");
const helmet = req("helmet");
// `cors` is a transitive dep of @nestjs/platform-express (which is what
// app.enableCors() drives), so resolve it through that package, as Nest does.
const platformExpress = req.resolve("@nestjs/platform-express/package.json");
const corsReq = createRequire(pathToFileURL(platformExpress));
const cors = corsReq("cors");
const readVersion = (r, name) => {
  try { return r(`${name}/package.json`).version; } catch {}
  try {
    const fs = r("node:fs");
    const path = r("node:path");
    let dir = path.dirname(r.resolve(name));
    for (let i = 0; i < 6; i++) {
      const candidate = path.join(dir, "package.json");
      if (fs.existsSync(candidate)) return JSON.parse(fs.readFileSync(candidate, "utf8")).version;
      dir = path.dirname(dir);
    }
  } catch {}
  return "unknown";
};
console.log(`# express ${readVersion(req, "express")}  helmet ${readVersion(req, "helmet")}  cors ${readVersion(corsReq, "cors")}`);
console.log(`# resolved from ${backendRoot}`);

const CORS_ORIGINS = ["https://app.example.test", "https://admin.example.test"];
const MAX_BODY_BYTES = 3_145_728; // resolveAdmissionConfig() default, admission.config.ts:62

const app = express();

// main.ts:90
app.use(helmet());
// main.ts:91-97
app.use((_req, res, next) => {
  res.setHeader(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), fullscreen=(self)",
  );
  next();
});
// main.ts:108-115  (production branch: a static allowlist, credentials on)
app.use(cors({ origin: CORS_ORIGINS, credentials: true }));
// main.ts:119
app.use(express.json({ limit: MAX_BODY_BYTES }));
// main.ts:122-125
app.use(express.urlencoded({ extended: true, limit: Math.floor(MAX_BODY_BYTES / 3) }));

app.all("/probe", (_req, res) => res.status(200).json({ ok: true }));

const server = createServer(app);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const show = async (label, url, init) => {
  const res = await fetch(url, init);
  console.log(`\n### ${label}`);
  console.log(`HTTP ${res.status}`);
  for (const [k, v] of [...res.headers].sort(([a], [b]) => a.localeCompare(b)))
    console.log(`${k}: ${v}`);
};

await show("GET /probe — no Origin (server-to-server)", `${base}/probe`);
await show("GET /probe — allowlisted Origin", `${base}/probe`, {
  headers: { Origin: CORS_ORIGINS[0] },
});
await show("GET /probe — hostile Origin (https://evil.example)", `${base}/probe`, {
  headers: { Origin: "https://evil.example" },
});
await show("OPTIONS /probe — preflight from hostile Origin", `${base}/probe`, {
  method: "OPTIONS",
  headers: {
    Origin: "https://evil.example",
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type",
  },
});
await show("OPTIONS /probe — preflight from allowlisted Origin", `${base}/probe`, {
  method: "OPTIONS",
  headers: {
    Origin: CORS_ORIGINS[0],
    "Access-Control-Request-Method": "POST",
    "Access-Control-Request-Headers": "content-type,authorization",
  },
});

// Body-limit behaviour, and whether the 413 still carries the CORS header.
const oversized = JSON.stringify({ blob: "x".repeat(MAX_BODY_BYTES + 1024) });
await show(`POST /probe — body ${oversized.length} bytes > ${MAX_BODY_BYTES} limit`, `${base}/probe`, {
  method: "POST",
  headers: { "content-type": "application/json", Origin: CORS_ORIGINS[0] },
  body: oversized,
});

server.close();
