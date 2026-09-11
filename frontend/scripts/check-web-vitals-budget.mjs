import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { corpusLine } from "./gate-corpus.mjs";
import { captureProvenance } from "./capture-provenance.mjs";

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = join(FRONTEND_ROOT, "contracts", "route-bundle-manifest.json");
const BUILD_ID_PATH = join(FRONTEND_ROOT, ".next", "BUILD_ID");

const argv = process.argv.slice(2);
const SELF_TEST = argv.includes("--self-test");
const ALLOW_UNMEASURED = argv.includes("--allow-unmeasured");
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

/**
 * A breach that nobody owns is a breach nobody fixes. `budgetExceptions` in
 * contracts/route-bundle-manifest.json names an owner and a concrete reason for
 * a metric this ticket could not bring inside budget.
 *
 * It is ANNOTATION ONLY. It never removes a failure, never changes the exit
 * code, and the self-test asserts exactly that — otherwise the first thing an
 * exceptions mechanism does is turn every red budget green.
 */
export function loadExceptions(manifestPath = MANIFEST_PATH) {
  if (!existsSync(manifestPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, "utf8"));
    return Array.isArray(parsed.budgetExceptions) ? parsed.budgetExceptions : [];
  } catch {
    return [];
  }
}

/**
 * An exception that names a route annotates only that route. Without that, a
 * `mobile`/`cls_p75` exception recorded for one CRM surface would attach its
 * owner to the next CLS breach on any other route — which is how an annotation
 * mechanism turns into a blanket excuse. An exception with no `route` still
 * matches profile+metric, which is what the two TTFB entries rely on.
 */
export function annotate(failures, exceptions) {
  return failures.map((failure) => {
    const hit = exceptions.find(
      (e) =>
        failure.profile === e.profile &&
        failure.metric === e.metric &&
        (e.route === undefined || e.route === failure.route),
    );
    return hit
      ? `${failure.message}\n      EXCEPTION recorded by ${String(hit.recordedBy ?? "unknown")} on ${String(hit.recordedOn ?? "unknown")} — owner: ${String(hit.owner ?? "unnamed")}\n      reason: ${String(hit.reason ?? "none given")}\n      (still counted as a failure)`
      : `${failure.message}\n      NO EXCEPTION RECORDED — this breach has no named owner`;
  });
}

/**
 * The five budgets in one table, read the same way per profile and per route.
 * `format` is how the number prints; `read` is where it lives on a metric block.
 */
const METRICS = [
  { metric: "lcp_p75_ms", label: "LCP p75", block: "lcp", field: "p75_ms", budget: "lcp_p75_ms", format: (v) => `${v.toFixed(0)}ms` },
  { metric: "inp_p75_ms", label: "INP p75", block: "inp", field: "p75_ms", budget: "inp_p75_ms", format: (v) => `${v.toFixed(0)}ms` },
  { metric: "cls_p75", label: "CLS p75", block: "cls", field: "p75", budget: "cls_p75", format: (v) => v.toFixed(3) },
  { metric: "fcp_p75_ms", label: "FCP p75", block: "fcp", field: "p75_ms", budget: "fcp_p75_ms", format: (v) => `${v.toFixed(0)}ms` },
  { metric: "ttfb_p95_ms", label: "TTFB p95", block: "ttfb", field: "p95_ms", budget: "ttfb_p95_ms", format: (v) => `${v.toFixed(0)}ms` },
];

/**
 * A profile-wide p75 cannot see one bad route.
 *
 * The 2026-09-03 capture passed every CLS budget at desktop p75 0.0065 while a
 * populated `/dashboard` measured 0.175-0.233 on every one of its eight samples
 * and `/calendar` 0.126 — twelve near-zero routes held the aggregate down, and
 * the percentile of 104 samples never reached the 16 bad ones. That is the same
 * vacuity as a budget whose query reads a different table than the route it
 * claims to govern: green for a reason unrelated to the thing being green.
 *
 * This compares the SAME five budgets against each route and profile on its
 * own, so one bad route fails by itself. A route the capture declares but does
 * not carry, and a capture with no per-route block at all, are failures rather
 * than silent passes — an unmeasured per-route budget is not a met one.
 */
