import * as fs from "fs";
import * as path from "path";
import { backendPath } from "@/test-utils/backend-repo";


const FE_ROOT = path.join(__dirname, "..", "..", "..", "..");
const TYPES_FILE = path.join(FE_ROOT, "types", "projects", "planning.ts");
const HOOK_FILE = path.join(FE_ROOT, "hooks", "api", "build", "milestones.ts");
const BACKEND_SERVICE = backendPath(
  "src",
  "modules",
  "build",
  "core",
  "budget",
  "projects-budget.service.ts",
);

function backendSource(): string {
  return fs.readFileSync(BACKEND_SERVICE, "utf8");
}


function backendReturnFields(): string[] {
  const source = backendSource();
  const method = /async updateBudget\([\s\S]*?\n  \}/.exec(source);


  expect(method).not.toBeNull();
  const block = /return \{([\s\S]*?)\n    \};/.exec(method?.[0] ?? "");
  expect(block).not.toBeNull();
  const fields = [...(block?.[1] ?? "").matchAll(/^\s*([A-Za-z][A-Za-z0-9]*):/gm)].map(
    (m) => m[1] ?? "",
  );
  expect(fields.length).toBeGreaterThanOrEqual(3);
  return fields;
}


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

  it("makes the mutation hook use the named type instead of an inline literal, matched on whitespace-collapsed source so reformatting the call across lines cannot silently stop this assertion from finding it", () => {
    const hook = fs.readFileSync(HOOK_FILE, "utf8").replace(/\s+/g, " ");
    expect(hook).toContain("apiClient.patch<ProjectBudgetUpdate>( `/build/${projectId}/budget`");
    expect(hook).not.toMatch(/apiClient\.patch<\{[^}]*\}>\( ?`\/build\/\$\{projectId\}\/budget`/);
  });
});
