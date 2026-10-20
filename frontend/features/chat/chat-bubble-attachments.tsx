"use client";

import dynamic from "next/dynamic";
import { ChatAttachment } from "./chat-attachment";
import { ChatInlineFallback } from "./chat-lazy-fallbacks";
import { LinkedRecordPill } from "./chat-entity-pills";
import type { Message, MessageMetadata } from "./chat-types";

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
  const entities = metadata?.entities ?? [];

  return (
    <>
      {message.content && LINK_PATTERN.test(message.content) && (
        <InternalLinkPreview content={message.content} isOwn={isOwn} />
      )}

      {entities.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {entities.map((entity) => (
            <LinkedRecordPill
              key={`${entity.type}:${entity.id}`}
              entity={entity}
              channelId={message.channelId}
            />
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
