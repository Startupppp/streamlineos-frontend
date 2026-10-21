import { act, waitFor } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/lib/api-envelope";
import { deferred, freshClient, installRandomUuid, seedTimeline, timeline } from "@/hooks/api/chat-cache-test-harness";
import { readOutbox } from "./composer-draft";
import { DRAFT_KEY, delivered, isSendUrl, mockedPost, mount, readBody, sendCalls, serverRow, typeAndSend } from "./chat-send-outbox-test-harness";

jest.mock("next-auth/react", () => ({
  useSession: jest.fn().mockReturnValue({
    data: { orgId: "org-1", user: { id: "user-1", name: "Ada", image: null } },
    status: "authenticated",
  }),
}));

jest.mock("@/lib/api-client", () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

jest.mock("@/hooks/api/access", () => ({
  useAccess: jest.fn(() => ({ data: { scopes: {}, modules: {}, isOrgOwner: true }, refetch: jest.fn() })),
  useCan: jest.fn().mockReturnValue(true),
  useModuleEnabled: jest.fn().mockReturnValue(true),
}));

jest.mock("@/hooks/api/authorized-mutation", () => {
  const { useMutation } = jest.requireActual("@tanstack/react-query");
  return { useAuthorizedMutation: (_scope: string, options: unknown) => useMutation(options) };
});

jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn(), warning: jest.fn() },
}));

installRandomUuid();

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  onlineManager.setOnline(true);
});

afterEach(() => {
  onlineManager.setOnline(true);
});

describe("a message handed to the send pipeline leaves the draft", () => {
  it("offline send, reconnect, delivery, reload: the composer is empty and the next message is not prefixed", async () => {
    mockedPost.mockImplementation(async (url, body) => (isSendUrl(String(url)) ? serverRow(readBody(body)) : undefined));
    onlineManager.setOnline(false);
    const first = freshClient();
    seedTimeline(first, []);
    const tab = mount(first, false);

    await typeAndSend(tab, "offA2-queued");
    expect(tab.result.current.messageInput).toBe("");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(readOutbox(DRAFT_KEY).map((entry) => entry.content)).toEqual(["offA2-queued"]);
    expect(timeline(first).map((message) => message.content)).toEqual(["offA2-queued"]);
    expect(timeline(first)[0].id).toBeLessThan(0);
    expect(sendCalls()).toHaveLength(0);

    await act(async () => {
      onlineManager.setOnline(true);
      tab.rerender({ isOnline: true });
    });
    await waitFor(() => expect(delivered(timeline(first)).map((m) => m.content)).toEqual(["offA2-queued"]));
    expect(readOutbox(DRAFT_KEY)).toEqual([]);
    const deliveredRow = delivered(timeline(first))[0];
    tab.unmount();

    const reloaded = freshClient();
    seedTimeline(reloaded, [deliveredRow]);
    const afterReload = mount(reloaded, true);
    expect(afterReload.result.current.messageInput).toBe("");
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();

    await typeAndSend(afterReload, "postjoin");
    await waitFor(() => expect(sendCalls()).toHaveLength(2));
    expect(sendCalls().map((call) => call.content)).toEqual(["offA2-queued", "postjoin"]);
  });

  it("reload while still queued: the composer is empty and the queued message shows as pending, then delivers once", async () => {
    onlineManager.setOnline(false);
    const first = freshClient();
    seedTimeline(first, []);
    const tab = mount(first, false);
    await typeAndSend(tab, "written offline");
    const [queued] = readOutbox(DRAFT_KEY);
    tab.unmount();

    onlineManager.setOnline(true);
    const pending = deferred<ReturnType<typeof serverRow>>();
    mockedPost.mockImplementation((url) => (isSendUrl(String(url)) ? pending.promise : Promise.resolve(undefined)));
    const reloaded = freshClient();
    seedTimeline(reloaded, []);
    const afterReload = mount(reloaded, true);

    expect(afterReload.result.current.messageInput).toBe("");
    await waitFor(() => expect(timeline(reloaded).map((m) => m.clientKey)).toEqual([queued.clientKey]));
    expect(timeline(reloaded)[0].id).toBeLessThan(0);

    await act(async () => pending.resolve(serverRow({ content: "written offline", clientKey: queued.clientKey })));
    await waitFor(() => expect(delivered(timeline(reloaded))).toHaveLength(1));
    expect(sendCalls().map((call) => call.clientKey)).toEqual([queued.clientKey]);
    expect(readOutbox(DRAFT_KEY)).toEqual([]);
    expect(afterReload.result.current.messageInput).toBe("");
  });

  it("does not resend a queued message the reloaded history already holds", async () => {
    onlineManager.setOnline(false);
    const first = freshClient();
    seedTimeline(first, []);
    const tab = mount(first, false);
    await typeAndSend(tab, "landed before reload");
    const [queued] = readOutbox(DRAFT_KEY);
    tab.unmount();

    onlineManager.setOnline(true);
    const reloaded = freshClient();
    const landed = serverRow({ content: "landed before reload", clientKey: queued.clientKey });
    seedTimeline(reloaded, [{ ...landed, sender: { id: "user-1", name: "Ada", image: null }, reactions: {}, attachments: [], replyTo: null }]);
    mount(reloaded, true);

    await waitFor(() => expect(readOutbox(DRAFT_KEY)).toEqual([]));
    expect(sendCalls()).toHaveLength(0);
  });
});

describe("a terminal rejection is surfaced, never dropped", () => {
  it("restores the message to the empty composer and offers Retry, which resends under the same key", async () => {
    let calls = 0;
    mockedPost.mockImplementation(async (url, body) => {
      if (!isSendUrl(String(url))) return undefined;
      calls += 1;
      if (calls === 1) throw new ApiError("You are not a member of this channel", 403, "FORBIDDEN");
      return serverRow(readBody(body));
    });
    const client = freshClient();
    seedTimeline(client, []);
    const tab = mount(client, true);
    await typeAndSend(tab, "rejected once");

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(tab.result.current.messageInput).toBe("rejected once");
    expect(timeline(client)).toHaveLength(0);
    expect(readOutbox(DRAFT_KEY)).toEqual([]);

    const options = jest.mocked(toast.error).mock.calls[0][1];
    const action = options?.action;
    if (!action || !("onClick" in action)) throw new Error("the failure toast offers no Retry action");
    expect(action.label).toBe("Retry");
    await act(async () => {
      action.onClick(new MouseEvent("click"));
    });

    await waitFor(() => expect(delivered(timeline(client))).toHaveLength(1));
    const [firstKey, retryKey] = sendCalls().map((call) => call.clientKey);
    expect(retryKey).toBe(firstKey);
  });
});
