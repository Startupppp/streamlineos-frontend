import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../message-input";
import type { MessageInputProps } from "../message-input-types";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef(
      (
        { children, ...rest }: React.HTMLAttributes<HTMLDivElement>,
        ref: React.Ref<HTMLDivElement>,
      ) => (
        <div ref={ref} {...rest}>
          {children}
        </div>
      ),
    ),
  },
}));

jest.mock("next/dynamic", () => {
  return (_fn: unknown, _opts?: unknown) => {
    function DynamicStub() {
      return null;
    }
    return DynamicStub;
  };
});

jest.mock("@/components/layout/mobile/chat-mobile-chrome-layout", () => ({
  getChatMobileComposerInsetClassName: () => "",
}));

function makeProps(
  messageInput: string,
  setMessageInput: jest.Mock,
  inputRef: React.RefObject<HTMLTextAreaElement>,
): MessageInputProps {
  return {
    channelId: 7,
    displayName: "general",
    channelType: "PUBLIC",
    messageInput,
    setMessageInput,
    inputRef,
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
    mentionQuery: "",
    mentionIndex: 0,
    setMentionIndex: jest.fn(),
    filteredMentions: [],
    insertMention: jest.fn(),
    showTicketPicker: false,
    ticketQuery: "",
    ticketSelectedIndex: 0,
    onTicketSelect: jest.fn(),
    typingText: null,
    sendMessage: { isPending: false },
    onSend: jest.fn(),
    onKeyDown: jest.fn(),
    onInputChange: jest.fn(),
  };
}

describe("#170 — format buttons must preserve textarea selection and have correct type", () => {
  it("Bold button has type=button so it cannot accidentally submit a form", () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello", jest.fn(), inputRef)} />);
    expect(screen.getByRole("button", { name: "Bold" })).toHaveAttribute("type", "button");
  });

  it("Italic button has type=button", () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello", jest.fn(), inputRef)} />);
    expect(screen.getByRole("button", { name: "Italic" })).toHaveAttribute("type", "button");
  });

  it("Code button has type=button", () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello", jest.fn(), inputRef)} />);
    expect(screen.getByRole("button", { name: "Code" })).toHaveAttribute("type", "button");
  });

  it("Bold button prevents mousedown default so the textarea does not blur and lose its selection", () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello world", jest.fn(), inputRef)} />);
    const boldButton = screen.getByRole("button", { name: "Bold" });
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    boldButton.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Italic button prevents mousedown default", () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello world", jest.fn(), inputRef)} />);
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    screen.getByRole("button", { name: "Italic" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Code button prevents mousedown default", () => {
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello world", jest.fn(), inputRef)} />);
    const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    screen.getByRole("button", { name: "Code" }).dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("Bold button wraps the selected text in ** markers", async () => {
    const setMessageInput = jest.fn();
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello world", setMessageInput, inputRef)} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);

    await userEvent.click(screen.getByRole("button", { name: "Bold" }));

    expect(setMessageInput).toHaveBeenCalledWith("**hello** world");
  });

  it("Italic button wraps the selected text in * markers", async () => {
    const setMessageInput = jest.fn();
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello world", setMessageInput, inputRef)} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);

    await userEvent.click(screen.getByRole("button", { name: "Italic" }));

    expect(setMessageInput).toHaveBeenCalledWith("*hello* world");
  });

  it("Code button wraps the selected text in backtick markers", async () => {
    const setMessageInput = jest.fn();
    const inputRef = createRef<HTMLTextAreaElement>();
    render(<MessageInput {...makeProps("hello world", setMessageInput, inputRef)} />);

    const textarea = screen.getByRole("textbox") as HTMLTextAreaElement;
    textarea.focus();
    textarea.setSelectionRange(0, 5);

    await userEvent.click(screen.getByRole("button", { name: "Code" }));

    expect(setMessageInput).toHaveBeenCalledWith("`hello` world");
  });
});
