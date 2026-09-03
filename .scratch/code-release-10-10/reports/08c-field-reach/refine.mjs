#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
const S = "/private/tmp/claude-501/-Users-tarunchintakunta-Personal-streamline/20eca33e-bd07-41a6-ac7b-f606f1ada0e1/scratchpad/t08";
const cands = JSON.parse(readFileSync(`${S}/candidates.json`, "utf8"));
const roles = JSON.parse(readFileSync(`${S}/schema-roles.json`, "utf8"));

const bucket = (c) => {
  if (!c.schema) return "anonymous-literal";
  if (c.schema.startsWith("<prop:")) return "nested-inline-literal";
  const r = roles[c.schema] || [];
  if (r.some((x) => x.startsWith("schemaprop:"))) return "model-contract (AI structured output / tool args)";
  if (r.includes("validate:params")) return "route params (read via @Param string literal)";
  if (r.includes("validate:body")) return "request BODY";
  if (r.includes("validate:query")) return "request QUERY";
  return "no route binding found";
};

const tally = {};
for (const c of cands) {
  c.bucket = bucket(c);
  tally[c.bucket] = (tally[c.bucket] || 0) + 1;
}
console.log("1,832 in-scope, unprotected, zero-resolved-read fields split by CONSUMER ROLE of their schema:\n");
Object.entries(tally).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(5)}  ${k}`));

const routeBound = cands.filter((c) => c.bucket === "request BODY" || c.bucket === "request QUERY");
writeFileSync(`${S}/route-bound-candidates.json`, JSON.stringify(routeBound, null, 1));
console.log(`\nroute-bound (body|query) candidates written: ${routeBound.length}`);
const byMod = {};
for (const c of routeBound) {
  const m = c.file.replace(/^src\/modules\//, "").split("/")[0];
  byMod[m] = (byMod[m] || 0) + 1;
}
Object.entries(byMod).sort((a, b) => b[1] - a[1]).forEach(([m, n]) => console.log(`  ${String(n).padStart(4)}  ${m}`));
console.log(`\n  strict schemas among them: ${routeBound.filter((c) => c.strict).length}`);
writeFileSync(`${S}/candidates-bucketed.json`, JSON.stringify(cands, null, 1));
