import React from "react";
import { render, screen } from "@testing-library/react";

const useCandidateIdentity = jest.fn();

jest.mock("@/hooks/api/hr/recruitment/identity", () => ({
  useCandidateIdentity: () => useCandidateIdentity(),
}));

import { IdentityCard } from "../identity-card";

function view(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      candidateId: 1,
      status: "NOT_STARTED",
      reference: null,
      last4: null,
      verifiedAt: null,
      requiredByAJob: false,
      providerBlockedReason: null,
      ...overrides,
    },
    isLoading: false,
    isError: false,
  };
}

describe("IdentityCard", () => {
  afterEach(() => {
    useCandidateIdentity.mockReset();
  });

  it("does not say a candidate failed when the check could not be run", () => {
    useCandidateIdentity.mockReturnValue(
      view({ status: "UNAVAILABLE", requiredByAJob: true }),
    );
    render(<IdentityCard candidateId={1} />);

    expect(screen.getByText("Could not be checked")).toBeInTheDocument();
    expect(screen.queryByText("Did not pass")).toBeNull();
  });

  it("says a failed check failed", () => {
    useCandidateIdentity.mockReturnValue(view({ status: "FAILED", requiredByAJob: true }));
    render(<IdentityCard candidateId={1} />);

    expect(screen.getByText("Did not pass")).toBeInTheDocument();
  });

  it("explains that the offer is blocked when the role requires a check", () => {
    useCandidateIdentity.mockReturnValue(view({ status: "PENDING", requiredByAJob: true }));
    render(<IdentityCard candidateId={1} />);

    expect(screen.getByText(/cannot be finalised until the check passes/)).toBeInTheDocument();
  });

  it("says nothing about a block once the candidate is verified", () => {
    useCandidateIdentity.mockReturnValue(
      view({ status: "VERIFIED", requiredByAJob: true, last4: "9012" }),
    );
    render(<IdentityCard candidateId={1} />);

    expect(screen.queryByText(/cannot be finalised/)).toBeNull();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows the suffix masked and never a full number", () => {
    useCandidateIdentity.mockReturnValue(
      view({ status: "VERIFIED", requiredByAJob: true, last4: "9012" }),
    );
    render(<IdentityCard candidateId={1} />);

    expect(screen.getByText("••••9012")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\d{8,}/);
  });

  it("renders nothing when nothing requires it and nothing has happened", () => {
    useCandidateIdentity.mockReturnValue(view());
    const { container } = render(<IdentityCard candidateId={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing on a failed read rather than an error card", () => {
    useCandidateIdentity.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    const { container } = render(<IdentityCard candidateId={1} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("passes the provider's own reason through", () => {
    useCandidateIdentity.mockReturnValue(
      view({
        status: "UNAVAILABLE",
        requiredByAJob: true,
        providerBlockedReason: "Identity verification is not available yet.",
      }),
    );
    render(<IdentityCard candidateId={1} />);

    expect(screen.getByText("Identity verification is not available yet.")).toBeInTheDocument();
  });
});
