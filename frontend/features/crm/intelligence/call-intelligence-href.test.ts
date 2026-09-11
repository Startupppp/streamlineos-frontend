import { existsSync } from "node:fs";
import { join } from "node:path";
import { CALL_INTELLIGENCE_ROUTE, callIntelligenceHref } from "./call-intelligence-href";

/**
 * CRM-P1-18. The deep link and the page that answers it, held together.
 *
 * The timeline offers "Open" beside a call analysis, and the failure worth
 * catching is not that the page renders badly — it is that the link points at
 * an address nothing serves any more, which type-checks perfectly and shows a
 * 404 only to whoever follows it.
 */
describe("call intelligence deep link", () => {
  it("builds the address the timeline links to", () => {
    expect(callIntelligenceHref(4821)).toBe("/crm/intelligence/4821");
    expect(callIntelligenceHref("4821")).toBe("/crm/intelligence/4821");
  });

  it("resolves to a route that exists on disk", () => {
    /**
     * Reads the filesystem on purpose. Next resolves routes by folder, so no
     * amount of type-checking notices a page that was moved or renamed — the
     * only thing that does is looking.
     */
    const root = join(__dirname, "..", "..", "..");
    expect(existsSync(join(root, CALL_INTELLIGENCE_ROUTE, "page.tsx"))).toBe(true);
  });

  it("keeps the route's dynamic segment named as the href's variable part", () => {
    /**
     * `[activityId]` and not `[id]`: the backend route is
     * `crm/calls/:activityId/analysis`, and CLAUDE.md requires the folder, the
     * param and the variable to agree so a rename cannot half-land.
     */
    expect(CALL_INTELLIGENCE_ROUTE.endsWith("[activityId]")).toBe(true);
  });
});
