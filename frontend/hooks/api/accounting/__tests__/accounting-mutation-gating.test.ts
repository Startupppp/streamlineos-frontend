import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every write in the accounting hook surface must go through an authorized
 * mutation wrapper, gated on an `accounting:*` permission key.
 *
 * This sweeps the directory rather than listing hook names, so it survives the
 * renames the ledger rewrite brought with it (the old `useBill*` lifecycle
 * hooks became AP-document hooks) instead of rotting into a list of symbols
 * that no longer exist.
 */

const ACCOUNTING_HOOKS_DIR = join(process.cwd(), "hooks", "api", "accounting");

const hookFiles = readdirSync(ACCOUNTING_HOOKS_DIR)
  .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
  .sort();

interface ExportedHook {
  file: string;
  name: string;
  body: string;
}

function exportedHooks(file: string): ExportedHook[] {
  const source = readFileSync(join(ACCOUNTING_HOOKS_DIR, file), "utf8");
  const declaration = /^export function (use[A-Za-z0-9_]*)\(/gm;
  const starts: { name: string; index: number }[] = [];
  let match: RegExpExecArray | null = declaration.exec(source);
  while (match !== null) {
    starts.push({ name: match[1], index: match.index });
    match = declaration.exec(source);
  }
  return starts.map((start, i) => ({
    file,
    name: start.name,
    body: source.slice(start.index, i + 1 < starts.length ? starts[i + 1].index : source.length),
  }));
}

const mutationHooks = hookFiles
  .flatMap(exportedHooks)
  .filter((hook) => hook.body.includes("mutationFn:"));

describe("accounting hooks — mutation gating", () => {
  it("sweeps a non-empty accounting hook surface", () => {
    expect(hookFiles.length).toBeGreaterThan(0);
    expect(mutationHooks.length).toBeGreaterThan(0);
  });

  it.each(mutationHooks.map((hook) => [`${hook.file} ${hook.name}`, hook] as const))(
    "%s is wrapped in an authorized mutation",
    (_label, hook) => {
      expect(hook.body).toMatch(/\buseAuthorized(?:Idempotent)?Mutation\b/);
      expect(hook.body).toMatch(/"accounting:[a-z0-9:-]+"/);
    },
  );

  it.each(mutationHooks.map((hook) => [`${hook.file} ${hook.name}`, hook] as const))(
    "%s does not fall back to a bare useMutation",
    (_label, hook) => {
      expect(hook.body).not.toMatch(/\buseMutation\b/);
    },
  );
});
