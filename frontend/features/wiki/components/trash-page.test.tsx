import React from "react";
import { render, screen } from "@testing-library/react";
import TrashPage from "./trash-page";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";
import type { DataTableColumn } from "@/components/ui/data-table.types";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn(), replace: jest.fn() })),
  usePathname: jest.fn(() => "/knowledge/wiki/trash"),
  useSearchParams: jest.fn(() => new URLSearchParams()),
}));

jest.mock("@/hooks/api/kb", () => ({
  useKbPagesTrash: jest.fn(),
  useEmptyKbTrash: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
}));

jest.mock("@/hooks/api/kb/pages", () => ({
  useKbBulkRestorePages: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useKbBulkPurgePages: jest.fn(() => ({ mutate: jest.fn(), isPending: false })),
  useKbTrashPurgeImpact: jest.fn(() => ({ data: undefined })),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: jest.fn(() => true),
}));

jest.mock("@/hooks/api/use-page-state", () => ({
  usePageState: jest.fn(),
}));

jest.mock("@/components/shared/page-state", () => ({
  PageState: jest.fn(
    ({
      resolution,
      children,
      empty,
    }: {
      resolution: { kind: string };
      children: React.ReactNode;
      empty?: React.ReactNode;
    }) => {
      if (resolution.kind === "empty") return <>{empty ?? null}</>;
      return <>{children}</>;
    },
  ),
}));

jest.mock("@/components/ui/data-table", () => ({
  DataTable: jest.fn(
    ({
      data,
      columns,
    }: {
      data: KbPageListItem[];
      columns: DataTableColumn<KbPageListItem>[];
    }) => (
      <div data-testid="data-table">
        {data.map((row) =>
          columns.map((col) =>
            col.cell ? (
              <div key={String(col.key)}>{col.cell(row)}</div>
            ) : null,
          ),
        )}
      </div>
    ),
  ),
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: jest.fn(() => null),
}));

jest.mock("./trash-retention-section", () => ({
  TrashRetentionSection: jest.fn(() => <div data-testid="trash-retention" />),
}));

jest.mock("@/lib/url-state/use-url-filters", () => ({
  useUrlFilters: jest.fn(() => ({
    update: jest.fn(),
    isPending: false,
  })),
}));

jest.mock("@/hooks/common/use-cursor-pagination", () => ({
  useCursorPagination: jest.fn(() => ({
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  })),
}));

jest.mock("@/hooks/api/organization", () => ({
  useOrgMembers: jest.fn(() => ({
    data: {
      data: [
        { membershipId: 7, userId: "user-7", name: "Alice Chen", email: "alice@example.com", image: null, role: "member", joinedAt: "2024-01-01T00:00:00Z", totpEnabled: false },
        { membershipId: 8, userId: "user-8", name: "Bob Smith", email: "bob@example.com", image: null, role: "member", joinedAt: "2024-01-02T00:00:00Z", totpEnabled: false },
      ],
      pagination: { hasMore: false, nextCursor: null, limit: 100 },
    },
    isLoading: false,
  })),
}));

jest.mock("@/hooks/api/kb/spaces", () => ({
  useKbSpaces: jest.fn(() => ({
    data: {
      data: [
        { id: 1, name: "Engineering" },
        { id: 2, name: "Product" },
      ],
      pagination: { hasMore: false, nextCursor: null, limit: 100 },
    },
    isLoading: false,
  })),
}));

const { useKbPagesTrash } = jest.requireMock("@/hooks/api/kb") as {
  useKbPagesTrash: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useSearchParams } = jest.requireMock("next/navigation") as {
  useSearchParams: jest.Mock;
};

const emptyListResponse = {
  data: [] as KbPageListItem[],
  pagination: { limit: 50, nextCursor: null, hasMore: false },
};

beforeEach(() => {
  jest.clearAllMocks();
  useSearchParams.mockReturnValue(new URLSearchParams());
  useKbPagesTrash.mockReturnValue({
    data: emptyListResponse,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  usePageState.mockReturnValue({ kind: "empty" });
});

describe("trash page deleted-by filter", () => {
  it("renders a member select for deleted-by, so the backend deletedByMembershipId param has a named frontend writer", () => {
    render(<TrashPage />);
    expect(
      screen.getByRole("combobox", { name: /deleted by member/i }),
    ).toBeInTheDocument();
  });

  it("member select shows member names so raw IDs are never visible on screen", () => {
    render(<TrashPage />);
    expect(screen.getByText("All members")).toBeInTheDocument();
  });

  it("passes deletedByMembershipId from the URL to the trash hook when the param is present", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("deletedByMembershipId=42"),
    );

    render(<TrashPage />);

    expect(useKbPagesTrash).toHaveBeenCalledWith(
      expect.objectContaining({ deletedByMembershipId: 42 }),
    );
  });

  it("does not include deletedByMembershipId in the hook params when the URL param is absent, so an empty filter is a no-op", () => {
    render(<TrashPage />);

    expect(useKbPagesTrash).toHaveBeenCalledWith(
      expect.not.objectContaining({ deletedByMembershipId: expect.anything() }),
    );
  });
});

