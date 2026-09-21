import fs from "node:fs";
import { spawn } from "node:child_process";
const env = { ...process.env };
for (const line of fs.readFileSync(".env.scratch", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
delete env.NODE_OPTIONS;
spawn(process.execPath, ["./node_modules/next/dist/bin/next", "dev", "-p", "1001", "-H", "127.0.0.1"],
  { env, stdio: "inherit" });
