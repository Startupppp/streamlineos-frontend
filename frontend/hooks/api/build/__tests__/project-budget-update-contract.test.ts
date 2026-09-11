import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";

/**
 * PRD-C123 — the declared shape of `PATCH /build/:projectId/budget` matches what the
 * server returns.
 *
 * The hook declared `apiClient.patch<{ id: number; budget: string }>`. The service
 * returns `{ id, budget: minorToMajor(...), currency }` and `minorToMajor` is
 * `(minor: number): number`, so two things were wrong at once and neither could fail
 * a typecheck: `budget` was a number typed as a string, and `currency` — the only
 * field that says which currency the amount is in — was not declared at all, so it
 * was invisible to every consumer.
 *
 * `check:response-contracts` cannot see this (86 of 2666 calls parsed) and
 * `check:contract-drift` is scoped to timesheets, so the drift is asserted here by
 * reading BOTH sources: the backend return literal and the frontend interface. It is
 * a source read rather than a type import because the two repos are separate
 * TypeScript projects.
 */
const FE_ROOT = path.join(__dirname, "..", "..", "..", "..");
const TYPES_FILE = path.join(FE_ROOT, "types", "projects", "planning.ts");
const HOOK_FILE = path.join(FE_ROOT, "hooks", "api", "build", "milestones.ts");
const BACKEND_SERVICE = backendPath(
  "src",
  "modules",
  "build",
  "core",
  "projects-budget.service.ts",
);

function backendSource(): string {
  return fs.readFileSync(BACKEND_SERVICE, "utf8");
}

/** The keys of the object literal `updateBudget` returns. */
function backendReturnFields(): string[] {
  const source = backendSource();
  const method = /async updateBudget\([\s\S]*?\n  \}/.exec(source);
  // Anti-vacuity: a renamed method means the premise changed and must be revisited,
  // not quietly satisfied by a regex that stopped matching.
  expect(method).not.toBeNull();
  const block = /return \{([\s\S]*?)\n    \};/.exec(method?.[0] ?? "");
  expect(block).not.toBeNull();
  const fields = [...(block?.[1] ?? "").matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gm)].map(
    (m) => m[1] ?? "",
  );
  expect(fields.length).toBeGreaterThanOrEqual(3);
  return fields;
}

/** The fields declared on the frontend `ProjectBudgetUpdate` interface. */
function clientFields(): { name: string; type: string }[] {
  const source = fs.readFileSync(TYPES_FILE, "utf8");
  const block = /export interface ProjectBudgetUpdate \{([\s\S]*?)\n\}/.exec(source);
  expect(block).not.toBeNull();
  const fields = [...(block?.[1] ?? "").matchAll(/^\s*([A-Za-z][A-Za-z0-9]*)\??:\s*([^;]+);/gm)].map(
    (m) => ({ name: m[1] ?? "", type: (m[2] ?? "").trim() }),
  );
  expect(fields.length).toBeGreaterThanOrEqual(3);
  return fields;
}

describe("project budget update response contract", () => {
  it("declares exactly the fields the server returns — no more, no fewer", () => {
    const server = new Set(backendReturnFields());
    const client = new Set(clientFields().map((f) => f.name));
    for (const field of client) expect([field, server.has(field)]).toEqual([field, true]);
    for (const field of server) expect([field, client.has(field)]).toEqual([field, true]);
  });

  it("types budget as the number minorToMajor actually returns, not a string", () => {
    const source = backendSource();
    expect(source).toMatch(/function minorToMajor\(minor: number\): number/);
    expect(source).toMatch(/budget: minorToMajor\(/);
    const budget = clientFields().find((f) => f.name === "budget");
    expect(budget?.type).toBe("number");
  });

  it("declares currency as nullable, matching the nullable budget_currency column", () => {
    const currency = clientFields().find((f) => f.name === "currency");
    expect(currency?.type).toBe("string | null");
  });

  it("makes the mutation hook use the named type instead of an inline literal", () => {
    const hook = fs.readFileSync(HOOK_FILE, "utf8");
    expect(hook).toContain("apiClient.patch<ProjectBudgetUpdate>(`/build/${projectId}/budget`");
    expect(hook).not.toMatch(/apiClient\.patch<\{[^}]*\}>\(`\/build\/\$\{projectId\}\/budget`/);
  });
});
