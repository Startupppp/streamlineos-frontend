import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import type { RoadmapHorizon } from "@/types/projects";

const mockPositionMutate = jest.fn();
const mockPublishMutate = jest.fn();

jest.mock("@/hooks/api/build/roadmap", () => ({
  usePositionRoadmapItem: jest.fn(() => ({ mutate: mockPositionMutate, isPending: false })),
  usePublishRoadmapItem: jest.fn(() => ({ mutate: mockPublishMutate, isPending: false })),
}));

jest.mock("@/features/build/roadmap/roadmap-constants", () => ({
  ROADMAP_HORIZON_COLUMNS: [
    { horizon: "now", label: "Now" },
    { horizon: "next", label: "Next" },
    { horizon: "later", label: "Later" },
  ],
}));

jest.mock("@/features/build/roadmap/roadmap-item-card", () => ({
  RoadmapItemCard: ({
    item,
    onMoveUp,
    onMoveDown,
    onPublishToggle,
    onEdit,
    onDelete,
  }: {
    item: ScorableRoadmapItem;
    onMoveUp?: (item: ScorableRoadmapItem) => void;
    onMoveDown?: (item: ScorableRoadmapItem) => void;
    onPublishToggle?: (item: ScorableRoadmapItem) => void;
    onEdit: (item: ScorableRoadmapItem) => void;
    onDelete: (item: ScorableRoadmapItem) => void;
  }) => (
    <div data-testid={`roadmap-card-${item.id}`}>
      <span>{item.title}</span>
      {onMoveUp ? (
        <button type="button" onClick={() => onMoveUp(item)} aria-label={`Move up ${item.title}`}>
          Move up
        </button>
      ) : null}
      {onMoveDown ? (
        <button type="button" onClick={() => onMoveDown(item)} aria-label={`Move down ${item.title}`}>
          Move down
        </button>
      ) : null}
      {onPublishToggle ? (
        <button type="button" onClick={() => onPublishToggle(item)} aria-label={`Toggle publish ${item.title}`}>
          {item.isPublic ? "Unpublish" : "Publish"}
        </button>
      ) : null}
      <button type="button" onClick={() => onEdit(item)} aria-label={`Edit ${item.title}`}>Edit</button>
      <button type="button" onClick={() => onDelete(item)} aria-label={`Delete ${item.title}`}>Delete</button>
    </div>
  ),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/components/pm-chrome", () => ({
  PmStaggerList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
    onOpenChange,
    title,
    confirmLabel,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (open: boolean) => void;
    title: string;
    confirmLabel?: string;
  }) => open ? (
    <div data-testid="confirm-dialog">
      <span>{title}</span>
      <button type="button" onClick={onConfirm}>{confirmLabel ?? "Confirm"}</button>
      <button type="button" onClick={() => onOpenChange(false)}>Cancel</button>
    </div>
  ) : null,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: jest.fn((e: unknown) => String(e)),
}));

import { RoadmapBoardColumns } from "./roadmap-board-columns";

function makeItem(overrides: Partial<ScorableRoadmapItem> & { id: number; horizon: RoadmapHorizon }): ScorableRoadmapItem {
  return {
    title: `Item ${overrides.id}`,
    status: "planned",
    isPublic: false,
    sortOrder: overrides.id,
    votes: 0,
    version: 1,
    allowedActions: ["edit", "delete", "move", "reorder"],
    sourceFreshness: null,
    ...overrides,
  } as ScorableRoadmapItem;
}

const onEdit = jest.fn();
const onDelete = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RoadmapBoardColumns — publish toggle (BSN-RM-PUB)", () => {
  it("shows the publish confirm dialog when onPublishToggle is called for a private item", () => {
    const grouped = {
      now: [makeItem({ id: 1, horizon: "now", isPublic: false })],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /publish Item 1/i }));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    expect(screen.getByText(/Publish item/i)).toBeInTheDocument();
  });

  it("shows the unpublish confirm dialog when onPublishToggle is called for a public item", () => {
    const grouped = {
      now: [makeItem({ id: 2, horizon: "now", isPublic: true })],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Toggle publish Item 2/i }));
    expect(screen.getByText(/Unpublish item/i)).toBeInTheDocument();
  });

  it("calls usePublishRoadmapItem.mutate with isPublic=true when confirming publish for a private item", () => {
    const grouped = {
      now: [makeItem({ id: 3, horizon: "now", isPublic: false, version: 5 })],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Toggle publish Item 3/i }));
    const dialog = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Publish/i }));
    expect(mockPublishMutate).toHaveBeenCalledWith(
      { roadmapItemId: 3, version: 5, isPublic: true },
      expect.any(Object),
    );
  });

  it("calls usePublishRoadmapItem.mutate with isPublic=false when confirming unpublish for a public item", () => {
    const grouped = {
      now: [makeItem({ id: 4, horizon: "now", isPublic: true, version: 2 })],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Toggle publish Item 4/i }));
    const dialog = screen.getByTestId("confirm-dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /Unpublish/i }));
    expect(mockPublishMutate).toHaveBeenCalledWith(
      { roadmapItemId: 4, version: 2, isPublic: false },
      expect.any(Object),
    );
  });

  it("dismisses the dialog when cancel is clicked without calling mutate", () => {
    const grouped = {
      now: [makeItem({ id: 5, horizon: "now", isPublic: false })],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Toggle publish Item 5/i }));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(mockPublishMutate).not.toHaveBeenCalled();
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });
});

