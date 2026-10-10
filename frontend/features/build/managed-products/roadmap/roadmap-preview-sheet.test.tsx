import React from "react";
import { render, screen } from "@testing-library/react";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
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

import { RoadmapPreviewSheet } from "./roadmap-preview-sheet";

function makeItem(id: number, horizon: RoadmapHorizon, isPublic: boolean): ScorableRoadmapItem {
  return {
    id,
    title: `Item ${id}`,
    status: "planned",
    isPublic,
    sortOrder: id,
    votes: 0,
    version: 1,
    horizon,
  } as ScorableRoadmapItem;
}

const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("RoadmapPreviewSheet — renders public items only (BSN-RM-PREVIEW)", () => {
  it("shows only items marked isPublic in the preview", () => {
    const items = [
      makeItem(1, "now", true),
      makeItem(2, "next", false),
      makeItem(3, "later", true),
    ];
    render(<RoadmapPreviewSheet items={items} onClose={onClose} />);
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.queryByText("Item 2")).not.toBeInTheDocument();
    expect(screen.getByText("Item 3")).toBeInTheDocument();
  });

  it("shows a message when no items are public", () => {
    const items = [makeItem(1, "now", false)];
    render(<RoadmapPreviewSheet items={items} onClose={onClose} />);
    expect(screen.getByText(/Nothing to preview/i)).toBeInTheDocument();
    expect(screen.queryByText("Item 1")).not.toBeInTheDocument();
  });

  it("shows the correct public item count in the description", () => {
    const items = [makeItem(1, "now", true), makeItem(2, "next", true)];
    render(<RoadmapPreviewSheet items={items} onClose={onClose} />);
    expect(screen.getByText(/2 items visible to the public/i)).toBeInTheDocument();
  });

  it("shows a singular count when exactly one item is public", () => {
    const items = [makeItem(1, "now", true)];
    render(<RoadmapPreviewSheet items={items} onClose={onClose} />);
    expect(screen.getByText(/1 item visible to the public/i)).toBeInTheDocument();
  });

  it("groups items by horizon and renders Now, Next, Later columns", () => {
    const items = [
      makeItem(1, "now", true),
      makeItem(2, "later", true),
    ];
    render(<RoadmapPreviewSheet items={items} onClose={onClose} />);
    expect(screen.getByText("Now")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
    expect(screen.getByText("Later")).toBeInTheDocument();
  });

  it("shows the Public Roadmap Preview title", () => {
    render(<RoadmapPreviewSheet items={[]} onClose={onClose} />);
    expect(screen.getByText("Public Roadmap Preview")).toBeInTheDocument();
  });
});
