"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import type { AskAiHistoryMessage } from "@/hooks/api/chat-ai-assistant";
import { extractAskOsDirective, type AskOsDirective } from "./ask-os-directive-schema";

const AskOsConfirmationCard = dynamic(
  () =>
    import("./ask-os-confirmation-card").then((m) => m.AskOsConfirmationCard),
  { ssr: false },
);

const AskOsConnectCard = dynamic(
  () => import("./ask-os-connect-card").then((m) => m.AskOsConnectCard),
  { ssr: false },
);

const SUGGESTIONS = [
  "Summarize my day",
  "What are my hot leads right now?",
  "Search the knowledge base for our leave policy",
  "Schedule a reminder for STRE-42",
  "Send kudos to John for shipping the feature",
];

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
}: {
  onSuggestion: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-5 px-2 py-8 text-center">
      <AnimatedLogo size={36} gradient className="rounded-full" />
      <div className="space-y-1.5">
        <p className="text-lg font-semibold tracking-tight text-foreground">How can I help?</p>
        <p className="mx-auto max-w-[18rem] text-[13px] leading-5 text-muted-foreground">
          CRM, HR, Build, mail, calendar, and your knowledge base.
        </p>
      </div>
      <div className="flex w-full max-w-[28rem] flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            data-suggestion={s}
            onClick={onSuggestion}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-[13px] text-foreground transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

type ConfirmActionDirective = Extract<AskOsDirective, { kind: "confirm-action" }>;

function confirmOutcomeCopy(action: string): string {
  if (action === "email.send" || action === "mail.send") return "Email sent.";
  return "Done.";
}

function ConfirmDirectiveSlot({
  directive,
  persisted,
}: {
  directive: ConfirmActionDirective;
  persisted: boolean;
}) {
  const [confirmedResult, setConfirmedResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [cancelled, setCancelled] = useState(false);

  function handleCancelled() {
    setCancelled(true);
  }

  if (persisted)
    return (
      <AskOsConfirmationCard
        mode="record"
        summary={directive.summary}
        preview={directive.preview}
        title={directive.title}
      />
    );

  if (confirmedResult !== null)
    return (
      <p className="text-[13px] text-muted-foreground">
        {confirmOutcomeCopy(directive.action)}
      </p>
    );
  if (cancelled)
    return <p className="text-[13px] text-muted-foreground">Cancelled.</p>;

  return (
    <AskOsConfirmationCard
      mode="live"
      summary={directive.summary}
      preview={directive.preview}
      token={directive.token}
      expiresAt={directive.expiresAt}
      title={directive.title}
      confirmLabel={directive.confirmLabel}
      onConfirmed={setConfirmedResult}
      onCancelled={handleCancelled}
    />
  );
}

export function AskOsBubble({
  role,
  content,
  streaming,
  reduce,
  directives: directivesProp,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  reduce: boolean;
  directives?: AskOsDirective[];
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
  const isPersistedTurn = directivesProp === undefined;

  const confirmDirectives = directives.filter(
    (d): d is ConfirmActionDirective => d.kind === "confirm-action",
  );
  const connectDirectives = directives.filter(
    (d): d is Extract<AskOsDirective, { kind: "connect-integration" }> =>
      d.kind === "connect-integration",
  );

  const showTyping =
    streaming && !prose && confirmDirectives.length === 0 && connectDirectives.length === 0;
  const showChrome =
    Boolean(prose) || confirmDirectives.length > 0 || showTyping;

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
        {showChrome ? (
          <div className="space-y-2">
            {prose ? (
              <div className="break-words">
                <MarkdownContent content={prose} />
              </div>
            ) : null}
            {confirmDirectives.map((directive) => (
              <ConfirmDirectiveSlot
                key={directive.proposalId}
                directive={directive}
                persisted={isPersistedTurn}
              />
            ))}
            {showTyping ? <TypingDots reduce={reduce} /> : null}
          </div>
        ) : null}
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
