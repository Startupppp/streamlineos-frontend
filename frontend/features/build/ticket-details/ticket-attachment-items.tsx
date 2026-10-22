"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { viewFile, downloadFile } from "@/hooks/common/use-file-url";

export interface AttachmentItem {
  id: number;
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
}

interface NonImageAttachmentButtonProps {
  attachment: AttachmentItem;
}

export function NonImageAttachmentButton({ attachment }: NonImageAttachmentButtonProps) {
  const [pending, setPending] = useState(false);
  const [itemError, setItemError] = useState(false);

  function handleClick() {
    if (pending) return;
    setPending(true);
    setItemError(false);
    void viewFile(attachment.fileUrl)
      .then(() => { setPending(false); })
      .catch(() => { setPending(false); setItemError(true); });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="group relative aspect-video rounded-md overflow-hidden bg-muted border hover:border-foreground/40 transition-all text-left disabled:opacity-60"
    >
      <div className="flex items-center justify-center h-full text-muted-foreground text-micro p-1 text-center">
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : itemError ? (
          <span className="text-status-danger-ink">Couldn&apos;t open attachment</span>
        ) : (
          attachment.fileName
        )}
      </div>
    </button>
  );
}

interface AttachmentContextMenuProps {
  attachment: AttachmentItem;
  children: React.ReactNode;
}

export function AttachmentContextMenu({
  attachment,
  children,
}: AttachmentContextMenuProps) {
  function handleView() {
    void viewFile(attachment.fileUrl);
  }

  function handleDownload() {
    void downloadFile(attachment.fileUrl, attachment.fileName);
  }

  function handleCopyLink() {
    void navigator.clipboard.writeText(attachment.fileUrl);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onSelect={handleView}>View image</DropdownMenuItem>
        <DropdownMenuItem onSelect={handleDownload}>Download</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleCopyLink}>Copy link</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
