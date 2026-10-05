import { act, render, screen } from "@testing-library/react";
import "./command-center-page-test-harness";
import { mockRouterPush } from "./command-center-page-test-harness";
import {
  installCommandCenterMocks,
  mockUseCan,
  mockUseAccess,
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

describe("CommandCenterPage — persona-based panel gating", () => {
  it("hides ApprovalsPanel when the actor lacks build:approvals:view — paired with the granted test below", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:approvals:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("approvals-panel")).not.toBeInTheDocument();
    expect(screen.getByTestId("agent-runs-panel")).toBeInTheDocument();
  });

  it("shows ApprovalsPanel when the actor has build:approvals:view — paired with the denied test above", () => {
    mockUseCan.mockReturnValue(true);
    render(<CommandCenterPage />);
    expect(screen.getByTestId("approvals-panel")).toBeInTheDocument();
    expect(screen.getByTestId("agent-runs-panel")).toBeInTheDocument();
  });

  it("hides RisksPanel when the actor lacks build:risks:view — paired with the granted test below", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:risks:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("risks-panel")).not.toBeInTheDocument();
  });

  it("shows RisksPanel when the actor has build:risks:view — paired with the denied test above", () => {
    mockUseCan.mockReturnValue(true);
    render(<CommandCenterPage />);
    expect(screen.getByTestId("risks-panel")).toBeInTheDocument();
  });

  it("shows BlockersPanel when the actor has build:tickets:view — paired with the hidden test below", () => {
    mockUseCan.mockReturnValue(true);
    render(<CommandCenterPage />);
    expect(screen.getByTestId("blockers-panel")).toBeInTheDocument();
  });

  it("hides BlockersPanel and AgentRunsPanel when the actor lacks build:tickets:view — paired with the shown test above", () => {
    mockUseCan.mockImplementation((key: string) => key !== "build:tickets:view");
    render(<CommandCenterPage />);
    expect(screen.queryByTestId("blockers-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("agent-runs-panel")).not.toBeInTheDocument();
  });
});
