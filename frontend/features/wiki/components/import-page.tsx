"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { TruncatedText } from "@/components/ui/truncated-text";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useCan } from "@/hooks/api/access";
import { useKbPagesTree } from "@/hooks/api/kb";
import { useImportKbPages, useKbImportJobs } from "@/hooks/api/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import { KNOWLEDGE_BASE } from "@/features/wiki/lib/knowledge-routes";
import {
  KbUploadIcon,
  KbFileTextIcon,
  KbClipboardIcon,
  KbXIcon,
  KbTriangleAlertIcon,
} from "@/features/wiki/lib/kb-icons";
import { ExportJobsCard } from "./export-jobs-card";
import { kbTimeAgo } from "@/features/wiki/lib/kb-date-utils";
import type { KbImportJob } from "@/hooks/api/kb/import-export";

type ParsedItem = {
  title: string;
  contentText: string;
  sizeBytes: number;
};

type SourceMode = "files" | "paste";

function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function ImportJobRow({ job }: { job: KbImportJob }) {
  const sourceLabel =
    job.sourceType === "markdown"
      ? "Markdown"
      : job.sourceType === "html"
        ? "HTML"
        : "ZIP";

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-card text-sm">
      <KbFileTextIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <TruncatedText text={`${sourceLabel} import`} className="flex-1" />
      <span className="text-xs text-muted-foreground">
        {job.succeededItems}/{job.totalItems} pages
      </span>
      <Badge
        variant={
          job.status === "completed"
            ? "secondary"
            : job.status === "failed"
              ? "destructive"
              : "outline"
        }
        className="text-[10px] h-4 px-1.5"
      >
        {job.status}
      </Badge>
      <span className="text-xs text-muted-foreground shrink-0">
        {kbTimeAgo(job.createdAt)}
      </span>
    </div>
  );
}

