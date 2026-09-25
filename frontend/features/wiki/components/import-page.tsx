"use client";

import { useState, useRef, useCallback } from "react";
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
import { useCan } from "@/hooks/api/access";
import { useImportKbPages } from "@/hooks/api/kb";
import { getErrorMessage } from "@/lib/get-error-message";
import { KB_IMPORT, KNOWLEDGE_BASE } from "@/lib/knowledge-routes";
import { KbUploadIcon, KbClipboardIcon } from "@/features/wiki/lib/kb-icons";
import { ExportJobsCard } from "./export-jobs-card";
import { ImportHistorySection } from "./import-history-section";
import { ImportPendingList, type ImportPendingItem } from "./import-pending-list";

const VALID_TABS = ["import", "export"] as const;
type ImportExportTab = (typeof VALID_TABS)[number];

function resolveTab(tabParam: string | null): ImportExportTab {
  return VALID_TABS.find((t) => t === tabParam) ?? "import";
}

export default function ImportPage() {
  const canImport = useCan("kb:pages:import");
  const importMutation = useImportKbPages();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = resolveTab(searchParams.get("tab"));

  const [items, setItems] = useState<ImportPendingItem[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteText, setPasteText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  function titleExists(_title: string): boolean {
    return false;
  }

  const handleFilesChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;

      const remaining = 100 - items.length;
      const toProcess = files.slice(0, remaining);

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

  function handleTabChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "import") params.delete("tab");
    else params.set("tab", value);
    const qs = params.toString();
    router.replace(qs ? `${KB_IMPORT}?${qs}` : KB_IMPORT, { scroll: false });
  }

  if (!canImport) {
    return (
      <PageWrapper title="Import & Export">
        <EmptyState
          illustration={
            <KbUploadIcon className="w-8 text-muted-foreground" />
          }
          title="Access denied"
          description="You don't have permission to import pages. Ask an admin to grant kb:pages:import."
        />
      </PageWrapper>
    );
  }

  const isImportTab = activeTab === "import";

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
            >
              <KbClipboardIcon className="mr-1.5 h-3.5 w-3.5" />
              Paste text
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleChooseFiles}
              disabled={items.length >= 100}
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
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="space-y-4">
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

                  <ImportPendingList
                    items={items}
                    isImporting={importMutation.isPending}
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
