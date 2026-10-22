import nextConfig from "@/next.config";

describe("legacy /hr/recruitment URLs", () => {
  it("redirect permanently to the same path under /recruitment", async () => {
    const redirects = (await nextConfig.redirects?.()) ?? [];
    const bySource = (source: string) => redirects.find((entry) => entry.source === source);

    expect(bySource("/hr/recruitment")).toMatchObject({ destination: "/recruitment", permanent: true });
    expect(bySource("/hr/recruitment/:path*")).toMatchObject({
      destination: "/recruitment/:path*",
      permanent: true,
    });
  });
});
