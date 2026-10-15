"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { InfiniteScrollSentinel } from "@/components/ui/infinite-scroll-sentinel";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchInput } from "@/components/ui/search-input";
import { useSourceOverride } from "@/hooks/common/use-source-override";
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
import {
  useKbPageTemplates,
  useCreateKbPage,
  useUpdateKbPage,
} from "@/hooks/api/kb";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { KB_TEMPLATES, pageHref } from "@/lib/knowledge-routes";
import { parseEnum } from "@/lib/url-state/use-url-filters";
import {
  STARTER_TEMPLATES,
  STARTER_TEMPLATE_CATEGORIES,
  deriveContentText,
} from "@/features/wiki/lib/starter-templates";
import { KbLayoutTemplateIcon } from "@/features/wiki/lib/kb-icons";
import type { StarterTemplate } from "@/features/wiki/lib/starter-templates";
import { StarterTemplateCard, TemplateCard } from "./template-cards";
import { TemplatePreviewDialog } from "./template-preview-dialog";

const VALID_TABS = ["starters", "saved"] as const;

const ALL_CATEGORIES = "all";
const CATEGORY_FILTER_VALUES = [ALL_CATEGORIES, ...STARTER_TEMPLATE_CATEGORIES] as const;

function savedTemplateKey(templateId: number): string {
  return `saved:${templateId}`;
}

function starterTemplateKey(template: StarterTemplate): string {
  return `starter:${template.key}`;
}

function TemplatesSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

