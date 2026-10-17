import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { ReportingRouteErrorBoundary } from "./reporting-route-error-boundary";

const mockRefresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mockRefresh }) }));

describe("ReportingRouteErrorBoundary", () => {
  beforeEach(() => mockRefresh.mockClear());

  it("classifies chunk-load errors without a ReferenceError", () => {
    const error = new Error("Loading chunk 12 failed") as Error & {
      digest?: string;
    };
    error.digest = "wiki";

    renderWithProviders(
      <ReportingRouteErrorBoundary error={error} reset={jest.fn()} />,
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("refetches the server payload on retry, so a server-thrown error is actually retried", () => {
    const reset = jest.fn();
    renderWithProviders(
      <ReportingRouteErrorBoundary error={new Error("server render failed")} reset={reset} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
