import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createMutate = jest.fn();
const mockUseCan = jest.fn(() => true);

jest.mock("@/hooks/api/access", () => ({ useCan: () => mockUseCan() }));
jest.mock("@/hooks/api/build/opportunity-mutations", () => ({
  useCreateOpportunity: jest.fn(() => ({ mutate: createMutate, isPending: false })),
}));

import { OpportunityCreateButton } from "./opportunity-create-sheet";

describe("OpportunityCreateButton — create opportunity (BSN-OPP-CREATE)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCan.mockReturnValue(true);
  });

  it("opens the form without creating anything so nothing is saved until the user confirms", async () => {
    render(<OpportunityCreateButton managedProductId={5} />);
    fireEvent.click(screen.getByTestId("new-opportunity-btn"));
    expect(await screen.findByPlaceholderText("e.g. Mobile onboarding friction")).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("marks the required title visually without adding the asterisk to its accessible name", async () => {
    render(<OpportunityCreateButton managedProductId={5} />);
    fireEvent.click(screen.getByTestId("new-opportunity-btn"));
    const title = await screen.findByRole("textbox", { name: "Title" });
    const label = title.labels?.[0];
    expect(label?.querySelector(".text-destructive")).toHaveTextContent("*");
    expect(label?.textContent).toBe("Title *");
  });

  it("creates with the title and only the optional fields the user filled in", async () => {
    const user = userEvent.setup();
    render(<OpportunityCreateButton managedProductId={5} />);
    fireEvent.click(screen.getByTestId("new-opportunity-btn"));
    await user.type(await screen.findByPlaceholderText("e.g. Mobile onboarding friction"), "Slow exports");
    await user.type(screen.getByPlaceholderText("e.g. Onboarding"), "Reporting");
    fireEvent.click(screen.getByRole("button", { name: /create opportunity/i }));
    await waitFor(() =>
      expect(createMutate).toHaveBeenCalledWith({ title: "Slow exports", theme: "Reporting" }, expect.any(Object)),
    );
  });

  it("blocks submission without a title", async () => {
    render(<OpportunityCreateButton managedProductId={5} />);
    fireEvent.click(screen.getByTestId("new-opportunity-btn"));
    fireEvent.click(await screen.findByRole("button", { name: /create opportunity/i }));
    expect(await screen.findByText("Title is required")).toBeInTheDocument();
    expect(createMutate).not.toHaveBeenCalled();
  });

  it("hides the button for users who cannot update the product", () => {
    mockUseCan.mockReturnValue(false);
    render(<OpportunityCreateButton managedProductId={5} />);
    expect(screen.queryByTestId("new-opportunity-btn")).not.toBeInTheDocument();
  });
});
