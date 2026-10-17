import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { listLifecycleTriggersContract } from "@/hooks/api/crm/lifecycle-schema";
import { TriggerLogPanel } from "./trigger-log-panel";

const useLifecycleTriggers = jest.fn();
jest.mock("@/hooks/api/crm/lifecycle", () => ({
  useLifecycleTriggers: (...args: unknown[]) => useLifecycleTriggers(...args),
}));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading }: { isLoading: boolean }) => ({ kind: isLoading ? "loading" : "ready" }),
}));
jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ resolution, children }: { resolution: { kind: string }; children: ReactNode }) =>
    resolution.kind === "ready" ? <>{children}</> : <p>loading</p>,
}));

// The backend's list shape (lifecycle/dto/triggers-response.schemas.ts).
const page = listLifecycleTriggersContract.parse({
  triggers: [
    {
      customerLifecycleTriggerId: "t1",
      customerLifecycleId: "cl1",
      partyId: "p1",
      partyName: "Acme Ltd",
      kind: "renewal-due",
      termStartedOn: "2025-11-01",
      renewalOn: "2026-11-01",
      dueOn: "2026-10-01",
      riskScore: 40,
      healthScore: null,
      opportunityDealId: 77,
      attempts: 1,
      lastAttemptAt: null,
      outcome: "skipped",
      refusalStage: "guardrail",
      refusalReason: "No contact with a reachable email",
      autonomyHoldId: null,
      autonomousDecisionId: null,
      outboundMessageId: null,
      firedAt: "2026-10-01T09:00:00.000Z",
    },
  ],
  limit: 25,
  offset: 0,
  hasMore: true,
});

describe("TriggerLogPanel", () => {
  beforeEach(() => {
    useLifecycleTriggers.mockReset();
    useLifecycleTriggers.mockReturnValue({ data: page, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  });

  it("lists each firing with the customer, the loop's refusal and the opened opportunity", () => {
    render(<TriggerLogPanel locale="en-GB" />);
    expect(screen.getAllByText("Acme Ltd").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No contact with a reachable email").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Declined").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Opportunity" })[0]).toHaveAttribute("href", "/crm/deals/77");
    expect(useLifecycleTriggers).toHaveBeenLastCalledWith({ limit: 25, offset: 0 });
  });

  it("pages by offset", () => {
    render(<TriggerLogPanel locale="en-GB" />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(useLifecycleTriggers).toHaveBeenLastCalledWith({ limit: 25, offset: 25 });
  });
});
