"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import {
  MessageCircleIcon,
  UploadIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenTextIcon,
} from "@animateicons/react/lucide";
import { StickyNote, Loader2, Send } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { cn } from "@/lib/utils";
import { useKbAsk } from "@/hooks/api/kb/ask";
import {
  useKbSources,
  useUploadKbSource,
  useCreateKbSourceNote,
  useDeleteKbSource,
} from "@/hooks/api/kb/sources";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import { getErrorMessage } from "@/lib/api-client";
import type { KbAskCitation } from "@/types/kb";
import type { KbSource } from "@/hooks/api/kb/sources";

const SUGGESTIONS = [
  "Summarize the key points across my documents",
  "What processes are documented here?",
  "What do the uploaded files say?",
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: KbAskCitation[];
  isError?: boolean;
}

export default function KnowledgeBasePage() {
  const router = useRouter();
  const reduce = useReducedMotion();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);

  const ask = useKbAsk();
  const sourcesQuery = useKbSources();
  const uploadSource = useUploadKbSource();
  const createNote = useCreateKbSourceNote();
  const deleteSource = useDeleteKbSource();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, ask.isPending, reduce]);

  function nextId() {
    idRef.current += 1;
    return String(idRef.current);
  }

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || ask.isPending) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: "user", content: trimmed },
    ]);
    ask.mutate(
      { question: trimmed },
      {
        onSuccess: (data) =>
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: "assistant",
              content: data.answer,
              citations: data.citations,
            },
          ]),
        onError: (error) => {
          const message = getErrorMessage(error);
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: "assistant", content: message, isError: true },
          ]);
          toast.error("Couldn't get an answer", { description: message });
        },
      },
    );
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleSend() {
    sendMessage(input);
  }

  function handleSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    sendMessage(e.currentTarget.dataset.suggestion ?? "");
  }

  function handleCitationClick(e: React.MouseEvent<HTMLButtonElement>) {
    const pageId = Number(e.currentTarget.dataset.pageId);
    if (pageId) router.push(pageHref(pageId));
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    uploadSource.mutate(file, {
      onSuccess: () => toast.success("File uploaded and queued for processing"),
      onError: (error) =>
        toast.error("Upload failed", { description: getErrorMessage(error) }),
    });
  }

  function handleAddNoteClick() {
    setNoteTitle("");
    setNoteText("");
    setNoteOpen(true);
  }

  function handleNoteTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setNoteTitle(e.target.value);
  }

  function handleNoteTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setNoteText(e.target.value);
  }

  function handleNoteSave() {
    const title = noteTitle.trim();
    const text = noteText.trim();
    if (!title || !text) return;
    createNote.mutate(
      { title, text },
      {
        onSuccess: () => {
          toast.success("Note added");
          setNoteOpen(false);
        },
        onError: (error) =>
          toast.error("Failed to add note", { description: getErrorMessage(error) }),
      },
    );
  }

  function handleNoteOpenChange(open: boolean) {
    setNoteOpen(open);
  }

  function makeDeleteHandler(id: number) {
    return function handleDeleteSource() {
      deleteSource.mutate(id, {
        onSuccess: () => toast.success("Source removed"),
        onError: (error) =>
          toast.error("Delete failed", { description: getErrorMessage(error) }),
      });
    };
  }

  const sources = sourcesQuery.data ?? [];
  const readyCount = sources.filter((s) => s.status === "ready").length;
  const isEmpty = messages.length === 0 && !ask.isPending;

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Knowledge Base"
      subtitle="Chat with your files, notes and wiki — answers are grounded in your content."
    >
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex h-[calc(100vh-13rem)] min-h-[440px] min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {isEmpty ? (
              <EmptyChat onSuggestion={handleSuggestion} />
            ) : (
              <AnimatePresence initial={false}>
                {messages.map((message) => (
                  <ChatBubble
                    key={message.id}
                    message={message}
                    onCitation={handleCitationClick}
                    reduce={Boolean(reduce)}
                  />
                ))}
              </AnimatePresence>
            )}
            {ask.isPending && <TypingBubble reduce={Boolean(reduce)} />}
            <div ref={bottomRef} />
          </div>

          <div className="shrink-0 border-t border-border bg-background/60 p-3">
            <div className="flex items-center gap-2">
              <Input
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your files, notes and wiki…"
                className="h-11 rounded-xl text-sm"
                autoFocus
              />
              <Button
                onClick={handleSend}
                disabled={ask.isPending || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-xl p-0"
                aria-label="Send"
              >
                <motion.span whileTap={reduce ? undefined : { scale: 0.85 }}>
                  <Send className="h-4 w-4" />
                </motion.span>
              </Button>
            </div>
          </div>
        </div>

        <aside className="min-w-0 space-y-3">
          <h2 className="text-sm font-semibold text-foreground">
            Sources
            {sources.length > 0 && (
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                {readyCount}/{sources.length} ready
              </span>
            )}
          </h2>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.md,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleUploadClick}
              disabled={uploadSource.isPending}
            >
              <UploadIcon size={14} />
              {uploadSource.isPending ? "Uploading…" : "Upload"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1.5"
              onClick={handleAddNoteClick}
            >
              <PlusIcon size={14} />
              Note
            </Button>
          </div>

          <SourcesList
            isLoading={sourcesQuery.isLoading}
            sources={sources}
            makeDeleteHandler={makeDeleteHandler}
            deletingId={deleteSource.variables}
            isDeleting={deleteSource.isPending}
          />
        </aside>
      </div>

      <Dialog open={noteOpen} onOpenChange={handleNoteOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              placeholder="Note title"
              value={noteTitle}
              onChange={handleNoteTitleChange}
            />
            <Textarea
              placeholder="Paste or type the content you want the AI to learn…"
              value={noteText}
              onChange={handleNoteTextChange}
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button
              onClick={handleNoteSave}
              disabled={
                createNote.isPending || !noteTitle.trim() || !noteText.trim()
              }
            >
              {createNote.isPending ? "Saving…" : "Save note"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

function EmptyChat({
  onSuggestion,
}: {
  onSuggestion: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <MessageCircleIcon size={24} />
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          Ask your knowledge base
        </p>
        <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
          Answers are grounded in your uploaded files, notes and wiki pages.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            data-suggestion={s}
            onClick={onSuggestion}
            className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function ChatBubble({
  message,
  onCitation,
  reduce,
}: {
  message: ChatMessage;
  onCitation: (e: React.MouseEvent<HTMLButtonElement>) => void;
  reduce: boolean;
}) {
  const isUser = message.role === "user";
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={cn("flex", isUser ? "justify-end" : "justify-start")}
    >
      {isUser ? (
        <div className="max-w-[80%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground shadow-sm">
          {message.content}
        </div>
      ) : (
        <div className="flex max-w-[88%] gap-2">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
            <MessageCircleIcon size={15} />
          </div>
          <div
            className={cn(
              "min-w-0 rounded-2xl rounded-bl-sm border px-3.5 py-2.5 text-sm shadow-sm",
              message.isError
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-background text-foreground",
            )}
          >
            {message.isError ? (
              <p className="leading-relaxed">{message.content}</p>
            ) : (
              <div className="break-words">
                <MarkdownContent content={message.content} />
              </div>
            )}
            {message.citations && message.citations.length > 0 && (
              <Citations citations={message.citations} onCitation={onCitation} />
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Citations({
  citations,
  onCitation,
}: {
  citations: KbAskCitation[];
  onCitation: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-border/60 pt-2.5">
      {citations.map((citation, index) => {
        if (citation.kind === "page") {
          return (
            <button
              key={`page-${citation.pageId}-${index}`}
              type="button"
              data-page-id={citation.pageId}
              onClick={onCitation}
              className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-accent transition-colors hover:bg-muted"
            >
              <BookOpenTextIcon size={11} />
              <span className="truncate">{citation.title || "Untitled"}</span>
            </button>
          );
        }
        if (citation.kind === "source") {
          return (
            <span
              key={`source-${citation.sourceId}-${index}`}
              className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              <BookOpenTextIcon size={11} />
              <span className="truncate">{citation.title || "Untitled"}</span>
            </span>
          );
        }
        return (
          <span
            key={`article-${citation.articleId}-${index}`}
            className="inline-flex max-w-[12rem] items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            <span className="truncate">{citation.title || "Untitled"}</span>
          </span>
        );
      })}
    </div>
  );
}

function TypingBubble({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-start"
    >
      <div className="flex gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
          <MessageCircleIcon size={15} />
        </div>
        <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-border bg-background px-4 py-3 shadow-sm">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
              animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface SourcesListProps {
  isLoading: boolean;
  sources: KbSource[];
  makeDeleteHandler: (id: number) => () => void;
  deletingId: number | undefined;
  isDeleting: boolean;
}

function SourcesList({
  isLoading,
  sources,
  makeDeleteHandler,
  deletingId,
  isDeleting,
}: SourcesListProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (sources.length === 0) {
    return (
      <EmptyState
        illustrationPreset="knowledge"
        title="No sources yet"
        description="Upload a file or add a note to ground answers on your content."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {sources.map((source) => (
        <SourceRow
          key={source.id}
          source={source}
          onDelete={makeDeleteHandler(source.id)}
          isDeleting={isDeleting && deletingId === source.id}
        />
      ))}
    </ul>
  );
}

function SourceRow({
  source,
  onDelete,
  isDeleting,
}: {
  source: KbSource;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {source.kind === "file" ? (
          <BookOpenTextIcon size={16} className="text-muted-foreground" />
        ) : (
          <StickyNote className="h-4 w-4 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {source.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {source.chunkCount > 0 ? `${source.chunkCount} chunks` : "—"}
        </p>
      </div>

      <SourceStatusBadge source={source} />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        disabled={isDeleting}
        aria-label="Delete source"
      >
        {isDeleting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Trash2Icon size={14} />
        )}
      </Button>
    </li>
  );
}

function SourceStatusBadge({ source }: { source: KbSource }) {
  if (source.status === "processing") {
    return (
      <Badge variant="secondary" className="shrink-0 gap-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        Processing
      </Badge>
    );
  }
  if (source.status === "failed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="shrink-0 cursor-default">
            Failed
          </Badge>
        </TooltipTrigger>
        {source.errorMessage ? (
          <TooltipContent>{source.errorMessage}</TooltipContent>
        ) : null}
      </Tooltip>
    );
  }
  return (
    <Badge variant="default" className="shrink-0">
      Ready
    </Badge>
  );
}
