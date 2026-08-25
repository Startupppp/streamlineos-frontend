"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Edit2, Check, X } from "lucide-react";
import { CopyIcon, CheckCheckIcon } from "@animateicons/react/lucide";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AiGeneratedLabel } from "@/components/ai";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DraftComposerProps {
  draft: string;
  subject?: string;
  generatedAt?: string;
  onAccept?: (finalDraft: string) => void;
  onDiscard?: () => void;
  acceptLabel?: string;
  className?: string;
}

interface CopyButtonProps {
  copied: boolean;
  onClick: () => void;
}

function CopyButton({ copied, onClick }: CopyButtonProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-micro text-muted-foreground hover:text-foreground transition-colors"
      {...hoverHandlers}
    >
      {copied ? (
        <CheckCheckIcon ref={iconRef} size={12} className="text-emerald-500" />
      ) : (
        <CopyIcon ref={iconRef} size={12} />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

interface EditToggleButtonProps {
  editing: boolean;
  onClick: () => void;
}

function EditToggleButton({ editing, onClick }: EditToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-micro text-muted-foreground hover:text-foreground transition-colors ml-2"
    >
      {editing ? <Check className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
      {editing ? "Done" : "Edit"}
    </button>
  );
}

export function DraftComposer({
  draft,
  subject,
  generatedAt,
  onAccept,
  onDiscard,
  acceptLabel = "Accept Draft",
  className,
}: DraftComposerProps) {
  const [editing, setEditing] = useState(false);
  const [editedDraft, setEditedDraft] = useState(draft);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleCopy = useCallback(() => {
    void navigator.clipboard.writeText(editedDraft).then(() => {
      setCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [editedDraft]);

  const handleEditToggle = useCallback(() => {
    setEditing((prev) => !prev);
  }, []);

  const handleDraftChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedDraft(e.target.value);
  }, []);

  const handleAccept = useCallback(() => {
    onAccept?.(editedDraft);
    toast.success("Draft ready to send");
  }, [onAccept, editedDraft]);

  const handleDiscard = useCallback(() => {
    onDiscard?.();
  }, [onDiscard]);

  return (
    <div className={cn("rounded-lg border border-border bg-muted/30 space-y-2 p-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <AiGeneratedLabel timestamp={generatedAt} />
        <div className="flex items-center gap-1">
          <CopyButton copied={copied} onClick={handleCopy} />
          <EditToggleButton editing={editing} onClick={handleEditToggle} />
        </div>
      </div>

      {subject && (
        <div>
          <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Subject</p>
          <p className="text-xs text-foreground">{subject}</p>
        </div>
      )}

      <div>
        <p className="text-micro font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Body</p>
        {editing ? (
          <Textarea
            value={editedDraft}
            onChange={handleDraftChange}
            className="min-h-[120px] text-xs resize-none"
          />
        ) : (
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{editedDraft}</p>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        {onAccept && (
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleAccept}>
            <Check className="h-3 w-3" />
            {acceptLabel}
          </Button>
        )}
        {onDiscard && (
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-muted-foreground" onClick={handleDiscard}>
            <X className="h-3 w-3" />
            Discard
          </Button>
        )}
      </div>
    </div>
  );
}
