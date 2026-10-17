import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TrashPage from "./trash-page";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";
import type { DataTableColumn } from "@/components/ui/data-table.types";
import { DataTable } from "@/components/ui/data-table";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";

jest.mock("sonner", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

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
  useKbTrashDeleters: jest.fn(() => ({
    data: { pages: [{ data: [
      { membershipId: 7, name: "Alice Chen" },
      { membershipId: 8, name: "Bob Smith" },
    ], selected: null }] },
    hasNextPage: false,
    fetchNextPage: jest.fn(),
    isFetchingNextPage: false,
  })),
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

jest.mock("@/components/ui/date-picker", () => ({
  DatePicker: jest.fn(({ ariaLabel, value, onChange }: {
    ariaLabel: string;
    value: string;
    onChange: (value: string) => void;
  }) => (
    <input
      type="date"
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  )),
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
const { useEmptyKbTrash } = jest.requireMock("@/hooks/api/kb") as {
  useEmptyKbTrash: jest.Mock;
};
const { usePageState } = jest.requireMock("@/hooks/api/use-page-state") as {
  usePageState: jest.Mock;
};
const { useSearchParams } = jest.requireMock("next/navigation") as {
  useSearchParams: jest.Mock;
};
const { useCan } = jest.requireMock("@/hooks/api/access") as {
  useCan: jest.Mock;
};
const { useKbTrashDeleters } = jest.requireMock("@/hooks/api/kb/pages") as {
  useKbTrashDeleters: jest.Mock;
};
const { useCursorPagination } = jest.requireMock("@/hooks/common/use-cursor-pagination") as {
  useCursorPagination: jest.Mock;
};
const { useKbTrashPurgeImpact, useKbBulkPurgePages, useKbBulkRestorePages } = jest.requireMock("@/hooks/api/kb/pages") as {
  useKbTrashPurgeImpact: jest.Mock;
  useKbBulkPurgePages: jest.Mock;
  useKbBulkRestorePages: jest.Mock;
};
const { ConfirmDialog } = jest.requireMock("@/components/ui/confirm-dialog") as {
  ConfirmDialog: jest.Mock;
};

const emptyListResponse = {
  data: [] as KbPageListItem[],
  pagination: { limit: 50, nextCursor: null, hasMore: false },
};

const nonEmptyListResponse = {
  data: [
    {
      id: 9,
      orgId: "org-1",
      spaceId: null,
      parentPageId: null,
      sortOrder: null,
      projectId: null,
      title: "Some Page",
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
    } as KbPageListItem,
  ],
  pagination: { limit: 50, nextCursor: null, hasMore: false },
};

beforeEach(() => {
  jest.clearAllMocks();
  useCursorPagination.mockReturnValue({
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  });
  useSearchParams.mockReturnValue(new URLSearchParams());
  useKbPagesTrash.mockReturnValue({
    data: emptyListResponse,
    isLoading: false,
    isError: false,
    error: null,
    refetch: jest.fn(),
  });
  usePageState.mockReturnValue({ kind: "empty" });
  useCan.mockReturnValue(true);
  useKbTrashPurgeImpact.mockReturnValue({ data: undefined, isLoading: false, isError: false, error: null, refetch: jest.fn() });
  useKbBulkPurgePages.mockReturnValue({ mutate: jest.fn(), isPending: false });
});

describe("trash bulk purge impact confirmation", () => {
  it("keeps Empty Trash open through a pending request and exposes a failed request reference for retry", () => {
    const mutate = jest.fn();
    useEmptyKbTrash.mockReturnValue({ mutate, isPending: false });
    usePageState.mockReturnValue({ kind: "ready" });
    useKbPagesTrash.mockReturnValue({ data: nonEmptyListResponse, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    const view = render(<TrashPage />);
    fireEvent.click(screen.getByRole("button", { name: "Empty Trash" }));
    const emptyDialog = () => (ConfirmDialog as jest.Mock).mock.calls.at(-2)?.[0];

    act(() => emptyDialog().onConfirm());
    expect(emptyDialog().open).toBe(true);
    expect(emptyDialog().keepOpenOnConfirm).toBe(true);
    useEmptyKbTrash.mockReturnValue({ mutate, isPending: true });
    view.rerender(<TrashPage />);
    expect(emptyDialog().isPending).toBe(true);

    useEmptyKbTrash.mockReturnValue({ mutate, isPending: false });
    act(() => mutate.mock.calls[0][1].onError(new ApiError("Unavailable", 503, "UNAVAILABLE", { correlationId: "empty-req-1" })));
    view.rerender(<TrashPage />);
    expect(emptyDialog().open).toBe(true);
    render(<>{emptyDialog().content}</>);
    expect(screen.getByText("empty-req-1")).toBeInTheDocument();
    act(() => emptyDialog().onConfirm());
    expect(mutate).toHaveBeenCalledTimes(2);
    act(() => mutate.mock.calls[1][1].onSuccess({ purgedCount: 1 }));
    expect(emptyDialog().open).toBe(false);
  });

  it("keeps bulk purge open after a failed write and exposes its request reference for retry", () => {
    const mutate = jest.fn();
    useKbBulkPurgePages.mockReturnValue({ mutate, isPending: false });
    useKbTrashPurgeImpact.mockReturnValue({ data: { pageCount: 1, descendantCount: 0 }, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    const view = openPurgeConfirmation();

    act(() => purgeDialog().onConfirm());
    expect(purgeDialog().open).toBe(true);
    expect(purgeDialog().keepOpenOnConfirm).toBe(true);
    useKbBulkPurgePages.mockReturnValue({ mutate, isPending: true });
    view.rerender(<TrashPage />);
    expect(purgeDialog().isPending).toBe(true);

    useKbBulkPurgePages.mockReturnValue({ mutate, isPending: false });
    act(() => mutate.mock.calls[0][1].onError(new ApiError("Unavailable", 503, "UNAVAILABLE", { correlationId: "purge-req-1" })));
    view.rerender(<TrashPage />);
    expect(purgeDialog().open).toBe(true);
    render(<>{purgeDialog().content}</>);
    expect(screen.getByText("purge-req-1")).toBeInTheDocument();
    act(() => purgeDialog().onConfirm());
    expect(mutate).toHaveBeenCalledTimes(2);
    act(() => mutate.mock.calls[1][1].onSuccess({ results: [{ pageId: 9, result: "succeeded" }] }));
    expect(purgeDialog().open).toBe(false);
  });

  it("reports only restored pages and retains failed selections after a partial restore", () => {
    const mutate = jest.fn();
    useKbBulkRestorePages.mockReturnValue({ mutate, isPending: false });
    usePageState.mockReturnValue({ kind: "ready" });
    useKbPagesTrash.mockReturnValue({ data: nonEmptyListResponse, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    render(<TrashPage />);
    const table = DataTable as jest.Mock;
    act(() => table.mock.calls.at(-1)?.[0].selection.onChange(new Set(["9", "10"])));

    fireEvent.click(screen.getByRole("button", { name: "Restore 2" }));
    act(() => mutate.mock.calls[0][1].onSuccess({ results: [{ pageId: 9, result: "succeeded" }, { pageId: 10, result: "notFound" }] }));

    expect(toast.success).toHaveBeenCalledWith("Restored 1 page");
    expect(toast.error).toHaveBeenCalledWith("1 page could not be restored");
    expect(table.mock.calls.at(-1)?.[0].selection.selected).toEqual(new Set(["10"]));
  });

  it("does not claim permanent deletion when the bulk purge reports only conflicts", () => {
    const mutate = jest.fn();
    useKbBulkPurgePages.mockReturnValue({ mutate, isPending: false });
    useKbTrashPurgeImpact.mockReturnValue({ data: { pageCount: 1, descendantCount: 0 }, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    openPurgeConfirmation();

    act(() => purgeDialog().onConfirm());
    act(() => mutate.mock.calls[0][1].onSuccess({ results: [{ pageId: 9, result: "conflict" }] }));

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("1 page could not be permanently deleted");
    expect((DataTable as jest.Mock).mock.calls.at(-1)?.[0].selection.selected).toEqual(new Set(["9"]));
  });

  function openPurgeConfirmation() {
    usePageState.mockReturnValue({ kind: "ready" });
    useKbPagesTrash.mockReturnValue({ data: nonEmptyListResponse, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    const view = render(<TrashPage />);
    const table = DataTable as jest.Mock;
    const selection = table.mock.calls.at(-1)?.[0].selection as { onChange: (selected: Set<string>) => void };
    act(() => selection.onChange(new Set(["9"])));
    fireEvent.click(screen.getByRole("button", { name: "Purge 1" }));
    return view;
  }

  function purgeDialog() {
    return ConfirmDialog.mock.calls.at(-1)?.[0] as {
      open: boolean;
      keepOpenOnConfirm: boolean;
      isPending: boolean;
      description: string;
      content?: React.ReactNode;
      hideConfirm: boolean;
      onConfirm: () => void;
    };
  }

  it("keeps permanent deletion unavailable while impact is loading or failed", () => {
    const mutate = jest.fn();
    const refetch = jest.fn();
    useKbBulkPurgePages.mockReturnValue({ mutate, isPending: false });
    useKbTrashPurgeImpact.mockReturnValue({ data: undefined, isLoading: true, isError: false, error: null, refetch });
    const view = openPurgeConfirmation();

    expect(purgeDialog().hideConfirm).toBe(true);
    expect(purgeDialog().description).toContain("Checking child pages");
    act(() => purgeDialog().onConfirm());
    expect(mutate).not.toHaveBeenCalled();

    useKbTrashPurgeImpact.mockReturnValue({ data: undefined, isLoading: false, isError: true, error: new Error("offline"), refetch });
    view.rerender(<TrashPage />);

    expect(purgeDialog().hideConfirm).toBe(true);
    expect(purgeDialog().description).toContain("Could not verify the impact");
    act(() => purgeDialog().onConfirm());
    expect(mutate).not.toHaveBeenCalled();
    render(<>{purgeDialog().content}</>);
    fireEvent.click(screen.getByRole("button", { name: "Retry impact check" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("enables deletion only after the impact read includes descendant pages", () => {
    const mutate = jest.fn();
    useKbBulkPurgePages.mockReturnValue({ mutate, isPending: false });
    const view = openPurgeConfirmation();

    expect(purgeDialog().hideConfirm).toBe(true);
    useKbTrashPurgeImpact.mockReturnValue({ data: { pageCount: 1, descendantCount: 2 }, isLoading: false, isError: false, error: null, refetch: jest.fn() });
    view.rerender(<TrashPage />);

    expect(purgeDialog().hideConfirm).toBe(false);
    expect(purgeDialog().description).toContain("2 child pages");
    act(() => purgeDialog().onConfirm());
    expect(mutate).toHaveBeenCalledWith([9], expect.anything());
  });
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

  it("searches the member directory so choices are not limited to its first page", () => {
    jest.useFakeTimers();
    try {
      render(<TrashPage />);
      fireEvent.change(screen.getByRole("searchbox", { name: "Find member" }), {
        target: { value: "Zoe" },
      });
      act(() => jest.advanceTimersByTime(300));
      expect(useKbTrashDeleters).toHaveBeenLastCalledWith("Zoe", undefined);
    } finally {
      jest.useRealTimers();
    }
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

  it("renders an inclusive deleted-through date input", () => {
    render(<TrashPage />);
    expect(screen.getByLabelText(/deleted through/i)).toBeInTheDocument();
  });

  it("writes date-only filters to the URL and resets pagination", () => {
    const update = jest.fn();
    const reset = jest.fn();
    const { useUrlFilters } = jest.requireMock("@/lib/url-state/use-url-filters") as {
      useUrlFilters: jest.Mock;
    };
    useUrlFilters.mockReturnValue({ update, isPending: false });
    useCursorPagination.mockReturnValue({
      cursor: undefined,
      pageNumber: 1,
      hasPrevious: false,
      goNext: jest.fn(),
      goPrevious: jest.fn(),
      reset,
    });

    render(<TrashPage />);
    fireEvent.change(screen.getByLabelText(/deleted from/i), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByLabelText(/deleted through/i), {
      target: { value: "2026-06-30" },
    });

    expect(update).toHaveBeenNthCalledWith(1, { deletedFrom: "2026-06-01" });
    expect(update).toHaveBeenNthCalledWith(2, { deletedBefore: "2026-06-30" });
    expect(reset).toHaveBeenCalledTimes(2);
  });

  it("sends local-day boundaries with an exclusive next-day upper bound", () => {
    useSearchParams.mockReturnValue(new URLSearchParams(
      "deletedFrom=2026-06-01&deletedBefore=2026-06-30",
    ));

    render(<TrashPage />);

    const from = new Date(2026, 5, 1);
    const afterThroughDay = new Date(2026, 6, 1);
    expect(useKbPagesTrash).toHaveBeenCalledWith(expect.objectContaining({
      deletedFrom: from.toISOString(),
      deletedBefore: afterThroughDay.toISOString(),
    }));
    expect(screen.getByLabelText(/deleted from/i)).toHaveValue("2026-06-01");
    expect(screen.getByLabelText(/deleted through/i)).toHaveValue("2026-06-30");
    expect(new Date(afterThroughDay.getTime() - 1).getDate()).toBe(30);
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

describe("trash page retention permission split", () => {
  it("Empty Trash requires kb:settings:manage on top of kb:pages:purge — emptying the trash overrides retention, so it needs the settings permission as well as the purge one", () => {
    usePageState.mockReturnValue({ kind: "content" });
    useKbPagesTrash.mockReturnValue({
      data: nonEmptyListResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    useCan.mockImplementation(
      (key: string) => key === "kb:settings:manage" || key === "kb:pages:purge",
    );

    render(<TrashPage />);

    expect(screen.getByRole("button", { name: /empty trash/i })).toBeInTheDocument();
  });

  it("Empty Trash is hidden when kb:settings:manage is held without kb:pages:purge, because the server enforces the purge key and the button would only earn a 403", () => {
    usePageState.mockReturnValue({ kind: "content" });
    useKbPagesTrash.mockReturnValue({
      data: nonEmptyListResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    useCan.mockImplementation((key: string) => key === "kb:settings:manage");

    render(<TrashPage />);

    expect(screen.queryByRole("button", { name: /empty trash/i })).not.toBeInTheDocument();
  });

  it("Empty Trash is hidden when kb:settings:manage is absent, even if kb:pages:purge is present", () => {
    usePageState.mockReturnValue({ kind: "content" });
    useKbPagesTrash.mockReturnValue({
      data: nonEmptyListResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
    useCan.mockImplementation((key: string) => key === "kb:pages:purge");

    render(<TrashPage />);

    expect(screen.queryByRole("button", { name: /empty trash/i })).not.toBeInTheDocument();
  });
});

describe("trash page mobile card selection", () => {
  it("exposes a labelled keyboard-operable checkbox that reaches bulk restore", async () => {
    usePageState.mockReturnValue({ kind: "content" });
    useKbPagesTrash.mockReturnValue({
      data: nonEmptyListResponse,
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<TrashPage />);

    const mobileCard = jest.mocked(DataTable).mock.calls.at(-1)?.[0].mobileCard;
    expect(mobileCard).toBeDefined();
    render(<>{mobileCard?.(nonEmptyListResponse.data[0], 0)}</>);

    const select = screen.getByRole("checkbox", { name: "Select Some Page" });
    select.focus();
    await userEvent.setup().keyboard(" ");

    expect(screen.getByRole("button", { name: "Restore 1" })).toBeInTheDocument();
  });
});

describe("trash page first-empty is not the same claim as filtered-empty", () => {
  it("updates the search input when in-place navigation changes the URL query", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("q=invoice"));
    const view = render(<TrashPage />);
    expect(screen.getByRole("searchbox", { name: "Search deleted pages" })).toHaveValue("invoice");

    useSearchParams.mockReturnValue(new URLSearchParams("q=policy"));
    view.rerender(<TrashPage />);

    expect(screen.getByRole("searchbox", { name: "Search deleted pages" })).toHaveValue("policy");
    expect(useKbPagesTrash).toHaveBeenLastCalledWith(expect.objectContaining({ q: "policy" }));
  });

  it("does not let an old debounced search overwrite a navigated query", () => {
    jest.useFakeTimers();
    try {
      const update = jest.fn();
      const { useUrlFilters } = jest.requireMock(
        "@/lib/url-state/use-url-filters",
      ) as { useUrlFilters: jest.Mock };
      useUrlFilters.mockReturnValue({ update, isPending: false });
      useSearchParams.mockReturnValue(new URLSearchParams("q=invoice"));

      const view = render(<TrashPage />);
      fireEvent.change(screen.getByRole("searchbox", { name: "Search deleted pages" }), {
        target: { value: "unfinished" },
      });

      useSearchParams.mockReturnValue(new URLSearchParams("q=policy"));
      view.rerender(<TrashPage />);
      act(() => jest.advanceTimersByTime(350));

      expect(screen.getByRole("searchbox", { name: "Search deleted pages" })).toHaveValue("policy");
      expect(update).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("cancels a pending search update when Trash unmounts", () => {
    jest.useFakeTimers();
    try {
      const update = jest.fn();
      const { useUrlFilters } = jest.requireMock(
        "@/lib/url-state/use-url-filters",
      ) as { useUrlFilters: jest.Mock };
      useUrlFilters.mockReturnValue({ update, isPending: false });

      const view = render(<TrashPage />);
      fireEvent.change(screen.getByRole("searchbox", { name: "Search deleted pages" }), {
        target: { value: "unfinished" },
      });
      view.unmount();
      act(() => jest.advanceTimersByTime(350));

      expect(update).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it("offers the previous page instead of claiming the whole trash is empty when a later cursor page is empty", () => {
    const goPrevious = jest.fn();
    useCursorPagination.mockReturnValue({
      cursor: "later-page",
      pageNumber: 2,
      hasPrevious: true,
      goNext: jest.fn(),
      goPrevious,
      reset: jest.fn(),
    });

    render(<TrashPage />);

    expect(screen.getByText("No deleted pages on this page")).toBeInTheDocument();
    expect(screen.queryByText("Trash is empty")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous page" }));
    expect(goPrevious).toHaveBeenCalledTimes(1);
  });

  it("with no filters in the URL the empty branch claims the trash itself is empty and offers no Clear filters escape", () => {
    useSearchParams.mockReturnValue(new URLSearchParams());

    render(<TrashPage />);

    expect(screen.getByText("Trash is empty")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /clear filters/i }),
    ).not.toBeInTheDocument();
  });

  it("with a search term in the URL the empty branch blames the filters instead of claiming the trash is empty", () => {
    useSearchParams.mockReturnValue(new URLSearchParams("q=invoice"));

    render(<TrashPage />);

    expect(
      screen.getByText("No deleted pages match your filters."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Trash is empty")).not.toBeInTheDocument();
  });

  it("each of the five trash filters on its own is enough to reach the filtered-empty branch", () => {
    const filterParams = [
      "q=invoice",
      "spaceId=1",
      "deletedByMembershipId=7",
      "deletedFrom=2026-01-01T00:00:00.000Z",
      "deletedBefore=2026-06-01T00:00:00.000Z",
    ];

    for (const param of filterParams) {
      useSearchParams.mockReturnValue(new URLSearchParams(param));
      const { unmount } = render(<TrashPage />);

      expect(
        screen.getByText("No deleted pages match your filters."),
      ).toBeInTheDocument();
      expect(screen.queryByText("Trash is empty")).not.toBeInTheDocument();

      unmount();
    }
  });

  it("the filtered-empty branch offers a Clear filters control that drops every one of the five trash filters", () => {
    const update = jest.fn();
    const { useUrlFilters } = jest.requireMock(
      "@/lib/url-state/use-url-filters",
    ) as { useUrlFilters: jest.Mock };
    useUrlFilters.mockReturnValue({ update, isPending: false });
    useSearchParams.mockReturnValue(
      new URLSearchParams("q=invoice&spaceId=1&deletedByMembershipId=7"),
    );

    render(<TrashPage />);
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));

    expect(update).toHaveBeenCalledWith({
      q: null,
      spaceId: null,
      deletedByMembershipId: null,
      deletedFrom: null,
      deletedBefore: null,
    });
  });
});
