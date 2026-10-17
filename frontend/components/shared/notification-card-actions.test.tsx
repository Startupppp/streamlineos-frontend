import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotificationCardActions } from "./notification-card-actions";

jest.mock("@/hooks/common/use-mobile", () => ({ useIsMobile: () => false }));
const resolve = jest.fn();
const restore = jest.fn();
const read = jest.fn();
const snooze = jest.fn();
const unsnooze = jest.fn();
function triage(overrides = {}) {
  return { isRead: false, isSnoozed: false, disabled: false, onRead: read, onResolve: resolve, onRestore: restore, onSnooze: snooze, onUnsnooze: unsnooze, ...overrides };
}
beforeEach(() => { jest.clearAllMocks(); resolve.mockResolvedValue(undefined); restore.mockResolvedValue(undefined); read.mockResolvedValue(undefined); snooze.mockResolvedValue(undefined); unsnooze.mockResolvedValue(undefined); });

describe("shared notification actions", () => {
  it("marks read without resolving or restoring the notification", async () => {
    const user = userEvent.setup();
    render(<NotificationCardActions pinned={false} isArchived={false} triage={triage()} />);
    await user.click(screen.getByRole("button", { name: "Notification actions" }));
    await user.click(screen.getByRole("button", { name: "Mark read" }));
    expect(read).toHaveBeenCalledTimes(1); expect(resolve).not.toHaveBeenCalled(); expect(restore).not.toHaveBeenCalled();
  });
  it("restores Done without clearing its independent snooze", async () => {
    const user = userEvent.setup();
    render(<NotificationCardActions pinned={false} isArchived triage={triage({ isSnoozed: true })} />);
    await user.click(screen.getByRole("button", { name: "Restore notification" }));
    expect(restore).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Restore" }));
    expect(restore).toHaveBeenCalledTimes(1); expect(unsnooze).not.toHaveBeenCalled();
  });
  it("confirms a future snooze and an explicit unsnooze without resolving", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<NotificationCardActions pinned={false} isArchived={false} triage={triage()} />);
    await user.click(screen.getByRole("button", { name: "Notification actions" }));
    await user.click(screen.getByRole("button", { name: "1 hour" }));
    expect(snooze).not.toHaveBeenCalled();
    const before = Date.now();
    await user.click(screen.getByRole("button", { name: "Snooze for 1 hour" }));
    const deadline: unknown = snooze.mock.calls[0]?.[0];
    if (typeof deadline !== "string") throw new Error("Missing ISO deadline");
    expect(new Date(deadline).getTime()).toBeGreaterThanOrEqual(before + 3_600_000);
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    rerender(<NotificationCardActions pinned={false} isArchived={false} triage={triage({ isSnoozed: true })} />);
    await user.click(screen.getByRole("button", { name: "Notification actions" }));
    await user.click(screen.getByRole("button", { name: "Unsnooze" }));
    expect(unsnooze).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Unsnooze" }));
    expect(unsnooze).toHaveBeenCalledTimes(1); expect(resolve).not.toHaveBeenCalled();
  });
  it("refuses offline actions and does not activate its surrounding row", async () => {
    const select = jest.fn();
    const user = userEvent.setup();
    render(<div onClick={select}><NotificationCardActions pinned={false} isArchived={false} triage={triage({ disabled: true })} /></div>);
    expect(screen.getByRole("button", { name: "Resolve notification" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Notification actions" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Resolve notification" }));
    expect(resolve).not.toHaveBeenCalled(); expect(select).not.toHaveBeenCalled();
  });
  it("requires confirmation before resolving, while preserving cancellation", async () => {
    const user = userEvent.setup();
    render(<NotificationCardActions pinned={false} isArchived={false} triage={triage()} />);
    await user.click(screen.getByRole("button", { name: "Resolve notification" }));
    expect(resolve).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(resolve).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Resolve notification" }));
    await user.click(screen.getByRole("button", { name: "Resolve" }));
    expect(resolve).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
  });

  it("preserves the global default archive/pin/delete labels and callbacks", async () => {
    const archive = jest.fn(), pin = jest.fn(), remove = jest.fn();
    const user = userEvent.setup();
    render(<NotificationCardActions pinned={false} isArchived={false} onArchive={archive} onPin={pin} onDelete={remove} />);
    expect(screen.queryByRole("button", { name: "Resolve notification" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Archive notification" }));
    await user.click(screen.getByRole("button", { name: "Pin notification" }));
    await user.click(screen.getByRole("button", { name: "Delete notification" }));
    expect(archive).toHaveBeenCalledTimes(1); expect(pin).toHaveBeenCalledTimes(1); expect(remove).toHaveBeenCalledTimes(1);
  });
});
