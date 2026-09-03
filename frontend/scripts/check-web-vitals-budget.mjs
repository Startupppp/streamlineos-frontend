import { readFileSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const FRONTEND_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const MANIFEST_PATH = join(FRONTEND_ROOT, "contracts", "route-bundle-manifest.json");

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

export function annotate(failures, exceptions) {
  return failures.map((failure) => {
    const hit = exceptions.find(
      (e) => failure.profile === e.profile && failure.metric === e.metric,
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
  const annotationKeepsEveryFailure = annotated.length === failures.length;
  const annotationNamesTheOwner = annotated.some((line) => line.includes("owner: somebody"));
  const unownedBreachIsMarked = annotated.some((line) => line.includes("NO EXCEPTION RECORDED"));
  console.log(
    `Exception annotation: ${annotated.length} line(s) for ${failures.length} failure(s) — ` +
      `an exception must never remove one`,
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
    unownedBreachIsMarked;
  const unmeasuredOk =
    unmeasured.failures.length === 0 && unmeasured.notMeasured.length === 1;

  console.log(
    `Unmeasured fixture (mobile INP null): ${unmeasured.notMeasured.length} not-measured ` +
      `(expected 1 — this is a FAIL without --allow-unmeasured)`,
  );

  if (breachesOk && unmeasuredOk && perceivedOk && perRouteOk) {
    console.log(
    "SELF-TEST PASS: breach detection fires, an unmeasured budget is not reported as met, a recorded " +
      "exception annotates a failure without removing it, the perceived-responsiveness target is " +
      "enforced rather than narrated, and a single bad route fails on its own even when the " +
      "profile-wide p75 that twelve quiet routes dilute is inside every budget",
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
