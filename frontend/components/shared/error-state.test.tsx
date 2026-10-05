import { fireEvent, render, screen } from "@testing-library/react";
import { ApiError } from "@/lib/api-envelope";
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

describe("ErrorState — request reference", () => {
  const failure = new ApiError("Boom", 500, "INTERNAL", { correlationId: "req-7f3a91" }, "/hr/documents");

  it("shows the request id of the failed call so it can be quoted to support", () => {
    render(<ErrorState error={failure} />);

    expect(screen.getByText("req-7f3a91")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copy/i })).toBeInTheDocument();
  });

  it("copies the id to the clipboard and says so", async () => {
    const writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ErrorState error={failure} />);

    fireEvent.click(screen.getByRole("button", { name: /copy/i }));

    expect(writeText).toHaveBeenCalledWith("req-7f3a91");
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument();
  });

  it("shows no reference line for an error that carries no id, or none at all", () => {
    const { rerender } = render(<ErrorState error={new Error("offline")} />);
    expect(screen.queryByText(/reference/i)).not.toBeInTheDocument();

    rerender(<ErrorState />);
    expect(screen.queryByText(/reference/i)).not.toBeInTheDocument();
  });
});

describe("ErrorState — HTTP status code mapping (autoMapStatus)", () => {
  it("maps a 409 error to a conflict title with a reload message", () => {
    const conflict = new ApiError("Conflict", 409, "CONFLICT", {}, "/build/tickets/1");
    render(<ErrorState error={conflict} autoMapStatus />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Conflict")).toBeInTheDocument();
    expect(screen.getByText(/someone else updated/i)).toBeInTheDocument();
  });

  it("maps a 403 error to a permission-denied message", () => {
    const denied = new ApiError("Forbidden", 403, "FORBIDDEN", {}, "/build/tickets/1");
    render(<ErrorState error={denied} autoMapStatus />);
    expect(screen.getByText("Permission denied")).toBeInTheDocument();
    expect(screen.getByText(/permission to perform/i)).toBeInTheDocument();
  });

  it("maps a 422 error to a validation-failed message", () => {
    const validation = new ApiError("Unprocessable", 422, "VALIDATION", {}, "/build/tickets/1");
    render(<ErrorState error={validation} autoMapStatus />);
    expect(screen.getByText("Validation failed")).toBeInTheDocument();
    expect(screen.getByText(/highlighted fields/i)).toBeInTheDocument();
  });

  it("maps a 503 error to a service-unavailable message", () => {
    const unavailable = new ApiError("Unavailable", 503, "SERVICE_UNAVAILABLE", {}, "/build");
    render(<ErrorState error={unavailable} autoMapStatus />);
    expect(screen.getByText("Service unavailable")).toBeInTheDocument();
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
  });

  it("falls back to generic title when error is not an ApiError", () => {
    render(<ErrorState error={new Error("network error")} autoMapStatus />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("respects an explicit title even when autoMapStatus is true", () => {
    const conflict = new ApiError("Conflict", 409, "CONFLICT", {}, "/build");
    render(<ErrorState error={conflict} autoMapStatus title="Custom title" />);
    expect(screen.getByText("Custom title")).toBeInTheDocument();
  });

  it("carries role=alert and aria-live=assertive so errors are announced immediately", () => {
    render(<ErrorState autoMapStatus error={new ApiError("Bad", 422, "VAL", {}, "/")} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
  });
});
