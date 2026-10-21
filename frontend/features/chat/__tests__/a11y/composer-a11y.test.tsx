import React, { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expectNoAxeViolations } from "@/test-utils/axe";
import { MessageInput } from "../../message-input";
import type { MessageInputProps } from "../../message-input-types";

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

jest.mock("next/dynamic", () => () => function DynamicStub() {
  return null;
});

jest.mock("@/components/layout/mobile/chat-mobile-chrome-layout", () => ({
  getChatMobileComposerInsetClassName: () => "",
}));

function makeProps(messageInput: string, over: Partial<MessageInputProps> = {}): MessageInputProps {
  return {
    channelId: 7,
    displayName: "general",
    channelType: "PUBLIC",
    messageInput,
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

describe("composer: axe", () => {
  it("has no violations empty", async () => {
    const { container } = render(<MessageInput {...makeProps("")} />);
    await expectNoAxeViolations(container);
  });

  it("has no violations with a draft", async () => {
    const { container } = render(<MessageInput {...makeProps("hello there")} />);
    await expectNoAxeViolations(container);
  });
});

describe("composer: screen reader", () => {
  it("names the textbox after the conversation", () => {
    render(<MessageInput {...makeProps("")} />);
    expect(screen.getByRole("textbox", { name: "Message general" })).toBeInTheDocument();
  });

  it("gives every button an accessible name", () => {
    render(<MessageInput {...makeProps("hi")} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveAccessibleName();
    }
  });

  it("exposes the typing indicator text", () => {
    render(<MessageInput {...makeProps("", { typingText: "Ada is typing" })} />);
    expect(screen.getByText("Ada is typing")).toBeInTheDocument();
  });
});

describe("composer: keyboard", () => {
  it("Enter on the focused Send button sends, and no control is removed from the tab order", async () => {
    const user = userEvent.setup();
    const onSend = jest.fn();
    render(<MessageInput {...makeProps("hi", { onSend })} />);
    const send = screen.getByRole("button", { name: "Send" });
    send.focus();
    await user.keyboard("{Enter}");
    expect(onSend).toHaveBeenCalledTimes(1);
    for (const button of screen.getAllByRole("button")) {
      expect(button).not.toHaveAttribute("tabindex", "-1");
    }
  });
});
