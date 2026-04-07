"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSummarizeConversation } from "@/lib/api/hooks/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

interface AISummarizeButtonProps {
  activityType: string;
  subject?: string;
  notes: string;
  leadName?: string;
  dealName?: string;
}

export function AISummarizeButton({ activityType, subject, notes, leadName, dealName }: AISummarizeButtonProps) {
  const [open, setOpen] = useState(false);
  const summarizeMutation = useSummarizeConversation();
  const result = summarizeMutation.data;

  const handleSummarize = () => {
    summarizeMutation.mutate(
      { activityType, subject, notes, leadName, dealName },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  };

  const sentimentColor = (s: string) => {
    if (s === "positive") return "text-emerald-500";
    if (s === "negative") return "text-red-500";
    return "text-amber-500";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[10px] gap-1"
          onClick={() => { if (!result) handleSummarize(); }}
          disabled={summarizeMutation.isPending}
        >
          {summarizeMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3 text-gold" />
          )}
          AI Summary
        </Button>
      </PopoverTrigger>
      {result && (
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Summary</p>
                <Badge variant="secondary" className={cn("text-[9px] h-4 px-1 capitalize", sentimentColor(result.sentiment))}>
                  {result.sentiment}
                </Badge>
              </div>
              <p className="text-xs leading-snug">{result.summary}</p>
            </div>

            {result.keyPoints.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Key Points</p>
                <ul className="space-y-1">
                  {result.keyPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]">
                      <span className="text-gold mt-0.5">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.actionItems.length > 0 && (
              <div>
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Action Items</p>
                <ul className="space-y-1">
                  {result.actionItems.map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px]">
                      <span className="text-blue-400 mt-0.5">→</span>
                      <span>{a}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
}
