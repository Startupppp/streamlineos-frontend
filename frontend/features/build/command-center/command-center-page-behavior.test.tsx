import { act, fireEvent, render, screen } from "@testing-library/react";
import "./command-center-page-test-harness";
import { mockRouterPush, mockUseDashboardLayout } from "./command-center-page-test-harness";
import {
  installCommandCenterMocks,
  mockUseCan,
  mockUseAccess,
  ACCESS_GRANTED,
  mockUseProjects,
  mockUseInfiniteAllWork,
  baseProjectsResult,
  baseInfiniteResult,
} from "./command-center-page-test-fixtures";
import { CommandCenterPage } from "./command-center-page";
import { ApiError } from "@/lib/api-envelope";

beforeEach(installCommandCenterMocks);

describe("CommandCenterPage — FE-41: error forwarding to usePageState", () => {
  it("shows the page-level error state and hides all panels when the projects query fails with a 500 so a broken query is not silently swallowed as an empty dashboard", () => {
    mockUseProjects.mockReturnValue(
      baseProjectsResult({
        data: undefined,
        isError: true,
        error: new ApiError("Internal server error", 500, "INTERNAL_ERROR"),
      }),
    );
    render(<CommandCenterPage />);
    expect(screen.getByTestId("error-state")).toBeInTheDocument();
    expect(screen.queryByTestId("my-issues-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("projects-panel")).not.toBeInTheDocument();
  });

  it("renders all panels without an error state when the projects query succeeds — positive control for the 500 error test above", () => {
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("error-state")).not.toBeInTheDocument();
    expect(screen.getByTestId("my-issues-panel")).toBeInTheDocument();
    expect(screen.getByTestId("projects-panel")).toBeInTheDocument();
  });
});

describe("CommandCenterPage — Enter opens the focused personal-queue row", () => {
  function keyboardOptions() {
    const { useBuildListKeyboard } = jest.requireMock(
      "@/hooks/common/use-build-list-keyboard",
    ) as { useBuildListKeyboard: jest.Mock };
    return useBuildListKeyboard.mock.calls.at(-1)?.[0] as {
      itemCount: number;
      onOpen: (index: number) => void;
    };
  }

  function renderWithOneIssue() {
    mockUseInfiniteAllWork.mockReturnValue(
      baseInfiniteResult({
        data: {
          pages: [
            {
              data: [
                {
                  id: 11,
                  ticketNumber: 3,
                  title: "Fix the thing",
                  status: "TODO",
                  priority: "HIGH",
                  type: "TASK",
                  projectId: 1,
                  projectKey: "P",
                  projectName: "Proj",
                  dueDate: null,
                  assigneeId: null,
                },
              ],
              total: 1,
            },
          ],
        },
      }),
    );
    render(<CommandCenterPage />);
  }

  it("counts the personal-queue rows for j/k, so the cursor has something to move over", () => {
    renderWithOneIssue();
    expect(keyboardOptions().itemCount).toBe(1);
  });

  it("navigates to the focused issue when Enter fires, so the shortcut is not a no-op handler", () => {
    renderWithOneIssue();
    act(() => {
      keyboardOptions().onOpen(0);
    });
    expect(mockRouterPush).toHaveBeenCalledWith("/build/1/tickets/T-1");
  });

  it("navigates nowhere when the focused index is past the end of the queue", () => {
    renderWithOneIssue();
    act(() => {
      keyboardOptions().onOpen(9);
    });
    expect(mockRouterPush).not.toHaveBeenCalled();
  });
});

function withoutScope(key: string) {
  const scopes: Record<string, string> = { ...ACCESS_GRANTED.data.scopes };
  delete scopes[key];
  mockUseAccess.mockReturnValue({ ...ACCESS_GRANTED, data: { ...ACCESS_GRANTED.data, scopes } });
}

describe("CommandCenterPage — permission-gated widgets", () => {
  it("hides the approvals and agent-runs widgets when the actor lacks build:approvals:view — paired with the granted test below", () => {
    withoutScope("build:approvals:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("approvals-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-runs-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("releases-panel")).toBeInTheDocument();
  });

  it("shows the approvals and agent-runs widgets when the actor has build:approvals:view — paired with the denied test above", () => {
    render(<CommandCenterPage />);
    expect(screen.getByTestId("approvals-panel")).toBeInTheDocument();
    expect(screen.getByTestId("agent-runs-panel")).toBeInTheDocument();
  });

  it("hides the risks widget when the actor lacks build:risks:view — paired with the granted test below", () => {
    withoutScope("build:risks:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("risks-panel")).not.toBeInTheDocument();
  });

  it("shows the risks widget when the actor has build:risks:view — paired with the denied test above", () => {
    render(<CommandCenterPage />);
    expect(screen.getByTestId("risks-panel")).toBeInTheDocument();
  });

  it("shows the blockers and my-issues widgets when the actor has build:tickets:view — paired with the hidden test below", () => {
    render(<CommandCenterPage />);
    expect(screen.getByTestId("blockers-panel")).toBeInTheDocument();
    expect(screen.getByTestId("my-issues-panel")).toBeInTheDocument();
  });

  it("hides the blockers and my-issues widgets when the actor lacks build:tickets:view — paired with the shown test above", () => {
    withoutScope("build:tickets:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("blockers-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("my-issues-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("projects-panel")).toBeInTheDocument();
  });
});

describe("CommandCenterPage — customize controls", () => {
  const savedLayout = { layoutVersion: 0, config: { widgets: [] }, updatedAt: "2026-10-06T00:00:00Z" };

  it("shows the Customize control once the saved layout has loaded and the actor can manage the dashboard — paired with the denied test below", () => {
    mockUseDashboardLayout.mockReturnValue({ data: savedLayout, isLoading: false });
    render(<CommandCenterPage />);
    expect(screen.getByRole("button", { name: /customize/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /customize/i })).toHaveTextContent("");
  });

  it("hides the Customize control when the actor cannot manage the dashboard even with the layout loaded", () => {
    mockUseDashboardLayout.mockReturnValue({ data: savedLayout, isLoading: false });
    mockUseCan.mockImplementation((key: string) => key !== "build:dashboard:manage");
    render(<CommandCenterPage />);
    expect(screen.queryByRole("button", { name: /customize/i })).not.toBeInTheDocument();
  });

  it("enters edit mode with Add widget, Reset and Done when Customize is pressed", () => {
    mockUseDashboardLayout.mockReturnValue({ data: savedLayout, isLoading: false });
    render(<CommandCenterPage />);
    fireEvent.click(screen.getByRole("button", { name: /customize/i }));
    expect(screen.getByRole("button", { name: /add widget/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^reset$/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(screen.getByRole("button", { name: /customize/i })).toBeInTheDocument();
  });

  it("shows an empty state instead of the grid when the saved layout has no widgets", () => {
    mockUseDashboardLayout.mockReturnValue({ data: { ...savedLayout, layoutVersion: 3 }, isLoading: false });
    render(<CommandCenterPage />);
    expect(screen.getByText("Your Command Center is empty")).toBeInTheDocument();
    expect(screen.queryByTestId("widget-grid")).not.toBeInTheDocument();
  });

  it("paints default widgets while the saved layout is still loading so the body is never a blank placeholder", () => {
    mockUseDashboardLayout.mockReturnValue({ data: undefined, isLoading: true });
    render(<CommandCenterPage />);
    expect(screen.getByTestId("widget-grid")).toBeInTheDocument();
    expect(screen.getByTestId("my-issues-panel")).toBeInTheDocument();
  });

  it("renders overview without the redundant jump-to widget in the default layout", () => {
    render(<CommandCenterPage />);
    expect(screen.getAllByTestId("stat-card")).toHaveLength(3);
    expect(screen.queryByTestId("pinned-nav")).not.toBeInTheDocument();
  });
});
