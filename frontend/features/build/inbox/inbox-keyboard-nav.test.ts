import { renderHook } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import type { RefObject } from "react";
import type { Notification } from "@/types/notifications";
import { useInboxKeyboardNav } from "./use-inbox-keyboard-nav";

function makeNotification(id: number): Notification {
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

const notifications = [1, 2, 3].map(makeNotification);

afterEach(() => {
  jest.clearAllMocks();
});

describe("useInboxKeyboardNav — j/k navigation", () => {
  it("j moves selection forward from null to the first notification", () => {
    const onSelect = jest.fn();
    const onClearSelection = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: null, onSelect, onClearSelection, searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "j" });
    expect(onSelect).toHaveBeenCalledWith(notifications[0]);
  });

  it("j moves selection from the first to the second notification", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: 1, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "j" });
    expect(onSelect).toHaveBeenCalledWith(notifications[1]);
  });

  it("k moves selection backward from second to first", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: 2, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "k" });
    expect(onSelect).toHaveBeenCalledWith(notifications[0]);
  });

  it("Escape clears the selection", () => {
    const onClearSelection = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: 1, onSelect: jest.fn(), onClearSelection, searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it("/ focuses the search input", () => {
    const input = document.createElement("input");
    const focusSpy = jest.spyOn(input, "focus");
    const ref = { current: input } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: null, onSelect: jest.fn(), onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "/" });
    expect(focusSpy).toHaveBeenCalledTimes(1);
  });

  it("j is inert when the target is an input element", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: null, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    const input = document.createElement("input");
    document.body.appendChild(input);
    fireEvent.keyDown(input, { key: "j" });
    expect(onSelect).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("j is inert when meta key is held", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: null, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "j", metaKey: true });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("j is inert when ctrl key is held", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: null, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "j", ctrlKey: true });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("j is inert when the target is a textarea", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: null, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    const textarea = document.createElement("textarea");
    document.body.appendChild(textarea);
    fireEvent.keyDown(textarea, { key: "j" });
    expect(onSelect).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it("j does not move past the last notification", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: 3, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "j" });
    expect(onSelect).toHaveBeenCalledWith(notifications[2]);
  });

  it("k does not move before the first notification", () => {
    const onSelect = jest.fn();
    const ref = { current: null } as RefObject<HTMLInputElement | null>;
    renderHook(() =>
      useInboxKeyboardNav({ notifications, selectedId: 1, onSelect, onClearSelection: jest.fn(), searchInputRef: ref }),
    );
    fireEvent.keyDown(document, { key: "k" });
    expect(onSelect).toHaveBeenCalledWith(notifications[0]);
  });
});
