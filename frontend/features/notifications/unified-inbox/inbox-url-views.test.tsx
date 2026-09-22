import { render, act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import { InboxShell } from "./inbox-shell";
import {
  parseView,
  buildQueryParams,
  filterStateToSearchParams,
  parseInboxFilterState,
  VIEW_KINDS,
  VIEW_DEFAULT_UNREAD_ONLY,
  VIEW_TRIAGE,
  type InboxQueryParams,
} from "./inbox-view-params";
import { KIND_CAPABILITIES, resolvedCapabilities } from "./inbox-kind-capabilities";
import type { InboxFilterState } from "./inbox-view-params";
import type { InboxSourceStatus, UnifiedInboxItem } from "@/types/inbox";

const replaceMock = jest.fn<void, [string, { scroll: boolean }]>();
const pushMock = jest.fn<void, [string]>();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/inbox",
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "u-1" } } }),
}));

jest.mock("sonner", () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/get-error-message", () => ({
  getErrorMessage: (e: unknown) => (e instanceof Error ? e.message : "error"),
}));

const archiveMutate = jest.fn();
const markReadMutate = jest.fn();
const snoozeMutate = jest.fn();
const deleteMutate = jest.fn();

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
  useSnoozeNotification: () => ({
    mutate: snoozeMutate,
    isPending: false,
    variables: undefined,
  }),
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

jest.mock("@/hooks/api/notifications-broadcasts", () => ({
  useDismissBroadcast: () => ({ mutate: jest.fn() }),
}));

const inboxState: {
  items: UnifiedInboxItem[];
  sources: InboxSourceStatus[];
} = {
  items: [],
  sources: [],
};

let capturedQueryParams: InboxQueryParams | null = null;

