import type { MouseEvent, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import type { AskAiHistoryMessage } from "@/hooks/api";
import { AiActionResultBody, type AiFailureState } from "@/components/ai";
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
  persisted: AskAiHistoryMessage[];
  reduce: boolean;
  scrollRef: RefObject<HTMLDivElement | null>;
  showEmpty: boolean;
  topSentinelRef: RefObject<HTMLDivElement | null>;
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
  persisted,
  reduce,
  scrollRef,
  showEmpty,
  topSentinelRef,
}: AskOsChatViewProps) {
  const msgRows = buildMsgRows(persisted);
  const lastPersisted =
    persisted.length > 0 ? persisted[persisted.length - 1] : undefined;
  const draftNeedsToday =
    Boolean(draft) &&
    (!lastPersisted ||
      dayKey(lastPersisted.createdAt) !== dayKey(new Date().toISOString()));
  const showJump = !atBottom && !isLoading && !showEmpty;

  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="absolute inset-0 overflow-y-auto overscroll-contain p-4 scrollbar-hide"
      >
        {isLoading ? (
          <div className="flex min-h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : showEmpty ? (
          <EmptyAskOs onSuggestion={onSuggestion} />
        ) : (
          <div className="space-y-4">
            {hasNextPage ? (
              <div ref={topSentinelRef} className="flex justify-center pb-1">
                {isFetchingNextPage ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
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
                <p className="pb-1 text-center text-micro text-muted-foreground/60">
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
                streaming={isStreaming}
                reduce={reduce}
              />
            )}
            {failure && (
              <AiActionResultBody state={failure} onRetry={onRetry} compact />
            )}
          </div>
        )}
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
