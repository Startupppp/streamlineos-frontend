import type { MouseEvent, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { AskAiHistoryMessage } from "@/hooks/api";
import { AiActionResultBody, type AiFailureState } from "@/components/ai";
import { Skeleton } from "@/components/ui/skeleton";
import type { AskOsDirective } from "./ask-os-directive-schema";
import type { AskOsClarificationAnswer } from "./ask-os-clarify-card";
import { AskOsStatusText, useAskOsPanelState } from "./ask-os-companion-state";
import type { SpeechPlaybackController } from "./use-browser-speech";
import {
  AskOsBubble,
  buildMsgRows,
  DaySeparator,
  dayKey,
  EmptyAskOs,
} from "./ask-os-chat-utils";

interface AskOsDraft {
  assistant: string;
  user: string;
}

interface AskOsChatViewProps {
  atBottom: boolean;
  draft: AskOsDraft | null;
  failure: AiFailureState | null;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isLoading: boolean;
  isStreaming: boolean;
  onJumpToLatest: () => void;
  onLoadOlder: () => void;
  onRetry: () => void;
  onScroll: () => void;
  onSuggestion: (event: MouseEvent<HTMLButtonElement>) => void;
  suggestions?: readonly string[];
  persisted: AskAiHistoryMessage[];
  reduce: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  showEmpty: boolean;
  topSentinelRef: RefObject<HTMLDivElement | null>;
  directives?: AskOsDirective[];
  onClarify?: (answer: AskOsClarificationAnswer) => void;
  speech: SpeechPlaybackController;
}

export function AskOsChatView({
  atBottom,
  draft,
  failure,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  isStreaming,
  onJumpToLatest,
  onLoadOlder,
  onRetry,
  onScroll,
  onSuggestion,
  suggestions,
  persisted,
  reduce,
  scrollRef,
  showEmpty,
  topSentinelRef,
  directives = [],
  onClarify,
  speech,
}: AskOsChatViewProps) {
  const panelState = useAskOsPanelState({ draft, failure, directives, persisted });
  const msgRows = buildMsgRows(persisted);
  const lastPersisted =
    persisted.length > 0 ? persisted[persisted.length - 1] : undefined;
  const draftNeedsToday =
    Boolean(draft) &&
    (!lastPersisted ||
      dayKey(lastPersisted.createdAt) !== dayKey(new Date().toISOString()));
  const showJump = !atBottom && !isLoading && !showEmpty;
  const awaitingReply = draft !== null && draft.assistant.length === 0;
  const showHistory = Boolean(draft) || !isLoading;
  const answerable = draft === null && !isStreaming ? lastPersisted?.id : undefined;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto overscroll-contain px-3 py-4 scrollbar-hide"
      >
        {!showHistory ? (
          <div className="mx-auto flex w-full max-w-[36rem] flex-col gap-4">
            <Skeleton className="ml-auto h-8 w-2/3 rounded-2xl" />
            <Skeleton className="h-16 w-4/5 rounded-2xl" />
            <Skeleton className="ml-auto h-8 w-1/2 rounded-2xl" />
          </div>
        ) : showEmpty ? (
          <EmptyAskOs onSuggestion={onSuggestion} suggestions={suggestions} />
        ) : (
          <div className="mx-auto w-full max-w-[36rem] space-y-4">
            {hasNextPage ? (
              <div ref={topSentinelRef} className="flex justify-center pb-1">
                {isFetchingNextPage ? (
                  <Skeleton className="h-6 w-28 rounded-full" />
                ) : (
                  <button
                    type="button"
                    onClick={onLoadOlder}
                    className="flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-dense font-medium text-muted-foreground transition-colors hover:bg-muted"
                  >
                    <ChevronUp className="h-3 w-3" />
                    Load older messages
                  </button>
                )}
              </div>
            ) : (
              persisted.length > 0 && (
                <p className="pb-1 text-center text-micro text-muted-foreground">
                  Beginning of conversation
                </p>
              )
            )}
            {msgRows.map((row) =>
              row.type === "sep" ? (
                <DaySeparator key={row.id} label={row.label} />
              ) : (
                <AskOsBubble
                  key={row.message.id}
                  role={row.message.role}
                  content={row.message.content}
                  streaming={false}
                  reduce={reduce}
                  live={row.message.id < 0}
                  onClarify={row.message.id === answerable ? onClarify : undefined}
                  speech={speech}
                  speechKey={`message-${row.message.id}`}
                />
              ),
            )}
            {draftNeedsToday && (
              <DaySeparator key="sep-draft-today" label="Today" />
            )}
            {draft && (
              <AskOsBubble
                key="draft-user"
                role="user"
                content={draft.user}
                streaming={false}
                reduce={reduce}
              />
            )}
            {draft && (
              <AskOsBubble
                key="draft-assistant"
                role="assistant"
                content={draft.assistant}
                streaming={isStreaming || awaitingReply}
                reduce={reduce}
                speech={speech}
                speechKey="draft-assistant"
                directives={directives}
              />
            )}
            {failure && (
              <AiActionResultBody state={failure} onRetry={onRetry} compact />
            )}
          </div>
        )}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-card/90">
        <AskOsStatusText state={panelState} />
      </div>
      <AnimatePresence>
        {showJump && (
          <motion.button
            type="button"
            onClick={onJumpToLatest}
            initial={reduce ? false : { opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.8 }}
            aria-label="Jump to latest"
            className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-md transition-colors hover:bg-muted"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
