import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
const secret = process.env.NEXTAUTH_SECRET;
const internal = process.env.INTERNAL_API_SECRET;
const userId = "b0000001-0000-4000-8000-000000000002";
const orgId = "b0000001-0000-4000-8000-000000000001";
const proof = await new SignJWT({ sessionId: randomUUID() })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(userId)
  .setIssuer("streamlineos-web-session-proof")
  .setAudience("streamlineos-api-exchange")
  .setJti(randomUUID())
  .setIssuedAt()
  .setExpirationTime("30s")
  .sign(new TextEncoder().encode(secret));
const res = await fetch("http://localhost:1500/auth/session-exchange", {
  method: "POST",
  headers: { "Content-Type": "application/json", "x-internal-secret": internal, "x-session-proof": proof },
  body: JSON.stringify({ orgId }),
});
const text = await res.text();
console.log("status", res.status, text.slice(0, 300));
