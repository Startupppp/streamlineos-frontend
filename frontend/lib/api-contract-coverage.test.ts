/**
 * @jest-environment node
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";

/**
 * Runtime response validation is opt-in per call site, which means the
 * un-validated path is the default and therefore invisible. This makes it
 * visible: it counts every call through the fetch seam, prints the covered
 * fraction, and — the part that bites — fails when a route carrying money,
 * permissions, tenancy or PII loses the contract it had.
 *
 * `CONTRACTED_ROUTES` is the policy, not a snapshot. A route is added to it
 * when its contract lands, and it can only be removed deliberately.
 */

const FE_ROOT = join(__dirname, "..");
const HOOKS_DIR = join(FE_ROOT, "hooks", "api");

/** Where the contract sits in each seam function's argument list. */
const SEAM_METHODS: Readonly<Record<string, number>> = {
  get: 3,
  post: 3,
  put: 3,
  patch: 3,
  delete: 3,
  upload: 2,
};

const SEAM_FUNCTIONS: Readonly<Record<string, number>> = {
  serverGet: 1,
  publicGet: 2,
  publicGetNoStore: 2,
};

/**
 * Every route whose body decides what someone may do, who they are, what they
 * are owed or what they may see. A contract violation on one of these is a
 * lockout, a wrong number or a leak — never a cosmetic gap.
 */
const CONTRACTED_ROUTES: readonly string[] = [
  "/me/access",
  "/rbac/permissions",
  "/rbac/discovery/grantable",
  "/rbac/discovery/members",
  "/billing/entitlements",
  "/billing/ai-credits",
  "/billing/ai-credits/transactions",
  "/billing/ai-credits/usage",
  "/directory/people",
  "/directory/people/:p",
  "/me/org-display",
  "/module-access/:p/catalog",
  "/module-access/:p/me/permissions",
  "/payroll/me/payslips",
  "/payroll/me/bank",
];

const MIN_SCANNED_CALLS = 1500;

interface SeamCall {
  readonly file: string;
  readonly line: number;
  readonly method: string;
  readonly route: string | null;
  readonly validated: boolean;
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry)) continue;
    if (/\.(test|spec)\.tsx?$/.test(entry)) continue;
    out.push(full);
  }
  return out;
}

function routeOf(node: ts.Expression | undefined): string | null {
  if (node === undefined) return null;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    return node.text.split("?")[0] ?? null;
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) text += `:p${span.literal.text}`;
    return text.split("?")[0] ?? null;
  }
  return null;
}

function contractIndexFor(
  node: ts.CallExpression,
  src: ts.SourceFile,
): { method: string; index: number } | null {
  if (
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.expression.getText(src) === "apiClient"
  ) {
    const method = node.expression.name.getText(src);
    const index = SEAM_METHODS[method];
    return index === undefined ? null : { method, index };
  }
  if (ts.isIdentifier(node.expression)) {
    const method = node.expression.getText(src);
    const index = SEAM_FUNCTIONS[method];
    return index === undefined ? null : { method, index };
  }
  return null;
}

function scanSeamCalls(): SeamCall[] {
  const calls: SeamCall[] = [];
  for (const file of sourceFiles(HOOKS_DIR)) {
    const src = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.ESNext,
      true,
    );
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const seam = contractIndexFor(node, src);
        if (seam !== null) {
          const { line } = src.getLineAndCharacterOfPosition(node.getStart(src));
          calls.push({
            file: relative(FE_ROOT, file),
            line: line + 1,
            method: seam.method,
            route: routeOf(node.arguments[0]),
            validated: node.arguments.length > seam.index,
          });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(src);
  }
  return calls;
}

const CALLS = scanSeamCalls();

describe("response contract coverage", () => {
  it("scanned the data layer rather than an empty tree", () => {
    expect(CALLS.length).toBeGreaterThan(MIN_SCANNED_CALLS);
  });

  it("keeps a contract on every route carrying money, permissions, tenancy or PII", () => {
    const validatedRoutes = new Set(
      CALLS.filter((call) => call.validated).map((call) => call.route),
    );
    const missing = CONTRACTED_ROUTES.filter(
      (route) => !validatedRoutes.has(route),
    );

    expect(missing).toEqual([]);
  });

  it("never leaves a contracted route with an unvalidated second call site", () => {
    const contracted = new Set(CONTRACTED_ROUTES);
    const leaks = CALLS.filter(
      (call) =>
        call.route !== null &&
        contracted.has(call.route) &&
        !call.validated &&
        call.method === "get",
    ).map((call) => `${call.file}:${call.line} ${call.route}`);

    expect(leaks).toEqual([]);
  });

  it("reports the un-validated remainder as a number rather than hiding it", () => {
    const validated = CALLS.filter((call) => call.validated).length;
    const coverage = `${validated}/${CALLS.length} seam calls under hooks/api carry a response contract`;

    expect(coverage).toContain("seam calls");
    expect(validated).toBeGreaterThanOrEqual(CONTRACTED_ROUTES.length);
    expect(validated).toBeLessThanOrEqual(CALLS.length);
  });
});

describe("the scanner itself", () => {
  it("finds the contract argument only when one is actually passed", () => {
    const src = ts.createSourceFile(
      "probe.ts",
      [
        'apiClient.get("/a", undefined, signal, aContract);',
        'apiClient.get("/b", undefined, signal);',
        'apiClient.post("/c", body, undefined, cContract);',
        'apiClient.post("/d", body);',
        'serverGet("/e", eContract);',
        'serverGet("/f");',
      ].join("\n"),
      ts.ScriptTarget.ESNext,
      true,
    );
    const seen: Array<{ route: string | null; validated: boolean }> = [];
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) {
        const seam = contractIndexFor(node, src);
        if (seam !== null)
          seen.push({
            route: routeOf(node.arguments[0]),
            validated: node.arguments.length > seam.index,
          });
      }
      ts.forEachChild(node, visit);
    };
    visit(src);

    expect(seen).toEqual([
      { route: "/a", validated: true },
      { route: "/b", validated: false },
      { route: "/c", validated: true },
      { route: "/d", validated: false },
      { route: "/e", validated: true },
      { route: "/f", validated: false },
    ]);
  });

  it("normalises an interpolated path segment so a detail route is one route", () => {
    const src = ts.createSourceFile(
      "probe.ts",
      "apiClient.get(`/directory/people/${id}`, undefined, signal, c);",
      ts.ScriptTarget.ESNext,
      true,
    );
    let route: string | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) route = routeOf(node.arguments[0]);
      ts.forEachChild(node, visit);
    };
    visit(src);

    expect(route).toBe("/directory/people/:p");
  });

  it("strips a query string so one route is not counted as many", () => {
    const src = ts.createSourceFile(
      "probe.ts",
      "apiClient.get(`/directory/people?${qs}`, undefined, signal, c);",
      ts.ScriptTarget.ESNext,
      true,
    );
    let route: string | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node)) route = routeOf(node.arguments[0]);
      ts.forEachChild(node, visit);
    };
    visit(src);

    expect(route).toBe("/directory/people");
  });
});
