import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";


const BUILDER = __dirname;

const ALLOWED_DATA_MODULES = new Set([
  "@/hooks/api/crm/reporting",
  "@/hooks/api/access",
]);

function builderSources(): { file: string; text: string }[] {
  return readdirSync(BUILDER)
    .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    .map((file) => ({ file, text: readFileSync(join(BUILDER, file), "utf8") }));
}

function dataImports(text: string): string[] {
  return [...text.matchAll(/from\s+"(@\/hooks\/api\/[^"]+)"/g)].map(([, module]) => module);
}

describe("the report builder's data layer", () => {
  it("has files to check", () => {
    expect(builderSources().length).toBeGreaterThan(10);
  });

  it("imports no hook module other than reporting and the gate", () => {
    const strays = builderSources().flatMap(({ file, text }) =>
      dataImports(text)
        .filter((module) => !ALLOWED_DATA_MODULES.has(module))
        .map((module) => `${file} -> ${module}`),
    );

    expect(strays).toEqual([]);
  });

  it("actually imports the reporting hooks, so the rule above has something to bind", () => {
    const reporting = builderSources().filter(({ text }) =>
      dataImports(text).includes("@/hooks/api/crm/reporting"),
    );

    expect(reporting.length).toBeGreaterThan(0);
  });

  it("calls no endpoint directly, bypassing the hooks and their gates", () => {
    const direct = builderSources()
      .filter(({ text }) => text.includes("@/lib/api-client"))
      .map(({ file }) => file);

    expect(direct).toEqual([]);
  });
});
