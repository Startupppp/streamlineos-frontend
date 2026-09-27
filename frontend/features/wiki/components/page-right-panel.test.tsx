"use client";

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageRightPanel from "./page-right-panel";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";

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
  mockUseKbPageBacklinks.mockReturnValue({ data: [] });
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
