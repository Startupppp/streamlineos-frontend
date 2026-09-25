import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import TrashPage from "./trash-page";
import type { KbPageListItem } from "@/hooks/api/kb/page-types";

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
  DataTable: jest.fn(() => <div data-testid="data-table" />),
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
  it("renders a deleted-by filter input, so the backend deletedByMembershipId param has a frontend writer", () => {
    render(<TrashPage />);
    expect(
      screen.getByRole("spinbutton", { name: /deleted by membership id/i }),
    ).toBeInTheDocument();
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
