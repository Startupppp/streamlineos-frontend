import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Notification } from "@/types/notifications";
import { ApiError } from "@/lib/api-envelope";
import { InboxPage } from "./inbox-page";

jest.mock("next/dynamic", () => (loader: () => Promise<{ default: React.ComponentType }>) => {
  const LazyComponent = React.lazy(loader);
  return function DynamicComponent(props: Record<string, unknown>) {
    return (
      <React.Suspense fallback={null}>
        <LazyComponent {...props} />
      </React.Suspense>
    );
  };
});

let mockSearchParams = new URLSearchParams();
let mockReadState: "ready" | "pending" | "error" = "ready";
const mockReplace = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => "/build/inbox",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/hooks/common/use-mobile", () => ({
  useIsBelowLg: jest.fn().mockReturnValue(false),
  useIsMobile: jest.fn().mockReturnValue(false),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-wrapper">{children}</div>
  ),
}));

jest.mock("./inbox-list", () => ({
  InboxList: jest.fn(),
}));

jest.mock("./inbox-preview-pane", () => ({
  InboxPreviewPane: () => <div data-testid="inbox-preview-pane" />,
}));
jest.mock("@/hooks/api/notifications-shared", () => {
  const owner = { identity: { orgId: "org-1", userId: "user-1", sessionId: "session-1" }, isCurrent: () => true };
  return { useNotificationInboxInvalidation: () => ({ captureOwner: () => owner }) };
});
jest.mock("@/hooks/api/notifications-inbox", () => ({
  useInboxSelectedNotification: (id: number | null) => ({ notification: id === null || mockReadState !== "ready" ? null : makeNotification(id),
    isPending: id !== null && mockReadState === "pending", isMissing: false,
    error: id !== null && mockReadState === "error" ? new ApiError("Unavailable", 503) : null, retry: jest.fn() }),
  useMarkNotificationRead: () => ({ mutate: jest.fn(), mutateAsync: jest.fn() }),
}));

jest.mock("@/hooks/api/notifications-inbox-actions", () => ({
  useArchiveNotification: () => ({ mutateAsync: jest.fn() }),
  useUnarchiveNotification: () => ({ mutateAsync: jest.fn() }),
  useSnoozeNotification: () => ({ mutateAsync: jest.fn() }),
  useUnsnoozeNotification: () => ({ mutateAsync: jest.fn() }),
  useBulkArchive: () => ({ mutateAsync: jest.fn() }),
  useBulkDelete: () => ({ mutateAsync: jest.fn() }),
}));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: ({ isLoading, isError, error }: { isLoading: boolean; isError: boolean; error: unknown }) =>
  isLoading ? { kind: "loading" } : isError ? { kind: "error", error } : { kind: "ready" } }));

import { InboxList } from "./inbox-list";
import { useIsBelowLg } from "@/hooks/common/use-mobile";

function makeNotification(id = 42): Notification {
  return {
    id,
    orgId: "org-1",
    userId: "user-1",
    type: "INFO",
    priority: "NORMAL",
    category: "PROJECTS",
    sourceModule: "build",
    eventKey: null,
    title: `Notification ${id}`,
    message: "",
    link: null,
    isRead: false,
    pinned: false,
    channel: "IN_APP",
    archivedAt: null,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSearchParams = new URLSearchParams();
  mockReadState = "ready";
  (useIsBelowLg as jest.Mock).mockReturnValue(false);
  (InboxList as jest.Mock).mockImplementation(
    ({
      onSelect,
      selectedId,
      onClearSelection,
      onSectionChange,
      searchInputRef,
    }: {
      onSelect: (n: Notification) => void;
      selectedId: number | null;
      onClearSelection?: () => void;
      onSectionChange?: (section: "ARCHIVED") => void;
      selectionDismissed?: boolean;
      searchInputRef: React.RefObject<HTMLInputElement | null>;
    }) => {
      function handleSelectNotification() {
        onSelect(makeNotification(42));
      }
      function handleAutoClear() {
        onClearSelection?.();
      }
      return (
        <div data-testid="inbox-list" data-selected-id={String(selectedId ?? "null")}>
          <input ref={searchInputRef} aria-label="Search notifications" />
          <button data-testid="select-notification" onClick={handleSelectNotification} />
          <button data-testid="auto-clear" onClick={handleAutoClear} />
          <button data-testid="switch-done" onClick={() => onSectionChange?.("ARCHIVED")} />
        </div>
      );
    },
  );
});

