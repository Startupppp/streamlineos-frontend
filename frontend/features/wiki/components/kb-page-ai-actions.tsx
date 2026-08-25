"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { SparklesIcon } from "@animateicons/react/lucide";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import { AiQuotaEmptyState } from "@/components/ai/ai-quota-empty-state";
import { AiPermissionDenied } from "@/components/ai/ai-permission-denied";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { isApiError } from "@/lib/api-client";
import {
  useKbPageSummarize,
  useKbPageAsk,
  useKbPageImprove,
  useKbPageSuggestRelated,
} from "@/hooks/api/kb/page-ai";
import type { AiUsageMeta } from "@/components/ai/ai-usage-chip";

interface KbPageAiActionsProps {
  pageId: number;
  onApplyImprovement?: (text: string) => void;
}

type ActiveAction = "summarize" | "ask" | "improve" | "suggest-related";

type PanelState =
  | { status: "idle" }
  | { status: "ask-input" }
  | { status: "loading" }
  | { status: "ready"; text: string; isImprove: boolean; aiUsage?: AiUsageMeta | null }
  | { status: "quota" }
  | { status: "denied"; reason: string }
  | { status: "error"; message: string };

const ACTION_LABELS: Record<ActiveAction, string> = {
  summarize: "Summarize this page",
  ask: "Ask about this page",
  improve: "Improve writing",
  "suggest-related": "Suggest related topics",
};

const ACTION_DESCRIPTIONS: Record<ActiveAction, string> = {
  summarize: "Concise bullet-point summary",
  ask: "Question scoped to this document only",
  improve: "Get a rewritten draft — you apply it",
  "suggest-related": "Topics that complement this page",
};

