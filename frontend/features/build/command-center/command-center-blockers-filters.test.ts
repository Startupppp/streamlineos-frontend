import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("BlockersPanel filters", () => {
  it("does not send hasBlocker (rejected by all-work strict schema)", () => {
    const source = readFileSync(
      join(__dirname, "command-center-blockers-panel.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/hasBlocker/);
    expect(source).toMatch(/scope:\s*"blocked"/);
  });
});
