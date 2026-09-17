import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { z } from "zod";

const require = createRequire(import.meta.url);

const STUBBED_PACKAGES = new Set(["server-only", "client-only"]);

const IMPORT_TIME_ENV = {
  NEXT_PUBLIC_API_URL: "http://contract-parity.invalid",
  NEXTAUTH_SECRET: "contract-parity",
  NEXTAUTH_URL: "http://contract-parity.invalid",
};

function entrySpecifier(cacheDir, moduleFile) {
  const rel = relative(cacheDir, moduleFile).replaceAll("\\", "/");
  return rel.startsWith(".") ? rel : `./${rel}`;
}

export function writeEntry(cacheDir, refs) {
  mkdirSync(cacheDir, { recursive: true });
  const lines = refs.map(
    (ref, index) => `export { ${ref.exportName} as c${index} } from ${JSON.stringify(entrySpecifier(cacheDir, ref.file))};`,
  );
  const entryFile = join(cacheDir, "contract-entry.mjs");
  writeFileSync(entryFile, `${lines.join("\n")}\n`, "utf8");
  return entryFile;
}

export async function bundleContracts(root, cacheDir, refs) {
  const esbuild = require("esbuild");
  const entryFile = writeEntry(cacheDir, refs);
  const outFile = join(cacheDir, "contract-bundle.mjs");
  await esbuild.build({
    entryPoints: [entryFile],
    outfile: outFile,
    bundle: true,
    platform: "node",
    format: "esm",
    target: "node20",
    logLevel: "silent",
    external: ["zod"],
    alias: { "@": root },
    plugins: [
      {
        name: "contract-parity-stubs",
        setup(build) {
          build.onResolve({ filter: /^(server-only|client-only)$/ }, (args) =>
            STUBBED_PACKAGES.has(args.path) ? { path: args.path, namespace: "contract-parity-stub" } : null,
          );
          build.onLoad({ filter: /.*/, namespace: "contract-parity-stub" }, () => ({ contents: "export {};" }));
        },
      },
    ],
  });
  return outFile;
}

export async function resolveLoader(value) {
  if (typeof value !== "function") return { ok: true, value };
  if (value.length > 0)
    return {
      ok: false,
      reason: `contract export is a factory taking ${value.length} argument(s) — its row type is chosen at the call site, so this gate cannot build it`,
    };
  try {
    return { ok: true, value: await value() };
  } catch (error) {
    return { ok: false, reason: `contract loader threw: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function toJsonSchema(value) {
  if (value === null || typeof value !== "object") return { ok: false, reason: "export is not a Zod schema" };
  try {
    const converted = z.toJSONSchema(value, { io: "input", unrepresentable: "any", target: "draft-7" });
    const { $schema: _ignored, ...rest } = converted;
    return { ok: true, schema: rest };
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

export async function loadContractSchemas(root, cacheDir, refs) {
  const outFile = await bundleContracts(root, cacheDir, refs);
  for (const [name, value] of Object.entries(IMPORT_TIME_ENV))
    if (process.env[name] === undefined) process.env[name] = value;
  const loaded = await import(`${pathToFileURL(outFile).href}?t=${Date.now()}`);
  const schemas = new Map();
  const failures = [];
  for (const [index, ref] of refs.entries()) {
    const resolved = await resolveLoader(loaded[`c${index}`]);
    if (!resolved.ok) {
      failures.push({ key: ref.key, reason: resolved.reason });
      continue;
    }
    const result = toJsonSchema(resolved.value);
    if (result.ok) schemas.set(ref.key, result.schema);
    else failures.push({ key: ref.key, reason: result.reason });
  }
  return { schemas, failures };
}
