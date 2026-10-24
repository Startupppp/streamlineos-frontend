import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../message-input";
import type { MessageInputProps } from "../message-input-types";
import { groupRecordResults, type RecordSearchResult } from "../linked-record-meta";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef(function MotionDiv(
      { children, ...rest }: React.HTMLAttributes<HTMLDivElement>,
      ref: React.Ref<HTMLDivElement>,
    ) {
      return (
        <div ref={ref} {...rest}>
          {children}
        </div>
      );
    }),
  },
}));

jest.mock("@/components/layout/mobile/chat-mobile-chrome-layout", () => ({
  getChatMobileComposerInsetClassName: () => "",
}));

const addMember = jest.fn();
jest.mock("@/hooks/api/chat-channel-mutations", () => ({
  useAddChannelMember: () => ({ mutate: addMember, isPending: false }),
}));

let canWrite = true;
jest.mock("@/hooks/api/access", () => ({
  useCan: () => canWrite,
}));

const DEAL: RecordSearchResult = { id: 5, type: "deal", title: "Acme renewal", subtitle: "Asha", href: "/crm/deals/5" };
const TICKET: RecordSearchResult = { id: 41, type: "ticket", title: "Fix login", subtitle: "AP-41", href: "/build/1/issues?ticket=41" };

function props(over: Partial<MessageInputProps> = {}): MessageInputProps {
  return {
    channelId: 7,
    displayName: "launch",
    channelType: "PRIVATE",
    messageInput: "",
    setMessageInput: jest.fn(),
    inputRef: createRef<HTMLTextAreaElement>(),
    fileInputRef: createRef<HTMLInputElement>(),
    replyTo: null,
    setReplyTo: jest.fn(),
    pendingAttachments: [],
    setPendingAttachments: jest.fn(),
    uploading: false,
    onFileSelect: jest.fn(),
    showEmojiPicker: false,
    setShowEmojiPicker: jest.fn(),
    emojiRef: createRef<HTMLDivElement>(),
    insertEmoji: jest.fn(),
    showMentions: false,
    setShowMentions: jest.fn(),
    mentionIndex: 0,
    filteredMentions: [],
    insertMention: jest.fn(),
    mentionPrompt: null,
    onDismissMentionPrompt: jest.fn(),
    recordPicker: null,
    onSelectRecord: jest.fn(),
    linkedRecords: [],
    onRemoveLinkedRecord: jest.fn(),
    typingText: null,
    onSend: jest.fn(),
    onKeyDown: jest.fn(),
    onInputChange: jest.fn(),
    ...over,
  };
}

function picker(over: Partial<NonNullable<MessageInputProps["recordPicker"]>> = {}): MessageInputProps["recordPicker"] {
  return {
    query: "acme",
    groups: groupRecordResults([TICKET, DEAL]),
    activeIndex: 0,
    isSearching: false,
    isError: false,
    retry: jest.fn(),
    ...over,
  };
}

afterEach(() => {
  jest.clearAllMocks();
  canWrite = true;
});

