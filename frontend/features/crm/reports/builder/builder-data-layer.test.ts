import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * CRM-P1-03. The builder reads from `crm/reporting` and from nowhere else.
 *
 * `reporting-wire.test.tsx` proves every reporting hook addresses that
 * controller. This proves the builder uses no other data layer — which is the
 * half that drifts, because the older reports dashboard next door genuinely
 * does call `crm/leads` and `leads`, and the honest-looking fix for a missing
 * number in the builder is to import one of those.
 *
 * Reading the source rather than rendering: the failure is an import that
 * type-checks and renders perfectly, and shows up only as a second controller
 * being asked a question the reporting engine was built to answer.
 */

const BUILDER = __dirname;

/** Reporting hooks, plus the permission gate every surface needs. */
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
    /** A glob that matched nothing would make every assertion below vacuous. */
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
    /**
     * `apiClient` in a component is how a read escapes `useGatedQuery` — the
     * request goes out, the server refuses it, and the screen shows an error
     * where it should have shown a permission.
     */
    const direct = builderSources()
      .filter(({ text }) => text.includes("@/lib/api-client"))
      .map(({ file }) => file);

    expect(direct).toEqual([]);
  });
});
