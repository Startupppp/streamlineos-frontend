"use client";

import { memo, useCallback } from "react";
import type { Message } from "@/types/chat";
import { ChatBubble } from "./chat-bubble";

interface MessageItemProps {
  msg: Message;
  isOwn: boolean;
  showHeader: boolean;
  currentUserId: string;
  editingMessageId: number | undefined;
  editInput: string;
  pinnedMessageIds: Set<number>;
  savedMessageIds: Set<number>;
  replyCountMap: Map<number, number>;
  onEditInputChange: (value: string) => void;
  onStartEdit: (msg: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: (messageId: number) => void;
  onReply: (msg: Message) => void;
  onOpenThread: (messageId: number) => void;
  onDelete: (messageId: number) => void;
  onReact: (messageId: number, emoji: string) => void;
  onPin: (messageId: number) => void;
  onUnpin: (messageId: number) => void;
  onSave: (messageId: number) => void;
  onUnsaveMsg: (messageId: number) => void;
  onForward: (msg: Message) => void;
  resolveUserName?: (
    userId: string | null,
    embedded?: { name?: string | null; email?: string | null } | null,
  ) => string;
  resolveReactionNames?: (userIds: string[]) => string;
}

export const MessageItem = memo(function MessageItem({
  msg,
  isOwn,
  showHeader,
  currentUserId,
  editingMessageId,
  editInput,
  pinnedMessageIds,
  savedMessageIds,
  replyCountMap,
  onEditInputChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onReply,
  onOpenThread,
  onDelete,
  onReact,
  onPin,
  onUnpin,
  onSave,
  onUnsaveMsg,
  onForward,
  resolveUserName,
  resolveReactionNames,
}: MessageItemProps) {
  const handleStartEdit = useCallback(
    () => onStartEdit(msg),
    [msg, onStartEdit],
  );
  const handleSaveEdit = useCallback(
    () => onSaveEdit(msg.id),
    [msg.id, onSaveEdit],
  );
  const handleReply = useCallback(() => onReply(msg), [msg, onReply]);
  const handleOpenThread = useCallback(
    () => onOpenThread(msg.id),
    [msg.id, onOpenThread],
  );
  const handleDelete = useCallback(() => onDelete(msg.id), [msg.id, onDelete]);
  const handleReact = useCallback(
    (emoji: string) => onReact(msg.id, emoji),
    [msg.id, onReact],
  );
  const handlePin = useCallback(() => onPin(msg.id), [msg.id, onPin]);
  const handleUnpin = useCallback(() => onUnpin(msg.id), [msg.id, onUnpin]);
  const handleSave = useCallback(() => onSave(msg.id), [msg.id, onSave]);
  const handleUnsaveMsg = useCallback(
    () => onUnsaveMsg(msg.id),
    [msg.id, onUnsaveMsg],
  );
  const handleForward = useCallback(() => onForward(msg), [msg, onForward]);
  return (
    <ChatBubble
      message={msg}
      isOwn={isOwn}
      showSender={showHeader}
      currentUserId={currentUserId}
      isEditing={editingMessageId === msg.id}
      editInput={editingMessageId === msg.id ? editInput : ""}
      isPinned={pinnedMessageIds.has(msg.id)}
      isSaved={savedMessageIds.has(msg.id)}
      replyCount={replyCountMap.get(msg.id)}
      onEditInputChange={onEditInputChange}
      onStartEdit={handleStartEdit}
      onCancelEdit={onCancelEdit}
      onSaveEdit={handleSaveEdit}
      onReply={handleReply}
      onOpenThread={handleOpenThread}
      onDelete={handleDelete}
      onReact={handleReact}
      onPin={handlePin}
      onUnpin={handleUnpin}
      onSave={handleSave}
      onUnsaveMsg={handleUnsaveMsg}
      onForward={handleForward}
      resolveUserName={resolveUserName}
      resolveReactionNames={resolveReactionNames}
    />
  );
});
