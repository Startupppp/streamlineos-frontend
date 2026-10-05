import { fireEvent, render, screen } from "@testing-library/react";
import { GenerationFailureStage } from "./generation-failure-stage";

describe("GenerationFailureStage product plan recovery", () => {
  it("offers product selection instead of retrying the unchanged locked selection", () => {
    const onBackToProducts = jest.fn();
    const onRetry = jest.fn();
    render(
      <GenerationFailureStage
        workspaceLabel="Acme"
        setupError={{
          kind: "module-not-in-plan",
          message: "Inventory is not available on your plan.",
        }}
        onRetry={onRetry}
        onBackToProducts={onBackToProducts}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Inventory is not available on your plan.");
    expect(screen.getByText(/your answers and invitations are saved/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Products" }));
    expect(onBackToProducts).toHaveBeenCalledTimes(1);
    expect(onRetry).not.toHaveBeenCalled();
  });

  it("keeps ordinary setup failures on the retry path", () => {
    const onRetry = jest.fn();
    render(
      <GenerationFailureStage
        workspaceLabel="Acme"
        setupError={{ kind: "setup-failed", message: "Please try again." }}
        onRetry={onRetry}
        onBackToProducts={jest.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Back to Products" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not present an existing organization as ready after a plan lock", () => {
    const onOpenOrganization = jest.fn();
    const onGoToInvitations = jest.fn();
    render(
      <GenerationFailureStage
        workspaceLabel="Acme"
        setupError={{
          kind: "module-not-in-plan",
          message: "Inventory is not available on your plan.",
        }}
        onRetry={jest.fn()}
        onBackToProducts={jest.fn()}
        onOpenOrganization={onOpenOrganization}
        onGoToInvitations={onGoToInvitations}
      />,
    );

    expect(screen.getByRole("heading", { name: "We couldn't finish setting up Acme" })).toBeInTheDocument();
    expect(screen.queryByText("Acme is ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open organization" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Invite from People" })).not.toBeInTheDocument();
    expect(onOpenOrganization).not.toHaveBeenCalled();
    expect(onGoToInvitations).not.toHaveBeenCalled();
  });
});
