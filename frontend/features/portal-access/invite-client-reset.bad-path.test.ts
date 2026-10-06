import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("InviteClientDialog close resets form (P3)", () => {
  const source = readFileSync(join(__dirname, "invite-client-dialog.tsx"), "utf8");

  it("Cancel/close routes through handleOpenChange so close resets", () => {
    expect(source).toMatch(/function handleClose\(\)[\s\S]*handleOpenChange\(false\)/);
    expect(source).toMatch(/const handleOpenChange = useCallback\([\s\S]*form\.reset\(makeDefaults/);
  });
});
