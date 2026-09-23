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
  PM_FILL_PANEL: "",
  PM_PANEL: "",
}));
jest.mock("./roadmap-item-card", () => ({ RoadmapItemCard: () => null }));
jest.mock("./roadmap-item-sheet", () => ({ RoadmapItemSheet: () => null }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUseRoadmapItems = useRoadmapItems as jest.Mock;
const mockUseDeleteRoadmapItem = useDeleteRoadmapItem as jest.Mock;

function page(cursor?: string) {
  return cursor
    ? {
        data: { data: [{ id: 2, status: "planned", title: "Second" }], pagination: { limit: 1, hasMore: false, nextCursor: null } },
        isLoading: false,
        isError: false,
        refetch: jest.fn(),
      }
    : {
        data: { data: [{ id: 1, status: "planned", title: "First" }], pagination: { limit: 1, hasMore: true, nextCursor: "cursor-2" } },
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

  it("walks from the first page to the last page and back without inventing a cursor", async () => {
    render(<RoadmapTab search="" />);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ cursor: "cursor-2" });
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ cursor: undefined });
  });

  it("resets cursor history when the list filter changes", async () => {
    const view = render(<RoadmapTab search="" />);
    fireEvent.click(screen.getByRole("button", { name: "Next page" }));

    await act(async () => {
      view.rerender(<RoadmapTab search="second" />);
    });

    await waitFor(() => {
      expect(mockUseRoadmapItems.mock.calls.at(-1)?.[0]).toEqual({ search: "second", cursor: undefined });
    });
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });
});
