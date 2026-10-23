"use client";

import { useState } from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PageRightPanel from "./page-right-panel";
import type { KbPageDetail } from "@/hooks/api/kb/page-types";
import { ApiError } from "@/lib/api-envelope";

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: ({ isLoading, isError, isEmpty, error }: { isLoading: boolean; isError: boolean; isEmpty?: boolean; error?: unknown }) =>
    isLoading ? { kind: "loading" } : isError ? { kind: "error", error } : isEmpty ? { kind: "empty" } : { kind: "ready" },
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPageBacklinks: jest.fn(),
}));

jest.mock("@/hooks/api/kb/activity", () => ({
  useKbPageActivity: jest.fn(),
}));

jest.mock("@/hooks/api/kb/record-links", () => ({
  useKbPageRecordLinks: jest.fn(),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembersByIds: jest.fn(() => ({ data: undefined })),
}));

import { useKbPageBacklinks } from "@/hooks/api/kb/pages";
import { useKbPageActivity } from "@/hooks/api/kb/activity";
import { useKbPageRecordLinks } from "@/hooks/api/kb/record-links";
import { useOrgMembersByIds } from "@/hooks/api/organization";

const mockUseKbPageBacklinks = useKbPageBacklinks as jest.Mock;
const mockUseKbPageActivity = useKbPageActivity as jest.Mock;
const mockUseKbPageRecordLinks = useKbPageRecordLinks as jest.Mock;
const mockUseOrgMembersByIds = useOrgMembersByIds as jest.Mock;

beforeEach(() => {
  mockUseKbPageBacklinks.mockReturnValue({ data: [], isLoading: false, isError: false, error: null, refetch: jest.fn() });
  mockUseKbPageRecordLinks.mockReturnValue({ data: [] });
  mockUseOrgMembersByIds.mockReturnValue({ data: undefined });
  mockUseKbPageActivity.mockReturnValue({ data: [], isLoading: false, isError: false });
});

const basePage = {
  id: 1,
  title: "Runbook",
  status: "published",
  trustState: "verified",
  visibility: "org",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
  lastEditedById: null,
  ownerUserId: null,
  nextReviewAt: null,
  coverImage: null,
} as unknown as KbPageDetail;

function noop() {}

function PanelHarness({
  overrides = {},
}: {
  overrides?: Partial<KbPageDetail>;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label="Open details panel"
        onClick={() => setMobileOpen(true)}
      >
        Open details
      </button>
      <PageRightPanel
        pageId={1}
        page={{ ...basePage, ...overrides }}
        wordCount={42}
        onNavigate={noop}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
    </>
  );
}

function renderPanel(overrides: Partial<KbPageDetail> = {}) {
  return render(<PanelHarness overrides={overrides} />);
}

function openDetailsTrigger() {
  return screen.getByRole("button", { name: "Open details panel" });
}

describe("PageRightPanel — mobile path for linked records", () => {
  it("marks the loaded linked-record count as partial when another cursor page exists", async () => {
    mockUseKbPageRecordLinks.mockReturnValue({
      data: [{ id: 1, targetType: "project", targetId: "9", label: "Project 9" }],
      hasNextPage: true,
    });
    const user = userEvent.setup();
    renderPanel();
    await user.click(openDetailsTrigger());

    expect(within(screen.getByRole("dialog")).getByText("1+")).toBeInTheDocument();
  });

  it("opens from a parent-controlled trigger so linked records are reachable below 1280px", () => {
    renderPanel();

    expect(
      openDetailsTrigger(),
    ).toBeInTheDocument();
  });

  it("the parent trigger has an aria-label so keyboard users can identify it (FE-117)", () => {
    renderPanel();

    const trigger = openDetailsTrigger();
    expect(trigger).toHaveAttribute("aria-label", "Open details panel");
  });

  it("opens the mobile sheet when the parent trigger is clicked", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(openDetailsTrigger());

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows linked records section heading inside the sheet (positive: section always renders)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Linked records")).toBeInTheDocument();
  });

  it("shows empty state for linked records when there are none (positive: section renders, content is empty message)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("No linked records.")).toBeInTheDocument();
  });
});

