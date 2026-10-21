"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import type { Message, TicketEntityRef } from "@/types/chat";
import { useCan } from "@/hooks/api/access";
import { useEntityAction } from "./entity-actions-context";
import { messageDeleteTitle } from "./message-delete-title";
import { ChatOverlayFallback } from "./chat-lazy-fallbacks";

const MessageActions = dynamic(
  () =>
    import("./chat-message-actions").then((m) => ({
      default: m.MessageActions,
    })),
  { ssr: false, loading: () => null },
);

const ConvertToTaskDialog = dynamic(
  () =>
    import("./convert-to-task-dialog").then((m) => ({
      default: m.ConvertToTaskDialog,
    })),
  {
    ssr: false,
    loading: () => <ChatOverlayFallback label="Loading convert to task" />,
  },
);

const EntityActionDialog = dynamic(
  () =>
    import("./entity-action-dialog").then((m) => ({
      default: m.EntityActionDialog,
    })),
  {
    ssr: false,
    loading: () => <ChatOverlayFallback label="Loading ticket action" />,
  },
);

interface ChatBubbleActionsProps {
  message: Message;
  senderName: string;
  isOwn: boolean;
  isPinned?: boolean;
  isSaved?: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onReply: () => void;
  onOpenThread: () => void;
  onDelete: () => void;
  onReact: (emoji: string) => void;
  onPin: () => void;
  onUnpin: () => void;
  onSave?: () => void;
  onUnsaveMsg?: () => void;
  onForward?: () => void;
}

export function ChatBubbleActions({
  message,
  senderName,
  isOwn,
  isPinned,
  isSaved,
  isEditing,
  onStartEdit,
  onReply,
  onOpenThread,
  onDelete,
  onReact,
  onPin,
  onUnpin,
  onSave,
  onUnsaveMsg,
  onForward,
}: ChatBubbleActionsProps) {
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [dueDateDialogOpen, setDueDateDialogOpen] = useState(false);
  const ticketEntity = (message.metadata?.entities ?? []).find(
    (e): e is TicketEntityRef => e.type === "ticket",
  );
  const ticketReference = {
    type: "ticket",
    id: ticketEntity ? String(ticketEntity.id) : "",
  };
  const canConvertToTask = useCan("build:tickets:create");
  const canWriteMessages = useCan("chat:messages:write");
  const canChangeMessage = isOwn && canWriteMessages;
  const canPin = useCan("chat:messages:pin");
  const assignAction = useEntityAction(ticketReference, "assign");
  const dueDateAction = useEntityAction(ticketReference, "due-date");

  const handleOpenConvertDialog = useCallback(
    () => setConvertDialogOpen(true),
    [],
  );
  const handleOpenAssignDialog = useCallback(
    () => setAssignDialogOpen(true),
    [],
  );
  const handleOpenDueDateDialog = useCallback(
    () => setDueDateDialogOpen(true),
    [],
  );
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(message.content ?? "");
    toast.success("Copied");
  }, [message.content]);
  const handleCopyLink = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("message", String(message.id));
    navigator.clipboard.writeText(url.toString());
    toast.success("Link copied");
  }, [message.id]);

  return (
    <>
      {canConvertToTask && convertDialogOpen && (
        <ConvertToTaskDialog
          open
          onOpenChange={setConvertDialogOpen}
          channelId={message.channelId}
          messageId={message.id}
          defaultTitle={(message.content ?? "").slice(0, 80)}
        />
      )}
      {assignAction && assignDialogOpen && (
        <EntityActionDialog
          open
          onOpenChange={setAssignDialogOpen}
          channelId={message.channelId}
          reference={ticketReference}
          action={assignAction}
        />
      )}
      {dueDateAction && dueDateDialogOpen && (
        <EntityActionDialog
          open
          onOpenChange={setDueDateDialogOpen}
          channelId={message.channelId}
          reference={ticketReference}
          action={dueDateAction}
        />
      )}
      {!isEditing && (
        <MessageActions
          isOwn={isOwn}
          isPinned={isPinned}
          isSaved={isSaved}
          hasContent={Boolean(message.content)}
          canEdit={canChangeMessage}
          canDelete={canChangeMessage}
          canWrite={canWriteMessages}
          canPin={canPin}
          onOpenThread={onOpenThread}
          onQuoteReply={onReply}
          onSave={onSave}
          onUnsave={onUnsaveMsg}
          onPin={onPin}
          onUnpin={onUnpin}
          onReact={onReact}
          onCopy={handleCopy}
          onCopyLink={handleCopyLink}
          onForward={onForward}
          canConvertToTask={canConvertToTask}
          onConvertToTask={handleOpenConvertDialog}
          canAssignTicket={Boolean(assignAction)}
          onAssignTicket={handleOpenAssignDialog}
          canSetDueDate={Boolean(dueDateAction)}
          onSetDueDate={handleOpenDueDateDialog}
          onStartEdit={onStartEdit}
          onDelete={onDelete}
          deleteTitle={messageDeleteTitle(senderName, message.content)}
        />
      )}
    </>
  );
}
