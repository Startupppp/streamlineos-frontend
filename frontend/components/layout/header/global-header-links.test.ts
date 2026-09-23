import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(__dirname, "global-header.tsx"), "utf8");

describe("global header action hierarchy", () => {
  it("does not duplicate calendar and chat navigation in the global action rail", () => {
    expect(source).not.toContain('href: "/calendar"');
    expect(source).not.toContain('href: "/chat"');
  });

  it("keeps search and create reachable in the mobile header", () => {
    expect(source).toContain("<SearchButton compact />");
    expect(source).toContain("<QuickCreateButton compact />");
  });

  it("keeps icon-only search and create controls labelled", () => {
    expect(source).toContain('aria-label="Search (⌘K)"');
    const quickCreate = readFileSync(join(__dirname, "quick-create-button.tsx"), "utf8");
    expect(quickCreate).toContain('aria-label={compact ? "Create" : undefined}');
  });
});
