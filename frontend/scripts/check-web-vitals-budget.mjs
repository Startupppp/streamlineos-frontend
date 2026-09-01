import { readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const flag = (name, fallback) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const RESULTS_FILE = flag("results", ".browser-driver-results.json");

const BUDGETS = {
  mobile: {
    lcp_p75_ms: 2500,
    inp_p75_ms: 200,
    cls_p75: 0.1,
    fcp_p75_ms: 1800,
    ttfb_p95_ms: 600,
  },
  desktop: {
    lcp_p75_ms: 1500,
    inp_p75_ms: 200,
    cls_p75: 0.1,
    fcp_p75_ms: 1200,
    ttfb_p95_ms: 400,
  },
};

function checkBudgets(results) {
  const failures = [];
  const notMeasured = [];

  for (const profile of ["mobile", "desktop"]) {
    const budget = BUDGETS[profile];
    const data = results[profile] ?? results;

    const lcp = data.lcp?.p75_ms ?? null;
    if (lcp === null) {
      notMeasured.push(`${profile}.lcp.p75_ms`);
    } else if (lcp > budget.lcp_p75_ms) {
      failures.push(
        `BUDGET BREACH [${profile}] LCP p75 ${lcp.toFixed(0)}ms > budget ${budget.lcp_p75_ms}ms`,
      );
    }

    const inp = data.inp?.p75_ms ?? null;
    if (inp === null) {
      notMeasured.push(`${profile}.inp.p75_ms`);
    } else if (inp > budget.inp_p75_ms) {
      failures.push(
        `BUDGET BREACH [${profile}] INP p75 ${inp.toFixed(0)}ms > budget ${budget.inp_p75_ms}ms`,
      );
    }

    const cls = data.cls?.p75 ?? null;
    if (cls === null) {
      notMeasured.push(`${profile}.cls.p75`);
    } else if (cls > budget.cls_p75) {
      failures.push(
        `BUDGET BREACH [${profile}] CLS p75 ${cls.toFixed(3)} > budget ${budget.cls_p75}`,
      );
    }

    const fcp = data.fcp?.p75_ms ?? results.allNavigations?.fcpMs?.p75 ?? null;
    if (fcp === null) {
      notMeasured.push(`${profile}.fcp.p75_ms`);
    } else if (fcp > budget.fcp_p75_ms) {
      failures.push(
        `BUDGET BREACH [${profile}] FCP p75 ${fcp.toFixed(0)}ms > budget ${budget.fcp_p75_ms}ms`,
      );
    }

    const ttfb = data.ttfb?.p95_ms ?? results.allNavigations?.ttfbMs?.p95 ?? null;
    if (ttfb === null) {
      notMeasured.push(`${profile}.ttfb.p95_ms`);
    } else if (ttfb > budget.ttfb_p95_ms) {
      failures.push(
        `BUDGET BREACH [${profile}] TTFB p95 ${ttfb.toFixed(0)}ms > budget ${budget.ttfb_p95_ms}ms`,
      );
    }
  }

  return { failures, notMeasured };
}

function printBudgets() {
  console.log("Core Web Vitals budgets:");
  for (const [profile, b] of Object.entries(BUDGETS)) {
    console.log(`  [${profile}]`);
    console.log(`    LCP p75   ≤ ${b.lcp_p75_ms}ms`);
    console.log(`    INP p75   ≤ ${b.inp_p75_ms}ms`);
    console.log(`    CLS p75   ≤ ${b.cls_p75}`);
    console.log(`    FCP p75   ≤ ${b.fcp_p75_ms}ms`);
    console.log(`    TTFB p95  ≤ ${b.ttfb_p95_ms}ms`);
  }
}

async function selfTest() {
  const tmpDir = tmpdir();
  const file = join(tmpDir, `vitals-test-${randomBytes(6).toString("hex")}.json`);

  const breachingResults = {
    mobile: {
      lcp: { p75_ms: 3500 },
      inp: { p75_ms: 350 },
      cls: { p75: 0.25 },
      fcp: { p75_ms: 2200 },
      ttfb: { p95_ms: 900 },
    },
    desktop: {
      lcp: { p75_ms: 2000 },
      inp: { p75_ms: 150 },
      cls: { p75: 0.05 },
      fcp: { p75_ms: 1100 },
      ttfb: { p95_ms: 350 },
    },
  };

  writeFileSync(file, JSON.stringify(breachingResults, null, 2), "utf8");

  let failures, notMeasured;
  try {
    const content = readFileSync(file, "utf8");
    const parsed = JSON.parse(content);
    ({ failures, notMeasured } = checkBudgets(parsed));
  } finally {
    rmSync(file, { force: true });
  }

  console.log("--- self-test fixtures ---");
  printBudgets();
  console.log(`\nBreaching result breaches found: ${failures.length}  (expected 6 — mobile LCP,INP,CLS,FCP,TTFB + desktop LCP)`);
  for (const f of failures) console.log("  " + f);
  if (notMeasured.length > 0) console.log(`  Not measured: ${notMeasured.join(", ")}`);
  console.log("---");

  const expectedBreaches = 6;
  if (failures.length === expectedBreaches && notMeasured.length === 0) {
    console.log("SELF-TEST PASS: breach detection fires on all injected violations");
    process.exitCode = 0;
  } else {
    console.error(
      `SELF-TEST FAIL: expected ${expectedBreaches} failures, got ${failures.length}; not-measured: ${notMeasured.length}`,
    );
    process.exitCode = 1;
  }
}

function main() {
  let raw;
  try {
    raw = readFileSync(RESULTS_FILE, "utf8");
  } catch {
    console.error(
      `check-web-vitals-budget: results file not found: ${RESULTS_FILE}\n  Run the browser driver first or supply --results=<path>`,
    );
    process.exitCode = 1;
    return;
  }

  let results;
  try {
    results = JSON.parse(raw);
  } catch {
    console.error(`check-web-vitals-budget: ${RESULTS_FILE} is not valid JSON`);
    process.exitCode = 1;
    return;
  }

  printBudgets();

  const { failures, notMeasured } = checkBudgets(results);

  if (notMeasured.length > 0) {
    console.log(`\nNot measured (blocked — see WEB-VITALS-EVIDENCE.md):`);
    for (const m of notMeasured) console.log(`  ${m}`);
  }

  if (failures.length === 0) {
    console.log("\ncheck-web-vitals-budget: OK (all measured budgets met)");
    return;
  }

  for (const f of failures) console.error(f);
  console.error(`\ncheck-web-vitals-budget: ${failures.length} budget violation(s)`);
  process.exitCode = 1;
}

if (SELF_TEST) {
  selfTest().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
} else {
  main();
}
