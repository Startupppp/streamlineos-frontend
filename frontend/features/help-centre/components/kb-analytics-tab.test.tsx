import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PageStateResolution } from "@/lib/page-state/resolve-page-state";
import { KbAnalyticsTab } from "./kb-analytics-tab";

const mockUseOverview = jest.fn();
const mockUsePageState = jest.fn();

jest.mock("@/hooks/api/kb/analytics", () => ({
  useKbAnalyticsOverview: () => mockUseOverview(),
}));
jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: (input: unknown) => mockUsePageState(input),
}));
jest.mock("./kb-content-gaps", () => ({
  KbContentGaps: () => <div>No content gaps</div>,
}));

beforeEach(() => {
  mockUseOverview.mockReset();
  mockUsePageState.mockReset();
  mockUseOverview.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
});

function resolve(state: PageStateResolution) {
  mockUsePageState.mockReturnValue(state);
  render(<KbAnalyticsTab />);
}

describe("Support KB analytics tab states", () => {
  it("uses the analytics permission and renders denial instead of empty-success content", () => {
    resolve({ kind: "denied", permission: "kb:analytics:view" });

    expect(mockUsePageState).toHaveBeenCalledWith({ permission: "kb:analytics:view", isLoading: false, isError: false, error: null });
    expect(screen.getByRole("status")).toHaveTextContent("Access Restricted");
    expect(screen.queryByText("No content gaps")).not.toBeInTheDocument();
  });

  it("keeps analytics content hidden while access is pending", () => {
    resolve({ kind: "loading" });

    expect(screen.queryByText("No content gaps")).not.toBeInTheDocument();
    expect(screen.queryByText("Content Gaps")).not.toBeInTheDocument();
  });

  it("shows a retry action for an overview error", async () => {
    const error = new Error("Analytics unavailable");
    const refetch = jest.fn();
    mockUseOverview.mockReturnValue({ data: undefined, isLoading: false, isError: true, error, refetch });
    resolve({ kind: "error", error });

    expect(mockUsePageState).toHaveBeenCalledWith({ permission: "kb:analytics:view", isLoading: false, isError: true, error });
    expect(screen.getByText("Analytics unavailable")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("No content gaps")).not.toBeInTheDocument();
  });
});
