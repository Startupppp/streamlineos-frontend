import { decode } from "next-auth/jwt";
import { readFileSync } from "node:fs";
const t = await decode({ token: readFileSync(process.argv[2],"utf8").trim(), secret: process.env.NEXTAUTH_SECRET, salt: "authjs.session-token" });
console.log(JSON.stringify(t, null, 1));
