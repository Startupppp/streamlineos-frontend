import { act, renderHook } from "@testing-library/react";

import { useMessageComposer } from "./use-message-composer";
import type { SendMessageInput } from "@/types/chat";

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

/**
 * The backend built `clientKey` end to end — the column, the partial unique
 * index `uniq_chat_messages_client_key`, the `findByClientKey` pre-check, the
 * CHAT_MESSAGE_CLIENT_KEY_CONFLICT arbiter with its predicate, the
 * DuplicateSendError race path that replays the winner, and
 * `chat-send-idempotency.spec.ts` — and no frontend caller ever sent one.
 * `grep -rn clientKey` over the whole frontend returned two hits, both inside a
 * test fixture. `POST /chat/channels/:id/messages` carries no `@Idempotent`
 * decorator either, so there was no Idempotency-Key path as a substitute: a send
 * that was re-issued inserted a second row, fired a second outbox event and ran
 * a second push fanout, and the backend spec passed green over a path production
 * never took.
 *
 * The key must also be SCOPED to one logical send: reusing it for edited content
 * would make the server replay the first message and silently drop the edit.
 */

/**
 * `crypto.randomUUID` is a browser API (secure contexts) this repo already uses
 * in ten production call sites; jsdom ships `crypto` without it. Stood in here
 * rather than softened in the composer — a fallback in application code would
 * exist only for the test environment.
 */
beforeAll(() => {
  if (typeof globalThis.crypto?.randomUUID === "function") return;
  let n = 0;
  Object.defineProperty(globalThis.crypto, "randomUUID", {
    configurable: true,
    value: () => {
      n += 1;
      return `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
    },
  });
});

function harness(over: { failFirst?: boolean; isOnline?: boolean } = {}) {
  const sent: SendMessageInput[] = [];
  let calls = 0;
  const sendMessage = {
    mutateAsync: jest.fn(async (input: SendMessageInput) => {
      sent.push(input);
      calls += 1;
      if (over.failFirst && calls === 1) throw new Error("network timeout");
      return { id: calls };
    }),
  };
  const hook = renderHook(() =>
    useMessageComposer({
      channelId: 7,
      draftKey: "chat:draft:7",
      isOnline: over.isOnline ?? true,
      sendMessage,
      editMessage: { mutateAsync: jest.fn(async () => ({})) },
      markRead: { mutate: jest.fn() },
      scrollToBottom: () => undefined,
      publishTyping: () => undefined,
      filteredMentions: [],
    }),
  );
  return { hook, sent, sendMessage };
}

async function type(hook: ReturnType<typeof harness>["hook"], text: string) {
  await act(async () => {
    hook.result.current.setMessageInput(text);
  });
}

describe("chat send idempotency key", () => {
  it("mints a clientKey on every send, so the server's arbiter is reachable at all", async () => {
    const { hook, sent } = harness();
    await type(hook, "hello");
    await act(async () => {
      await hook.result.current.handleSend();
    });

    expect(sent).toHaveLength(1);
    expect(typeof sent[0]!.clientKey).toBe("string");
    expect(sent[0]!.clientKey!.length).toBeGreaterThan(0);
  });

  it("gives two different messages two different keys", async () => {
    const { hook, sent } = harness();
    await type(hook, "first");
    await act(async () => {
      await hook.result.current.handleSend();
    });
    await type(hook, "second");
    await act(async () => {
      await hook.result.current.handleSend();
    });

    expect(sent).toHaveLength(2);
    expect(sent[0]!.clientKey).not.toBe(sent[1]!.clientKey);
  });

  it("reuses the key when the SAME send is retried after a failure", async () => {
    const { hook, sent } = harness({ failFirst: true });
    await type(hook, "did this go through?");
    await act(async () => {
      await hook.result.current.handleSend();
    });
    // The composer restores the draft on failure; sending it again is the same
    // logical message, and the row may already be committed on the server.
    await act(async () => {
      await hook.result.current.handleSend();
    });

    expect(sent).toHaveLength(2);
    expect(sent[1]!.clientKey).toBe(sent[0]!.clientKey);
  });

  it("mints a NEW key when the failed draft is edited before retrying", async () => {
    const { hook, sent } = harness({ failFirst: true });
    await type(hook, "did this go through?");
    await act(async () => {
      await hook.result.current.handleSend();
    });
    await type(hook, "did this go through? asking again");
    await act(async () => {
      await hook.result.current.handleSend();
    });

    expect(sent).toHaveLength(2);
    expect(sent[1]!.clientKey).not.toBe(sent[0]!.clientKey);
  });

  it("carries the key into the offline queue so a replay cannot duplicate", async () => {
    const { hook } = harness({ isOnline: false });
    await type(hook, "queued while offline");
    await act(async () => {
      await hook.result.current.handleSend();
    });

    const queued = hook.result.current.messageQueue.current;
    expect(queued).toHaveLength(1);
    expect(typeof queued[0]!.clientKey).toBe("string");
    expect(queued[0]!.clientKey!.length).toBeGreaterThan(0);
  });
});
