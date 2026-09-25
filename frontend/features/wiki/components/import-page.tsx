"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { useImportKbPages, useKbImportJob, useCancelImportJob } from "@/hooks/api/kb";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { getErrorMessage } from "@/lib/get-error-message";
import { KB_IMPORT, KNOWLEDGE_BASE } from "@/lib/knowledge-routes";
import { KbUploadIcon, KbClipboardIcon } from "@/features/wiki/lib/kb-icons";
import { ExportJobsCard } from "./export-jobs-card";
import { ImportHistorySection } from "./import-history-section";
import { ImportPendingList, type ImportPendingItem } from "./import-pending-list";

const VALID_TABS = ["import", "export"] as const;
type ImportExportTab = (typeof VALID_TABS)[number];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function resolveTab(tabParam: string | null): ImportExportTab {
  return VALID_TABS.find((t) => t === tabParam) ?? "import";
}

export default function ImportPage() {
  const canImport = useCan("kb:pages:import");
  const canExport = useCan("kb:pages:export");
  const importMutation = useImportKbPages();
  const cancelMutation = useCancelImportJob();
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = resolveTab(searchParams.get("tab"));
  const activeTab =
    requestedTab === "import" && !canImport
      ? "export"
      : requestedTab === "export" && !canExport
        ? "import"
        : requestedTab;

  const [items, setItems] = useState<ImportPendingItem[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [targetSpaceId, setTargetSpaceId] = useState<string>("none");
  const [visibility, setVisibility] = useState<"private" | "org" | "public">("org");
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "update">("skip");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);

  const { data: activeJob } = useKbImportJob(activeJobId);
  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === "completed") {
      toast.success(
        `Imported ${activeJob.succeededItems} page${activeJob.succeededItems === 1 ? "" : "s"}${activeJob.failedItems > 0 ? ` (${activeJob.failedItems} failed)` : ""}`,
        {
          action: {
            label: "View wiki",
            onClick: () => window.location.assign(KNOWLEDGE_BASE),
          },
        },
      );
      setItems([]);
      setActiveJobId(null);
    } else if (activeJob.status === "failed") {
      const report = activeJob.errorReport;
      const failedTitles =
        report !== null &&
        typeof report === "object" &&
        "failedTitles" in report &&
        Array.isArray(report.failedTitles)
          ? (report.failedTitles as string[])
          : [];
      toast.error(
        failedTitles.length > 0
          ? `Import failed — ${failedTitles.length} page${failedTitles.length === 1 ? "" : "s"} could not be imported`
          : "Import failed",
      );
      setActiveJobId(null);
    } else if (activeJob.status === "cancelled") {
      toast.info("Import cancelled");
      setActiveJobId(null);
    }
  }, [activeJob?.status, activeJob?.succeededItems, activeJob?.failedItems, activeJob?.errorReport, activeJob?.id]);

  function titleExists(title: string): boolean {
    return items.filter((i) => i.title === title).length > 1;
  }

  const handleFilesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const oversized = files.filter((f) => f.size > MAX_FILE_BYTES);
      if (oversized.length > 0) {
        toast.error(
          `${oversized.length} file${oversized.length === 1 ? "" : "s"} exceed the 5 MB limit and were skipped: ${oversized.map((f) => f.name).join(", ")}`,
        );
      }

      const validFiles = files.filter((f) => f.size <= MAX_FILE_BYTES);
      const remaining = 100 - items.length;
      const toProcess = validFiles.slice(0, remaining);

      if (validFiles.length > remaining) {
        toast.error(
          `Only ${remaining} file${remaining === 1 ? "" : "s"} added — ${validFiles.length - remaining} skipped to stay within the 100-item limit`,
        );
      }

      if (toProcess.length === 0) {
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      let completed = 0;
      const newItems: ImportPendingItem[] = [];

      toProcess.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result;
          const text = typeof result === "string" ? result : "";
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

  function handleShowPaste() {
    setShowPaste(true);
  }

  function handlePasteTitleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setPasteTitle(event.target.value);
  }

  function handlePasteTextChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    setPasteText(event.target.value);
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
    setShowPaste(false);
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleClearAll() {
    setItems([]);
  }

  function handleTargetSpaceChange(value: string) {
    setTargetSpaceId(value);
  }

  function handleVisibilityChange(value: string) {
    setVisibility(value as "private" | "org" | "public");
  }

  function handleDuplicatePolicyChange(value: string) {
    setDuplicatePolicy(value as "skip" | "update");
  }

  function handleImport() {
    if (items.length === 0) return;
    importMutation.mutate(
      {
        items: items.map(({ title, contentText }) => ({ title, contentText })),
        sourceType: "markdown",
        spaceId: targetSpaceId === "none" ? undefined : Number(targetSpaceId),
        visibility,
        duplicatePolicy,
      },
      {
        onSuccess: (result) => {
          setActiveJobId(result.jobId);
        },
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  function handleCancelImport() {
    if (activeJobId === null) return;
    cancelMutation.mutate(activeJobId, {
      onSuccess: (result) => {
        toast.info(result.message);
      },
      onError: (err) => {
        toast.error(getErrorMessage(err));
      },
    });
  }

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "import") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(qs ? `${KB_IMPORT}?${qs}` : KB_IMPORT, { scroll: false });
  }

  if (!canImport && !canExport) {
    return (
      <PageWrapper title="Import & Export">
        <EmptyState
          illustration={
            <KbUploadIcon className="w-8 text-muted-foreground" />
          }
          title="Access denied"
          description="You don't have permission to import or export pages. Ask an admin to grant kb:pages:import or kb:pages:export."
        />
      </PageWrapper>
    );
  }

  const isImportTab = activeTab === "import";
  const isProcessing =
    activeJobId !== null &&
    (activeJob?.status === "pending" || activeJob?.status === "processing");

  return (
    <PageWrapper
      title="Import & Export"
      subtitle={isImportTab ? `${items.length}/100 files loaded` : "Per-page export lives on each wiki page's menu"}
      actionsInline
      contentClassName="flex min-h-0 flex-1 flex-col"
      actions={
        isImportTab ? (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".md,.markdown,.txt"
              className="hidden"
              onChange={handleFilesChange}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleShowPaste}
              disabled={isProcessing}
            >
              <KbClipboardIcon className="mr-1.5 h-3.5 w-3.5" />
              Paste text
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleChooseFiles}
              disabled={items.length >= 100 || isProcessing}
            >
              Choose files
            </Button>
          </>
        ) : undefined
      }
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList>
          {canImport ? <TabsTrigger value="import">Import</TabsTrigger> : null}
          {canExport ? <TabsTrigger value="export">Export</TabsTrigger> : null}
        </TabsList>

        <TabsContent value="import" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Accepts .md, .markdown and .txt files · 5 MB per file · max 100 pages per import. Pasted text has a 50,000 character limit. Set a duplicate policy to control what happens when a page title already exists.
            </p>

            {isProcessing ? (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
                  <span className="text-sm text-muted-foreground">
                    {activeJob?.status === "processing" ? "Processing import…" : "Import queued…"}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelImport}
                  disabled={cancelMutation.isPending}
                >
                  Cancel
                </Button>
              </div>
            ) : null}

            {showPaste || items.length > 0 ? (
              <PageSection title="Import Pages">
                <div className="space-y-4">
                  {showPaste ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label htmlFor="import-paste-title" className="text-xs">
                          Page title
                        </Label>
                        <Input
                          id="import-paste-title"
                          value={pasteTitle}
                          onChange={handlePasteTitleChange}
                          placeholder="Untitled page"
                          className="text-sm"
                          maxLength={500}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="import-paste-content" className="text-xs">
                          Content
                        </Label>
                        <Textarea
                          id="import-paste-content"
                          value={pasteText}
                          onChange={handlePasteTextChange}
                          placeholder="Paste your content here…"
                          className="min-h-28 text-sm resize-none"
                          maxLength={50000}
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleAddPaste}
                        disabled={!pasteTitle.trim() || items.length >= 100}
                      >
                        Add to list
                      </Button>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Target space</Label>
                      <Select value={targetSpaceId} onValueChange={handleTargetSpaceChange}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="No space" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No space</SelectItem>
                          {spaces.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.icon ? `${s.icon} ` : ""}
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Default visibility</Label>
                      <Select value={visibility} onValueChange={handleVisibilityChange}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="org">Team</SelectItem>
                          <SelectItem value="public">Public</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duplicate items</Label>
                      <Select value={duplicatePolicy} onValueChange={handleDuplicatePolicyChange}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="skip">Skip duplicates</SelectItem>
                          <SelectItem value="update">Update duplicates</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <ImportPendingList
                    items={items}
                    isImporting={importMutation.isPending || isProcessing}
                    onClearAll={handleClearAll}
                    onImport={handleImport}
                    onRemove={handleRemoveItem}
                    titleExists={titleExists}
                  />
                </div>
              </PageSection>
            ) : null}

            <ImportHistorySection />
          </div>
        </TabsContent>

        <TabsContent value="export" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <ExportJobsCard />
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
