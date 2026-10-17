import { releaseFormSchema } from "./release-form-schema";

const BASE = {
  name: "Q3 Launch",
  status: "draft" as const,
};

describe("releaseFormSchema version — arbitrary text accepted as version until VERSION_RE-only guard", () => {
  it("rejects free text that looks like a name, not a version", () => {
    const result = releaseFormSchema.safeParse({ ...BASE, version: "hello world" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const versionIssue = result.error.issues.find((i) => i.path.includes("version"));
      expect(versionIssue).toBeDefined();
    }
  });

  it("rejects a string of only letters", () => {
    const result = releaseFormSchema.safeParse({ ...BASE, version: "release" });
    expect(result.success).toBe(false);
  });

  it("accepts semver format 1.4.0", () => {
    const result = releaseFormSchema.safeParse({ ...BASE, version: "1.4.0" });
    expect(result.success).toBe(true);
  });

  it("accepts semver with v prefix v2.0.0-beta", () => {
    const result = releaseFormSchema.safeParse({ ...BASE, version: "v2.0.0-beta" });
    expect(result.success).toBe(true);
  });

  it("accepts calendar version 2026.09", () => {
    const result = releaseFormSchema.safeParse({ ...BASE, version: "2026.09" });
    expect(result.success).toBe(true);
  });

  it("accepts calendar version with patch 2026.09.1", () => {
    const result = releaseFormSchema.safeParse({ ...BASE, version: "2026.09.1" });
    expect(result.success).toBe(true);
  });
});
