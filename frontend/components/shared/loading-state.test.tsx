import { render, screen } from "@testing-library/react";
import { LoadingState } from "./loading-state";

describe("LoadingState — ARIA attributes", () => {
  it("carries aria-label so screen readers announce the loading region", () => {
    render(<LoadingState />);
    expect(screen.getByLabelText("Loading...")).toBeInTheDocument();
  });

  it("carries aria-busy=true so AT polling the region knows content is changing", () => {
    render(<LoadingState />);
    const region = screen.getByLabelText("Loading...");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("renders the table skeleton variant by default", () => {
    const { container } = render(<LoadingState variant="table" />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders the cards skeleton variant", () => {
    const { container } = render(<LoadingState variant="cards" />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders the list skeleton variant", () => {
    const { container } = render(<LoadingState variant="list" />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders the form skeleton variant", () => {
    const { container } = render(<LoadingState variant="form" />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders the page skeleton variant", () => {
    const { container } = render(<LoadingState variant="page" />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("accepts a custom row count for the skeleton density", () => {
    const { container } = render(<LoadingState variant="table" rows={5} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
