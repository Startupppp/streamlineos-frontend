import { resolveRoutingRuleOrder } from "./routing-page";
import type { SupportRoutingRule } from "@/hooks/api/support/macros";

function rule(id: number): SupportRoutingRule {
  return {
    id,
    orgId: "org-1",
    name: `Rule ${id}`,
    conditions: [],
    assigneeMembershipId: null,
    setPriority: null,
    assignmentMode: "static",
    candidateAgentIds: [],
    requiredSkills: [],
    isEnabled: true,
    sortOrder: id,
    createdBy: null,
    createdAt: "2026-10-09T00:00:00.000Z",
    updatedAt: "2026-10-09T00:00:00.000Z",
  };
}

it("keeps a local reorder while identities match and accepts server order when membership changes", () => {
  expect(resolveRoutingRuleOrder([rule(1), rule(2)], [2, 1]).map((item) => item.id)).toEqual([2, 1]);
  expect(resolveRoutingRuleOrder([rule(3), rule(1)], [2, 1]).map((item) => item.id)).toEqual([3, 1]);
});
