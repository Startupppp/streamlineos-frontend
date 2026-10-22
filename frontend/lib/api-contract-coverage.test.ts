import { execFileSync } from "node:child_process";
import { join } from "node:path";


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