describe("trash page space filter", () => {
  it("renders a space select, so the backend spaceId param has a frontend writer", () => {
    render(<TrashPage />);
    expect(
      screen.getByRole("combobox", { name: /space/i }),
    ).toBeInTheDocument();
  });

  it("space select shows space names so raw IDs are never visible on screen", () => {
    render(<TrashPage />);
    expect(screen.getByText("All spaces")).toBeInTheDocument();
  });

  it("passes spaceId from the URL to the trash hook when the param is present", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("spaceId=1"));

    render(<TrashPage />);

    expect(useKbPagesTrash).toHaveBeenCalledWith(
      expect.objectContaining({ spaceId: 1 }),
    );
  });

  it("does not include spaceId in the hook params when the URL param is absent, so an empty filter is a no-op", () => {
    render(<TrashPage />);

    expect(useKbPagesTrash).toHaveBeenCalledWith(
      expect.not.objectContaining({ spaceId: expect.anything() }),
    );
  });
});

describe("trash page date filter", () => {
  it("renders a deletedFrom date input so the backend date range has a frontend writer", () => {
    render(<TrashPage />);
    expect(screen.getByLabelText(/deleted from/i)).toBeInTheDocument();
  });

  it("renders a deletedBefore date input to close the upper end of the date range", () => {
    render(<TrashPage />);
    expect(screen.getByLabelText(/deleted before/i)).toBeInTheDocument();
  });

  it("passes deletedFrom from the URL to the trash hook when the param is present", () => {
    useSearchParams.mockReturnValue(
      new URLSearchParams("deletedFrom=2026-01-01T00%3A00%3A00.000Z"),
    );

    render(<TrashPage />);

    expect(useKbPagesTrash).toHaveBeenCalledWith(
      expect.objectContaining({ deletedFrom: "2026-01-01T00:00:00.000Z" }),
    );
  });

  it("does not include deletedFrom in the hook params when the URL param is absent, so an empty filter is a no-op", () => {
    render(<TrashPage />);

    expect(useKbPagesTrash).toHaveBeenCalledWith(
      expect.not.objectContaining({ deletedFrom: expect.anything() }),
    );
  });
});

describe("trash page legal hold indicator", () => {
  it("shows a legal hold badge on pages that have legalHold=true so the user knows a purge will be blocked", () => {
    usePageState.mockReturnValue({ kind: "content" });
    useKbPagesTrash.mockReturnValue({
      data: {
        data: [
          {
            id: 1,
            orgId: "org-1",
            spaceId: null,
            parentPageId: null,
            sortOrder: null,
            projectId: null,
            title: "Held Page",
            icon: null,
            coverImage: null,
            status: "published",
            contentType: "note",
            trustState: "unverified",
            visibility: "private",
            publicToken: null,
            publicSlug: null,
            isLocked: false,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
            deletedAt: "2026-06-01T00:00:00Z",
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
            contentRevision: 1,
            legalHold: true,
            legalHoldReason: "Litigation hold — case 2026-XYZ",
          },
        ],
        pagination: { limit: 50, nextCursor: null, hasMore: false },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TrashPage />);

    expect(screen.getByLabelText("Legal hold")).toBeInTheDocument();
  });

  it("does not show a legal hold badge on pages where legalHold=false, so the badge is not vacuous", () => {
    usePageState.mockReturnValue({ kind: "content" });
    useKbPagesTrash.mockReturnValue({
      data: {
        data: [
          {
            id: 2,
            orgId: "org-1",
            spaceId: null,
            parentPageId: null,
            sortOrder: null,
            projectId: null,
            title: "Normal Page",
            icon: null,
            coverImage: null,
            status: "published",
            contentType: "note",
            trustState: "unverified",
            visibility: "private",
            publicToken: null,
            publicSlug: null,
            isLocked: false,
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
            deletedAt: "2026-06-01T00:00:00Z",
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
            contentRevision: 1,
            legalHold: false,
            legalHoldReason: null,
          },
        ],
        pagination: { limit: 50, nextCursor: null, hasMore: false },
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TrashPage />);

    expect(screen.queryByLabelText("Legal hold")).not.toBeInTheDocument();
  });
});
