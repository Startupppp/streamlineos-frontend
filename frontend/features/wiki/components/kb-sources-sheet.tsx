"use client";

import React from "react";
import {
  UploadIcon,
  PlusIcon,
  Trash2Icon,
  BookOpenTextIcon,
} from "@animateicons/react/lucide";
import { StickyNote, Loader2, Check, ShieldCheck } from "lucide-react";
import { AppSheet } from "@/components/shared/app-sheet";
import { TruncatedText } from "@/components/ui/truncated-text";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { KbSource } from "@/hooks/api/kb/sources";

interface KbSourcesSheetManageProps {
  mode: "manage";
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

interface KbSourcesSheetScopeProps {
  mode: "scope";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sources: KbSource[];
  isLoading: boolean;
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  verifiedOnly: boolean;
  onVerifiedOnlyChange: (verifiedOnly: boolean) => void;
  onConfirm: () => void;
}

export type KbSourcesSheetProps = KbSourcesSheetManageProps | KbSourcesSheetScopeProps;

export function KbSourcesSheet(props: KbSourcesSheetProps) {
  if (props.mode === "scope") {
    return <KbSourcesScopeSheet {...props} />;
  }
  return <KbSourcesManageSheet {...props} />;
}

function KbSourcesManageSheet({
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
}: Omit<KbSourcesSheetManageProps, "mode">) {
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

const SOURCE_KINDS = ["all", "file", "note"] as const;
type SourceKindFilter = (typeof SOURCE_KINDS)[number];

const KIND_LABELS: Record<SourceKindFilter, string> = { all: "All", file: "Files", note: "Notes" };

function KindFilterButton({
  kind,
  active,
  onSelect,
}: {
  kind: SourceKindFilter;
  active: boolean;
  onSelect: (kind: SourceKindFilter) => void;
}) {
  function handleClick() { onSelect(kind); }
  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "flex-1 rounded px-2 py-1 text-xs font-medium transition-colors",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {KIND_LABELS[kind]}
    </button>
  );
}

function KbSourcesScopeSheet({
  open,
  onOpenChange,
  sources,
  isLoading,
  selectedIds,
  onSelectionChange,
  verifiedOnly,
  onVerifiedOnlyChange,
  onConfirm,
}: Omit<KbSourcesSheetScopeProps, "mode">) {
  const [kindFilter, setKindFilter] = React.useState<SourceKindFilter>("all");

  const visibleSources = kindFilter === "all"
    ? sources
    : sources.filter((s) => s.kind === kindFilter);
  const readyVisible = visibleSources.filter((s) => s.status === "ready");
  const allSelected = readyVisible.length > 0 && readyVisible.every((s) => selectedIds.includes(s.id));
  const noneSelected = selectedIds.length === 0;

  const description = noneSelected
    ? "All ready sources will be searched. Select specific sources to narrow the answer."
    : `${selectedIds.length} source${selectedIds.length === 1 ? "" : "s"} selected — only these will be searched.`;

  function handleToggleAll() {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !readyVisible.some((s) => s.id === id)));
    } else {
      const toAdd = readyVisible.filter((s) => !selectedIds.includes(s.id)).map((s) => s.id);
      onSelectionChange([...selectedIds, ...toAdd]);
    }
  }

  function handleToggleSource(id: number) {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  }

  function handleKindFilter(kind: SourceKindFilter) {
    setKindFilter(kind);
  }

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Choose sources"
      description={description}
      className="sm:max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-1 rounded-md border border-border bg-muted p-1">
          {SOURCE_KINDS.map((kind) => (
            <KindFilterButton
              key={kind}
              kind={kind}
              active={kindFilter === kind}
              onSelect={handleKindFilter}
            />
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="verified-only-toggle" className="text-sm">
              Verified sources only
            </Label>
          </div>
          <Switch
            id="verified-only-toggle"
            checked={verifiedOnly}
            onCheckedChange={onVerifiedOnlyChange}
            aria-label="Restrict answer to verified sources only"
          />
        </div>

        {readyVisible.length > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {noneSelected ? "No filter — searching all sources" : `${selectedIds.length} of ${sources.filter((s) => s.status === "ready").length} selected`}
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleToggleAll}>
              {allSelected ? "Deselect all" : "Select all"}
            </Button>
          </div>
        )}

        <ScopeSourcesList
          isLoading={isLoading}
          sources={visibleSources}
          selectedIds={selectedIds}
          onToggle={handleToggleSource}
        />

        <Button
          className="w-full gap-1.5"
          onClick={onConfirm}
          aria-label={noneSelected ? "Search all sources" : `Search ${selectedIds.length} selected source${selectedIds.length === 1 ? "" : "s"}`}
        >
          <Check className="h-4 w-4" />
          {noneSelected ? "Search all sources" : `Search ${selectedIds.length} source${selectedIds.length === 1 ? "" : "s"}`}
        </Button>
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

interface ScopeSourcesListProps {
  isLoading: boolean;
  sources: KbSource[];
  selectedIds: number[];
  onToggle: (id: number) => void;
}

function ScopeSourcesList({ isLoading, sources, selectedIds, onToggle }: ScopeSourcesListProps) {
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
        description="Upload a file or add a note to see it here."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {sources.map((source) => (
        <ScopeSourceRow
          key={source.id}
          source={source}
          selectedIds={selectedIds}
          onToggle={onToggle}
        />
      ))}
    </ul>
  );
}

function ScopeSourceRow({
  source,
  selectedIds,
  onToggle,
}: {
  source: KbSource;
  selectedIds: number[];
  onToggle: (id: number) => void;
}) {
  const isReady = source.status === "ready";
  const isChecked = selectedIds.includes(source.id);
  function handleCheckedChange() { if (isReady) onToggle(source.id); }
  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm",
        !isReady && "opacity-50",
      )}
    >
      <Checkbox
        id={`scope-source-${source.id}`}
        checked={isChecked}
        disabled={!isReady}
        onCheckedChange={handleCheckedChange}
        aria-label={`Include ${source.title ?? "source"} in search`}
      />
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
        {source.kind === "file" ? (
          <BookOpenTextIcon size={16} className="text-muted-foreground" />
        ) : (
          <StickyNote className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <label
        htmlFor={`scope-source-${source.id}`}
        className="min-w-0 flex-1 cursor-pointer"
      >
        <TruncatedText text={source.title ?? ""} className="text-sm font-medium text-foreground" />
        <p className="text-xs text-muted-foreground">
          {source.chunkCount > 0 ? `${source.chunkCount} chunks` : "—"}
        </p>
      </label>
      <SourceStatusBadge source={source} />
    </li>
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
        <TruncatedText text={source.title ?? ""} className="text-sm font-medium text-foreground" />
        <p className="text-xs text-muted-foreground">
          {source.chunkCount > 0 ? `${source.chunkCount} chunks` : "—"}
        </p>
      </div>

      <SourceStatusBadge source={source} />

      <LoadingButton
        variant="ghost"
        size="icon"
        className="w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={onDelete}
        isPending={isDeleting}
        aria-label="Delete source"
      >
        {!isDeleting && <Trash2Icon size={14} />}
      </LoadingButton>
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
