"use client";

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
  useCanState: jest.fn(() => "allowed"),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: {
    get: jest.fn().mockResolvedValue({ data: [], pagination: { limit: 50, nextCursor: null, hasMore: false } }),
    post: jest.fn().mockResolvedValue({ id: 1 }),
  },
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUseKbPage = jest.fn();
const mockUseKbPageVersionsInfinite = jest.fn();
const mockUseKbPageVersionDetail = jest.fn();
const mockUseRestoreKbVersion = jest.fn();

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbPage: (...args: unknown[]) => mockUseKbPage(...args),
}));

jest.mock("@/hooks/api/kb/page-versions", () => ({
  useKbPageVersionsInfinite: (...args: unknown[]) => mockUseKbPageVersionsInfinite(...args),
  useKbPageVersionDetail: (...args: unknown[]) => mockUseKbPageVersionDetail(...args),
  useRestoreKbVersion: () => mockUseRestoreKbVersion(),
}));

const PAGE = {
  id: 1,
  title: "My Page",
  content: { type: "doc", content: [] },
  contentText: null,
  orgId: "org-1",
  spaceId: null,
  parentPageId: null,
  sortOrder: 0,
  projectId: null,
  icon: null,
  coverImage: null,
  status: "draft",
  contentType: "rich_text",
  trustState: "unverified",
  visibility: "private",
  publicToken: null,
  publicSlug: null,
  isLocked: false,
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
  deletedAt: null,
  createdByMembershipId: null,
  lastEditedByMembershipId: null,
  deletedByMembershipId: null,
  ownerMembershipId: null,
  verifiedByMembershipId: null,
  createdById: null,
  lastEditedById: null,
  deletedById: null,
  ownerUserId: null,
  verifiedById: null,
  verifiedUntil: null,
  nextReviewAt: null,
  aclRevision: 1,
  contentRevision: 3,
  sourceArticleId: null,
  ancestors: [],
  isFavorite: false,
};

const VERSION_3 = {
  id: 30,
  orgId: "org-1",
  pageId: 1,
  versionNumber: 3,
  title: "Version 3 title",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "version text" }] }] },
  contentText: "version text",
  changeSummary: "Fixed typo",
  authorId: "u1",
  authorMembershipId: 1,
  authorName: "Alice",
  createdAt: "2024-01-03T00:00:00Z",
};

const VERSION_2 = {
  id: 20,
  orgId: "org-1",
  pageId: 1,
  versionNumber: 2,
  title: "Version 2 title",
  content: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "old text" }] }] },
  contentText: "old text",
  changeSummary: "Initial",
  authorId: "u1",
  authorMembershipId: 1,
  authorName: "Alice",
  createdAt: "2024-01-02T00:00:00Z",
};

function makeVersionsData(versions: typeof VERSION_3[]) {
  return {
    pages: [
      {
        data: versions,
        pagination: { limit: 50, nextCursor: null, hasMore: false },
      },
    ],
  };
}

function defaultSetup(opts: {
  versions?: typeof VERSION_3[];
  versionsLoading?: boolean;
  pageLoading?: boolean;
  pageError?: boolean;
} = {}) {
  const versions = opts.versions ?? [VERSION_3, VERSION_2];
  mockUseKbPage.mockReturnValue({
    data: opts.pageLoading || opts.pageError ? undefined : PAGE,
    isLoading: opts.pageLoading ?? false,
    isError: opts.pageError ?? false,
  });
  mockUseKbPageVersionsInfinite.mockReturnValue({
    data: opts.versionsLoading ? undefined : makeVersionsData(versions),
    isLoading: opts.versionsLoading ?? false,
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  });
  mockUseKbPageVersionDetail.mockReturnValue({
    data: undefined,
    isLoading: false,
  });
  mockUseRestoreKbVersion.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
}

let PageHistoryPage: React.ComponentType<{ pageId: number }>;

beforeAll(async () => {
  const mod = await import("./page-history-page");
  PageHistoryPage = mod.default;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PageHistoryPage — state: loading", () => {
  it("shows skeletons while the page is loading", () => {
    defaultSetup({ pageLoading: true });
    render(<PageHistoryPage pageId={1} />);
    const skeletons = document.querySelectorAll('[data-testid="skeleton"], .animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(1);
  });
});

describe("PageHistoryPage — state: error", () => {
  it("shows retry button on page error", () => {
    defaultSetup({ pageError: true });
    render(<PageHistoryPage pageId={1} />);
    expect(screen.getByText("Retry")).toBeInTheDocument();
  });
});

describe("PageHistoryPage — state: empty versions", () => {
  it("shows empty state when versions list is empty", () => {
    defaultSetup({ versions: [] });
    render(<PageHistoryPage pageId={1} />);
    expect(screen.getByText(/no versions yet/i)).toBeInTheDocument();
  });
});

describe("PageHistoryPage — state: versions loaded (select prompt)", () => {
  it("shows 'Select a version to preview' when nothing is selected", () => {
    defaultSetup();
    render(<PageHistoryPage pageId={1} />);
    expect(screen.getByText(/select a version to preview/i)).toBeInTheDocument();
  });
});

describe("PageHistoryPage — current-version marker", () => {
  it("marks the highest versionNumber with a Current badge", () => {
    defaultSetup({ versions: [VERSION_3, VERSION_2] });
    render(<PageHistoryPage pageId={1} />);
    const currentBadges = screen.getAllByText("Current");
    expect(currentBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("does not mark version 2 as current when version 3 exists", () => {
    defaultSetup({ versions: [VERSION_3, VERSION_2] });
    render(<PageHistoryPage pageId={1} />);
    const v2Buttons = screen.getAllByRole("button", { name: /version 2/i });
    const v2Button = v2Buttons.find(
      (b) => b.getAttribute("data-version-number") === "2",
    );
    expect(v2Button).toBeDefined();
    expect(v2Button?.textContent).not.toContain("Current");
  });
});

describe("PageHistoryPage — compare mode toggle", () => {
  it("shows compare mode button", () => {
    defaultSetup();
    render(<PageHistoryPage pageId={1} />);
    expect(screen.getByRole("button", { name: /compare/i })).toBeInTheDocument();
  });

  it("entering compare mode shows the compare UI hint", () => {
    defaultSetup();
    render(<PageHistoryPage pageId={1} />);
    const compareBtn = screen.getByRole("button", { name: /enter compare mode/i });
    fireEvent.click(compareBtn);
    expect(screen.getByText(/select base version/i)).toBeInTheDocument();
  });
});

describe("PageHistoryPage — keyboard navigation", () => {
  it("version buttons are keyboard accessible (role=button)", () => {
    defaultSetup();
    render(<PageHistoryPage pageId={1} />);
    const versionButtons = screen.getAllByRole("button", { name: /select version/i });
    expect(versionButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("version buttons have aria-label", () => {
    defaultSetup({ versions: [VERSION_3] });
    render(<PageHistoryPage pageId={1} />);
    const btn = screen.getByRole("button", { name: /select version 3/i });
    expect(btn).toBeDefined();
  });
});

describe("PageHistoryPage — restore shows confirmation", () => {
  it("requires a version to be selected before restore is available", () => {
    defaultSetup();
    render(<PageHistoryPage pageId={1} />);
    const restoreBtns = screen.queryAllByRole("button", { name: /restore/i });
    expect(restoreBtns.length).toBe(0);
  });
});
