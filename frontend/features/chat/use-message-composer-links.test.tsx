import { act, waitFor } from "@testing-library/react";

import { apiClient } from "@/lib/api-client";
import {
  change,
  composerApiResponse,
  harness,
  openRecordPickerWithResults,
  press,
} from "./composer-test-harness";

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

describe("/ record picker searches every linkable module", () => {
  it("debounces, then asks /search for every linkable type and never for contacts, which cannot be linked", async () => {
    const { hook } = harness();
    await openRecordPickerWithResults(hook);
    const searchCalls = mockedGet.mock.calls.filter(([url]) => url === "/search");
    expect(searchCalls).toHaveLength(1);
    const types = String(searchCalls[0][1].types).split(",");
    expect(types).toEqual(
      expect.arrayContaining(["lead", "deal", "client", "ticket", "employee", "doc_page", "calendar_event", "support_ticket"]),
    );
    expect(types).not.toContain("contact");
    expect(searchCalls[0][1].q).toBe("acme");
  });

  it("groups results by module in a fixed order", async () => {
    const { hook } = harness();
    await openRecordPickerWithResults(hook);
    expect(hook.result.current.recordPicker?.groups.map((g) => g.label)).toEqual(["CRM", "Build", "HR"]);
  });

  it("moves the active option with the arrow keys and inserts it with Enter instead of sending", async () => {
    const { hook, sendMessage } = harness();
    await openRecordPickerWithResults(hook);
    expect(hook.result.current.recordPicker?.activeIndex).toBe(0);
    press(hook, "ArrowDown");
    expect(hook.result.current.recordPicker?.activeIndex).toBe(1);
    act(() => hook.result.current.setMessageInput("see /acme"));
    press(hook, "Enter");
    expect(sendMessage.mutateAsync).not.toHaveBeenCalled();
    expect(hook.result.current.recordPicker).toBeNull();
    expect(hook.result.current.linkedRecords.map((r) => r.key)).toEqual(["ticket:41"]);
    expect(hook.result.current.messageInput).toBe("see ");
  });

  it("closes on Escape without inserting anything", async () => {
    const { hook } = harness();
    await openRecordPickerWithResults(hook);
    press(hook, "Escape");
    expect(hook.result.current.recordPicker).toBeNull();
    expect(hook.result.current.linkedRecords).toEqual([]);
  });

  it("links a record once even when it is picked twice", async () => {
    const { hook } = harness();
    await openRecordPickerWithResults(hook);
    const [deal] = hook.result.current.recordPicker?.groups[0].items ?? [];
    act(() => hook.result.current.selectRecord(deal));
    act(() => hook.result.current.selectRecord(deal));
    expect(hook.result.current.linkedRecords).toHaveLength(1);
  });

  it("sends only { type, id } for each linked record, so titles never travel and every reader resolves their own card", async () => {
    const { hook, sent } = harness();
    await openRecordPickerWithResults(hook);
    const items = hook.result.current.recordPicker?.groups.flatMap((g) => g.items) ?? [];
    act(() => {
      for (const item of items) hook.result.current.selectRecord(item);
    });
    act(() => hook.result.current.setMessageInput("have a look"));
    await act(async () => {
      await hook.result.current.handleSend();
    });
    expect(sent[0].metadata).toEqual({
      entities: [
        { type: "deal", id: "5" },
        { type: "ticket", id: "41" },
        { type: "employee", id: "u_asha" },
      ],
    });
    expect(hook.result.current.linkedRecords).toEqual([]);
  });

  it("drops a linked record the user removed before sending", async () => {
    const { hook, sent } = harness();
    await openRecordPickerWithResults(hook);
    const [deal] = hook.result.current.recordPicker?.groups[0].items ?? [];
    act(() => hook.result.current.selectRecord(deal));
    act(() => hook.result.current.removeLinkedRecord("deal:5"));
    act(() => hook.result.current.setMessageInput("never mind"));
    await act(async () => {
      await hook.result.current.handleSend();
    });
    expect(sent[0].metadata).toBeUndefined();
  });

  it("keeps the linked records when a send fails, so a retry carries them", async () => {
    const { hook } = harness("PRIVATE", true);
    await openRecordPickerWithResults(hook);
    const [deal] = hook.result.current.recordPicker?.groups[0].items ?? [];
    act(() => hook.result.current.selectRecord(deal));
    act(() => hook.result.current.setMessageInput("look"));
    await act(async () => {
      await hook.result.current.handleSend();
    });
    expect(hook.result.current.linkedRecords.map((r) => r.key)).toEqual(["deal:5"]);
  });

  it("seeds the picked title at send so the optimistic message shows its pill before the server card arrives", async () => {
    const { hook, client } = harness();
    await openRecordPickerWithResults(hook);
    const [deal] = hook.result.current.recordPicker?.groups[0].items ?? [];
    act(() => hook.result.current.selectRecord(deal));
    act(() => hook.result.current.setMessageInput("see this"));
    await act(async () => {
      await hook.result.current.handleSend();
    });
    const seeded = client.getQueryCache().findAll().map((q) => q.state.data);
    expect(seeded).toContainEqual({
      type: "deal",
      id: "5",
      title: "Acme renewal",
      subtitle: "Asha",
      status: null,
      href: "/crm/deals/5",
    });
  });

  it("swallows Enter while the picker is open and results have not arrived, so the half-typed /query is never sent", () => {
    const { hook, sendMessage } = harness();
    change(hook, "see /acme");
    const preventDefault = press(hook, "Enter");
    expect(preventDefault).toHaveBeenCalled();
    expect(sendMessage.mutateAsync).not.toHaveBeenCalled();
    expect(hook.result.current.recordPicker).not.toBeNull();
  });

  it("hides results once the query drops below two characters instead of keeping stale ones selectable", async () => {
    const { hook, sendMessage } = harness();
    await openRecordPickerWithResults(hook);
    change(hook, "see /a");
    expect(hook.result.current.recordPicker?.groups).toEqual([]);
    expect(hook.result.current.recordPicker?.activeIndex).toBe(-1);
    press(hook, "Enter");
    expect(hook.result.current.linkedRecords).toEqual([]);
    expect(sendMessage.mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps linked records in the draft and restores text and links on the next mount", async () => {
    const first = harness();
    await openRecordPickerWithResults(first.hook);
    const [deal] = first.hook.result.current.recordPicker?.groups[0].items ?? [];
    act(() => first.hook.result.current.selectRecord(deal));
    localStorage.setItem("chat:draft:7", "half written");
    first.hook.unmount();
    const second = harness();
    expect(second.hook.result.current.messageInput).toBe("half written");
    expect(second.hook.result.current.linkedRecords.map((r) => r.key)).toEqual(["deal:5"]);
  });

  it("ignores a tampered links draft instead of rendering it", () => {
    localStorage.setItem("chat:draft:7:links", JSON.stringify([{ key: "x", type: "invoice", id: "1" }]));
    const { hook } = harness();
    expect(hook.result.current.linkedRecords).toEqual([]);
  });

  it("clears the links draft after a successful send", async () => {
    const { hook } = harness();
    await openRecordPickerWithResults(hook);
    const [deal] = hook.result.current.recordPicker?.groups[0].items ?? [];
    act(() => hook.result.current.selectRecord(deal));
    expect(localStorage.getItem("chat:draft:7:links")).not.toBeNull();
    act(() => hook.result.current.setMessageInput("go"));
    await act(async () => {
      await hook.result.current.handleSend();
    });
    expect(localStorage.getItem("chat:draft:7:links")).toBeNull();
  });
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
