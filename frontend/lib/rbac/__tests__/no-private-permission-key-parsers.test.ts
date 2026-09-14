import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, sep } from "path";

const FRONTEND_ROOT = join(__dirname, "..", "..", "..");
const SCAN_ROOTS = ["lib", "components", "features", "hooks", "app"];
const CANONICAL = "lib/rbac/administering-module.ts";

const NOT_A_PERMISSION_KEY: Readonly<Record<string, string>> = {
  "lib/renderer/crm/contact-role-layout.ts":
    "entity refs `deal:123` / `company:456`, not a permission key",
  "features/build/project-list/projects-page.tsx":
    "`status:ACTIVE` client-side filter-group token, not a permission key",
  "features/hr/attendance/attendance-regularization-dialog.tsx": "HH:MM regularization time",
  "features/hr/performance/meetings-tab.tsx": "HH:MM meeting time",
  "features/hr/performance/meeting-schema.ts": "HH:MM meeting time in a Zod refine",
};

const PARSER = /\.(?:split|indexOf)\(\s*(?:"\s*:\s*"|'\s*:\s*'|\/:\/)\s*\)/;
const SKIP_DIRS = new Set(["node_modules", ".next", "public", "__tests__"]);

interface SourceFile {
  path: string;
  text: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(full, out);
      continue;
    }
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
    if (entry.endsWith(".test.ts") || entry.endsWith(".test.tsx") || entry.endsWith(".d.ts")) continue;
    out.push(full);
  }
  return out;
}

function productionSources(): SourceFile[] {
  const files: SourceFile[] = [];
  for (const root of SCAN_ROOTS) {
    for (const full of walk(join(FRONTEND_ROOT, root))) {
      files.push({
        path: relative(FRONTEND_ROOT, full).split(sep).join("/"),
        text: readFileSync(full, "utf8"),
      });
    }
  }
  return files;
}

export function findPrivateKeyParsers(files: readonly SourceFile[]): string[] {
  const found: string[] = [];
  for (const file of files) {
    if (file.path === CANONICAL) continue;
    if (file.path in NOT_A_PERMISSION_KEY) continue;
    file.text.split("\n").forEach((line, index) => {
      if (PARSER.test(line)) found.push(`${file.path}:${index + 1}`);
    });
  }
  return found;
}

const files = productionSources();

describe("no private permission-key parser in frontend production code", () => {
  it("scanned a real tree, so an empty result means something", () => {
    expect(files.length).toBeGreaterThan(3000);
    expect(files.some((file) => file.path === CANONICAL)).toBe(true);
  });

  it("bites on a reintroduced private parser", () => {
    expect(
      findPrivateKeyParsers([
        { path: "features/made-up/x.tsx", text: 'const m = key.split(":")[0];' },
      ]),
    ).toEqual(["features/made-up/x.tsx:1"]);
    expect(
      findPrivateKeyParsers([
        {
          path: "features/made-up/y.ts",
          text: "const i = key.indexOf(':');\nconst ns = key.slice(0, i);",
        },
      ]),
    ).toEqual(["features/made-up/y.ts:1"]);
  });

  it("does not bite on the canonical file or on an allowlisted path", () => {
    expect(
      findPrivateKeyParsers([
        { path: CANONICAL, text: 'permissionKey.indexOf(":")' },
        { path: "lib/renderer/crm/contact-role-layout.ts", text: 'value.split(":")' },
      ]),
    ).toEqual([]);
  });

  it("finds none outside the canonical helper and the allowlist", () => {
    expect(findPrivateKeyParsers(files)).toEqual([]);
  });

  it("keeps no allowlist entry that no longer parses a colon", () => {
    const stale = Object.keys(NOT_A_PERMISSION_KEY).filter((path) => {
      const file = files.find((candidate) => candidate.path === path);
      return file === undefined || !PARSER.test(file.text);
    });
    expect(stale).toEqual([]);
  });
});

describe("no second namespace-to-module table in the frontend", () => {
  it("declares administeringModuleOf and moduleOwningNamespace in exactly one frontend file", () => {
    const declaring = files
      .filter((file) =>
        /(?:function|const)\s+(?:administeringModuleOf|moduleOwningNamespace)\b/.test(file.text),
      )
      .map((file) => file.path);
    expect(declaring).toEqual([CANONICAL]);
  });

  it("hand-codes the home-administered mapping nowhere outside the generated manifest", () => {
    const handCoded = files
      .filter((file) => file.path !== "lib/module-manifest.json")
      .filter((file) =>
        /["']?(?:chat|mail|calendar|notifications)["']?\s*:\s*["']home["']/.test(file.text),
      )
      .map((file) => file.path);
    expect(handCoded).toEqual([]);
  });
});
