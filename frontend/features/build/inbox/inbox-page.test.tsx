import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Notification } from "@/types/notifications";
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

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn() }),
  usePathname: () => "/build/inbox",
  useSearchParams: () => mockSearchParams,
}));

jest.mock("@/components/layout/shell-variant-context", () => ({
  useShellVariant: jest.fn().mockReturnValue("desktop"),
}));

jest.mock("@/components/ui/page-wrapper", () => ({
  PageWrapper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-wrapper">{children}</div>
  ),
}));

jest.mock("./inbox-list", () => ({
  InboxList: jest.fn(),
}));

jest.mock("./inbox-drafts-panel", () => ({
  InboxDraftsPanel: () => <div data-testid="inbox-drafts-panel" />,
}));

import { InboxList } from "./inbox-list";
import { useShellVariant } from "@/components/layout/shell-variant-context";

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
    message: null,
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
  (useShellVariant as jest.Mock).mockReturnValue("desktop");
  (InboxList as jest.Mock).mockImplementation(
    ({
      onSelect,
      selectedId,
      onClearSelection,
    }: {
      onSelect: (n: Notification) => void;
      selectedId: number | null;
      onClearSelection?: () => void;
      selectionDismissed?: boolean;
    }) => {
      function handleSelectNotification() {
        onSelect(makeNotification(42));
      }
      function handleAutoClear() {
        onClearSelection?.();
      }
      return (
        <div data-testid="inbox-list" data-selected-id={String(selectedId ?? "null")}>
          <button data-testid="select-notification" onClick={handleSelectNotification} />
          <button data-testid="auto-clear" onClick={handleAutoClear} />
        </div>
      );
    },
  );
});

describe("InboxPage", () => {
  it("renders the inbox list panel", () => {
    render(<InboxPage />);
    expect(screen.getByTestId("inbox-list")).toBeInTheDocument();
  });

  it("passes null as the selected notification id initially", () => {
    render(<InboxPage />);
    expect(screen.getByTestId("inbox-list")).toHaveAttribute(
      "data-selected-id",
      "null",
    );
  });

  it("passes the selected notification id to InboxList when a notification is selected", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    await user.click(screen.getByTestId("select-notification"));
    expect(screen.getByTestId("inbox-list")).toHaveAttribute(
      "data-selected-id",
      "42",
    );
  });

  it("resets the selected notification id when InboxList triggers auto-clear", async () => {
    const user = userEvent.setup();
    render(<InboxPage />);
    await user.click(screen.getByTestId("select-notification"));
    await user.click(screen.getByTestId("auto-clear"));
    expect(screen.getByTestId("inbox-list")).toHaveAttribute(
      "data-selected-id",
      "null",
    );
  });

  it("hides the list panel on mobile when a notification is selected", async () => {
    (useShellVariant as jest.Mock).mockReturnValue("mobile");
    const user = userEvent.setup();
    render(<InboxPage />);
    const listPanel = screen.getByTestId("inbox-list").closest("div[class]");
    await user.click(screen.getByTestId("select-notification"));
    expect(listPanel?.className).toMatch(/hidden/);
  });

  it("does not own usePageState itself — state classification lives in InboxList", () => {
    render(<InboxPage />);
    expect(InboxList).toHaveBeenCalled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("renders the drafts panel when view=drafts is in the URL", async () => {
    mockSearchParams = new URLSearchParams("view=drafts");
    render(<InboxPage />);
    await waitFor(() => expect(screen.getByTestId("inbox-drafts-panel")).toBeInTheDocument());
    expect(screen.queryByTestId("inbox-list")).not.toBeInTheDocument();
  });

  it("renders the inbox list when no view param is present", () => {
    render(<InboxPage />);
    expect(screen.getByTestId("inbox-list")).toBeInTheDocument();
    expect(screen.queryByTestId("inbox-drafts-panel")).not.toBeInTheDocument();
  });
});
