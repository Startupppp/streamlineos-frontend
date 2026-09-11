import { readFileSync } from "node:fs";
const SRC = "/Users/tarunchintakunta/Personal/streamline/streamlineos-backend/src/modules/ai/core/redaction.util.ts";
// Load the REAL source and strip only TS syntax so the actual regexes execute.
const ts = readFileSync(SRC, "utf8");
const js = ts.replace(/^export\s+/gm, "").replace(/\(text:\s*string\):\s*string/, "(text)");
const mod = await import("data:text/javascript," + encodeURIComponent(js + "\nexport { redactSensitiveData };"));
const { redactSensitiveData } = mod;
const probes = [
  ["PAN (India)", "ABCDE1234F"],
  ["Aadhaar (spaced)", "2345 6789 0123"],
  ["Aadhaar (solid)", "234567890123"],
  ["UAN", "101234567890"],
  ["IFSC", "HDFC0001234"],
  ["Indian mobile +91", "+91 98765 43210"],
  ["Indian mobile bare", "9876543210"],
  ["GSTIN", "27ABCDE1234F1Z5"],
  ["Passport (India)", "M1234567"],
  ["Person name", "Priya Ramaswamy"],
  ["Postal address", "12 MG Road, Indiranagar, Bengaluru 560038"],
  ["Date of birth", "1991-04-17"],
  ["Blood group", "O negative"],
  ["Salary", "gross 1450000 INR per annum"],
  ["--- CONTROL: email", "priya@example.com"],
  ["--- CONTROL: US SSN", "123-45-6789"],
  ["--- CONTROL: US phone", "415-555-0123"],
  ["--- CONTROL: card", "4111 1111 1111 1111"],
  ["--- CONTROL: bearer", "Bearer abcdef0123456789xyz"],
  ["--- CONTROL: api key", "sk-abcdefghijklmnop0123"],
];
let leaked = 0, total = 0;
console.log("AI redaction probe — executes the real redactSensitiveData from");
console.log(SRC);
console.log("Run: " + new Date().toISOString());
console.log("");
console.log("| Probe | Input | Output | Redacted? |");
console.log("|---|---|---|---|");
for (const [name, input] of probes) {
  const out = redactSensitiveData(input);
  const red = out !== input;
  total++; if (!red) leaked++;
  console.log(`| ${name} | ${input} | ${out} | ${red ? "YES" : "**NO — passes through**"} |`);
}
console.log("");
console.log(`RESULT: ${leaked} of ${total} probe strings reached the provider UNREDACTED.`);
