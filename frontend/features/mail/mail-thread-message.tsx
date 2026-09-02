"use client";

import { useCallback, forwardRef } from "react";
import { format, parseISO, isToday, isThisYear } from "date-fns";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Skeleton } from "@/components/ui/skeleton";
import { DownloadIcon } from "@animateicons/react/lucide";
import { Paperclip, ChevronDown, ChevronRight } from "lucide-react";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { apiClient } from "@/lib/api-client";
import { MailHtmlViewer } from "./mail-html-viewer";
import type { MailMessageDetail } from "@/types/mail";

function formatDetailDate(dateStr: string): string {
  const date = parseISO(dateStr);
  if (isToday(date)) return format(date, "h:mm a");
  if (isThisYear(date)) return format(date, "MMM d, h:mm a");
  return format(date, "MMM d, yyyy, h:mm a");
}

function formatBytes(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentChipProps {
  attachmentId: string;
  messageId: string;
  accountId: number;
  fileName: string;
  sizeBytes: number | null;
}

const AttachmentChip = forwardRef<HTMLButtonElement, AttachmentChipProps>(
  function AttachmentChip(
    { attachmentId, messageId, accountId, fileName, sizeBytes },
    _,
  ) {
    const { iconRef, hoverHandlers } = useAnimatedIcon();

    const handleDownload = useCallback(async () => {
      try {
        const data = await apiClient.get<{
          downloadUrl: string;
          fileName: string;
        }>(
          `/mail/messages/${messageId}/attachments/${attachmentId}?accountId=${accountId}&fileName=${encodeURIComponent(fileName)}`,
        );
        window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    }, [attachmentId, messageId, accountId, fileName]);

    const handleClick = useCallback(() => {
      void handleDownload();
    }, [handleDownload]);

    return (
      <button
        type="button"
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 border border-border/40 text-dense text-foreground/80 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-w-[200px]"
        onClick={handleClick}
        {...hoverHandlers}
        aria-label={`Download ${fileName}`}
      >
        <Paperclip
          className="h-3 w-3 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span className="truncate min-w-0">{fileName}</span>
        {sizeBytes != null && (
          <span className="text-muted-foreground shrink-0">
            {formatBytes(sizeBytes)}
          </span>
        )}
        <DownloadIcon
          ref={iconRef}
          size={11}
          className="shrink-0 text-muted-foreground"
        />
      </button>
    );
  },
);

interface MailThreadMessageProps {
  message: MailMessageDetail;
  isExpanded: boolean;
  isLatest: boolean;
  isHydrating?: boolean;
  onToggle: (id: string) => void;
}

function MailBodySkeleton() {
  return (
    <div
      className="mt-1 flex flex-col gap-2 rounded-lg border border-border/50 px-4 py-3"
      aria-hidden
      data-testid="mail-body-skeleton"
    >
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-5/6 rounded" />
      <Skeleton className="h-4 w-4/5 rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  );
}

export function MailThreadMessage({
  message,
  isExpanded,
  isLatest,
  isHydrating,
  onToggle,
}: MailThreadMessageProps) {
  const senderLabel = message.from.name ?? message.from.email;
  const recipientsLabel = [
    ...message.to.map((a) => a.name ?? a.email),
    ...(message.cc ?? []).map((a) => a.name ?? a.email),
  ].join(", ");

  const handleToggle = useCallback(
    () => onToggle(message.id),
    [message.id, onToggle],
  );

  if (!isExpanded) {
    return (
      <button
        type="button"
        className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring"
        onClick={handleToggle}
        aria-label={`Expand message from ${senderLabel}`}
      >
        <ChevronRight
          className="h-3.5 w-3.5 text-muted-foreground shrink-0"
          aria-hidden
        />
        <span className="text-xs font-medium text-foreground/80 shrink-0">
          {senderLabel}
        </span>
        <TruncatedText
          text={message.snippet}
          className="text-dense text-muted-foreground flex-1 min-w-0"
        />
        <span className="text-dense text-muted-foreground shrink-0 font-mono tabular-nums">
          {formatDetailDate(message.date)}
        </span>
      </button>
    );
  }

  return (
    <div className="border-b border-border/20 last:border-0">
      <button
        type="button"
        className={cn(
          "w-full flex items-start gap-2 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring",
          !isLatest && "hover:bg-muted/20 cursor-pointer",
          isLatest && "cursor-default",
        )}
        onClick={isLatest ? undefined : handleToggle}
        aria-label={
          isLatest ? undefined : `Collapse message from ${senderLabel}`
        }
      >
        <ChevronDown
          className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5"
          aria-hidden
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2 min-w-0">
            <span className="text-label font-semibold text-foreground truncate">
              {senderLabel}
            </span>
            <span className="text-dense text-muted-foreground shrink-0 font-mono tabular-nums">
              {formatDetailDate(message.date)}
            </span>
          </div>
          {recipientsLabel && (
            <TruncatedText
              text={`To: ${recipientsLabel}`}
              className="text-dense text-muted-foreground mt-0.5"
            />
          )}
        </div>
      </button>

      <div className="px-4 pb-4">
        {message.bodyHtml ? (
          <MailHtmlViewer html={message.bodyHtml} className="mt-1" />
        ) : message.bodyText ? (
          <div
            className="mt-1 overflow-x-auto rounded-lg border border-border/50 bg-white text-foreground shadow-sm"
            style={{ colorScheme: "light" }}
          >
            <pre className="whitespace-pre-wrap break-words px-4 py-3 font-sans text-label leading-relaxed text-foreground">
              {message.bodyText}
            </pre>
          </div>
        ) : isHydrating ? (
          <MailBodySkeleton />
        ) : (
          <p className="text-xs text-muted-foreground italic">No content</p>
        )}

        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-border/20">
            {message.attachments.map((att) => (
              <AttachmentChip
                key={att.id}
                attachmentId={att.id}
                messageId={message.id}
                accountId={message.accountId}
                fileName={att.fileName}
                sizeBytes={att.sizeBytes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
