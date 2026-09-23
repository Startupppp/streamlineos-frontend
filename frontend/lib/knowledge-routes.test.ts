import {
  pageHistoryHref,
  pageHref,
} from "./knowledge-routes";

describe("knowledge wiki page URLs", () => {
  it("uses /knowledge/wiki/doc/:pageId so Next.js does not treat the segment as the pages router", () => {
    expect(pageHref(5)).toBe("/knowledge/wiki/doc/5");
    expect(pageHistoryHref(5)).toBe("/knowledge/wiki/doc/5/history");
    expect(pageHref(5)).not.toContain("/pages/");
  });
});