describe("InboxPage", () => {
  it.each(["pending", "error"])("returns to the mobile list and focus during %s selected reads", async (state) => {
    if (state !== "pending" && state !== "error") throw new Error("Unexpected read state");
    mockReadState = state;
    mockSearchParams = new URLSearchParams("section=SNOOZED&q=release&type=PROJECTS&projectId=54&panel=preview");
    jest.mocked(useIsBelowLg).mockReturnValue(true);
    const user = userEvent.setup();
    render(<InboxPage />);
    await user.click(await screen.findByTestId("select-notification"));
    expect(screen.queryByTestId("inbox-preview-pane")).toBeNull();
    const back = screen.getByRole("button", { name: "Back to inbox" });
    await user.click(back);
    expect(screen.getByTestId("inbox-list")).toHaveAttribute("data-selected-id", "null");
    expect(screen.getByTestId("inbox-list").closest("div[class]")).not.toHaveClass("hidden");
    expect(screen.getByRole("textbox", { name: "Search notifications" })).toHaveFocus();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockSearchParams.toString()).toBe("section=SNOOZED&q=release&type=PROJECTS&projectId=54&panel=preview");
  });
  it("renders the inbox list panel", async () => {
    render(<InboxPage />);
    await waitFor(() => expect(screen.getByTestId("inbox-list")).toBeInTheDocument());
  });

  it("exposes an accessible desktop separator for resizing the notification list", async () => {
    render(<InboxPage />);
    await waitFor(() => expect(screen.getByTestId("inbox-list")).toBeInTheDocument());
    const separator = screen.getByRole("separator", { name: "Resize notification list" });
    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("data-slot", "resizable-handle");
  });

  it("passes null as the selected notification id initially", async () => {
    render(<InboxPage />);
    await waitFor(() =>
      expect(screen.getByTestId("inbox-list")).toHaveAttribute(
        "data-selected-id",
        "null",
      ),
    );
  });

  it("passes the selected notification id to InboxList when a notification is selected", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    await waitFor(() => expect(screen.getByTestId("select-notification")).toBeInTheDocument());
    await user.click(screen.getByTestId("select-notification"));
    expect(screen.getByTestId("inbox-list")).toHaveAttribute(
      "data-selected-id",
      "42",
    );
  });

  it("resets the selected notification id when InboxList triggers auto-clear", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    await waitFor(() => expect(screen.getByTestId("select-notification")).toBeInTheDocument());
    await user.click(screen.getByTestId("select-notification"));
    await user.click(screen.getByTestId("auto-clear"));
    expect(screen.getByTestId("inbox-list")).toHaveAttribute(
      "data-selected-id",
      "null",
    );
  });

  it("hides the list panel on mobile when a notification is selected", async () => {
    (useIsBelowLg as jest.Mock).mockReturnValue(true);
    const user = userEvent.setup();
    render(<InboxPage />);
    await waitFor(() => expect(screen.getByTestId("select-notification")).toBeInTheDocument());
    await user.click(screen.getByTestId("select-notification"));
    expect(screen.queryByTestId("inbox-list")).toBeNull();
    expect(screen.getByTestId("inbox-preview-pane")).toBeInTheDocument();
  });

  it("clears the selected notification when the triage tab changes", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    await user.click(await screen.findByTestId("select-notification"));
    expect(screen.getByTestId("inbox-list")).toHaveAttribute("data-selected-id", "42");
    await user.click(screen.getByTestId("switch-done"));
    expect(screen.getByTestId("inbox-list")).toHaveAttribute("data-selected-id", "null");
  });

  it("does not own usePageState itself — state classification lives in InboxList", async () => {
    render(<InboxPage />);
    await waitFor(() => expect(InboxList).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders only the notification list", async () => {
    render(<InboxPage />);
    await waitFor(() => expect(screen.getByTestId("inbox-list")).toBeInTheDocument());
  });
});

