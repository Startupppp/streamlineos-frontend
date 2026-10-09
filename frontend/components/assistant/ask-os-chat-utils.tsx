"use client";

import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { Volume2, VolumeX } from "lucide-react";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import type { AskAiHistoryMessage } from "@/hooks/api/chat-ai-assistant";
import {
  directivesOf,
  extractAskOsDirective,
  type AskOsDirective,
} from "./ask-os-directive-schema";
import type { AskOsClarificationAnswer } from "./ask-os-clarify-card";
import type { SpeechPlaybackController } from "./use-browser-speech";
import { CompanionCharacter } from "./companion-character";
import { useCompanionPresence } from "./companion-launcher";

const ConfirmDirectiveSlot = dynamic(
  () =>
    import("./ask-os-confirmation-card").then((m) => m.ConfirmDirectiveSlot),
  { ssr: false },
);

const AskOsConnectCard = dynamic(
  () => import("./ask-os-connect-card").then((m) => m.AskOsConnectCard),
  { ssr: false },
);

const AskOsClarifyCard = dynamic(
  () => import("./ask-os-clarify-card").then((m) => m.AskOsClarifyCard),
  { ssr: false },
);

const AskOsEvidenceCard = dynamic(
  () => import("./ask-os-answer-card").then((m) => m.AskOsEvidenceCard),
  { ssr: false },
);

const AskOsPlanCard = dynamic(
  () => import("./ask-os-answer-card").then((m) => m.AskOsPlanCard),
  { ssr: false },
);

const AskOsLimitCard = dynamic(
  () => import("./ask-os-answer-card").then((m) => m.AskOsLimitCard),
  { ssr: false },
);

const AskOsReceiptCard = dynamic(
  () => import("./ask-os-answer-card").then((m) => m.AskOsReceiptCard),
  { ssr: false },
);

export type MsgRow =
  | { type: "sep"; id: string; label: string }
  | { type: "msg"; message: AskAiHistoryMessage };

export function dayKey(iso: string): string {
  return new Date(iso).toDateString();
}

export function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) =>
    new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === now.getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return d.toLocaleDateString(undefined, opts);
}

export function buildMsgRows(messages: AskAiHistoryMessage[]): MsgRow[] {
  const rows: MsgRow[] = [];
  let lastDay: string | null = null;
  for (const message of messages) {
    const key = dayKey(message.createdAt);
    if (key !== lastDay) {
      rows.push({
        type: "sep",
        id: `sep-${key}-${message.id}`,
        label: dayLabel(message.createdAt),
      });
      lastDay = key;
    }
    rows.push({ type: "msg", message });
  }
  return rows;
}

export function EmptyAskOs({
  onSuggestion,
  suggestions,
}: {
  onSuggestion: (e: React.MouseEvent<HTMLButtonElement>) => void;
  suggestions?: readonly string[];
}) {
  const companion = useCompanionPresence();
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 px-2 py-8 text-center">
      {companion ? (
        <CompanionCharacter
          preset={companion.preset}
          state="idle"
          animation={companion.animation}
          className="size-20"
        />
      ) : (
        <AnimatedLogo size={36} gradient className="rounded-full" />
      )}
      <div className="space-y-1.5">
        <p className="text-lg font-semibold tracking-tight text-foreground">How can I help?</p>
        <p className="mx-auto max-w-[18rem] text-label leading-5 text-muted-foreground">
          CRM, HR, Build, mail, calendar, and your knowledge base.
        </p>
      </div>
      <div className="flex w-full max-w-[28rem] flex-wrap justify-center gap-2">
        {suggestions?.map((s) => (
          <button
            key={s}
            type="button"
            data-suggestion={s}
            onClick={onSuggestion}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-label text-foreground transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
        {suggestions?.length === 0 ? (
          <p className="text-label text-muted-foreground">
            Ask a question about the workspace information you can access.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AskOsBubble({
  role,
  content,
  streaming,
  reduce,
  directives: directivesProp,
  live = false,
  onClarify,
  speech,
  speechKey,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  reduce: boolean;
  directives?: AskOsDirective[];
  live?: boolean;
  onClarify?: (answer: AskOsClarificationAnswer) => void;
  speech?: SpeechPlaybackController;
  speechKey?: string;
}) {
  if (role === "user") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm leading-6 text-primary-foreground">
          {content}
        </div>
      </motion.div>
    );
  }

  const { directives: extracted, prose } = extractAskOsDirective(content);
  const directives = directivesProp ?? extracted;
  const isPersistedTurn = !live && directivesProp === undefined;

  const confirmDirectives = directivesOf(directives, "confirm-action");
  const connectDirectives = directivesOf(directives, "connect-integration");
  const showTyping = streaming && !prose && directives.length === 0;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start gap-2"
    >
      <AnimatedLogo
        size={20}
        gradient
        className="mt-0.5 shrink-0 rounded-full"
      />
      <div className="min-w-0 max-w-[92%] flex-1 space-y-2 text-sm leading-6 text-foreground">
        {prose ? (
          <div className="space-y-1 break-words">
            <MarkdownContent content={prose} />
            {!streaming && speech && speechKey ? (
              <AssistantSpeechControl content={prose} speech={speech} speechKey={speechKey} />
            ) : null}
          </div>
        ) : null}
        {directivesOf(directives, "evidence").map((directive, index) => (
          <AskOsEvidenceCard key={`evidence-${index}`} directive={directive} />
        ))}
        {directivesOf(directives, "action-plan").map((directive, index) => (
          <AskOsPlanCard key={`plan-${index}`} directive={directive} />
        ))}
        {directivesOf(directives, "clarify").map((directive) => (
          <AskOsClarifyCard
            key={directive.clarificationId}
            directive={directive}
            onAnswer={onClarify}
          />
        ))}
        {confirmDirectives.map((directive) => (
          <ConfirmDirectiveSlot
            key={directive.proposalId}
            directive={directive}
            persisted={isPersistedTurn}
          />
        ))}
        {directivesOf(directives, "action-receipt").map((directive) => (
          <AskOsReceiptCard key={`receipt-${directive.proposalId}`} receipt={directive} />
        ))}
        {directivesOf(directives, "capability-limit").map((directive) => (
          <AskOsLimitCard key={`limit-${directive.reason}`} directive={directive} />
        ))}
        {showTyping ? <TypingDots reduce={reduce} /> : null}
        {connectDirectives.map((directive) => (
          <AskOsConnectCard
            key={directive.toolkit}
            toolkit={directive.toolkit}
            reason={directive.reason}
            summary={directive.summary}
          />
        ))}
      </div>
    </motion.div>
  );
}

function AssistantSpeechControl({
  content,
  speech,
  speechKey,
}: {
  content: string;
  speech: SpeechPlaybackController;
  speechKey: string;
}) {
  const speaking = speech.activeKey === speechKey;
  function handleToggle() {
    if (speaking) speech.stop();
    else speech.speak(speechKey, content);
  }

  if (!speech.supported) return null;
  const Icon = speaking ? VolumeX : Volume2;
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={speaking ? "Stop reading response" : "Read response aloud"}
      aria-pressed={speaking}
      className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-3.5" aria-hidden />
      {speaking ? "Stop reading" : "Read aloud"}
    </button>
  );
}

function TypingDots({ reduce }: { reduce: boolean }) {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-0.5">
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-micro font-medium text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
