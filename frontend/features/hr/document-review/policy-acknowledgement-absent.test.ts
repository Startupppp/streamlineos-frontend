import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const contract = JSON.parse(
  readFileSync("contracts/openapi.json", "utf8"),
) as { paths: Record<string, unknown> };

const POLICY_ACK_SHAPE = /^\/(hr|me)\/polic[^/]*\/.*acknowledg/i;

function sourceFiles(root: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = join(root, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (/\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name))
      out.push(full);
  }
  return out;
}

describe("HRMS-UX-020 — policy acknowledgement has no endpoint, so it ships no UI", () => {
  it("the vendored contract exposes no policy-acknowledgement route", () => {
    const matches = Object.keys(contract.paths).filter((path) =>
      POLICY_ACK_SHAPE.test(path),
    );
    expect(matches).toEqual([]);
  });

  it("the only acknowledgement routes that exist belong to other domains", () => {
    const ack = Object.keys(contract.paths).filter((path) =>
      /acknowledg/i.test(path),
    );
    expect(ack.sort()).toEqual([
      "/hr/cases/disciplinary/mine/unacknowledged-count",
      "/hr/cases/disciplinary/{actionId}/acknowledge",
      "/me/document-acknowledgements",
      "/me/document-acknowledgements/{ackId}",
      "/payroll/filings/{filingId}/acknowledgement",
    ]);
  });

  it("no frontend file calls a policy-acknowledgement endpoint", () => {
    const offenders: string[] = [];
    for (const root of ["app", "features", "hooks", "lib", "components"]) {
      if (!existsSync(root)) continue;
      for (const file of sourceFiles(root)) {
        const source = readFileSync(file, "utf8");
        if (/["'`]\/(hr|me)\/polic[^"'`]*acknowledg/i.test(source)) offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("document acknowledgement, which does have an endpoint, is the only one wired up", () => {
    expect(contract.paths["/hr/compliance"]).toBeDefined();
    expect(
      readFileSync("hooks/api/hr/document-acknowledgements.ts", "utf8"),
    ).toContain('"/hr/compliance"');
  });
});