describe("RoadmapBoardColumns — in-column reorder (BSN-RM-SORT)", () => {
  it("calls positionItem.mutate with beforeItemId when moving an item up", () => {
    const grouped = {
      now: [
        makeItem({ id: 10, horizon: "now", version: 1 }),
        makeItem({ id: 11, horizon: "now", version: 1 }),
      ],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Move up Item 11/i }));
    expect(mockPositionMutate).toHaveBeenCalledWith(
      { roadmapItemId: 11, version: 1, beforeItemId: 10 },
      expect.any(Object),
    );
  });

  it("calls positionItem.mutate with afterItemId when moving an item down", () => {
    const grouped = {
      now: [
        makeItem({ id: 20, horizon: "now", version: 1 }),
        makeItem({ id: 21, horizon: "now", version: 1 }),
      ],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    fireEvent.click(screen.getByRole("button", { name: /Move down Item 20/i }));
    expect(mockPositionMutate).toHaveBeenCalledWith(
      { roadmapItemId: 20, version: 1, afterItemId: 21 },
      expect.any(Object),
    );
  });

  it("does not show Move up for the first item in a column", () => {
    const grouped = {
      now: [
        makeItem({ id: 30, horizon: "now", version: 1 }),
        makeItem({ id: 31, horizon: "now", version: 1 }),
      ],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.queryByRole("button", { name: /Move up Item 30/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Move up Item 31/i })).toBeInTheDocument();
  });

  it("does not show Move down for the last item in a column", () => {
    const grouped = {
      now: [
        makeItem({ id: 40, horizon: "now", version: 1 }),
        makeItem({ id: 41, horizon: "now", version: 1 }),
      ],
      next: [],
      later: [],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByRole("button", { name: /Move down Item 40/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Move down Item 41/i })).not.toBeInTheDocument();
  });
});

describe("RoadmapBoardColumns — column structure (BSN-RM-BOARD)", () => {
  it("renders all three horizon columns even when all groups are empty", () => {
    const grouped = { now: [], next: [], later: [] };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Later")).toBeInTheDocument();
    expect(screen.getAllByText("No items yet")).toHaveLength(3);
  });

  it("places cards in the column matching their horizon", () => {
    const grouped = {
      now: [makeItem({ id: 50, horizon: "now", title: "Now item" })],
      next: [makeItem({ id: 51, horizon: "next", title: "Next item" })],
      later: [makeItem({ id: 52, horizon: "later", title: "Later item" })],
    };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByTestId("roadmap-card-50")).toBeInTheDocument();
    expect(screen.getByTestId("roadmap-card-51")).toBeInTheDocument();
    expect(screen.getByTestId("roadmap-card-52")).toBeInTheDocument();
    expect(screen.queryByText("No items yet")).not.toBeInTheDocument();
  });

  it("adds into a filled column from its header and into an empty one from its placeholder", () => {
    const onCreateInHorizon = jest.fn();
    const grouped = { now: [makeItem({ id: 60, horizon: "now" })], next: [], later: [] };
    render(<RoadmapBoardColumns grouped={grouped} onEdit={onEdit} onDelete={onDelete} onCreateInHorizon={onCreateInHorizon} />);
    fireEvent.click(screen.getByRole("button", { name: "Add item to Now" }));
    expect(onCreateInHorizon).toHaveBeenCalledWith("now");
    expect(screen.queryByRole("button", { name: "Add item to Next" })).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "+ Add item" })[0]);
    expect(onCreateInHorizon).toHaveBeenLastCalledWith("next");
  });
});
