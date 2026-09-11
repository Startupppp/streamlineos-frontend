"use client";

import type React from "react";
import dynamic from "next/dynamic";
import type { HuddlePanel as HuddlePanelType } from "./huddle-panel";
import { MessageInput } from "./message-input";
import { MessageList } from "./message-list";
import { ChatPanelFallback } from "./chat-lazy-fallbacks";

const HuddlePanel = dynamic(
  () => import("./huddle-panel").then((m) => ({ default: m.HuddlePanel })),
  { ssr: false, loading: () => <ChatPanelFallback label="Loading huddle" /> },
);

type MessageListProps = React.ComponentProps<typeof MessageList>;
type MessageInputProps = React.ComponentProps<typeof MessageInput>;
type HuddlePanelProps = React.ComponentProps<typeof HuddlePanelType>;

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
