import { useEffect } from "react";
import { act, renderHook } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { change, composerApiResponse, harness, press } from "./composer-test-harness";

jest.mock("next-auth/react", () => ({
  useSession: () => ({ data: { user: { id: "me", name: "Me", image: null } }, status: "authenticated" }),
}));

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  ...jest.requireActual("@/hooks/api/access"),
  useCan: () => true,
}));

const mockedGet = apiClient.get as jest.Mock;

beforeAll(() => {
  if (typeof globalThis.crypto?.randomUUID === "function") return;
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => "00000000-0000-4000-8000-000000000001",
  });
});

beforeEach(() => {
  localStorage.clear();
  mockedGet.mockReset();
  mockedGet.mockImplementation(composerApiResponse);
});

describe("composer triggers need a word boundary", () => {
  it("does not open the mention or record picker mid-word", () => {
    const { hook } = harness();
    change(hook, "mail a@b");
    expect(hook.result.current.showMentions).toBe(false);
    change(hook, "and/or");
    expect(hook.result.current.recordPicker).toBeNull();
  });

  it("opens the record picker for / at the start of text or after whitespace", () => {
    const { hook } = harness();
    change(hook, "/");
    expect(hook.result.current.recordPicker?.query).toBe("");
    change(hook, "see /acm");
    expect(hook.result.current.recordPicker?.query).toBe("acm");
    expect(hook.result.current.showMentions).toBe(false);
  });

  it("no longer treats # as a ticket trigger, so hashtags and issue numbers stay plain text", () => {
    const { hook } = harness();
    change(hook, "see #AP");
    expect(hook.result.current.recordPicker).toBeNull();
  });

  it("opens mentions for @ at a word boundary", () => {
    const { hook } = harness();
    change(hook, "@ad");
    expect(hook.result.current.showMentions).toBe(true);
    expect(hook.result.current.filteredMentions.map((c) => c.id)).toEqual(["u_aditi"]);
  });
});

describe("Enter during IME composition", () => {
  it("is left to the IME and does not send", async () => {
    const { hook, sendMessage } = harness();
    act(() => hook.result.current.setMessageInput("こんにちは"));
    const preventDefault = press(hook, "Enter", true);
    expect(preventDefault).not.toHaveBeenCalled();
    expect(sendMessage.mutateAsync).not.toHaveBeenCalled();
  });

  it("still sends outside composition", async () => {
    const { hook, sendMessage } = harness();
    act(() => hook.result.current.setMessageInput("hello"));
    await act(async () => {
      press(hook, "Enter");
    });
    expect(sendMessage.mutateAsync).toHaveBeenCalledTimes(1);
  });
});

describe("#169 — composer clears after send; draft autosave must not contaminate new channels", () => {
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