describe("PageRightPanel — backlinks section", () => {
  it("shows loading instead of a false empty state while backlinks are pending", async () => {
    mockUseKbPageBacklinks.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch: jest.fn() });
    const user = userEvent.setup();
    renderPanel();
    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("No files link here.")).not.toBeInTheDocument();
  });

  it("shows a first-read failure with retry rather than no backlinks", async () => {
    const refetch = jest.fn();
    mockUseKbPageBacklinks.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new ApiError("Offline", 503, "UNAVAILABLE", { correlationId: "kb-backlinks-1" }), refetch });
    const user = userEvent.setup();
    renderPanel();
    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByText("No files link here.")).not.toBeInTheDocument();
    expect(within(dialog).getByText("kb-backlinks-1")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("retains loaded backlinks on a transient refresh error and offers retry", async () => {
    const refetch = jest.fn();
    mockUseKbPageBacklinks.mockReturnValue({ data: [{ id: 2, title: "Related runbook", icon: null }], isLoading: false, isError: true, error: new Error("offline"), refetch });
    const user = userEvent.setup();
    renderPanel();
    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("button", { name: /Related runbook/ })).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Retry backlinks" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("hides cached backlinks when the read reports revoked access", async () => {
    mockUseKbPageBacklinks.mockReturnValue({ data: [{ id: 2, title: "Private runbook", icon: null }], isLoading: false, isError: true, error: new ApiError("Denied", 403), refetch: jest.fn() });
    const user = userEvent.setup();
    renderPanel();
    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: /Private runbook/ })).not.toBeInTheDocument();
    expect(within(dialog).queryByText("No files link here.")).not.toBeInTheDocument();
  });

  it("shows backlinks section heading inside the sheet", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Backlinks")).toBeInTheDocument();
  });

  it("shows empty backlinks message when there are none (positive: section renders; negative: no link buttons)", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(openDetailsTrigger());

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("No files link here.")).toBeInTheDocument();
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
    await user.click(openDetailsTrigger());
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
    await user.click(openDetailsTrigger());
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
    await user.click(openDetailsTrigger());
    const dialog = screen.getByRole("dialog");
    const navButtons = within(dialog)
      .getAllByRole("button")
      .filter((btn) => btn.hasAttribute("data-page-id"));
    expect(navButtons).toHaveLength(20);
    expect(within(dialog).queryByText(/\+\d+ more/)).not.toBeInTheDocument();
  });
});

async function openDetailsDialog() {
  const user = userEvent.setup();
  await user.click(openDetailsTrigger());
  return screen.getByRole("dialog");
}

describe("PageRightPanel — status fact visible so a future deletion fails instead of going quiet", () => {
  it("shows Published badge for a published page", async () => {
    renderPanel({ status: "published" });
    expect(within(await openDetailsDialog()).getByText("Published")).toBeInTheDocument();
  });

  it("shows Draft badge for a draft page", async () => {
    renderPanel({ status: "draft" });
    expect(within(await openDetailsDialog()).getByText("Draft")).toBeInTheDocument();
  });

  it("shows In Review badge for an in-review page", async () => {
    renderPanel({ status: "in_review" });
    expect(within(await openDetailsDialog()).getByText("In Review")).toBeInTheDocument();
  });

  it("shows Archived badge for an archived page", async () => {
    renderPanel({ status: "archived" });
    expect(within(await openDetailsDialog()).getByText("Archived")).toBeInTheDocument();
  });
});

describe("PageRightPanel — trustState fact visible so a future deletion fails instead of going quiet", () => {
  it("shows Verified badge when trust state is verified", async () => {
    renderPanel({ trustState: "verified" });
    expect(within(await openDetailsDialog()).getByText("Verified")).toBeInTheDocument();
  });

  it("shows Unverified badge when trust state is unverified", async () => {
    renderPanel({ trustState: "unverified" });
    expect(within(await openDetailsDialog()).getByText("Unverified")).toBeInTheDocument();
  });

  it("shows Stale badge when trust state is verification_expired", async () => {
    renderPanel({ trustState: "verification_expired" });
    expect(within(await openDetailsDialog()).getByText("Stale")).toBeInTheDocument();
  });
});

describe("PageRightPanel — visibility fact visible so a future deletion fails instead of going quiet", () => {
  it("shows Private for private visibility", async () => {
    renderPanel({ visibility: "private" });
    expect(within(await openDetailsDialog()).getByText("Private")).toBeInTheDocument();
  });

  it("shows Team for org visibility", async () => {
    renderPanel({ visibility: "org" });
    expect(within(await openDetailsDialog()).getByText("Team")).toBeInTheDocument();
  });

  it("shows Public for public visibility", async () => {
    renderPanel({ visibility: "public" });
    expect(within(await openDetailsDialog()).getByText("Public")).toBeInTheDocument();
  });
});

