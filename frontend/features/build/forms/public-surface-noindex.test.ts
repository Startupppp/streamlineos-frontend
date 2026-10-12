import type { Metadata } from "next";

const PUBLIC_BUILD_PAGES: readonly [string, () => Promise<{ metadata?: Metadata }>][] = [
  ["/forms/[formToken]", () => import("@/app/(public)/forms/[formToken]/page")],
  ["/intake/[projectId]", () => import("@/app/(public)/intake/[projectId]/page")],
  [
    "/intake/t/[intakeToken]",
    () => import("@/app/(public)/intake/t/[intakeToken]/page"),
  ],
];

describe("a token-reachable public build surface is not indexable, because a crawled link is a leaked link", () => {
  it.each(PUBLIC_BUILD_PAGES)(
    "%s tells crawlers not to index or follow it",
    async (_route, load) => {
      const { metadata } = await load();
      expect(metadata?.robots).toEqual({ index: false, follow: false });
    },
  );

  it("names three surfaces, so the assertion above cannot pass over an empty list", () => {
    expect(PUBLIC_BUILD_PAGES).toHaveLength(3);
  });
});
