import { readdir } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function loadEsbuild() {
  try {
    return await import("esbuild");
  } catch {
    const storeDir = resolve(__dirname, "../node_modules/.pnpm");
    let entries;
    try {
      entries = await readdir(storeDir);
    } catch {
      throw new Error(
        "esbuild not found and pnpm store is missing. Run: pnpm install"
      );
    }
    const esbuildDir = entries.find(
      (e) => /^esbuild@\d/.test(e) && !e.includes("+")
    );
    if (!esbuildDir) {
      throw new Error("esbuild not found in pnpm store. Run: pnpm install");
    }
    const mainPath = resolve(
      storeDir,
      esbuildDir,
      "node_modules",
      "esbuild",
      "lib",
      "main.js"
    );
    return await import(pathToFileURL(mainPath).href);
  }
}

const apiBase =
  process.env["WIDGET_API_URL"]?.trim() ||
  process.env["NEXT_PUBLIC_API_URL"]?.trim() ||
  "";

const { build } = await loadEsbuild();

await build({
  entryPoints: [resolve(__dirname, "src/index.ts")],
  outfile: resolve(__dirname, "../public/feedbucket-widget.js"),
  bundle: true,
  minify: true,
  platform: "browser",
  target: "es2019",
  format: "iife",
  globalName: "__feedbucket__",
  define: {
    __WIDGET_API_BASE__: JSON.stringify(apiBase),
  },
  logLevel: "info",
});
