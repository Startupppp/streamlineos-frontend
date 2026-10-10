import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import { RoadmapTab } from "./roadmap-tab";
import { useRoadmapItems } from "@/hooks/api/build/roadmap";
import { usePageState } from "@/hooks/api/use-page-state";
import { useOnlineStatus } from "@/hooks/common/use-online-status";

jest.mock("@/hooks/api/build/roadmap", () => ({
  useRoadmapItems: jest.fn(),
  useDeleteRoadmapItem: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  ROADMAP_SORTS: ["updated_at", "created_at", "title", "horizon"],
}));

jest.mock("@/hooks/common/use-online-status", () => ({
  useOnlineStatus: jest.fn(() => true),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: ({
    resolution,
    loading,
    empty,
    children,
  }: {
    resolution: { kind: string };
    loading: React.ReactNode;
    empty?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    if (resolution.kind === "loading") return <div>{loading}</div>;
    if (resolution.kind === "empty") return <div>{empty}</div>;
    return <div data-testid="page-state-ready">{children}</div>;
  },
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-title={title} />,
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: () => <div data-testid="skeleton" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({ ConfirmDialog: () => null }));

jest.mock("@/components/pm-chrome", () => ({
  PmPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CONTENT_FILL_PANEL: "",
  PM_PANEL: "",
}));

jest.mock("./roadmap-constants", () => ({
  ROADMAP_HORIZON_COLUMNS: [
    { horizon: "now", label: "Now" },
    { horizon: "next", label: "Next" },
    { horizon: "later", label: "Later" },
  ],
}));

jest.mock("./roadmap-item-card", () => ({
  RoadmapItemCard: ({
    item,
    onMove,
  }: {
    item: { id: number; title: string; horizon: string; version: number };
    onMove?: (item: unknown, horizon: string) => void;
  }) => (
    <div data-testid="roadmap-item-card" data-id={item.id} data-horizon={item.horizon}>
      {item.title}
      {onMove ? (
        <button
          type="button"
          data-testid={`move-btn-${item.id}`}
          onClick={() => onMove(item, "next")}
        >
          Move
        </button>
      ) : null}
    </div>
  ),
}));

jest.mock("./roadmap-item-sheet", () => ({ RoadmapItemSheet: () => null }));
jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockUseRoadmapItems = useRoadmapItems as jest.Mock;
const mockUsePageState = usePageState as jest.Mock;
const mockUseOnlineStatus = useOnlineStatus as jest.Mock;

const makeItem = (id: number, horizon: "now" | "next" | "later", title: string) => ({
  id,
  horizon,
  status: "planned" as const,
  title,
  description: null,
  category: null,
  isPublic: true,
  projectId: null,
  sortOrder: 0,
  votes: 0,
  version: 1,
  orgId: "org-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
});

const BASE_QUERY = {
  data: { data: [], pagination: { hasMore: false, nextCursor: null, limit: 20 } },
  isLoading: false,
  isError: false,
  error: null,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRoadmapItems.mockReturnValue(BASE_QUERY);
  mockUsePageState.mockReturnValue({ kind: "ready" });
  mockUseOnlineStatus.mockReturnValue(true);
});

describe("RoadmapTab — horizon board renders three columns", () => {
  it("renders Now, Next and Later column headings in the board", () => {
    render(<RoadmapTab search="" />);
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Later")).toBeInTheDocument();
  });

  it("places a now-horizon item into the Now column and no other column", () => {
    mockUseRoadmapItems.mockReturnValue({
      ...BASE_QUERY,
      data: { ...BASE_QUERY.data, data: [makeItem(1, "now", "Ship now")] },
    });
    render(<RoadmapTab search="" />);
    const card = screen.getByTestId("roadmap-item-card");
    expect(card).toHaveAttribute("data-horizon", "now");
    expect(card).toHaveTextContent("Ship now");
  });

  it("places a later-horizon item into the Later column", () => {
    mockUseRoadmapItems.mockReturnValue({
      ...BASE_QUERY,
      data: { ...BASE_QUERY.data, data: [makeItem(2, "later", "Ship later")] },
    });
    render(<RoadmapTab search="" />);
    const card = screen.getByTestId("roadmap-item-card");
    expect(card).toHaveAttribute("data-horizon", "later");
  });

  it("groups items with different horizons into their respective columns", () => {
    mockUseRoadmapItems.mockReturnValue({
      ...BASE_QUERY,
      data: {
        ...BASE_QUERY.data,
        data: [
          makeItem(1, "now", "Now item"),
          makeItem(2, "next", "Next item"),
          makeItem(3, "later", "Later item"),
        ],
      },
    });
    render(<RoadmapTab search="" />);
    const cards = screen.getAllByTestId("roadmap-item-card");
    expect(cards).toHaveLength(3);
    expect(cards.find((c) => c.getAttribute("data-id") === "1")).toHaveAttribute("data-horizon", "now");
    expect(cards.find((c) => c.getAttribute("data-id") === "2")).toHaveAttribute("data-horizon", "next");
    expect(cards.find((c) => c.getAttribute("data-id") === "3")).toHaveAttribute("data-horizon", "later");
  });
});

describe("RoadmapTab — onMove wires the position call", () => {
  it("passes onMove through to RoadmapItemCard when supplied", () => {
    mockUseRoadmapItems.mockReturnValue({
      ...BASE_QUERY,
      data: { ...BASE_QUERY.data, data: [makeItem(5, "now", "Move me")] },
    });
    const handleMove = jest.fn();
    render(<RoadmapTab search="" onMove={handleMove} />);
    const moveBtn = screen.getByTestId("move-btn-5");
    fireEvent.click(moveBtn);
    expect(handleMove).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, horizon: "now" }),
      "next",
    );
  });

  it("does not render move buttons when onMove is not supplied", () => {
    mockUseRoadmapItems.mockReturnValue({
      ...BASE_QUERY,
      data: { ...BASE_QUERY.data, data: [makeItem(6, "now", "No move")] },
    });
    render(<RoadmapTab search="" />);
    expect(screen.queryByTestId("move-btn-6")).not.toBeInTheDocument();
  });
});

describe("RoadmapTab — horizon filter reaches the query", () => {
  it("passes horizon string through to useRoadmapItems so server-side filtering works", () => {
    render(<RoadmapTab search="" horizon="now" />);
    expect(mockUseRoadmapItems).toHaveBeenCalledWith(
      expect.objectContaining({ horizon: "now" }),
    );
  });

  it("includes horizon in isFiltered so 'no items match your filters' shows for a filtered empty state", () => {
    mockUsePageState.mockReturnValue({ kind: "empty" });
    render(<RoadmapTab search="" horizon="now" />);
    const el = document.querySelector("[data-title]");
    expect(el).toHaveAttribute("data-title", "No roadmap items match your filters");
  });
});
