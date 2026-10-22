import type { ChangeEvent, KeyboardEvent, ReactNode } from "react";
import { fireEvent, render, renderHook, waitFor, within } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { makeQueryClient } from "@/test-utils/render";

import { useMessageComposer } from "./use-message-composer";
import type { ChatChannelDetailWire } from "@/hooks/api/chat-extra-schema";
import type { SendMessageInput } from "@/types/chat";

type ChannelType = ChatChannelDetailWire["type"];

function member(id: string, name: string, memberId: number): ChatChannelDetailWire["members"][number] {
  return {
    id: memberId,
    channelId: 7,
    userId: id,
    role: "MEMBER",
    mutedUntil: null,
    isFavorite: false,
    notificationPreference: "DEFAULT",
    lastReadAt: null,
    joinedAt: "2026-10-01T00:00:00.000Z",
    archivedAt: null,
    user: { id, name, image: null, email: `${id}@acme.test` },
  };
}

function channelOf(type: ChannelType): ChatChannelDetailWire {
  return {
    id: 7,
    orgId: "org_1",
    name: "launch",
    description: null,
    type,
    avatarUrl: null,
    isArchived: false,
    entityType: null,
    entityId: null,
    isPinned: false,
    isPrivate: type !== "PUBLIC",
    messageCount: 0,
    lastMessageAt: "2026-10-01T00:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    members: type === "DIRECT"
      ? [member("me", "Me", 1), member("u_aditi", "Aditi Shah", 2)]
      : [member("me", "Me", 1), member("u_aditi", "Aditi Shah", 2), member("u_bala", "Bala", 3)],
  };
}

export const SEARCH_RESULTS = [
  { id: 41, type: "ticket", title: "Fix login", subtitle: "AP-41", href: "/build/1/issues?ticket=41", status: "TODO" },
  { id: "u_asha", type: "employee", title: "Asha Rao", subtitle: "asha@acme.test", href: "/hr/employees/u_asha" },
  { id: 5, type: "deal", title: "Acme renewal", subtitle: "Asha", href: "/crm/deals/5" },
];

export const ORG_USERS = [
  { id: "u_aditi", name: "Aditi Shah", email: "u_aditi@acme.test", image: null },
  { id: "u_arjun", name: "Arjun Mehta", email: "arjun@acme.test", image: null },
];

export function harness(type: ChannelType = "PRIVATE", fail = false, isOnline = true) {
  const sent: SendMessageInput[] = [];
  const sendMessage = {
    mutateAsync: jest.fn(async (input: SendMessageInput) => {
      sent.push(input);
      if (fail) throw new Error("network timeout");
      return { id: 1 };
    }),
  };
  const client = makeQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  const hook = renderHook(
    ({ draftKey }: { draftKey: string }) =>
      useMessageComposer({
        channelId: 7,
        draftKey,
        isOnline,
        sendMessage,
        editMessage: { mutateAsync: jest.fn(async () => ({})) },
        markRead: { mutate: jest.fn() },
        scrollToBottom: () => undefined,
        publishTyping: () => undefined,
        channel: channelOf(type),
        currentUserId: "me",
      }),
    { wrapper: Wrapper, initialProps: { draftKey: "chat:draft:7" } },
  );
  mountComposerField(hook);
  return { hook, sendMessage, sent, client };
}

export type Hook = ReturnType<typeof harness>["hook"];

const composerFields = new WeakMap<object, { textarea: HTMLElement; preventDefault: jest.Mock }>();

function mountComposerField(hook: { result: { current: ReturnType<typeof useMessageComposer> } }) {
  const preventDefault = jest.fn();
  function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
    hook.result.current.handleInputChange(event);
  }
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    jest.spyOn(event, "preventDefault").mockImplementation(preventDefault);
    hook.result.current.handleKeyDown(event);
  }
  const view = render(<textarea aria-label="Message" onChange={handleChange} onKeyDown={handleKeyDown} />);
  composerFields.set(hook, { textarea: within(view.container).getByRole("textbox"), preventDefault });
}

function composerField(hook: Hook) {
  const field = composerFields.get(hook);
  if (!field) throw new Error("composer field was not mounted by harness()");
  return field;
}

export function change(hook: Hook, value: string) {
  fireEvent.change(composerField(hook).textarea, { target: { value } });
}

export function press(hook: Hook, key: string, isComposing = false) {
  const field = composerField(hook);
  field.preventDefault.mockClear();
  fireEvent.keyDown(field.textarea, { key, shiftKey: false, keyCode: isComposing ? 229 : 13, isComposing });
  return field.preventDefault;
}

export async function openRecordPickerWithResults(hook: Hook, text = "see /acme") {
  change(hook, text);
  await waitFor(() => expect(hook.result.current.recordPicker?.groups.length).toBeGreaterThan(0));
}

export async function composerApiResponse(url: string) {
  if (url === "/search") return { results: SEARCH_RESULTS, total: SEARCH_RESULTS.length };
  if (url === "/chat/search/users") return ORG_USERS;
  return undefined;
}