describe("PageRightPanel — nextReviewAt fact visible so a future deletion fails instead of going quiet", () => {
  it("shows review due text when nextReviewAt is set", async () => {
    renderPanel({ nextReviewAt: "2026-10-25T00:00:00.000Z" });
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText("Next review")).toBeInTheDocument();
    expect(within(dialog).queryByText("Not scheduled")).not.toBeInTheDocument();
  });

  it("shows that no review is scheduled when nextReviewAt is null", async () => {
    renderPanel({ nextReviewAt: null });
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText("Next review")).toBeInTheDocument();
    expect(within(dialog).getByText("Not scheduled")).toBeInTheDocument();
  });
});

describe("PageRightPanel — updatedAt fact visible so a future deletion fails instead of going quiet", () => {
  it("shows an edited time for the page", async () => {
    renderPanel({ updatedAt: "2026-09-25T10:00:00.000Z" });
    expect(within(await openDetailsDialog()).getByText("Edited")).toBeInTheDocument();
  });

  it("shows the editor name when lastEditedById resolves to a member", async () => {
    mockUseOrgMembersByIds.mockReturnValue({
      data: {
        data: [{ id: "user-alice", userId: "user-alice", name: "Alice Smith", email: "alice@co.com" }],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
    });
    renderPanel({ lastEditedById: "user-alice" });
    expect(within(await openDetailsDialog()).getByText(/Alice Smith/)).toBeInTheDocument();
  });

  it("keeps a safe editor fallback when the member cannot be resolved", async () => {
    renderPanel({ lastEditedById: "editor-missing" });
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText(/Member unavailable/)).toBeInTheDocument();
    expect(within(dialog).queryByText("editor-missing")).not.toBeInTheDocument();
  });
});

describe("PageRightPanel — owner fact visible so a future deletion fails instead of going quiet", () => {
  it("shows owner display name when ownerUserId resolves to a member", async () => {
    mockUseOrgMembersByIds.mockReturnValue({
      data: {
        data: [{ id: "user-bob", userId: "user-bob", name: "Bob Jones", email: "bob@co.com" }],
        pagination: { limit: 50, hasMore: false, nextCursor: null },
      },
    });
    renderPanel({ ownerUserId: "user-bob" });
    expect(within(await openDetailsDialog()).getByText("Bob Jones")).toBeInTheDocument();
  });

  it("shows an unassigned owner when ownerUserId is null", async () => {
    renderPanel({ ownerUserId: null });
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText("Owner")).toBeInTheDocument();
    expect(within(dialog).getByText("Unassigned")).toBeInTheDocument();
  });
});

describe("PageRightPanel — Activity section", () => {
  function activityEntry(overrides: Record<string, unknown> = {}) {
    return { id: 1, action: "kb.page.updated", at: "2026-09-05T10:00:00Z", actorKind: "member", actor: { membershipId: 1, name: "Alice" }, metadata: null, ...overrides };
  }

  it("shows the Activity heading inside the panel", async () => {
    renderPanel();
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText("Activity")).toBeInTheDocument();
  });

  it("shows empty activity message when the page has no recorded activity", async () => {
    renderPanel();
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText("No recent activity.")).toBeInTheDocument();
  });

  it("names the audited action in words with the actor, not the raw audit key", async () => {
    mockUseKbPageActivity.mockReturnValue({ data: [activityEntry({ action: "kb.page.version_restored" })], isLoading: false, isError: false });

    renderPanel();
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText(/Version restored · Alice/)).toBeInTheDocument();
    expect(within(dialog).queryByText(/kb\.page/)).not.toBeInTheDocument();
  });

  it("labels a sharing change as an access change", async () => {
    mockUseKbPageActivity.mockReturnValue({ data: [activityEntry({ action: "kb.page_grant.revoked", actor: null })], isLoading: false, isError: false });

    renderPanel();
    const dialog = await openDetailsDialog();
    expect(within(dialog).getByText("Access revoked")).toBeInTheDocument();
  });

  it("keeps the server's newest-first order", async () => {
    mockUseKbPageActivity.mockReturnValue({
      data: [activityEntry({ id: 2, action: "kb.page.published" }), activityEntry({ id: 1, action: "kb.page.created" })],
      isLoading: false,
      isError: false,
    });

    renderPanel();
    const dialog = await openDetailsDialog();
    const items = within(dialog).getAllByRole("listitem").filter((el) => el.closest("ul") !== null);
    expect(items[0]?.textContent ?? "").toContain("Published");
  });
});
