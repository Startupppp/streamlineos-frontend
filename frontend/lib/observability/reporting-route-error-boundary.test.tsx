import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils/render";
import { ReportingRouteErrorBoundary } from "./reporting-route-error-boundary";

describe("ReportingRouteErrorBoundary", () => {
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
});