export default function TemplatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = parseEnum(searchParams.get("tab"), VALID_TABS, "starters");
  const activeCategory = parseEnum(searchParams.get("category"), CATEGORY_FILTER_VALUES, ALL_CATEGORIES);
  const q = searchParams.get("q") ?? "";
  const queryString = searchParams.toString();

  const [searchDraft, setSearchDraft] = useSourceOverride(q, q);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [queryString]);

  const {
    error,
    isError,
    isLoading,
    data: templates = [],
    refetch: refetchTemplates,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useKbPageTemplates(q || undefined);
  const canDelete = useCan("kb:templates:manage");

  const savedTemplatesState = usePageState({
    isLoading,
    isError,
    error,
    isEmpty: templates.length === 0,
  });

  const [previewTemplate, setPreviewTemplate] = useState<StarterTemplate | null>(null);

  function handleRetryTemplates() {
    void refetchTemplates();
  }

  function handleLoadMore() { void fetchNextPage(); }

  function updateParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(queryString);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === "") params.delete(key);
      else params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `${KB_TEMPLATES}?${qs}` : KB_TEMPLATES, { scroll: false });
  }

  function handleTabChange(value: string) {
    updateParams({ tab: value === "starters" ? null : value });
  }

  function handleCategoryChange(value: string) {
    updateParams({ category: value === ALL_CATEGORIES ? null : value });
  }

  function handleSearchChange(value: string) {
    setSearchDraft(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => updateParams({ q: value || null }), 300);
  }

  function handlePreviewOpenChange(open: boolean) {
    if (!open) setPreviewTemplate(null);
  }

  const searchTerm = q.trim().toLowerCase();
  const filteredStarters = STARTER_TEMPLATES.filter((template) =>
    (activeCategory === ALL_CATEGORIES || template.category === activeCategory) &&
    (!searchTerm || `${template.name} ${template.description} ${template.expectedOutput}`.toLowerCase().includes(searchTerm)),
  );

  const createPage = useCreateKbPage();
  const updatePage = useUpdateKbPage();

  const [pendingTemplateKey, setPendingTemplateKey] = useState<string | null>(null);

  const handleUseTemplate = useCallback(
    (templateId: number) => {
      setPendingTemplateKey(savedTemplateKey(templateId));
      createPage.mutate(
        { templateId },
        {
          onSuccess: (page) => {
            router.push(pageHref(page.id));
          },
          onError: () => {
            setPendingTemplateKey(null);
            toast.error("Failed to create page from template");
          },
        },
      );
    },
    [createPage, router],
  );

  const handleUseStarter = useCallback(
    (template: StarterTemplate) => {
      setPreviewTemplate(null);
      setPendingTemplateKey(starterTemplateKey(template));
      createPage.mutate(
        { title: template.name },
        {
          onSuccess: (page) => {
            function saveContent() {
              setPendingTemplateKey(starterTemplateKey(template));
              updatePage.mutate(
                {
                  pageId: page.id,
                  content: template.content.children,
                  contentText: deriveContentText(template.content),
                  expectedContentRevision: page.contentRevision,
                },
                {
                  onSuccess: () => router.push(pageHref(page.id)),
                  onError: () => {
                    setPendingTemplateKey(null);
                    toast.error("Page created, but template content was not saved", {
                      action: { label: "Retry content", onClick: saveContent },
                    });
                  },
                },
              );
            }
            saveContent();
          },
          onError: () => {
            setPendingTemplateKey(null);
            toast.error("Failed to create page from starter template");
          },
        },
      );
    },
    [createPage, updatePage, router],
  );

  const handlePreviewStarter = useCallback((template: StarterTemplate) => {
    setPreviewTemplate(template);
  }, []);

  const subtitle = activeTab === "saved" ? "Templates created from your wiki pages" : "Built-in skeletons ready to use";

  return (
    <PageWrapper
      title="Templates"
      subtitle={subtitle}
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="flex min-h-0 flex-1 flex-col gap-4"
      >
        <TabsList>
          <TabsTrigger value="starters">Starters</TabsTrigger>
          <TabsTrigger value="saved">Saved</TabsTrigger>
        </TabsList>
        <SearchInput
          placeholder="Search templates…"
          value={searchDraft}
          onValueChange={handleSearchChange}
          aria-label="Search templates"
        />

        <TabsContent value="starters" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <div className="mb-3 flex items-center gap-2">
            <Select value={activeCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>All categories</SelectItem>
                {STARTER_TEMPLATE_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {filteredStarters.length === 0 && (
            <p className="text-sm text-muted-foreground">No starter templates match these filters.</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredStarters.map((template) => (
              <StarterTemplateCard
                key={template.key}
                template={template}
                onUse={handleUseStarter}
                onPreview={handlePreviewStarter}
                isPending={pendingTemplateKey === starterTemplateKey(template)}
                isDisabled={
                  pendingTemplateKey !== null &&
                  pendingTemplateKey !== starterTemplateKey(template)
                }
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="saved" className={TABS_CONTENT_PAGE_BODY_CLASS}>
          <PageState
            resolution={savedTemplatesState}
            onRetry={handleRetryTemplates}
            loading={<TemplatesSkeleton />}
            empty={
              q ? (
                <EmptyState
                  illustration={
                    <KbLayoutTemplateIcon className="w-8 text-muted-foreground" />
                  }
                  title="No saved templates match your search."
                  filtersActive
                  filteredTitle="No saved templates match your search."
                  onClearFilters={() => updateParams({ q: null })}
                  className={CONTENT_FILL_PANEL}
                />
              ) : (
                <EmptyState
                  illustration={
                    <KbLayoutTemplateIcon className="w-8 text-muted-foreground" />
                  }
                  title="No saved templates yet"
                  description="Save a page as a template to reuse its structure across your wiki."
                  className={CONTENT_FILL_PANEL}
                />
              )
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  canDelete={canDelete}
                  onUse={handleUseTemplate}
                  isPending={pendingTemplateKey === savedTemplateKey(template.id)}
                  isDisabled={
                    pendingTemplateKey !== null &&
                    pendingTemplateKey !== savedTemplateKey(template.id)
                  }
                />
              ))}
            </div>
            <InfiniteScrollSentinel
              hasNextPage={hasNextPage ?? false}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={handleLoadMore}
              label="Load more templates"
            />
          </PageState>
        </TabsContent>
      </Tabs>

      {previewTemplate && (
        <TemplatePreviewDialog
          template={previewTemplate}
          onOpenChange={handlePreviewOpenChange}
          onUse={handleUseStarter}
          isPending={pendingTemplateKey === starterTemplateKey(previewTemplate)}
        />
      )}
    </PageWrapper>
  );
}
