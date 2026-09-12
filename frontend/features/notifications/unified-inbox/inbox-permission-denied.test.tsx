import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createElement, type ReactNode } from "react";
import type { InboxSourceStatus, UnifiedInboxItem } from "@/types/inbox";
import { InboxShell } from "./inbox-shell";

const state: { items: UnifiedInboxItem[]; sources: InboxSourceStatus[] } = {
  items: [],
  sources: [],
};

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { orgId: "org-1", user: { id: "u-1" } } }),
}));

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));

jest.mock("@/hooks/api/notifications-inbox", () => {
  const idle = () => ({ mutate: jest.fn(), isPending: false, variables: undefined });
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
          items: state.items,
          hasMore: false,
          nextCursor: null,
          sources: state.sources,
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

jest.mock("./inbox-virtual-list", () => ({
  InboxVirtualList: () => null,
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children, filters }: { children: ReactNode; filters?: ReactNode }) =>
    createElement("div", null, filters, children),
}));

jest.mock("@/features/notifications/notification-list-skeleton", () => ({
  NotificationListSkeleton: () => null,
}));

jest.mock("next/dynamic", () => () => () => null);

const MAIL_DENIED: InboxSourceStatus = {
  kind: "mail",
  included: false,
  reason: "no permission: mail:inbox:view",
  available: true,
  error: null,
};
const MAIL_ALLOWED: InboxSourceStatus = {
  kind: "mail",
  included: true,
  reason: null,
  available: true,
  error: null,
};
const APPROVALS_DENIED: InboxSourceStatus = {
  kind: "build_approval",
  included: false,
  reason: "no permission: build:approvals:view",
  available: true,
  error: null,
};

async function selectView(label: string) {
  const control = screen.getByRole("button", { name: label });
  expect(control).toHaveAttribute("aria-pressed");
  expect(control).not.toHaveAttribute("aria-controls");
  await userEvent.click(control);
  expect(control).toHaveAttribute("aria-pressed", "true");
}

beforeEach(() => {
  state.items = [];
  state.sources = [];
});

describe("inbox renders permission-denied, not data-empty, for a refused source", () => {
  it("names the missing permission when the Mail view is refused", async () => {
    state.sources = [MAIL_DENIED];
    render(<InboxShell />);

    await selectView("Mail");

    expect(screen.getByText("Access Restricted")).toBeInTheDocument();
    expect(screen.getByText("mail:inbox:view")).toBeInTheDocument();
  });

  it("names the missing permission when the Approvals view is refused", async () => {
    state.sources = [APPROVALS_DENIED];
    render(<InboxShell />);

    await selectView("Approvals");

    expect(screen.getByText("build:approvals:view")).toBeInTheDocument();
  });

  it("BITE PROOF — a refused source used to render the data-empty message", async () => {
    state.sources = [MAIL_DENIED];
    render(<InboxShell />);

    await selectView("Mail");

    expect(screen.queryByText("All caught up")).not.toBeInTheDocument();
  });

  it("still shows the data-empty state when the source is allowed and returns nothing", async () => {
    state.sources = [MAIL_ALLOWED];
    render(<InboxShell />);

    await selectView("Mail");

    expect(screen.getByText("All caught up")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });

  it("does not claim denial on the All view, which spans sources the user can read", async () => {
    state.sources = [MAIL_DENIED];
    render(<InboxShell />);

    expect(screen.getByText("All caught up")).toBeInTheDocument();
    expect(screen.queryByText("Access Restricted")).not.toBeInTheDocument();
  });
});
