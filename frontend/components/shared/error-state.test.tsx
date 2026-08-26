import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorState } from "./error-state";

describe("ErrorState — accessibility", () => {
  it("carries role=alert so the error is announced immediately by screen readers", () => {
    render(<ErrorState />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("renders the default title inside the alert region", () => {
    render(<ErrorState />);
    expect(
      screen.getByText("Something went wrong"),
    ).toBeInTheDocument();
  });

  it("renders a custom title and description", () => {
    render(
      <ErrorState
        title="Could not load employees"
        description="The server returned a 503. Check your connection and try again."
      />,
    );
    expect(screen.getByText("Could not load employees")).toBeInTheDocument();
    expect(
      screen.getByText("The server returned a 503. Check your connection and try again."),
    ).toBeInTheDocument();
  });

  it("renders a retry button that calls onRetry when clicked", () => {
    const handleRetry = jest.fn();
    render(<ErrorState onRetry={handleRetry} />);

    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeInTheDocument();

    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the retry button when onRetry is not provided", () => {
    render(<ErrorState />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders in compact mode without the full-height flex-1 structure", () => {
    const { container } = render(<ErrorState compact />);
    expect(container.firstElementChild).not.toHaveClass("flex-1");
  });
});
