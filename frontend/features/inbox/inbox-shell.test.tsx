import { render, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { InboxShell } from "./inbox-shell";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "u-1" } },
  }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "error"),
}));

jest.mock("@/hooks/api/notifications", () => ({
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
  useArchiveNotification: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
  useUnarchiveNotification: () => ({ mutate: jest.fn() }),
  useDeleteNotification: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
  usePinNotification: () => ({ mutate: jest.fn() }),
  useUnpinNotification: () => ({ mutate: jest.fn() }),
  useSnoozeNotification: () => ({ mutate: jest.fn() }),
  useApproveNotification: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
  useRejectNotification: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
}));

jest.mock("@/hooks/api/inbox", () => ({
  useUnifiedInbox: () => ({
    data: {
      pages: [
        {
          items: [
            {
              kind: "notification",
              id: 1,
              subject: "Test notification",
              body: "Body",
              notifType: "INFO",
              priority: "NORMAL",
              category: "SYSTEM",
              sourceModule: null,
              isRead: false,
              pinned: false,
              deepLink: null,
              eventKey: null,
              timestamp: new Date().toISOString(),
              actor: null,
              dedupKey: "k1",
            },
          ],
          hasMore: false,
          nextCursor: null,
          sources: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    refetch: jest.fn(),
  }),
}));

let capturedOnArchive: ((id: number) => void) | null = null;
let capturedOnApprove: ((id: number) => void) | null = null;
let capturedOnReject: ((id: number) => void) | null = null;

jest.mock("./inbox-virtual-list", () => ({
  InboxVirtualList: (props: {
    onArchive: (id: number) => void;
    onApprove: (id: number) => void;
    onReject: (id: number) => void;
    [key: string]: unknown;
  }) => {
    capturedOnArchive = props.onArchive;
    capturedOnApprove = props.onApprove;
    capturedOnReject = props.onReject;
    return null;
  },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({
    children,
    filters,
  }: {
    children: ReactNode;
    filters?: ReactNode;
  }) => createElement("div", null, filters, children),
}));

jest.mock("@/components/ui/empty-state", () => ({
  EmptyState: () => null,
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => null,
}));

jest.mock("@/features/notifications/notification-list-skeleton", () => ({
  NotificationListSkeleton: () => null,
}));

jest.mock("next/dynamic", () => () => () => null);

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

type SonerMock = { toast: { error: jest.Mock; success: jest.Mock } };
type NotificationsMock = {
  useArchiveNotification: jest.Mock;
  useApproveNotification: jest.Mock;
  useRejectNotification: jest.Mock;
  [key: string]: unknown;
};

function getSonerMock() {
  return jest.requireMock<SonerMock>("sonner");
}

function getNotificationsMock() {
  return jest.requireMock<NotificationsMock>("@/hooks/api/notifications");
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedOnArchive = null;
  capturedOnApprove = null;
  capturedOnReject = null;
});

describe("inbox lifecycle mutations — error toast on failure", () => {
  it("calls toast.error when archive mutation fails", () => {
    getNotificationsMock().useArchiveNotification = () => ({
      mutate: (id: number, opts?: { onError?: (e: Error) => void }) => {
        opts?.onError?.(new Error("Archive failed"));
      },
      isPending: false,
      variables: undefined,
    });

    render(<InboxShell />);

    expect(capturedOnArchive).not.toBeNull();
    act(() => capturedOnArchive!(1));

    expect(getSonerMock().toast.error).toHaveBeenCalledWith("Archive failed");
  });

  it("no toast.error when archive has no onError — proves OLD code would fail this test", () => {
    getNotificationsMock().useArchiveNotification = () => ({
      mutate: (id: number) => {
        void id;
      },
      isPending: false,
      variables: undefined,
    });

    render(<InboxShell />);

    expect(capturedOnArchive).not.toBeNull();
    act(() => capturedOnArchive!(1));

    expect(getSonerMock().toast.error).not.toHaveBeenCalled();
  });

  it("calls toast.success when approve succeeds", () => {
    getNotificationsMock().useApproveNotification = () => ({
      mutate: (id: number, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
        opts?.onSuccess?.();
      },
      isPending: false,
      variables: undefined,
    });

    render(<InboxShell />);

    expect(capturedOnApprove).not.toBeNull();
    act(() => capturedOnApprove!(1));

    expect(getSonerMock().toast.success).toHaveBeenCalledWith("Approved");
  });

  it("calls toast.success when reject succeeds", () => {
    getNotificationsMock().useRejectNotification = () => ({
      mutate: (id: number, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
        opts?.onSuccess?.();
      },
      isPending: false,
      variables: undefined,
    });

    render(<InboxShell />);

    expect(capturedOnReject).not.toBeNull();
    act(() => capturedOnReject!(1));

    expect(getSonerMock().toast.success).toHaveBeenCalledWith("Rejected");
  });

  it("calls toast.error when approve fails", () => {
    getNotificationsMock().useApproveNotification = () => ({
      mutate: (id: number, opts?: { onSuccess?: () => void; onError?: (e: Error) => void }) => {
        opts?.onError?.(new Error("Approve failed"));
      },
      isPending: false,
      variables: undefined,
    });

    render(<InboxShell />);

    expect(capturedOnApprove).not.toBeNull();
    act(() => capturedOnApprove!(1));

    expect(getSonerMock().toast.error).toHaveBeenCalledWith("Approve failed");
  });
});
