import * as reportsSchema from "./reports-schema";

describe("reports-schema — does not shadow workspace-schema's analyticsContract", () => {
  it("does not re-export analyticsContract, which would give /build/:projectId/analytics two competing frontend contracts", () => {
    expect("analyticsContract" in reportsSchema).toBe(false);
  });
});
