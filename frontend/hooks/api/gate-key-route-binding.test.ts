import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { backendPermissionNames } from "@/test-utils/permission-catalog";

const ROOT = resolve(__dirname, "..", "..");

const GATE_MARKERS = new Set([
  "useGatedQuery",
  "useAuthorizedMutation",
  "useAuthorizedIdempotentMutation",
  "useCan",
  "useCanState",
  "usePermissionGate",
]);

interface Binding {
  readonly file: string;
  readonly fn: string;
  readonly operation: { readonly method: string; readonly path: string };
  readonly keys: readonly string[];
}

const BINDINGS: readonly Binding[] = [
  {
    file: "hooks/api/hr/leaves-team-availability.ts",
    fn: "useHrTeamAvailability",
    operation: { method: "get", path: "/hr/leaves/team-availability" },
    keys: ["hr:leaves:read"],
  },
  {
    file: "features/hr/leaves/components/team-availability-overlay.tsx",
    fn: "TeamAvailabilityOverlay",
    operation: { method: "get", path: "/hr/leaves/team-availability" },
    keys: ["hr:leaves:read"],
  },
  {
    file: "hooks/api/build/client-portal-management.ts",
    fn: "usePortalSettings",
    operation: { method: "get", path: "/build/{projectId}/client-portal/settings" },
    keys: ["build:clientvisibility:manage"],
  },
  {
    file: "hooks/api/build/client-portal-management.ts",
    fn: "usePortalPreview",
    operation: { method: "get", path: "/build/{projectId}/client-portal/preview" },
    keys: ["build:clientvisibility:manage"],
  },
  {
    file: "hooks/api/build/client-portal-management.ts",
    fn: "usePublishPortal",
    operation: { method: "post", path: "/build/{projectId}/client-portal/publish" },
    keys: ["build:clientvisibility:manage"],
  },
  {
    file: "hooks/api/build/client-portal-management.ts",
    fn: "useUnpublishPortal",
    operation: { method: "post", path: "/build/{projectId}/client-portal/unpublish" },
    keys: ["build:clientvisibility:manage"],
  },
  {
    file: "hooks/api/build/governance.ts",
    fn: "useOrgRisks",
    operation: { method: "get", path: "/build/risks" },
    keys: ["build:risks:view"],
  },
  {
    file: "hooks/api/build/releases.ts",
    fn: "useOrgReleases",
    operation: { method: "get", path: "/build/releases" },
    keys: ["build:view"],
  },
  {
    file: "hooks/api/timesheets-core/periods.ts",
    fn: "useCanViewPeriodDetail",
    operation: { method: "get", path: "/timesheets/periods/{periodId}" },
    keys: [
      "timesheets:approvals:view",
      "timesheets:entries:view",
      "timesheets:team:view",
    ],
  },
];

function sourceOf(file: string): ts.SourceFile {
  return ts.createSourceFile(
    file,
    readFileSync(resolve(ROOT, file), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

function namedFunction(sf: ts.SourceFile, name: string): ts.Node | undefined {
  let found: ts.Node | undefined;
  const visit = (node: ts.Node): void => {
    if (found !== undefined) return;
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) {
      found = node;
      return;
    }
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === name &&
      node.initializer !== undefined &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    ) {
      found = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  };
  ts.forEachChild(sf, visit);
  return found;
}

function gateKeysIn(node: ts.Node): string[] {
  const keys = new Set<string>();
  const visit = (n: ts.Node): void => {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      GATE_MARKERS.has(n.expression.text) &&
      n.arguments.length >= 1 &&
      ts.isStringLiteralLike(n.arguments[0])
    )
      keys.add(n.arguments[0].text);
    if (
      ts.isPropertyAssignment(n) &&
      n.name.getText().replace(/"/g, "") === "permission" &&
      ts.isStringLiteralLike(n.initializer)
    )
      keys.add(n.initializer.text);
    ts.forEachChild(n, visit);
  };
  visit(node);
  return [...keys].sort();
}

interface OpenApiDoc {
  readonly paths: Record<
    string,
    Record<string, { readonly "x-permission"?: string } | undefined> | undefined
  >;
}

const contract: OpenApiDoc = JSON.parse(
  readFileSync(resolve(ROOT, "contracts", "openapi.json"), "utf8"),
) as OpenApiDoc;

function declaredPermission(operation: Binding["operation"]): string | undefined {
  return contract.paths[operation.path]?.[operation.method]?.["x-permission"];
}

describe("gate keys bind to the permission their own route declares", () => {
  it("finds every function it claims to audit, so nothing below can pass vacuously", () => {
    const missing = BINDINGS.filter(
      (binding) => namedFunction(sourceOf(binding.file), binding.fn) === undefined,
    ).map((binding) => `${binding.file}::${binding.fn}`);

    expect(missing).toEqual([]);
    expect(BINDINGS.length).toBeGreaterThanOrEqual(9);
  });

  it("reads a gate key out of every audited function, so an empty extraction cannot pass", () => {
    const keyless = BINDINGS.filter((binding) => {
      const fn = namedFunction(sourceOf(binding.file), binding.fn);
      return fn === undefined || gateKeysIn(fn).length === 0;
    }).map((binding) => `${binding.file}::${binding.fn}`);

    expect(keyless).toEqual([]);
  });

  it("names, for every audited function, exactly the keys recorded against it", () => {
    const drifted = BINDINGS.flatMap((binding) => {
      const fn = namedFunction(sourceOf(binding.file), binding.fn);
      if (fn === undefined) return [];
      const actual = gateKeysIn(fn);
      if (JSON.stringify(actual) === JSON.stringify([...binding.keys].sort())) return [];
      return [
        `${binding.file}::${binding.fn} gates on [${actual.join(", ")}], recorded [${[...binding.keys].sort().join(", ")}]`,
      ];
    });

    expect(drifted).toEqual([]);
  });

  it("holds the key the backend operation declares, read from the vendored contract", () => {
    const unbound = BINDINGS.flatMap((binding) => {
      const declared = declaredPermission(binding.operation);
      const label = `${binding.operation.method.toUpperCase()} ${binding.operation.path}`;
      if (declared === undefined)
        return [`${binding.file}::${binding.fn}: ${label} has no x-permission in the contract`];
      if (!binding.keys.includes(declared))
        return [
          `${binding.file}::${binding.fn}: ${label} declares "${declared}", gate holds [${binding.keys.join(", ")}]`,
        ];
      return [];
    });

    expect(unbound).toEqual([]);
  });

  it("uses no key absent from the backend catalog, which would make useCan false for ever", () => {
    const backend = backendPermissionNames();
    const ghosts = [...new Set(BINDINGS.flatMap((binding) => binding.keys))]
      .filter((key) => !backend.has(key))
      .sort();

    expect(ghosts).toEqual([]);
  });
});