export function KbPageAiActions({ pageId, onApplyImprovement }: KbPageAiActionsProps) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<ActiveAction>("summarize");
  const [panelState, setPanelState] = useState<PanelState>({ status: "idle" });
  const [question, setQuestion] = useState("");
  const [lastQuestion, setLastQuestion] = useState("");

  const summarize = useKbPageSummarize(pageId);
  const askMutation = useKbPageAsk(pageId);
  const improve = useKbPageImprove(pageId);
  const suggestRelated = useKbPageSuggestRelated(pageId);

  async function runAction(action: ActiveAction) {
    setActive(action);
    if (action === "ask") {
      setPanelState({ status: "ask-input" });
      setQuestion("");
      setOpen(true);
      return;
    }
    setPanelState({ status: "loading" });
    setOpen(true);
    try {
      let text = "";
      let aiUsage: AiUsageMeta | null | undefined;
      if (action === "summarize") {
        const res = await summarize.mutateAsync();
        text = res.text;
        aiUsage = res.aiUsage;
      } else if (action === "improve") {
        const res = await improve.mutateAsync();
        text = res.text;
        aiUsage = res.aiUsage;
      } else if (action === "suggest-related") {
        const res = await suggestRelated.mutateAsync();
        text = res.text;
        aiUsage = res.aiUsage;
      }
      setPanelState({ status: "ready", text, isImprove: action === "improve", aiUsage });
    } catch (err) {
      if (isApiError(err) && err.status === 402) { setPanelState({ status: "quota" }); return; }
      if (isApiError(err) && err.status === 403) { setPanelState({ status: "denied", reason: getErrorMessage(err) }); return; }
      setPanelState({ status: "error", message: getErrorMessage(err) });
    }
  }

  async function runAsk(q: string) {
    setLastQuestion(q);
    setPanelState({ status: "loading" });
    try {
      const res = await askMutation.mutateAsync(q);
      setPanelState({ status: "ready", text: res.text, isImprove: false, aiUsage: res.aiUsage });
    } catch (err) {
      if (isApiError(err) && err.status === 402) { setPanelState({ status: "quota" }); return; }
      if (isApiError(err) && err.status === 403) { setPanelState({ status: "denied", reason: getErrorMessage(err) }); return; }
      setPanelState({ status: "error", message: getErrorMessage(err) });
    }
  }

  function handleAskSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = question.trim();
    if (trimmed.length < 3) return;
    void runAsk(trimmed);
  }

  function handleRetry() {
    if (panelState.status !== "error") return;
    if (active === "ask") void runAsk(lastQuestion);
    else void runAction(active);
  }

  function handlePanelOpenChange(v: boolean) {
    setOpen(v);
    if (!v) { setPanelState({ status: "idle" }); setQuestion(""); }
  }

  function handleQuestionChange(e: ChangeEvent<HTMLInputElement>) {
    setQuestion(e.target.value);
  }

  function handleApplyImprovement() {
    if (panelState.status !== "ready") return;
    void navigator.clipboard.writeText(panelState.text).then(() => {
      toast.success("Improvement draft copied to clipboard");
      onApplyImprovement?.(panelState.text);
    }).catch(() => {
      onApplyImprovement?.(panelState.text);
      toast.success("Improvement applied");
    });
    setOpen(false);
  }

  const sheetTitle = active === "ask" ? "Ask about this page" : ACTION_LABELS[active];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <AnimatedIconButton
            type="button"
            icon={SparklesIcon}
            iconSize={14}
            iconClassName="text-primary"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 rounded-full px-2.5 text-xs"
            aria-label="AI assist"
          >
            AI
          </AnimatedIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-dense font-medium text-muted-foreground">
            AI assist
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {(["summarize", "ask", "improve", "suggest-related"] as ActiveAction[]).map((key) => (
            <DropdownMenuItem
              key={key}
              onSelect={(e) => { e.preventDefault(); void runAction(key); }}
              className="flex flex-col items-start gap-0.5"
            >
              <span className="text-label">{ACTION_LABELS[key]}</span>
              <span className="text-dense text-muted-foreground">{ACTION_DESCRIPTIONS[key]}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Sheet open={open} onOpenChange={handlePanelOpenChange}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
          <SheetHeader className="shrink-0 border-b border-border px-6 py-4">
            <SheetTitle className="text-base font-semibold">{sheetTitle}</SheetTitle>
            <SheetDescription className="text-label text-muted-foreground">
              AI-generated content grounded in this page. Review before you use it.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {panelState.status === "ask-input" && (
              <form onSubmit={handleAskSubmit} className="flex flex-col gap-3">
                <p className="text-label text-muted-foreground">
                  Ask a question — the answer is scoped to this page only.
                </p>
                <Input
                  autoFocus
                  value={question}
                  onChange={handleQuestionChange}
                  placeholder="e.g. What are the prerequisites?"
                  className="text-label"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={question.trim().length < 3}
                  className="self-start"
                >
                  Ask
                </Button>
              </form>
            )}

            {panelState.status === "loading" && (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            )}

            {panelState.status === "quota" && <AiQuotaEmptyState variant="fill" />}

            {panelState.status === "denied" && <AiPermissionDenied reason={panelState.reason} />}

            {panelState.status === "error" && (
              <div className="flex flex-col items-start gap-3 py-4">
                <p className="text-sm text-muted-foreground">{panelState.message}</p>
                <Button type="button" variant="outline" size="sm" onClick={handleRetry} className="h-9 text-sm">
                  Retry
                </Button>
              </div>
            )}

            {panelState.status === "ready" && (
              <>
                {active === "ask" && lastQuestion && (
                  <div className="mb-1">
                    <p className="text-xs font-medium text-muted-foreground">Your question</p>
                    <p className="text-label text-foreground mt-0.5">{lastQuestion}</p>
                  </div>
                )}
                <AiDraftCard
                  onAccept={panelState.isImprove && onApplyImprovement ? handleApplyImprovement : undefined}
                  acceptLabel="Copy & apply draft"
                  usage={panelState.aiUsage}
                >
                  <p className="whitespace-pre-wrap text-label leading-relaxed text-foreground">
                    {panelState.text}
                  </p>
                </AiDraftCard>
                {active === "ask" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setPanelState({ status: "ask-input" }); setQuestion(""); }}
                  >
                    Ask another question
                  </Button>
                )}
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
