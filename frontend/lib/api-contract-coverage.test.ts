/**
 * @jest-environment node
 */
import { execFileSync } from "node:child_process";
import { join } from "node:path";

/**
 * Runtime response validation is opt-in per call site, which means the
 * un-validated path is the default and therefore invisible. This makes it
 * visible and holds the line: no route carrying money, permissions, tenancy or
 * PII may lose its contract, and no new endpoint may arrive without one.
 *
 * The scan itself lives in `scripts/check-response-contracts.mjs` and this
 * suite consumes its `--json`. That is deliberate. This file USED to carry its
 * own copy of the scanner, and the copy had two holes the gate does not: it
 * read `hooks/` only, so it could not see the 161 seam calls in `app/`,
 * `features/`, `components/` and `lib/`; and its leak rule matched
 * `method === "get"`, so a `serverGet` on a contracted route was invisible.
 * Three SSR prefetches of routes on its own risk list — `/payroll/runs`,
 * `/roles`, `/directory/workers` — sat uncontracted underneath a green run.
 *
 * Two implementations of one definition disagree; this release has already paid
 * for that once (a read count reported as 81, 84 and 86 by three scanners of
 * the same thing). There is one scanner now, and this asserts against it.
 */

const FE_ROOT = join(__dirname, "..");
const GATE = join(FE_ROOT, "scripts", "check-response-contracts.mjs");

interface SeamCall {
  readonly file: string;
  readonly line: number;
  readonly method: string;
  readonly route: string | null;
  readonly validated: boolean;
}

interface GateReport {
  readonly scanned: number;
  readonly validated: number;
  readonly unvalidated: number;
  readonly unresolvedSites: number;
  readonly distinctRoutes: number;
  readonly validatedRoutes: number;
  readonly contractedRoutes: readonly string[];
  readonly missingContract: readonly string[];
  readonly leaks: readonly string[];
  readonly baseline: { readonly unvalidatedCalls: number; readonly minScannedCalls: number };
  readonly calls: readonly SeamCall[];
}

function runGate(...args: string[]): { stdout: string; status: number } {
  try {
    return {
      stdout: execFileSync("node", [GATE, ...args], {
        cwd: FE_ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }),
      status: 0,
    };
  } catch (error) {
    const failure = error as { stdout?: string; stderr?: string; status?: number };
    return { stdout: `${failure.stdout ?? ""}${failure.stderr ?? ""}`, status: failure.status ?? 1 };
  }
}

const REPORT: GateReport = JSON.parse(runGate("--json").stdout) as GateReport;

describe("response contract coverage", () => {
  it("scanned the whole client tree rather than an empty one", () => {
    expect(REPORT.scanned).toBeGreaterThan(REPORT.baseline.minScannedCalls);
    expect(new Set(REPORT.calls.map((call) => call.file.split("/")[0]))).toEqual(
      new Set(["hooks", "app", "features", "components", "lib"]),
    );
  });

  it("keeps a contract on every route carrying money, permissions, tenancy or PII", () => {
    expect(REPORT.missingContract).toEqual([]);
  });

  it("never leaves a contracted route readable without its contract, through any read seam", () => {
    expect(REPORT.leaks).toEqual([]);
  });

  it("sees the SSR prefetch seam, not only the client hooks", () => {
    const prefetch = REPORT.calls.filter((call) => call.file.startsWith("lib/prefetch/"));

    expect(prefetch.length).toBeGreaterThan(0);
    expect(
      prefetch.filter((call) => !call.validated).map((call) => call.file),
    ).not.toContain("lib/prefetch/payroll.ts");
  });

  it("reports the un-validated remainder as a number rather than hiding it", () => {
    expect(REPORT.validated + REPORT.unvalidated).toBe(REPORT.scanned);
    expect(REPORT.unvalidated).toBeLessThanOrEqual(REPORT.baseline.unvalidatedCalls);
    expect(REPORT.validated).toBeGreaterThanOrEqual(REPORT.contractedRoutes.length);
  });

  it("holds the ratchet: the tree at head passes its own gate", () => {
    expect(runGate().status).toBe(0);
  });
});

describe("the scanner itself", () => {
  it("passes its own self-test, so the numbers above mean what they say", () => {
    const result = runGate("--self-test");

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^(\d+)\/\1 self-test assertions passed\.$/m);
  });
});
