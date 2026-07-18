"use client";

import { useState, useCallback } from "react";
import { Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CopyIcon, SparklesIcon } from "@animateicons/react/lucide";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAIInterviewKit } from "@/hooks/api/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import type { InterviewKitResult } from "@/lib/ai/schemas";

interface InterviewKitDraftButtonProps {
  jobPostingId: number;
  jobTitle: string;
}

export function InterviewKitDraftButton({ jobPostingId, jobTitle }: InterviewKitDraftButtonProps) {
  const [open, setOpen] = useState(false);
  const [expandedRound, setExpandedRound] = useState<number | null>(0);
  const [result, setResult] = useState<InterviewKitResult | null>(null);
  const mutation = useAIInterviewKit();

  function handleGenerate() {
    mutation.mutate(jobPostingId, {
      onSuccess: (data) => { setResult(data); setExpandedRound(0); },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }

  function handleCopy() {
    if (!result) return;
    const text = result.roundKits.map((rk) => [
      `## ${rk.round}`,
      "",
      "### Questions",
      ...rk.questions.map((q, i) => [
        `${i + 1}. ${q.question}`,
        `   Category: ${q.category}`,
        `   Expected: ${q.expectedAnswer}`,
        q.redFlags.length ? `   Red flags: ${q.redFlags.join("; ")}` : "",
      ].filter(Boolean).join("\n")),
      "",
      "### Rubric",
      ...rk.rubric.map((r) => `- ${r.criterion} (weight ${r.weight}): ${r.description}`),
    ].join("\n")).join("\n\n---\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Interview kit copied to clipboard");
  }

  function toggleRound(idx: number) {
    setExpandedRound(expandedRound === idx ? null : idx);
  }

  function handleOpen() {
    setOpen(true);
  }

  return (
    <>
      <AnimatedIconButton
        variant="outline"
        size="sm"
        className="gap-1.5"
        icon={SparklesIcon}
        iconSize={14}
        iconClassName="text-primary"
        onClick={handleOpen}
      >
        Draft Interview Kit
      </AnimatedIconButton>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl flex flex-col p-0 gap-0 max-h-[85vh]">
          <DialogHeader className="shrink-0 px-5 pt-5 pb-3 border-b">
            <DialogTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Interview Kit
            </DialogTitle>
            <DialogDescription className="text-xs">
              {jobTitle} — AI-generated, review before use
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 min-h-0">
            <div className="px-5 py-4 space-y-4">
              {!result && (
                <LoadingButton
                  onClick={handleGenerate}
                  className="w-full"
                  size="sm"
                  isPending={mutation.isPending}
                  loadingText="Drafting kit…"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Interview Kit
                </LoadingButton>
              )}

              {result && (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{result.roundKits.length} round{result.roundKits.length !== 1 ? "s" : ""}</p>
                    <AnimatedIconButton size="sm" variant="outline" onClick={handleCopy} icon={CopyIcon} iconSize={14} iconClassName="mr-1.5">
                      Copy All
                    </AnimatedIconButton>
                  </div>

                  <div className="space-y-2">
                    {result.roundKits.map((rk, idx) => (
                      <div key={idx} className="rounded-md border border-border bg-muted/20">
                        <button
                          onClick={() => toggleRound(idx)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">{rk.round}</span>
                            <Badge variant="secondary" className="text-[10px] h-4 px-1">
                              {rk.questions.length}Q
                            </Badge>
                          </div>
                          {expandedRound === idx ? (
                            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                        </button>

                        {expandedRound === idx && (
                          <div className="border-t border-border px-3 pb-3 pt-2 space-y-3">
                            <div>
                              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Questions</p>
                              <div className="space-y-2">
                                {rk.questions.map((q, qi) => (
                                  <div key={qi} className="rounded border border-border bg-card p-2">
                                    <p className="text-[11px] font-medium">{qi + 1}. {q.question}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">Category: {q.category}</p>
                                    <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">Expected: {q.expectedAnswer}</p>
                                    {q.redFlags.length > 0 && (
                                      <p className="text-[10px] text-red-500 dark:text-red-400 mt-0.5">⚑ {q.redFlags.join(" · ")}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {rk.rubric.length > 0 && (
                              <div>
                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">Rubric</p>
                                <div className="space-y-1">
                                  {rk.rubric.map((r, ri) => (
                                    <div key={ri} className="flex items-start gap-2 text-[11px]">
                                      <Badge variant="outline" className="text-[9px] h-4 px-1 shrink-0">{r.weight}x</Badge>
                                      <span><span className="font-medium">{r.criterion}:</span> {r.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <LoadingButton
                    onClick={handleGenerate}
                    variant="outline"
                    size="sm"
                    className="w-full"
                    isPending={mutation.isPending}
                    loadingText="Regenerating…"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </LoadingButton>

                  <p className="text-[11px] text-muted-foreground italic text-center">
                    DRAFT — Review and customize before use. AI-generated interview kits require human judgment.
                  </p>
                </>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
