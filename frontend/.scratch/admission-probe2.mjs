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
  method: "POST", headers: { "Content-Type": "application/json", "x-internal-secret": internal, "x-session-proof": proof },
  body: JSON.stringify({ orgId }),
});
const token = (await ex.json()).data.token;
const ok = async () => (await fetch("http://localhost:1500/me/access", { headers: { Authorization: `Bearer ${token}` } })).status;
console.log("before:", await ok());
const n = Number(process.argv[3] ?? 60);
const mode = process.argv[2];
for (let i = 0; i < n; i++) {
  if (mode === "unauth") await fetch("http://localhost:1500/me/access", { headers: { Authorization: "Bearer not.a.token" } }).catch(() => {});
  else if (mode === "notfound") await fetch("http://localhost:1500/me/does-not-exist", { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
}
await new Promise((r) => setTimeout(r, 800));
console.log(`after ${n} ${mode} requests:`, [await ok(), await ok(), await ok()].join(", "));
