import React from "react";
import { render, screen } from "@testing-library/react";
import type { PublicRoadmapItem } from "@/types/projects";
import type { RoadmapHorizon } from "@/types/projects";

jest.mock("@/features/build/roadmap/roadmap-constants", () => ({
  ROADMAP_HORIZON_COLUMNS: [
    { horizon: "now", label: "Now" },
    { horizon: "next", label: "Next" },
    { horizon: "later", label: "Later" },
  ],
  ROADMAP_STATUS_BADGE_VARIANT: { planned: "outline", in_progress: "default", completed: "secondary", cancelled: "destructive" },
  ROADMAP_STATUS_LABEL: { planned: "Planned", in_progress: "In Progress", completed: "Completed", cancelled: "Cancelled" },
}));

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

let mockPublication: { path: string } | null = null;
let mockPublicBoard: { orgName: string | null; roadmap: { planned: PublicRoadmapItem[]; in_progress: PublicRoadmapItem[]; completed: PublicRoadmapItem[] }; feedback: []; changelog: [] } | null = null;
let mockIsLoading = false;

jest.mock("@/hooks/api/build/roadmap-public", () => ({
  useRoadmapPublication: () => ({ data: mockPublication }),
  useRoadmapPreview: () => ({ data: mockPublicBoard, isLoading: mockIsLoading }),
}));

import { RoadmapPreviewSheet } from "./roadmap-preview-sheet";

function makePublicItem(id: number, horizon: RoadmapHorizon, status: "planned" | "in_progress" | "completed" = "planned"): PublicRoadmapItem {
  return {
    id,
    title: `Item ${id}`,
    status,
    description: null,
    category: null,
    targetQuarter: null,
    horizon,
    votes: 0,
  };
}

function makeBoard(planned: PublicRoadmapItem[], in_progress: PublicRoadmapItem[], completed: PublicRoadmapItem[]) {
  return { orgName: "Acme", roadmap: { planned, in_progress, completed }, feedback: [] as [], changelog: [] as [] };
}

const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockPublication = null;
  mockPublicBoard = null;
  mockIsLoading = false;
});

describe("RoadmapPreviewSheet — public page link", () => {
  it("links to the published board filtered to this product", () => {
    mockPublication = { path: "/roadmap/org-1" };
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByRole("link", { name: /Open public page/ })).toHaveAttribute("href", "/roadmap/org-1?product=39");
  });

  it("says the board is unpublished instead of linking when there is no publication", () => {
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.queryByRole("link", { name: /Open public page/ })).not.toBeInTheDocument();
    expect(screen.getByText("The public board is not published yet.")).toBeInTheDocument();
  });
});

describe("RoadmapPreviewSheet — authoritative public projection (BSN-RM-PREVIEW)", () => {
  it("renders items returned by the public projection", () => {
    mockPublicBoard = makeBoard([makePublicItem(1, "now")], [], [makePublicItem(3, "later")]);
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("does not render items that the public projection omits", () => {
    mockPublicBoard = makeBoard([makePublicItem(1, "now")], [], []);
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.queryByText("Item 2")).not.toBeInTheDocument();
  });

  it("shows a message when the public projection is empty", () => {
    mockPublicBoard = makeBoard([], [], []);
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText(/Nothing to preview/i)).toBeInTheDocument();
  });

  it("shows a message when there is no public projection yet", () => {
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText(/Nothing to preview/i)).toBeInTheDocument();
  });

  it("shows the correct public item count spanning all status groups", () => {
    mockPublicBoard = makeBoard(
      [makePublicItem(1, "now", "planned")],
      [makePublicItem(2, "next", "in_progress")],
      [makePublicItem(3, "later", "completed")],
    );
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText(/3 items visible to the public/i)).toBeInTheDocument();
  });

  it("shows a singular count when exactly one item is in the public projection", () => {
    mockPublicBoard = makeBoard([makePublicItem(1, "now")], [], []);
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText(/1 item visible to the public/i)).toBeInTheDocument();
  });

  it("groups items by horizon: planned and in_progress items land in their horizon column", () => {
    mockPublicBoard = makeBoard(
      [makePublicItem(1, "now", "planned")],
      [makePublicItem(2, "next", "in_progress")],
      [makePublicItem(3, "later", "completed")],
    );
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Later")).toBeInTheDocument();
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("shows the Public Roadmap Preview title", () => {
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText("Public Roadmap Preview")).toBeInTheDocument();
  });

  it("hides the count description while loading", () => {
    mockIsLoading = true;
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.queryByText(/visible to the public/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No items are marked/i)).not.toBeInTheDocument();
  });

  it("counts items from all three status buckets (multi-bucket coverage)", () => {
    mockPublicBoard = makeBoard(
      [makePublicItem(10, "now", "planned"), makePublicItem(11, "now", "planned")],
      [makePublicItem(20, "next", "in_progress")],
      [makePublicItem(30, "later", "completed"), makePublicItem(31, "later", "completed"), makePublicItem(32, "later", "completed")],
    );
    render(<RoadmapPreviewSheet managedProductId={39} onClose={onClose} />);
    expect(screen.getByText(/6 items visible to the public/i)).toBeInTheDocument();
  });
});
