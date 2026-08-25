"use client";

import { useCallback } from "react";
import { Eye, FileText, RefreshCw, X } from "lucide-react";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

type FileRowActionProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

function FileRowAction({ icon: Icon, label, onClick, destructive }: FileRowActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-0.5 rounded-md px-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground",
        destructive && "hover:text-destructive",
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export type DocumentFileRowProps = {
  fileName: string;
  viewHref: string | null;
  onView?: () => void;
  pending?: boolean;
  onReplace?: () => void;
  onRemove?: () => void;
};

export function DocumentFileRow({
  fileName,
  viewHref,
  onView,
  pending = false,
  onReplace,
  onRemove,
}: DocumentFileRowProps) {
  const handleView = useCallback(() => {
    if (onView) {
      onView();
      return;
    }
    if (viewHref) window.open(viewHref, "_blank", "noopener,noreferrer");
  }, [onView, viewHref]);

  const canView = Boolean(onView || viewHref);

  return (
    <div className="mt-1 flex min-w-0 items-center gap-1.5 rounded-md border border-border/60 bg-muted/30 px-2 py-1">
      <FileText className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden />
      <TruncatedText
        text={fileName}
        className="min-w-0 flex-1 text-xs text-foreground"
        tooltip={fileName}
      />
      {pending ? (
        <span className="shrink-0 rounded border border-border bg-muted px-1.5 py-px text-micro font-semibold uppercase tracking-wide text-muted-foreground">
          Pending
        </span>
      ) : null}
      <div className="flex shrink-0 items-center divide-x divide-border/60">
        {canView ? (
          <FileRowAction icon={Eye} label="View" onClick={handleView} />
        ) : null}
        {onReplace ? (
          <FileRowAction icon={RefreshCw} label="Replace" onClick={onReplace} />
        ) : null}
        {onRemove ? (
          <FileRowAction icon={X} label="Remove" onClick={onRemove} destructive />
        ) : null}
      </div>
    </div>
  );
}
