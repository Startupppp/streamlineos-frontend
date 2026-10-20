"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { ChatAttachment } from "./chat-attachment";
import { ChatInlineFallback } from "./chat-lazy-fallbacks";
import { TicketPill, CommentPill } from "./chat-entity-pills";
import type {
  Message,
  MessageMetadata,
  TicketEntityRef,
  CommentEntityRef,
} from "./chat-types";

const InternalLinkPreview = dynamic(
  () =>
    import("./internal-link-preview").then((m) => ({
      default: m.InternalLinkPreview,
    })),
  {
    ssr: false,
    loading: () => <ChatInlineFallback label="Loading link preview" />,
  },
);

const LINK_PATTERN = /https?:\/\//;

interface ChatBubbleAttachmentsProps {
  message: Message;
  metadata: MessageMetadata | null;
  isOwn: boolean;
}

export function ChatBubbleAttachments({
  message,
  metadata,
  isOwn,
}: ChatBubbleAttachmentsProps) {
  const { ticketEntities, commentEntities } = useMemo(() => {
    const entities = metadata?.entities ?? [];
    return {
      ticketEntities: entities.filter(
        (e): e is TicketEntityRef => e.type === "ticket",
      ),
      commentEntities: entities.filter(
        (e): e is CommentEntityRef => e.type === "comment",
      ),
    };
  }, [metadata]);

  return (
    <>
      {message.content && LINK_PATTERN.test(message.content) && (
        <InternalLinkPreview content={message.content} isOwn={isOwn} />
      )}

      {ticketEntities.length + commentEntities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {ticketEntities.map((entity) => (
            <TicketPill
              key={entity.id}
              entity={entity}
              channelId={message.channelId}
            />
          ))}
          {commentEntities.map((entity) => (
            <CommentPill key={entity.id} entity={entity} />
          ))}
        </div>
      )}

      {message.attachments.length > 0 && (
        <div className="mt-1.5 space-y-1.5">
          {message.attachments.map((att) => (
            <ChatAttachment
              key={att.id}
              channelId={message.channelId}
              attachmentId={att.id}
              fileName={att.fileName}
              mimeType={att.mimeType}
              fileSize={att.fileSize}
              isOwn={isOwn}
            />
          ))}
        </div>
      )}
    </>
  );
}
