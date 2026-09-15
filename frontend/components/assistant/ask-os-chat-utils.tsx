"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import { AnimatedLogo } from "@/components/brand/animated-logo";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import type { AskAiHistoryMessage } from "@/hooks/api/chat-ai-assistant";

const AskOsConfirmationCard = dynamic(
  () =>
    import("./ask-os-confirmation-card").then((m) => m.AskOsConfirmationCard),
  { ssr: false },
);

export const SUGGESTIONS = [
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
    <div className="flex min-h-full flex-col items-center justify-center gap-4 py-6 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10">
        <AnimatedLogo size={28} gradient className="rounded-xl" />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">How can I help?</p>
        <p className="mx-auto mt-1 max-w-[16rem] text-xs text-muted-foreground">
          I can help across CRM, HR, Build, Inventory & Ops, calendars, support,
          and your knowledge base.
        </p>
      </div>
      <div className="w-full space-y-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            data-suggestion={s}
            onClick={onSuggestion}
            className="w-full rounded-lg bg-muted/60 px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ConfirmPayload {
  requiresConfirmation: true;
  proposalId: number;
  token: string;
  action: string;
  summary: string;
  preview: Record<string, unknown>;
}

function parseConfirmPayload(content: string): ConfirmPayload | null {
  const prefix = "CONFIRM_ACTION:";
  if (!content.startsWith(prefix)) return null;
  try {
    const parsed: unknown = JSON.parse(content.slice(prefix.length).trim());
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("token" in parsed) ||
      typeof (parsed as Record<string, unknown>)["token"] !== "string" ||
      !("action" in parsed) ||
      typeof (parsed as Record<string, unknown>)["action"] !== "string" ||
      !("summary" in parsed) ||
      typeof (parsed as Record<string, unknown>)["summary"] !== "string" ||
      !("preview" in parsed) ||
      typeof (parsed as Record<string, unknown>)["preview"] !== "object"
    ) {
      return null;
    }
    const p = parsed as Record<string, unknown>;
    return {
      requiresConfirmation: true,
      proposalId: Number(p["proposalId"]),
      token: p["token"] as string,
      action: p["action"] as string,
      summary: p["summary"] as string,
      preview: (p["preview"] ?? {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
}

export function AskOsBubble({
  role,
  content,
  streaming,
  reduce,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  reduce: boolean;
}) {
  const [confirmedResult, setConfirmedResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [cancelled, setCancelled] = useState(false);

  if (role === "user") {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground shadow-sm">
          {content}
        </div>
      </motion.div>
    );
  }

  const confirmPayload = parseConfirmPayload(content);

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start gap-2"
    >
      <AnimatedLogo
        size={24}
        gradient
        className="mt-0.5 shrink-0 rounded-full"
      />
      <div className="min-w-0 max-w-[85%] rounded-2xl rounded-bl-sm border border-border bg-background px-3 py-2 text-sm text-foreground shadow-sm">
        {confirmPayload && !confirmedResult && !cancelled ? (
          <AskOsConfirmationCard
            action={confirmPayload.action}
            summary={confirmPayload.summary}
            preview={confirmPayload.preview}
            token={confirmPayload.token}
            onConfirmed={setConfirmedResult}
            onCancelled={() => setCancelled(true)}
          />
        ) : confirmedResult ? (
          <p className="text-xs text-muted-foreground">Action completed.</p>
        ) : cancelled ? (
          <p className="text-xs text-muted-foreground">Cancelled.</p>
        ) : content ? (
          <div className="break-words">
            <MarkdownContent content={content} />
          </div>
        ) : streaming ? (
          <TypingDots reduce={reduce} />
        ) : null}
      </div>
    </motion.div>
  );
}

export function TypingDots({ reduce }: { reduce: boolean }) {
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
