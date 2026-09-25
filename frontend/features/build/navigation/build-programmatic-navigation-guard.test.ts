import { readFileSync } from "node:fs";
import { join } from "node:path";

const GUARDED_NAVIGATION_FILES = [
  "cycles/cycle-detail-page.tsx",
  "feedbucket/project-submissions-inbox.tsx",
  "managed-products/product-feedback-page.tsx",
  "project-list/project-card.tsx",
  "project-list/project-table.tsx",
  "triage/triage-page.tsx",
  "views/gantt-view.tsx",
  "views/use-board-navigation-actions.ts",
] as const;

describe("BSN-04-A03 Build programmatic navigation guard", () => {
  it.each(GUARDED_NAVIGATION_FILES)(
    "%s routes every direct router.push through requestLeave",
    (relativePath) => {
      const source = readFileSync(
        join(process.cwd(), "features", "build", relativePath),
        "utf8",
      );
      const pushCount = source.match(/router\.push\s*\(/g)?.length ?? 0;
      const guardedPushCount =
        source.match(/requestLeave\(\s*\(\)\s*=>[\s\S]*?router\.push\s*\(/g)
          ?.length ?? 0;

      expect(pushCount).toBeGreaterThan(0);
      expect(guardedPushCount).toBe(pushCount);
    },
  );
});
