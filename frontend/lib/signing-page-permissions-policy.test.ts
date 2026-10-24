/** @jest-environment node */
import nextConfig from "../next.config";

const TOKEN = "a".repeat(64);

async function permissionsPolicyRules() {
  const rules = (await nextConfig.headers?.()) ?? [];
  return rules.flatMap((rule) =>
    rule.headers.filter((header) => header.key === "Permissions-Policy").map((header) => ({ source: rule.source, value: header.value })),
  );
}

describe("the public signing page asks for no device access", () => {
  it("turns off camera, microphone and location on the signing link, after the site-wide rule so it wins", async () => {
    const rules = await permissionsPolicyRules();
    const signing = rules.findIndex((rule) => rule.source.startsWith("/sign/:recipientToken"));
    const siteWide = rules.findIndex((rule) => rule.source === "/(.*)");

    expect(signing).toBeGreaterThan(siteWide);
    expect(rules[signing]?.value).toBe("camera=(), microphone=(), geolocation=()");
    expect(new RegExp(`^/sign/${"[0-9a-fA-F]{64}"}$`).test(`/sign/${TOKEN}`)).toBe(true);
  });

  it("keeps the site-wide policy for the app, where live voice needs the microphone", async () => {
    const rules = await permissionsPolicyRules();

    expect(rules.find((rule) => rule.source === "/(.*)")?.value).toContain("microphone=(self)");
  });
});
