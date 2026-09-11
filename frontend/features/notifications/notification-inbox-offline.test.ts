/**
 * `/notifications` fired all fourteen of its mutations while offline.
 *
 * `use-notification-inbox.ts` had zero connectivity guards across every `.mutate()`
 * site (mark read, mark all read, archive, unarchive, pin, unpin, snooze, delete,
 * bulk mark read, bulk archive, bulk delete, approve, reject) — underneath the
 * offline banner this very page renders. Each press dispatched a request that could
 * not succeed, the optimistic cache patch applied and then rolled back, and the row
 * visibly changed and changed back with nothing to explain it. The sibling
 * `/inbox` surface routed all eight of its mutations through `runWhenOnline` and
 * renders no banner: exactly inverted coverage.
 */
import { act, renderHook } from "@testing-library/react";
import { toast } from "sonner";
import { useNotificationInbox } from "./use-notification-inbox";

const mutations = {
  markRead: jest.fn(),
  markAllRead: jest.fn(),
  archive: jest.fn(),
  unarchive: jest.fn(),
  pin: jest.fn(),
  unpin: jest.fn(),
  del: jest.fn(),
  bulkMarkRead: jest.fn(),
  bulkArchive: jest.fn(),
  bulkDelete: jest.fn(),
  approve: jest.fn(),
  reject: jest.fn(),
  snooze: jest.fn(),
};

jest.mock("sonner", () => ({ toast: { error: jest.fn(), success: jest.fn() } }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("framer-motion", () => ({ useReducedMotion: () => false }));

jest.mock("@/hooks/api/notifications", () => ({
  useMarkNotificationRead: () => ({ mutate: mutations.markRead }),
  useMarkAllNotificationsRead: () => ({ mutate: mutations.markAllRead }),
  useArchiveNotification: () => ({ mutate: mutations.archive }),
  useUnarchiveNotification: () => ({ mutate: mutations.unarchive }),
  usePinNotification: () => ({ mutate: mutations.pin }),
  useUnpinNotification: () => ({ mutate: mutations.unpin }),
  useDeleteNotification: () => ({ mutate: mutations.del }),
  useBulkMarkRead: () => ({ mutate: mutations.bulkMarkRead }),
  useBulkArchive: () => ({ mutate: mutations.bulkArchive }),
  useBulkDelete: () => ({ mutate: mutations.bulkDelete }),
  useApproveNotification: () => ({ mutate: mutations.approve }),
  useRejectNotification: () => ({ mutate: mutations.reject }),
  useSnoozeNotification: () => ({ mutate: mutations.snooze }),
}));

function setOnline(value: boolean): void {
  Object.defineProperty(navigator, "onLine", { value, configurable: true });
}

function render() {
  const setSelectedIds = jest.fn();
  const setDetailId = jest.fn();
  return renderHook(() =>
    useNotificationInbox({
      setSelectedIds,
      setDetailId,
      selectedIds: new Set([1, 2]),
      items: [{ id: 1 }, { id: 2 }],
      activeSection: "ALL",
      debouncedSearch: "",
    }),
  );
}

describe("useNotificationInbox — offline", () => {
  beforeEach(() => {
    for (const fn of Object.values(mutations)) fn.mockClear();
    jest.mocked(toast.error).mockClear();
  });

  afterEach(() => setOnline(true));

  it("dispatches nothing and says why, for every command", () => {
    setOnline(false);
    const { result } = render();
    const inbox = result.current.handlers;

    act(() => {
      inbox.handleMarkReadOne(1);
      inbox.handleMarkAllRead();
      inbox.handleArchive(1);
      inbox.handleUnarchive(1);
      inbox.handlePin(1, false);
      inbox.handlePin(1, true);
      inbox.handleSnooze(1, "2026-01-01T00:00:00.000Z");
      inbox.handleDelete(1);
      inbox.handleBulkMarkRead();
      inbox.handleBulkArchive();
      inbox.handleBulkDelete();
      inbox.handleApprove(1);
      inbox.handleReject(1);
    });

    for (const [name, fn] of Object.entries(mutations))
      expect([name, fn.mock.calls.length]).toEqual([name, 0]);
    expect(jest.mocked(toast.error).mock.calls.length).toBe(13);
  });

  it("opening a row stays silent offline — reading is not a command", () => {
    setOnline(false);
    const { result } = render();

    act(() => {
      result.current.handlers.handleNotificationClick({ id: 1, isRead: false, link: null });
    });

    expect(mutations.markRead).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("online, every command still dispatches — the guard is not a mute button", () => {
    setOnline(true);
    const { result } = render();
    const inbox = result.current.handlers;

    act(() => {
      inbox.handleMarkReadOne(1);
      inbox.handleMarkAllRead();
      inbox.handleArchive(1);
      inbox.handleUnarchive(1);
      inbox.handlePin(1, false);
      inbox.handlePin(1, true);
      inbox.handleSnooze(1, "2026-01-01T00:00:00.000Z");
      inbox.handleDelete(1);
      inbox.handleBulkMarkRead();
      inbox.handleBulkArchive();
      inbox.handleBulkDelete();
      inbox.handleApprove(1);
      inbox.handleReject(1);
    });

    for (const [name, fn] of Object.entries(mutations))
      expect([name, fn.mock.calls.length]).toEqual([name, 1]);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
