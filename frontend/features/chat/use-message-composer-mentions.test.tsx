import { act, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import { change, composerApiResponse, harness } from "./composer-test-harness";

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

describe("@ mentions reach anyone in the org, members first", () => {
  it("ranks conversation members before org-wide matches from the server typeahead", async () => {
    const { hook } = harness();
    change(hook, "hi @a");
    await waitFor(() => expect(hook.result.current.filteredMentions).toHaveLength(3));
    expect(hook.result.current.filteredMentions).toEqual([
      expect.objectContaining({ id: "u_aditi", isMember: true }),
      expect.objectContaining({ id: "u_bala", isMember: true }),
      expect.objectContaining({ id: "u_arjun", isMember: false }),
    ]);
    const userCalls = mockedGet.mock.calls.filter(([url]) => url === "/chat/search/users");
    expect(userCalls[userCalls.length - 1][1]).toEqual({ q: "a" });
  });

  it("asks before mentioning someone outside a private conversation", async () => {
    const { hook } = harness("PRIVATE");
    change(hook, "hi @ar");
    await waitFor(() => expect(hook.result.current.filteredMentions).toHaveLength(1));
    act(() => hook.result.current.insertMention(hook.result.current.filteredMentions[0]));
    expect(hook.result.current.mentionPrompt).toEqual({ userId: "u_arjun", name: "Arjun Mehta" });
    act(() => hook.result.current.dismissMentionPrompt());
    expect(hook.result.current.mentionPrompt).toBeNull();
  });

  it("drops the prompt when the mention text is deleted, and after the message is sent", async () => {
    const { hook } = harness("PRIVATE");
    change(hook, "hi @ar");
    await waitFor(() => expect(hook.result.current.filteredMentions).toHaveLength(1));
    act(() => hook.result.current.insertMention(hook.result.current.filteredMentions[0]));
    expect(hook.result.current.mentionPrompt).not.toBeNull();
    act(() => hook.result.current.setMessageInput("hi "));
    expect(hook.result.current.mentionPrompt).toBeNull();
    act(() => hook.result.current.setMessageInput("hi @Arjun Mehta "));
    expect(hook.result.current.mentionPrompt).not.toBeNull();
    await act(async () => {
      await hook.result.current.handleSend();
    });
    expect(hook.result.current.mentionPrompt).toBeNull();
  });

  it("just mentions in a public conversation", async () => {
    const { hook } = harness("PUBLIC");
    change(hook, "hi @ar");
    await waitFor(() => expect(hook.result.current.filteredMentions).toHaveLength(1));
    act(() => hook.result.current.insertMention(hook.result.current.filteredMentions[0]));
    expect(hook.result.current.mentionPrompt).toBeNull();
  });

  it("does not prompt for someone who is already a member", () => {
    const { hook } = harness("PRIVATE");
    change(hook, "hi @ad");
    act(() => hook.result.current.insertMention(hook.result.current.filteredMentions[0]));
    expect(hook.result.current.mentionPrompt).toBeNull();
  });

  it("offers only the partner in a direct message and never searches the org", async () => {
    const { hook } = harness("DIRECT");
    change(hook, "@a");
    expect(hook.result.current.filteredMentions.map((c) => c.id)).toEqual(["u_aditi"]);
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(mockedGet.mock.calls.some(([url]) => url === "/chat/search/users")).toBe(false);
  });
});
