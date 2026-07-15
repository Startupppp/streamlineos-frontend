"use client";

import {
  UploadIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenTextIcon,
} from "@animateicons/react/lucide";
import { StickyNote, Loader2 } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { KbSource } from "@/hooks/api/kb/sources";

interface KbSourcesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: KbSource[];
  isLoading: boolean;
  readyCount: number;
  onUploadClick: () => void;
  uploadPending: boolean;
  onAddNoteClick: () => void;
  makeDeleteHandler: (id: number) => () => void;
  deletingId: number | undefined;
  isDeleting: boolean;
}

export function KbSourcesSheet({
  open,
  onOpenChange,
  sources,
  isLoading,
  readyCount,
  onUploadClick,
  uploadPending,
  onAddNoteClick,
  makeDeleteHandler,
  deletingId,
  isDeleting,
}: KbSourcesSheetProps) {
  const description =
    sources.length > 0
      ? `${readyCount} of ${sources.length} sources ready for AI answers`
      : "Upload files or add notes to ground answers on your content.";

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Sources"
      description={description}
      className="sm:max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onUploadClick}
            disabled={uploadPending}
          >
            <UploadIcon size={14} />
            {uploadPending ? "Uploading…" : "Upload"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5"
            onClick={onAddNoteClick}
          >
            <PlusIcon size={14} />
            Note
          </Button>
        </div>

        <SourcesList
          isLoading={isLoading}
          sources={sources}
          makeDeleteHandler={makeDeleteHandler}
          deletingId={deletingId}
          isDeleting={isDeleting}
        />
      </div>
    </AppSheet>
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
        className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
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
