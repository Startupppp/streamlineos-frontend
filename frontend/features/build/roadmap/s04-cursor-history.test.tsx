import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RoadmapTab } from "./roadmap-tab";
import { useDeleteRoadmapItem, useRoadmapItems } from "@/hooks/api/build/roadmap";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(),
  useDeleteRoadmapItem: jest.fn(() => ({ mutate: jest.fn() })),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(() => ({ kind: "ready" })),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({ children }: { children: React.ReactNode; resolution?: unknown; loading?: unknown; empty?: unknown; onRetry?: unknown; className?: string }) => (
    <div>{children}</div>
  ),
}));
jest.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" onClick={onClick} disabled={disabled} {...rest}>{children}</button>
  ),
}));
jest.mock("@/components/ui/empty-state", () => ({ EmptyState: () => null }));
jest.mock("@/components/ui/skeleton", () => ({ Skeleton: () => null }));
jest.mock("@/components/shared/error-state", () => ({ ErrorState: () => null }));
jest.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));
jest.mock("@/components/illustrations", () => ({ EmptyProjectsIllustration: () => null }));
jest.mock("@/components/pm-chrome", () => ({
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
  PM_PANEL: "",
}));
jest.mock("./roadmap-item-card", () => ({ RoadmapItemCard: () => null }));
jest.mock("./roadmap-item-sheet", () => ({ RoadmapItemSheet: () => null }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUseRoadmapItems = useRoadmapItems as jest.Mock;
const mockUseDeleteRoadmapItem = useDeleteRoadmapItem as jest.Mock;

function page(cursor?: string) {
  const position = cursor === "cursor-3" ? 3 : cursor === "cursor-2" ? 2 : 1;
  return {
    data: {
      data: [{ id: position, status: "planned", title: `Page ${position}` }],
      pagination: {
        limit: 1,
        hasMore: position < 3,
        nextCursor: position === 1 ? "cursor-2" : position === 2 ? "cursor-3" : null,
      },
    },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  };
}

describe("RoadmapTab S04 cursor history", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDeleteRoadmapItem.mockReturnValue({ mutate: jest.fn() });
    mockUseRoadmapItems.mockImplementation((filters: { cursor?: string }) => page(filters?.cursor));
  });

  it("walks three pages forward and returns one cursor boundary at a time", async () => {
    let cursor: string | null = null;
    const onCursorChange = (next: string | null) => {
      cursor = next;
    };
    render(
      <RoadmapTab search="" cursor={cursor} onCursorChange={onCursorChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ cursor: "cursor-2" });
    });
    expect(screen.getByLabelText("Current page 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    await waitFor(() => {
      expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ cursor: "cursor-3" });
    });
    expect(screen.getByLabelText("Current page 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    await waitFor(() => {
      expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ cursor: "cursor-2" });
    });
    expect(screen.getByLabelText("Current page 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    await waitFor(() => {
      expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ cursor: undefined });
    });
    expect(screen.getByLabelText("Current page 1")).toBeInTheDocument();
    expect(cursor).toBeNull();
  });

  it("resets cursor history when the list filter changes", async () => {
    let cursor: string | null = null;
    const onCursorChange = (next: string | null) => {
      cursor = next;
    };
    const view = render(
      <RoadmapTab search="" cursor={cursor} onCursorChange={onCursorChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await act(async () => {
      cursor = null;
      view.rerender(
        <RoadmapTab search="second" cursor={cursor} onCursorChange={onCursorChange} />,
      );
    });

    await waitFor(() => {
      expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ search: "second", cursor: undefined });
    });
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});
