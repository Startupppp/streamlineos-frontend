"use client";

import { useState, useCallback } from "react";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { LoadingButton } from "@/components/ui/loading-button";
import { Button } from "@/components/ui/button";
import { useImproveReply } from "@/hooks/api/support/ai";
import { getErrorMessage } from "@/lib/get-error-message";

interface ReplyImprovementSectionProps {
  ticketId: number;
  currentContent: string;
  onApply: (improved: string) => void;
}

export function ReplyImprovementSection({
  ticketId,
  currentContent,
  onApply,
}: ReplyImprovementSectionProps) {
  const [result, setResult] = useState<{ improved: string; changes: string[] } | null>(null);
  const improveReply = useImproveReply(ticketId);

  const handleImprove = useCallback(() => {
    if (!currentContent.trim()) {
      toast.error("Enter some reply content first");
      return;
    }
    improveReply.mutate(
      { content: currentContent },
      {
        onSuccess: (data) => {
          if (data) setResult(data);
          else toast.info("No improvement available");
        },
        onError: (err) => toast.error(getErrorMessage(err)),
      },
    );
  }, [improveReply, currentContent]);

  const handleApply = useCallback(() => {
    if (result) {
      onApply(result.improved);
      setResult(null);
      toast.success("Improved reply applied");
    }
  }, [result, onApply]);

  const handleDiscard = useCallback(() => setResult(null), []);

  return (
    <div className="space-y-1.5">
      <LoadingButton
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 text-xs"
        isPending={improveReply.isPending}
        loadingText="Improving…"
        onClick={handleImprove}
      >
        <Wand2 className="h-3.5 w-3.5 mr-1" />
        Improve reply
      </LoadingButton>

      {result && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-2 space-y-1.5">
          <p className="text-[11px] font-medium text-muted-foreground">Improved version</p>
          <p className="text-[12px] text-foreground/90 whitespace-pre-wrap line-clamp-6">
            {result.improved}
          </p>
          {result.changes.length > 0 && (
            <ul className="list-disc list-inside text-[10px] text-muted-foreground space-y-0.5">
              {result.changes.map((change, i) => (
                <li key={i}>{change}</li>
              ))}
            </ul>
          )}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={handleApply}
            >
              Apply
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleDiscard}
            >
              Discard
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
