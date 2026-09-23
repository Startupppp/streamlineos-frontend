import { render, act } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import type {
  MailInboxItem,
  NotificationInboxItem,
  BuildApprovalInboxItem,
} from "@/types/inbox";
import { InboxShell } from "./inbox-shell";
import { mailDeepLinkParams } from "./inbox-mail-link";

const pushMock = jest.fn<void, [string]>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/inbox",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "u-1" } } }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "error"),
}));

jest.mock("@/hooks/api/notifications-inbox", () => {
  const idle = () => ({
    mutate: jest.fn(),
    isPending: false,
    variables: undefined,
  });
  return {
    useMarkNotificationRead: idle,
    useArchiveNotification: idle,
    useUnarchiveNotification: idle,
    useDeleteNotification: idle,
    usePinNotification: idle,
    useUnpinNotification: idle,
    useSnoozeNotification: idle,
    useApproveNotification: idle,
    useRejectNotification: idle,
  };
});

jest.mock("@/hooks/api/notifications-broadcasts", () => ({
  useDismissBroadcast: () => ({ mutate: jest.fn() }),
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
              notifType: "INFO",
              priority: "NORMAL",
              category: "SYSTEM",
              eventKey: null,
              body: "body",
              pinned: false,
              sourceModule: "system",
              actor: null,
              subject: "placeholder so the list renders",
              timestamp: new Date().toISOString(),
              isRead: true,
              deepLink: null,
              dedupKey: "notification:1",
            },
          ],
          hasMore: false,
          nextCursor: null,
          sources: [],
          degraded: false,
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

interface CapturedProps {
  onMailClick: (item: MailInboxItem) => void;
  onApprovalClick: (item: BuildApprovalInboxItem) => void;
  onNotificationClick: (item: NotificationInboxItem) => void;
}

let captured: CapturedProps | null = null;

jest.mock("./inbox-virtual-list", () => ({
  InboxVirtualList: (props: CapturedProps) => {
    captured = props;
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

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: () => null,
}));

jest.mock("@/features/notifications/notification-list-skeleton", () => ({
  NotificationListSkeleton: () => null,
}));

jest.mock("next/dynamic", () => () =>
  jest.requireMock<{ InboxVirtualList: unknown }>("./inbox-virtual-list")
    .InboxVirtualList);

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

jest.mock("./inbox-toolbar", () => ({
  InboxToolbar: () => null,
}));

jest.mock("./inbox-bulk-actions", () => ({
  BulkActionsBar: () => null,
}));

function makeMailItem(id: string, accountId: number): MailInboxItem {
  return {
    kind: "mail",
    id,
    threadId: null,
    accountId,
    snippet: "snippet",
    hasAttachments: false,
    sourceModule: "mail",
    actor: null,
    subject: "subject",
    timestamp: new Date().toISOString(),
    isRead: true,
    deepLink: null,
    dedupKey: `mail:${id}`,
  };
}

function makeApprovalItem(projectId: number | null): BuildApprovalInboxItem {
  return {
    kind: "build_approval",
    id: 9,
    status: "pending",
    approvalKind: "manual",
    projectId,
    ticketId: null,
    dueAt: null,
    sourceModule: "build",
    actor: null,
    subject: "Approval needed",
    timestamp: new Date().toISOString(),
    isRead: true,
    deepLink: null,
    dedupKey: "approval:9",
  };
}

function makeNotificationItem(deepLink: string | null): NotificationInboxItem {
  return {
    kind: "notification",
    id: 3,
    notifType: "INFO",
    priority: "NORMAL",
    category: "SYSTEM",
    eventKey: null,
    body: "body",
    pinned: false,
    sourceModule: "system",
    actor: null,
    subject: "subject",
    timestamp: new Date().toISOString(),
    isRead: true,
    deepLink,
    dedupKey: "notification:3",
  };
}

async function mountInbox(): Promise<CapturedProps> {
  await act(async () => {
    render(<InboxShell />);
  });
  if (!captured) throw new Error("InboxVirtualList never received its props");
  return captured;
}

beforeEach(() => {
  jest.clearAllMocks();
  captured = null;
});

const SPECIAL_MESSAGE_IDS = [
  "id&withAmpersand",
  "id=withEquals",
  "id?withQuestion",
  "id#withHash",
  "id with space",
  "id-with-non-ascii-日本語",
];

describe("inbox deep-link encoding — mail ids are provider-supplied strings, not integers", () => {
  it.each(SPECIAL_MESSAGE_IDS)(
    "round-trips a mail id containing special characters: %s",
    async (rawId) => {
      const props = await mountInbox();
      act(() => props.onMailClick(makeMailItem(rawId, 42)));

      expect(pushMock).toHaveBeenCalledTimes(1);
      const pushed = pushMock.mock.calls[0][0];
      const url = new URL(pushed, "http://localhost");

      expect(url.pathname).toBe("/mail");
      expect(url.searchParams.get("messageId")).toBe(rawId);
      expect(url.searchParams.get("accountId")).toBe("42");
    },
  );

  it("pushes the approval route with the numeric projectId", async () => {
    const props = await mountInbox();
    act(() => props.onApprovalClick(makeApprovalItem(4200)));

    expect(pushMock).toHaveBeenCalledWith("/build/approvals?projectId=4200");
  });

  it("pushes a server-supplied notification deepLink unmodified when it is already canonical", async () => {
    const deepLink = "/build/1/tickets/STRE-29?comment=8";
    const props = await mountInbox();
    act(() => props.onNotificationClick(makeNotificationItem(deepLink)));

    expect(pushMock).toHaveBeenCalledWith(deepLink);
  });

  it("rewrites a legacy /projects notification deepLink to /build before navigating", async () => {
    const props = await mountInbox();
    act(() =>
      props.onNotificationClick(
        makeNotificationItem("/projects/1/tickets/STRE-29?comment=8"),
      ),
    );

    expect(pushMock).toHaveBeenCalledWith(
      "/build/1/tickets/STRE-29?comment=8",
    );
  });
});

describe("mailDeepLinkParams — shared pure function for mail navigation", () => {
  it("returns messageId params when threadId is null", () => {
    const item = makeMailItem("msg-42", 7);
    const params = mailDeepLinkParams(item);
    expect(params).toEqual({ messageId: "msg-42", accountId: "7" });
  });

  it("returns threadId params when threadId is present, not messageId", () => {
    const item: MailInboxItem = { ...makeMailItem("msg-42", 7), threadId: "thread-99" };
    const params = mailDeepLinkParams(item);
    expect(params).toEqual({ threadId: "thread-99", accountId: "7" });
    expect(params).not.toHaveProperty("messageId");
  });

  it("positive: single-message mail (threadId null) still navigates to /mail route via shell", async () => {
    const props = await mountInbox();
    act(() => props.onMailClick(makeMailItem("solo-msg", 3)));
    const pushed = pushMock.mock.calls[0][0];
    expect(new URL(pushed, "http://localhost").pathname).toBe("/mail");
  });

  it("positive: threaded mail navigates to /mail with threadId param, not messageId", async () => {
    const props = await mountInbox();
    const threadedItem: MailInboxItem = { ...makeMailItem("msg-in-thread", 5), threadId: "thread-abc" };
    act(() => props.onMailClick(threadedItem));
    const pushed = pushMock.mock.calls[0][0];
    const url = new URL(pushed, "http://localhost");
    expect(url.searchParams.get("threadId")).toBe("thread-abc");
    expect(url.searchParams.get("messageId")).toBeNull();
  });
});

describe("approval deep-link routing — D1 correctness per sourceModule and deepLink", () => {
  function makeHrLeaveItem(deepLink: string | null): BuildApprovalInboxItem {
    return {
      kind: "build_approval",
      id: 20,
      status: "pending",
      approvalKind: "leave",
      projectId: null,
      ticketId: null,
      dueAt: null,
      sourceModule: "hr",
      actor: null,
      subject: "Leave approval",
      timestamp: new Date().toISOString(),
      isRead: false,
      deepLink,
      dedupKey: "approval:20",
    };
  }

  function makeBuildApprovalWithDeepLink(deepLink: string): BuildApprovalInboxItem {
    return {
      kind: "build_approval",
      id: 30,
      status: "pending",
      approvalKind: "build",
      projectId: 5,
      ticketId: null,
      dueAt: null,
      sourceModule: "build",
      actor: null,
      subject: "Build approval",
      timestamp: new Date().toISOString(),
      isRead: false,
      deepLink,
      dedupKey: "approval:30",
    };
  }

  it("build approval with a deepLink navigates to that deepLink, not /build/approvals", async () => {
    const props = await mountInbox();
    act(() => props.onApprovalClick(makeBuildApprovalWithDeepLink("/build/5/approvals/30")));
    expect(pushMock).toHaveBeenCalledWith("/build/5/approvals/30");
    expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining("/build/approvals?"));
  });

  it("positive: build approval without deepLink still falls back to /build/approvals", async () => {
    const props = await mountInbox();
    act(() => props.onApprovalClick(makeApprovalItem(null)));
    expect(pushMock).toHaveBeenCalledWith("/build/approvals");
  });

  it("HR leave item with null deepLink does NOT navigate to /build/... route", async () => {
    const props = await mountInbox();
    act(() => props.onApprovalClick(makeHrLeaveItem(null)));
    expect(pushMock).not.toHaveBeenCalledWith(expect.stringContaining("/build/"));
  });

  it("positive: HR leave item with null deepLink navigates to /inbox?view=approvals", async () => {
    const props = await mountInbox();
    act(() => props.onApprovalClick(makeHrLeaveItem(null)));
    expect(pushMock).toHaveBeenCalledWith("/inbox?view=approvals");
  });

  it("HR leave item with deepLink navigates to that deepLink", async () => {
    const props = await mountInbox();
    act(() => props.onApprovalClick(makeHrLeaveItem("/hr/leaves/42")));
    expect(pushMock).toHaveBeenCalledWith("/hr/leaves/42");
  });
});