export function checkPerRouteBudgets(results, budgets = BUDGETS) {
  const failures = [];
  const notMeasured = [];
  const interactionsTooFast = [];
  const worst = {};
  const byRoute = results?.byRoute;

  if (!byRoute || typeof byRoute !== "object" || Object.keys(byRoute).length === 0) {
    failures.push({
      profile: "all",
      metric: "per_route",
      message:
        "BUDGET BREACH [all] the capture carries no per-route block, so no per-route budget was measured." +
        "\n      A profile-wide p75 is diluted by every quiet route and cannot fail on one bad one.",
    });
    return { failures, notMeasured, interactionsTooFast, worst, routeCount: 0 };
  }

  const declared = Array.isArray(results?.authenticatedRoutes) ? results.authenticatedRoutes : [];
  for (const route of declared)
    if (!byRoute[route]) notMeasured.push(`${route} (declared measured, absent from byRoute)`);

  const routes = Object.keys(byRoute).sort();
  for (const route of routes) {
    for (const profile of ["mobile", "desktop"]) {
      const data = byRoute[route]?.[profile];
      if (!data || typeof data !== "object") {
        notMeasured.push(`${route} ${profile}`);
        continue;
      }
      for (const m of METRICS) {
        const value = data[m.block]?.[m.field] ?? null;
        if (value === null || !Number.isFinite(value)) {
          /*
           * INP is the one budget whose absence can be good news. It exists only
           * when an interaction was recorded, and the capture's observer records
           * at durationThreshold 16ms — so on a route the probe DID interact
           * with, no entry means nothing there took 16ms. On a route the probe
           * could not interact with at all, it means nobody measured. The
           * capture records which, and only the first is a pass.
           */
          if (m.metric === "inp_p75_ms" && (data.interactions?.performed ?? 0) > 0) {
            interactionsTooFast.push(`${route} ${profile} (${data.interactions.performed} interaction(s), none reached 16ms)`);
            continue;
          }
          notMeasured.push(`${route} ${profile}.${m.block}.${m.field}`);
          continue;
        }
        const key = `${profile}.${m.metric}`;
        if (!worst[key] || value > worst[key].value) worst[key] = { route, value, format: m.format };
        const budget = budgets[profile][m.budget];
        if (value > budget)
          failures.push({
            profile,
            metric: m.metric,
            route,
            message: `BUDGET BREACH [${profile}] ${route} ${m.label} ${m.format(value)} > budget ${m.format(budget)}`,
          });
      }
    }
  }

  return { failures, notMeasured, interactionsTooFast, worst, routeCount: routes.length };
}

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
      failures.push({
        profile,
        metric: "lcp_p75_ms",
        message: `BUDGET BREACH [${profile}] LCP p75 ${lcp.toFixed(0)}ms > budget ${budget.lcp_p75_ms}ms`,
      });
    }

    const inp = data.inp?.p75_ms ?? null;
    if (inp === null) {
      notMeasured.push(`${profile}.inp.p75_ms`);
    } else if (inp > budget.inp_p75_ms) {
      failures.push({
        profile,
        metric: "inp_p75_ms",
        message: `BUDGET BREACH [${profile}] INP p75 ${inp.toFixed(0)}ms > budget ${budget.inp_p75_ms}ms`,
      });
    }

    const cls = data.cls?.p75 ?? null;
    if (cls === null) {
      notMeasured.push(`${profile}.cls.p75`);
    } else if (cls > budget.cls_p75) {
      failures.push({
        profile,
        metric: "cls_p75",
        message: `BUDGET BREACH [${profile}] CLS p75 ${cls.toFixed(3)} > budget ${budget.cls_p75}`,
      });
    }

    const fcp = data.fcp?.p75_ms ?? results.allNavigations?.fcpMs?.p75 ?? null;
    if (fcp === null) {
      notMeasured.push(`${profile}.fcp.p75_ms`);
    } else if (fcp > budget.fcp_p75_ms) {
      failures.push({
        profile,
        metric: "fcp_p75_ms",
        message: `BUDGET BREACH [${profile}] FCP p75 ${fcp.toFixed(0)}ms > budget ${budget.fcp_p75_ms}ms`,
      });
    }

    const ttfb = data.ttfb?.p95_ms ?? results.allNavigations?.ttfbMs?.p95 ?? null;
    if (ttfb === null) {
      notMeasured.push(`${profile}.ttfb.p95_ms`);
    } else if (ttfb > budget.ttfb_p95_ms) {
      failures.push({
        profile,
        metric: "ttfb_p95_ms",
        message: `BUDGET BREACH [${profile}] TTFB p95 ${ttfb.toFixed(0)}ms > budget ${budget.ttfb_p95_ms}ms`,
      });
    }
  }

  return { failures, notMeasured };
}

