import { readFileSync } from "node:fs";
import { join } from "node:path";

const main = readFileSync(join(__dirname, "ticket-detail-main-section.tsx"), "utf8");
const detail = readFileSync(join(__dirname, "use-ticket-detail.ts"), "utf8");

describe("Ticket title edit commit contract (F2)", () => {
  it("places the caret at the end when entering edit", () => {
    expect(main).toMatch(/setSelectionRange/);
  });

  it("does not call debouncedSave from handleTitleChange", () => {
    expect(detail).toMatch(/handleTitleChange[\s\S]*?setLocalTitle/);
    const changeFn = detail.match(
      /const handleTitleChange = useCallback\(\s*\([^)]*\)\s*=>\s*\{([^}]+)\}/,
    );
    expect(changeFn?.[1] ?? "").not.toMatch(/debouncedSave|enqueueSave|autoSave/);
  });

  it("only saves title through commitTitle", () => {
    expect(detail).toMatch(/debouncedSave\(\{\s*title:/);
    expect(detail).toMatch(/commitTitle/);
  });
});
