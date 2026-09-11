/**
 * Corpus invariants for the Billing/Payments client surface (PRD-C125's
 * "authorization" and "frontend states" dimensions).
 *
 * The component specs beside this file pin the surfaces that were actually
 * broken. That is not enough on its own: the first gating pass wrote a spec
 * whose corpus was exactly the files it had just fixed, so it was structurally
 * unable to see the next instance — and five more were sitting in the same
 * territory (webhooks-tab, manual-methods-panel, live-activation-panel,
 * test-payment-tab, record-payment-dialog). This file scans the WHOLE
 * territory instead, deriving both the hook inventory and the consumer set
 * from the tree, so a new file, a new hook or a regression in a fixed one
 * fails here without anyone remembering to add it.
 *
 * Corpus: every non-test `.ts`/`.tsx` under `features/billing/**` and
 * `features/payments/**`, plus the five hook modules those surfaces read and
 * write through.
 *
 * Oracle for permission keys: `contracts/openapi.json` `x-permission` — the
 * vendored backend contract. A key the backend does not declare can never be
 * granted, so a `useCan` on it is a permanent deny.
 *
 * What these invariants deliberately do NOT prove: that a rendered error
 * branch is well-worded, or that a component which destructures `isError`
 * actually branches on it. Those are the component specs' job. This file
 * proves the weaker, checkable thing — the signal is read at all — over the
 * whole corpus rather than over a hand-listed subset.
 */
import { readdirSync, readFileSync } from "fs";
import { join, resolve } from "path";

const ROOT = resolve(__dirname, "..", "..");

const HOOK_MODULES = [
  "hooks/api/invoice.ts",
  "hooks/api/subscription.ts",
  "hooks/api/payments.ts",
  "hooks/api/ai-credits.ts",
  "hooks/api/entitlements.ts",
];

const FEATURE_ROOTS = ["features/billing", "features/payments"];

/** An affordance that tells the viewer a read failed or was refused. */
const ERROR_AFFORDANCES = ["ErrorState", "NoPermissionState", 'role="alert"', 'role="status"'];

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function walk(relativeDir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(join(ROOT, relativeDir), { withFileTypes: true })) {
    const next = `${relativeDir}/${entry.name}`;
    if (entry.isDirectory()) found.push(...walk(next));
    else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) found.push(next);
  }
  return found;
}

interface HookBlock {
  name: string;
  hookModule: string;
  body: string;
}

function hookBlocks(): HookBlock[] {
  const blocks: HookBlock[] = [];
  for (const hookModule of HOOK_MODULES) {
    const source = read(hookModule);
    for (const chunk of source.split(/(?=^export (?:const|function) use)/m)) {
      const named = chunk.match(/^export (?:const|function) (use[A-Za-z0-9_]+)/);
      if (named) blocks.push({ name: named[1], hookModule, body: chunk });
    }
  }
  return blocks;
}

/** A read whose query is switched off without a permission — so a denial and a
 *  successful-but-empty read are indistinguishable from `data` alone. */
function isPermissionGatedRead(block: HookBlock): boolean {
  return /useQuery/.test(block.body) && /enabled:[^,\n]*\bcan[A-Z]/.test(block.body);
}

function isMutation(block: HookBlock): boolean {
  return /use(?:Authorized)?Mutation\s*[<(]/.test(block.body);
}

function backendPermissionKeys(): Set<string> {
  const doc: { paths?: Record<string, Record<string, { "x-permission"?: string | string[] }>> } =
    JSON.parse(read("contracts/openapi.json"));
  const keys = new Set<string>();
  for (const operations of Object.values(doc.paths ?? {}))
    for (const operation of Object.values(operations)) {
      const declared = operation?.["x-permission"];
      if (typeof declared === "string") keys.add(declared);
      else if (Array.isArray(declared)) declared.forEach((key) => keys.add(key));
    }
  return keys;
}

const blocks = hookBlocks();
const gatedReads = blocks.filter(isPermissionGatedRead).map((block) => block.name);
const mutations = blocks.filter(isMutation);
const featureFiles = FEATURE_ROOTS.flatMap(walk);

describe("the corpus itself is non-empty", () => {
  it("finds the hook inventory and the feature files it is meant to police", () => {
    expect(gatedReads.length).toBeGreaterThanOrEqual(14);
    expect(mutations.length).toBeGreaterThanOrEqual(20);
    expect(featureFiles.length).toBeGreaterThanOrEqual(30);
  });
});

describe("frontend states — no permission-gated read is consumed without an error branch", () => {
  const consumers = featureFiles
    .map((file) => ({ file, source: read(file) }))
    .map((entry) => ({
      ...entry,
      hooks: gatedReads.filter((hook) => new RegExp(`\\b${hook}\\s*\\(`).test(entry.source)),
    }))
    .filter((entry) => entry.hooks.length > 0);

  it("has consumers to police", () => {
    expect(consumers.length).toBeGreaterThanOrEqual(10);
  });

  it.each(consumers.map((entry) => [entry.file, entry.hooks.join(", ")]))(
    "%s reads the failure signal of %s",
    (file) => {
      const source = read(file);
      expect(source).toMatch(/\bisError\b/);
      expect(ERROR_AFFORDANCES.some((affordance) => source.includes(affordance))).toBe(true);
    },
  );
});

describe("authorization — every billing/payments mutation is bound to a permission", () => {
  const backendKeys = backendPermissionKeys();

  it.each(mutations.map((block) => [`${block.hookModule} ${block.name}`, block.name]))(
    "%s goes through useAuthorizedMutation",
    (_label, name) => {
      const block = mutations.find((candidate) => candidate.name === name);
      expect(block).toBeDefined();
      expect(block?.body).toMatch(/useAuthorizedMutation\s*[<(]/);
      expect(block?.body).not.toMatch(/return\s+useMutation\s*[<(]/);
    },
  );

  it("binds each mutation to a key the backend contract actually declares", () => {
    const unknown: string[] = [];
    for (const block of mutations) {
      const key = block.body.match(/useAuthorizedMutation(?:<[\s\S]*?>)?\(\s*"([^"]+)"/)?.[1];
      expect(key).toBeDefined();
      if (key && !backendKeys.has(key)) unknown.push(`${block.hookModule} ${block.name} -> ${key}`);
    }
    expect(unknown).toEqual([]);
  });

  it("never gates a control on a key no backend route declares", () => {
    const unknown: string[] = [];
    for (const file of featureFiles)
      for (const match of read(file).matchAll(/useCan\(\s*"([^"]+)"/g))
        if (!backendKeys.has(match[1])) unknown.push(`${file} -> ${match[1]}`);
    expect(unknown).toEqual([]);
  });
});
