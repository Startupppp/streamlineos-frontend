import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const scoreMutate = jest.fn();
const declineMutate = jest.fn();
const updateMutate = jest.fn();

const VALIDATING_ACTIONS = ["view", "edit", "score", "add_evidence", "accept", "decline", "delete"];
const IDENTIFIED_ACTIONS = ["view", "edit", "score", "add_evidence", "delete"];
const DECLINED_ACTIONS = ["view"];

let mockOpportunity: Record<string, unknown> = {};

function setOpportunity(state: string, allowedActions: string[]) {
  mockOpportunity = {
    id: 7,
    title: "Mobile onboarding friction",
    problem: null,
    theme: null,
    affectedSegment: null,
    state,
    scoreStatus: "unscored",
    latestScore: null,
    version: 4,
    allowedActions,
  };
}

jest.mock("@/hooks/api/access", () => ({ useCan: jest.fn(() => true) }));

jest.mock("@/hooks/api/build/product-discovery", () => ({
  useOpportunity: jest.fn(() => ({ isLoading: false, data: mockOpportunity })),
  useOpportunityTrace: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/build/product-discovery-mutations", () => ({
  useAcceptOpportunity: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useDeclineOpportunity: jest.fn(() => ({ mutate: declineMutate, isPending: false })),
  useOverrideOpportunityScore: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useScoreOpportunity: jest.fn(() => ({ mutate: scoreMutate, isPending: false })),
  useUpdateOpportunity: jest.fn(() => ({ mutate: updateMutate, isPending: false })),
}));

jest.mock("./opportunity-accept-dialog", () => ({ OpportunityAcceptDialog: () => null }));
jest.mock("./opportunity-trace", () => ({ OpportunityTrace: () => null }));

import { OpportunityPane } from "./opportunity-pane";

describe("OpportunityPane — decline and score flows (BSN-PANE-ACTIONS)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOpportunity("validating", VALIDATING_ACTIONS);
  });

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

describe("OpportunityPane — moving an identified opportunity into validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setOpportunity("identified", IDENTIFIED_ACTIONS);
  });

  it("offers Start validating instead of Accept or Decline while the opportunity is only identified", () => {
    render(<OpportunityPane managedProductId={5} opportunityId={7} onClose={jest.fn()} />);
    expect(screen.getByTestId("start-validating-opportunity-btn")).toBeInTheDocument();
    expect(screen.queryByTestId("accept-opportunity-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("decline-opportunity-btn")).not.toBeInTheDocument();
  });

  it("patches the state to validating with the current version", () => {
    render(<OpportunityPane managedProductId={5} opportunityId={7} onClose={jest.fn()} />);
    fireEvent.click(screen.getByTestId("start-validating-opportunity-btn"));
    expect(updateMutate).toHaveBeenCalledWith(
      { opportunityId: 7, version: 4, state: "validating" },
      expect.any(Object),
    );
  });

  it("hides scoring and validation once the opportunity is declined because the server refuses them", () => {
    setOpportunity("declined", DECLINED_ACTIONS);
    render(<OpportunityPane managedProductId={5} opportunityId={7} onClose={jest.fn()} />);
    expect(screen.queryByTestId("start-validating-opportunity-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("score-opportunity-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("override-score-btn")).not.toBeInTheDocument();
  });
});