jest.mock("@/hooks/api/inbox", () => ({
  useUnifiedInbox: (params: InboxQueryParams) => {
    capturedQueryParams = params;
    return {
      data: {
        pages: [
          {
            items: inboxState.items,
            hasMore: false,
            nextCursor: null,
            sources: inboxState.sources,
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
    };
  },
}));

interface CapturedListProps {
  items: UnifiedInboxItem[];
  selectedKeys: Set<string> | undefined;
  onToggleSelect: ((key: string) => void) | undefined;
  onArchive: (id: number) => void;
  onApprovalClick: (item: { projectId: number | null; [key: string]: unknown }) => void;
}

let capturedList: CapturedListProps | null = null;

jest.mock("./inbox-virtual-list", () => ({
  InboxVirtualList: (props: CapturedListProps) => {
    capturedList = props;
    return null;
  },
}));

jest.mock("./inbox-toolbar", () => {
  const { createElement: ce } = require("react") as typeof import("react");
  const views = [
    { value: "primary", label: "All" },
    { value: "updates", label: "Updates" },
    { value: "notifications", label: "Notifications" },
    { value: "mail", label: "Mail" },
    { value: "approvals", label: "Approvals" },
    { value: "later", label: "Later" },
    { value: "done", label: "Done" },
  ];
  return {
    InboxToolbar: ({
      state,
      onViewChange,
    }: {
      state: { view: string };
      onViewChange: (v: string) => void;
    }) =>
      ce(
        "div",
        null,
        ...views.map((opt) =>
          ce(
            "button",
            {
              key: opt.value,
              type: "button",
              "data-testid": `view-${opt.value}`,
              onClick: () => onViewChange(opt.value),
              "aria-pressed": state.view === opt.value,
            },
            opt.label,
          ),
        ),
      ),
  };
});

interface BulkActionsProps {
  selectedKeys: Set<string>;
  items: UnifiedInboxItem[];
  actions: {
    handleArchive: (id: number) => void;
    handleMarkRead: (id: number) => void;
    handleSnooze: (id: number, until: string) => void;
    handleDelete: (id: number) => void;
  };
  onClearSelection: () => void;
}

let capturedBulk: BulkActionsProps | null = null;

jest.mock("./inbox-bulk-actions", () => ({
  BulkActionsBar: (props: BulkActionsProps) => {
    capturedBulk = props;
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
  EmptyState: () => createElement("p", null, "All caught up"),
}));

jest.mock("@/components/shared/error-state", () => ({
  ErrorState: () => null,
}));

jest.mock("@/components/shared/no-permission-state", () => ({
  NoPermissionState: ({
    permission,
  }: {
    permission: string;
  }) => createElement("p", null, `Access Restricted: ${permission}`),
}));

jest.mock("@/features/notifications/notification-list-skeleton", () => ({
  NotificationListSkeleton: () => null,
}));

jest.mock("next/dynamic", () => () =>
  jest.requireMock<{ InboxVirtualList: unknown }>("./inbox-virtual-list").InboxVirtualList);

jest.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

function viewButton(label: string): HTMLElement {
  return screen.getByRole("button", { name: label });
}

async function mountInbox() {
  await act(async () => {
    render(<InboxShell />);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  capturedQueryParams = null;
  capturedList = null;
  capturedBulk = null;
  inboxState.items = [];
  inboxState.sources = [];
  replaceMock.mockReset();
  pushMock.mockReset();
});

describe("parseView — URL param parsing", () => {
  it("returns primary for null", () => {
    expect(parseView(null)).toBe("primary");
  });

  it("returns primary for an unknown view slug", () => {
    expect(parseView("not-a-view")).toBe("primary");
  });

  it.each([
    "primary",
    "updates",
    "notifications",
    "mail",
    "approvals",
    "later",
    "done",
  ] as const)("accepts the valid view slug %s", (slug) => {
    expect(parseView(slug)).toBe(slug);
  });
});

describe("buildQueryParams — view → backend params mapping", () => {
  function state(view: InboxFilterState["view"]): InboxFilterState {
    return {
      view,
      q: "",
      unreadOnly: false,
      category: "",
      priority: "",
      kindOverride: [],
    };
  }

  it("primary sends triage=active with no kinds restriction", () => {
    const params = buildQueryParams(state("primary"));
    expect(params.triage).toBe("active");
    expect(params.kinds).toBeUndefined();
  });

  it("updates sends kinds=[notification,broadcast] and triage=active", () => {
    const params = buildQueryParams(state("updates"));
    expect(params.kinds).toEqual(["notification", "broadcast"]);
    expect(params.triage).toBe("active");
  });

  it("notifications sends kinds=[notification,broadcast] with no triage", () => {
    const params = buildQueryParams(state("notifications"));
    expect(params.kinds).toEqual(["notification", "broadcast"]);
    expect(params.triage).toBeUndefined();
  });

  it("mail sends kinds=[mail] with no triage", () => {
    const params = buildQueryParams(state("mail"));
    expect(params.kinds).toEqual(["mail"]);
    expect(params.triage).toBeUndefined();
  });

  it("approvals sends kinds=[build_approval] with no triage", () => {
    const params = buildQueryParams(state("approvals"));
    expect(params.kinds).toEqual(["build_approval"]);
    expect(params.triage).toBeUndefined();
  });

  it("later sends triage=later", () => {
    const params = buildQueryParams(state("later"));
    expect(params.triage).toBe("later");
  });

  it("done sends triage=done", () => {
    const params = buildQueryParams(state("done"));
    expect(params.triage).toBe("done");
  });

  it("search term flows through to q param", () => {
    const params = buildQueryParams({ ...state("primary"), q: "hello" });
    expect(params.q).toBe("hello");
  });

  it("omits q when empty string", () => {
    const params = buildQueryParams(state("primary"));
    expect(params.q).toBeUndefined();
  });

  it("unreadOnly flows through when true", () => {
    const params = buildQueryParams({
      ...state("primary"),
      unreadOnly: true,
    });
    expect(params.unreadOnly).toBe(true);
  });

  it("omits unreadOnly when false", () => {
    const params = buildQueryParams(state("primary"));
    expect(params.unreadOnly).toBeUndefined();
  });

  it("category flows through when set", () => {
    const params = buildQueryParams({
      ...state("notifications"),
      category: "MENTIONS",
    });
    expect(params.category).toBe("MENTIONS");
  });

  it("priority flows through when set", () => {
    const params = buildQueryParams({
      ...state("primary"),
      priority: "HIGH",
    });
    expect(params.priority).toBe("HIGH");
  });

  it("kindOverride intersects with the view's base kinds", () => {
    const params = buildQueryParams({
      ...state("updates"),
      kindOverride: ["notification"],
    });
    expect(params.kinds).toEqual(["notification"]);
  });

  it("kindOverride with no base kinds uses the override directly", () => {
    const params = buildQueryParams({
      ...state("primary"),
      kindOverride: ["notification", "mail"],
    });
    expect(params.kinds).toEqual(["notification", "mail"]);
  });
});

describe("parseInboxFilterState — round-trip with filterStateToSearchParams", () => {
  it("round-trips a fully populated filter state through URL params", () => {
    const original: InboxFilterState = {
      view: "notifications",
      q: "budget",
      unreadOnly: true,
      category: "MENTIONS",
      priority: "HIGH",
      kindOverride: ["notification"],
    };
    const params = filterStateToSearchParams(original);
    const restored = parseInboxFilterState(params);
    expect(restored).toEqual(original);
  });

  it("defaults mail view's unreadOnly to true when not in URL", () => {
    const params = new URLSearchParams("view=mail");
    const state = parseInboxFilterState(params);
    expect(state.unreadOnly).toBe(true);
  });

  it("defaults primary view's unreadOnly to false when not in URL", () => {
    const params = new URLSearchParams("view=primary");
    const state = parseInboxFilterState(params);
    expect(state.unreadOnly).toBe(false);
  });

  it("explicit unreadOnly=false overrides the mail default", () => {
    const params = new URLSearchParams("view=mail&unreadOnly=false");
    const state = parseInboxFilterState(params);
    expect(state.unreadOnly).toBe(false);
  });
});

describe("KIND_CAPABILITIES — per-kind action matrix", () => {
  it("notification supports all four actions", () => {
    const caps = KIND_CAPABILITIES.notification;
    expect(caps.canMarkRead).toBe(true);
    expect(caps.canArchive).toBe(true);
    expect(caps.canSnooze).toBe(true);
    expect(caps.canDelete).toBe(true);
  });

  it("broadcast supports no standalone bulk actions", () => {
    const caps = KIND_CAPABILITIES.broadcast;
    expect(caps.canMarkRead).toBe(false);
    expect(caps.canArchive).toBe(false);
    expect(caps.canSnooze).toBe(false);
    expect(caps.canDelete).toBe(false);
  });

  it("mail supports no standalone bulk actions", () => {
    const caps = KIND_CAPABILITIES.mail;
    expect(caps.canArchive).toBe(false);
  });

  it("build_approval supports no standalone bulk actions", () => {
    const caps = KIND_CAPABILITIES.build_approval;
    expect(caps.canArchive).toBe(false);
  });
});

describe("resolvedCapabilities — union of selected kinds", () => {
  it("returns all-false for empty selection", () => {
    const caps = resolvedCapabilities([]);
    expect(caps.canArchive).toBe(false);
    expect(caps.canMarkRead).toBe(false);
    expect(caps.canSnooze).toBe(false);
    expect(caps.canDelete).toBe(false);
  });

  it("returns all-true when at least one notification is selected", () => {
    const caps = resolvedCapabilities(["notification"]);
    expect(caps.canArchive).toBe(true);
  });

  it("broadcast-only selection yields all-false because broadcast has no standalone mutations", () => {
    const caps = resolvedCapabilities(["broadcast"]);
    expect(caps.canArchive).toBe(false);
  });

  it("notification + broadcast selection yields true because notification can archive", () => {
    const caps = resolvedCapabilities(["notification", "broadcast"]);
    expect(caps.canArchive).toBe(true);
  });
});

describe("VIEW_KINDS coverage — all 7 views map the right backend kinds", () => {
  it("primary has no kind restriction", () => {
    expect(VIEW_KINDS.primary).toBeUndefined();
  });

  it("updates restricts to notification + broadcast", () => {
    expect(VIEW_KINDS.updates).toEqual(["notification", "broadcast"]);
  });

  it("notifications restricts to notification + broadcast", () => {
    expect(VIEW_KINDS.notifications).toEqual(["notification", "broadcast"]);
  });

  it("mail restricts to mail only", () => {
    expect(VIEW_KINDS.mail).toEqual(["mail"]);
  });

  it("approvals restricts to build_approval only", () => {
    expect(VIEW_KINDS.approvals).toEqual(["build_approval"]);
  });

  it("later has no kind restriction", () => {
    expect(VIEW_KINDS.later).toBeUndefined();
  });

  it("done has no kind restriction", () => {
    expect(VIEW_KINDS.done).toBeUndefined();
  });
});

describe("VIEW_DEFAULT_UNREAD_ONLY — defaults by view", () => {
  it("mail defaults to unread-only true", () => {
    expect(VIEW_DEFAULT_UNREAD_ONLY.mail).toBe(true);
  });

  it("primary defaults to unread-only false", () => {
    expect(VIEW_DEFAULT_UNREAD_ONLY.primary).toBe(false);
  });
});

describe("InboxShell URL sync — router.replace called with serialized filter state", () => {
  it("calls router.replace on mount with the initial view=primary", async () => {
    await mountInbox();

    expect(replaceMock).toHaveBeenCalled();
    const [url] = replaceMock.mock.calls[0];
    expect(url).toContain("view=primary");
  });

  it("router.replace is called with scroll: false so anchor position is stable", async () => {
    await mountInbox();

    const [, opts] = replaceMock.mock.calls[0];
    expect(opts?.scroll).toBe(false);
  });

  it("switching view triggers a new router.replace with the new view", async () => {
    const user = userEvent.setup();
    await mountInbox();
    replaceMock.mockClear();

    await user.click(viewButton("Mail"));

    expect(replaceMock).toHaveBeenCalled();
    const [url] = replaceMock.mock.calls[replaceMock.mock.calls.length - 1];
    expect(url).toContain("view=mail");
  });
});

describe("InboxShell — query params derived from view", () => {
  it("primary view sends triage=active to the API", async () => {
    await mountInbox();

    expect(capturedQueryParams).not.toBeNull();
    expect((capturedQueryParams as { triage?: string }).triage).toBe("active");
  });

  it("switching to Approvals view sends kinds=[build_approval] to the API", async () => {
    const user = userEvent.setup();
    await mountInbox();

    await user.click(viewButton("Approvals"));

    expect(capturedQueryParams).not.toBeNull();
    expect((capturedQueryParams as { kinds?: string[] }).kinds).toEqual([
      "build_approval",
    ]);
  });
});

describe("InboxShell — permission-denied renders NoPermissionState", () => {
  it("switches to Approvals and shows the permission string when approvals is denied", async () => {
    const user = userEvent.setup();
    inboxState.sources = [
      {
        kind: "build_approval",
        included: false,
        reason: "no permission: build:approvals:view",
        available: true,
        error: null,
      },
    ];

    await mountInbox();
    await user.click(viewButton("Approvals"));

    expect(screen.getByText(/build:approvals:view/)).toBeInTheDocument();
  });
});

describe("InboxShell — unsupported source shows inline notice", () => {
  it("renders an inline notice when a source is excluded with an unsupported: prefix", async () => {
    inboxState.sources = [
      {
        kind: "mail",
        included: false,
        reason: "unsupported: Mail requires a connected mail account",
        available: false,
        error: null,
      },
    ];

    await mountInbox();

    expect(
      screen.getByText(/is excluded from this view/),
    ).toBeInTheDocument();
  });
});

describe("InboxShell — selection state passes to InboxVirtualList", () => {
  it("passes an empty selectedKeys set before any toggle", async () => {
    inboxState.items = [
      {
        kind: "notification",
        id: 1,
        subject: "A",
        body: "B",
        notifType: "INFO",
        priority: "NORMAL",
        category: "SYSTEM",
        sourceModule: "notification",
        isRead: false,
        pinned: false,
        deepLink: null,
        eventKey: null,
        timestamp: new Date().toISOString(),
        actor: null,
        dedupKey: "notification:1",
      },
    ];

    await mountInbox();

    expect(capturedList).not.toBeNull();
    expect(capturedList?.selectedKeys?.size).toBe(0);
  });

  it("onToggleSelect adds the key to selectedKeys", async () => {
    inboxState.items = [
      {
        kind: "notification",
        id: 1,
        subject: "A",
        body: "B",
        notifType: "INFO",
        priority: "NORMAL",
        category: "SYSTEM",
        sourceModule: "notification",
        isRead: false,
        pinned: false,
        deepLink: null,
        eventKey: null,
        timestamp: new Date().toISOString(),
        actor: null,
        dedupKey: "notification:1",
      },
    ];

    await mountInbox();
    expect(capturedList?.onToggleSelect).toBeDefined();

    act(() => capturedList!.onToggleSelect!("notification:1"));

    expect(capturedList?.selectedKeys?.has("notification:1")).toBe(true);
  });

  it("onToggleSelect removes a key that was already selected", async () => {
    inboxState.items = [
      {
        kind: "notification",
        id: 1,
        subject: "A",
        body: "B",
        notifType: "INFO",
        priority: "NORMAL",
        category: "SYSTEM",
        sourceModule: "notification",
        isRead: false,
        pinned: false,
        deepLink: null,
        eventKey: null,
        timestamp: new Date().toISOString(),
        actor: null,
        dedupKey: "notification:1",
      },
    ];

    await mountInbox();
    act(() => capturedList!.onToggleSelect!("notification:1"));
    act(() => capturedList!.onToggleSelect!("notification:1"));

    expect(capturedList?.selectedKeys?.has("notification:1")).toBe(false);
  });
});

describe("InboxShell — bulk actions bar receives selection and actions", () => {
  it("BulkActionsBar receives the selectedKeys set", async () => {
    await mountInbox();

    expect(capturedBulk).not.toBeNull();
    expect(capturedBulk?.selectedKeys).toBeInstanceOf(Set);
  });

  it("BulkActionsBar receives the onClearSelection callback", async () => {
    await mountInbox();

    expect(capturedBulk?.onClearSelection).toBeDefined();
  });
});

describe("InboxShell — view switching resets selection", () => {
  it("resets selectedKeys to empty when switching views", async () => {
    const user = userEvent.setup();
    inboxState.items = [
      {
        kind: "notification",
        id: 1,
        subject: "A",
        body: "B",
        notifType: "INFO",
        priority: "NORMAL",
        category: "SYSTEM",
        sourceModule: "notification",
        isRead: false,
        pinned: false,
        deepLink: null,
        eventKey: null,
        timestamp: new Date().toISOString(),
        actor: null,
        dedupKey: "notification:1",
      },
    ];

    await mountInbox();
    act(() => capturedList!.onToggleSelect!("notification:1"));
    expect(capturedList?.selectedKeys?.size).toBe(1);

    await user.click(viewButton("Mail"));

    expect(capturedList?.selectedKeys?.size).toBe(0);
  });
});

describe("InboxShell — approval with null projectId navigates without query param", () => {
  it("approval click with null projectId pushes /build/approvals without a projectId param", async () => {
    inboxState.items = [
      {
        kind: "notification",
        id: 1,
        subject: "A",
        body: "B",
        notifType: "INFO",
        priority: "NORMAL",
        category: "SYSTEM",
        sourceModule: "notification",
        isRead: false,
        pinned: false,
        deepLink: null,
        eventKey: null,
        timestamp: new Date().toISOString(),
        actor: null,
        dedupKey: "notification:1",
      },
    ];

    await mountInbox();
    expect(capturedList).not.toBeNull();

    act(() =>
      capturedList!.onApprovalClick({
        kind: "build_approval",
        id: 9,
        status: "pending",
        approvalKind: "manual",
        projectId: null,
        ticketId: null,
        dueAt: null,
        sourceModule: "build",
        actor: null,
        subject: "Approval needed",
        timestamp: new Date().toISOString(),
        isRead: true,
        deepLink: null,
        dedupKey: "approval:9",
      }),
    );

    expect(pushMock).toHaveBeenCalledWith("/build/approvals");
    expect(pushMock).not.toHaveBeenCalledWith(
      expect.stringContaining("projectId"),
    );
  });

  it("approval click with numeric projectId pushes /build/approvals?projectId=N", async () => {
    inboxState.items = [
      {
        kind: "notification",
        id: 1,
        subject: "A",
        body: "B",
        notifType: "INFO",
        priority: "NORMAL",
        category: "SYSTEM",
        sourceModule: "notification",
        isRead: false,
        pinned: false,
        deepLink: null,
        eventKey: null,
        timestamp: new Date().toISOString(),
        actor: null,
        dedupKey: "notification:1",
      },
    ];
    await mountInbox();
    expect(capturedList).not.toBeNull();

    act(() =>
      capturedList!.onApprovalClick({
        kind: "build_approval",
        id: 9,
        status: "pending",
        approvalKind: "manual",
        projectId: 4200,
        ticketId: null,
        dueAt: null,
        sourceModule: "build",
        actor: null,
        subject: "Approval needed",
        timestamp: new Date().toISOString(),
        isRead: true,
        deepLink: null,
        dedupKey: "approval:9",
      }),
    );

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("projectId=4200"),
    );
  });
});
