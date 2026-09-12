import { encode } from "next-auth/jwt";
import { readFileSync, writeFileSync } from "node:fs";
const claims = JSON.parse(readFileSync(process.argv[2], "utf8"));
const cookie = await encode({ token: claims, secret: process.env.NEXTAUTH_SECRET, salt: "authjs.session-token", maxAge: 86400 });
writeFileSync(process.argv[3], cookie);
console.log("cookie written for", claims.email);
