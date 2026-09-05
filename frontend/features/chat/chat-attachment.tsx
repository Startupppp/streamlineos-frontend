"use client";

import Image from "next/image";
import { ArrowDown, FileText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { useAttachmentUrl } from "@/hooks/api/chat-shared";
import { getFileColor, getFileExt, isImageMime } from "./chat-helpers";
import { formatFileSize } from "@/lib/format-utils";

export interface ChatAttachmentProps {
  channelId: number;
  attachmentId: number;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isOwn?: boolean;
}

export function ChatAttachment({
  channelId,
  attachmentId,
  fileName,
  mimeType,
  fileSize,
  isOwn = false,
}: ChatAttachmentProps) {
  if (isImageMime(mimeType))
    return (
      <AttachmentImage channelId={channelId} attachmentId={attachmentId} fileName={fileName} />
    );
  return (
    <AttachmentFile
      channelId={channelId}
      attachmentId={attachmentId}
      fileName={fileName}
      fileSize={fileSize}
      isOwn={isOwn}
    />
  );
}

function AttachmentImage({
  channelId,
  attachmentId,
  fileName,
}: {
  channelId: number;
  attachmentId: number;
  fileName: string;
}) {
  const { data, isLoading } = useAttachmentUrl(channelId, attachmentId);

  if (isLoading || !data)
    return <Skeleton className="w-[280px] h-[200px] rounded-lg" />;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg overflow-hidden"
    >
      <Image
        src={data.url}
        alt={fileName}
        width={280}
        height={200}
        unoptimized
        className="max-w-[280px] max-h-[200px] object-cover rounded-lg"
      />
    </a>
  );
}

function AttachmentFile({
  channelId,
  attachmentId,
  fileName,
  fileSize,
  isOwn,
}: {
  channelId: number;
  attachmentId: number;
  fileName: string;
  fileSize: number;
  isOwn: boolean;
}) {
  const { data: prefetched } = useAttachmentUrl(channelId, attachmentId);
  const colors = getFileColor(fileName);

  async function handleClick(e: React.MouseEvent) {
    e.preventDefault();
    let url = prefetched?.url;
    if (!url) {
      try {
        const res = await apiClient.get<{ url: string }>(
          `/chat/channels/${channelId}/attachments/${attachmentId}`,
        );
        url = res.url;
      } catch {
        return;
      }
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <a
      href="#"
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors min-w-0 max-w-full",
        isOwn
          ? "bg-primary-foreground/10 border-primary-foreground/15 hover:bg-primary-foreground/15"
          : "bg-background border-border/50 hover:bg-muted/30 shadow-sm",
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-lg flex flex-col items-center justify-center shrink-0",
          isOwn ? "bg-primary-foreground/15" : colors.bg,
        )}
      >
        <FileText className={cn("h-4 w-4", isOwn ? "text-primary-foreground/80" : colors.text)} />
        <span
          className={cn(
            "text-micro font-bold px-1 rounded mt-0.5",
            isOwn
              ? "bg-primary-foreground/25 text-primary-foreground"
              : cn("text-white", colors.badge),
          )}
        >
          {getFileExt(fileName)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <TruncatedText text={fileName} className="text-xs font-semibold" />
        <p
          className={cn(
            "text-micro mt-0.5",
            isOwn ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          {formatFileSize(fileSize)} · {getFileExt(fileName)}
        </p>
      </div>
      <ArrowDown
        className={cn(
          "h-4 w-4 shrink-0",
          isOwn ? "text-primary-foreground/50" : "text-muted-foreground/50",
        )}
      />
    </a>
  );
}
