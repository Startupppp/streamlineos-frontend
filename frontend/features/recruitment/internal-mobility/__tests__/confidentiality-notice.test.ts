import { readFileSync } from "node:fs";
import { backendPath } from "@/test-utils/backend-repo";
import { CONFIDENTIALITY_NOTICE } from "../confidentiality-notice";

const BACKEND_ELIGIBILITY = backendPath(
  "src",
  "modules",
  "hr",
  "recruitment",
  "internal-mobility",
  "internal-eligibility.ts",
);

describe("the internal-mobility confidentiality notice", () => {
  it("says the same thing on both sides of the wire", () => {
    const backend = readFileSync(BACKEND_ELIGIBILITY, "utf8");
    const match = /export const CONFIDENTIALITY_NOTICE =\s*"([^"]+)";/.exec(backend);
    expect(match?.[1]).toBeDefined();
    expect(CONFIDENTIALITY_NOTICE).toBe(match?.[1]);
  });

  it("names the stage and names the manager", () => {
    expect(CONFIDENTIALITY_NOTICE).toContain("interview stage");
    expect(CONFIDENTIALITY_NOTICE).toContain("current manager");
  });

  it("matches the stage list the backend actually enforces", () => {
    const backend = readFileSync(BACKEND_ELIGIBILITY, "utf8");
    const match = /const MANAGER_VISIBLE_FROM: readonly string\[\] = \[([^\]]+)\]/.exec(backend);
    const stages = (match?.[1] ?? "")
      .split(",")
      .map((s) => s.trim().replace(/^"|"$/g, ""))
      .filter(Boolean);

    expect(stages).toContain("INTERVIEWING");
    expect(stages).not.toContain("APPLIED");
    expect(stages).not.toContain("SHORTLISTED");
  });
});
