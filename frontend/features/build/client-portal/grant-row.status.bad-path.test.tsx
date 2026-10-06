import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("GrantRow status labels", () => {
  const source = readFileSync(
    join(__dirname, "grant-row.tsx"),
    "utf8",
  );

  it("does not render raw lowercase grant.status as the only badge label", () => {
    expect(source).not.toMatch(/grant\.status\.toLowerCase\(\)/);
  });

  it("maps ACTIVE/SUSPENDED/REVOKED/EXPIRED to human labels", () => {
    expect(source).toMatch(/ACTIVE:\s*"Active"/);
    expect(source).toMatch(/SUSPENDED:\s*"Suspended"/);
    expect(source).toMatch(/REVOKED:\s*"Revoked"/);
    expect(source).toMatch(/EXPIRED:\s*"Expired"/);
  });
});
