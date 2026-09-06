import { render, act, fireEvent } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { InboxShell } from "./inbox-shell";
import { INBOX_OFFLINE_MESSAGE } from "./use-inbox-actions";

const archiveMutate = jest.fn();
const deleteMutate = jest.fn();
const markReadMutate = jest.fn();
const approveMutate = jest.fn();

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

jest.mock("@/hooks/api/notifications-inbox", () => ({
  useMarkNotificationRead: () => ({ mutate: markReadMutate }),
  useArchiveNotification: () => ({
    mutate: archiveMutate,
    isPending: false,
    variables: undefined,
  }),
  useUnarchiveNotification: () => ({ mutate: jest.fn() }),
  useDeleteNotification: () => ({
    mutate: deleteMutate,
    isPending: false,
    variables: undefined,
  }),
  usePinNotification: () => ({ mutate: jest.fn() }),
  useUnpinNotification: () => ({ mutate: jest.fn() }),
  useSnoozeNotification: () => ({ mutate: jest.fn() }),
  useApproveNotification: () => ({
    mutate: approveMutate,
    isPending: false,
    variables: undefined,
  }),
  useRejectNotification: () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  }),
}));

const fetchNextPage = jest.fn();

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
          hasMore: true,
          nextCursor: "c1",
          sources: [],
        },
      ],
    },
    isLoading: false,
    isError: false,
    error: null,
    fetchNextPage,
    hasNextPage: true,
    isFetchingNextPage: false,
    refetch: jest.fn(),
  }),
}));

interface CapturedListProps {
  isOnline: boolean;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
  onApprove: (id: number) => void;
  onNotificationClick: (n: {
    id: number;
    isRead: boolean;
    link: string | null;
  }) => void;
}

let captured: CapturedListProps | null = null;

jest.mock("./inbox-virtual-list", () => ({
  InboxVirtualList: (props: CapturedListProps) => {
    captured = props;
    return null;
  },
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters }: { children: ReactNode; filters?: ReactNode }) =>
    createElement("div", null, filters, children),
}));

jest.mock("@/components/ui/empty-state", () => ({ EmptyState: () => null }));
jest.mock("@/components/shared/error-state", () => ({ ErrorState: () => null }));
jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => null,
}));
jest.mock("@/features/notifications/notification-list-skeleton", () => ({
  NotificationListSkeleton: () => null,
}));
jest.mock("next/dynamic", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return (importFn: () => Promise<React.ComponentType<Record<string, unknown>>>) => {
    function DynamicProxy(props: Record<string, unknown>) {
      const [Comp, setComp] = React.useState<React.ComponentType<Record<string, unknown>> | null>(null);
      React.useEffect(() => {
        void importFn().then((m) => setComp(() => m));
      }, []);
      return Comp ? React.createElement(Comp, props) : null;
    }
    return DynamicProxy;
  };
});
jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

type SonnerMock = { toast: { error: jest.Mock; success: jest.Mock } };

function getToast() {
  return jest.requireMock<SonnerMock>("sonner").toast;
}

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
  act(() => {
    fireEvent(window, new Event(online ? "online" : "offline"));
  });
}

async function mountInbox(): Promise<CapturedListProps> {
  await act(async () => { render(<InboxShell />); });
  if (!captured) throw new Error("InboxVirtualList never received its props");
  return captured;
}

describe("InboxShell — offline handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    captured = null;
    setOnline(true);
  });

  afterEach(() => {
    setOnline(true);
  });

  it("fires the mutation normally while online, so the guard is not a blanket block", async () => {
    await mountInbox();
    act(() => captured?.onArchive(1));

    expect(archiveMutate).toHaveBeenCalledTimes(1);
    expect(getToast().error).not.toHaveBeenCalled();
  });

  it("refuses a doomed archive while offline and says why", async () => {
    await mountInbox();
    setOnline(false);
    act(() => captured?.onArchive(1));

    expect(archiveMutate).not.toHaveBeenCalled();
    expect(getToast().error).toHaveBeenCalledWith(INBOX_OFFLINE_MESSAGE);
  });

  it("refuses delete and approve while offline too", async () => {
    await mountInbox();
    setOnline(false);
    act(() => captured?.onDelete(1));
    act(() => captured?.onApprove(1));

    expect(deleteMutate).not.toHaveBeenCalled();
    expect(approveMutate).not.toHaveBeenCalled();
    expect(getToast().error).toHaveBeenCalledTimes(2);
  });

  it("skips the passive mark-read on open while offline, without nagging the reader", async () => {
    await mountInbox();
    setOnline(false);
    act(() => captured?.onNotificationClick({ id: 1, isRead: false, link: null }));

    expect(markReadMutate).not.toHaveBeenCalled();
    expect(getToast().error).not.toHaveBeenCalled();
  });

  it("reconnecting restores the action without a remount", async () => {
    await mountInbox();
    setOnline(false);
    act(() => captured?.onArchive(1));
    expect(archiveMutate).not.toHaveBeenCalled();

    setOnline(true);
    act(() => captured?.onArchive(1));

    expect(archiveMutate).toHaveBeenCalledTimes(1);
  });

  it("hands the list its connectivity, so paging cannot stall on a paused fetch", async () => {
    await mountInbox();
    expect(captured?.isOnline).toBe(true);

    setOnline(false);
    expect(captured?.isOnline).toBe(false);
  });
});
