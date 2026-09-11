import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
const secret = process.env.NEXTAUTH_SECRET, internal = process.env.INTERNAL_API_SECRET;
const userId = "b0000001-0000-4000-8000-000000000002", orgId = "b0000001-0000-4000-8000-000000000001";
const proof = await new SignJWT({ sessionId: randomUUID() })
  .setProtectedHeader({ alg: "HS256" }).setSubject(userId)
  .setIssuer("streamlineos-web-session-proof").setAudience("streamlineos-api-exchange")
  .setJti(randomUUID()).setIssuedAt().setExpirationTime("30s")
  .sign(new TextEncoder().encode(secret));
const ex = await fetch("http://localhost:1500/auth/session-exchange", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-internal-secret": internal, "x-session-proof": proof },
  body: JSON.stringify({ orgId }),
});
const token = (await ex.json()).data.token;
const get = (signal) => fetch("http://localhost:1500/me/access", { headers: { Authorization: `Bearer ${token}` }, signal });
const status = async () => { const r = await get(undefined); return r.status; };
console.log("before aborts:", await status());
const n = Number(process.argv[2] ?? 60);
for (let i = 0; i < n; i++) {
  const c = new AbortController();
  const p = get(c.signal).catch(() => "aborted");
  setTimeout(() => c.abort(), 1);
  await p;
}
await new Promise((r) => setTimeout(r, 1500));
const after = [];
for (let i = 0; i < 3; i++) after.push(await status());
console.log(`after ${n} client-aborted requests:`, after.join(", "));
