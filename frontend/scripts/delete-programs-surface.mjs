import { rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  join(root, "app", "(authenticated)", "projects", "programs"),
  join(root, "features", "projects", "portfolios", "programs-page.tsx"),
  join(root, "features", "projects", "portfolios", "program-detail-page.tsx"),
  join(root, "features", "projects", "portfolios", "program-form-sheet.tsx"),
];

for (const target of targets) {
  if (!existsSync(target)) {
    console.log("skip (missing):", target);
    continue;
  }
  rmSync(target, { recursive: true, force: true });
  console.log("deleted:", target);
}

const selfPath = fileURLToPath(import.meta.url);
rmSync(selfPath, { force: true });
console.log("deleted:", selfPath);
