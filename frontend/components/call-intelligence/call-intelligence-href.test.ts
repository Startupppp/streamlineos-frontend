import { existsSync } from "node:fs";
import { join } from "node:path";
import { CALL_INTELLIGENCE_ROUTE, callIntelligenceHref } from "./call-intelligence-href";

describe("call intelligence deep link", () => {
  it("builds the address the timeline links to", () => {
    expect(callIntelligenceHref(4821)).toBe("/crm/intelligence/4821");
    expect(callIntelligenceHref("4821")).toBe("/crm/intelligence/4821");
  });

  it("resolves to a route that exists on disk", () => {
    const root = process.cwd();
    expect(existsSync(join(root, CALL_INTELLIGENCE_ROUTE, "page.tsx"))).toBe(true);
  });

  it("keeps the route's dynamic segment named as the href's variable part", () => {
    expect(CALL_INTELLIGENCE_ROUTE.endsWith("[activityId]")).toBe(true);
  });
});
