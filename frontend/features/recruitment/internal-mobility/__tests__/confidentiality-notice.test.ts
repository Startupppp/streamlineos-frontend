import { readFileSync } from "node:fs";
import { backendPath } from "@/test-utils/backend-repo";
import { CONFIDENTIALITY_NOTICE } from "../confidentiality-notice";

/**
 * The applicant's promise, asserted against the backend's copy of it.
 *
 * This sentence is the product's answer to "who will find out that I applied".
 * Two copies of a promise drift, and the copy that drifts is always the one
 * nobody reads — so the rule and the sentence are pinned to each other here
 * rather than trusted to stay in step.
 */
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

  /**
   * The two facts the sentence has to carry. A rewrite that keeps the words but
   * drops the stage, or drops who finds out, is a rewrite that answers a
   * different question from the one the applicant asked.
   */
  it("names the stage and names the manager", () => {
    expect(CONFIDENTIALITY_NOTICE).toContain("interview stage");
    expect(CONFIDENTIALITY_NOTICE).toContain("current manager");
  });

  /**
   * `managerMaySee` is what makes the sentence true. Reading it here means a
   * change to the stage list fails this test rather than quietly making the
   * promise false.
   */
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
