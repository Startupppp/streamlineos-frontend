import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClientProvider } from "@tanstack/react-query";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { authenticatedScope } from "@/lib/query-scope";
import { apiClientMock, makeNotif, setNotificationSession } from "@/hooks/api/notifications-inbox-test-fixtures";
import type { Notification } from "@/types/notifications";
import { Toaster } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { InboxPage } from "./inbox-page";

jest.mock("next-auth/react", () => ({ useSession: jest.fn() }));
jest.mock("@/lib/api-client", () => ({ apiClient: { request: jest.fn(), get: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() }, isImpersonating: () => false }));
jest.mock("next/dynamic", () => (loader: () => Promise<{ default: React.ComponentType }>) => {
  const Component = React.lazy(loader);
  return function Dynamic(props: Record<string, unknown>) { return <React.Suspense fallback={null}><Component {...props} /></React.Suspense>; };
});
const replace = jest.fn();
let params = new URLSearchParams();
let mockShellVariant: "desktop" | "mobile" = "mobile";
jest.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/build/inbox", useSearchParams: () => params }));
jest.mock("@/hooks/common/use-mobile", () => ({
  useIsBelowLg: () => mockShellVariant !== "desktop",
  useIsMobile: () => false,
}));
jest.mock("@/components/ui/page-wrapper", () => ({ PageWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
jest.mock("@/hooks/api/use-page-state", () => ({ usePageState: ({ isLoading, isError, error, isEmpty }: { isLoading: boolean; isError: boolean; error: unknown; isEmpty: boolean }) => isLoading ? { kind: "loading" } : isError ? { kind: "error", error } : isEmpty ? { kind: "empty" } : { kind: "ready" } }));
jest.mock("@/hooks/common/use-online-status", () => ({ useOnlineStatus: () => online }));
jest.mock("./inbox-preview-pane", () => ({ InboxPreviewPane: ({ notification, onClose }: { notification: Notification | null; onClose: () => void }) => <div data-testid="preview">{notification?.title}<button onClick={onClose}>Back to inbox</button></div> }));

let row: Notification;
let permitted: boolean;
let online = true;
function response(data: Notification[]): Response {
  const body = { success: true, data: { data: data.map((notification) => ({ eventKey: null, entityType: null, entityId: null, reason: null, metadata: null, ...notification, ticketContext: null })), hasMore: false, nextCursor: null } };
  return { ok: true, status: 200, statusText: "OK", headers: new Headers({ "content-type": "application/json" }), body: null, bodyUsed: false,
    type: "basic", url: "http://api.test/notifications", redirected: false, json: async () => body, text: async () => JSON.stringify(body),
    arrayBuffer: async () => new ArrayBuffer(0), blob: async () => new Blob(), formData: async () => new FormData(), bytes: async () => new Uint8Array(), clone: () => response(data) };
}
function setup() {
  const client = createAppQueryClient(authenticatedScope("org-1", "u-1"));
  return { client, ...render(<QueryClientProvider client={client}><Toaster /><InboxPage /></QueryClientProvider>) };
}
beforeEach(() => {
  jest.clearAllMocks(); setNotificationSession(); params = new URLSearchParams(); permitted = true; online = true; mockShellVariant = "mobile";
  row = { ...makeNotif(42), sourceModule: "build", category: "PROJECTS" };
  apiClientMock().get.mockImplementation((_path: string, filters: Record<string, string>) => {
    const visible = permitted && (filters.section === "UNREAD" ? !row.isRead && !row.archivedAt && !row.snoozedUntil : filters.section === "ARCHIVED" ? !!row.archivedAt : filters.section === "SNOOZED" ? !!row.snoozedUntil : !row.archivedAt && !row.snoozedUntil);
    return Promise.resolve({ data: visible ? [row] : [], hasNextPage: false, nextCursor: null });
  });
  jest.mocked(apiClient.request).mockImplementation(async (path) => {
    const section = new URL(path, "http://api.test").searchParams.get("section");
    const visible = permitted && (section === "ARCHIVED" ? !!row.archivedAt : section === "SNOOZED" ? !!row.snoozedUntil : !row.archivedAt && !row.snoozedUntil);
    return response(visible ? [row] : []);
  });
  apiClientMock().patch.mockImplementation((path: string) => { if (path.endsWith("/read")) row = { ...row, isRead: true }; return Promise.resolve({ success: true }); });
});

describe("Build Inbox triage workflow", () => {
  it("dismisses desktop selection with Escape without automatically reopening it", async () => {
    mockShellVariant = "desktop";
    params = new URLSearchParams("section=ALL&q=Notification&type=PROJECTS&projectId=54&panel=preview");
    row = { ...row, isRead: true };
    const user = userEvent.setup(); setup();
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42"), { timeout: 5000 });
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByTestId("preview")).not.toHaveTextContent("Notification 42"));
    expect(screen.getByRole("searchbox", { name: "Search notifications" })).toHaveFocus();
    expect(replace).not.toHaveBeenCalled();
    expect(params.toString()).toBe("section=ALL&q=Notification&type=PROJECTS&projectId=54&panel=preview");
    expect(apiClientMock().patch).not.toHaveBeenCalled();
  });
  it("clears the preview only after Resolve acknowledgement", async () => {
    mockShellVariant = "desktop";
    params = new URLSearchParams("section=ALL");
    const user = userEvent.setup(); setup();
    await user.click(await screen.findByRole("button", { name: /Notification 42/ }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42"));
    let accept: (value: { success: boolean }) => void = () => { throw new Error("Missing request"); };
    apiClientMock().patch.mockReturnValueOnce(new Promise<{ success: boolean }>((resolve) => { accept = resolve; }));
    await user.click(screen.getByRole("button", { name: "Resolve notification" }));
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(apiClientMock().patch).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42");
    expect(screen.getByRole("button", { name: "Resolve" })).toBeDisabled();
    await act(async () => { row = { ...row, archivedAt: new Date().toISOString() }; accept({ success: true }); });
    await waitFor(() => expect(screen.getByTestId("preview")).not.toHaveTextContent("Notification 42"));
    expect(apiClientMock().patch.mock.calls[1]?.[0]).toBe("/notifications/42/archive");
  });
  it("refuses read and triage writes offline", async () => {
    mockShellVariant = "desktop";
    params = new URLSearchParams("section=ALL");
    online = false;
    const user = userEvent.setup(); setup();
    await user.click(await screen.findByRole("button", { name: /Notification 42/ }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42"));
    screen.getAllByRole("button", { name: "Resolve notification" }).forEach((button) => expect(button).toBeDisabled());
    expect(screen.queryByRole("button", { name: "Mark all read" })).toBeNull();
    expect(apiClientMock().patch).not.toHaveBeenCalled();
  });
  it.each([
    { section: "ARCHIVED", label: "Restore notification", confirm: "Restore", endpoint: "unarchive" },
    { section: "SNOOZED", label: "Notification actions", confirm: "Unsnooze", endpoint: "unsnooze" },
  ])("uses the exact $endpoint command from $section", async ({ section, label, confirm, endpoint }) => {
    mockShellVariant = "desktop";
    params = new URLSearchParams(`section=${section}&q=Notification&type=PROJECTS&projectId=54&panel=preview`);
    row = { ...row, isRead: true, archivedAt: section === "ARCHIVED" ? new Date().toISOString() : null, snoozedUntil: new Date(Date.now() + 3_600_000).toISOString() };
    const user = userEvent.setup(); setup();
    await user.click(await screen.findByRole("button", { name: /Notification 42/ }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42"));
    await user.click(screen.getAllByRole("button", { name: label }).at(-1) ?? screen.getByRole("button", { name: label }));
    if (section === "SNOOZED") await user.click(screen.getByRole("button", { name: "Unsnooze" }));
    await user.click(screen.getByRole("button", { name: confirm }));
    await waitFor(() => expect(apiClientMock().patch).toHaveBeenCalledWith(`/notifications/42/${endpoint}`, undefined, expect.anything(), expect.anything()));
    expect(apiClientMock().patch).toHaveBeenCalledTimes(1);
    expect(replace).not.toHaveBeenCalled();
  });
  it("redacts a selected row when its fresh authorized ID read is empty", async () => {
    const user = userEvent.setup(); const { client } = setup();
    await screen.findByRole("button", { name: /Notification 42/ }, { timeout: 5000 });
    client.setQueryData(platformCoreQueryKeys.notifications.selected(42, "ALL"), {
      notification: { ...row, title: "Stale selected private title" }, isMissing: false, ownerStamp: "stale-lease",
    });
    permitted = false;
    await user.click(screen.getByRole("button", { name: /Notification 42/ }));
    await waitFor(() => expect(screen.getByTestId("preview")).not.toHaveTextContent("Notification 42"));
    expect(screen.queryByText("Stale selected private title")).toBeNull();
    expect(jest.mocked(apiClient.request).mock.calls.some((call) => new URL(call[0], "http://api.test").searchParams.get("ids") === "42")).toBe(true);
  });

  it("keeps the authorized preview when read acknowledgement removes the Unread row", async () => {
    const user = userEvent.setup(); setup();
    await user.click(await screen.findByRole("button", { name: /Notification 42/ }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42"));
    await waitFor(() => expect(row.isRead).toBe(true));
    expect(apiClientMock().patch.mock.calls.map((call) => call[0])).toEqual(["/notifications/42/read"]);
    expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42");
  });

  it("keeps the preview and reports failure without resolving linked work", async () => {
    mockShellVariant = "desktop";
    params = new URLSearchParams("section=ALL");
    const user = userEvent.setup(); setup();
    await user.click(await screen.findByRole("button", { name: /Notification 42/ }));
    await waitFor(() => expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42"));
    apiClientMock().patch.mockRejectedValueOnce(new ApiError("Service unavailable", 503));
    await user.click(screen.getByRole("button", { name: "Resolve notification" }));
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(screen.getByText("Something went wrong on our end. Please try again shortly.")).toBeVisible());
    expect(screen.getByTestId("preview")).toHaveTextContent("Notification 42");
    expect(apiClientMock().patch.mock.calls.map((call) => call[0])).toEqual(["/notifications/42/read", "/notifications/42/archive"]);
    expect(screen.getByRole("alertdialog")).toBeVisible();
  });
});
