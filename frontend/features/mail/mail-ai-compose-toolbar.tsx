"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { SparklesIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useMailAiDraft } from "@/hooks/api/mail";
import { cn } from "@/lib/utils";

type ComposeAiMode = "compose" | "reply";

export type MailAiComposeAction =
  | "draft"
  | "professional"
  | "friendly"
  | "shorten"
  | "expand"
  | "subject";

interface MailAiComposeToolbarProps {
  accountId?: number;
  threadId?: string;
  mode: ComposeAiMode;
  currentSubject?: string;
  currentBodyHtml?: string;
  onInsert: (subject: string, body: string) => void;
  onSubjectOnly?: (subject: string) => void;
  className?: string;
}

const QUICK_ACTIONS: {
  key: Exclude<MailAiComposeAction, "draft">;
  label: string;
  instruction: (subject: string, body: string) => string;
  subjectOnly?: boolean;
}[] = [
  {
    key: "professional",
    label: "Professional",
    instruction: (_, body) =>
      `Rewrite the following email in a clear, professional tone. Keep the meaning. Return improved subject if needed and bodyHtml.\n\nCurrent body HTML:\n${body || "(empty — write a short professional placeholder asking for context)"}`,
  },
  {
    key: "friendly",
    label: "Friendly",
    instruction: (_, body) =>
      `Rewrite the following email in a warm, concise, friendly tone without being casual-sloppy.\n\nCurrent body HTML:\n${body || "(empty)"}`,
  },
  {
    key: "shorten",
    label: "Shorten",
    instruction: (_, body) =>
      `Shorten this email by ~40% while keeping key asks and next steps.\n\nCurrent body HTML:\n${body || "(empty)"}`,
  },
  {
    key: "expand",
    label: "Expand",
    instruction: (_, body) =>
      `Expand this email with a brief context opener and a clear closing, without fluff.\n\nCurrent body HTML:\n${body || "(empty)"}`,
  },
  {
    key: "subject",
    label: "Subject",
    subjectOnly: true,
    instruction: (subject, body) =>
      `Suggest a strong email subject line (under 70 chars) for this message. Put the subject in the subject field; bodyHtml can be a short <p> confirming the subject choice.\n\nCurrent subject: ${subject || "(none)"}\n\nBody HTML:\n${body || "(empty)"}`,
  },
];

export function MailAiComposeToolbar({
  accountId,
  threadId,
  mode,
  currentSubject = "",
  currentBodyHtml = "",
  onInsert,
  onSubjectOnly,
  className,
}: MailAiComposeToolbarProps) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const aiDraft = useMailAiDraft();

  const runDraft = useCallback(
    async (instr: string, actionKey: string, subjectOnly = false) => {
      if (!instr.trim()) return;
      setPendingKey(actionKey);
      try {
        const data = await aiDraft.mutateAsync({
          mode,
          instruction: instr.trim(),
          accountId,
          threadId,
        });
        if (subjectOnly && onSubjectOnly) {
          onSubjectOnly(data.subject);
        } else {
          onInsert(data.subject, data.bodyHtml);
        }
        if (actionKey === "draft") {
          setOpen(false);
          setInstruction("");
        }
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setPendingKey(null);
      }
    },
    [aiDraft, mode, accountId, threadId, onInsert, onSubjectOnly],
  );

  const handleInstructionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setInstruction(e.target.value),
    [],
  );

  const handleGenerateClick = useCallback(() => {
    void runDraft(instruction, "draft");
  }, [runDraft, instruction]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void runDraft(instruction, "draft");
      }
    },
    [runDraft, instruction],
  );

  const handleQuick = useCallback(
    (key: Exclude<MailAiComposeAction, "draft">) => {
      const action = QUICK_ACTIONS.find((a) => a.key === key);
      if (!action) return;
      void runDraft(
        action.instruction(currentSubject, currentBodyHtml),
        key,
        action.subjectOnly === true,
      );
    },
    [runDraft, currentSubject, currentBodyHtml],
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1",
        className,
      )}
    >
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            {...hoverHandlers}
          >
            <SparklesIcon ref={iconRef} size={13} />
            Write with AI
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-foreground">
              Describe what to write
            </p>
            <Textarea
              value={instruction}
              onChange={handleInstructionChange}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Follow up on yesterday's meeting…"
              className="h-20 text-label resize-none"
              autoFocus
            />
            <LoadingButton
              size="sm"
              isPending={pendingKey === "draft"}
              loadingText="Generating…"
              onClick={handleGenerateClick}
              className="h-8 text-xs w-full"
            >
              Generate draft
            </LoadingButton>
          </div>
        </PopoverContent>
      </Popover>

      {QUICK_ACTIONS.map((action) => (
        <Button
          key={action.key}
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-dense px-2 text-muted-foreground"
          disabled={pendingKey !== null}
          onClick={() => handleQuick(action.key)}
        >
          {pendingKey === action.key ? "…" : action.label}
        </Button>
      ))}
    </div>
  );
}
