import { readFileSync } from "node:fs";
import { join } from "node:path";

const detail = readFileSync(join(__dirname, "use-ticket-detail.ts"), "utf8");

describe("Ticket title edit must not reset on refetch (E4)", () => {
  it("does not version localTitle by updatedAt (refetch would wipe typing)", () => {
    expect(detail).not.toMatch(
      /titleVersion\s*=\s*ticket\s*\?\s*`\$\{ticket\.id\}:\$\{ticket\.updatedAt\}/,
    );
  });

  it("versions title override by id and title only, or holds while editing", () => {
    const hasStableVersion =
      /titleVersion\s*=\s*ticket\s*\?\s*`\$\{ticket\.id\}:\$\{ticket\.title\}`/.test(
        detail,
      );
    const hasHold = /useSourceOverride\([^)]+,\s*true\s*\)/.test(detail);
    expect(hasStableVersion || hasHold).toBe(true);
  });
});
