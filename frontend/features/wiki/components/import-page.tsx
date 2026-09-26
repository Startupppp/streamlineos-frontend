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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { useCan, useCanState } from "@/hooks/api/access";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import {
  useImportKbPages,
  useKbImportJob,
  useCancelImportJob,
  useDryRunImport,
  type ImportDryRunResult,
} from "@/hooks/api/kb";
import { useKbPageTreeInfinite } from "@/hooks/api/kb/pages";
import { useKbSpaces } from "@/hooks/api/kb/spaces";
import { getErrorMessage } from "@/lib/get-error-message";
import { KB_IMPORT, KNOWLEDGE_BASE } from "@/lib/knowledge-routes";
import { KbUploadIcon, KbClipboardIcon } from "@/features/wiki/lib/kb-icons";
import { ExportJobsCard } from "./export-jobs-card";
import { ImportHistorySection } from "./import-history-section";
import { ImportPendingList, type ImportPendingItem } from "./import-pending-list";
import { ImportDryRunCard } from "./import-dry-run-card";
import { ImportFailedTitlesAlert } from "./import-failed-titles-alert";
import { ImportFormControls } from "./import-form-controls";

const VALID_TABS = ["import", "export"] as const;
type ImportExportTab = (typeof VALID_TABS)[number];

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function resolveTab(tabParam: string | null): ImportExportTab {
  return VALID_TABS.find((t) => t === tabParam) ?? "import";
}

export default function ImportPage() {
  const canImport = useCan("kb:pages:import");
  const canExport = useCan("kb:pages:export");
  const importAccess = useCanState("kb:pages:import");
  const exportAccess = useCanState("kb:pages:export");
  const importMutation = useImportKbPages();
  const cancelMutation = useCancelImportJob();
  const dryRunMutation = useDryRunImport();
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
  const [targetParentPageId, setTargetParentPageId] = useState<string>("none");
  const [visibility, setVisibility] = useState<"private" | "org" | "public">("org");
  const [duplicatePolicy, setDuplicatePolicy] = useState<"skip" | "update">("skip");
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [dryRunResult, setDryRunResult] = useState<ImportDryRunResult | null>(null);
  const [completedFailedTitles, setCompletedFailedTitles] = useState<string[]>([]);

  const { data: activeJob } = useKbImportJob(activeJobId);
  const { data: spacesPage } = useKbSpaces();
  const spaces = spacesPage?.data ?? [];

  const selectedSpaceId = targetSpaceId === "none" ? undefined : Number(targetSpaceId);
  const parentPagesQuery = useKbPageTreeInfinite({ spaceId: selectedSpaceId });
  const parentPages = parentPagesQuery.data?.pages.flatMap((p) => p.data) ?? [];

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDryRunResult(null);
  }, [items]);

  useEffect(() => {
    if (!activeJob) return;
    if (activeJob.status === "completed") {
      const report = activeJob.errorReport;
      const titles: string[] = [];
      if (report && typeof report === "object" && "failedTitles" in report && Array.isArray(report.failedTitles)) {
        for (const t of report.failedTitles) if (typeof t === "string") titles.push(t);
      }
      if (titles.length > 0) setCompletedFailedTitles(titles);
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

  function handleChooseFiles() { fileInputRef.current?.click(); }
  function handleShowPaste() { setShowPaste(true); }

  function handlePasteTitleChange(e: React.ChangeEvent<HTMLInputElement>) { setPasteTitle(e.target.value); }
  function handlePasteTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) { setPasteText(e.target.value); }

  function handleAddPaste() {
    const title = pasteTitle.trim();
    if (!title) { toast.error("A title is required"); return; }
    if (items.length >= 100) { toast.error("Maximum 100 items reached"); return; }
    setItems((prev) => [...prev, { title, contentText: pasteText, sizeBytes: new TextEncoder().encode(pasteText).length }]);
    setPasteTitle("");
    setPasteText("");
    setShowPaste(false);
  }

  function handleRemoveItem(index: number) { setItems((prev) => prev.filter((_, i) => i !== index)); }
  function handleClearAll() { setItems([]); setCompletedFailedTitles([]); }
  function handleTargetSpaceChange(value: string) { setTargetSpaceId(value); setTargetParentPageId("none"); }
  function handleParentPageChange(value: string) { setTargetParentPageId(value); }
  function handleVisibilityChange(value: string) {
    if (value === "private" || value === "org" || value === "public") setVisibility(value);
  }
  function handleDuplicatePolicyChange(value: string) {
    if (value === "skip" || value === "update") setDuplicatePolicy(value);
  }
  function handleDismissDryRun() { setDryRunResult(null); }
  function handleDismissFailedTitles() { setCompletedFailedTitles([]); }

  function handleDryRun() {
    if (items.length === 0) return;
    dryRunMutation.mutate(
      {
        items: items.map(({ title, contentText }) => ({ title, contentText })),
        sourceType: "markdown",
        spaceId: selectedSpaceId,
        visibility,
        duplicatePolicy,
      },
      {
        onSuccess: setDryRunResult,
        onError: (err) => {
          toast.error(getErrorMessage(err));
        },
      },
    );
  }

  function handleImport() {
    if (items.length === 0) return;
    setCompletedFailedTitles([]);
    const parentId = targetParentPageId !== "none" ? Number(targetParentPageId) : undefined;
    importMutation.mutate(
      {
        items: items.map(({ title, contentText }) => ({
          title,
          contentText,
          ...(parentId !== undefined ? { parentPageId: parentId } : {}),
        })),
        sourceType: "markdown",
        spaceId: selectedSpaceId,
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

  if (importAccess === "denied" && exportAccess === "denied") {
    return (
      <PageWrapper title="Import & Export">
        <NoPermissionState
          permission="kb:pages:import"
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
            {items.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDryRun}
                disabled={isProcessing || dryRunMutation.isPending}
              >
                Preview import
              </Button>
            ) : null}
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
          {importAccess === "denied" ? null : (
            <TabsTrigger value="import">Import</TabsTrigger>
          )}
          {exportAccess === "denied" ? null : (
            <TabsTrigger value="export">Export</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="import" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Accepts .md, .markdown and .txt files · 5 MB per file · max 100 pages per import. Pasted text has a 50,000 character limit. Set a duplicate policy to control what happens when a page title already exists.
            </p>

            {completedFailedTitles.length > 0 ? (
              <ImportFailedTitlesAlert
                titles={completedFailedTitles}
                onDismiss={handleDismissFailedTitles}
              />
            ) : null}

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

                  <ImportFormControls
                    spaces={spaces}
                    parentPages={parentPages}
                    targetSpaceId={targetSpaceId}
                    targetParentPageId={targetParentPageId}
                    visibility={visibility}
                    duplicatePolicy={duplicatePolicy}
                    onSpaceChange={handleTargetSpaceChange}
                    onParentPageChange={handleParentPageChange}
                    onVisibilityChange={handleVisibilityChange}
                    onDuplicatePolicyChange={handleDuplicatePolicyChange}
                  />

                  {dryRunResult !== null ? (
                    <ImportDryRunCard
                      result={dryRunResult}
                      duplicatePolicy={duplicatePolicy}
                      onDismiss={handleDismissDryRun}
                    />
                  ) : null}

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
