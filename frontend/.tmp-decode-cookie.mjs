import { readFileSync } from "node:fs";
import { hkdf } from "@panva/hkdf";
import { jwtDecrypt } from "jose";
const S = process.argv[2];
const secret = readFileSync(S, "utf8").trim();
const token = readFileSync(process.argv[3], "utf8").trim();
const name = "authjs.session-token";
const key = await hkdf("sha256", secret, name, `Auth.js Generated Encryption Key (${name})`, 64);
try {
  const { payload } = await jwtDecrypt(token, key, { clockTolerance: 15 });
  console.log("OK", JSON.stringify(payload, null, 1));
} catch (e) { console.log("FAIL", e.message); }
