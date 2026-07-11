import { readFileSync } from "node:fs";
import { decode } from "next-auth/jwt";

const jar = readFileSync(process.argv[2], "utf8");
const chunks = [];
for (const line of jar.split("\n")) {
  const m = line.match(/\tauthjs\.session-token\.(\d+)\t(.+)/);
  if (m) chunks.push({ i: Number(m[1]), v: m[2].trim() });
}
chunks.sort((a, b) => a.i - b.i);
const token = chunks.map((c) => c.v).join("");
console.log("chunks:", chunks.length, "| chunk sizes:", chunks.map((c) => c.v.length).join(","), "| total JWE:", token.length);

const secret = process.env.NEXTAUTH_SECRET;
if (!secret) throw new Error("NEXTAUTH_SECRET not loaded");
try {
  const payload = await decode({ token, secret, salt: "authjs.session-token" });
  const json = JSON.stringify(payload);
  console.log("DECODE OK | payload bytes:", json.length);
  const sizes = Object.entries(payload)
    .map(([k, v]) => [k, JSON.stringify(v)?.length ?? 0])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  console.log("largest fields:", JSON.stringify(sizes));
  console.log("permissions count:", Array.isArray(payload.permissions) ? payload.permissions.length : "n/a");
} catch (e) {
  console.log("DECODE FAILED:", e.message);
}
