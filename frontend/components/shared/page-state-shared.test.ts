import { humanizeLimitKey } from "./page-state-shared";

describe("humanizeLimitKey never shows a raw camelCase plan key", () => {
  it.each([
    ["hrCandidates", "HR candidates"],
    ["hrJobPostings", "HR job postings"],
    ["crmClients", "CRM clients"],
    ["kbPages", "KB pages"],
    ["members", "Members"],
  ])("labels %s as %s", (key, label) => {
    expect(humanizeLimitKey(key)).toBe(label);
  });

  it("humanizes a key the label map does not know yet", () => {
    expect(humanizeLimitKey("aiAgentRuns")).toBe("AI agent runs");
    expect(humanizeLimitKey("inventoryWarehouses")).toBe("Inventory warehouses");
  });
});
