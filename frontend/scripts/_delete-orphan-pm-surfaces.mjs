import { rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const targets = [
  "app/(authenticated)/projects/resource-allocation",
  "app/(authenticated)/projects/whiteboards",
  "features/projects/resource-allocation",
];

for (const rel of targets) {
  const abs = join(root, rel);
  try {
    rmSync(abs, { recursive: true, force: true });
    console.log("deleted", rel);
  } catch (err) {
    console.error("failed", rel, err);
    process.exitCode = 1;
  }
}
