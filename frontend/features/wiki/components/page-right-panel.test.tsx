"use client";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageRightPanel from "./page-right-panel";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading, isError, isEmpty, error }: { isLoading: boolean; isError: boolean; isEmpty?: boolean; error?: unknown }) =>
    isLoading ? { kind: "loading" } : isError ? { kind: "error", error } : isEmpty ? { kind: "empty" } : { kind: "ready" },
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPageBacklinks: jest.fn(),
}));

jest.mock("@/hooks/api/kb/record-links", () => ({
  useKbPageRecordLinks: jest.fn(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: () => ({ data: undefined }),
}));

import { useKbPageBacklinks } from "@/hooks/api/kb";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";

const mockUseKbPageBacklinks = useKbPageBacklinks as jest.Mock;
const mockUseKbPageRecordLinks = useKbPageRecordLinks as jest.Mock;

beforeEach(() => {
  mockUseKbPageBacklinks.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseKbPageRecordLinks.mockReturnValue({ data: [] });
});

const basePage = {
  id: 1,
  title: "Runbook",
  status: "published",
  trustState: null,
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
  lastEditedById: null,
  ownerUserId: null,
  nextReviewAt: null,
  coverImage: null,
} as unknown as KbPageDetail;

function noop() {}

function renderPanel(overrides: Partial<KbPageDetail> = {}) {
  return render(
    <PageRightPanel
      pageId={1}
      page={{ ...basePage, ...overrides }}
      wordCount={42}
      onNavigate={noop}
    />,
  );
}

describe("PageRightPanel — mobile path for linked records", () => {
  it("marks the loaded linked-record count as partial when another cursor page exists", async () => {
    mockUseKbPageRecordLinks.mockReturnValue({
      data: [{ id: 1, targetType: "project", targetId: "9", label: "Project 9" }],
      hasNextPage: true,
    });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    expect(within(screen.getByRole("dialog")).getByText("1+")).toBeInTheDocument();
  });

  it("renders a mobile FAB button so linked records are reachable below 1280px", () => {
    renderPanel();

    expect(
      screen.getByRole("button", { name: "Open details panel" }),
    ).toBeInTheDocument();
  });

  it("the FAB button has an aria-label so keyboard users can identify it (FE-117)", () => {
    renderPanel();

    const fab = screen.getByRole("button", { name: "Open details panel" });
    expect(fab).toHaveAttribute("aria-label", "Open details panel");
  });

  it("opens the mobile sheet when the FAB is clicked", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows linked records section heading inside the sheet (positive: section always renders)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Linked records")).toBeInTheDocument();
  });

  it("shows empty state for linked records when there are none (positive: section renders, content is empty message)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("No linked records.")).toBeInTheDocument();
  });
});

describe("PageRightPanel — backlinks section", () => {
  it("shows loading instead of a false empty state while backlinks are pending", async () => {
    mockUseKbPageBacklinks.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("No pages link here.")).not.toBeInTheDocument();
  });

  it("shows a first-read failure with retry rather than no backlinks", async () => {
    const refetch = jest.fn();
    mockUseKbPageBacklinks.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new ApiError("Offline", 503, "UNAVAILABLE", { correlationId: "kb-backlinks-1" }), refetch });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("No pages link here.")).not.toBeInTheDocument();
    expect(within(dialog).getByText("kb-backlinks-1")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("retains loaded backlinks on a transient refresh error and offers retry", async () => {
    const refetch = jest.fn();
    mockUseKbPageBacklinks.mockReturnValue({ data: [{ id: 2, title: "Related runbook", icon: null }], isLoading: false, isError: true, error: new Error("offline"), refetch });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Related runbook/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Retry backlinks" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("hides cached backlinks when the read reports revoked access", async () => {
    mockUseKbPageBacklinks.mockReturnValue({ data: [{ id: 2, title: "Private runbook", icon: null }], isLoading: false, isError: true, error: new ApiError("Denied", 403), refetch: jest.fn() });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Private runbook/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByText("No pages link here.")).not.toBeInTheDocument();
  });

  it("shows backlinks section heading inside the sheet", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Backlinks")).toBeInTheDocument();
  });

  it("shows empty backlinks message when there are none (positive: section renders; negative: no link buttons)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "Open details panel" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("No pages link here.")).toBeInTheDocument();
  });
});

describe("PageRightPanel — backlinks bounded at BACKLINK_DISPLAY_LIMIT (FE-112)", () => {
  it("renders at most 20 backlink buttons when the endpoint returns more than 20 so the panel stays usable at high link counts", async () => {
    const manyBacklinks = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Page ${i + 1}`,
      icon: null,
    }));
    mockUseKbPageBacklinks.mockReturnValue({ data: manyBacklinks });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));
    const dialog = screen.getByRole("dialog");
    const backlinkButtons = within(dialog).getAllByRole("button");
    const navButtons = backlinkButtons.filter(
      (btn) => btn.hasAttribute("data-page-id"),
    );
    expect(navButtons).toHaveLength(20);
  });

  it("shows the overflow count when more than 20 backlinks exist so the user knows links were truncated", async () => {
    const manyBacklinks = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: `Page ${i + 1}`,
      icon: null,
    }));
    mockUseKbPageBacklinks.mockReturnValue({ data: manyBacklinks });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("+5 more")).toBeInTheDocument();
  });

  it("renders all backlink buttons when the count is at or below the limit — positive control confirming truncation is off at exactly 20", async () => {
    const exactLimit = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      title: `Page ${i + 1}`,
      icon: null,
    }));
    mockUseKbPageBacklinks.mockReturnValue({ data: exactLimit });
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("button", { name: "Open details panel" }));
    const dialog = screen.getByRole("dialog");
    const navButtons = within(dialog)
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("data-page-id"));
    expect(navButtons).toHaveLength(20);
    expect(within(dialog).queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });
});