describe("InboxPage — notification source filtering and approval click", () => {
  it("does not select a notification from a non-Build sourceModule — selection stays null", async () => {
    const user = userEvent.setup();
    const nonBuildNotification: Notification = {
      ...makeNotification(55),
      sourceModule: "hr",
    };
    (InboxList as jest.Mock).mockImplementation(
      ({
        onSelect,
        selectedId,
      }: {
        onSelect: (n: Notification) => void;
        selectedId: number | null;
        onClearSelection?: () => void;
        searchInputRef: React.RefObject<HTMLInputElement | null>;
      }) => (
        <div
          data-testid="inbox-list"
          data-selected-id={String(selectedId ?? "null")}
        >
          <button
            data-testid="select-non-build"
            onClick={() => onSelect(nonBuildNotification)}
          />
        </div>
      ),
    );
    render(<InboxPage />);
    await waitFor(() =>
      expect(screen.getByTestId("select-non-build")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("select-non-build"));
    await waitFor(() =>
      expect(screen.getByTestId("inbox-list")).toHaveAttribute(
        "data-selected-id",
        "null",
      ),
    );
  });

  it("does not select a notification whose orgId does not match the session owner", async () => {
    const user = userEvent.setup();
    const wrongOrgNotification: Notification = {
      ...makeNotification(66),
      orgId: "org-other",
    };
    (InboxList as jest.Mock).mockImplementation(
      ({
        onSelect,
        selectedId,
      }: {
        onSelect: (n: Notification) => void;
        selectedId: number | null;
        onClearSelection?: () => void;
        searchInputRef: React.RefObject<HTMLInputElement | null>;
      }) => (
        <div
          data-testid="inbox-list"
          data-selected-id={String(selectedId ?? "null")}
        >
          <button
            data-testid="select-wrong-org"
            onClick={() => onSelect(wrongOrgNotification)}
          />
        </div>
      ),
    );
    render(<InboxPage />);
    await waitFor(() =>
      expect(screen.getByTestId("select-wrong-org")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("select-wrong-org"));
    await waitFor(() =>
      expect(screen.getByTestId("inbox-list")).toHaveAttribute(
        "data-selected-id",
        "null",
      ),
    );
  });

  it("approval notification click (sourceModule=build, category=APPROVALS) selects the notification", async () => {
    const user = userEvent.setup();
    const approvalNotification: Notification = {
      ...makeNotification(77),
      sourceModule: "build",
      category: "PROJECTS",
    };
    (InboxList as jest.Mock).mockImplementation(
      ({
        onSelect,
        selectedId,
      }: {
        onSelect: (n: Notification) => void;
        selectedId: number | null;
        onClearSelection?: () => void;
        searchInputRef: React.RefObject<HTMLInputElement | null>;
      }) => (
        <div data-testid="inbox-list" data-selected-id={String(selectedId ?? "null")}>
          <button
            data-testid="select-approval"
            onClick={() => onSelect(approvalNotification)}
          />
        </div>
      ),
    );
    render(<InboxPage />);
    await waitFor(() =>
      expect(screen.getByTestId("select-approval")).toBeInTheDocument(),
    );
    await user.click(screen.getByTestId("select-approval"));
    await waitFor(() =>
      expect(screen.getByTestId("inbox-list")).toHaveAttribute(
        "data-selected-id",
        "77",
      ),
    );
  });
});