export default function ImportPage() {
  const canImport = useCan("kb:pages:import");
  const { data: treeNodes = [] } = useKbPagesTree();
  const importMutation = useImportKbPages();
  const { data: importJobs = [], isLoading: jobsLoading } = useKbImportJobs();

  const [mode, setMode] = useState<SourceMode>("files");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingTitles = new Set(treeNodes.map((n) => n.title.toLowerCase()));

  function hasDupe(title: string): boolean {
    return existingTitles.has(title.toLowerCase());
  }

  const handleFilesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const remaining = 100 - items.length;
      const toProcess = files.slice(0, remaining);

      let completed = 0;
      const newItems: ParsedItem[] = [];

      toProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const text = (ev.target?.result as string) ?? "";
          const title = file.name.replace(/\.(md|markdown|txt)$/i, "");
          newItems.push({ title, contentText: text, sizeBytes: file.size });
          completed++;
          if (completed === toProcess.length) {
            setItems((prev) => [...prev, ...newItems].slice(0, 100));
          }
        };
        reader.readAsText(file);
      });

      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [items.length],
  );

  function handleChooseFiles() {
    fileInputRef.current?.click();
  }

  function handleAddPaste() {
    const title = pasteTitle.trim();
    if (!title) {
      toast.error("A title is required");
      return;
    }
    if (items.length >= 100) {
      toast.error("Maximum 100 items reached");
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        title,
        contentText: pasteText,
        sizeBytes: new TextEncoder().encode(pasteText).length,
      },
    ]);
    setPasteTitle("");
    setPasteText("");
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  function handleClearAll() {
    setItems([]);
  }

  function handleImport() {
    if (items.length === 0) return;
    importMutation.mutate(
      {
        items: items.map(({ title, contentText }) => ({ title, contentText })),
        sourceType: "markdown",
      },
      {
        onSuccess: (result) => {
          toast.success(
            `Imported ${result.succeeded} page${result.succeeded === 1 ? "" : "s"}${result.failed > 0 ? ` (${result.failed} failed)` : ""}`,
            {
              action: {
                label: "View wiki",
                onClick: () => window.location.assign(KNOWLEDGE_BASE),
              },
            },
          );
          setItems([]);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  function handleModeChange(newMode: SourceMode) {
    setMode(newMode);
    setItems([]);
    setPasteTitle("");
    setPasteText("");
  }

  if (!canImport) {
    return (
      <PageWrapper title="Import & Export">
        <EmptyState
          illustration={
            <KbUploadIcon className="w-8 text-muted-foreground/40" />
          }
          title="Access denied"
          description="You don't have permission to import pages. Ask an admin to grant kb:pages:import."
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Import & Export">
      <div className="space-y-4">
        <PageSection title="Import Pages">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={mode === "files" ? "default" : "outline"}
                onClick={() => handleModeChange("files")}
                className="gap-1.5"
              >
                <KbUploadIcon className="h-3.5 w-3.5" />
                Markdown files
              </Button>
              <Button
                size="sm"
                variant={mode === "paste" ? "default" : "outline"}
                onClick={() => handleModeChange("paste")}
                className="gap-1.5"
              >
                <KbClipboardIcon className="h-3.5 w-3.5" />
                Paste text
              </Button>
            </div>

            {mode === "files" && (
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".md,.markdown,.txt"
                  className="hidden"
                  onChange={handleFilesChange}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleChooseFiles}
                  disabled={items.length >= 100}
                  className=""
                >
                  Choose files…
                </Button>
                <span className="text-xs text-muted-foreground">
                  {items.length}/100 files loaded
                </span>
              </div>
            )}

            {mode === "paste" && (
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Page title</Label>
                  <Input
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    placeholder="Untitled page"
                    className="text-sm"
                    maxLength={500}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Content</Label>
                  <Textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your content here…"
                    className="min-h-28 text-sm resize-none"
                    maxLength={50000}
                  />
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddPaste}
                  disabled={!pasteTitle.trim() || items.length >= 100}
                  className=""
                >
                  Add to list
                </Button>
              </div>
            )}

            {items.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground font-medium">
                    {items.length} page{items.length === 1 ? "" : "s"} to import
                  </p>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleClearAll}
                    className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear all
                  </Button>
                </div>

                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-1.5 bg-muted/30 text-[11px] font-medium text-muted-foreground">
                    <span>Title</span>
                    <span>Size</span>
                    <span>Status</span>
                    <span />
                  </div>
                  <div className="divide-y divide-border">
                    {items.map((item, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 items-center px-3 py-2 text-sm"
                      >
                        <TruncatedText text={item.title || "Untitled"} className="font-medium" />
                        <span className="text-xs text-muted-foreground">
                          {sizeLabel(item.sizeBytes)}
                        </span>
                        <span className="w-20">
                          {hasDupe(item.title) && (
                            <span className="flex items-center gap-1 text-xs text-amber-600">
                              <KbTriangleAlertIcon className="h-3 w-3" />
                              Duplicate
                            </span>
                          )}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          aria-label="Remove"
                        >
                          <KbXIcon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <LoadingButton
                  size="sm"
                  onClick={handleImport}
                  isPending={importMutation.isPending}
                  loadingText="Importing…"
                  className="gap-1.5"
                >
                  <KbUploadIcon className="h-3.5 w-3.5" />
                  Import {items.length} page{items.length === 1 ? "" : "s"}
                </LoadingButton>
              </div>
            )}
          </div>
        </PageSection>

        <PageSection title="Import History">
          {jobsLoading && (
            <div className="space-y-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full rounded-lg" />
              ))}
            </div>
          )}

          {!jobsLoading && importJobs.length === 0 && (
            <EmptyState
              compact
              illustration={
                <KbFileTextIcon className="h-5 w-5 text-muted-foreground/40" />
              }
              title="No imports yet"
              description="Import history will appear here after your first import."
            />
          )}

          {!jobsLoading && importJobs.length > 0 && (
            <div className="space-y-1.5">
              {importJobs.map((job) => (
                <ImportJobRow key={job.id} job={job} />
              ))}
              <p className="text-xs text-muted-foreground pt-1">
                Imported pages appear in the{" "}
                <Link
                  href={KNOWLEDGE_BASE}
                  className="underline underline-offset-2"
                >
                  wiki
                </Link>
                .
              </p>
            </div>
          )}
        </PageSection>

        <ExportJobsCard />
      </div>
    </PageWrapper>
  );
}
