"use client";

import type React from "react";
import { HuddlePanel } from "./huddle-panel";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";

type MessageListProps = React.ComponentProps<typeof MessageList>;
type MessageInputProps = React.ComponentProps<typeof MessageInput>;
type HuddlePanelProps = React.ComponentProps<typeof HuddlePanel>;

export function MessagePanelWorkspace({
  messageList,
  messageInput,
  huddle,
}: {
  messageList: MessageListProps;
  messageInput: MessageInputProps;
  huddle?: HuddlePanelProps;
}) {
  return (
    <>
      <MessageList {...messageList} />
      <MessageInput {...messageInput} />
      {huddle ? <HuddlePanel {...huddle} /> : null}
    </>
  );
}
