const BASE_URL = process.env.BASE_URL || "http://localhost:1000";
const EMAIL = process.env.LOAD_TEST_EMAIL || process.env.DEMO_OWNER_EMAIL || "demo@streamlineos.in";
const PASSWORD = process.env.LOAD_TEST_PASSWORD || process.env.DEMO_OWNER_PASSWORD || "Demo@2026!";

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function parseSetCookie(header: string | null): Map<string, string> {
  const jar = new Map<string, string>();
  if (!header) return jar;
  const parts = header.split(/,(?=\s*[^;]+=[^;]+)/);
  for (const part of parts) {
    const segment = part.trim().split(";")[0];
    const eq = segment.indexOf("=");
    if (eq > 0) {
      jar.set(segment.slice(0, eq), segment.slice(eq + 1));
    }
  }
  return jar;
}

function cookieHeader(jar: Map<string, string>): string {
  return Array.from(jar.entries())
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function preflightHealth(): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/health`, {
    headers: { "User-Agent": BROWSER_UA },
  });
  if (!res.ok) {
    console.error(`Server not reachable at ${BASE_URL}/api/health (HTTP ${res.status}). Start the dev server first.`);
    process.exit(1);
  }
}

async function main() {
  await preflightHealth();

  const jar = new Map<string, string>();

  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, {
    headers: { "User-Agent": BROWSER_UA },
  });

  if (!csrfRes.ok) {
    console.error(`CSRF failed: HTTP ${csrfRes.status}. Check middleware bot blocking or server logs.`);
    process.exit(1);
  }

  for (const [k, v] of parseSetCookie(csrfRes.headers.get("set-cookie"))) {
    jar.set(k, v);
  }

  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };
  const body = new URLSearchParams({
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    callbackUrl: "/post-signin",
    json: "true",
  });

  const loginRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "User-Agent": BROWSER_UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(jar),
    },
    body: body.toString(),
    redirect: "manual",
  });

  for (const [k, v] of parseSetCookie(loginRes.headers.get("set-cookie"))) {
    jar.set(k, v);
  }

  const session = Array.from(jar.entries()).find(([name]) => name.includes("session-token"));

  if (!session) {
    console.error(
      `Login failed (HTTP ${loginRes.status}). No session cookie. Check LOAD_TEST_EMAIL / LOAD_TEST_PASSWORD or run pnpm seed:demo.`,
    );
    process.exit(1);
  }

  process.stdout.write(`${session[0]}=${session[1]}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
