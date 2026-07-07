"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  MessageCircleIcon,
  UploadIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenTextIcon,
  MoveRightIcon,
} from "@animateicons/react/lucide";
import { StickyNote, Loader2 } from "lucide-react";
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
import { useKbAsk } from "@/hooks/api/kb/ask";
import {
  useKbSources,
  useUploadKbSource,
  useCreateKbSourceNote,
  useDeleteKbSource,
} from "@/hooks/api/kb/sources";
import { pageHref } from "@/features/knowledge-base/lib/knowledge-routes";
import { getErrorMessage } from "@/lib/api-client";
import type { KbAskResponse } from "@/types/kb";
import type { KbSource } from "@/hooks/api/kb/sources";

const SUGGESTIONS = [
  "Summarize the key points across my documents",
  "What processes are documented here?",
  "What do the uploaded files say about pricing?",
];

export default function KnowledgeBasePage() {
  const router = useRouter();

  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<KbAskResponse | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  const [noteOpen, setNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteText, setNoteText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ask = useKbAsk();
  const sourcesQuery = useKbSources();
  const uploadSource = useUploadKbSource();
  const createNote = useCreateKbSourceNote();
  const deleteSource = useDeleteKbSource();

  function runAsk(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setAskError(null);
    ask.mutate(
      { question: trimmed },
      {
        onSuccess: (data) => {
          setAskError(null);
          setResult(data);
        },
        onError: (error) => {
          const message = getErrorMessage(error);
          setResult(null);
          setAskError(message);
          toast.error("Couldn't get an answer", { description: message });
        },
      },
    );
  }

  function handleQuestionChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuestion(e.target.value);
  }

  function handleAsk() {
    runAsk(question);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAsk();
    }
  }

  function handleSuggestion(e: React.MouseEvent<HTMLButtonElement>) {
    const value = e.currentTarget.dataset.suggestion ?? "";
    setQuestion(value);
    runAsk(value);
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

  return (
    <PageWrapper
      eyebrow="Knowledge Base"
      title="Knowledge Base"
      subtitle="Upload files and notes, then ask questions answered from them and your wiki."
    >
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 space-y-4">
          <div className="rounded-2xl border border-border bg-gradient-to-b from-card to-muted/20 p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <MessageCircleIcon size={18} className="text-accent" />
              Ask your knowledge base
            </div>
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={handleQuestionChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your files, notes and wiki…"
                className="h-11 text-sm"
                autoFocus
              />
              <Button
                onClick={handleAsk}
                disabled={ask.isPending || !question.trim()}
                className="h-11 shrink-0 gap-1.5"
              >
                {ask.isPending ? "Asking…" : "Ask"}
                {!ask.isPending && <MoveRightIcon size={15} />}
              </Button>
            </div>

            {!result && !ask.isPending && (
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    data-suggestion={s}
                    onClick={handleSuggestion}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-accent hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {askError && !ask.isPending && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              {askError}
            </div>
          )}

          {ask.isPending && (
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Searching your knowledge base…
            </div>
          )}

          {result && !ask.isPending && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <MessageCircleIcon size={14} />
                Answer
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {result.answer}
              </p>

              {result.citations.length > 0 && (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Sources
                  </p>
                  <div className="space-y-1">
                    {result.citations.map((citation, index) => {
                      if (citation.kind === "page") {
                        return (
                          <button
                            key={`page-${citation.pageId}-${index}`}
                            type="button"
                            data-page-id={citation.pageId}
                            onClick={handleCitationClick}
                            className="flex w-full items-center gap-2 truncate rounded-md px-2 py-1.5 text-left text-sm text-accent transition-colors hover:bg-muted"
                          >
                            <BookOpenTextIcon size={14} className="shrink-0" />
                            <span className="truncate">
                              {citation.title || "Untitled"}
                            </span>
                            <Badge variant="outline" className="ml-auto shrink-0 text-[10px]">
                              Wiki
                            </Badge>
                          </button>
                        );
                      }
                      if (citation.kind === "source") {
                        return (
                          <div
                            key={`source-${citation.sourceId}-${index}`}
                            className="flex items-center gap-2 truncate rounded-md bg-muted/50 px-2 py-1.5 text-sm text-foreground"
                          >
                            <BookOpenTextIcon size={14} className="shrink-0 text-muted-foreground" />
                            <span className="truncate">
                              {citation.title || "Untitled"}
                            </span>
                            <Badge variant="secondary" className="ml-auto shrink-0 text-[10px]">
                              File
                            </Badge>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={`article-${citation.articleId}-${index}`}
                          className="flex items-center gap-2 truncate px-2 py-1.5 text-sm text-muted-foreground"
                        >
                          <BookOpenTextIcon size={14} className="shrink-0" />
                          <span className="truncate">
                            {citation.title || "Untitled"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <aside className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">
              Sources
              {sources.length > 0 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                  {readyCount}/{sources.length} ready
                </span>
              )}
            </h2>
          </div>

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
        description="Upload a file or add a note to ground AI answers on your content."
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

interface SourceRowProps {
  source: KbSource;
  onDelete: () => void;
  isDeleting: boolean;
}

function SourceRow({ source, onDelete, isDeleting }: SourceRowProps) {
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
