import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, basename } from "node:path";
import { resolve } from "node:path";

// Form/domain Zod schemas belong in a sibling *-schema.ts, never inline in a settings .tsx.
const SETTINGS_DIR = resolve(__dirname, "..");

function walkTsx(dir: string, files: string[] = []): string[] {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`cannot read ${dir}: ${msg}`, { cause: err });
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let isDir: boolean;
    let isFile: boolean;
    try {
      const s = statSync(full);
      isDir = s.isDirectory();
      isFile = s.isFile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`cannot stat ${full}: ${msg}`, { cause: err });
    }
    if (isDir) {
      walkTsx(full, files);
    } else if (isFile && entry.endsWith(".tsx") && !entry.endsWith(".test.tsx")) {
      files.push(full);
    }
  }
  return files;
}

function detectInlineSchemas(source: string): number[] {
  const hits: number[] = [];
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("z.object(")) {
      hits.push(i + 1);
    }
  }
  return hits;
}

interface Violation {
  file: string;
  line: number;
}

interface AllowlistEntry {
  file: string;
  symbol: string;
  reason: string;
}

const ALLOWLIST: AllowlistEntry[] = [
  {
    file: "settings-profile.tsx",
    symbol: "uploadKeyContract",
    reason:
      "endpoint-only response contract for the avatar-upload API — not form or domain validation",
  },
];

function collectViolations(dir: string): Violation[] {
  const files = walkTsx(dir);
  const violations: Violation[] = [];
  for (const filePath of files) {
    const source = readFileSync(filePath, "utf8");
    const lineNumbers = detectInlineSchemas(source);
    for (const line of lineNumbers) {
      violations.push({ file: basename(filePath), line });
    }
  }
  return violations;
}

describe("settings schema placement — vacuity proofs", () => {
  it("the walk finds a realistic count of settings .tsx files (measured: 68 non-test, floor: 48)", () => {
    const files = walkTsx(SETTINGS_DIR);
    expect(files.length).toBeGreaterThanOrEqual(48);
  });

  it("BITE PROOF — the walk holds test fixtures out of the production corpus", () => {
    const files = walkTsx(SETTINGS_DIR).map((f) => f.split("\\").join("/"));
    expect(files.some((f) => f.endsWith(".test.tsx"))).toBe(false);
    expect(files.some((f) => f.endsWith("/settings-profile.tsx"))).toBe(true);
  });

  it("the walk reaches the organization/hierarchy/ subdirectory", () => {
    const files = walkTsx(SETTINGS_DIR);
    const sentinel = files.find((f) =>
      f.replace(/\\/g, "/").includes("settings/organization/hierarchy/"),
    );
    expect(sentinel).toBeDefined();
  });

  it("BITE PROOF — detector reports a hit for a fixture string containing z.object(", () => {
    const fixture = "const x = z.object({ a: z.string() });";
    expect(detectInlineSchemas(fixture)).toHaveLength(1);
    expect(detectInlineSchemas(fixture)[0]).toBe(1);
  });

  it("BITE PROOF — detector reports no hits for a fixture string with no z.object(", () => {
    const fixture = 'const x = { a: "hello" };';
    expect(detectInlineSchemas(fixture)).toHaveLength(0);
  });

  it("BITE PROOF — the walk throws on an unreadable/nonexistent directory rather than returning a short list", () => {
    expect(() => walkTsx("/nonexistent-settings-dir-abc-xyz-123")).toThrow();
  });
});

describe("settings schema placement — allowlist entries are still present", () => {
  it("settings-profile.tsx still declares uploadKeyContract (stale allowlist must fail)", () => {
    const profilePath = join(SETTINGS_DIR, "settings-profile.tsx");
    const source = readFileSync(profilePath, "utf8");
    expect(source).toContain("uploadKeyContract");
    expect(source).toContain("z.object(");
  });
});

describe("settings schema placement — no unallowlisted inline schemas", () => {
  it("every z.object( in settings .tsx files is covered by the allowlist", () => {
    const violations = collectViolations(SETTINGS_DIR);

    const unexpected = violations.filter(
      (v) => !ALLOWLIST.some((a) => a.file === v.file),
    );

    if (unexpected.length > 0) {
      const listed = unexpected
        .map(
          (v) =>
            `  ${v.file}:${v.line} — move this z.object( to a sibling *-schema.ts`,
        )
        .join("\n");
      throw new Error(
        `${unexpected.length} inline z.object( declaration(s) found outside the allowlist:\n${listed}`,
      );
    }

    for (const entry of ALLOWLIST) {
      const present = violations.some((v) => v.file === entry.file);
      if (!present) {
        throw new Error(
          `Allowlist entry for "${entry.file}" (symbol: ${entry.symbol}) is stale — ` +
            `no z.object( found there. Remove it from ALLOWLIST.`,
        );
      }
    }

    expect(unexpected).toHaveLength(0);
  });
});