export function percentileOf(values, p) {
  const sorted = [...values].filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

/**
 * INP measures how long an interaction takes to finish. It says nothing about
 * whether the user saw ANYTHING happen in the meantime, and a route transition
 * is where those two come apart: with sidebar prefetch off (ticket 27) and an
 * authenticated route answering in 400-1000 ms, a nav tap on the mobile profile
 * showed no DOM change at all for up to 1,739 ms and still recorded a good INP.
 *
 * The capture measures intent -> first DOM mutation per route and profile.
 * Nothing read it, so the 100 ms target in the manifest was narration. This
 * gates it: the p75 of the measured navigations on each profile must be inside
 * the target, and a profile with no measurement at all fails rather than
 * passing by absence. A single route/profile pair that genuinely has no in-app
 * link in view (a chromeless surface at 390px) is listed, not counted as a
 * breach — there is no navigation there to be slow.
 */
export function checkPerceivedResponsiveness(results) {
  const block = results.perceivedResponsiveness;
  const failures = [];
  const unmeasured = [];
  if (!block || typeof block !== "object")
    return {
      failures: [
        {
          profile: "all",
          metric: "intent_to_feedback_p75_ms",
          message:
            "BUDGET BREACH [all] perceived responsiveness was not captured at all — the capture carries no perceivedResponsiveness block",
        },
      ],
      unmeasured,
      summary: {},
    };

  const target = Number.isFinite(block.target_ms) ? block.target_ms : 100;
  const byProfile = { desktop: [], mobile: [] };

  for (const [route, profiles] of Object.entries(block.byRoute ?? {})) {
    for (const profile of ["desktop", "mobile"]) {
      const entry = profiles?.[profile];
      if (!entry) continue;
      if (entry.measured === true && Number.isFinite(entry.ms)) byProfile[profile].push(entry.ms);
      else unmeasured.push({ route, profile, reason: String(entry.reason ?? "not measured") });
    }
  }

  const summary = {};
  for (const profile of ["desktop", "mobile"]) {
    const samples = byProfile[profile];
    summary[profile] = {
      count: samples.length,
      p50_ms: percentileOf(samples, 50),
      p75_ms: percentileOf(samples, 75),
      max_ms: samples.length ? Math.max(...samples) : null,
    };
    if (samples.length === 0) {
      failures.push({
        profile,
        metric: "intent_to_feedback_p75_ms",
        message: `BUDGET BREACH [${profile}] intent-to-feedback was never measured on this profile — an unmeasured target is not a met target`,
      });
      continue;
    }
    const p75 = summary[profile].p75_ms;
    if (p75 > target)
      failures.push({
        profile,
        metric: "intent_to_feedback_p75_ms",
        message: `BUDGET BREACH [${profile}] intent-to-feedback p75 ${p75.toFixed(0)}ms > target ${target}ms (${samples.length} navigations)`,
      });
  }

  return { failures, unmeasured, summary, target };
}

/**
 * THE CAPTURE'S OWN VERDICTS, read by the gate that publishes its numbers.
 *
 * `measure-web-vitals.mjs` writes five self-assessment blocks beside the metrics and REFUSES its
 * own run on three of them ("REFUSED as evidence: N/M sample(s) did not render real page content").
 * This gate consulted none of them. Measured 2026-09-03 on the committed capture:
 * `contentAssertion.verdict` read "capture is NOT usable evidence" because 16 of 208 samples had
 * `errorBoundary: true` — every desktop and mobile sample of /crm/leads — and this gate printed
 * "OK (all budgets measured and met)", publishing that route's desktop LCP 391ms and CLS 0.001 as
 * budgets met. Those are an error page's vitals. An error page is fast.
 *
 * That is the "a 500 looks like no data" shape inverted into "a 500 looks like a FAST ROUTE", and
 * it is the one direction a budget gate can never tolerate: every failure mode that stops a page
 * rendering also makes it quicker.
 *
 * A block that is ABSENT is a refusal too. The producer always writes all five, so a capture
 * missing one was made by something that never asserted it — and an unasserted capture is no more
 * evidence than an unmeasured budget is a met one.
 */
const EVIDENCE_SIGNALS = [
  {
    block: "contentAssertion",
    field: "unusableSamples",
    what: "sample(s) did not render real page content (branded loader, error boundary, or under 10 words)",
    why: "an error page paints almost nothing, so its LCP, FCP and CLS flatter the product",
  },
  {
    block: "contentAssertion",
    field: "offRouteSamples",
    what: "sample(s) were measured on a page other than the route requested",
    why: "a bounce to /signin paints in milliseconds and would be recorded as the route's own LCP",
  },
  {
    block: "authorization",
    field: "unauthorizedSamples",
    what: "sample(s) rendered an unauthorized shell",
    why: "these budgets govern AUTHORIZED routes; a shell whose /me/access was refused paints almost nothing",
  },
  {
    block: "routeFailures",
    field: "count",
    what: "route/profile pair(s) produced no measurement at all",
    why: "they are absent from byRoute, so their budgets were never judged",
  },
  {
    block: "hydration",
    field: "mismatchesFound",
    what: "React hydration mismatch(es) were logged during the capture",
    why: "a mismatched tree is thrown away and re-rendered, so the paint that was timed is not the one the user gets",
  },
  {
    block: "settle",
    field: "cappedSamples",
    what: "sample(s) hit the settle cap before the DOM went quiet",
    why: "their CLS is a FLOOR — late-arriving data shifted after the measurement stopped, so a met budget may not be met",
  },
  {
    block: "hostContention",
    field: "contendedReadings",
    what: "host CPU reading(s) were above the ceiling, or could not be measured at all",
    why: "a 4x-throttled mobile profile on a busy host measures the host: the 2026-09-05 capture read /build/my-work mobile INP at 1,844 ms against 38 ms on unchanged code, at 100% CPU",
  },
];

/** The count a signal carries, whether it is recorded as an array of samples or as a number. */
function signalCount(value) {
  if (Array.isArray(value)) return value.length;
  if (Number.isInteger(value) && value >= 0) return value;
  return null;
}

/** Routes named by a sample list, so the refusal says WHICH route poisoned the capture. */
function routesNamed(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  for (const sample of value) {
    const url = sample?.url ?? sample?.requested ?? sample?.route;
    if (typeof url !== "string") continue;
    try {
      seen.add(new URL(url).pathname);
    } catch {
      seen.add(url);
    }
  }
  return [...seen].sort();
}

/**
 * Refuse a capture its own producer refused. Pure, so the self-test drives it without a file.
 * Returns the refusals; an empty array means all five blocks were present and green.
 */
export function checkCaptureEvidence(results) {
  const refusals = [];
  for (const signal of EVIDENCE_SIGNALS) {
    const block = results?.[signal.block];
    if (block === null || typeof block !== "object") {
      refusals.push({
        block: signal.block,
        field: signal.field,
        count: null,
        message:
          `CAPTURE REFUSED — the results file carries no \`${signal.block}\` block, so the ` +
          `"${signal.what}" assertion was never made. An unasserted capture is not a clean one.`,
      });
      continue;
    }
    const count = signalCount(block[signal.field]);
    if (count === null) {
      refusals.push({
        block: signal.block,
        field: signal.field,
        count: null,
        message:
          `CAPTURE REFUSED — \`${signal.block}.${signal.field}\` is ${JSON.stringify(block[signal.field] ?? null)}, ` +
          `neither a sample list nor a count, so "${signal.what}" could not be read.`,
      });
      continue;
    }
    if (count === 0) continue;
    const routes = routesNamed(block[signal.field]);
    refusals.push({
      block: signal.block,
      field: signal.field,
      count,
      routes,
      message:
        `CAPTURE REFUSED — ${signal.block}.${signal.field}: ${count} ${signal.what}` +
        (routes.length > 0 ? `\n      route(s): ${routes.join(", ")}` : "") +
        `\n      ${signal.why}` +
        (typeof block.verdict === "string" ? `\n      the capture's own verdict: "${block.verdict}"` : ""),
    });
  }
  return refusals;
}

/**
 * IS THIS CAPTURE ABOUT THE BUILD THAT IS CHECKED OUT?
 *
 * Neither frontend budget gate checked. Measured 2026-09-03: the committed capture recorded
 * buildId `HLbxAqjmWOjuFHatusviu` while `.next/BUILD_ID` on disk read `de4ncsCMZjpeJolrjAoix`, and
 * this gate reported every budget met. Re-measuring the route bundles against the head build gave
 * /build/my-work 362,709 firstLoadJs where the manifest recorded 550,153 — five of eighteen
 * reported breaches were against numbers the current build no longer produces. The error runs both
 * ways: a real doubling of a bundle goes unreported for as long as the capture sits unrefreshed.
 *
 * `.next/BUILD_ID` is the right subject test rather than a commit distance. Next generates it per
 * build (`generateBuildId` is not configured here), so equality means the `.next` directory on disk
 * IS the build that was measured — a stronger and less arbitrary claim than "fewer than N commits
 * have landed". The release SHA is read too, but only to NAME the intervening commits: this mirrors
 * `src/scripts/check-benchmark-manifest.mjs`, where subject drift fails and commit distance narrates.
 *
 * Exit policy is the project's: a definite mismatch is a FINDING (exit 1); an absent BUILD_ID means
 * the comparison could not be made at all, which is INCONCLUSIVE (exit 2), never a silent pass.
 *
 * The implementation lives in capture-provenance.mjs, shared with check-route-bundle-budget.mjs.
 */

/**
 * Which commits landed since the capture. Narrative only — `captureProvenance` owns the verdict.
 * Absent `releaseSha` is reported as unknown rather than assumed current.
 */
export function commitStaleness(results, cwd) {
  const recorded = typeof results?.releaseSha === "string" && results.releaseSha.length > 0 ? results.releaseSha : null;
  if (recorded === null) return { known: false, reason: "the capture records no release SHA" };
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8" }).trim();
    if (head === recorded) return { known: true, behind: 0, head, recorded, touchingSource: [] };
    const subjects = execFileSync("git", ["log", "--oneline", `${recorded}..HEAD`], { cwd, encoding: "utf8" })
      .trim().split("\n").filter(Boolean);
    const touchingSource = execFileSync(
      "git",
      ["log", "--oneline", `${recorded}..HEAD`, "--", "app", "components", "features", "lib", "hooks"],
      { cwd, encoding: "utf8" },
    ).trim().split("\n").filter(Boolean);
    return { known: true, behind: subjects.length, head, recorded, subjects, touchingSource };
  } catch (e) {
    return { known: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * How much of the declared corpus actually carried a judged measurement. `scanned` counts
 * route/profile pairs with a readable metric block; `total` counts every pair the capture either
 * declared or half-recorded, so a route that vanished from `byRoute` shows up as the gap it is.
 */
export function routeProfileCorpus(results) {
  const byRoute = results?.byRoute && typeof results.byRoute === "object" ? results.byRoute : {};
  const declared = Array.isArray(results?.authenticatedRoutes) ? results.authenticatedRoutes : [];
  const routes = new Set([...declared, ...Object.keys(byRoute)]);
  let scanned = 0;
  for (const route of routes)
    for (const profile of ["mobile", "desktop"]) {
      const data = byRoute[route]?.[profile];
      if (data && typeof data === "object" && METRICS.some((m) => Number.isFinite(data[m.block]?.[m.field])))
        scanned++;
    }
  return { scanned, total: routes.size * 2 };
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
  for (const f of failures) console.log("  " + f.message);
  if (notMeasured.length > 0) console.log(`  Not measured: ${notMeasured.join(", ")}`);
  console.log("---");

  const unmeasuredFixture = {
    mobile: {
      lcp: { p75_ms: 900 },
      inp: { p75_ms: null },
      cls: { p75: 0 },
      fcp: { p75_ms: 900 },
      ttfb: { p95_ms: 60 },
    },
    desktop: {
      lcp: { p75_ms: 900 },
      inp: { p75_ms: 90 },
      cls: { p75: 0 },
      fcp: { p75_ms: 900 },
      ttfb: { p95_ms: 60 },
    },
  };
  const unmeasured = checkBudgets(unmeasuredFixture);

  const annotated = annotate(failures, [
    {
      profile: "mobile",
      metric: "ttfb_p95_ms",
      owner: "somebody",
      reason: "because",
      recordedBy: "self-test",
      recordedOn: "2026-09-02",
    },
  ]);
  const routeScoped = [
    { profile: "mobile", metric: "cls_p75", route: "/crm/inbox", owner: "crm", reason: "out of scope", recordedBy: "self-test", recordedOn: "2026-09-03" },
  ];
  const routeScopedAnnotation = annotate(
    [
      { profile: "mobile", metric: "cls_p75", route: "/crm/inbox", message: "BREACH a" },
      { profile: "mobile", metric: "cls_p75", route: "/dashboard", message: "BREACH b" },
    ],
    routeScoped,
  );
  const routeScopedHitsItsOwnRoute = routeScopedAnnotation[0].includes("owner: crm");
  const routeScopedSparesTheOther = routeScopedAnnotation[1].includes("NO EXCEPTION RECORDED");
  const routeScopedKeepsBoth = routeScopedAnnotation.length === 2;
  const annotationKeepsEveryFailure = annotated.length === failures.length;
  const annotationNamesTheOwner = annotated.some((line) => line.includes("owner: somebody"));
  const unownedBreachIsMarked = annotated.some((line) => line.includes("NO EXCEPTION RECORDED"));
  console.log(
    `Exception annotation: ${annotated.length} line(s) for ${failures.length} failure(s) — ` +
      `an exception must never remove one. A route-scoped exception annotated its own route ` +
      `(${routeScopedHitsItsOwnRoute}) and left the other route unowned (${routeScopedSparesTheOther}).`,
  );

  const perceivedBreaching = checkPerceivedResponsiveness({
    perceivedResponsiveness: {
      target_ms: 100,
      byRoute: {
        "/dashboard": { desktop: { measured: true, ms: 30 }, mobile: { measured: true, ms: 1421 } },
        "/inbox": { desktop: { measured: true, ms: 14 }, mobile: { measured: true, ms: 1739 } },
        "/chat": { desktop: { measured: true, ms: 22 }, mobile: { measured: false, reason: "no in-app link in view" } },
      },
    },
  });
  const perceivedGood = checkPerceivedResponsiveness({
    perceivedResponsiveness: {
      target_ms: 100,
      byRoute: {
        "/dashboard": { desktop: { measured: true, ms: 12 }, mobile: { measured: true, ms: 40 } },
        "/inbox": { desktop: { measured: true, ms: 14 }, mobile: { measured: true, ms: 55 } },
      },
    },
  });
  const perceivedAbsent = checkPerceivedResponsiveness({});
  const perceivedUnmeasuredProfile = checkPerceivedResponsiveness({
    perceivedResponsiveness: {
      target_ms: 100,
      byRoute: { "/dashboard": { desktop: { measured: true, ms: 12 }, mobile: { measured: false, reason: "no link" } } },
    },
  });

  const perceivedOk =
    perceivedBreaching.failures.length === 1 &&
    perceivedBreaching.failures[0].profile === "mobile" &&
    perceivedBreaching.unmeasured.length === 1 &&
    perceivedGood.failures.length === 0 &&
    perceivedAbsent.failures.length === 1 &&
    perceivedUnmeasuredProfile.failures.length === 1 &&
    perceivedUnmeasuredProfile.failures[0].profile === "mobile";

  console.log(
    `Perceived responsiveness: breaching fixture -> ${perceivedBreaching.failures.length} failure(s) ` +
      `(expected 1, mobile), inside-target fixture -> ${perceivedGood.failures.length} (expected 0), ` +
      `absent block -> ${perceivedAbsent.failures.length} (expected 1), ` +
      `profile with no measurement -> ${perceivedUnmeasuredProfile.failures.length} (expected 1)`,
  );
  for (const f of perceivedBreaching.failures) console.log("  " + f.message);

  /*
   * The per-route bite proof, on the shape that actually shipped.
   *
   * `diluted` carries the 2026-09-03 capture's own profile aggregates — every
   * one inside budget — over routes where /dashboard measured 0.1798 and
   * /calendar 0.1258. `checkBudgets` must call that green (it did, for a
   * fortnight) and `checkPerRouteBudgets` must call it red.
   */
  const routeVitals = ({ lcp, inp, cls, fcp, ttfb }) => ({
    lcp: { p75_ms: lcp },
    inp: { p75_ms: inp },
    cls: { p75: cls },
    fcp: { p75_ms: fcp },
    ttfb: { p95_ms: ttfb },
  });
  const quietDesktop = routeVitals({ lcp: 360, inp: 48, cls: 0.0008, fcp: 99, ttfb: 45 });
  const quietMobile = routeVitals({ lcp: 660, inp: 120, cls: 0.0003, fcp: 250, ttfb: 30 });
  const dilutedAggregates = {
    desktop: { lcp: { p75_ms: 384 }, inp: { p75_ms: 48 }, cls: { p75: 0.0065 }, fcp: { p75_ms: 104 }, ttfb: { p95_ms: 173 } },
    mobile: { lcp: { p75_ms: 565 }, inp: { p75_ms: 120 }, cls: { p75: 0.0024 }, fcp: { p75_ms: 273 }, ttfb: { p95_ms: 39 } },
  };
  const diluted = {
    ...dilutedAggregates,
    authenticatedRoutes: ["/inbox", "/mail", "/settings", "/dashboard", "/calendar"],
    byRoute: {
      "/inbox": { desktop: quietDesktop, mobile: quietMobile },
      "/mail": { desktop: quietDesktop, mobile: quietMobile },
      "/settings": { desktop: quietDesktop, mobile: quietMobile },
      "/dashboard": { desktop: routeVitals({ lcp: 360, inp: 56, cls: 0.1798, fcp: 99, ttfb: 45 }), mobile: quietMobile },
      "/calendar": { desktop: routeVitals({ lcp: 740, inp: 40, cls: 0.1258, fcp: 72, ttfb: 30 }), mobile: quietMobile },
    },
  };
  const dilutedAggregate = checkBudgets(diluted);
  const dilutedPerRoute = checkPerRouteBudgets(diluted);

  const perRouteClean = checkPerRouteBudgets({
    ...dilutedAggregates,
    authenticatedRoutes: ["/inbox", "/dashboard"],
    byRoute: {
      "/inbox": { desktop: quietDesktop, mobile: quietMobile },
      "/dashboard": { desktop: quietDesktop, mobile: quietMobile },
    },
  });
  const perRouteAbsent = checkPerRouteBudgets({ ...dilutedAggregates, authenticatedRoutes: ["/inbox"] });
  const perRouteMissingRoute = checkPerRouteBudgets({
    ...dilutedAggregates,
    authenticatedRoutes: ["/inbox", "/dashboard"],
    byRoute: { "/inbox": { desktop: quietDesktop, mobile: quietMobile } },
  });
  const perRouteMissingMetric = checkPerRouteBudgets({
    ...dilutedAggregates,
    authenticatedRoutes: ["/inbox"],
    byRoute: { "/inbox": { desktop: { ...quietDesktop, cls: {} }, mobile: quietMobile } },
  });
  const perRouteFastInteraction = checkPerRouteBudgets({
    ...dilutedAggregates,
    authenticatedRoutes: ["/chat"],
    byRoute: {
      "/chat": {
        desktop: quietDesktop,
        mobile: { ...quietMobile, inp: { p75_ms: null }, interactions: { samples: 8, performed: 8 } },
      },
    },
  });
  const perRouteNoInteraction = checkPerRouteBudgets({
    ...dilutedAggregates,
    authenticatedRoutes: ["/chat"],
    byRoute: {
      "/chat": {
        desktop: quietDesktop,
        mobile: { ...quietMobile, inp: { p75_ms: null }, interactions: { samples: 8, performed: 0 } },
      },
    },
  });

  const perRouteOk =
    dilutedAggregate.failures.length === 0 &&
    dilutedPerRoute.failures.length === 2 &&
    dilutedPerRoute.failures.every((f) => f.metric === "cls_p75" && f.profile === "desktop") &&
    dilutedPerRoute.failures.some((f) => f.route === "/dashboard") &&
    dilutedPerRoute.failures.some((f) => f.route === "/calendar") &&
    dilutedPerRoute.notMeasured.length === 0 &&
    perRouteClean.failures.length === 0 &&
    perRouteClean.notMeasured.length === 0 &&
    perRouteAbsent.failures.length === 1 &&
    perRouteMissingRoute.failures.length === 0 &&
    perRouteMissingRoute.notMeasured.length === 1 &&
    perRouteMissingMetric.failures.length === 0 &&
    perRouteMissingMetric.notMeasured.length === 1 &&
    perRouteFastInteraction.notMeasured.length === 0 &&
    perRouteFastInteraction.interactionsTooFast.length === 1 &&
    perRouteNoInteraction.notMeasured.length === 1 &&
    perRouteNoInteraction.interactionsTooFast.length === 0;

  console.log(
    `\nPer-route budgets: the diluted capture -> profile-wide check ${dilutedAggregate.failures.length} failure(s) ` +
      `(expected 0 — this is the vacuity), per-route check ${dilutedPerRoute.failures.length} (expected 2). ` +
      `Clean capture -> ${perRouteClean.failures.length} (expected 0). No byRoute block -> ` +
      `${perRouteAbsent.failures.length} (expected 1). Declared route absent -> ` +
      `${perRouteMissingRoute.notMeasured.length} not-measured (expected 1). Missing metric -> ` +
      `${perRouteMissingMetric.notMeasured.length} (expected 1). Null INP after ` +
      `${perRouteFastInteraction.interactionsTooFast.length} recorded interaction(s) -> ` +
      `${perRouteFastInteraction.notMeasured.length} not-measured (expected 0); null INP with no interaction -> ` +
      `${perRouteNoInteraction.notMeasured.length} (expected 1).`,
  );
  for (const f of dilutedPerRoute.failures) console.log("  " + f.message);

  const expectedBreaches = 6;
  const breachesOk =
    failures.length === expectedBreaches &&
    notMeasured.length === 0 &&
    annotationKeepsEveryFailure &&
    annotationNamesTheOwner &&
    unownedBreachIsMarked &&
    routeScopedHitsItsOwnRoute &&
    routeScopedSparesTheOther &&
    routeScopedKeepsBoth;
  const unmeasuredOk =
    unmeasured.failures.length === 0 && unmeasured.notMeasured.length === 1;

  console.log(
    `Unmeasured fixture (mobile INP null): ${unmeasured.notMeasured.length} not-measured ` +
      `(expected 1 — this is a FAIL without --allow-unmeasured)`,
  );

  /*
   * EVIDENCE REFUSAL (2026-09-03) — the shape that actually shipped.
   *
   * `greenCapture` is the five blocks as the producer writes them on a clean run. `poisoned` is
   * the committed 2026-09-03 capture in miniature: excellent numbers on /crm/leads, and a
   * contentAssertion saying every one of that route's samples rendered an error boundary. The gate
   * called that "OK (all budgets measured and met)". It must now refuse it, and it must name the
   * route, or the refusal is not actionable.
   */
  const greenBlocks = {
    contentAssertion: { samplesMeasured: 8, offRouteSamples: [], unusableSamples: [], verdict: "every measured sample rendered real page content" },
    authorization: { samplesMeasured: 8, unauthorizedSamples: [], verdict: "every measured sample rendered an authorized shell" },
    routeFailures: { count: 0, failures: [], verdict: "every requested route/profile pair completed" },
    hydration: { navigationsInspected: 8, mismatchesFound: 0, findings: [], verdict: "no React hydration mismatch was logged" },
    settle: { samplesMeasured: 8, cappedSamples: 0, capped: [], verdict: "every sample was taken after the DOM went quiet" },
    hostContention: {
      ceilingPercent: 50,
      cpuCount: 8,
      busyPercentBeforeLaunch: 6.2,
      busyPercentAfterCapture: 9.1,
      contendedReadings: [],
      verdict: "the host was quiet enough for these timings to be the application's",
    },
  };
  const greenRefusals = checkCaptureEvidence({ ...greenBlocks, buildId: "b1" });

  const poisoned = {
    ...greenBlocks,
    contentAssertion: {
      ...greenBlocks.contentAssertion,
      unusableSamples: [
        { index: 96, url: "http://localhost:1600/crm/leads", words: 85, brandedLoader: false, errorBoundary: true },
        { index: 97, url: "http://localhost:1600/crm/leads", words: 85, brandedLoader: false, errorBoundary: true },
      ],
      verdict: "capture is NOT usable evidence",
    },
  };
  const poisonedRefusals = checkCaptureEvidence(poisoned);

  const offRoute = { ...greenBlocks, contentAssertion: { ...greenBlocks.contentAssertion, offRouteSamples: [{ index: 3, requested: "/dashboard", url: "http://localhost:1600/signin" }] } };
  const unauthorized = { ...greenBlocks, authorization: { ...greenBlocks.authorization, unauthorizedSamples: [{ index: 1, url: "http://localhost:1600/mail", navLinks: 0 }] } };
  const routeFailed = { ...greenBlocks, routeFailures: { count: 2, failures: [], verdict: "these pairs produced no measurement" } };
  const hydrationBad = { ...greenBlocks, hydration: { ...greenBlocks.hydration, mismatchesFound: 3 } };
  const settleCapped = { ...greenBlocks, settle: { ...greenBlocks.settle, cappedSamples: 4 } };
  const hostBusy = {
    ...greenBlocks,
    hostContention: {
      ...greenBlocks.hostContention,
      busyPercentBeforeLaunch: 100,
      contendedReadings: [{ when: "beforeLaunch", busyPercent: 100 }],
      verdict: "capture is NOT evidence for timing budgets",
    },
  };
  // os.loadavg() on Windows returns 0 forever; an UNMEASURED host must refuse exactly as a busy one does.
  const hostUnmeasured = {
    ...greenBlocks,
    hostContention: {
      ...greenBlocks.hostContention,
      busyPercentBeforeLaunch: null,
      contendedReadings: [{ when: "beforeLaunch", busyPercent: null }],
    },
  };
  const blockAbsent = { ...greenBlocks };
  delete blockAbsent.contentAssertion;
  const blockGarbled = { ...greenBlocks, settle: { ...greenBlocks.settle, cappedSamples: "some" } };

  const evidenceOk =
    greenRefusals.length === 0 &&
    poisonedRefusals.length === 1 &&
    poisonedRefusals[0].count === 2 &&
    poisonedRefusals[0].routes.join(",") === "/crm/leads" &&
    poisonedRefusals[0].message.includes("capture is NOT usable evidence") &&
    checkCaptureEvidence(offRoute).length === 1 &&
    checkCaptureEvidence(offRoute)[0].routes.includes("/signin") &&
    checkCaptureEvidence(unauthorized).length === 1 &&
    checkCaptureEvidence(routeFailed).length === 1 &&
    checkCaptureEvidence(routeFailed)[0].count === 2 &&
    checkCaptureEvidence(hydrationBad).length === 1 &&
    checkCaptureEvidence(settleCapped).length === 1 &&
    checkCaptureEvidence(hostBusy).length === 1 &&
    checkCaptureEvidence(hostBusy)[0].count === 1 &&
    checkCaptureEvidence(hostUnmeasured).length === 1 &&
    // Two signals live on contentAssertion, so an absent block must refuse for BOTH, not once.
    checkCaptureEvidence(blockAbsent).length === 2 &&
    checkCaptureEvidence(blockAbsent).every((r) => r.message.includes("no `contentAssertion` block")) &&
    checkCaptureEvidence(blockGarbled).length === 1 &&
    checkCaptureEvidence(blockGarbled)[0].count === null;

  console.log(
    `Capture evidence: clean capture -> ${greenRefusals.length} refusal(s) (expected 0); the shipped ` +
      `error-boundary capture -> ${poisonedRefusals.length} (expected 1, naming ` +
      `${poisonedRefusals[0]?.routes?.join(",") ?? "no route"}); off-route, unauthorized, route-failure, ` +
      `hydration, settle-cap, busy-host and unmeasured-host fixtures each refuse; an ABSENT block refuses ` +
      `${checkCaptureEvidence(blockAbsent).length} time(s) (expected 2 — two signals live on it)`,
  );

  /*
   * PROVENANCE. The failing subject test is build-id equality; absence of a build on disk is
   * INCONCLUSIVE rather than a pass, and a capture that does not say which build it measured is a
   * finding in its own right.
   */
  const provCurrent = captureProvenance({ buildId: "abc" }, { buildIdOnDisk: "abc" });
  const provStale = captureProvenance({ buildId: "HLbxAqjmWOjuFHatusviu" }, { buildIdOnDisk: "de4ncsCMZjpeJolrjAoix" });
  const provNoDisk = captureProvenance({ buildId: "abc" }, { buildIdOnDisk: "" });
  const provUnrecorded = captureProvenance({}, { buildIdOnDisk: "abc" });

  const provenanceOk =
    provCurrent.status === "current" &&
    provCurrent.message === null &&
    provStale.status === "stale" &&
    provStale.message.includes("HLbxAqjmWOjuFHatusviu") &&
    provStale.message.includes("de4ncsCMZjpeJolrjAoix") &&
    provNoDisk.status === "no-build-on-disk" &&
    provUnrecorded.status === "unrecorded";

  console.log(
    `Provenance: matching build ids -> ${provCurrent.status}; the shipped mismatch -> ${provStale.status}; ` +
      `no .next/BUILD_ID -> ${provNoDisk.status} (INCONCLUSIVE, not a pass); capture with no buildId -> ${provUnrecorded.status}`,
  );

  /*
   * The corpus denominator. A capture that declares thirteen routes and carries two must not be
   * able to report "all budgets met" without the gap being visible.
   */
  const corpusFull = routeProfileCorpus({
    authenticatedRoutes: ["/a", "/b"],
    byRoute: { "/a": { desktop: { lcp: { p75_ms: 1 } }, mobile: { lcp: { p75_ms: 1 } } }, "/b": { desktop: { lcp: { p75_ms: 1 } }, mobile: { lcp: { p75_ms: 1 } } } },
  });
  const corpusPartial = routeProfileCorpus({
    authenticatedRoutes: ["/a", "/b", "/c"],
    byRoute: { "/a": { desktop: { lcp: { p75_ms: 1 } } } },
  });
  const corpusOk =
    corpusFull.scanned === 4 && corpusFull.total === 4 &&
    corpusPartial.scanned === 1 && corpusPartial.total === 6 &&
    corpusLine({ gate: "g", scanned: corpusPartial.scanned, total: corpusPartial.total, unit: "route/profile pair" }).line.includes("5 NOT scanned");

  console.log(
    `Route/profile corpus: fully measured -> ${corpusFull.scanned}/${corpusFull.total}; three routes ` +
      `declared with one profile recorded -> ${corpusPartial.scanned}/${corpusPartial.total} (the gap is the finding)`,
  );

  if (breachesOk && unmeasuredOk && perceivedOk && perRouteOk && evidenceOk && provenanceOk && corpusOk) {
    console.log(
    "SELF-TEST PASS: breach detection fires, an unmeasured budget is not reported as met, a recorded " +
      "exception annotates a failure without removing it, the perceived-responsiveness target is " +
      "enforced rather than narrated, a single bad route fails on its own even when the " +
      "profile-wide p75 that twelve quiet routes dilute is inside every budget, a capture its own " +
      "producer refused is refused here too rather than published as a fast route, a capture " +
      "measuring a build this checkout no longer holds is not reported as current, and the " +
      "route/profile denominator is printed so a partial capture cannot read as a full one",
  );
    process.exitCode = 0;
  } else {
    if (!breachesOk)
      console.error(
        `SELF-TEST FAIL: expected ${expectedBreaches} failures, got ${failures.length}; not-measured: ${notMeasured.length}; ` +
          `annotation kept every failure: ${annotationKeepsEveryFailure}; named the owner: ${annotationNamesTheOwner}; ` +
          `marked the unowned breach: ${unownedBreachIsMarked}`,
      );
    if (!unmeasuredOk)
      console.error(
        `SELF-TEST FAIL: unmeasured fixture expected 0 failures / 1 not-measured, got ` +
          `${unmeasured.failures.length} / ${unmeasured.notMeasured.length}`,
      );
    if (!perceivedOk)
      console.error(
        `SELF-TEST FAIL: perceived-responsiveness fixtures — breaching ${perceivedBreaching.failures.length}/1, ` +
          `inside-target ${perceivedGood.failures.length}/0, absent ${perceivedAbsent.failures.length}/1, ` +
          `unmeasured-profile ${perceivedUnmeasuredProfile.failures.length}/1`,
      );
    if (!perRouteOk)
      console.error(
        `SELF-TEST FAIL: per-route fixtures — diluted capture profile-wide ${dilutedAggregate.failures.length}/0 ` +
          `and per-route ${dilutedPerRoute.failures.length}/2 (${dilutedPerRoute.failures.map((f) => `${f.profile} ${f.route} ${f.metric}`).join(", ") || "none"}), ` +
          `clean ${perRouteClean.failures.length}/0 + ${perRouteClean.notMeasured.length}/0 not-measured, ` +
          `absent block ${perRouteAbsent.failures.length}/1, missing route ${perRouteMissingRoute.notMeasured.length}/1, ` +
          `missing metric ${perRouteMissingMetric.notMeasured.length}/1`,
      );
    if (!evidenceOk)
      console.error(
        `SELF-TEST FAIL: capture-evidence fixtures — clean ${greenRefusals.length}/0, error-boundary ` +
          `${poisonedRefusals.length}/1 (routes ${poisonedRefusals[0]?.routes?.join(",") ?? "none"}, expected /crm/leads), ` +
          `off-route ${checkCaptureEvidence(offRoute).length}/1, unauthorized ${checkCaptureEvidence(unauthorized).length}/1, ` +
          `route-failures ${checkCaptureEvidence(routeFailed).length}/1, hydration ${checkCaptureEvidence(hydrationBad).length}/1, ` +
          `settle-cap ${checkCaptureEvidence(settleCapped).length}/1, absent block ${checkCaptureEvidence(blockAbsent).length}/2, ` +
          `garbled field ${checkCaptureEvidence(blockGarbled).length}/1`,
      );
    if (!provenanceOk)
      console.error(
        `SELF-TEST FAIL: provenance fixtures — current ${provCurrent.status}/current, stale ${provStale.status}/stale, ` +
          `no build on disk ${provNoDisk.status}/no-build-on-disk, unrecorded ${provUnrecorded.status}/unrecorded`,
      );
    if (!corpusOk)
      console.error(
        `SELF-TEST FAIL: route/profile corpus — full ${corpusFull.scanned}/${corpusFull.total} (expected 4/4), ` +
          `partial ${corpusPartial.scanned}/${corpusPartial.total} (expected 1/6)`,
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

  if (results.serverMode !== "production") {
    console.error(
      `\ncheck-web-vitals-budget: FAIL — serverMode is ${JSON.stringify(results.serverMode ?? null)}, expected "production".` +
        `\n  A next dev server compiles on demand and skips production optimisation, so its` +
        `\n  LCP, FCP and TTFB are not the app's. frontend/CLAUDE.md section 1 requires` +
        `\n  next build && next start for this. Re-measure against a production server and` +
        `\n  record serverMode: "production".`,
    );
    process.exitCode = 1;
    return;
  }

  /*
   * Evidence before budgets. Judging a number against a budget is only meaningful once the number
   * is known to describe the product: the producer refuses its own run on three of these signals,
   * and this gate used to publish the refused numbers as a pass.
   */
  const refusals = checkCaptureEvidence(results);
  const provenance = captureProvenance(results, {
    buildIdOnDisk: existsSync(BUILD_ID_PATH) ? readFileSync(BUILD_ID_PATH, "utf8").trim() : "",
  });

  const staleness = commitStaleness(results, FRONTEND_ROOT);
  if (!staleness.known) console.log(`\nCommits since capture: UNKNOWN — ${staleness.reason}`);
  else if (staleness.behind === 0) console.log(`\nCommits since capture: none — measured at HEAD (${staleness.head.slice(0, 8)})`);
  else {
    console.log(
      `\nCommits since capture: ${staleness.behind} (${staleness.recorded.slice(0, 8)} -> ${staleness.head.slice(0, 8)}), ` +
        `${staleness.touchingSource.length} of them touching app/components/features/lib/hooks`,
    );
    for (const line of staleness.touchingSource.slice(0, 8)) console.log(`    since: ${line}`);
    if (staleness.touchingSource.length > 8) console.log(`    … and ${staleness.touchingSource.length - 8} more`);
  }

  if (provenance.message) console.error(`\ncheck-web-vitals-budget: ${provenance.message}`);
  else console.log(`\nProvenance: the capture measured build ${provenance.recorded}, which is the build on disk.`);

  if (refusals.length > 0) {
    console.error("");
    for (const refusal of refusals) console.error(`  ${refusal.message}`);
  }

  if (refusals.length > 0 || provenance.status === "stale" || provenance.status === "unrecorded") {
    console.error(
      `\ncheck-web-vitals-budget: FAIL — this capture is not usable evidence ` +
        `(${refusals.length} refusal(s), provenance ${provenance.status}).` +
        `\n  No budget verdict is reported from it. Fix the capture and re-run measure:web-vitals;` +
        `\n  the producer refuses these runs itself, and this gate now refuses to publish them.`,
    );
    process.exitCode = 1;
    return;
  }

  if (provenance.status === "no-build-on-disk") {
    // The rule could not be checked, which is exit 2 in this project (see scripts/run-gate.mjs).
    process.exitCode = 2;
    return;
  }

  const measuredRoutes = Array.isArray(results.authenticatedRoutes) ? results.authenticatedRoutes : [];
  if (measuredRoutes.length === 0) {
    console.error(
      `\ncheck-web-vitals-budget: FAIL — no authenticated route was measured.` +
        `\n  targetUrl was ${String(results.targetUrl ?? "unknown")}.` +
        `\n  These budgets govern authenticated in-scope routes; landing-page figures` +
        `\n  do not satisfy them. Run browser-driver-auth.mjs and record the routes it covered.`,
    );
    process.exitCode = 1;
    return;
  }
  console.log(`\nMeasured authenticated routes: ${measuredRoutes.join(", ")}`);

  const corpus = routeProfileCorpus(results);
  const corpusReport = corpusLine({
    gate: "check-web-vitals-budget",
    scanned: corpus.scanned,
    total: corpus.total,
    unit: "route/profile pair",
  });
  if (corpusReport.vacuous) {
    console.error(`INCONCLUSIVE — check-web-vitals-budget: ${corpusReport.reason}`);
    process.exitCode = 2;
    return;
  }
  console.log(corpusReport.line);

  const { failures: vitalsFailures, notMeasured } = checkBudgets(results);
  const perRoute = checkPerRouteBudgets(results);
  const perceived = checkPerceivedResponsiveness(results);
  const failures = [...vitalsFailures, ...perRoute.failures, ...perceived.failures];
  notMeasured.push(...perRoute.notMeasured);

  console.log(`\nPer-route budgets (${perRoute.routeCount} route(s), each judged on its own):`);
  for (const profile of ["desktop", "mobile"]) {
    for (const m of METRICS) {
      const hit = perRoute.worst[`${profile}.${m.metric}`];
      if (!hit) continue;
      const budget = BUDGETS[profile][m.budget];
      console.log(
        `  [${profile}] worst ${m.label.padEnd(8)} ${hit.format(hit.value).padStart(9)} on ${hit.route}` +
          `  (budget ${hit.format(budget)}${hit.value > budget ? " — BREACH" : ""})`,
      );
    }
  }

  console.log(
    `\nPerceived responsiveness (intent -> first DOM mutation, target ${String(perceived.target ?? 100)}ms):`,
  );
  for (const profile of ["desktop", "mobile"]) {
    const s = perceived.summary?.[profile];
    if (!s) continue;
    const fmt = (v) => (v === null || v === undefined ? "n/a" : `${v.toFixed(0)}ms`);
    console.log(
      `  [${profile}] ${s.count} navigation(s)  p50 ${fmt(s.p50_ms)}  p75 ${fmt(s.p75_ms)}  max ${fmt(s.max_ms)}`,
    );
  }
  for (const u of perceived.unmeasured)
    console.log(`  not measured: ${u.profile} ${u.route} — ${u.reason} (no navigation there to be slow)`);

  for (const line of perRoute.interactionsTooFast)
    console.log(`  INP not recorded: ${line} — an interaction that never reached the threshold is fast, not unmeasured`);

  if (notMeasured.length > 0) {
    console.log(`\nNot measured:`);
    for (const m of notMeasured) console.log(`  ${m}`);
  }

  for (const line of annotate(failures, loadExceptions())) console.error(line);

  if (failures.length > 0) {
    console.error(`\ncheck-web-vitals-budget: ${failures.length} budget violation(s)`);
    process.exitCode = 1;
    return;
  }

  if (notMeasured.length > 0 && !ALLOW_UNMEASURED) {
    console.error(
      `\ncheck-web-vitals-budget: FAIL — ${notMeasured.length} budget(s) have no measurement.` +
        `\n  An unmeasured budget is not a met budget. Measure it, or pass --allow-unmeasured` +
        `\n  to record an explicitly incomplete run.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log("\ncheck-web-vitals-budget: OK (all budgets measured and met)");
}

if (SELF_TEST) {
  selfTest().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
} else {
  main();
}
