"use client";

import { useRef } from "react";
import { LoadingButton } from "@/components/ui/loading-button";
import { Switch } from "@/components/ui/switch";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { PaperclipIcon, LinkIcon } from "@animateicons/react/lucide";
import { MAX_FILES, formatBytes } from "./ticket-attachment-preview";

interface TicketDialogFooterProps {
  files: File[];
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onShowLinksEditor: () => void;
  createMore: boolean;
  onCreateMoreChange: (checked: boolean) => void;
  isPending: boolean;
  isUploading: boolean;
  canSubmit: boolean;
}

export function TicketDialogFooter({
  files,
  onFileChange,
  onShowLinksEditor,
  createMore,
  onCreateMoreChange,
  isPending,
  isUploading,
  canSubmit,
}: TicketDialogFooterProps) {
  const { iconRef: attachIconRef, hoverHandlers: attachHoverHandlers } = useAnimatedIcon();
  const { iconRef: linksIconRef, hoverHandlers: linksHoverHandlers } = useAnimatedIcon();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);

  function handleAttachClick() {
    fileInputRef.current?.click();
  }

  return (
    <div className="relative z-10 grid shrink-0 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-t border-border bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] [grid-template-areas:'tools_more'_'submit_submit'] md:flex md:justify-between md:gap-3 md:pb-3">
      <div className="flex min-w-0 items-center gap-2 [grid-area:tools]">
        <button
          type="button"
          onClick={handleAttachClick}
          disabled={files.length >= MAX_FILES}
          aria-label="Attach file"
          className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          {...attachHoverHandlers}
        >
          <PaperclipIcon ref={attachIconRef} size={14} />
          {files.length >= MAX_FILES ? "Limit reached" : "Attach"}
        </button>
        <button
          type="button"
          onClick={onShowLinksEditor}
          aria-label="Add related links"
          className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-border hover:bg-muted/60 hover:text-foreground"
          {...linksHoverHandlers}
        >
          <LinkIcon ref={linksIconRef} size={14} />
          Links
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
          multiple
          onChange={onFileChange}
        />
        <span className="sr-only text-micro text-muted-foreground md:not-sr-only md:inline md:truncate">
          Up to {MAX_FILES} files, 25MB each, 100MB total
          {files.length > 0 &&
            ` · ${files.length}/${MAX_FILES} · ${formatBytes(totalSize)}`}
        </span>
      </div>

      <div className="contents md:flex md:items-center md:gap-3">
        <label className="flex cursor-pointer select-none items-center gap-2 justify-self-end rounded-md border border-input bg-muted px-2 py-1 [grid-area:more]">
          <Switch
            checked={createMore}
            onCheckedChange={onCreateMoreChange}
            aria-label="Create more"
            className="border border-border data-[state=unchecked]:bg-input"
          />
          <span className="text-xs text-muted-foreground">
            Create more
          </span>
        </label>

        <LoadingButton
          type="submit"
          isPending={isPending || isUploading}
          loadingText="Creating…"
          className="w-full px-4 text-xs [grid-area:submit] md:w-auto"
          size="sm"
          disabled={!canSubmit}
        >
          Create issue
        </LoadingButton>
      </div>
    </div>
  );
}
