import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";

jest.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open !== false ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetBody: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    title,
    onConfirm,
  }: {
    open: boolean;
    title: string;
    onConfirm: () => void;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <button type="button" onClick={onConfirm} data-testid="confirm-btn">
          Confirm
        </button>
      </div>
    ) : null,
}));

jest.mock("@/components/ui/loading-button", () => ({
  LoadingButton: ({
    children,
    onClick,
    isPending,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    isPending?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      data-testid="loading-button"
      aria-busy={isPending}
    >
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

let mockPublication:
  | {
      published: boolean;
      publicationVersion: number | null;
      expiresAt: string | null;
      issuedAt: string | null;
    }
  | undefined;
let mockPublicationLoading = false;
let mockPreview:
  | {
      orgName: string | null;
      roadmap: {
        planned: unknown[];
        in_progress: unknown[];
        completed: unknown[];
      };
      feedback: unknown[];
      changelog: unknown[];
    }
  | undefined;
const mockPublishMutate = jest.fn();
const mockUnpublishMutate = jest.fn();

jest.mock("@/hooks/api/build/roadmap-public", () => ({
  useProductRoadmapPublication: () => ({
    data: mockPublication,
    isLoading: mockPublicationLoading,
  }),
  useRoadmapPreview: () => ({
    data: mockPreview,
  }),
  usePublishProductRoadmap: () => ({
    mutate: mockPublishMutate,
    isPending: false,
  }),
  useUnpublishProductRoadmap: () => ({
    mutate: mockUnpublishMutate,
    isPending: false,
  }),
}));

import { RoadmapPublicationPanel } from "./roadmap-publication-panel";

const onClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockPublication = undefined;
  mockPublicationLoading = false;
  mockPreview = undefined;
  Object.defineProperty(window, "location", {
    value: { origin: "https://app.example.com" },
    writable: true,
  });
});

describe("RoadmapPublicationPanel — unpublished state (BSN-PUB-UNPUB)", () => {
  it("shows Not published status when token is null", () => {
    mockPublication = { published: false, publicationVersion: null, expiresAt: null, issuedAt: null };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText("Not published")).toBeInTheDocument();
  });

  it("shows the Publish roadmap button when unpublished", () => {
    mockPublication = { published: false, publicationVersion: null, expiresAt: null, issuedAt: null };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByTestId("loading-button")).toBeInTheDocument();
    expect(screen.getByText("Publish roadmap")).toBeInTheDocument();
  });

  it("shows zero-item message when unpublished and no items in preview", () => {
    mockPublication = { published: false, publicationVersion: null, expiresAt: null, issuedAt: null };
    mockPreview = { orgName: null, roadmap: { planned: [], in_progress: [], completed: [] }, feedback: [], changelog: [] };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText(/No items are marked as public yet/i)).toBeInTheDocument();
  });

  it("shows ready-item count when unpublished but preview has items", () => {
    mockPublication = { published: false, publicationVersion: null, expiresAt: null, issuedAt: null };
    mockPreview = { orgName: null, roadmap: { planned: [{}], in_progress: [{}], completed: [] }, feedback: [], changelog: [] };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText(/2 items ready to publish/i)).toBeInTheDocument();
  });

  it("calls publish mutate when Publish roadmap button is clicked", () => {
    mockPublication = { published: false, publicationVersion: null, expiresAt: null, issuedAt: null };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    fireEvent.click(screen.getByText("Publish roadmap"));
    expect(mockPublishMutate).toHaveBeenCalledTimes(1);
  });
});

describe("RoadmapPublicationPanel — published state (BSN-PUB-PUB)", () => {
  beforeEach(() => {
    mockPublication = { published: true, publicationVersion: 1, expiresAt: null, issuedAt: "2026-10-12T00:00:00.000Z" };
  });

  it("shows Published status when the product has an active publication", () => {
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText("Published")).toBeInTheDocument();
  });

  it("does not reveal the share URL for an already-issued link, because only its hash is stored", () => {
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.queryByText(/shareToken=/)).toBeNull();
    expect(screen.getByText(/stored\s+only as a hash/i)).toBeInTheDocument();
  });

  it("shows the share URL once, right after the link is issued (control — the URL is still reachable)", () => {
    mockPublishMutate.mockImplementation(
      (_v: unknown, opts: { onSuccess: (i: { path: string }) => void }) => {
        opts.onSuccess({ path: "/roadmap/by-token?shareToken=prt_fresh" });
      },
    );
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    fireEvent.click(screen.getByText("Rotate share link"));
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(
      screen.getByText("/roadmap/by-token?shareToken=prt_fresh", { exact: false }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Copy this link now/i)).toBeInTheDocument();
  });

  it("shows item count from preview when published", () => {
    mockPreview = { orgName: null, roadmap: { planned: [{}], in_progress: [], completed: [{}] }, feedback: [], changelog: [] };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText(/2 items visible to the public/i)).toBeInTheDocument();
  });

  it("shows singular item count when exactly one item is public", () => {
    mockPreview = { orgName: null, roadmap: { planned: [{}], in_progress: [], completed: [] }, feedback: [], changelog: [] };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText(/1 item visible to the public/i)).toBeInTheDocument();
  });

  it("shows no-items message when published but preview has no public items", () => {
    mockPreview = { orgName: null, roadmap: { planned: [], in_progress: [], completed: [] }, feedback: [], changelog: [] };
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText(/No items are marked as public/i)).toBeInTheDocument();
  });

  it("shows Rotate share link and Unpublish buttons", () => {
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.getByText("Rotate share link")).toBeInTheDocument();
    expect(screen.getByText("Unpublish")).toBeInTheDocument();
  });

  it("shows the unpublish confirm dialog when Unpublish is clicked", () => {
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    fireEvent.click(screen.getByText("Unpublish"));
    expect(screen.getByText("Unpublish roadmap?")).toBeInTheDocument();
  });

  it("calls unpublish mutate when dialog is confirmed", () => {
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    fireEvent.click(screen.getByText("Unpublish"));
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(mockUnpublishMutate).toHaveBeenCalledTimes(1);
  });

  it("shows the rotate confirm dialog when Rotate share link is clicked", () => {
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    fireEvent.click(screen.getByText("Rotate share link"));
    expect(screen.getByText("Rotate share link?")).toBeInTheDocument();
  });

  it("calls publish mutate when rotate dialog is confirmed", () => {
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    fireEvent.click(screen.getByText("Rotate share link"));
    fireEvent.click(screen.getByTestId("confirm-btn"));
    expect(mockPublishMutate).toHaveBeenCalledTimes(1);
  });
});

describe("RoadmapPublicationPanel — loading state (BSN-PUB-LOAD)", () => {
  it("renders nothing in the sheet body while loading", () => {
    mockPublicationLoading = true;
    render(<RoadmapPublicationPanel managedProductId={5} onClose={onClose} />);
    expect(screen.queryByText("Published")).not.toBeInTheDocument();
    expect(screen.queryByText("Not published")).not.toBeInTheDocument();
  });
});
