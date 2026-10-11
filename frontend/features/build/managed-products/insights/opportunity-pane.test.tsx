import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const scoreMutate = jest.fn();
const declineMutate = jest.fn();

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn(() => true) }));

jest.mock("@/hooks/api/build/product-discovery", () => ({
  useOpportunity: jest.fn(() => ({
    isLoading: false,
    data: {
      id: 7,
      title: "Mobile onboarding friction",
      problem: null,
      theme: null,
      affectedSegment: null,
      state: "validating",
      scoreStatus: "unscored",
      latestScore: null,
      version: 4,
      allowedActions: ["accept", "decline"],
    },
  })),
  useOpportunityTrace: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/product-discovery-mutations", () => ({
  useAcceptOpportunity: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeclineOpportunity: jest.fn(() => ({ mutate: declineMutate, isPending: false })),
  useOverrideOpportunityScore: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useScoreOpportunity: jest.fn(() => ({ mutate: scoreMutate, isPending: false })),
}));

jest.mock("./opportunity-accept-dialog", () => ({ OpportunityAcceptDialog: () => null }));
jest.mock("./opportunity-trace", () => ({ OpportunityTrace: () => null }));

import { OpportunityPane } from "./opportunity-pane";

describe("OpportunityPane — decline and score flows (BSN-PANE-ACTIONS)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("opens a reason dialog on Decline instead of declining immediately so no empty note reaches the server", async () => {
    render(<OpportunityPane managedProductId={5} opportunityId={7} onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId("decline-opportunity-btn"));
    expect(await screen.findByTestId("decline-note-input")).toBeInTheDocument();
    expect(declineMutate).not.toHaveBeenCalled();
  });

  it("declines with the typed note and the opportunity version", async () => {
    const user = userEvent.setup();
    render(<OpportunityPane managedProductId={5} opportunityId={7} onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId("decline-opportunity-btn"));
    await user.type(await screen.findByTestId("decline-note-input"), "Not a priority");
    fireEvent.click(screen.getByRole("button", { name: /^decline$/i }));
    await waitFor(() =>
      expect(declineMutate).toHaveBeenCalledWith(
        { opportunityId: 7, note: "Not a priority", expectedVersion: 4 },
        expect.any(Object),
      ),
    );
  });

  it("sends reach as a number and impact as a string so the score passes server validation", async () => {
    const user = userEvent.setup();
    render(<OpportunityPane managedProductId={5} opportunityId={7} onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId("score-opportunity-btn"));
    await user.type(await screen.findByPlaceholderText("e.g. 500"), "300");
    fireEvent.click(screen.getByRole("button", { name: /save score/i }));
    await waitFor(() =>
      expect(scoreMutate).toHaveBeenCalledWith(
        expect.objectContaining({ opportunityId: 7, reach: 300, impact: "1", expectedScoreVersion: 0 }),
        expect.any(Object),
      ),
    );
  });
});