describe("/ record picker", () => {
  it("lists results grouped under their module, with the active option announced to the composer", () => {
    render(<MessageInput {...props({ recordPicker: picker({ activeIndex: 1 }) })} />);
    const listbox = screen.getByRole("listbox", { name: "Link a record" });
    expect(listbox).toHaveTextContent(/CRM.*Acme renewal.*Build.*Fix login/);
    const options = screen.getAllByRole("option");
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("textbox", { name: "Message launch" })).toHaveAttribute(
      "aria-activedescendant",
      options[1].id,
    );
    expect(screen.getByRole("textbox", { name: "Message launch" })).toHaveAttribute("aria-controls", listbox.id);
  });

  it("inserts the clicked record", async () => {
    const onSelectRecord = jest.fn();
    render(<MessageInput {...props({ recordPicker: picker(), onSelectRecord })} />);
    await userEvent.click(screen.getByRole("option", { name: /Fix login/ }));
    expect(onSelectRecord).toHaveBeenCalledWith(TICKET);
  });

  it("asks for two characters before searching", () => {
    render(<MessageInput {...props({ recordPicker: picker({ query: "a", groups: [] }) })} />);
    expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument();
  });

  it("explains an empty result without claiming the record does not exist", () => {
    render(<MessageInput {...props({ recordPicker: picker({ groups: [] }) })} />);
    expect(screen.getByText(/No records match/)).toBeInTheDocument();
    expect(screen.getByText(/Only records you can open are shown/)).toBeInTheDocument();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Message launch" })).not.toHaveAttribute("aria-controls");
  });

  it("offers a retry when the search fails", async () => {
    const retry = jest.fn();
    render(<MessageInput {...props({ recordPicker: picker({ groups: [], isError: true, retry }) })} />);
    expect(screen.getByText(/Can't search records right now/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });
});

describe("linked records in the draft", () => {
  it("shows each picked record and removes one on request", async () => {
    const onRemoveLinkedRecord = jest.fn();
    render(
      <MessageInput
        {...props({
          linkedRecords: [{ key: "deal:5", type: "deal", id: "5", title: "Acme renewal", subtitle: "Asha", href: "/crm/deals/5" }],
          onRemoveLinkedRecord,
        })}
      />,
    );
    expect(screen.getByText("Acme renewal")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remove link to Acme renewal" }));
    expect(onRemoveLinkedRecord).toHaveBeenCalledWith("deal:5");
  });
});

describe("mentioning someone outside a private conversation", () => {
  const prompt = { userId: "u_arjun", name: "Arjun Mehta" };

  it("offers to add them, and adding calls the add-member mutation for this conversation", async () => {
    render(<MessageInput {...props({ mentionPrompt: prompt })} />);
    expect(screen.getByText("Arjun Mehta isn't in this conversation")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Add them" }));
    expect(addMember).toHaveBeenCalledWith({ channelId: 7, userId: "u_arjun" }, expect.anything());
  });

  it("lets the sender mention anyway, which only dismisses the prompt", async () => {
    const onDismissMentionPrompt = jest.fn();
    render(<MessageInput {...props({ mentionPrompt: prompt, onDismissMentionPrompt })} />);
    await userEvent.click(screen.getByRole("button", { name: "Mention anyway" }));
    expect(onDismissMentionPrompt).toHaveBeenCalled();
    expect(addMember).not.toHaveBeenCalled();
  });

  it("hides Add for someone who cannot change membership", () => {
    canWrite = false;
    render(<MessageInput {...props({ mentionPrompt: prompt })} />);
    expect(screen.queryByRole("button", { name: "Add them" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mention anyway" })).toBeInTheDocument();
  });

  it("marks org-wide suggestions that are not in the conversation", () => {
    render(
      <MessageInput
        {...props({
          showMentions: true,
          filteredMentions: [
            { id: "u_aditi", name: "Aditi Shah", image: null, isMember: true },
            { id: "u_arjun", name: "Arjun Mehta", image: null, isMember: false },
          ],
        })}
      />,
    );
    expect(screen.getByRole("option", { name: /Arjun Mehta/ })).toHaveTextContent("Not in conversation");
    expect(screen.getByRole("option", { name: /Aditi Shah/ })).not.toHaveTextContent("Not in conversation");
  });

  it("does not warn about membership in a public conversation, where mentions notify anyone in the org", () => {
    render(
      <MessageInput
        {...props({
          channelType: "PUBLIC",
          showMentions: true,
          filteredMentions: [{ id: "u_arjun", name: "Arjun Mehta", image: null, isMember: false }],
        })}
      />,
    );
    expect(screen.getByRole("option", { name: /Arjun Mehta/ })).not.toHaveTextContent("Not in conversation");
  });
});
