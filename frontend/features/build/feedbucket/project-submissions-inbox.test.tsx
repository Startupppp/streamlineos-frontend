import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { BuildListSurfaceProps } from "@/features/build/shared/build-list-surface";
import type { SubmissionRow } from "./submission-inbox-columns";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRequestLeave = jest.fn((action: () => void) => action());
const mockSearchParamsContainer = { current: new URLSearchParams() };
const mockPathname = "/build/42/feedbucket";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParamsContainer.current,
}));

jest.mock("@/components/shared/dirty-state-context", () => ({
  useNavigationLeave: () => mockRequestLeave,
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn() },
}));

const mockUseCan = jest.fn((_key: string) => false);
jest.mock("@/hooks/api/access", () => ({
  useCan: (key: string) => mockUseCan(key),
}));

const mockUseFeedbucketSubmissions = jest.fn();
const mockUseDeleteFeedbucketSubmission = jest.fn();
jest.mock("@/hooks/api/feedbucket", () => ({
  useFeedbucketSubmissions: (...args: unknown[]) => mockUseFeedbucketSubmissions(...args),
  useDeleteFeedbucketSubmission: () => mockUseDeleteFeedbucketSubmission(),
}));

jest.mock("@/hooks/common/use-cursor-pagination", () => ({
  useCursorPagination: () => ({
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: jest.fn(),
    goPrevious: jest.fn(),
    reset: jest.fn(),
  }),
}));

jest.mock("@/features/build/shared/use-build-list-keyboard", () => ({
  useBuildListKeyboard: jest.fn(),
}));

type CapturedSurface = BuildListSurfaceProps<SubmissionRow>;
let capturedSurface: CapturedSurface | null = null;
jest.mock("@/features/build/shared/build-list-surface", () => ({
  BuildListSurface: (props: CapturedSurface) => {
    capturedSurface = props;
    return <div data-testid="build-list-surface" />;
  },
}));

jest.mock("./submission-inbox-filters", () => ({
  SubmissionInboxFilters: () => <div data-testid="inbox-filters" />,
}));

jest.mock("@/components/shared/submission-bulk-toolbar", () => ({
  SubmissionBulkToolbar: () => <div data-testid="bulk-toolbar" />,
}));

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onConfirm,
  }: {
    open: boolean;
    onConfirm: () => void;
    onOpenChange: (v: boolean) => void;
    title: string;
    description: string;
    confirmLabel: string;
    destructive?: boolean;
    isPending?: boolean;
    keepOpenOnConfirm?: boolean;
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <button type="button" onClick={onConfirm}>
          Confirm
        </button>
      </div>
    ) : null,
}));

import { ProjectSubmissionsInbox } from "./project-submissions-inbox";

const ROW: SubmissionRow = {
  id: 7,
  message: "Test feedback message",
  status: "open",
  type: "bug",
  createdAt: "2026-01-01T00:00:00Z",
} as SubmissionRow;

const READY = {
  data: {
    data: [ROW],
    pagination: { hasMore: false, nextCursor: undefined },
  },
  isLoading: false,
  isError: false,
  error: undefined,
  refetch: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  capturedSurface = null;
  mockSearchParamsContainer.current = new URLSearchParams();
  mockUseCan.mockReturnValue(false);
  mockUseFeedbucketSubmissions.mockReturnValue(READY);
  mockUseDeleteFeedbucketSubmission.mockReturnValue({
    mutate: jest.fn(),
    isPending: false,
  });
});

function renderInbox() {
  return render(<ProjectSubmissionsInbox widgetId={1} projectId={42} />);
}

describe("ProjectSubmissionsInbox — surface declarations", () => {
  it("passes feedbucket:submissions:view as the permission key", () => {
    renderInbox();
    expect(capturedSurface?.permission).toBe("feedbucket:submissions:view");
  });

  it("passes rows from the submissions query to BuildListSurface", () => {
    renderInbox();
    expect(capturedSurface?.rows).toEqual([ROW]);
  });

  it("passes isLoading from the submissions query to BuildListSurface", () => {
    mockUseFeedbucketSubmissions.mockReturnValue({
      ...READY,
      data: undefined,
      isLoading: true,
    });
    renderInbox();
    expect(capturedSurface?.isLoading).toBe(true);
  });

  it("passes isError and error from the submissions query to BuildListSurface (FE-41)", () => {
    const err = new Error("failed");
    mockUseFeedbucketSubmissions.mockReturnValue({
      ...READY,
      data: undefined,
      isError: true,
      error: err,
    });
    renderInbox();
    expect(capturedSurface?.isError).toBe(true);
    expect(capturedSurface?.error).toBe(err);
  });

  it("passes isFiltered true when a filter param is present in the URL", () => {
    mockSearchParamsContainer.current = new URLSearchParams("status=open");
    renderInbox();
    expect(capturedSurface?.isFiltered).toBe(true);
  });

  it("passes isFiltered false when no filter params are present", () => {
    renderInbox();
    expect(capturedSurface?.isFiltered).toBe(false);
  });

  it("supplies the first-run empty copy in the empty prop", () => {
    renderInbox();
    const { getByText } = render(capturedSurface?.empty as React.ReactElement);
    expect(getByText("No submissions yet")).toBeDefined();
  });

  it("supplies the filtered empty copy in the filteredEmpty prop", () => {
    renderInbox();
    const { getByText } = render(capturedSurface?.filteredEmpty as React.ReactElement);
    expect(getByText("No matching submissions")).toBeDefined();
  });
});

describe("ProjectSubmissionsInbox — selection gating", () => {
  it("omits selection when neither canUpdate nor canDelete is granted", () => {
    renderInbox();
    expect(capturedSurface?.selection).toBeUndefined();
  });

  it("provides selection when canDelete is granted", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:delete");
    renderInbox();
    expect(capturedSurface?.selection).toBeDefined();
  });

  it("provides selection when canUpdate is granted", () => {
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:update");
    renderInbox();
    expect(capturedSurface?.selection).toBeDefined();
  });
});

describe("ProjectSubmissionsInbox — delete confirmation", () => {
  it("ConfirmDialog is absent before a delete is requested", () => {
    renderInbox();
    expect(screen.queryByTestId("confirm-dialog")).toBeNull();
  });

  it("ConfirmDialog renders after handleRequestDelete is called and calls delete on confirm", async () => {
    const mutate = jest.fn();
    mockUseDeleteFeedbucketSubmission.mockReturnValue({ mutate, isPending: false });
    mockUseCan.mockImplementation((key: string) => key === "feedbucket:submissions:delete");

    renderInbox();

    const deleteBtn = capturedSurface?.columns
      ?.find((c) => c.key === "actions")
      ?.cell(ROW) as React.ReactElement | undefined;

    expect(deleteBtn).toBeDefined();
    const { getByRole } = render(deleteBtn as React.ReactElement);
    await userEvent.click(getByRole("button"));

    await waitFor(() => {
      expect(screen.getByTestId("confirm-dialog")).toBeDefined();
    });

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(mutate).toHaveBeenCalledWith(
      { submissionId: ROW.id },
      expect.any(Object),
    );
  });
});
