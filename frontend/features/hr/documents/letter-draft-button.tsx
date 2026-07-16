"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { CopyIcon } from "@animateicons/react/lucide";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AiDraftCard } from "@/components/ai";
import { useAILetterDraft } from "@/hooks/api/ai";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";

const LETTER_TYPES = [
  { value: "offer", label: "Offer Letter" },
  { value: "appointment", label: "Appointment Letter" },
  { value: "appreciation", label: "Appreciation Letter" },
  { value: "warning", label: "Warning Letter" },
  { value: "promotion", label: "Promotion Letter" },
  { value: "termination_notice", label: "Termination Notice" },
  { value: "experience", label: "Experience Certificate" },
] as const;

type LetterType = (typeof LETTER_TYPES)[number]["value"];

interface LetterDraftButtonProps {
  userId: string;
  userName: string;
}

export function LetterDraftButton({ userId, userName }: LetterDraftButtonProps) {
  const [open, setOpen] = useState(false);
  const [letterType, setLetterType] = useState<LetterType | "">("");
  const [details, setDetails] = useState("");
  const mutation = useAILetterDraft();
  const result = mutation.data;

  function handleGenerate() {
    if (!letterType) { toast.error("Please select a letter type"); return; }
    mutation.mutate(
      { userId, letterType, details: details.trim() || undefined },
      { onError: (e) => toast.error(getErrorMessage(e)) },
    );
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`);
    toast.success("Letter copied to clipboard");
  }

  function handleOpenChange(val: boolean) {
    setOpen(val);
    if (!val) {
      mutation.reset();
      setLetterType("");
      setDetails("");
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Draft Letter
      </Button>

      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent className="w-[480px] sm:w-[540px] flex flex-col gap-0 p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b shrink-0">
            <SheetTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Letter Draft
            </SheetTitle>
            <SheetDescription className="text-xs">
              For {userName} — draft only, requires human review before use
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Letter Type</Label>
              <Select value={letterType} onValueChange={(v) => setLetterType(v as LetterType)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select letter type…" />
                </SelectTrigger>
                <SelectContent>
                  {LETTER_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-sm">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Additional context (optional)</Label>
              <Textarea
                placeholder="e.g. effective date, new role, salary, special notes…"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                className="resize-none text-sm"
                maxLength={2000}
              />
              <p className="text-[10px] text-muted-foreground">{details.length}/2000</p>
            </div>

            <LoadingButton
              isPending={mutation.isPending}
              loadingText="Drafting…"
              onClick={handleGenerate}
              disabled={!letterType}
              className="w-full"
              size="sm"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Generate Letter Draft
            </LoadingButton>

            {result && (
              <AiDraftCard title={result.subject}>
                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                    <p className="text-sm font-medium">{result.subject}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Letter Body</p>
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans">{result.body}</pre>
                  </div>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 italic border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 rounded p-2">
                    {result.disclaimer}
                  </p>
                  <div className="flex gap-2">
                    <AnimatedIconButton
                      size="sm"
                      variant="outline"
                      icon={CopyIcon}
                      iconSize={14}
                      onClick={handleCopy}
                    >
                      Copy Letter
                    </AnimatedIconButton>
                    <LoadingButton
                      size="sm"
                      variant="outline"
                      isPending={mutation.isPending}
                      onClick={handleGenerate}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1" />
                      Regenerate
                    </LoadingButton>
                  </div>
                </div>
              </AiDraftCard>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
