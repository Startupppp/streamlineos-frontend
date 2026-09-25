import * as React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * HRMS-E2E-022. The export button has to end in a file or in a message — never
 * in nothing. These tests assert the two halves jsdom can see: that the blob
 * reached `downloadBlob`, and that a toast named what happened. Whether the
 * browser actually writes the file to disk is a browser check (FE-123).
 */

type MutationStub = {
  mutate: jest.Mock;
  mutateAsync: jest.Mock;
  isPending: boolean;
  variables: undefined;
};

function mutationStub(): MutationStub {
  return {
    mutate: jest.fn(),
    mutateAsync: jest.fn().mockResolvedValue(undefined),
    isPending: false,
    variables: undefined,
  };
}

function queryStub(data: unknown) {
  return {
    data,
    isLoading: false,
    isPending: false,
    isError: false,
    error: null,
    isSuccess: true,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  };
}

const leaveRequest = (id: number, status: string, firstName: string) => ({
  id,
  status,
  priority: "Medium",
  reason: null,
  startDate: "2026-09-21",
  endDate: "2026-09-22",
  createdAt: "2026-09-15T00:00:00.000Z",
  leaveType: { id: 1, name: "Annual" },
  approver: null,
  user: {
    id: `user_${id}`,
    firstName,
    lastName: "Lovelace",
    email: `${firstName}@example.com`,
    image: null,
  },
});

/** Four team requests, as in the QA repro. */
const TEAM_PAGES = {
  pages: [
    {
      data: [
        leaveRequest(1, "PENDING", "Ada"),
        leaveRequest(2, "PENDING", "Grace"),
        leaveRequest(3, "PENDING", "Hedy"),
        leaveRequest(4, "APPROVED", "Katherine"),
      ],
      pageInfo: { limit: 50, hasMore: false, nextCursor: null },
    },
  ],
  pageParams: [null],
};

const MINE_EMPTY = {
  pages: [{ data: [], pageInfo: { limit: 20, hasMore: false, nextCursor: null } }],
  pageParams: [null],
};

const MINE_FOUR = {
  pages: [
    {
      data: [
        leaveRequest(11, "PENDING", "Self"),
        leaveRequest(12, "APPROVED", "Self"),
        leaveRequest(13, "REJECTED", "Self"),
        leaveRequest(14, "PENDING", "Self"),
      ],
      pageInfo: { limit: 20, hasMore: false, nextCursor: null },
    },
  ],
  pageParams: [null],
};

let minePages: unknown = MINE_EMPTY;

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/hr/leaves",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { id: "user_admin", name: "Admin" }, orgId: "org_1" },
    status: "authenticated",
  }),
}));

jest.mock("@/hooks/api/access", () => ({
  useCan: () => true,
  useAccess: () => ({ data: { isOrgOwner: false, scopes: {} }, isLoading: false }),
  useModuleEnabled: () => true,
}));

jest.mock("@/hooks/api/hr", () => {
  const named: Record<string, unknown> = {
    useHrLeaveContext: () =>
      queryStub({ balances: [], types: [], approvers: [], joiningDate: null }),
    useHrMyLeaveRequestsInfinite: () => queryStub(minePages),
    useHrLeaveApprovals: () => queryStub(TEAM_PAGES),
    useHrLeavesThisWeek: () => queryStub([]),
    useHrPendingWfhRequests: () => queryStub([]),
    useHrWfhRequests: () => queryStub([]),
    useLeavePolicy: () => queryStub(null),
  };
  const actual = jest.requireActual("@/hooks/api/hr") as Record<string, unknown>;
  const filled: Record<string, unknown> = {};
  for (const key of Object.keys(actual))
    filled[key] = named[key] ?? ((): MutationStub => mutationStub());
  return { ...filled, ...named };
});

jest.mock("@/features/hr/leaves/leave-request-sheet", () => ({
  LeaveRequestSheet: () => null,
}));

jest.mock("@/features/hr/leaves/wfh-request-sheet", () => ({
  WfhRequestSheet: () => null,
}));

const downloadBlob = jest.fn();
jest.mock("@/lib/download-blob", () => ({
  downloadBlob: (blob: Blob, filename: string) => downloadBlob(blob, filename),
}));

const toastSuccess = jest.fn();
const toastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (message: string) => toastSuccess(message),
    error: (message: string) => toastError(message),
  },
}));

import { LeavesWfhContent } from "@/features/hr/leaves/components/leaves-wfh-content";

function renderPage() {
  return render(
    <TooltipProvider>
      <LeavesWfhContent />
    </TooltipProvider>,
  );
}

async function clickExport() {
  fireEvent.click(screen.getByRole("button", { name: /Export/ }));
  await waitFor(() =>
    expect(
      downloadBlob.mock.calls.length + toastError.mock.calls.length,
    ).toBeGreaterThan(0),
  );
}

describe("LeavesWfhContent — leave export never ends in silence", () => {
  beforeEach(() => {
    minePages = MINE_EMPTY;
    downloadBlob.mockClear();
    toastSuccess.mockClear();
    toastError.mockClear();
  });

  it("writes a file and a toast naming the row count when the viewed list has rows", async () => {
    minePages = MINE_FOUR;
    renderPage();

    await clickExport();

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("4"));
  });

  it("writes a header-only file and says so when the viewed list is empty", async () => {
    renderPage();

    await clickExport();

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringMatching(/empty|no leave/i));
  });

  it("exports the approvals the admin is looking at, not their own empty list", async () => {
    renderPage();

    fireEvent.mouseDown(screen.getByRole("tab", { name: /Approvals/ }));
    await clickExport();

    expect(downloadBlob).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith(expect.stringContaining("4"));
  });
});
