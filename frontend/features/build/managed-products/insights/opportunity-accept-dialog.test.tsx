import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OpportunityAcceptDialog } from "./opportunity-accept-dialog";

const noop = jest.fn();

describe("OpportunityAcceptDialog — form submission (BSN-ACCEPT-DIALOG)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls onAccept with the default horizon 'next' and expectedVersion when submitted without changes so a roadmap item is created at the expected version", async () => {
    const handleAccept = jest.fn();
    render(
      <OpportunityAcceptDialog
        open
        onOpenChange={noop}
        opportunityTitle="Mobile onboarding friction"
        expectedVersion={2}
        isSubmitting={false}
        onAccept={handleAccept}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /^accept$/i }));

    await waitFor(() => {
      expect(handleAccept).toHaveBeenCalledWith(
        expect.objectContaining({
          horizon: "next",
          expectedVersion: 2,
        }),
        expect.any(Object),
      );
    });
  });

  it("renders the project select trigger when projects are provided so the user can link to an existing project", () => {
    render(
      <OpportunityAcceptDialog
        open
        onOpenChange={noop}
        opportunityTitle="Improve search"
        expectedVersion={1}
        projects={[
          { id: 42, name: "Platform Q3" },
          { id: 99, name: "Growth H2" },
        ]}
        isSubmitting={false}
        onAccept={noop}
      />,
    );

    expect(screen.getByTestId("project-select")).toBeInTheDocument();
  });

  it("does not render the project select when no projects are provided so the form stays minimal", () => {
    render(
      <OpportunityAcceptDialog
        open
        onOpenChange={noop}
        opportunityTitle="Improve search"
        expectedVersion={1}
        projects={[]}
        isSubmitting={false}
        onAccept={noop}
      />,
    );

    expect(screen.queryByTestId("project-select")).not.toBeInTheDocument();
  });
});
