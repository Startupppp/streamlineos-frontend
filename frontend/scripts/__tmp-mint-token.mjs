import { SignJWT } from "jose";
import { decode } from "next-auth/jwt";
import { readFileSync, writeFileSync } from "node:fs";

const API = "http://127.0.0.1:1500";
const secret = process.env.NEXTAUTH_SECRET;
const internal = process.env.INTERNAL_API_SECRET;

const cookiePath = process.argv[2];
const orgId = process.argv[3];
const outPath = process.argv[4];

const cookie = readFileSync(cookiePath, "utf8").trim();
const claims = await decode({ token: cookie, secret, salt: "authjs.session-token" });
if (!claims) {
  console.error(`REFUSED: cookie at ${cookiePath} did not decode`);
  process.exit(2);
}

const proof = await new SignJWT({ sessionId: claims.sessionId })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(claims.id)
  .setIssuer("streamlineos-web-session-proof")
  .setAudience("streamlineos-api-exchange")
  .setJti(crypto.randomUUID())
  .setIssuedAt()
  .setExpirationTime("60s")
  .sign(new TextEncoder().encode(secret));

const res = await fetch(`${API}/auth/session-exchange`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-internal-secret": internal,
    "x-session-proof": proof,
  },
  body: JSON.stringify({ orgId }),
});
const body = await res.json();
const token = body?.data?.token ?? body?.token;
if (!token) {
  console.error(`REFUSED: exchange ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  process.exit(1);
}
writeFileSync(outPath, JSON.stringify({ token, email: claims.email, userId: claims.id }));
console.log(`minted for ${claims.email} (${claims.id})`);
