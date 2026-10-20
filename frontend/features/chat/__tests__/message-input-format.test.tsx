import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MessageInput } from "../message-input";
import type { MessageInputProps } from "../message-input-types";

jest.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: React.forwardRef(
      function MotionDiv(
        { children, ...rest }: React.HTMLAttributes<HTMLDivElement>,
        ref: React.Ref<HTMLDivElement>,
      ) {
        return (
          <div ref={ref} {...rest}>
            {children}
          </div>
        );
      },
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
  inputRef: React.RefObject<HTMLTextAreaElement | null>,
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
    sendMessage: { isPending: false },
    onSend: jest.fn(),
    onKeyDown: jest.fn(),
    onInputChange: jest.fn(),
  };
}

async function selectAndPress(
  setMessageInput: jest.Mock,
  value: string,
  from: number,
  to: number,
  keys: string,
) {
  const inputRef = createRef<HTMLTextAreaElement>();
  render(<MessageInput {...makeProps(value, setMessageInput, inputRef)} />);
  const textarea = screen.getByRole("textbox", { name: "Message general" });
  if (!(textarea instanceof HTMLTextAreaElement)) throw new Error("composer is not a textarea");
  textarea.focus();
  textarea.setSelectionRange(from, to);
  await userEvent.keyboard(keys);
}

describe("MessageInput — composer is labelled and carries no formatting strip", () => {
  it("names the composer textarea for assistive technology", () => {
    render(<MessageInput {...makeProps("", jest.fn(), createRef<HTMLTextAreaElement>())} />);
    expect(screen.getByRole("textbox", { name: "Message general" })).toBeInTheDocument();
  });

  it("names a direct-message composer after the person", () => {
    const props = makeProps("", jest.fn(), createRef<HTMLTextAreaElement>());
    render(<MessageInput {...props} channelType="DIRECT" displayName="Ada" />);
    expect(screen.getByRole("textbox", { name: "Message Ada" })).toBeInTheDocument();
  });

  it("labels every icon button in the composer", () => {
    render(<MessageInput {...makeProps("hi", jest.fn(), createRef<HTMLTextAreaElement>())} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
      expect(button).toHaveAttribute("type", "button");
    }
    expect(screen.getByRole("button", { name: "Attach file" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add emoji" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mention someone" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("exposes no Bold, Italic or Code buttons", () => {
    render(<MessageInput {...makeProps("hello", jest.fn(), createRef<HTMLTextAreaElement>())} />);
    expect(screen.queryByRole("button", { name: "Bold" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Italic" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Code" })).toBeNull();
  });
});

describe("MessageInput — markdown still works from the keyboard", () => {
  it("Ctrl+B wraps the selected text in ** markers", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "hello world", 0, 5, "{Control>}b{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("**hello** world");
  });

  it("Ctrl+I wraps the selected text in * markers", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "hello world", 0, 5, "{Control>}i{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("*hello* world");
  });

  it("Ctrl+E wraps the selected text in backtick markers", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "hello world", 0, 5, "{Control>}e{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("`hello` world");
  });

  it("Cmd+B works the same on a Mac", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "hello world", 0, 5, "{Meta>}b{/Meta}");
    expect(setMessageInput).toHaveBeenCalledWith("**hello** world");
  });

  it("hands every other key to the composer's own handler", async () => {
    const props = makeProps("hello", jest.fn(), createRef<HTMLTextAreaElement>());
    render(<MessageInput {...props} />);
    screen.getByRole("textbox", { name: "Message general" }).focus();
    await userEvent.keyboard("{Enter}");
    expect(props.onKeyDown).toHaveBeenCalled();
  });

  it("typed markdown is sent as typed, so a message formatted by hand still renders", async () => {
    const props = makeProps("**done**", jest.fn(), createRef<HTMLTextAreaElement>());
    render(<MessageInput {...props} />);
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(props.onSend).toHaveBeenCalledTimes(1);
  });
});

describe("MessageInput — CHAT-S04 format shortcuts toggle", () => {
  it("removes the ** markers when the selection is already bold", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "**hello** world", 2, 7, "{Control>}b{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("hello world");
  });

  it("removes the backticks when the selection is already a code span", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "`hello` world", 1, 6, "{Control>}e{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("hello world");
  });

  it("still nests a different marker rather than toggling the one already there", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "**hello** world", 2, 7, "{Control>}i{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("***hello*** world");
  });
});

describe("MessageInput — CHAT-S04 bold-italic combined form", () => {
  it("Italic takes back one marker from ***text***", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "***hello*** world", 3, 8, "{Control>}i{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("**hello** world");
  });

  it("Bold takes back two markers from ***text***", async () => {
    const setMessageInput = jest.fn();
    await selectAndPress(setMessageInput, "***hello*** world", 3, 8, "{Control>}b{/Control}");
    expect(setMessageInput).toHaveBeenCalledWith("*hello* world");
  });
});
