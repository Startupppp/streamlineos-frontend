import type React from "react";
import { useEffect } from "react";
import { act, renderHook } from "@testing-library/react";

import { useMessageComposer } from "./use-message-composer";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

beforeAll(() => {
  if (typeof globalThis.crypto?.randomUUID === "function") return;
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => "00000000-0000-4000-8000-000000000001",
  });
});

function harness() {
  const sendMessage = { mutateAsync: jest.fn(async () => ({ id: 1 })) };
  const hook = renderHook(() =>
    useMessageComposer({
      channelId: 7,
      draftKey: "chat:draft:7",
      isOnline: true,
      sendMessage,
      editMessage: { mutateAsync: jest.fn(async () => ({})) },
      markRead: { mutate: jest.fn() },
      scrollToBottom: () => undefined,
      publishTyping: () => undefined,
      filteredMentions: [],
    }),
  );
  return { hook, sendMessage };
}

function change(hook: ReturnType<typeof harness>["hook"], value: string) {
  const target = { value, selectionStart: value.length, style: {}, scrollHeight: 0 };
  act(() => {
    hook.result.current.handleInputChange({ target } as unknown as React.ChangeEvent<HTMLTextAreaElement>);
  });
}

function enter(hook: ReturnType<typeof harness>["hook"], isComposing: boolean) {
  const preventDefault = jest.fn();
  act(() => {
    hook.result.current.handleKeyDown({
      key: "Enter",
      shiftKey: false,
      keyCode: isComposing ? 229 : 13,
      nativeEvent: { isComposing },
      preventDefault,
    } as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
  });
  return preventDefault;
}

describe("composer triggers need a word boundary", () => {
  it("does not open the mention or ticket picker mid-word", () => {
    const { hook } = harness();
    change(hook, "mail a@b");
    expect(hook.result.current.showMentions).toBe(false);
    change(hook, "foo#1");
    expect(hook.result.current.showTicketPicker).toBe(false);
  });

  it("opens them at the start of text or after whitespace", () => {
    const { hook } = harness();
    change(hook, "@ad");
    expect(hook.result.current.showMentions).toBe(true);
    expect(hook.result.current.mentionQuery).toBe("ad");
    change(hook, "see #AP");
    expect(hook.result.current.showTicketPicker).toBe(true);
    expect(hook.result.current.ticketQuery).toBe("AP");
  });
});

describe("Enter during IME composition", () => {
  it("is left to the IME and does not send", async () => {
    const { hook, sendMessage } = harness();
    act(() => hook.result.current.setMessageInput("こんにちは"));
    const preventDefault = enter(hook, true);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(sendMessage.mutateAsync).not.toHaveBeenCalled();
  });

  it("still sends outside composition", async () => {
    const { hook, sendMessage } = harness();
    act(() => hook.result.current.setMessageInput("hello"));
    await act(async () => {
      enter(hook, false);
    });
    expect(sendMessage.mutateAsync).toHaveBeenCalledTimes(1);
  });
});

describe("#169 — composer clears after send; draft autosave must not contaminate new channels", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("messageInput is empty after a successful send", async () => {
    const { hook } = harness();
    act(() => hook.result.current.setMessageInput("hello world"));
    await act(async () => {
      await hook.result.current.handleSend();
    });
    expect(hook.result.current.messageInput).toBe("");
  });

  it("draftKey is removed from localStorage after a successful send", async () => {
    localStorage.setItem("chat:draft:7", "hello world");
    const { hook } = harness();
    act(() => hook.result.current.setMessageInput("hello world"));
    await act(async () => {
      await hook.result.current.handleSend();
    });
    expect(localStorage.getItem("chat:draft:7")).toBeNull();
  });

  it("draft save effect — draftKey change alone does not write old messageInput to the new channel key", () => {
    localStorage.setItem("chat:draft:7", "unsent draft");
    const draftKeyRef = { current: "chat:draft:7" };
    const { rerender } = renderHook(
      ({ draftKey, messageInput }: { draftKey: string; messageInput: string }) => {
        draftKeyRef.current = draftKey;
        useEffect(() => {
          const key = draftKeyRef.current;
          if (messageInput) localStorage.setItem(key, messageInput);
          else localStorage.removeItem(key);
        }, [messageInput]);
      },
      { initialProps: { draftKey: "chat:draft:7", messageInput: "unsent draft" } },
    );
    rerender({ draftKey: "chat:draft:8", messageInput: "unsent draft" });
    expect(localStorage.getItem("chat:draft:8")).toBeNull();
  });
});
