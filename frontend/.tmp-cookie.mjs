// Ad-hoc: decode / mint an Auth.js v5 session cookie for the measurement harness.
import { readFileSync } from "node:fs";
import { hkdfSync } from "node:crypto";
import { jwtDecrypt, EncryptJWT } from "jose";

const NAME = "authjs.session-token";
function keyFor(secret) {
  return new Uint8Array(
    hkdfSync("sha256", secret, NAME, `Auth.js Generated Encryption Key (${NAME})`, 64),
  );
}
const [mode, secretPath, arg] = process.argv.slice(2);
const secret = readFileSync(secretPath, "utf8").trim();
const key = keyFor(secret);

if (mode === "decode") {
  const token = readFileSync(arg, "utf8").trim();
  try {
    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 15 });
    console.log("OK", JSON.stringify(payload));
  } catch (e) {
    console.log("FAIL", e.message);
  }
} else {
  const claims = JSON.parse(readFileSync(arg, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new EncryptJWT(claims)
    .setProtectedHeader({ alg: "dir", enc: "A256CBC-HS512" })
    .setIssuedAt(now)
    .setExpirationTime(now + 60 * 60 * 24)
    .encrypt(key);
  process.stdout.write(jwt);
}
